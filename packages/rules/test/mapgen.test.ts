import { describe, expect, it } from 'vitest';
import { chebyshev, indexOf, neighbors4, neighbors8, type Coord } from '../src/grid.ts';
import { describeTerrain, generateTerrain } from '../src/mapgen.ts';
import type { MapGenParams, NaturalTerrain, TerrainMap } from '../src/types.ts';

export const TEST_PARAMS: MapGenParams = {
  landBase: 12,
  landPerVillager: 2,
  forestShare: 0.5,
  rockShare: 0.2,
  rockMinDistance: 3,
  seaRing: 2,
  screenAspect: 1.6,
};

const SIZES = [1, 2, 5, 15, 30, 40] as const;
const SEEDS = Array.from({ length: 25 }, (_, i) => i * 7919 + 1);

const cache = new Map<string, TerrainMap>();

/** Memoized generation so every requirement checks the same 150 maps. */
function gen(seed: number, villagers: number): TerrainMap {
  const key = `${seed}:${villagers}`;
  let map = cache.get(key);
  if (!map) {
    map = generateTerrain(seed, villagers, TEST_PARAMS);
    cache.set(key, map);
  }
  return map;
}

function landTarget(villagers: number): number {
  return TEST_PARAMS.landBase + TEST_PARAMS.landPerVillager * villagers;
}

function at(map: TerrainMap, c: Coord): NaturalTerrain {
  const t = map.terrain[indexOf(map.width, c)];
  if (t === undefined) throw new Error(`no tile at ${c.x},${c.y}`);
  return t;
}

function allTiles(map: TerrainMap): Coord[] {
  const out: Coord[] = [];
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) out.push({ x, y });
  return out;
}

function isLand(map: TerrainMap, c: Coord): boolean {
  return at(map, c) !== 'sea';
}

function landTiles(map: TerrainMap): Coord[] {
  return allTiles(map).filter((c) => isLand(map, c));
}

function tilesOf(map: TerrainMap, kind: NaturalTerrain): Coord[] {
  return allTiles(map).filter((c) => at(map, c) === kind);
}

/** Number of tiles reachable from `starts` through 4-neighbours that satisfy `pass`. */
function flood(map: TerrainMap, starts: Coord[], pass: (c: Coord) => boolean): number {
  const seen = new Set<number>();
  const queue = starts.filter(pass);
  for (const s of queue) seen.add(indexOf(map.width, s));
  for (let i = 0; i < queue.length; i++) {
    for (const n of neighbors4(map.width, map.height, queue[i]!)) {
      const k = indexOf(map.width, n);
      if (!seen.has(k) && pass(n)) {
        seen.add(k);
        queue.push(n);
      }
    }
  }
  return seen.size;
}

