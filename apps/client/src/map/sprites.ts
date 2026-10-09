/**
 * Every terrain / building → picture decision of the map lives here (P9, P10). The
 * current art is placeholder vector shapes drawn through a tiny `Pen` interface, so
 * this module has no PixiJS dependency and can be unit-tested. When the Kenney CC0
 * sprites arrive, these functions become texture lookups and the renderer stays.
 */
import type { BuildingKind, Gain, Level, PublicTile, Terrain } from '@saari/rules';
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

/** Canvas background around the grid: open sea. Also used by CSS (--map-sea). */
export const MAP_BACKGROUND = 0x1f5f86;
export const OUTLINE = 0x1d2a33;

export interface TerrainLook {
  ground: number;
  edge: number;
}

export const TERRAIN_LOOK: Record<Terrain, TerrainLook> = {
  sea: { ground: 0x3b82c4, edge: 0x2f6fa6 },
  meadow: { ground: 0x9ccc65, edge: 0x7cb342 },
  forest: { ground: 0x6aa84f, edge: 0x4e8a3a },
  rock: { ground: 0xa3a3a3, edge: 0x7d7d7d },
  spring: { ground: 0x9ccc65, edge: 0x7cb342 },
  field: { ground: 0xa1887f, edge: 0x8d6e63 },
  quarry: { ground: 0xbcab90, edge: 0x9a8a70 },
};

export const COASTAL_SEA = 0x58a6dc;

export const FOG_LOOK = {
  ground: 0xdfe7ed,
  edge: 0xc3cfd8,
  mist: 0xffffff,
  mistAlpha: 0.7,
  ringTrack: 0x8fa3b2,
  ringProgress: 0xf4a261,
  ringRadius: 15,
  ringWidth: 5,
} as const;

export const FIELD_LOOK = { soil: 0xa1887f, crop: 0xd9b43c, furrow: 0x5d4037 } as const;
export const TREE_LOOK = { trunk: 0x6d4c41, canopyDark: 0x2e7d32, canopyLight: 0x43a047 } as const;
export const ROCK_LOOK = { boulder: 0x8f8f8f, boulderLight: 0xc4c4c4 } as const;
export const SPRING_LOOK = { pool: 0x4fc3f7, rim: 0x0277bd, shine: 0xffffff } as const;
export const QUARRY_LOOK = { pit: 0x7d6b55, block: 0xdadada } as const;
export const WRECK_LOOK = { hull: 0x7a5230, hullDark: 0x5a3a20, mast: 0x4e342e, flag: 0xe63946 } as const;

export type BuildingShape = 'tent' | 'block' | 'campfire';
export type GlyphId = 'house' | 'book' | 'hammer' | 'flame';

export interface BuildingLook {
  wall: number;
  wallShade: number;
  roof: number;
  roofShade: number;
  /** Badge glyph colour; also the kind's colour in legends. */
  accent: number;
  glyph: GlyphId;
  /** Shape per level 1..3. */
  shapes: readonly [BuildingShape, BuildingShape, BuildingShape];
  /** Wall height in pixels per level 1..3. */
  heights: readonly [number, number, number];
  /** Pointed roof per level 1..3. */
  pointedRoof: readonly [boolean, boolean, boolean];
}

export const BUILDING_LOOK: Record<BuildingKind, BuildingLook> = {
  shelter: {
    wall: 0xd7b98e,
    wallShade: 0xb8976a,
    roof: 0xd9534f,
    roofShade: 0xa93f3c,
    accent: 0xc0392b,
    glyph: 'house',
    shapes: ['tent', 'block', 'block'],
    heights: [0, 14, 22],
    pointedRoof: [true, true, true],
  },
  school: {
    wall: 0xf3e5c8,
    wallShade: 0xd6c39d,
    roof: 0x3f72af,
    roofShade: 0x2d5585,
    accent: 0x2d5ea8,
    glyph: 'book',
    shapes: ['block', 'block', 'block'],
    heights: [14, 20, 28],
    pointedRoof: [true, true, false],
  },
  workshop: {
    wall: 0xb08968,
    wallShade: 0x8d6b4d,
    roof: 0x6c757d,
    roofShade: 0x4f565c,
    accent: 0x495057,
    glyph: 'hammer',
    shapes: ['block', 'block', 'block'],
    heights: [12, 18, 26],
    pointedRoof: [false, true, true],
  },
  gathering: {
    wall: 0xe9c46a,
    wallShade: 0xc9a44c,
    roof: 0x8e5ea2,
    roofShade: 0x6d4680,
    accent: 0xe76f51,
    glyph: 'flame',
    shapes: ['campfire', 'block', 'block'],
    heights: [0, 12, 18],
    pointedRoof: [false, false, true],
  },
};

