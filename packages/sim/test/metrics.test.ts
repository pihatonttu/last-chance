import { playGame } from '@saari/bots';
import type { Game, LogEntry, MonthReport } from '@saari/rules';
import { describe, expect, it } from 'vitest';
import { ACTION_GROUPS, measureGame, type MeasurableGame } from '../src/metrics.ts';

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

describe('measureGame on a real bot game', () => {
  const game: Game = playGame({ seed: 1, villagers: 6, length: 'short', mix: { cooperative: 1 } });
  const m = measureGame(game);

  it('copies the headline numbers from the game', () => {
    expect(m.seed).toBe(1);
    expect(m.months).toBe(10);
    expect(m.villagers).toBe(6);
    expect(m.happiness).toBe(game.happiness);
    expect(m.grade).toBe(game.grade());
    expect(m.endResources).toEqual(game.resources);
  });

  it('has one mood per month that sums to the happiness', () => {
    expect(m.moodByMonth).toHaveLength(10);
    expect(sum(m.moodByMonth)).toBe(m.happiness);
  });

  it('counts hunger, shelter and spoilage within the month count', () => {
    expect(m.hungryMonths).toBeGreaterThanOrEqual(0);
    expect(m.hungryMonths).toBeLessThanOrEqual(m.months);
    expect(m.hungerTotal).toBeGreaterThanOrEqual(m.hungryMonths);
    expect(m.unshelteredMonths).toBeLessThanOrEqual(m.months);
    expect(m.spoiledTotal).toBe(sum(game.reports.map((r) => r.food.spoiled)));
    if (m.firstShelteredMonth === null) {
      expect(m.unshelteredMonths).toBe(m.months);
    } else {
      const first = m.firstShelteredMonth;
      expect(game.reports[first - 1]!.shelter.unsheltered).toBe(0);
      for (const r of game.reports.slice(0, first - 1)) expect(r.shelter.unsheltered).toBeGreaterThan(0);
    }
  });

  it('lists the buildings exactly as the vote-result log entries do', () => {
    const built = game.log
      .filter((e): e is Extract<LogEntry, { type: 'vote-result' }> => e.type === 'vote-result')
      .filter((e) => e.result.outcome === 'built')
      .map((e) => ({ month: e.month, option: e.result.option }));
    expect(m.buildings).toEqual(built);
    expect(m.buildings.length + m.emptyMonths).toBe(m.months);
    expect(m.ties).toBeLessThanOrEqual(m.emptyMonths);
  });

  it('counts actions from the log and unused actions from the reports', () => {
    expect(m.actions).toBe(game.log.filter((e) => e.type === 'action').length);
    const unusedLogged = sum(
      game.log.map((e) => (e.type === 'actions-unused' ? e.count : 0)),
    );
    expect(m.unusedActions).toBe(unusedLogged);
    expect(m.actions).toBeGreaterThan(0);
    expect(sum(ACTION_GROUPS.map((g) => m.actionShare[g]))).toBeCloseTo(1, 9);
  });

  it('averages the final skills over all players', () => {
    const ids = game.playerIds();
    const edu = sum(ids.map((id) => game.player(id)!.education)) / ids.length;
    const tools = sum(ids.map((id) => game.player(id)!.tools)) / ids.length;
    expect(m.avgEducation).toBeCloseTo(edu, 9);
    expect(m.avgTools).toBeCloseTo(tools, 9);
    expect(m.avgEducation).toBeGreaterThanOrEqual(1);
    expect(m.avgTools).toBeGreaterThanOrEqual(1);
  });

  it('dates the spring discovery from the log', () => {
    const found = game.log.find((e) => e.type === 'spring-found');
    expect(m.springFoundMonth).toBe(found ? found.month : null);
  });
});

