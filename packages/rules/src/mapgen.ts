/**
 * Island terrain generator. Grows one organic island inside an ellipse shaped for a
 * landscape isometric screen, then paints the landing, spring, rocks and forest.
 * Uses only IEEE-exact arithmetic (no trigonometry), so every JS engine builds the
 * same map from the same seed.
 */
import { chebyshev, indexOf, neighbors4, neighbors8, type Coord } from './grid.ts';
import { createRng, type Rng } from './rng.ts';
import type { MapGenParams, NaturalTerrain, TerrainMap } from './types.ts';

/** Whole shapes regrown before giving up. */
const MAX_ATTEMPTS = 50;
/** Per-tile noise added to the ellipse distance; roughens the coastline. */
const COAST_JITTER = 0.3;
/** Priority bonus per land neighbour; fills bays and suppresses spurs. */
const NEIGHBOUR_PULL = 0.1;
/** Maximum amplitudes of the 2-, 3- and 4-lobed wobble of the ellipse radius. */
const WOBBLE = [0.06, 0.1, 0.08] as const;
/** Chance that the next rock or forest tile grows from an existing one. */
const ROCK_CLUMPING = 0.8;
const FOREST_CLUMPING = 0.75;

const GLYPH: Record<NaturalTerrain, string> = {
  sea: '~',
  meadow: '.',
  forest: 'T',
  rock: '^',
  spring: 'o',
};

/** Grid size and the island ellipse in rotated coordinates u = x - y, v = x + y. */
interface Frame {
  width: number;
  height: number;
  ring: number;
  /** Island centre; the same on both axes because the grid is square. */
  mid: number;
  ru: number;
  rv: number;
}

/**
 * Generates the natural terrain for a class of `villagers`. Deterministic per
 * (seed, villagers, params). Throws only if no valid island is found in
 * MAX_ATTEMPTS shapes, which needs a land count far below the playable range.
 */
export function generateTerrain(seed: number, villagers: number, params: MapGenParams): TerrainMap {
  const rng = createRng(seed);
  const landCount = params.landBase + params.landPerVillager * villagers;
  const frame = planFrame(landCount, params);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const land = growIsland(rng, frame, landCount);
    if (!land) continue;
    const landing = findLanding(frame, land);
    if (!landing) continue;
    const terrain = paintTerrain(rng, frame, land, landing, params);
    if (terrain) return { width: frame.width, height: frame.height, terrain, landing };
  }
  throw new Error(
    `generateTerrain could not build a valid island for seed ${seed}, ${villagers} villagers ` +
      `(${landCount} land tiles) in ${MAX_ATTEMPTS} attempts`,
  );
}

/** ASCII rendering, one row per y: ~ sea, . meadow, T forest, ^ rock, o spring, L landing. */
export function describeTerrain(map: TerrainMap): string {
  const rows: string[] = [];
  for (let y = 0; y < map.height; y++) {
    let row = '';
    for (let x = 0; x < map.width; x++) {
      const isLanding = x === map.landing.x && y === map.landing.y;
      row += isLanding ? 'L' : GLYPH[map.terrain[indexOf(map.width, { x, y })] ?? 'sea'];
    }
    rows.push(row);
  }
  return rows.join('\n');
}

/**
 * Sizes a square grid around an ellipse of `landCount` tiles with ru / rv = aspect / 2.
 * A tile covers area 2 in (u, v), and the ellipse spans sqrt(ru² + rv²) tiles along x and y.
 */
function planFrame(landCount: number, params: MapGenParams): Frame {
  const ratio = params.screenAspect / 2;
  const rv = Math.sqrt((2 * landCount) / (Math.PI * ratio));
  const ru = ratio * rv;
  const span = Math.ceil(Math.sqrt(ru * ru + rv * rv) + 0.5);
  const size = span + 2 * params.seaRing;
  return { width: size, height: size, ring: params.seaRing, mid: params.seaRing + (span - 1) / 2, ru, rv };
}

function coordOf(width: number, i: number): Coord {
  const x = i % width;
  return { x, y: (i - x) / width };
}

function neighbourIndices4(f: Frame, i: number): number[] {
  return neighbors4(f.width, f.height, coordOf(f.width, i)).map((c) => indexOf(f.width, c));
}

function landNeighbours4(f: Frame, land: boolean[], i: number): number {
  return neighbourIndices4(f, i).filter((n) => land[n] === true).length;
}

/**
 * Normalized ellipse distance with a random lobed wobble of the radius. The wobble is a
 * trigonometric polynomial in the direction angle, built from cos/sin of the direction
 * itself via multiple-angle identities.
 */