/** Little gold dots under the badge: one per building level. */
export const LEVEL_PIPS: Record<Level, number> = { 1: 1, 2: 2, 3: 3 };
export const PIP_LOOK = { fill: 0xffd166, radius: 3.5, gap: 9 } as const;
export const BADGE_LOOK = { fill: 0xffffff, radius: 13, glyphScale: 8.5 } as const;

/** Glyphs as polygons in a unit box centred on 0, 0. */
export const GLYPHS: Record<GlyphId, readonly (readonly number[])[]> = {
  house: [[-0.8, 0.05, 0, -0.75, 0.8, 0.05, 0.55, 0.05, 0.55, 0.75, -0.55, 0.75, -0.55, 0.05]],
  book: [
    [-0.85, -0.55, -0.06, -0.4, -0.06, 0.72, -0.85, 0.57],
    [0.85, -0.55, 0.06, -0.4, 0.06, 0.72, 0.85, 0.57],
  ],
  hammer: [
    [-0.13, -0.25, 0.13, -0.25, 0.13, 0.85, -0.13, 0.85],
    [-0.72, -0.7, 0.72, -0.7, 0.72, -0.22, -0.72, -0.22],
  ],
  flame: [[0, -0.88, 0.48, -0.2, 0.56, 0.32, 0.3, 0.76, -0.3, 0.76, -0.56, 0.32, -0.38, -0.08, -0.14, 0.12]],
};

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

/** Deterministic small hash for per-tile variation (wave and tuft placement). */
export function tileHash(x: number, y: number): number {
  let h = Math.imul(x + 0x9e37, 0x85ebca6b) ^ Math.imul(y + 0x79b9, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2f);
  return (h ^ (h >>> 15)) >>> 0;
}

