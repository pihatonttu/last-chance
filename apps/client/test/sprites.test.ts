import { describe, expect, it } from 'vitest';
import type { PublicTile } from '@saari/rules';
import { stockMax } from '../src/lib/rules-info.ts';
import { diamond, drawOrder, HALF_H, HALF_W, tileCenter, tilesBounds, worldToTile } from '../src/map/iso.ts';
import {
  drawExploreBox,
  drawFloe,
  drawHighlight,
  drawOverlay,
  drawShallowWater,
  drawShore,
  EFFECT_COLORS,
  mixColor,
  SHORE_LOOK,
  type Pen,
  type TileContext,
} from '../src/map/sprites.ts';
import { tile } from './fixtures.ts';

interface Call {
  kind: string;
  numbers: number[];
}

/** Counts shapes and checks every coordinate is a finite number. */
function recordingPen() {
  const calls: Call[] = [];
  const record = (kind: string, ...numbers: number[]) => calls.push({ kind, numbers });
  const pen: Pen = {
    poly: (points, fill) => record('poly', ...points, fill),
    circle: (x, y, r, fill) => record('circle', x, y, r, fill ?? 0),
    ellipse: (x, y, rx, ry, fill) => record('ellipse', x, y, rx, ry, fill),
    line: (points, s) => record('line', ...points, s.color, s.width),
    arc: (x, y, r, a, b, s) => record('arc', x, y, r, a, b, s.color),
  };
  return { pen, calls };
}

/** The fill of an ellipse or polygon call (its last number). */
const fillOf = (call: Call): number => call.numbers[call.numbers.length - 1]!;
const withFill = (calls: Call[], fill: number): Call[] =>
  calls.filter((c) => (c.kind === 'ellipse' || c.kind === 'poly') && fillOf(c) === fill);
const allFinite = (calls: Call[]): boolean => calls.every((c) => c.numbers.every((n) => Number.isFinite(n)));

function ctx(t: PublicTile, over: Partial<TileContext> = {}): TileContext {
  const c = tileCenter(t.x, t.y);
  return { cx: c.x, cy: c.y, exploreShare: 0, coastal: false, stockMax: t.terrain ? stockMax(t.terrain) : null, ...over };
}

const luminance = (color: number): number => 0.2126 * ((color >> 16) & 255) + 0.7152 * ((color >> 8) & 255) + 0.0722 * (color & 255);

/** A square of tiles, as the renderer visits them: back to front. */
function grid(size: number): { x: number; y: number }[] {
  const tiles: { x: number; y: number }[] = [];
  for (let x = 0; x < size; x++) for (let y = 0; y < size; y++) tiles.push({ x, y });
  return tiles.sort(drawOrder);
}

describe('overlay and highlights', () => {
  it('draws an exploration ring on fog only when work has started', () => {
    const fog = tile(1, 1, { fog: true, terrain: null, stock: null, work: null, uses: null, exploreWork: 1 });
    const none = recordingPen();
    drawOverlay(none.pen, fog, ctx(fog, { exploreShare: 0 }));
    expect(none.calls).toHaveLength(0);
    const ring = recordingPen();
    drawOverlay(ring.pen, fog, ctx(fog, { exploreShare: 0.5 }));
    expect(ring.calls.map((c) => c.kind)).toEqual(['circle', 'arc']);
    expect(allFinite(ring.calls)).toBe(true);
  });

  it('leaves explored tiles to their pictures: no badge, no level pips', () => {
    const built = tile(2, 2, { terrain: 'meadow', building: { kind: 'school', level: 2 } });
    const { pen, calls } = recordingPen();
    drawOverlay(pen, built, ctx(built));
    expect(calls).toHaveLength(0);
  });

  it('has an effect colour for every gain kind, and draws the highlights', () => {
    for (const key of ['food', 'wood', 'stone', 'work', 'recreation', 'education', 'tools'] as const) {
      expect(EFFECT_COLORS[key]).toBeTypeOf('number');
    }
    const { pen, calls } = recordingPen();
    drawHighlight(pen, 0, 0, 'hover');
    drawHighlight(pen, 0, 0, 'selected');
    expect(calls).toHaveLength(2);
    expect(allFinite(calls)).toBe(true);
  });

  it('draws the place to explore as a see-through box with a top and two sides', () => {
    const { pen, calls } = recordingPen();
    drawExploreBox(pen, 10, 20);
    expect(calls.filter((c) => c.kind === 'poly')).toHaveLength(3);
    expect(allFinite(calls)).toBe(true);
  });
});