function onBorder(map: TerrainMap, c: Coord): boolean {
  return c.x === 0 || c.y === 0 || c.x === map.width - 1 || c.y === map.height - 1;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Recomputes the landing rule (req. 7) from the land mask alone. */
function expectedLanding(map: TerrainMap): Coord | undefined {
  const land = landTiles(map);
  const mid = median(land.map((c) => c.x - c.y));
  const candidates = land.filter((c) => {
    const around = neighbors8(map.width, map.height, c);
    const landAround = around.filter((n) => isLand(map, n)).length;
    return landAround >= 2 && around.length - landAround >= 2;
  });
  candidates.sort(
    (a, b) =>
      b.x + b.y - (a.x + a.y) ||
      Math.abs(a.x - a.y - mid) - Math.abs(b.x - b.y - mid) ||
      a.x - b.x,
  );
  return candidates[0];
}

function screenAspect(map: TerrainMap): number {
  const land = landTiles(map);
  const us = land.map((c) => c.x - c.y);
  const vs = land.map((c) => c.x + c.y);
  return (2 * (Math.max(...us) - Math.min(...us) + 1)) / (Math.max(...vs) - Math.min(...vs) + 1);
}

describe('generateTerrain', () => {
  it('returns the same map for the same seed, villagers and params', () => {
    const a = generateTerrain(1234, 15, TEST_PARAMS);
    const b = generateTerrain(1234, 15, TEST_PARAMS);
    expect(a).toEqual(b);
  });

  it('returns different maps for different seeds', () => {
    const maps = new Set(Array.from({ length: 10 }, (_, i) => describeTerrain(generateTerrain(i + 1, 15, TEST_PARAMS))));
    expect(maps.size).toBeGreaterThanOrEqual(9);
  });

  it('does not mutate the params object', () => {
    const params = { ...TEST_PARAMS };
    generateTerrain(7, 10, params);
    expect(params).toEqual(TEST_PARAMS);
  });

  it('throws a descriptive error when no valid island can exist', () => {
    const tiny = { ...TEST_PARAMS, landBase: 1, landPerVillager: 0 };
    expect(() => generateTerrain(1, 1, tiny)).toThrow(/could not build/i);
  });

  it('still returns a valid map when no tile is far enough for rocks', () => {
    const map = generateTerrain(3, 5, { ...TEST_PARAMS, rockMinDistance: 50 });
    expect(tilesOf(map, 'rock')).toHaveLength(0);
    expect(landTiles(map)).toHaveLength(landTarget(5));
    expect(tilesOf(map, 'spring')).toHaveLength(1);
  });

  describe.each(SIZES)('with %i villagers over 25 seeds', (villagers) => {
    const maps = (): { seed: number; map: TerrainMap }[] => SEEDS.map((seed) => ({ seed, map: gen(seed, villagers) }));

    it('has exactly landBase + landPerVillager * villagers land tiles', () => {
      for (const { seed, map } of maps()) {
        expect(map.terrain).toHaveLength(map.width * map.height);
        expect(landTiles(map).length, `seed ${seed}`).toBe(landTarget(villagers));
      }
    });

    it('forms a single 4-connected island', () => {
      for (const { seed, map } of maps()) {
        const land = landTiles(map);
        expect(flood(map, [land[0]!], (c) => isLand(map, c)), `seed ${seed}`).toBe(land.length);
      }
    });

    it('keeps a ring of open sea along every edge', () => {
      const ring = TEST_PARAMS.seaRing;
      for (const { seed, map } of maps()) {
        for (const c of allTiles(map)) {
          const inRing = c.x < ring || c.y < ring || c.x >= map.width - ring || c.y >= map.height - ring;
          if (inRing) expect(at(map, c), `seed ${seed} at ${c.x},${c.y}`).toBe('sea');
        }
      }
    });

    it('has no lakes: all sea connects to the border', () => {
      for (const { seed, map } of maps()) {
        const isSea = (c: Coord): boolean => !isLand(map, c);
        const border = allTiles(map).filter((c) => onBorder(map, c));
        const seaCount = map.width * map.height - landTarget(villagers);
        expect(flood(map, border, isSea), `seed ${seed}`).toBe(seaCount);
      }
    });

    it('lands on the southernmost eligible coast tile, which is a meadow', () => {
      for (const { seed, map } of maps()) {
        expect(map.landing, `seed ${seed}`).toEqual(expectedLanding(map));
        expect(at(map, map.landing), `seed ${seed}`).toBe('meadow');
      }
    });

    it('gives the landing at least one meadow, one forest and two sea neighbours', () => {
      for (const { seed, map } of maps()) {
        const around = neighbors8(map.width, map.height, map.landing).map((c) => at(map, c));
        expect(around.filter((t) => t === 'meadow').length, `seed ${seed}`).toBeGreaterThanOrEqual(1);
        expect(around.filter((t) => t === 'forest').length, `seed ${seed}`).toBeGreaterThanOrEqual(1);
        expect(around.filter((t) => t === 'sea').length, `seed ${seed}`).toBeGreaterThanOrEqual(2);
      }
    });

    it('places exactly one spring in the farthest third from the landing', () => {
      for (const { seed, map } of maps()) {
        const springs = tilesOf(map, 'spring');
        expect(springs, `seed ${seed}`).toHaveLength(1);
        const spring = springs[0]!;
        const springDist = chebyshev(spring, map.landing);
        const land = landTiles(map);
        const notFarther = land.filter((c) => chebyshev(c, map.landing) <= springDist).length;
        expect(notFarther * 3, `seed ${seed}`).toBeGreaterThanOrEqual(land.length * 2);
      }
    });

    it('keeps every rock at least rockMinDistance from the landing', () => {
      for (const { seed, map } of maps()) {
        for (const rock of tilesOf(map, 'rock')) {
          expect(chebyshev(rock, map.landing), `seed ${seed}`).toBeGreaterThanOrEqual(TEST_PARAMS.rockMinDistance);
        }
      }
    });

    it('matches the rock and forest shares', () => {
      for (const { seed, map } of maps()) {
        const land = landTiles(map);
        const spare = land.length - 2;
        const springTile = tilesOf(map, 'spring')[0]!;
        const eligible = land.filter(
          (c) =>
            chebyshev(c, map.landing) >= TEST_PARAMS.rockMinDistance &&
            !(c.x === springTile.x && c.y === springTile.y),
        );
        const rocks = tilesOf(map, 'rock').length;
        const forests = tilesOf(map, 'forest').length;
        expect(rocks, `seed ${seed}`).toBe(Math.min(Math.round(TEST_PARAMS.rockShare * spare), eligible.length));
        expect(Math.abs(forests - Math.round(TEST_PARAMS.forestShare * spare)), `seed ${seed}`).toBeLessThanOrEqual(1);
      }
    });
  });

  it('shapes the island for a landscape screen', () => {
    const aspects: number[] = [];
    for (const villagers of [10, 20, 30, 40]) {
      for (const seed of SEEDS.slice(0, 20)) {
        const aspect = screenAspect(gen(seed, villagers));
        expect(aspect, `seed ${seed}, ${villagers} villagers`).toBeGreaterThanOrEqual(1.1);
        expect(aspect, `seed ${seed}, ${villagers} villagers`).toBeLessThanOrEqual(2.4);
        aspects.push(aspect);
      }
    }
    const mean = aspects.reduce((a, b) => a + b, 0) / aspects.length;
    expect(mean).toBeGreaterThan(1.35);
    expect(mean).toBeLessThan(1.85);
  });

  it('keeps the grid tight around the island', () => {
    for (let villagers = 15; villagers <= 40; villagers++) {
      const map = gen(1, villagers);
      const coverage = landTarget(villagers) / (map.width * map.height);
      expect(coverage, `${villagers} villagers on ${map.width}x${map.height}`).toBeGreaterThanOrEqual(0.25);
    }
    const largest = gen(1, 40);
    expect(largest.width).toBeLessThanOrEqual(40);
    expect(largest.height).toBeLessThanOrEqual(40);
  });

  it('generates a 40-villager map in under 50 ms on average', () => {
    const runs = 20;
    const start = performance.now();
    for (let i = 0; i < runs; i++) generateTerrain(1000 + i, 40, TEST_PARAMS);
    const average = (performance.now() - start) / runs;
    expect(average).toBeLessThan(50);
  });
});

describe('describeTerrain', () => {
  it('renders one character per tile with the landing and spring marked', () => {
    for (const villagers of [5, 15, 30]) {
      const map = gen(SEEDS[0]!, villagers);
      const text = describeTerrain(map);
      if (process.env['SHOW_MAPS']) console.log(`${villagers} villagers (${map.width}x${map.height}):\n${text}\n`);
      const rows = text.split('\n');
      expect(rows).toHaveLength(map.height);
      for (const row of rows) expect(row).toMatch(new RegExp(`^[~.T^oL]{${map.width}}$`));
      const count = (ch: string): number => [...text].filter((c) => c === ch).length;
      expect(count('L')).toBe(1);
      expect(count('o')).toBe(1);
      expect(rows[map.landing.y]![map.landing.x]).toBe('L');
      expect(count('T')).toBe(tilesOf(map, 'forest').length);
      expect(count('^')).toBe(tilesOf(map, 'rock').length);
      expect(count('.') + 1).toBe(tilesOf(map, 'meadow').length);
      expect(count('~')).toBe(tilesOf(map, 'sea').length);
    }
  });
});
