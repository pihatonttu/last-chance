/**
 * The vector shapes that go with the Kenney map art (kenney.ts), drawn through a tiny `Pen`
 * interface so this module has no PixiJS dependency and can be unit-tested: the arctic coast
 * (snow under the land, shore ice round the island, ice holes in it, ice floes on the open
 * sea), the green box on the places to explore, the exploration ring, the tile highlight and
 * the look of the floating "+10" effects. The land, the buildings and the clouds are pictures.
 */
import type { Gain, PublicTile } from '@saari/rules';
import { diamond, HALF_H, HALF_W } from './iso.ts';

// ---------------------------------------------------------------- drawing interface

export interface Stroke {
  color: number;
  width: number;
  alpha?: number;
}

/** What sprites need from a renderer. Points are flat [x0, y0, x1, y1, ...] lists. */
export interface Pen {
  poly(points: readonly number[], fill: number, alpha?: number, stroke?: Stroke): void;
  circle(x: number, y: number, r: number, fill: number | null, alpha?: number, stroke?: Stroke): void;
  ellipse(x: number, y: number, rx: number, ry: number, fill: number, alpha?: number, stroke?: Stroke): void;
  line(points: readonly number[], stroke: Stroke): void;
  /** Angles in radians, 0 = east, clockwise on screen. */
  arc(x: number, y: number, r: number, start: number, end: number, stroke: Stroke): void;
}

// ---------------------------------------------------------------- palette

export const OUTLINE = 0x1d2a33;

export const FOG_LOOK = {
  ringTrack: 0x8fa3b2,
  ringProgress: 0xf4a261,
  ringRadius: 15,
  ringWidth: 5,
} as const;

export const HIGHLIGHT = {
  hover: { color: 0xffffff, width: 3, alpha: 0.85 },
  selected: { color: 0xffd166, width: 5, alpha: 1 },
} as const;

/** Floating "+10 puuta" text colours: light, with a dark outline for any background. */
export const EFFECT_COLORS: Record<keyof Gain, number> = {
  food: 0xfff3a0,
  wood: 0xffd8a8,
  stone: 0xf1f3f5,
  work: 0xffffff,
  recreation: 0xb8e6ff,
  education: 0xe0d4ff,
  tools: 0xe0d4ff,
};
export const EFFECT_STYLE = { fontSize: 22, stroke: OUTLINE, strokeWidth: 5, rise: 46, durationMs: 1700 } as const;

// ---------------------------------------------------------------- helpers

export interface TileContext {
  /** Tile centre in world pixels. */
  cx: number;
  cy: number;
  /** 0..1 exploration progress of a fogged tile. */
  exploreShare: number;
  /** Sea tile with land (or fog) next to it. */
  coastal: boolean;
  /** Full stock of this terrain, if it has one (forest 40, field 30, quarry 60). */
  stockMax: number | null;
}

/** Deterministic small hash for per-tile variation (ice holes, floes, grass tint, cloud placement). */
export function tileHash(x: number, y: number): number {
  let h = Math.imul(x + 0x9e37, 0x85ebca6b) ^ Math.imul(y + 0x79b9, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2f);
  return (h ^ (h >>> 15)) >>> 0;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function mixColor(a: number, b: number, t: number): number {
  const k = Math.min(1, Math.max(0, t));
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, k));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, k));
  const bl = Math.round(lerp(a & 255, b & 255, k));
  return (r << 16) | (g << 8) | bl;
}

// ---------------------------------------------------------------- overlay

/** Top layer: the progress ring on a fogged tile where exploring has started. */
export function drawOverlay(pen: Pen, tile: PublicTile, ctx: TileContext): void {
  if (!tile.fog || ctx.exploreShare <= 0) return;
  const { cx, cy } = ctx;
  const r = FOG_LOOK.ringRadius;
  pen.circle(cx, cy - 4, r, null, 1, { color: FOG_LOOK.ringTrack, width: FOG_LOOK.ringWidth, alpha: 0.6 });
  const start = -Math.PI / 2;
  pen.arc(cx, cy - 4, r, start, start + Math.PI * 2 * Math.min(1, ctx.exploreShare), {
    color: FOG_LOOK.ringProgress,
    width: FOG_LOOK.ringWidth,
  });
}

// ---------------------------------------------------------------- arctic coast

export const SHORE_LOOK = {
  /** Snow under the land, round the island at the water. */
  snow: 0xf4f9fc,
  /** The outer edge of the shore ice: bluish. */
  iceEdge: 0x9cc9e8,
  /** The shore ice itself: light. */
  shoreIce: 0xd6ecf7,
  /** An ice hole: dark water in the shore ice. */
  iceHole: 0x15405c,
  /** The open sea, the colour of the page behind the map (--map-sea in app.css). */
  openSea: 0x1f5f86,
  /** An ice floe on the open sea: white. */
  floe: 0xf7fbfd,
} as const;