describe('arctic shore', () => {
  it('has a light shore ice with a bluish edge, a dark hole, snow and a dark open sea', () => {
    const { snow, iceEdge, shoreIce, iceHole, openSea, floe } = SHORE_LOOK;
    // Bluish: more blue than red.
    expect(iceEdge & 255).toBeGreaterThan((iceEdge >> 16) & 255);
    // From the sea in: open sea and hole (dark), the edge, the ice, the snow. The floe is as white as the snow.
    expect(luminance(iceHole)).toBeLessThan(luminance(iceEdge));
    expect(luminance(openSea)).toBeLessThan(luminance(iceEdge));
    expect(luminance(iceEdge)).toBeLessThan(luminance(shoreIce));
    expect(luminance(shoreIce)).toBeLessThan(luminance(snow));
    expect(luminance(floe)).toBeGreaterThan(luminance(shoreIce));
  });

  it('draws shore ice round the island and an ice hole on some coastal tiles, the same tiles every time', () => {
    const holes = (): Set<string> => {
      const found = new Set<string>();
      for (const t of grid(24)) {
        const c = tileCenter(t.x, t.y);
        const { pen, calls } = recordingPen();
        drawShallowWater(pen, t, c.x, c.y, 'reef');
        drawShallowWater(pen, t, c.x, c.y, 'shallow');
        // The outer edge and the shore ice are on every coastal tile.
        expect(withFill(calls, SHORE_LOOK.iceEdge)).toHaveLength(1);
        expect(withFill(calls, SHORE_LOOK.shoreIce)).toHaveLength(1);
        const hole = withFill(calls, SHORE_LOOK.iceHole);
        expect(hole.length).toBeLessThanOrEqual(1);
        if (hole.length === 1) found.add(`${t.x},${t.y}`);
        expect(allFinite(calls)).toBe(true);
      }
      return found;
    };
    const first = holes();
    // Some tiles have a hole, most do not.
    expect(first.size).toBeGreaterThan(24 * 24 * 0.05);
    expect(first.size).toBeLessThan(24 * 24 * 0.5);
    expect([...holes()].sort()).toEqual([...first].sort());
  });

  it('draws the edge as the outer layer and the shore ice, with the hole, inside it', () => {
    const t = { x: 3, y: 5 };
    const edge = recordingPen();
    drawShallowWater(edge.pen, t, 0, 0, 'reef');
    expect(edge.calls).toHaveLength(1);
    expect(edge.calls[0]!.kind).toBe('ellipse');
    expect(withFill(edge.calls, SHORE_LOOK.iceHole)).toHaveLength(0);
    const ice = recordingPen();
    drawShallowWater(ice.pen, t, 0, 0, 'shallow');
    const [, , edgeRx, edgeRy] = edge.calls[0]!.numbers as [number, number, number, number];
    const disc = withFill(ice.calls, SHORE_LOOK.shoreIce)[0]!;
    expect(disc.numbers[2]).toBeLessThan(edgeRx);
    expect(disc.numbers[3]).toBeLessThan(edgeRy);
  });

  it('keeps an ice hole inside its shore ice and clear of the ice drawn after it', () => {
    // The renderer draws all shore ice in turn, back to front; a later tile's ice would paint over the hole.
    const tiles = grid(24);
    type Disc = { cx: number; cy: number; rx: number; ry: number };
    const shoreIce = new Map<string, Disc>();
    const holes = new Map<string, Disc>();
    for (const t of tiles) {
      const c = tileCenter(t.x, t.y);
      const { pen, calls } = recordingPen();
      drawShallowWater(pen, t, c.x, c.y, 'shallow');
      const [cx, cy, rx, ry] = withFill(calls, SHORE_LOOK.shoreIce)[0]!.numbers as [number, number, number, number];
      shoreIce.set(`${t.x},${t.y}`, { cx, cy, rx, ry });
      const hole = withFill(calls, SHORE_LOOK.iceHole)[0];
      if (hole) {
        const [hx, hy, hrx, hry] = hole.numbers as [number, number, number, number];
        holes.set(`${t.x},${t.y}`, { cx: hx, cy: hy, rx: hrx, ry: hry });
      }
    }
    const inside = (d: Disc, x: number, y: number) => ((x - d.cx) / d.rx) ** 2 + ((y - d.cy) / d.ry) ** 2 < 1;
    expect(holes.size).toBeGreaterThan(10);
    tiles.forEach((t, order) => {
      const hole = holes.get(`${t.x},${t.y}`);
      if (!hole) return;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const px = hole.cx + Math.cos(a) * hole.rx;
        const py = hole.cy + Math.sin(a) * hole.ry;
        expect(inside(shoreIce.get(`${t.x},${t.y}`)!, px, py)).toBe(true);
        for (const later of tiles.slice(order + 1)) {
          if (Math.abs(later.x - t.x) > 2 || Math.abs(later.y - t.y) > 2) continue;
          expect(inside(shoreIce.get(`${later.x},${later.y}`)!, px, py)).toBe(false);
        }
      }
    });
  });

  it('puts an ice floe on some open-sea tiles, deterministically', () => {
    const floes = (): Set<string> => {
      const found = new Set<string>();
      for (const t of grid(30)) {
        const c = tileCenter(t.x, t.y);
        const { pen, calls } = recordingPen();
        drawFloe(pen, t, c.x, c.y);
        if (calls.length > 0) {
          found.add(`${t.x},${t.y}`);
          expect(withFill(calls, SHORE_LOOK.floe).length).toBeGreaterThan(0);
        }
        expect(allFinite(calls)).toBe(true);
      }
      return found;
    };
    const first = floes();
    expect(first.size).toBeGreaterThan(30 * 30 * 0.05);
    expect(first.size).toBeLessThan(30 * 30 * 0.4);
    expect([...floes()].sort()).toEqual([...first].sort());
  });

  it('keeps a floe inside its own tile, so it never reaches the shore ice', () => {
    let drawn = 0;
    for (const t of grid(30)) {
      const c = tileCenter(t.x, t.y);
      const { pen, calls } = recordingPen();
      drawFloe(pen, t, c.x, c.y);
      for (const call of calls) {
        if (call.kind === 'poly') {
          const points = call.numbers.slice(0, -1);
          for (let i = 0; i < points.length; i += 2) {
            expect(Math.abs(points[i]! - c.x) / HALF_W + Math.abs(points[i + 1]! - c.y) / HALF_H).toBeLessThanOrEqual(1);
          }
        } else if (call.kind === 'ellipse') {
          const [x, y, rx, ry] = call.numbers as [number, number, number, number];
          expect(Math.abs(x - c.x) + rx).toBeLessThanOrEqual(HALF_W);
          expect(Math.abs(y - c.y) + ry).toBeLessThanOrEqual(HALF_H);
        }
      }
      if (calls.length > 0) drawn++;
    }
    expect(drawn).toBeGreaterThan(10);
  });

  it('covers the shore with snow', () => {
    const dry = recordingPen();
    drawShore(dry.pen, 10, 20, 'dry');
    expect(dry.calls).toHaveLength(1);
    expect(dry.calls[0]!.kind).toBe('ellipse');
    expect(fillOf(dry.calls[0]!)).toBe(SHORE_LOOK.snow);
    const wet = recordingPen();
    drawShore(wet.pen, 10, 20, 'wet');
    expect(wet.calls).toHaveLength(1);
    // The wet layer is the wider, icier band under the snow: half way between the snow and the shore ice.
    expect(wet.calls[0]!.numbers[2]).toBeGreaterThan(dry.calls[0]!.numbers[2]!);
    expect(fillOf(wet.calls[0]!)).toBe(mixColor(SHORE_LOOK.snow, SHORE_LOOK.shoreIce, 0.5));
    expect(allFinite([...dry.calls, ...wet.calls])).toBe(true);
  });
});

