import { DEFAULT_PARAMS, Game, type Coord, type GameParams, type NaturalTerrain, type TerrainMap } from '@saari/rules';

const LEGEND: Record<string, NaturalTerrain> = {
  '~': 'sea',
  '.': 'meadow',
  T: 'forest',
  '^': 'rock',
  o: 'spring',
  L: 'meadow',
};

/** Rows of characters: ~ sea, . meadow, T forest, ^ rock, o spring, L landing (a meadow). */
export function terrainFromAscii(rows: readonly string[]): TerrainMap {
  const width = rows[0]!.length;
  const terrain: NaturalTerrain[] = [];
  let landing: Coord | undefined;
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const t = LEGEND[ch];
      if (t === undefined) throw new Error(`unknown map character '${ch}'`);
      if (ch === 'L') landing = { x, y };
      terrain.push(t);
    });
  });
  if (!landing) throw new Error('map needs a landing tile L');
  return { width, height: rows.length, terrain, landing };
}

/**
 *   x: 0123456
 *   0  ~~~~~~~
 *   1  ~^To^T~
 *   2  ~TT.TT~
 *   3  ~..T..~
 *   4  ~T.T.T~
 *   5  ~~.L.~~
 *   6  ~~~~~~~
 */
export const ISLAND = ['~~~~~~~', '~^To^T~', '~TT.TT~', '~..T..~', '~T.T.T~', '~~.L.~~', '~~~~~~~'];

/** A forest next to the landing, the sea below it, a fogged forest two rows up, a meadow. */
export const FOREST: Coord = { x: 3, y: 4 };
export const SEA: Coord = { x: 3, y: 6 };
export const FOGGED_FOREST: Coord = { x: 3, y: 3 };
export const MEADOW: Coord = { x: 2, y: 5 };

const FREE = [
  { wood: 0, stone: 0 },
  { wood: 0, stone: 0 },
  { wood: 0, stone: 0 },
] as const;

/** Every number the scripted game depends on, pinned so that tuning the engine does not move it. */
export const SCENARIO_PARAMS: GameParams = {
  ...DEFAULT_PARAMS,
  months: { normal: 4, short: 3 },
  baseActions: 3,
  joinClosesAtMonth: 4,
  foodPerVillager: 4,
  startFoodPerVillager: 100,
  forestCapacity: 40,
  chopYield: 10,
  exploreBase: 1,
  exploreDistanceDivisor: 2,
  plowWork: 3,
  maxSkillLevel: 4,
  skillProgressPerLevel: 3,
  costs: { shelter: FREE, school: FREE, workshop: FREE, gathering: FREE },
};

export function newScenarioGame(): Game {
  return new Game({ seed: 1, length: 'normal', params: SCENARIO_PARAMS, terrain: terrainFromAscii(ISLAND) });
}

export function act(game: Game, player: string, at: Coord, times = 1): void {
  for (let i = 0; i < times; i++) {
    const res = game.act(player, at.x, at.y);
    if (!res.ok) throw new Error(`${player} at ${at.x},${at.y} refused: ${res.reason}`);
  }
}

export function vote(game: Game, player: string, option: string): void {
  const res = game.vote(player, option);
  if (!res.ok) throw new Error(`${player} vote ${option} refused: ${res.reason}`);
}

export function buildingTile(game: Game, kind: string): Coord {
  const tile = game.tiles().find((t) => t.building?.kind === kind);
  if (!tile) throw new Error(`no ${kind} on the map`);
  return { x: tile.x, y: tile.y };
}

/**
 * Four players a-d start; e joins in month 2; the teacher removes d in month 3;
 * the game is ended early in the action phase of month 4 (of 4).
 *
 * Month 1: a chops 3, b fishes 2, c explores 1 + plows 1, d does nothing.
 *          Unused 5 (b 1, c 1, d 3). Votes a, b (none, then shelter-1), c: shelter-1 built 3/3.
 * Month 2: a fishes 3, b 1, d 3, e (new) 1. Unused 7 (b 2, c 3, e 2).
 *          Votes a, d, e school-1, b workshop-1, c none: school built 3/5.
 * Month 3: d removed. a studies 3 (education 2 gives a 4th action) and fishes 1,
 *          c explores 1, e fishes 3. Unused 5 (b 3, c 2).
 *          Votes a workshop-1, b gathering-1: tie.
 * Month 4: a fishes 1, b fishes 2, then the teacher ends the game.
 */
export function scriptedGame(): Game {
  const game = newScenarioGame();
  for (const id of ['a', 'b', 'c', 'd']) game.addPlayer(id);
  game.start();

  act(game, 'a', FOREST, 3);
  act(game, 'b', SEA, 2);
  act(game, 'c', FOGGED_FOREST);
  act(game, 'c', MEADOW);
  game.endActionPhase();
  vote(game, 'a', 'shelter-1');
  vote(game, 'b', 'none');
  vote(game, 'b', 'shelter-1');
  vote(game, 'c', 'shelter-1');
  game.endVotePhase();
  game.nextMonth();

  const joined = game.addPlayer('e');
  if (!joined.ok) throw new Error(`e could not join: ${joined.reason}`);
  act(game, 'a', SEA, 3);
  act(game, 'b', SEA, 1);
  act(game, 'd', SEA, 3);
  act(game, 'e', SEA, 1);
  game.endActionPhase();
  vote(game, 'a', 'school-1');
  vote(game, 'b', 'workshop-1');
  vote(game, 'c', 'none');
  vote(game, 'd', 'school-1');
  vote(game, 'e', 'school-1');
  game.endVotePhase();
  game.nextMonth();

  game.removePlayer('d');
  act(game, 'a', buildingTile(game, 'school'), 3);
  act(game, 'a', SEA, 1);
  act(game, 'c', FOGGED_FOREST);
  act(game, 'e', SEA, 3);
  game.endActionPhase();
  vote(game, 'a', 'workshop-1');
  vote(game, 'b', 'gathering-1');
  game.endVotePhase();
  game.nextMonth();

  act(game, 'a', SEA, 1);
  act(game, 'b', SEA, 2);
  game.endEarly();
  return game;
}
