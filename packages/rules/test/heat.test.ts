import { describe, expect, it } from 'vitest';
import { generateTemperatures, woodPerVillager } from '../src/weather.ts';
import { RULE_TEST_PARAMS as P } from './params.ts';
import { act, buildByVote, finishMonth, freeBuildingParams, setup, tileAt, withoutLoss } from './helpers.ts';

/** SMALL_ISLAND: landing (3,5); the forest (3,4) and the sea (3,6) are next to it. */
const FOREST = { x: 3, y: 4 };

function chop(game: ReturnType<typeof setup>, player: string, times = 1) {
  for (let i = 0; i < times; i++) act(game, player, FOREST.x, FOREST.y);
}

describe('the village fire (docs/10-arktinen.md §4)', () => {
  it("burns this month's need at month end: all warm, +2 mood", () => {
    const game = setup({ players: 3 });
    const temperature = game.temperature();
    // Month 1 is mild: 1 wood per villager. The store has 2 x 3 = 6, rounded up to 10.
    expect(game.heatNeed()).toBe(3);
    const report = finishMonth(game);
    expect(report.heat).toEqual({ temperature, need: 3, burned: 3, cold: 0 });
    expect(report.mood.heat).toBe(2);
    expect(game.resources.wood).toBe(7);
  });

  it('wood exactly the need: everyone warm, no wood left', () => {
    const game = setup({ players: 10, params: { ...P, startWoodPerVillager: 0 } });
    chop(game, 'p1'); // 10 wood for 10 villagers in the mild first month
    expect(game.resources.wood).toBe(game.heatNeed());
    const report = finishMonth(game);
    expect(report.heat).toMatchObject({ need: 10, burned: 10, cold: 0 });
    expect(report.mood.heat).toBe(2);
    expect(game.resources.wood).toBe(0);
  });

  it('too little wood: the store empties, ceil(missing / per villager) are cold, -max(1, round(10 x cold / N)) mood', () => {
    // Mild month, 21 villagers, 20 wood: 1 cold, round(10 x 1 / 21) = 0, so the floor of -1.
    const mild = setup({ players: 21, params: { ...P, startWoodPerVillager: 0 } });
    chop(mild, 'p1', 2);
    const first = finishMonth(mild);
    expect(first.heat).toMatchObject({ need: 21, burned: 20, cold: 1 });
    expect(first.mood.heat).toBe(-1);
    expect(mild.resources.wood).toBe(0);

    // Hard frost, 4 villagers, 10 wood: need 12, 2 missing, ceil(2 / 3) = 1 cold, round(2.5) = 3.
    const hard = setup({ players: 4, params: withoutLoss({ ...P, startWoodPerVillager: 0 }) });
    while (woodPerVillager(hard.temperature(), P) < 3) finishMonth(hard);
    chop(hard, 'p1');
    const report = finishMonth(hard);
    expect(report.heat).toMatchObject({ need: 12, burned: 10, cold: 1 });
    expect(report.mood.heat).toBe(-3);
    expect(hard.resources.wood).toBe(0);
  });

  it('the order is food, heat, homes, mood: mood.total sums all four', () => {
    // The vote is paid first: 20 wood buys the school and leaves nothing for the fire.
    const game = setup({ players: 3, params: { ...P, startWoodPerVillager: 0 } });
    buildByVote(game, 'shelter-1'); // ice only
    chop(game, 'p1', 2);
    game.endActionPhase();
    for (const p of ['p1', 'p2', 'p3']) game.vote(p, 'school-1');
    const report = game.endVotePhase();
    expect(report.vote).toMatchObject({ outcome: 'built', option: 'school-1' });
    expect(report.heat).toMatchObject({ burned: 0, cold: 3 });
    // Month 2: the starting food is gone (3 hungry), 1/6 sheltered, everyone cold.
    expect(report.mood).toEqual({ food: -10, heat: -10, shelter: -8, recreation: 0, total: -28 });
  });

  it('temperature() and forecast() follow the generated list; forecast is null in the last month', () => {
    const lobby = setup({ players: 1, length: 'short', start: false });
    const temperatures = generateTemperatures(lobby.seed, lobby.totalMonths, P);
    // The lobby (month 0) shows month 1.
    expect(lobby.temperature()).toBe(temperatures[0]);
    expect(lobby.forecast()).toBe(temperatures[1]);

    const game = setup({ players: 1, length: 'short', params: withoutLoss() });
    for (let month = 1; month <= 10; month++) {
      expect(game.month).toBe(month);
      expect(game.temperature()).toBe(temperatures[month - 1]);
      expect(game.forecast()).toBe(month < 10 ? temperatures[month] : null);
      expect(finishMonth(game).heat.temperature).toBe(temperatures[month - 1]);
    }
    expect(game.temperature(3)).toBe(temperatures[2]);
  });

  it('heatNeed is woodPerVillager(temperature) x N', () => {
    const game = setup({ players: 7, params: withoutLoss() });
    const needs = new Set<number>();
    while (game.phase !== 'ended') {
      expect(game.heatNeed()).toBe(woodPerVillager(game.temperature(), P) * 7);
      needs.add(game.heatNeed());
      finishMonth(game);
    }
    expect(needs).toContain(21); // the hard months
  });

  it('the vote option says when its wood would leave the fire cold; none never does', () => {
    const params = {
      ...freeBuildingParams(),
      costs: { ...freeBuildingParams().costs, school: [{ wood: 4, stone: 0 }, ...P.costs.school.slice(1)] as never },
    };
    const game = setup({ players: 3, params });
    buildByVote(game, 'shelter-1');
    chop(game, 'p1'); // 7 left after month 1, now 17
    const options = game.voteOptions();
    const school = options.find((o) => o.id === 'school-1')!;
    // The school costs 4 x 3 = 12 -> 15 and is affordable, but 15 > 17 - heatNeed().
    expect(school.cost.wood).toBe(15);
    expect(game.resources.wood).toBe(17);
    expect(school.cost.wood).toBeGreaterThan(game.resources.wood - game.heatNeed());
    expect(school.blocked).toEqual([]);
    expect(options.filter((o) => o.leavesFireCold).map((o) => o.id)).toEqual(['school-1']);
    // The class may still vote for it.
    game.endActionPhase();
    expect(game.vote('p1', 'school-1')).toEqual({ ok: true });

    const cold = setup({ players: 3, params: { ...P, startWoodPerVillager: 0 } });
    expect(cold.voteOptions().find((o) => o.id === 'none')?.leavesFireCold).toBe(false);
  });

  it('igloos cost ice: shelter-1 is 4 stone per villager and no wood; the game starts with 4N stone and 2N wood', () => {
    const game = setup({ players: 5 });
    expect(game.resources).toMatchObject({ wood: 10, stone: 20 });
    expect(game.voteOptions().find((o) => o.id === 'shelter-1')?.cost).toEqual({ wood: 0, stone: 20 });
    const report = buildByVote(game, 'shelter-1');
    expect(report.vote).toMatchObject({ outcome: 'built', option: 'shelter-1' });
    expect(game.resources).toMatchObject({ wood: 10 - report.heat.burned, stone: 0 });
    // The next level costs 6 ice per villager.
    expect(game.voteOptions().find((o) => o.id === 'shelter-2')?.cost).toEqual({ wood: 0, stone: 30 });

    // Both stores round up like prices: 3 villagers start with 6 -> 10 wood and 12 -> 15 ice.
    expect(setup({ players: 3 }).resources).toMatchObject({ wood: 10, stone: 15 });
  });

  it('the landing is the fire: no building goes there and it cannot become a greenhouse', () => {
    const game = setup({ players: 3, params: withoutLoss(freeBuildingParams()) });
    const { x, y } = game.landing;
    expect(game.preview('p1', x, y)).toMatchObject({ kind: null, available: false });
    expect(game.act('p1', x, y)).toEqual({ ok: false, reason: 'no-action' });
    const report = buildByVote(game, 'shelter-1');
    expect(report.vote).toMatchObject({ outcome: 'built' });
    expect({ x: report.vote.x, y: report.vote.y }).not.toEqual({ x, y });
    // Fill the other three revealed meadows; the landing is never used.
    for (let i = 0; i < 3; i++) buildByVote(game, 'shelter-1');
    expect(game.voteOptions().find((o) => o.id === 'shelter-1')?.blocked).toEqual(['space']);
    expect(tileAt(game, x, y)).toMatchObject({ terrain: 'meadow', building: null });
  });

  it('if the landing would be the only free meadow, new buildings are blocked for space', () => {
    const map = ['~~~~~', '~TTT~', '~TLT~', '~~~~~'];
    const game = setup({ map, players: 3 });
    expect(game.voteOptions().find((o) => o.id === 'shelter-1')?.blocked).toEqual(['space']);
  });
});
