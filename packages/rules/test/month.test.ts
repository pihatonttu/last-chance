import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from '../src/params.ts';
import { act, buildByVote, finishMonth, freeBuildingParams, setup, tileAt } from './helpers.ts';

/** Rock and spring next to the landing (3,3); see actions.test.ts. */
const ROCK_MAP = ['~~~~~~', '~T.o.~', '~.^T.~', '~T.L.~', '~~~~~~'];

describe('food', () => {
  it('the village eats 4 per villager; enough food gives +2 mood', () => {
    const game = setup({ players: 3 });
    const report = finishMonth(game);
    expect(report.food).toMatchObject({ before: 12, need: 12, eaten: 12, hungry: 0, spoiled: 0, after: 0 });
    expect(report.mood.food).toBe(2);
  });

  it('missing food leaves ceil(missing / 4) hungry and costs ceil(10 x hungry / N) mood', () => {
    const game = setup({ players: 3 });
    finishMonth(game); // month 1 eats the starting 12 food
    const report = finishMonth(game); // month 2: 0 food, need 12
    expect(report.food).toMatchObject({ before: 0, need: 12, eaten: 0, hungry: 3, after: 0 });
    expect(report.mood.food).toBe(-10);
  });

  it('a partial shortage only counts the hungry share', () => {
    const game = setup({ players: 3 });
    finishMonth(game);
    act(game, 'p1', 3, 6); // fish +5
    const report = finishMonth(game); // 5 of 12: 7 missing -> 2 hungry
    expect(report.food).toMatchObject({ before: 5, eaten: 5, hungry: 2 });
    expect(report.mood.food).toBe(-7); // ceil(10 * 2 / 3)
  });

  it('food above two months of need spoils at month end', () => {
    const game = setup({ players: 1 });
    // N = 1: need 4, storage 8. Start 4 food, fish 3 x 5 = 15 -> 19, eat 4 -> 15, spoil 7.
    act(game, 'p1', 3, 6);
    act(game, 'p1', 3, 6);
    act(game, 'p1', 3, 6);
    const report = finishMonth(game);
    expect(report.food).toMatchObject({ before: 19, eaten: 4, spoiled: 7, after: 8 });
    expect(game.resources.food).toBe(8);
  });
});

describe('shelter', () => {
  it('no shelter: everyone unsheltered, -10 mood', () => {
    const report = finishMonth(setup({ players: 3 }));
    expect(report.shelter).toEqual({ capacity: 0, unsheltered: 3 });
    expect(report.mood.shelter).toBe(-10);
  });

  it('a shelter built this month already counts at month end', () => {
    const game = setup({ players: 3 });
    const report = buildByVote(game, 'shelter-1');
    // Level 1 holds ceil(3/6) = 1.
    expect(report.shelter).toEqual({ capacity: 1, unsheltered: 2 });
    expect(report.mood.shelter).toBe(-7);
  });

  it('enough shelter gives +2, and 25 % spare room +1 more', () => {
    const game = setup({ players: 3, params: freeBuildingParams() });
    buildByVote(game, 'shelter-1');
    buildByVote(game, 'shelter-2');
    const r3 = buildByVote(game, 'shelter-3'); // ceil(3/2) = 2
    expect(r3.shelter).toEqual({ capacity: 2, unsheltered: 1 });
    buildByVote(game, 'shelter-1');
    const r5 = buildByVote(game, 'shelter-2'); // 2 + ceil(3/3) = 3 = N
    expect(r5.shelter).toEqual({ capacity: 3, unsheltered: 0 });
    expect(r5.mood.shelter).toBe(2);
    const r6 = buildByVote(game, 'shelter-3'); // 2 + 2 = 4 >= 3.75
    expect(r6.mood.shelter).toBe(3);
  });
});

describe('recreation and happiness', () => {
  it('recreation gives floor(10 x uses / N) mood', () => {
    const game = setup({ map: ROCK_MAP, players: 3 });
    act(game, 'p1', 3, 1);
    act(game, 'p1', 3, 1);
    act(game, 'p2', 3, 1);
    const report = finishMonth(game);
    expect(report.recreation).toBe(1);
    expect(report.mood.recreation).toBe(3);
  });

  it('happiness is the running sum of monthly mood', () => {
    const game = setup({ players: 3 });
    const r1 = finishMonth(game);
    const r2 = finishMonth(game);
    expect(r1.mood.total).toBe(2 - 10);
    expect(r2.mood.total).toBe(-10 - 10);
    expect(game.happiness).toBe(r1.mood.total + r2.mood.total);
    expect(r2.happiness).toBe(game.happiness);
  });
});