/** Entry for building level 1..3 of a per-level tuple. */
export function byLevel<T>(values: readonly [T, T, T], level: Level): T {
  return values[level - 1] as T;
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

/** Field colour by crop left: bare soil when empty, golden when full. */
export function fieldColor(stock: number, max: number): number {
  return mixColor(FIELD_LOOK.soil, FIELD_LOOK.crop, max > 0 ? stock / max : 0);
}

/** Trees drawn on a forest tile: 3 when well stocked, fewer as it is cut down. */
export function treeCount(stock: number, max: number): number {
  if (stock <= 0) return 0;
  const share = max > 0 ? stock / max : 1;
  if (share >= 0.7) return 3;
  if (share >= 0.35) return 2;
  return 1;
}

export function groundColor(tile: PublicTile, ctx: TileContext): number {
  if (tile.fog || tile.terrain === null) return FOG_LOOK.ground;
  if (tile.terrain === 'sea') return ctx.coastal ? COASTAL_SEA : TERRAIN_LOOK.sea.ground;
  if (tile.terrain === 'field') return fieldColor(tile.stock ?? 0, ctx.stockMax ?? 1);
  return TERRAIN_LOOK[tile.terrain].ground;
}

// ---------------------------------------------------------------- ground layer

/** Flat things: the diamond and what lies on it (waves, furrows, pool, pit). */
export function drawGround(pen: Pen, tile: PublicTile, ctx: TileContext): void {
  const { cx, cy } = ctx;
  const edge = tile.fog || tile.terrain === null ? FOG_LOOK.edge : TERRAIN_LOOK[tile.terrain].edge;
  pen.poly(diamond(cx, cy), groundColor(tile, ctx), 1, { color: edge, width: 1, alpha: 0.7 });
  if (tile.fog || tile.terrain === null) return;
  const h = tileHash(tile.x, tile.y);
  switch (tile.terrain) {
    case 'sea':
      if (h % 3 === 0) {
        const ox = ((h >> 4) % 20) - 10;
        pen.arc(cx + ox - 6, cy, 6, Math.PI * 1.1, Math.PI * 1.9, { color: 0xffffff, width: 2, alpha: 0.45 });
        pen.arc(cx + ox + 6, cy, 6, Math.PI * 1.1, Math.PI * 1.9, { color: 0xffffff, width: 2, alpha: 0.45 });
      }
      return;
    case 'meadow':
    case 'spring':
      for (let i = 0; i < 3; i++) {
        const tx = cx + ((((h >> (i * 5)) & 31) - 16) * HALF_W) / 40;
        const ty = cy + ((((h >> (i * 5 + 3)) & 15) - 8) * HALF_H) / 20;
        pen.line([tx - 3, ty, tx - 1, ty - 5, tx + 1, ty, tx + 3, ty - 5], { color: 0x689f38, width: 1.5, alpha: 0.8 });
      }
      if (tile.terrain === 'spring') {
        pen.ellipse(cx, cy + 2, 24, 12, SPRING_LOOK.pool, 1, { color: SPRING_LOOK.rim, width: 2 });
        pen.ellipse(cx - 7, cy - 1, 7, 3, SPRING_LOOK.shine, 0.7);
      }
      return;
    case 'field': {
      const d = diamond(cx, cy, 0.86);
      const [tx, ty, rx, ry, bx, by, lx, ly] = d as [number, number, number, number, number, number, number, number];
      for (let i = 1; i <= 3; i++) {
        const k = i / 4;
        pen.line([lerp(tx, lx, k), lerp(ty, ly, k), lerp(rx, bx, k), lerp(ry, by, k)], {
          color: FIELD_LOOK.furrow,
          width: 2,
          alpha: 0.35,
        });
      }
      return;
    }
    case 'quarry':
      pen.poly(diamond(cx, cy + 2, 0.55), QUARRY_LOOK.pit, 1);
      pen.poly([cx - 20, cy - 4, cx - 10, cy - 9, cx - 4, cy - 6, cx - 14, cy - 1], QUARRY_LOOK.block, 1, {
        color: OUTLINE,
        width: 1,
        alpha: 0.4,
      });
      pen.poly([cx + 8, cy + 8, cx + 18, cy + 3, cx + 24, cy + 6, cx + 14, cy + 11], QUARRY_LOOK.block, 1, {
        color: OUTLINE,
        width: 1,
        alpha: 0.4,
      });
      return;
    case 'rock':
    case 'forest':
      return;
  }
}

// ---------------------------------------------------------------- object layer

function drawTree(pen: Pen, x: number, y: number, size: number): void {
  pen.poly([x - 2, y, x + 2, y, x + 2, y - 7 * size, x - 2, y - 7 * size], TREE_LOOK.trunk, 1);
  const top = y - 34 * size;
  const base = y - 6 * size;
  const half = 12 * size;
  pen.poly([x - half, base, x, top, x, base + 3 * size], TREE_LOOK.canopyDark, 1);
  pen.poly([x, top, x + half, base, x, base + 3 * size], TREE_LOOK.canopyLight, 1);
}

function drawBoulder(pen: Pen, x: number, y: number, s: number): void {
  pen.poly([x - 13 * s, y, x - 9 * s, y - 12 * s, x + 2 * s, y - 16 * s, x + 12 * s, y - 7 * s, x + 11 * s, y], ROCK_LOOK.boulder, 1, {
    color: OUTLINE,
    width: 1,
    alpha: 0.35,
  });
  pen.poly([x - 9 * s, y - 12 * s, x + 2 * s, y - 16 * s, x + 6 * s, y - 11 * s, x - 4 * s, y - 8 * s], ROCK_LOOK.boulderLight, 1);
}

/** Footprint corners of a building box: top, right, bottom, left. */
function footprint(cx: number, cy: number, scale: number): [number, number, number, number, number, number, number, number] {
  return diamond(cx, cy, scale) as [number, number, number, number, number, number, number, number];
}

/** Returns the y of the highest point, for the badge. */
function drawBuilding(pen: Pen, kind: BuildingKind, level: Level, cx: number, cy: number): number {
  const look = BUILDING_LOOK[kind];
  const shape = byLevel(look.shapes, level);
  const wallH = byLevel(look.heights, level);
  const scale = 0.5 + level * 0.06;
  const [tx, ty, rx, ry, bx, by, lx, ly] = footprint(cx, cy + 2, scale);

  if (shape === 'campfire') {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      pen.ellipse(cx + Math.cos(a) * 16, cy + 2 + Math.sin(a) * 8, 4, 3, 0x9e9e9e, 1, { color: OUTLINE, width: 1, alpha: 0.4 });
    }
    pen.poly([cx - 12, cy + 4, cx + 10, cy - 2, cx + 12, cy + 2, cx - 10, cy + 8], 0x6d4c41, 1);
    const flame = GLYPHS.flame[0]!;
    pen.poly(scalePoints(flame, cx, cy - 8, 11), 0xf4a261, 1);
    pen.poly(scalePoints(flame, cx, cy - 5, 6), 0xffd166, 1);
    return cy - 20;
  }

  if (shape === 'tent') {
    const apexY = cy - 30;
    pen.poly([lx, ly, bx, by, cx, apexY], look.roofShade, 1, { color: OUTLINE, width: 1, alpha: 0.5 });
    pen.poly([bx, by, rx, ry, cx, apexY], look.roof, 1, { color: OUTLINE, width: 1, alpha: 0.5 });
    pen.line([cx, apexY, cx, apexY - 6], { color: OUTLINE, width: 2 });
    return apexY - 6;
  }

  // Walls: left face in shade, right face lit.
  pen.poly([lx, ly, bx, by, bx, by - wallH, lx, ly - wallH], look.wallShade, 1, { color: OUTLINE, width: 1, alpha: 0.5 });
  pen.poly([bx, by, rx, ry, rx, ry - wallH, bx, by - wallH], look.wall, 1, { color: OUTLINE, width: 1, alpha: 0.5 });
  // Door on the lit face.
  const doorX = lerp(bx, rx, 0.45);
  const doorY = lerp(by, ry, 0.45);
  pen.poly([doorX - 3, doorY - 1, doorX + 3, doorY - 4, doorX + 3, doorY - Math.min(12, wallH) - 3, doorX - 3, doorY - Math.min(12, wallH)], 0x5d4037, 1);

  if (byLevel(look.pointedRoof, level)) {
    const apexY = cy + 2 - wallH - 18 - level * 2;
    pen.poly([lx, ly - wallH, bx, by - wallH, cx, apexY], look.roofShade, 1, { color: OUTLINE, width: 1, alpha: 0.5 });
    pen.poly([bx, by - wallH, rx, ry - wallH, cx, apexY], look.roof, 1, { color: OUTLINE, width: 1, alpha: 0.5 });
    return apexY;
  }
  pen.poly([tx, ty - wallH, rx, ry - wallH, bx, by - wallH, lx, ly - wallH], look.roof, 1, { color: OUTLINE, width: 1, alpha: 0.5 });
  return ty - wallH;
}