/**
 * The shore ice round the island, in two layers drawn for every coastal tile in turn (all
 * `reef` first, then all `shallow`). `reef` is the bluish outer edge of the ice, `shallow` the
 * light shore ice itself, and on about one tile in five an ice hole is cut into it.
 * Overlapping ellipses of one colour merge, so the coast is round instead of stepped.
 *
 * A hole sits on the north half of its tile: the ice of the tiles south of it is drawn later
 * and would cover a hole on the south half.
 */
export function drawShallowWater(pen: Pen, tile: Pick<PublicTile, 'x' | 'y'>, cx: number, cy: number, layer: 'reef' | 'shallow'): void {
  if (layer === 'reef') {
    pen.ellipse(cx, cy, HALF_W * 2, HALF_H * 2, SHORE_LOOK.iceEdge, 1);
    return;
  }
  pen.ellipse(cx, cy, HALF_W * 1.4, HALF_H * 1.4, SHORE_LOOK.shoreIce, 1);
  const h = tileHash(tile.x, tile.y);
  if (h % 5 === 0) {
    const rx = 7 + ((h >>> 9) % 4);
    pen.ellipse(cx + (((h >>> 5) % 9) - 4), cy - 8, rx, rx / 2, SHORE_LOOK.iceHole, 1, { color: SHORE_LOOK.iceEdge, width: 1.5, alpha: 0.9 });
  }
}

/** Snow under a land block, round the island at the water; `wet` (snow melting into the ice) for every tile first, then `dry`. */
export function drawShore(pen: Pen, cx: number, cy: number, layer: 'wet' | 'dry'): void {
  if (layer === 'wet') pen.ellipse(cx, cy + 2, HALF_W * 1.32, HALF_H * 1.32, mixColor(SHORE_LOOK.snow, SHORE_LOOK.shoreIce, 0.5), 1);
  else pen.ellipse(cx, cy, HALF_W * 1.22, HALF_H * 1.22, SHORE_LOOK.snow, 1);
}

/**
 * A white ice floe on about one open-sea tile in six: a shade of the part under the water and
 * an irregular top. It stays inside its own tile, so it never reaches the shore ice.
 */
export function drawFloe(pen: Pen, tile: Pick<PublicTile, 'x' | 'y'>, cx: number, cy: number): void {
  const h = tileHash(tile.x, tile.y);
  if ((h >>> 3) % 6 !== 0) return;
  const x = cx + (((h >>> 9) % 15) - 7);
  const y = cy + (((h >>> 14) % 7) - 3);
  const size = 0.7 + ((h >>> 18) % 4) * 0.1;
  const turn = ((h >>> 21) & 7) * 0.12;
  pen.ellipse(x + 1, y + 3, 19 * size, 9.5 * size, SHORE_LOOK.iceEdge, 0.6);
  const top: number[] = [];
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2 + turn;
    const wobble = 0.85 + ((h >>> (i * 3)) & 7) * 0.035;
    top.push(x + Math.cos(angle) * 18 * size * wobble, y + Math.sin(angle) * 9 * size * wobble);
  }
  pen.poly(top, SHORE_LOOK.floe, 1, { color: SHORE_LOOK.iceEdge, width: 1.5 });
}

// ---------------------------------------------------------------- explore box and highlight

export const EXPLORE_LOOK = { top: 0x9df5c4, left: 0x5fcf95, right: 0x3fae78, alpha: 0.5, height: 10 } as const;

/** A see-through green box on a fogged tile that can be explored now (inspired by the original game). */
export function drawExploreBox(pen: Pen, cx: number, cy: number): void {
  const h = EXPLORE_LOOK.height;
  const [, , rx, ry, bx, by, lx, ly] = diamond(cx, cy, 0.92) as [number, number, number, number, number, number, number, number];
  const edge = { color: 0xffffff, width: 1.5, alpha: 0.75 };
  pen.poly([lx, ly, bx, by, bx, by - h, lx, ly - h], EXPLORE_LOOK.left, EXPLORE_LOOK.alpha, edge);
  pen.poly([bx, by, rx, ry, rx, ry - h, bx, by - h], EXPLORE_LOOK.right, EXPLORE_LOOK.alpha, edge);
  pen.poly(diamond(cx, cy - h, 0.92), EXPLORE_LOOK.top, EXPLORE_LOOK.alpha, edge);
}

export function drawHighlight(pen: Pen, cx: number, cy: number, kind: 'hover' | 'selected'): void {
  const style = HIGHLIGHT[kind];
  pen.line([...diamond(cx, cy, 0.94), cx, cy - HALF_H * 0.94], style);
}
