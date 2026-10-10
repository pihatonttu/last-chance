/**
 * PixiJS 8 map renderer. Draws the island from MapView data through sprites.ts,
 * handles pan / zoom / pinch / tap for students, fits the whole island on the
 * projector, and floats "+10 puuta" effects. Renders on demand to spare old devices.
 */
import { Application, Assets, Container, Graphics, Sprite, Text, TextStyle, type Texture } from 'pixi.js';
import type { MapView } from '@saari/protocol';
import type { Coord, Gain, PublicTile } from '@saari/rules';
import { gainParts } from '../lib/format.ts';
import { exploreNeeded, stockMax } from '../lib/rules-info.ts';
import { clampCamera, fitCamera, panBy, screenToWorld, zoomAt, type Camera } from './camera.ts';
import { drawOrder, tileCenter, tilesBounds, worldToTile, type Rect } from './iso.ts';
import {
  CLOUD_SCALE,
  KENNEY_SCALE,
  KENNEY_TEXTURES,
  kenneyAnchorY,
  kenneyCloud,
  kenneyProp,
  kenneyTile,
  landAround,
  PROP_ANCHOR,
  PROP_SCALE,
  type ArtStyle,
} from './kenney.ts';
import {
  drawGround,
  drawHighlight,
  drawObjects,
  drawOverlay,
  drawWreck,
  EFFECT_COLORS,
  EFFECT_STYLE,
  type Pen,
  type Stroke,
  type TileContext,
} from './sprites.ts';

export type MapMode = 'projector' | 'student';

export interface MapRendererOptions {
  mode: MapMode;
  reducedMotion: boolean;
  /** Initial map art: the Kenney tiles (P37) or the vector fallback. Default placeholder. */
  artStyle?: ArtStyle;
  onTap?: (x: number, y: number) => void;
  /** Called when the user pans or zooms (the "whole island" button appears). */
  onCameraMoved?: (moved: boolean) => void;
}

function pixiPen(g: Graphics): Pen {
  const stroke = (s: Stroke) => ({ color: s.color, width: s.width, alpha: s.alpha ?? 1 });
  return {
    poly(points, fill, alpha = 1, s) {
      g.poly(points as number[], true).fill({ color: fill, alpha });
      if (s) g.poly(points as number[], true).stroke(stroke(s));
    },
    circle(x, y, r, fill, alpha = 1, s) {
      if (fill !== null) g.circle(x, y, r).fill({ color: fill, alpha });
      if (s) g.circle(x, y, r).stroke(stroke(s));
    },
    ellipse(x, y, rx, ry, fill, alpha = 1, s) {
      g.ellipse(x, y, rx, ry).fill({ color: fill, alpha });
      if (s) g.ellipse(x, y, rx, ry).stroke(stroke(s));
    },
    line(points, s) {
      if (points.length < 4) return;
      g.moveTo(points[0]!, points[1]!);
      for (let i = 2; i < points.length; i += 2) g.lineTo(points[i]!, points[i + 1]!);
      g.stroke({ ...stroke(s), cap: 'round', join: 'round' });
    },
    arc(x, y, r, start, end, s) {
      g.moveTo(x + Math.cos(start) * r, y + Math.sin(start) * r);
      g.arc(x, y, r, start, end);
      g.stroke({ ...stroke(s), cap: 'round' });
    },
  };
}

interface Floating {
  text: Text;
  born: number;
  baseY: number;
}

interface PointerInfo {
  x: number;
  y: number;
  startX: number;
  startY: number;
  startTime: number;
  type: string;
}

const TAP_SLOP = 8;
const TAP_MS = 650;

/** One map tile in the Kenney style: its block, what stands on it, and its fog cloud. */
interface TileSlot {
  block: Sprite;
  prop: Sprite;
  cloud: Sprite;
}

async function loadKenneyTextures(): Promise<Map<string, Texture>> {
  const base = `${import.meta.env.BASE_URL}art/kenney/`;
  const loaded = await Promise.all(KENNEY_TEXTURES.map(async (name) => [name, await Assets.load<Texture>(`${base}${name}.png`)] as const));
  return new Map(loaded);
}

/** Missing art must not cost the class its map: null means the vector style is used. */
async function loadKenneyTexturesOrNull(): Promise<Map<string, Texture> | null> {
  try {
    return await loadKenneyTextures();
  } catch (error) {
    console.warn('Kenney tiles failed to load, using the placeholder map', error);
    return null;
  }
}

