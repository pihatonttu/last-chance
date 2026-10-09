/**
 * Isometric projection (packages/rules grid.ts convention):
 * screenX = (x − y) · w/2, screenY = (x + y) · h/2; south = largest x + y.
 * World coordinates here are the tile centres in pixels at zoom 1.
 */
import type { Coord } from '@saari/rules';

export const TILE_W = 96;
export const TILE_H = 48;
export const HALF_W = TILE_W / 2;
export const HALF_H = TILE_H / 2;

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function tileCenter(x: number, y: number): Point {
  return { x: (x - y) * HALF_W, y: (x + y) * HALF_H };
}

/** Diamond corners top, right, bottom, left as a flat [x0, y0, x1, y1, ...] list. */
export function diamond(cx: number, cy: number, scale = 1): number[] {
  const w = HALF_W * scale;
  const h = HALF_H * scale;
  return [cx, cy - h, cx + w, cy, cx, cy + h, cx - w, cy];
}

/** The tile whose diamond contains the world point (may be outside the map). */
export function worldToTile(wx: number, wy: number): Coord {
  const u = wx / HALF_W;
  const v = wy / HALF_H;
  // + 0 turns -0 into 0.
  return { x: Math.round((u + v) / 2) + 0, y: Math.round((v - u) / 2) + 0 };
}

/** World-space box around the given tiles, with extra room above for trees and buildings. */
export function tilesBounds(coords: readonly Coord[], margin = 0, headroom = TILE_H * 1.5): Rect | null {
  if (coords.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of coords) {
    const p = tileCenter(c.x, c.y);
    minX = Math.min(minX, p.x - HALF_W);
    maxX = Math.max(maxX, p.x + HALF_W);
    minY = Math.min(minY, p.y - HALF_H - headroom);
    maxY = Math.max(maxY, p.y + HALF_H);
  }
  return { minX: minX - margin, minY: minY - margin, maxX: maxX + margin, maxY: maxY + margin };
}

/** Painter's order: back (north) to front (south). */
export function drawOrder(a: Coord, b: Coord): number {
  return a.x + a.y - (b.x + b.y) || a.x - b.x;
}
