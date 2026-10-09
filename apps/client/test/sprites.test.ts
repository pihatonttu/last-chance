import { describe, expect, it } from 'vitest';
import type { PublicTile } from '@saari/rules';
import { BUILDING_KINDS, LEVELS, TERRAINS } from '../src/lib/enums.ts';
import { stockMax } from '../src/lib/rules-info.ts';
import { diamond, drawOrder, tileCenter, tilesBounds, worldToTile } from '../src/map/iso.ts';
import {
  BUILDING_LOOK,
  byLevel,
  drawGround,
  drawHighlight,
  drawObjects,
  drawOverlay,
  drawWreck,
  EFFECT_COLORS,
  fieldColor,
  FIELD_LOOK,
  GLYPHS,
  LEVEL_PIPS,
  TERRAIN_LOOK,
  treeCount,
  type Pen,
  type TileContext,
} from '../src/map/sprites.ts';
import { tile } from './fixtures.ts';

/** Counts shapes and checks every coordinate is a finite number. */
function recordingPen() {
  const calls: { kind: string; numbers: number[] }[] = [];
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

function ctx(t: PublicTile, over: Partial<TileContext> = {}): TileContext {
  const c = tileCenter(t.x, t.y);
  return { cx: c.x, cy: c.y, exploreShare: 0, coastal: false, stockMax: t.terrain ? stockMax(t.terrain) : null, ...over };
}

describe('sprite mapping', () => {
  it('has a look for every terrain', () => {
    for (const terrain of TERRAINS) {
      expect(TERRAIN_LOOK[terrain]).toBeDefined();
      expect(Number.isInteger(TERRAIN_LOOK[terrain].ground)).toBe(true);
    }
  });

  it('has a look, glyph, shape and height for every building kind and level', () => {
    for (const kind of BUILDING_KINDS) {
      const look = BUILDING_LOOK[kind];
      expect(GLYPHS[look.glyph].length).toBeGreaterThan(0);
      for (const level of LEVELS) {
        expect(['tent', 'block', 'campfire']).toContain(byLevel(look.shapes, level));
        expect(byLevel(look.heights, level)).toBeGreaterThanOrEqual(0);
        expect(LEVEL_PIPS[level]).toBe(level);
      }
    }
  });

  it('draws every terrain, stocked or empty, with finite coordinates', () => {
    for (const terrain of TERRAINS) {
      for (const stock of [0, 15, 40]) {
        const t = tile(3, 4, { terrain, stock });
        const { pen, calls } = recordingPen();
        drawGround(pen, t, ctx(t, { coastal: true }));
        drawObjects(pen, t, ctx(t));
        drawOverlay(pen, t, ctx(t));
        expect(calls.length).toBeGreaterThan(0);
        for (const call of calls) for (const n of call.numbers) expect(Number.isFinite(n)).toBe(true);
      }
    }
  });

  it('draws every building kind at every level, with one pip per level', () => {
    for (const kind of BUILDING_KINDS) {
      for (const level of LEVELS) {
        const t = tile(2, 2, { terrain: 'meadow', building: { kind, level } });
        const objects = recordingPen();
        drawObjects(objects.pen, t, ctx(t));
        expect(objects.calls.length).toBeGreaterThan(2);
        const overlay = recordingPen();
        drawOverlay(overlay.pen, t, ctx(t));
        const pips = overlay.calls.filter((c) => c.kind === 'circle' && c.numbers[3] === 0xffd166);
        expect(pips).toHaveLength(level);
        for (const call of [...objects.calls, ...overlay.calls]) {
          for (const n of call.numbers) expect(Number.isFinite(n)).toBe(true);
        }
      }
    }
  });

  it('draws fog as mist and an exploration ring only when work has started', () => {
    const fog = tile(1, 1, { fog: true, terrain: null, stock: null, work: null, uses: null, exploreWork: 1 });
    const none = recordingPen();
    drawOverlay(none.pen, fog, ctx(fog, { exploreShare: 0 }));
    expect(none.calls).toHaveLength(0);
    const ring = recordingPen();
    drawOverlay(ring.pen, fog, ctx(fog, { exploreShare: 0.5 }));
    expect(ring.calls.map((c) => c.kind)).toEqual(['circle', 'arc']);
    const mist = recordingPen();
    drawObjects(mist.pen, fog, ctx(fog));
    expect(mist.calls.every((c) => c.kind === 'circle')).toBe(true);
  });

  it('shades fields by crop and thins forests as they are cut', () => {
    expect(fieldColor(0, 30)).toBe(FIELD_LOOK.soil);
    expect(fieldColor(30, 30)).toBe(FIELD_LOOK.crop);
    expect(treeCount(40, 40)).toBe(3);
    expect(treeCount(20, 40)).toBe(2);
    expect(treeCount(5, 40)).toBe(1);
    expect(treeCount(0, 40)).toBe(0);
  });

  it('has an effect colour for every gain kind, and draws the wreck and highlights', () => {
    for (const key of ['food', 'wood', 'stone', 'work', 'recreation', 'education', 'tools'] as const) {
      expect(EFFECT_COLORS[key]).toBeTypeOf('number');
    }
    const { pen, calls } = recordingPen();
    drawWreck(pen, 0, 0);
    drawHighlight(pen, 0, 0, 'hover');
    drawHighlight(pen, 0, 0, 'selected');
    expect(calls.length).toBeGreaterThan(3);
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
