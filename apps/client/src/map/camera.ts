/** Pan and zoom maths for the map. screen = world · scale + (x, y). Pure functions. */
import type { Point, Rect } from './iso.ts';

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

export const MIN_SCALE = 0.3;
export const MAX_SCALE = 3;

export function screenToWorld(cam: Camera, sx: number, sy: number): Point {
  return { x: (sx - cam.x) / cam.scale, y: (sy - cam.y) / cam.scale };
}

export function worldToScreen(cam: Camera, wx: number, wy: number): Point {
  return { x: wx * cam.scale + cam.x, y: wy * cam.scale + cam.y };
}

/** Scale and centre so `bounds` fills the view with `padding` pixels around it. */
export function fitCamera(bounds: Rect, viewW: number, viewH: number, padding = 16, maxScale = 2.2): Camera {
  const w = Math.max(1, bounds.maxX - bounds.minX);
  const h = Math.max(1, bounds.maxY - bounds.minY);
  const availW = Math.max(1, viewW - padding * 2);
  const availH = Math.max(1, viewH - padding * 2);
  const scale = Math.min(maxScale, availW / w, availH / h);
  return {
    scale,
    x: viewW / 2 - ((bounds.minX + bounds.maxX) / 2) * scale,
    y: viewH / 2 - ((bounds.minY + bounds.maxY) / 2) * scale,
  };
}

export function panBy(cam: Camera, dx: number, dy: number): Camera {
  return { ...cam, x: cam.x + dx, y: cam.y + dy };
}

/** Zoom by `factor`, keeping the world point under (sx, sy) in place. */
export function zoomAt(cam: Camera, factor: number, sx: number, sy: number, min = MIN_SCALE, max = MAX_SCALE): Camera {
  const scale = Math.min(max, Math.max(min, cam.scale * factor));
  const anchor = screenToWorld(cam, sx, sy);
  return { scale, x: sx - anchor.x * scale, y: sy - anchor.y * scale };
}

/** Keeps at least `keep` pixels of the bounds inside the view on both axes. */
export function clampCamera(cam: Camera, bounds: Rect, viewW: number, viewH: number, keep = 96): Camera {
  const left = bounds.minX * cam.scale + cam.x;
  const right = bounds.maxX * cam.scale + cam.x;
  const top = bounds.minY * cam.scale + cam.y;
  const bottom = bounds.maxY * cam.scale + cam.y;
  let { x, y } = cam;
  const keepX = Math.min(keep, (right - left) / 2);
  const keepY = Math.min(keep, (bottom - top) / 2);
  if (right < keepX) x += keepX - right;
  if (left > viewW - keepX) x -= left - (viewW - keepX);
  if (bottom < keepY) y += keepY - bottom;
  if (top > viewH - keepY) y -= top - (viewH - keepY);
  return { ...cam, x, y };
}

/**
 * Where a student's map frames by default: the explored land with two tiles of room round
 * it (the green boxes to explore next and the fishing water), or the landing at the start.
 * The view widens by itself as the class explores.
 */
export function playArea(
  tiles: readonly { x: number; y: number; fog: boolean; terrain: string | null }[],
  landing: { x: number; y: number },
): { x: number; y: number }[] {
  const known = tiles.filter((t) => !t.fog && t.terrain !== null && t.terrain !== 'sea');
  const centres = known.length > 0 ? known : [landing];
  const out: { x: number; y: number }[] = [];
  for (const c of centres) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) out.push({ x: c.x + dx, y: c.y + dy });
  }
  return out;
}
