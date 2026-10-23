import { createRng, DEFAULT_PARAMS, Game, type GameParams, type TerrainMap } from '@saari/rules';
import { describe, expect, it } from 'vitest';
import { createBot, foodTarget, plannedBuilding } from '../src/index.ts';

/** Landing (3,5). Rock and spring are far away in the north. */
const TERRAIN: TerrainMap = (() => {
  const rows = ['~~~~~~~', '~^To^T~', '~TT.TT~', '~..T..~', '~T.T.T~', '~~...~~', '~~~~~~~'];
  const legend = { '~': 'sea', '.': 'meadow', T: 'forest', '^': 'rock', o: 'spring' } as const;
  const terrain = rows.flatMap((r) => [...r].map((c) => legend[c as keyof typeof legend]));
  return { width: 7, height: 7, terrain, landing: { x: 3, y: 5 } };
})();

const FREE = [
  { wood: 0, stone: 0 },
  { wood: 0, stone: 0 },
  { wood: 0, stone: 0 },
] as const;

/** Shelter prices from before igloos cost ice, for the tests about gathering wood. */
const WOODEN_SHELTERS = [
  { wood: 4, stone: 0 },
  { wood: 6, stone: 0 },
  { wood: 6, stone: 3 },
] as const;

/** These tests are about the bot's choices, so their villages never give up (docs/10-arktinen.md §4b). */
const NEVER_LOST = { normal: -Infinity, short: -Infinity };

function newGame(params: GameParams = DEFAULT_PARAMS, players = ['a', 'b', 'c']) {
  const game = new Game({ seed: 1, length: 'normal', terrain: TERRAIN, params: { ...params, lossThreshold: NEVER_LOST } });
  for (const p of players) game.addPlayer(p);
  game.start();
  return game;
}

const bot = createBot('cooperative', { noise: 0 });
const rng = createRng(1);

function nextKind(game: Game, player = 'a') {
  const move = bot.chooseAction(game, player, rng);
  if (!move) return null;
  return game.preview(player, move.x, move.y).kind;
}

function voteAll(game: Game, option: string) {
  game.endActionPhase();
  for (const p of game.playerIds()) game.vote(p, option);
  game.endVotePhase();
  game.nextMonth();
}

describe('cooperative bot actions', () => {
  it('gets food first when this month would go hungry', () => {
    const game = newGame();
    voteAll(game, 'none'); // month 1 eats the starting food
    expect(game.resources.food).toBe(0);
    expect(['fish', 'harvest']).toContain(nextKind(game));
  });

  it('plows fields while the fields cannot feed the village', () => {
    const game = newGame(); // month 1: food covers this month, no fields yet
    expect(nextKind(game)).toBe('plow');
  });

  it('gathers wood for the planned building', () => {
    const params = {
      ...DEFAULT_PARAMS,
      foodPerVillager: 0,
      startWoodPerVillager: 0,
      costs: { ...DEFAULT_PARAMS.costs, shelter: WOODEN_SHELTERS },
    };
    const game = newGame(params);
    expect(plannedBuilding(game)?.id).toBe('shelter-1');
    expect(nextKind(game)).toBe('chop');
  });

  it('explores when food and materials are covered and there is nothing to study', () => {
    const params = {
      ...DEFAULT_PARAMS,
      foodPerVillager: 0,
      costs: { shelter: FREE, school: FREE, workshop: FREE, gathering: FREE },
    };
    const game = newGame(params);
    expect(nextKind(game)).toBe('explore');
  });

  it('saves wood for the next building once this month is paid for, before exploring', () => {
    const params = {
      ...DEFAULT_PARAMS,
      foodPerVillager: 0,
      startWoodPerVillager: 0,
      costs: { ...DEFAULT_PARAMS.costs, shelter: FREE },
    };
    const game = newGame(params);
    voteAll(game, 'shelter-1');
    // Planned: another free shelter (paid). Next wanted: school-1, which needs wood.
    expect(plannedBuilding(game)?.cost.wood).toBe(0);
    expect(nextKind(game)).toBe('chop');
  });

  it('does not cut down the last trees of a forest while there is fog left to explore', () => {
    const params = {
      ...DEFAULT_PARAMS,
      foodPerVillager: 0,
      startWoodPerVillager: 0,
      costs: { ...DEFAULT_PARAMS.costs, shelter: [{ wood: 20, stone: 0 }, FREE[1], FREE[2]] as const },
    };
    const game = newGame(params);
    // The shelter needs 60 wood. The only revealed forest (3,4) is cut down to 10 wood
    // (wood 30): one more chop would clear it.
    for (const p of ['b', 'b', 'b']) game.act(p, 3, 4);
    expect(game.tile(3, 4)?.stock).toBe(10);
    expect(nextKind(game)).toBe('explore');
  });

  it('treats six level-1 shelters as shelter for everyone (no floating-point extra shelter)', () => {
    const params = { ...DEFAULT_PARAMS, costs: { shelter: FREE, school: FREE, workshop: FREE, gathering: FREE } };
    const game = newGame(params);
    for (let i = 0; i < 4; i++) voteAll(game, 'shelter-1'); // every revealed meadow but the landing (the fire)
    voteAll(game, 'shelter-2');
    voteAll(game, 'shelter-2'); // 2 x 1/3 + 2 x 1/6
    expect(game.shelterShare()).toBeLessThan(1); // 0.9999999999999999
    expect(game.shelterCapacity()).toBe(3);
    expect(plannedBuilding(game)?.id).toBe('school-1');
  });

  it('studies early in the game once a school exists', () => {
    const params = {
      ...DEFAULT_PARAMS,
      foodPerVillager: 0,
      costs: { shelter: FREE, school: FREE, workshop: FREE, gathering: FREE },
    };
    const game = newGame(params);
    voteAll(game, 'shelter-1');
    voteAll(game, 'school-1');
    expect(nextKind(game)).toBe('study');
  });

  it('stops investing in skills near the end of the game', () => {
    const params = {
      ...DEFAULT_PARAMS,
      foodPerVillager: 0,
      costs: { shelter: FREE, school: FREE, workshop: FREE, gathering: FREE },
    };
    const game = newGame(params);
    voteAll(game, 'shelter-1');
    voteAll(game, 'school-1');
    while (game.month < game.totalMonths - 1) voteAll(game, 'none');
    expect(nextKind(game)).not.toBe('study');
  });

  it('explores to find forest when wood is needed and none is revealed, even with a school', () => {
    // No forest near the landing (3,5).
    const rows = ['~~~~~~~', '~TTTTT~', '~TT.TT~', '~.....~', '~.....~', '~~...~~', '~~~~~~~'];
    const legend = { '~': 'sea', '.': 'meadow', T: 'forest' } as const;
    const terrain = rows.flatMap((r) => [...r].map((c) => legend[c as keyof typeof legend]));
    const params = {
      ...DEFAULT_PARAMS,
      foodPerVillager: 0,
      startWoodPerVillager: 4,
      costs: { ...DEFAULT_PARAMS.costs, shelter: WOODEN_SHELTERS, school: FREE },
    };
    const game = new Game({ seed: 1, length: 'normal', params, terrain: { width: 7, height: 7, terrain, landing: { x: 3, y: 5 } } });
    for (const p of ['a', 'b', 'c']) game.addPlayer(p);
    game.start();
    voteAll(game, 'shelter-1'); // paid with the starting wood
    voteAll(game, 'school-1'); // free
    expect(game.resources.wood).toBe(0);
    expect(plannedBuilding(game)?.cost.wood).toBeGreaterThan(0);
    expect(nextKind(game)).toBe('explore');
  });

  it('returns null when the player has no actions left', () => {
    const game = newGame();
    for (let i = 0; i < 3; i++) game.act('a', 3, 6);
    expect(bot.chooseAction(game, 'a', rng)).toBeNull();
  });
});

