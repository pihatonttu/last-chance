import { Game, type GameOptions } from '../src/game.ts';
import type { GameParams } from '../src/params.ts';
import { RULE_TEST_PARAMS } from './params.ts';
import type { NaturalTerrain, TerrainMap } from '../src/types.ts';

const LEGEND: Record<string, NaturalTerrain> = {
  '~': 'sea',
  '.': 'meadow',
  T: 'forest',
  '^': 'rock',
  o: 'spring',
  L: 'meadow',
};

/** Build a terrain map from rows of characters: ~ sea, . meadow, T forest, ^ rock, o spring, L landing. */
export function terrainFromAscii(rows: string[]): TerrainMap {
  const height = rows.length;
  const width = rows[0]!.length;
  const terrain: NaturalTerrain[] = [];
  let landing: { x: number; y: number } | undefined;
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`row ${y} has length ${row.length}, expected ${width}`);
    [...row].forEach((ch, x) => {
      const t = LEGEND[ch];
      if (t === undefined) throw new Error(`unknown map character '${ch}'`);
      if (ch === 'L') landing = { x, y };
      terrain.push(t);
    });
  });
  if (!landing) throw new Error('map needs a landing tile L');
  return { width, height, terrain, landing };
}

/**
 * A small island used by most tests. Landing at (3,5).
 *
 *   x: 0123456
 *   0  ~~~~~~~
 *   1  ~^To^T~
 *   2  ~TT.TT~
 *   3  ~..T..~
 *   4  ~T.T.T~
 *   5  ~~.L.~~
 *   6  ~~~~~~~
 */
export const SMALL_ISLAND = [
  '~~~~~~~',
  '~^To^T~',
  '~TT.TT~',
  '~..T..~',
  '~T.T.T~',
  '~~.L.~~',
  '~~~~~~~',
];

export interface SetupOptions extends Partial<GameOptions> {
  players?: number;
  map?: string[];
  start?: boolean;
}

/** Create a game on an ASCII map with players p1..pN, started unless start: false. */
export function setup(opts: SetupOptions = {}): Game {
  const { players = 3, map = SMALL_ISLAND, start = true, ...rest } = opts;
  const game = new Game({ seed: 1, length: 'normal', terrain: terrainFromAscii(map), params: RULE_TEST_PARAMS, ...rest });
  for (let i = 1; i <= players; i++) game.addPlayer(`p${i}`);
  if (start) game.start();
  return game;
}

export function tileAt(game: Game, x: number, y: number) {
  const tile = game.tile(x, y);
  if (!tile) throw new Error(`no tile at ${x},${y}`);
  return tile;
}

/** Default params with every building free, for tests that need buildings quickly. */
export function freeBuildingParams(): GameParams {
  const free = [
    { wood: 0, stone: 0 },
    { wood: 0, stone: 0 },
    { wood: 0, stone: 0 },
  ] as const;
  return {
    ...RULE_TEST_PARAMS,
    costs: { shelter: free, school: free, workshop: free, gathering: free },
  };
}

/**
 * Finish the current month: end the action phase, let every listed player vote,
 * resolve the vote and month end, and move on to the next month.
 */
export function finishMonth(game: Game, votes: Record<string, string> = {}) {
  game.endActionPhase();
  for (const [player, option] of Object.entries(votes)) {
    const res = game.vote(player, option);
    if (!res.ok) throw new Error(`vote ${player} -> ${option} failed: ${res.reason}`);
  }
  const report = game.endVotePhase();
  game.nextMonth();
  return report;
}

/** Build one building through a unanimous vote (players p1..pN). */
export function buildByVote(game: Game, option: string) {
  const votes: Record<string, string> = {};
  for (const id of game.playerIds()) votes[id] = option;
  return finishMonth(game, votes);
}

/** Use one action, failing the test with the reason if it is refused. */
export function act(game: Game, player: string, x: number, y: number) {
  const res = game.act(player, x, y);
  if (!res.ok) throw new Error(`${player} act at ${x},${y} refused: ${res.reason}`);
  return res;
}