describe('measureGame on a hand-made game', () => {
  const entry = (month: number, event: Record<string, unknown>): LogEntry =>
    ({ seq: 0, t: 0, month, phase: 'action', ...event }) as LogEntry;
  const action = (month: number, kind: string) =>
    entry(month, { type: 'action', player: 'a', kind, x: 0, y: 0, gain: {} });
  const report = (month: number, over: Partial<MonthReport> = {}): MonthReport => ({
    month,
    villagers: 2,
    vote: { outcome: 'none', counts: {} },
    food: { before: 8, need: 8, eaten: 8, hungry: 0, spoiled: 0, after: 0 },
    shelter: { share: 0, capacity: 0, unsheltered: 2 },
    recreation: 0,
    mood: { food: 2, shelter: -10, recreation: 0, total: -8 },
    happiness: 0,
    unusedActions: 0,
    ...over,
  });

  const fake: MeasurableGame = {
    seed: 7,
    villagers: 2,
    happiness: -1,
    resources: { food: 1, wood: 2, stone: 3 },
    grade: () => 2,
    playerIds: () => ['a', 'b'],
    player: (id: string) =>
      ({ id, education: id === 'a' ? 1 : 3, tools: id === 'a' ? 2 : 2 }) as ReturnType<Game['player']>,
    reports: [
      report(1, {
        vote: { outcome: 'built', counts: { 'shelter-1': 2 }, option: 'shelter-1' },
        food: { before: 4, need: 8, eaten: 4, hungry: 1, spoiled: 0, after: 0 },
        mood: { food: -5, shelter: -10, recreation: 0, total: -15 },
        unusedActions: 1,
      }),
      report(2, {
        vote: { outcome: 'tie', counts: {} },
        shelter: { share: 1, capacity: 2, unsheltered: 0 },
        food: { before: 30, need: 8, eaten: 8, hungry: 0, spoiled: 6, after: 16 },
        mood: { food: 2, shelter: 2, recreation: 0, total: 4 },
        unusedActions: 2,
      }),
      report(3, {
        vote: { outcome: 'no-votes', counts: {} },
        shelter: { share: 1, capacity: 2, unsheltered: 0 },
        mood: { food: 2, shelter: 2, recreation: 6, total: 10 },
      }),
    ],
    log: [
      action(1, 'harvest'),
      action(1, 'fish'),
      action(1, 'plow'),
      action(1, 'chop'),
      action(2, 'mine'),
      action(2, 'build-quarry'),
      action(2, 'explore'),
      entry(2, { type: 'spring-found', x: 0, y: 0, player: 'a' }),
      action(3, 'study'),
      action(3, 'make-tools'),
      action(3, 'swim'),
      action(3, 'gather'),
      entry(3, { type: 'spring-found', x: 1, y: 1, player: 'b' }),
    ],
  };
  const m = measureGame(fake);

  it('groups the action kinds into the six shares', () => {
    expect(m.actions).toBe(11);
    expect(m.actionShare.food).toBeCloseTo(2 / 11, 12);
    expect(m.actionShare.fields).toBeCloseTo(1 / 11, 12);
    expect(m.actionShare.materials).toBeCloseTo(3 / 11, 12);
    expect(m.actionShare.explore).toBeCloseTo(1 / 11, 12);
    expect(m.actionShare.skills).toBeCloseTo(2 / 11, 12);
    expect(m.actionShare.recreation).toBeCloseTo(2 / 11, 12);
  });

  it('reads votes, hunger, shelter and the first spring', () => {
    expect(m.buildings).toEqual([{ month: 1, option: 'shelter-1' }]);
    expect(m.ties).toBe(1);
    expect(m.emptyMonths).toBe(2);
    expect(m.hungryMonths).toBe(1);
    expect(m.hungerTotal).toBe(1);
    expect(m.unshelteredMonths).toBe(1);
    expect(m.firstShelteredMonth).toBe(2);
    expect(m.spoiledTotal).toBe(6);
    expect(m.unusedActions).toBe(3);
    expect(m.moodByMonth).toEqual([-15, 4, 10]);
    expect(m.springFoundMonth).toBe(2);
    expect(m.avgEducation).toBe(2);
    expect(m.avgTools).toBe(2);
    expect(m.endResources).toEqual({ food: 1, wood: 2, stone: 3 });
  });

  it('gives zero shares and null months when nothing happened', () => {
    const empty = measureGame({ ...fake, log: [], reports: [report(1)], playerIds: () => [] });
    expect(empty.actions).toBe(0);
    for (const g of ACTION_GROUPS) expect(empty.actionShare[g]).toBe(0);
    expect(empty.firstShelteredMonth).toBeNull();
    expect(empty.springFoundMonth).toBeNull();
    expect(empty.avgEducation).toBe(0);
  });
});