describe('nature and reset', () => {
  it('forests regrow x1.25 rounded up, up to 40', () => {
    const game = setup({ players: 3 });
    act(game, 'p1', 3, 4);
    finishMonth(game);
    expect(tileAt(game, 3, 4).stock).toBe(38); // ceil(30 * 1.25)
    finishMonth(game);
    expect(tileAt(game, 3, 4).stock).toBe(40);
  });

  it('fields grow back to full', () => {
    const game = setup({ players: 3 });
    for (let i = 0; i < 3; i++) act(game, 'p1', 2, 4);
    act(game, 'p2', 2, 4);
    expect(tileAt(game, 2, 4).stock).toBe(20);
    finishMonth(game);
    expect(tileAt(game, 2, 4).stock).toBe(30);
  });

  it('spring uses and every player\'s actions reset', () => {
    const game = setup({ map: ROCK_MAP, players: 3 });
    act(game, 'p1', 3, 1);
    act(game, 'p1', 3, 1);
    act(game, 'p2', 3, 1);
    finishMonth(game);
    expect(tileAt(game, 3, 1).uses).toBe(0);
    expect(game.recreationThisMonth).toBe(0);
    expect(game.player('p1')?.actionsLeft).toBe(3);
  });
});

describe('unused actions', () => {
  it('are counted when the action phase ends and logged per player', () => {
    const game = setup({ players: 2 });
    act(game, 'p1', 3, 6);
    const report = finishMonth(game);
    expect(report.unusedActions).toBe(5);
    expect(game.log.filter((e) => e.type === 'actions-unused')).toEqual([
      expect.objectContaining({ player: 'p1', count: 2 }),
      expect.objectContaining({ player: 'p2', count: 3 }),
    ]);
  });
});

describe('joining and leaving', () => {
  it('a player who joins mid-month plays at once but counts from next month', () => {
    const game = setup({ players: 3 });
    expect(game.addPlayer('late')).toEqual({ ok: true });
    act(game, 'late', 3, 6);
    expect(game.villagers).toBe(3);
    finishMonth(game);
    expect(game.villagers).toBe(4);
  });

  it('joining closes when month 4 begins', () => {
    const game = setup({ players: 1 });
    finishMonth(game);
    finishMonth(game);
    expect(game.month).toBe(3);
    expect(game.addPlayer('a')).toEqual({ ok: true });
    finishMonth(game);
    expect(game.month).toBe(4);
    expect(game.addPlayer('b')).toEqual({ ok: false, reason: 'join-closed' });
  });

  it('a removed player can no longer act and stops counting next month', () => {
    const game = setup({ players: 3 });
    game.removePlayer('p3');
    expect(game.act('p3', 3, 6)).toEqual({ ok: false, reason: 'removed' });
    expect(game.villagers).toBe(3);
    finishMonth(game);
    expect(game.villagers).toBe(2);
  });

  it('disconnected players still count but are not waited for', () => {
    const game = setup({ players: 2 });
    game.setConnected('p2', false);
    act(game, 'p1', 3, 6);
    act(game, 'p1', 3, 6);
    act(game, 'p1', 3, 6);
    expect(game.allActionsUsed()).toBe(true);
    game.endActionPhase();
    game.vote('p1', 'none');
    expect(game.allVoted()).toBe(true);
    expect(game.villagers).toBe(2);
  });
});

describe('game end and grade', () => {
  it('ends after the last month', () => {
    const game = setup({ players: 1, length: 'short' });
    for (let m = 1; m <= 9; m++) finishMonth(game);
    expect(game.month).toBe(10);
    finishMonth(game);
    expect(game.phase).toBe('ended');
    expect(game.log.at(-1)).toMatchObject({ type: 'game-ended', early: false });
  });

  it('the teacher can end the game early', () => {
    const game = setup();
    game.endEarly();
    expect(game.phase).toBe('ended');
    expect(game.log.at(-1)).toMatchObject({ type: 'game-ended', early: true });
  });

  it('grade counts how many thresholds the happiness reaches (1..6)', () => {
    const params = { ...DEFAULT_PARAMS, gradeThresholds: [-15, -5, 0, 5, 10] as const };
    const game = setup({ players: 3, params });
    expect(game.grade()).toBe(4); // happiness 0 reaches -15, -5 and 0
    finishMonth(game); // -8
    expect(game.grade()).toBe(2);
  });

  it('a short game scales the thresholds by 10 / 15', () => {
    const params = { ...DEFAULT_PARAMS, gradeThresholds: [-15, -9, 0, 15, 30] as const };
    const game = setup({ players: 3, params, length: 'short' });
    finishMonth(game); // -8. Scaled thresholds -10, -6, 0, 10, 20: only -10 reached.
    expect(game.grade()).toBe(2); // unscaled (-15, -9) it would be 3
  });
});
