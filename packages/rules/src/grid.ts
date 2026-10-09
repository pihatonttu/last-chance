/**
 * Square grid helpers. Coordinates are 0-based, tiles are stored row-major.
 * Isometric rendering convention: screenX = (x - y) * w/2, screenY = (x + y) * h/2,
 * so "south" (bottom of the screen) is the largest x + y.
 */
export interface Coord {
  x: number;
  y: number;
}

export function indexOf(width: number, c: Coord): number {
  return c.y * width + c.x;
}

export function inBounds(width: number, height: number, c: Coord): boolean {
  return c.x >= 0 && c.y >= 0 && c.x < width && c.y < height;
}

const ORTHOGONAL: readonly Coord[] = [
  { x: 0, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
];

const ALL_EIGHT: readonly Coord[] = [
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 1 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
];

function around(width: number, height: number, c: Coord, offsets: readonly Coord[]): Coord[] {
  return offsets
    .map((o) => ({ x: c.x + o.x, y: c.y + o.y }))
    .filter((n) => inBounds(width, height, n));
}

/** Orthogonal neighbours in row-major order (up, left, right, down). */
export function neighbors4(width: number, height: number, c: Coord): Coord[] {
  return around(width, height, c, ORTHOGONAL);
}

/** All eight neighbours in row-major order. */
export function neighbors8(width: number, height: number, c: Coord): Coord[] {
  return around(width, height, c, ALL_EIGHT);
}

export function chebyshev(a: Coord, b: Coord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
