/**
 * PixiJS 8 map renderer. Draws the island from MapView data through sprites.ts,
 * handles pan / zoom / pinch / tap for students, fits the whole island on the
 * projector, and floats "+10 puuta" effects. Renders on demand to spare old devices.
 */
import { Application, Assets, Container, Graphics, Sprite, Text, TextStyle, type Texture } from 'pixi.js';
import type { MapView } from '@saari/protocol';
import type { Coord, Gain, PublicTile } from '@saari/rules';
import { formatNumber } from '../i18n/index.ts';
import { gainParts } from '../lib/format.ts';
import { exploreNeeded, stockMax } from '../lib/rules-info.ts';
import { clampCamera, fitCamera, panBy, playArea, screenToWorld, zoomAt, type Camera } from './camera.ts';
import { drawOrder, tileCenter, tilesBounds, worldToTile, type Rect } from './iso.ts';
import {
  CLOUD_SCALE,
  fogLook,
  KENNEY_SCALE,
  KENNEY_TEXTURES,
  kenneyAnchorY,
  kenneyCloud,
  kenneyProp,
  kenneyTile,
  kenneyWater,
  PROP_ANCHOR,
  PROP_SCALE,
  WATER_DY,
  type ArtStyle,
} from './kenney.ts';
import {
  drawExploreBox,
  drawGround,
  drawHighlight,
  drawObjects,
  drawOverlay,
  drawShallowWater,
  drawShore,
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
  node: Container;
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

/** One map tile in the Kenney style: its block, the explore box on it, what stands on it, and its cloud. */
interface TileSlot {
  block: Sprite;
  detail: Graphics;
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
  /** Kenney style: per-tile block, explore box, prop and cloud in painter's order. */
  readonly #tiles = new Container();
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
  /** Students: the explored part of the island, where the map frames by default. */
  #focus: Rect | null = null;
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
    this.#world.addChild(this.#ground, this.#tiles, this.#objects, this.#highlight, this.#overlay, this.#effects);
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
    this.#focus = this.#options.mode === 'student' ? tilesBounds(playArea(map.tiles, map.landing), 8) : null;
    this.#draw();
    if (first || this.#options.mode === 'projector' || !this.#userMoved) this.fit();
    else this.#requestRender();
  }

  setSelected(coord: Coord | null): void {
    this.#selected = coord;
    if (coord && this.#options.mode === 'student') this.#keepVisible(coord);
    this.#drawHighlight();
    this.#requestRender();
  }

  /**
   * Pans so a tapped tile is not hidden under its popup: the popup opens bottom-right on
   * tablets and as a sheet over the lower part on phones.
   */
  #keepVisible(coord: Coord): void {
    const { width, height } = this.#viewSize();
    const c = tileCenter(coord.x, coord.y);
    const sx = this.#camera.x + c.x * this.#camera.scale;
    const sy = this.#camera.y + c.y * this.#camera.scale;
    const phone = width < 640;
    const clearX = phone ? sx > 40 && sx < width - 40 : sx > 40 && sx < width - 420;
    const clearY = phone ? sy > 60 && sy < height * 0.3 : sy > 60 && sy < height - 60;
    if (clearX && clearY) return;
    const target = phone ? { x: width / 2, y: height * 0.2 } : { x: Math.min(width * 0.4, width - 460), y: height * 0.45 };
    this.#camera = panBy(this.#camera, target.x - sx, target.y - sy);
    this.#setUserMoved(true);
    this.#applyCamera();
  }

  showEffect(x: number, y: number, gain: Gain): void {
    const parts = gainParts(gain);
    const first = parts[0];
    if (!first) return;
    const c = tileCenter(x, y);
    const color = EFFECT_COLORS[first.key];
    // Wood, stone and food float as "+10" and their picture; the rest in words.
    const icon = first.key === 'wood' || first.key === 'stone' || first.key === 'food' ? this.#textures?.get(`icons/${first.key}`) : undefined;
    const words = icon ? [`+${formatNumber(gain[first.key] ?? 0)}`, ...parts.slice(1).map((p) => p.text)] : parts.map((p) => p.text);
    const text = new Text({
      text: words.join('  '),
      style: new TextStyle({
        fontFamily: 'Nunito Variable, Nunito, system-ui, sans-serif',
        fontWeight: '800',
        fontSize: EFFECT_STYLE.fontSize,
        fill: color,
        stroke: { color: EFFECT_STYLE.stroke, width: EFFECT_STYLE.strokeWidth, join: 'round' },
      }),
      resolution: 2,
    });
    const node = new Container();
    node.addChild(text);
    if (icon) {
      const picture = new Sprite(icon);
      const size = EFFECT_STYLE.fontSize * 1.5;
      picture.anchor.set(0, 0.5);
      picture.scale.set(size / icon.width);
      text.anchor.set(1, 0.5);
      text.position.set(-2, 0);
      picture.position.set(2, 0);
      node.addChild(picture);
    } else {
      text.anchor.set(0.5, 0.5);
    }
    // Several effects on one tile stack instead of overlapping.
    const stacked = this.#floating.filter((f) => Math.abs(f.node.x - c.x) < 1 && performance.now() - f.born < 600).length;
    node.position.set(c.x, c.y - 30 - stacked * 26);
    this.#effects.addChild(node);
    this.#floating.push({ node, born: performance.now(), baseY: node.y });
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

  /** Whole island in view (students: the explored part of it). */
  fit(): void {
    const frame = this.#focus ?? this.#bounds;
    if (!frame) return;
    const { width, height } = this.#viewSize();
    const padding = this.#options.mode === 'projector' ? 24 : 16;
    this.#camera = fitCamera(frame, width, height, padding, this.#options.mode === 'projector' ? 3 : 2.2);
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
    const contexts = ordered.map((tile) => this.#context(map, tile));
    if (style !== 'placeholder') {
      // Under the island, layer by layer so the shapes merge: reef, shallow water, wet sand, sand.
      const coastal = ordered.flatMap((tile, i) => (kenneyWater(tile, contexts[i]!, style) === 'shallow' ? [i] : []));
      const land = ordered.flatMap((tile, i) => (tile.fog || tile.terrain !== 'sea' ? [i] : []));
      for (const layer of ['reef', 'shallow'] as const) {
        for (const i of coastal) drawShallowWater(ground, ordered[i]!, contexts[i]!.cx, contexts[i]!.cy + WATER_DY, layer);
      }
      for (const layer of ['wet', 'dry'] as const) {
        for (const i of land) drawShore(ground, contexts[i]!.cx, contexts[i]!.cy + WATER_DY, layer);
      }
    }
    ordered.forEach((tile, i) => {
      const ctx = contexts[i]!;
      const isWreck = wreck !== null && tile.x === wreck.x && tile.y === wreck.y;
      const slot = this.#slots[i];
      if (slot) {
        // Each tile's block, then what stands on it, so nearer tiles cover farther ones.
        const look = kenneyTile(tile, style);
        const texture = look && this.#textures?.get(look.texture);
        slot.block.visible = Boolean(texture);
        if (look && texture) {
          slot.block.texture = texture;
          slot.block.anchor.set(0.5, kenneyAnchorY(texture.height));
          slot.block.scale.set(KENNEY_SCALE);
          slot.block.position.set(ctx.cx, ctx.cy);
          slot.block.tint = look.tint;
        }
        const prop = kenneyProp(tile, ctx, style, isWreck);
        const propTexture = prop && this.#textures?.get(prop.texture);
        slot.prop.visible = Boolean(propTexture);
        if (prop && propTexture) {
          slot.prop.texture = propTexture;
          slot.prop.anchor.set(PROP_ANCHOR.x, PROP_ANCHOR.y);
          slot.prop.scale.set(PROP_SCALE);
          slot.prop.position.set(ctx.cx, ctx.cy + prop.dy);
        }
        const detail = pixiPen(slot.detail.clear());
        if (fogLook(tile, at, style) === 'explorable') drawExploreBox(detail, ctx.cx, ctx.cy);
        const cloud = kenneyCloud(tile, at, style);
        const cloudTexture = cloud && this.#textures?.get(cloud.texture);
        slot.cloud.visible = Boolean(cloudTexture);
        if (cloud && cloudTexture) {
          slot.cloud.texture = cloudTexture;
          slot.cloud.anchor.set(0.5, 0.6);
          slot.cloud.scale.set(CLOUD_SCALE * (cloud.flipX ? -1 : 1), CLOUD_SCALE);
          slot.cloud.position.set(ctx.cx + cloud.dx, ctx.cy + cloud.dy);
        }
        // Buildings explain themselves by their look and size; only exploration shows a ring.
        if (tile.fog) drawOverlay(overlay, tile, ctx);
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
      slot.detail.destroy();
      slot.prop.destroy();
      slot.cloud.destroy();
    }
    while (this.#slots.length < count) {
      const slot: TileSlot = { block: new Sprite(), detail: new Graphics(), prop: new Sprite(), cloud: new Sprite() };
      // Clouds in painter's order too: a green box in front stays on top of the cloud behind it.
      this.#tiles.addChild(slot.block, slot.detail, slot.prop, slot.cloud);
      this.#slots.push(slot);
    }
  }

  /** Where a tile's surface is: the sea lies lower than the land in the Kenney style. */
  #surfaceY(coord: Coord): number {
    const c = tileCenter(coord.x, coord.y);
    const map = this.#map;
    const tile = map ? this.#tile(map, coord.x, coord.y) : undefined;
    const lowered = this.#textures && this.#style !== 'placeholder' && tile && !tile.fog && tile.terrain === 'sea';
    return lowered ? c.y + WATER_DY : c.y;
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
      drawHighlight(pen, tileCenter(this.#hover.x, this.#hover.y).x, this.#surfaceY(this.#hover), 'hover');
    }
    if (this.#selected) {
      drawHighlight(pen, tileCenter(this.#selected.x, this.#selected.y).x, this.#surfaceY(this.#selected), 'selected');
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
        f.node.destroy({ children: true });
        return false;
      }
      f.node.alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      if (!this.#options.reducedMotion) f.node.y = f.baseY - EFFECT_STYLE.rise * Math.sqrt(t);
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