function scalePoints(points: readonly number[], cx: number, cy: number, s: number): number[] {
  return points.map((v, i) => (i % 2 === 0 ? cx + v * s : cy + v * s));
}

/** Upright things in painter's order: trees, boulders, buildings, mist. */
export function drawObjects(pen: Pen, tile: PublicTile, ctx: TileContext): void {
  const { cx, cy } = ctx;
  if (tile.fog || tile.terrain === null) {
    const h = tileHash(tile.x, tile.y);
    const dx = (h % 9) - 4;
    pen.circle(cx - 14 + dx, cy - 4, 12, FOG_LOOK.mist, FOG_LOOK.mistAlpha);
    pen.circle(cx + 6 + dx, cy - 9, 15, FOG_LOOK.mist, FOG_LOOK.mistAlpha);
    pen.circle(cx + 18 + dx, cy + 1, 10, FOG_LOOK.mist, FOG_LOOK.mistAlpha);
    return;
  }
  if (tile.building) {
    drawBuilding(pen, tile.building.kind, tile.building.level, cx, cy);
    return;
  }
  if (tile.terrain === 'forest') {
    const count = treeCount(tile.stock ?? 0, ctx.stockMax ?? 1);
    const spots: readonly [number, number, number][] = [
      [-16, -2, 0.9],
      [16, -4, 0.85],
      [0, 10, 1],
    ];
    for (const [ox, oy, size] of spots.slice(0, count)) drawTree(pen, cx + ox, cy + oy, size);
    return;
  }
  if (tile.terrain === 'rock') {
    drawBoulder(pen, cx - 10, cy + 2, 1);
    drawBoulder(pen, cx + 14, cy + 8, 0.7);
  }
}