describe('cooperative bot votes', () => {
  it('votes for a shelter first', () => {
    const game = newGame();
    game.endActionPhase();
    expect(bot.chooseVote(game, 'a', rng)).toBe('shelter-1');
  });

  it('keeps building shelter until everyone has one, then the school', () => {
    const params = { ...DEFAULT_PARAMS, costs: { shelter: FREE, school: FREE, workshop: FREE, gathering: FREE } };
    const game = newGame(params);
    voteAll(game, 'shelter-1');
    game.endActionPhase();
    expect(bot.chooseVote(game, 'a', rng)).toMatch(/^shelter-/);
    game.endVotePhase();
    game.nextMonth();
    for (const step of ['shelter-2', 'shelter-3', 'shelter-1', 'shelter-2', 'shelter-3']) voteAll(game, step);
    expect(game.shelterShare()).toBeGreaterThanOrEqual(1);
    game.endActionPhase();
    expect(bot.chooseVote(game, 'a', rng)).toBe('school-1');
  });

  it('follows a custom build order', () => {
    const params = { ...DEFAULT_PARAMS, costs: { shelter: FREE, school: FREE, workshop: FREE, gathering: FREE } };
    const custom = createBot('cooperative', { noise: 0, buildOrder: ['shelter:first', 'gathering-1', 'school-1'] });
    const game = newGame(params);
    voteAll(game, 'shelter-1');
    game.endActionPhase();
    expect(custom.chooseVote(game, 'a', rng)).toBe('gathering-1');
  });

  it('falls back to an affordable option when the planned one is blocked', () => {
    const params = {
      ...DEFAULT_PARAMS,
      costs: {
        shelter: FREE,
        school: [{ wood: 1000, stone: 0 }, FREE[1], FREE[2]] as const,
        workshop: FREE,
        gathering: FREE,
      },
    };
    const game = newGame(params);
    voteAll(game, 'shelter-1');
    game.endActionPhase();
    const schoolFirst = createBot('cooperative', { noise: 0, buildOrder: ['shelter:first', 'school-1', 'gathering-1'] });
    const vote = schoolFirst.chooseVote(game, 'a', rng);
    expect(vote).toBe('gathering-1');
    expect(game.voteOptions().find((o) => o.id === vote)?.blocked).toEqual([]);
  });
});

describe('cooperative bot and winter (docs/09-uudisasukkaat.md §3.5)', () => {
  it("wants this month's need outside the run-up to winter", () => {
    const game = newGame();
    while (game.month < 4) voteAll(game, 'none'); // July
    expect(foodTarget(game)).toBe(game.foodNeed());
    while (game.month < 6) voteAll(game, 'none'); // September: winter is still 3 months away
    expect(foodTarget(game)).toBe(game.foodNeed());
  });

  it('fills the store in October and November: this month plus what keeps over the month end', () => {
    const game = newGame();
    while (game.month < 7) voteAll(game, 'none');
    expect(foodTarget(game)).toBe(game.foodNeed() + game.foodStorage());
    voteAll(game, 'none');
    expect(foodTarget(game)).toBe(game.foodNeed() + game.foodStorage());
  });

  it('in winter wants the food of the winter months still ahead', () => {
    const game = newGame();
    while (game.month < 9) voteAll(game, 'none');
    expect(foodTarget(game)).toBe(3 * game.foodNeed());
    voteAll(game, 'none');
    expect(foodTarget(game)).toBe(2 * game.foodNeed());
    voteAll(game, 'none');
    expect(foodTarget(game)).toBe(game.foodNeed());
  });
});