function ellipseDistance(f: Frame, wobble: readonly number[], x: number, y: number): number {
  const a = (x - y) / f.ru;
  const b = (x + y - 2 * f.mid) / f.rv;
  const r = Math.sqrt(a * a + b * b);
  if (r === 0) return 0;
  const c1 = a / r;
  const s1 = b / r;
  const c2 = c1 * c1 - s1 * s1;
  const s2 = 2 * c1 * s1;
  const c3 = c2 * c1 - s2 * s1;
  const s3 = s2 * c1 + c2 * s1;
  const c4 = c2 * c2 - s2 * s2;
  const s4 = 2 * s2 * c2;
  const lobes = [c2, s2, c3, s3, c4, s4];
  const radius = lobes.reduce((sum, lobe, k) => sum + lobe * (wobble[k] ?? 0), 1);
  return r / radius;
}

/** Best-first growth from the centre, then lakes filled and the excess coast trimmed. */
function growIsland(rng: Rng, f: Frame, target: number): boolean[] | null {
  const wobble = WOBBLE.flatMap((amp) => [(2 * rng.next() - 1) * amp, (2 * rng.next() - 1) * amp]);
  const priority = new Array<number>(f.width * f.height).fill(Infinity);
  for (let y = f.ring; y < f.height - f.ring; y++) {
    for (let x = f.ring; x < f.width - f.ring; x++) {
      priority[y * f.width + x] = ellipseDistance(f, wobble, x, y) + COAST_JITTER * rng.next();
    }
  }
  const score = (i: number): number => (priority[i] ?? Infinity) - NEIGHBOUR_PULL * landNeighbours4(f, land, i);

  const land = new Array<boolean>(f.width * f.height).fill(false);
  const frontier = new Set<number>();
  const claim = (i: number): void => {
    land[i] = true;
    frontier.delete(i);
    for (const n of neighbourIndices4(f, i)) {
      if (!land[n] && (priority[n] ?? Infinity) < Infinity) frontier.add(n);
    }
  };
  const start = Math.round(f.mid);
  claim(indexOf(f.width, { x: start, y: start }));
  for (let count = 1; count < target; count++) {
    let best: number | undefined;
    let bestScore = Infinity;
    for (const i of frontier) {
      const s = score(i);
      if (s < bestScore) {
        best = i;
        bestScore = s;
      }
    }
    if (best === undefined) return null;
    claim(best);
  }
  fillLakes(f, land);
  return trimCoast(f, land, score, target) ? land : null;
}

/** Turns every sea tile that cannot reach the grid border into land. */
function fillLakes(f: Frame, land: boolean[]): void {
  const ocean = new Set<number>();
  const queue: number[] = [];
  for (let i = 0; i < land.length; i++) {
    const { x, y } = coordOf(f.width, i);
    const border = x === 0 || y === 0 || x === f.width - 1 || y === f.height - 1;
    if (border && !land[i]) {
      ocean.add(i);
      queue.push(i);
    }
  }
  for (let q = 0; q < queue.length; q++) {
    for (const n of neighbourIndices4(f, queue[q]!)) {
      if (!land[n] && !ocean.has(n)) {
        ocean.add(n);
        queue.push(n);
      }
    }
  }
  for (let i = 0; i < land.length; i++) if (!ocean.has(i)) land[i] = true;
}

/**
 * Removes the worst-scoring coastal tiles until `target` remain. Only tiles touching
 * the sea are removed (no new lakes) and never one that would split the island.
 */
function trimCoast(f: Frame, land: boolean[], score: (i: number) => number, target: number): boolean {
  let count = land.filter(Boolean).length;
  while (count > target) {
    const coast = land
      .map((isLand, i) => (isLand && neighbourIndices4(f, i).some((n) => !land[n]) ? i : -1))
      .filter((i) => i >= 0)
      .sort((a, b) => score(b) - score(a));
    const removable = coast.find((i) => staysConnected(f, land, i, count - 1));
    if (removable === undefined) return false;
    land[removable] = false;
    count--;
  }
  return true;
}