describe('isometric projection', () => {
  it('follows the rules convention: screenX = (x − y)·w/2, screenY = (x + y)·h/2', () => {
    expect(tileCenter(0, 0)).toEqual({ x: 0, y: 0 });
    expect(tileCenter(1, 0)).toEqual({ x: 48, y: 24 });
    expect(tileCenter(0, 1)).toEqual({ x: -48, y: 24 });
  });

  it('maps every point inside a diamond back to its tile', () => {
    for (let x = 0; x < 6; x++) {
      for (let y = 0; y < 6; y++) {
        const c = tileCenter(x, y);
        expect(worldToTile(c.x, c.y)).toEqual({ x, y });
        // Just inside each corner.
        const d = diamond(c.x, c.y, 0.9);
        for (let i = 0; i < 8; i += 2) expect(worldToTile(d[i]!, d[i + 1]!)).toEqual({ x, y });
      }
    }
  });

  it('orders tiles back to front and bounds them', () => {
    const tiles = [
      { x: 2, y: 2 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];
    expect([...tiles].sort(drawOrder)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 2 },
    ]);
    const b = tilesBounds(tiles, 0, 0)!;
    expect(b.minX).toBe(-48);
    expect(b.maxY).toBe(4 * 24 + 24);
    expect(tilesBounds([])).toBeNull();
  });
});