export class MapRenderer {
  readonly #app: Application;
  readonly #host: HTMLElement;
  readonly #options: MapRendererOptions;
  readonly #world = new Container();
  readonly #ground = new Graphics();
  /** Kenney style: per-tile block and prop in painter's order. */
  readonly #tiles = new Container();
  /** Kenney style: fog clouds above all land, so neighbouring clouds join up. */
  readonly #clouds = new Container();
  #slots: TileSlot[] = [];
  #textures: Map<string, Texture> | null = null;
  #style: ArtStyle;
  #styleRequest = 0;
  readonly #objects = new Graphics();
  readonly #overlay = new Graphics();
  readonly #highlight = new Graphics();
  readonly #effects = new Container();
  #map: MapView | null = null;
  #villagers = 0;
  #bounds: Rect | null = null;
  #camera: Camera = { x: 0, y: 0, scale: 1 };
  #userMoved = false;
  #selected: Coord | null = null;
  #hover: Coord | null = null;
  #floating: Floating[] = [];
  #frame = 0;
  #pointers = new Map<number, PointerInfo>();
  #pinch: { distance: number; midX: number; midY: number } | null = null;
  #dragging = false;
  #resize: ResizeObserver | null = null;
  #destroyed = false;

  private constructor(app: Application, host: HTMLElement, options: MapRendererOptions, textures: Map<string, Texture> | null) {
    this.#app = app;
    this.#host = host;
    this.#options = options;
    this.#textures = textures;
    this.#style = options.artStyle ?? 'placeholder';
    this.#world.addChild(this.#ground, this.#tiles, this.#objects, this.#clouds, this.#highlight, this.#overlay, this.#effects);
    app.stage.addChild(this.#world);
  }

  static async create(host: HTMLElement, options: MapRendererOptions): Promise<MapRenderer> {
    const app = new Application();
    await app.init({
      width: Math.max(1, host.clientWidth),
      height: Math.max(1, host.clientHeight),
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(2, globalThis.devicePixelRatio || 1),
      autoStart: false,
      preference: 'webgl',
    });
    // Loaded before the first frame so the class never sees the style change.
    const textures = (options.artStyle ?? 'placeholder') === 'placeholder' ? null : await loadKenneyTexturesOrNull();
    const canvas = app.canvas;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';
    host.appendChild(canvas);
    const renderer = new MapRenderer(app, host, options, textures);
    renderer.#attach();
    return renderer;
  }

  // ---------------------------------------------------------------- public

  update(map: MapView, villagers: number): void {
    const first = this.#map === null || this.#map.width !== map.width || this.#map.height !== map.height;
    this.#map = map;
    this.#villagers = villagers;
    this.#bounds = this.#islandBounds(map);
    this.#draw();
    if (first || this.#options.mode === 'projector' || !this.#userMoved) this.fit();
    else this.#requestRender();
  }

  setSelected(coord: Coord | null): void {
    this.#selected = coord;
    this.#drawHighlight();
    this.#requestRender();
  }

  showEffect(x: number, y: number, gain: Gain): void {
    const parts = gainParts(gain);
    if (parts.length === 0) return;
    const c = tileCenter(x, y);
    const color = EFFECT_COLORS[parts[0]!.key];
    const text = new Text({
      text: parts.map((p) => p.text).join('  '),
      style: new TextStyle({
        fontFamily: 'Nunito Variable, Nunito, system-ui, sans-serif',
        fontWeight: '800',
        fontSize: EFFECT_STYLE.fontSize,
        fill: color,
        stroke: { color: EFFECT_STYLE.stroke, width: EFFECT_STYLE.strokeWidth, join: 'round' },
      }),
      resolution: 2,
    });
    text.anchor.set(0.5, 1);
    // Several effects on one tile stack instead of overlapping.
    const stacked = this.#floating.filter((f) => Math.abs(f.text.x - c.x) < 1 && performance.now() - f.born < 600).length;
    text.position.set(c.x, c.y - 18 - stacked * 22);
    this.#effects.addChild(text);
    this.#floating.push({ text, born: performance.now(), baseY: text.y });
    this.#requestRender();
  }

  /** Switches the map art; the Kenney tiles load the first time they are needed. */
  async setArtStyle(style: ArtStyle): Promise<void> {
    if (style === this.#style) return;
    const request = ++this.#styleRequest;
    if (style !== 'placeholder' && !this.#textures) {
      const textures = await loadKenneyTexturesOrNull();
      if (this.#destroyed || request !== this.#styleRequest) return;
      this.#textures = textures;
    }
    this.#style = style;
    this.#draw();
  }

  /** Whole island in view. */
  fit(): void {
    if (!this.#bounds) return;
    const { width, height } = this.#viewSize();
    const padding = this.#options.mode === 'projector' ? 24 : 16;
    this.#camera = fitCamera(this.#bounds, width, height, padding, this.#options.mode === 'projector' ? 3 : 2.2);
    this.#setUserMoved(false);
    this.#applyCamera();
  }

  /** Keyboard / button zoom around the view centre. */
  zoom(factor: number): void {
    const { width, height } = this.#viewSize();
    this.#camera = zoomAt(this.#camera, factor, width / 2, height / 2);
    this.#setUserMoved(true);
    this.#applyCamera();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    cancelAnimationFrame(this.#frame);
    this.#resize?.disconnect();
    const canvas = this.#app.canvas;
    canvas.removeEventListener('pointerdown', this.#onPointerDown);
    canvas.removeEventListener('pointermove', this.#onPointerMove);
    canvas.removeEventListener('pointerup', this.#onPointerUp);
    canvas.removeEventListener('pointercancel', this.#onPointerUp);
    canvas.removeEventListener('pointerleave', this.#onPointerLeave);
    canvas.removeEventListener('wheel', this.#onWheel);
    this.#app.destroy({ removeView: true }, { children: true });
  }

  // ---------------------------------------------------------------- drawing

  #islandBounds(map: MapView): Rect | null {
    // The island and one ring of sea; the open sea around it is background.
    const land = map.tiles.filter((t) => t.fog || t.terrain !== 'sea');
    const coords: Coord[] = [];
    for (const t of land) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) coords.push({ x: t.x + dx, y: t.y + dy });
    }
    return tilesBounds(coords.length > 0 ? coords : map.tiles, 8);
  }

  #context(map: MapView, tile: PublicTile): TileContext {
    const c = tileCenter(tile.x, tile.y);
    let coastal = false;
    if (!tile.fog && tile.terrain === 'sea') {
      for (let dy = -1; dy <= 1 && !coastal; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const n = this.#tile(map, tile.x + dx, tile.y + dy);
          if (n && (n.fog || n.terrain !== 'sea')) {
            coastal = true;
            break;
          }
        }
      }
    }
    return {
      cx: c.x,
      cy: c.y,
      exploreShare: tile.fog ? tile.exploreWork / exploreNeeded(tile, map.landing) : 0,
      coastal,
      stockMax: tile.terrain ? stockMax(tile.terrain) : null,
    };
  }

  #tile(map: MapView, x: number, y: number): PublicTile | undefined {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return undefined;
    return map.tiles[y * map.width + x];
  }

  #draw(): void {
    const map = this.#map;
    if (!map) return;
    const ground = pixiPen(this.#ground.clear());
    const objects = pixiPen(this.#objects.clear());
    const overlay = pixiPen(this.#overlay.clear());
    const ordered = [...map.tiles].sort(drawOrder);
    const wreck = this.#wreckTile(map);
    const style = this.#textures ? this.#style : 'placeholder';
    this.#fitSlots(style === 'placeholder' ? 0 : ordered.length);
    const at = (x: number, y: number) => this.#tile(map, x, y);
    ordered.forEach((tile, i) => {
      const ctx = this.#context(map, tile);
      const isWreck = wreck !== null && tile.x === wreck.x && tile.y === wreck.y;
      const look = kenneyTile(tile, ctx, landAround(at, tile.x, tile.y), style);
      const slot = this.#slots[i];
      const texture = look && this.#textures?.get(look.texture);
      if (look && slot && texture) {
        // Each tile's block, then what stands on it, so nearer tiles cover farther ones.
        slot.block.texture = texture;
        slot.block.anchor.set(0.5, kenneyAnchorY(texture.height));
        slot.block.scale.set(KENNEY_SCALE * (look.flipX ? -1 : 1), KENNEY_SCALE);
        slot.block.position.set(ctx.cx, ctx.cy);
        slot.block.tint = look.tint;
        const prop = kenneyProp(tile, ctx, style, isWreck);
        const propTexture = prop && this.#textures?.get(prop.texture);
        slot.prop.visible = Boolean(propTexture);
        if (prop && propTexture) {
          slot.prop.texture = propTexture;
          slot.prop.anchor.set(PROP_ANCHOR.x, PROP_ANCHOR.y);
          slot.prop.scale.set(PROP_SCALE);
          slot.prop.position.set(ctx.cx, ctx.cy + prop.dy);
        }
        const cloud = kenneyCloud(tile, style);
        const cloudTexture = cloud && this.#textures?.get(cloud.texture);
        slot.cloud.visible = Boolean(cloudTexture);
        if (cloud && cloudTexture) {
          slot.cloud.texture = cloudTexture;
          slot.cloud.anchor.set(0.5, 0.6);
          slot.cloud.scale.set(CLOUD_SCALE * (cloud.flipX ? -1 : 1), CLOUD_SCALE);
          slot.cloud.position.set(ctx.cx + cloud.dx, ctx.cy + cloud.dy);
        }
        const buildingTop = tile.building && prop ? ctx.cy - prop.top : undefined;
        drawOverlay(overlay, tile, ctx, buildingTop === undefined ? {} : { buildingTop });
      } else {
        drawGround(ground, tile, ctx);
        drawObjects(objects, tile, ctx);
        if (isWreck) drawWreck(objects, ctx.cx, ctx.cy);
        drawOverlay(overlay, tile, ctx);
      }
    });
    this.#drawHighlight();
    this.#requestRender();
  }

  /** Grows or shrinks the Kenney slot pool to one per tile (none in the placeholder style). */
  #fitSlots(count: number): void {
    while (this.#slots.length > count) {
      const slot = this.#slots.pop()!;
      slot.block.destroy();
      slot.prop.destroy();
      slot.cloud.destroy();
    }
    while (this.#slots.length < count) {
      const slot: TileSlot = { block: new Sprite(), prop: new Sprite(), cloud: new Sprite() };
      this.#tiles.addChild(slot.block, slot.prop);
      this.#clouds.addChild(slot.cloud);
      this.#slots.push(slot);
    }
  }

  /** The sea tile south of the landing where the wreck lies. */
  #wreckTile(map: MapView): Coord | null {
    const { x, y } = map.landing;
    const candidates: Coord[] = [
      { x: x + 1, y: y + 1 },
      { x: x + 1, y },
      { x, y: y + 1 },
      { x: x - 1, y: y + 1 },
      { x: x + 1, y: y - 1 },
    ];
    for (const c of candidates) {
      const t = this.#tile(map, c.x, c.y);
      if (t && !t.fog && t.terrain === 'sea') return c;
    }
    return null;
  }

  #drawHighlight(): void {
    const pen = pixiPen(this.#highlight.clear());
    if (this.#hover && this.#options.mode === 'student') {
      const c = tileCenter(this.#hover.x, this.#hover.y);
      drawHighlight(pen, c.x, c.y, 'hover');
    }
    if (this.#selected) {
      const c = tileCenter(this.#selected.x, this.#selected.y);
      drawHighlight(pen, c.x, c.y, 'selected');
    }
  }

  // ---------------------------------------------------------------- render loop

  #requestRender(): void {
    if (this.#destroyed || this.#frame) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0;
      this.#tick();
    });
  }

  #tick(): void {
    if (this.#destroyed) return;
    const now = performance.now();
    const duration = EFFECT_STYLE.durationMs;
    this.#floating = this.#floating.filter((f) => {
      const t = (now - f.born) / duration;
      if (t >= 1) {
        f.text.destroy();
        return false;
      }
      f.text.alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      if (!this.#options.reducedMotion) f.text.y = f.baseY - EFFECT_STYLE.rise * Math.sqrt(t);
      return true;
    });
    this.#app.render();
    if (this.#floating.length > 0) this.#requestRender();
  }

  // ---------------------------------------------------------------- camera and input

  #viewSize(): { width: number; height: number } {
    return { width: Math.max(1, this.#host.clientWidth), height: Math.max(1, this.#host.clientHeight) };
  }

  #applyCamera(): void {
    if (this.#bounds && this.#options.mode === 'student') {
      const { width, height } = this.#viewSize();
      this.#camera = clampCamera(this.#camera, this.#bounds, width, height);
    }
    this.#world.position.set(this.#camera.x, this.#camera.y);
    this.#world.scale.set(this.#camera.scale);
    this.#requestRender();
  }

  #setUserMoved(moved: boolean): void {
    if (this.#userMoved === moved) return;
    this.#userMoved = moved;
    this.#options.onCameraMoved?.(moved);
  }

  #attach(): void {
    const canvas = this.#app.canvas;
    canvas.addEventListener('pointerdown', this.#onPointerDown);
    canvas.addEventListener('pointermove', this.#onPointerMove);
    canvas.addEventListener('pointerup', this.#onPointerUp);
    canvas.addEventListener('pointercancel', this.#onPointerUp);
    canvas.addEventListener('pointerleave', this.#onPointerLeave);
    canvas.addEventListener('wheel', this.#onWheel, { passive: false });
    this.#resize = new ResizeObserver(() => {
      const { width, height } = this.#viewSize();
      this.#app.renderer.resize(width, height);
      if (this.#options.mode === 'projector' || !this.#userMoved) this.fit();
      else this.#applyCamera();
    });
    this.#resize.observe(this.#host);
  }

  #local(event: PointerEvent | WheelEvent): { x: number; y: number } {
    const rect = this.#app.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  #tileAt(sx: number, sy: number): Coord | null {
    const map = this.#map;
    if (!map) return null;
    const w = screenToWorld(this.#camera, sx, sy);
    const c = worldToTile(w.x, w.y);
    return c.x >= 0 && c.y >= 0 && c.x < map.width && c.y < map.height ? c : null;
  }

  readonly #onPointerDown = (event: PointerEvent): void => {
    const p = this.#local(event);
    this.#pointers.set(event.pointerId, {
      x: p.x,
      y: p.y,
      startX: p.x,
      startY: p.y,
      startTime: performance.now(),
      type: event.pointerType,
    });
    this.#app.canvas.setPointerCapture?.(event.pointerId);
    if (this.#pointers.size === 1) this.#dragging = false;
    if (this.#pointers.size === 2) this.#pinch = this.#pinchState();
  };

  readonly #onPointerMove = (event: PointerEvent): void => {
    const p = this.#local(event);
    const info = this.#pointers.get(event.pointerId);
    const student = this.#options.mode === 'student';
    if (!info) {
      if (event.pointerType === 'mouse' && student) this.#setHover(this.#tileAt(p.x, p.y));
      return;
    }
    const dx = p.x - info.x;
    const dy = p.y - info.y;
    info.x = p.x;
    info.y = p.y;
    if (!student) return;
    if (this.#pointers.size >= 2 && this.#pinch) {
      const next = this.#pinchState();
      if (next && next.distance > 0 && this.#pinch.distance > 0) {
        this.#camera = zoomAt(this.#camera, next.distance / this.#pinch.distance, next.midX, next.midY);
        this.#camera = panBy(this.#camera, next.midX - this.#pinch.midX, next.midY - this.#pinch.midY);
        this.#pinch = next;
        this.#dragging = true;
        this.#setUserMoved(true);
        this.#applyCamera();
      }
      return;
    }
    if (!this.#dragging && Math.hypot(p.x - info.startX, p.y - info.startY) > TAP_SLOP) this.#dragging = true;
    if (this.#dragging) {
      this.#camera = panBy(this.#camera, dx, dy);
      this.#setUserMoved(true);
      this.#applyCamera();
    }
  };

  readonly #onPointerUp = (event: PointerEvent): void => {
    const info = this.#pointers.get(event.pointerId);
    this.#pointers.delete(event.pointerId);
    if (this.#pointers.size < 2) this.#pinch = null;
    if (!info || event.type === 'pointercancel') return;
    const quick = performance.now() - info.startTime < TAP_MS;
    if (!this.#dragging && quick && this.#pointers.size === 0) {
      const tile = this.#tileAt(info.x, info.y);
      if (tile) this.#options.onTap?.(tile.x, tile.y);
    }
    if (this.#pointers.size === 0) this.#dragging = false;
  };

  readonly #onPointerLeave = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse') this.#setHover(null);
  };

  readonly #onWheel = (event: WheelEvent): void => {
    if (this.#options.mode !== 'student') return;
    event.preventDefault();
    const p = this.#local(event);
    const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    this.#camera = zoomAt(this.#camera, Math.exp(-delta * 0.0015), p.x, p.y);
    this.#setUserMoved(true);
    this.#applyCamera();
  };

  #pinchState(): { distance: number; midX: number; midY: number } | null {
    const [a, b] = [...this.#pointers.values()];
    if (!a || !b) return null;
    return { distance: Math.hypot(a.x - b.x, a.y - b.y), midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2 };
  }

  #setHover(coord: Coord | null): void {
    const same = coord === this.#hover || (coord && this.#hover && coord.x === this.#hover.x && coord.y === this.#hover.y);
    if (same) return;
    this.#hover = coord;
    this.#drawHighlight();
    this.#requestRender();
  }
}