function staysConnected(f: Frame, land: boolean[], removed: number, remaining: number): boolean {
  const start = land.findIndex((isLand, i) => isLand && i !== removed);
  if (start < 0) return remaining === 0;
  const seen = new Set<number>([start]);
  const queue = [start];
  for (let q = 0; q < queue.length; q++) {
    for (const n of neighbourIndices4(f, queue[q]!)) {
      if (land[n] && n !== removed && !seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return seen.size === remaining;
}

/**
 * The southernmost (largest x + y) land tile with at least two sea and two land tiles
 * among its eight neighbours; ties go to the tile nearest the island's median x - y,
 * then to the smallest x.
 */
function findLanding(f: Frame, land: boolean[]): Coord | null {
  const tiles = land.flatMap((isLand, i) => (isLand ? [coordOf(f.width, i)] : []));
  const mid = median(tiles.map((c) => c.x - c.y));
  let best: Coord | null = null;
  for (const c of tiles) {
    const around = neighbors8(f.width, f.height, c);
    const landAround = around.filter((n) => land[indexOf(f.width, n)]).length;
    if (landAround < 2 || around.length - landAround < 2) continue;
    if (!best || compareLanding(c, best, mid) < 0) best = c;
  }
  return best;
}

function compareLanding(a: Coord, b: Coord, mid: number): number {
  return (
    b.x + b.y - (a.x + a.y) || Math.abs(a.x - a.y - mid) - Math.abs(b.x - b.y - mid) || a.x - b.x
  );
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[half] ?? 0;
  return ((sorted[half - 1] ?? 0) + (sorted[half] ?? 0)) / 2;
}

/**
 * Paints spring, rocks and forest on the island; everything else stays meadow.
 * Returns null when this shape cannot give the landing a forest and a meadow neighbour.
 */
function paintTerrain(
  rng: Rng,
  f: Frame,
  land: boolean[],
  landing: Coord,
  params: MapGenParams,
): NaturalTerrain[] | null {
  const terrain = land.map((isLand): NaturalTerrain => (isLand ? 'meadow' : 'sea'));
  const landTiles = land.flatMap((isLand, i) => (isLand ? [i] : []));
  const landingIndex = indexOf(f.width, landing);
  const distance = (i: number): number => chebyshev(coordOf(f.width, i), landing);

  const spring = pickSpring(rng, landTiles, landingIndex, distance);
  if (spring === undefined) return null;
  const nextToLanding = neighbors8(f.width, f.height, landing)
    .map((c) => indexOf(f.width, c))
    .filter((i) => land[i] && i !== spring);
  const [forestSeed, keptMeadow] = rng.shuffle(nextToLanding);
  if (forestSeed === undefined || keptMeadow === undefined) return null;

  const spare = landTiles.length - 2;
  const reserved = new Set([landingIndex, spring, forestSeed, keptMeadow]);
  const rockPool = landTiles.filter((i) => !reserved.has(i) && distance(i) >= params.rockMinDistance);
  const rockCount = Math.min(Math.round(params.rockShare * spare), rockPool.length);
  for (const i of scatter(rng, f, rockPool, rockCount, [], ROCK_CLUMPING)) terrain[i] = 'rock';

  // At least the landing's forest neighbour, at most everything but the kept meadow.
  const forestCount = Math.min(Math.max(Math.round(params.forestShare * spare), 1), spare - rockCount - 1);
  const forestPool = landTiles.filter((i) => !reserved.has(i) && terrain[i] === 'meadow');
  terrain[forestSeed] = 'forest';
  for (const i of scatter(rng, f, forestPool, forestCount - 1, [forestSeed], FOREST_CLUMPING)) terrain[i] = 'forest';

  terrain[spring] = 'spring';
  return terrain;
}

/** A random tile at least as far from the landing as two thirds of all land tiles. */
function pickSpring(
  rng: Rng,
  landTiles: number[],
  landingIndex: number,
  distance: (i: number) => number,
): number | undefined {
  const sorted = landTiles.map(distance).sort((a, b) => a - b);
  const threshold = sorted[Math.ceil((2 * sorted.length) / 3) - 1];
  if (threshold === undefined) return undefined;
  const eligible = landTiles.filter((i) => i !== landingIndex && distance(i) >= threshold);
  return eligible.length > 0 ? rng.pick(eligible) : undefined;
}

/**
 * Picks `count` tiles from `pool`. With probability `clumping` each pick touches an
 * earlier pick (or a seed), which grows patches instead of salt-and-pepper noise.
 */
function scatter(rng: Rng, f: Frame, pool: number[], count: number, seeds: number[], clumping: number): number[] {
  const taken = new Set(seeds);
  const chosen: number[] = [];
  let open = [...pool];
  while (chosen.length < count && open.length > 0) {
    const touching = open.filter((i) => neighbourIndices4(f, i).some((n) => taken.has(n)));
    const from = touching.length > 0 && rng.next() < clumping ? touching : open;
    const pick = rng.pick(from);
    taken.add(pick);
    chosen.push(pick);
    open = open.filter((i) => i !== pick);
  }
  return chosen;
}
