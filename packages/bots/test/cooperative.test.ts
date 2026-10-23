import { createRng, DEFAULT_PARAMS, Game, woodPerVillager, type GameParams, type TerrainMap } from '@saari/rules';
import { describe, expect, it } from 'vitest';
import { createBot, plannedBuilding, woodTarget } from '../src/index.ts';

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

/** Start wood (30 for 3) that covers the fire of months 1 and 2 at any frost those months can have. */
const FIRE_COVERED: GameParams = { ...DEFAULT_PARAMS, startWoodPerVillager: 10 };

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
    // Month 1: food and the fire's wood cover this month and next, no fields yet.
    const game = newGame(FIRE_COVERED);
    expect(game.resources.wood).toBeGreaterThanOrEqual(woodTarget(game));
    expect(nextKind(game)).toBe('plow');
  });

  it('leaves unplowed the meadow the next igloo will take, which is never the landing (the fire)', () => {
    const game = newGame(FIRE_COVERED);
    // The engine puts the next building on the nearest revealed meadow but the landing,
    // first by row: (2,4). The bot plows the next one instead.
    const move = bot.chooseAction(game, 'a', rng)!;
    expect(game.preview('a', move.x, move.y).kind).toBe('plow');
    expect(move).toEqual({ x: 4, y: 4 });
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
      ...FIRE_COVERED,
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
      startWoodPerVillager: 50, // the fire has wood for the whole game
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

describe('cooperative bot and the village fire (docs/10-arktinen.md §8)', () => {
  it("wants wood for this month's fire and for next month's forecast", () => {
    // A flat 2 wood per villager whatever the frost: 2 x 3 now + 2 x 3 next month.
    const game = newGame({ ...DEFAULT_PARAMS, heatWoodPerVillager: [2, 2, 2] });
    expect(game.month).toBe(1);
    expect(woodTarget(game)).toBe(12);

    const frosty = newGame();
    const next = woodPerVillager(frosty.forecast()!, frosty.params) * 3;
    expect(woodTarget(frosty)).toBe(frosty.heatNeed() + next);
  });

  it("wants only this month's fire in the last month", () => {
    const game = newGame({ ...DEFAULT_PARAMS, heatWoodPerVillager: [2, 2, 2] });
    while (game.month < game.totalMonths) voteAll(game, 'none');
    expect(game.forecast()).toBeNull();
    expect(woodTarget(game)).toBe(6);
  });

  it('chops for the fire before building when the wood would not cover this month and next', () => {
    const params = {
      ...DEFAULT_PARAMS,
      foodPerVillager: 0,
      startWoodPerVillager: 1,
      startStonePerVillager: 0,
      heatWoodPerVillager: [1, 2, 3] as const,
    };
    const game = newGame(params);
    // 5 wood: enough for this month's fire (3) but not for next month's as well.
    expect(game.resources.wood).toBeGreaterThanOrEqual(game.heatNeed());
    expect(game.resources.wood).toBeLessThan(woodTarget(game));
    // The igloo still needs ice, which the bot used to fetch first.
    expect(plannedBuilding(game)?.blocked).toContain('stone');
    expect(nextKind(game)).toBe('chop');
  });

  it('fetches ice for the igloo once the fire has wood for this month and next', () => {
    const params = { ...DEFAULT_PARAMS, foodPerVillager: 0, startWoodPerVillager: 10, startStonePerVillager: 0 };
    const game = newGame(params);
    expect(game.resources.wood).toBeGreaterThanOrEqual(woodTarget(game));
    // The only rock lies under the fog in the north: the way to ice is exploring.
    expect(nextKind(game)).toBe('explore');
  });

  it("saves wood for a building on top of the fire's wood for this month and next", () => {
    const params = {
      ...DEFAULT_PARAMS,
      foodPerVillager: 0,
      startWoodPerVillager: 30,
      heatWoodPerVillager: [10, 10, 10] as const,
      costs: { ...DEFAULT_PARAMS.costs, shelter: [{ wood: 15, stone: 0 }, FREE[1], FREE[2]] as const },
    };
    const game = newGame(params);
    // 90 wood: the fire wants 30 now and 30 next month. The building's 45 would leave this
    // month's fire warm but eat into next month's: more wood first.
    expect(game.resources.wood).toBe(90);
    expect(woodTarget(game)).toBe(60);
    const order = ['shelter:first'];
    expect(plannedBuilding(game, order)).toMatchObject({ id: 'shelter-1', blocked: [], leavesFireCold: false });
    const shelterOnly = createBot('cooperative', { noise: 0, buildOrder: order });
    const move = shelterOnly.chooseAction(game, 'a', rng)!;
    expect(game.preview('a', move.x, move.y).kind).toBe('chop');
  });

  it('chops the fullest forest first, so the logging spreads and the forests grow back', () => {
    // Two forests as near the landing (2,2): (1,1) comes first in the tile order.
    const rows = ['~~~~~', '~T.T~', '~...~', '~~~~~'];
    const legend = { '~': 'sea', '.': 'meadow', T: 'forest' } as const;
    const terrain = rows.flatMap((r) => [...r].map((c) => legend[c as keyof typeof legend]));
    const params = {
      ...DEFAULT_PARAMS,
      foodPerVillager: 0,
      startWoodPerVillager: 0,
      heatWoodPerVillager: [10, 10, 10] as const,
      lossThreshold: NEVER_LOST,
    };
    const game = new Game({ seed: 1, length: 'normal', params, terrain: { width: 5, height: 4, terrain, landing: { x: 2, y: 2 } } });
    for (const p of ['a', 'b', 'c']) game.addPlayer(p);
    game.start();
    game.act('b', 1, 1); // 30 trees left there, 40 at (3,1)
    expect(game.resources.wood).toBeLessThan(woodTarget(game));
    expect(bot.chooseAction(game, 'a', rng)).toEqual({ x: 3, y: 1 });
  });

  it('takes wood for buildings only from forests that keep half their trees; the fire may take the rest', () => {
    // A tiny island with nothing left to explore: its only forest (2,1) next to the landing (2,2).
    const rows = ['~~~~~', '~.T.~', '~...~', '~~~~~'];
    const legend = { '~': 'sea', '.': 'meadow', T: 'forest' } as const;
    const terrain = rows.flatMap((r) => [...r].map((c) => legend[c as keyof typeof legend]));
    const island = (heat: number, chops: number) => {
      const params = {
        ...DEFAULT_PARAMS,
        foodPerVillager: 0,
        startWoodPerVillager: 0,
        heatWoodPerVillager: [heat, heat, heat] as const,
        lossThreshold: NEVER_LOST,
        costs: { ...DEFAULT_PARAMS.costs, shelter: [{ wood: 40, stone: 0 }, FREE[1], FREE[2]] as const },
      };
      const game = new Game({ seed: 1, length: 'normal', params, terrain: { width: 5, height: 4, terrain, landing: { x: 2, y: 2 } } });
      for (const p of ['a', 'b', 'c']) game.addPlayer(p);
      game.start();
      for (let i = 0; i < chops; i++) game.act('b', 2, 1);
      expect(game.tile(2, 1)?.stock).toBe(40 - 10 * chops);
      return game;
    };
    const shelterOnly = createBot('cooperative', { noise: 0, buildOrder: ['shelter:first'] });

    // The fire is covered. 20 trees left: one more chop for the igloo would leave fewer than half.
    const warm = island(1, 2);
    expect(warm.resources.wood).toBeGreaterThanOrEqual(woodTarget(warm));
    expect(shelterOnly.chooseAction(warm, 'a', rng)).toBeNull();
    // 10 trees left: no building is worth the last trees either.
    expect(shelterOnly.chooseAction(island(1, 3), 'a', rng)).toBeNull();

    // The fire wants 60 + 60: it takes the thinned forest, and clears it when nothing else is left.
    for (const chops of [2, 3]) {
      const cold = island(20, chops);
      expect(cold.resources.wood).toBeLessThan(woodTarget(cold));
      expect(shelterOnly.chooseAction(cold, 'a', rng)).toEqual({ x: 2, y: 1 });
    }
  });
});

describe('cooperative bot votes and the village fire', () => {
  /** The fire burns 30 wood a month; month 1 builds a free igloo and leaves 60 wood. */
  function fireGame(school: number) {
    const params: GameParams = {
      ...DEFAULT_PARAMS,
      startWoodPerVillager: 30,
      heatWoodPerVillager: [10, 10, 10],
      costs: {
        shelter: FREE,
        school: [{ wood: school, stone: 0 }, FREE[1], FREE[2]],
        workshop: FREE,
        gathering: FREE,
      },
    };
    const game = newGame(params);
    voteAll(game, 'shelter-1');
    game.endActionPhase();
    return game;
  }

  it('never votes for an option that would leave the fire cold while another open option exists', () => {
    const game = fireGame(15); // school-1 costs 45 of the 60 wood, the fire needs 30
    expect(game.resources.wood).toBe(60);
    const school = game.voteOptions().find((o) => o.id === 'school-1')!;
    expect(school.blocked).toEqual([]);
    expect(school.leavesFireCold).toBe(true);

    const schoolFirst = createBot('cooperative', { noise: 0, buildOrder: ['shelter:first', 'school-1', 'gathering-1'] });
    expect(schoolFirst.chooseVote(game, 'a', rng)).toBe('gathering-1');
    const onlySchool = createBot('cooperative', { noise: 0, buildOrder: ['shelter:first', 'school-1'] });
    expect(onlySchool.chooseVote(game, 'a', rng)).toBe('none');
    // Not even the random slips of a noisy class pick it.
    const noisy = createBot('cooperative', { noise: 1 });
    const noisyRng = createRng(7);
    for (let i = 0; i < 200; i++) expect(noisy.chooseVote(game, 'a', noisyRng)).not.toBe('school-1');
  });

  it('votes for a building that costs wood when the fire keeps enough', () => {
    const game = fireGame(4); // school-1 costs 15, leaving 45 for the fire's 30
    expect(game.voteOptions().find((o) => o.id === 'school-1')).toMatchObject({ blocked: [], leavesFireCold: false });
    const schoolFirst = createBot('cooperative', { noise: 0, buildOrder: ['shelter:first', 'school-1', 'gathering-1'] });
    expect(schoolFirst.chooseVote(game, 'a', rng)).toBe('school-1');
  });
});