/** Top layer: building badges with level pips and exploration progress rings. */
export function drawOverlay(pen: Pen, tile: PublicTile, ctx: TileContext): void {
  const { cx, cy } = ctx;
  if (tile.fog) {
    if (ctx.exploreShare <= 0) return;
    const r = FOG_LOOK.ringRadius;
    pen.circle(cx, cy - 4, r, null, 1, { color: FOG_LOOK.ringTrack, width: FOG_LOOK.ringWidth, alpha: 0.6 });
    const start = -Math.PI / 2;
    pen.arc(cx, cy - 4, r, start, start + Math.PI * 2 * Math.min(1, ctx.exploreShare), {
      color: FOG_LOOK.ringProgress,
      width: FOG_LOOK.ringWidth,
    });
    return;
  }
  const building = tile.building;
  if (!building) return;
  const look = BUILDING_LOOK[building.kind];
  const top = buildingTop(building.kind, building.level, cy);
  const by = top - BADGE_LOOK.radius - 4;
  pen.circle(cx, by, BADGE_LOOK.radius, BADGE_LOOK.fill, 1, { color: OUTLINE, width: 2 });
  for (const poly of GLYPHS[look.glyph]) pen.poly(scalePoints(poly, cx, by, BADGE_LOOK.glyphScale), look.accent, 1);
  const pips = LEVEL_PIPS[building.level];
  const startX = cx - ((pips - 1) * PIP_LOOK.gap) / 2;
  for (let i = 0; i < pips; i++) {
    pen.circle(startX + i * PIP_LOOK.gap, by + BADGE_LOOK.radius + 6, PIP_LOOK.radius, PIP_LOOK.fill, 1, { color: OUTLINE, width: 1.5 });
  }
}

/** Highest point of a building, computed with a throwaway pen. */
function buildingTop(kind: BuildingKind, level: Level, cy: number): number {
  return drawBuilding(NULL_PEN, kind, level, 0, cy);
}

const NULL_PEN: Pen = {
  poly: () => undefined,
  circle: () => undefined,
  ellipse: () => undefined,
  line: () => undefined,
  arc: () => undefined,
};

/** The wreck the class came ashore from, drawn on the sea next to the landing. */
export function drawWreck(pen: Pen, cx: number, cy: number): void {
  pen.poly([cx - 26, cy - 4, cx + 22, cy - 12, cx + 28, cy - 2, cx + 8, cy + 10, cx - 18, cy + 8], WRECK_LOOK.hull, 1, {
    color: OUTLINE,
    width: 1.5,
  });
  pen.poly([cx - 26, cy - 4, cx + 22, cy - 12, cx + 18, cy - 6, cx - 20, cy + 1], WRECK_LOOK.hullDark, 1);
  pen.line([cx - 2, cy - 6, cx + 6, cy - 40], { color: WRECK_LOOK.mast, width: 3 });
  pen.poly([cx + 6, cy - 40, cx + 24, cy - 34, cx + 5, cy - 28], WRECK_LOOK.flag, 1, { color: OUTLINE, width: 1 });
}

export function drawHighlight(pen: Pen, cx: number, cy: number, kind: 'hover' | 'selected'): void {
  const style = HIGHLIGHT[kind];
  pen.line([...diamond(cx, cy, 0.94), cx, cy - HALF_H * 0.94], style);
}
