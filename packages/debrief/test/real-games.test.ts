import { playGame, playMonth, seatsFor, type ClassMix } from '@saari/bots';
import { createGame, createRng, type GameLength } from '@saari/rules';
import { describe, expect, it } from 'vitest';
import { ACTION_GROUPS, sumCounts, totalOf } from '../src/actions.ts';
import { buildDebrief, pseudonymize, type DebriefData, type DebriefLabel } from '../src/index.ts';
import { QUESTION_IDS } from '../src/questions.ts';

interface Case {
  seed: number;
  villagers: number;
  length: GameLength;
  mix: ClassMix;
}

const MIXED: ClassMix = { cooperative: 0.6, random: 0.25, lazy: 0.15 };

const CASES: Case[] = [
  { seed: 1, villagers: 5, length: 'normal', mix: { cooperative: 1 } },
  { seed: 2, villagers: 20, length: 'normal', mix: { cooperative: 1 } },
  { seed: 3, villagers: 5, length: 'short', mix: { cooperative: 1 } },
  { seed: 4, villagers: 5, length: 'normal', mix: { random: 1 } },
  { seed: 5, villagers: 20, length: 'short', mix: { random: 1 } },
  { seed: 6, villagers: 5, length: 'short', mix: { lazy: 1 } },
  { seed: 7, villagers: 20, length: 'normal', mix: { lazy: 1 } },
  { seed: 8, villagers: 20, length: 'normal', mix: MIXED },
  { seed: 9, villagers: 5, length: 'short', mix: MIXED },
  { seed: 10, villagers: 20, length: 'normal', mix: { skillsOnly: 1 } },
  { seed: 11, villagers: 5, length: 'normal', mix: { skillsOnly: 1 } },
];

const NOW = new Date('2026-10-09T12:00:00.000Z');

/** Nicknames that cannot show up in a debrief by accident. */
function labelsFor(ids: readonly string[]): DebriefLabel[] {
  return ids.map((id, i) => ({ id, label: `Nimimerkki-${id}-Öljy`, color: `#0000${(i + 16).toString(16).padStart(2, '0')}` }));
}

const name = (c: Case) => `seed ${c.seed}, ${c.villagers} villagers, ${c.length}, ${JSON.stringify(c.mix)}`;

describe.each(CASES)('a real bot game: $seed', (c) => {
  const game = playGame(c);
  const labels = labelsFor(game.playerIds());
  const d = buildDebrief(game, labels, NOW);
  const actionEntries = game.log.filter((e) => e.type === 'action');

  it(`plays every month, or until the village gives up, and ends normally (${name(c)})`, () => {
    const limit = game.params.lossThreshold[c.length];
    const lostIn = game.reports.findIndex((r) => r.happiness < limit);
    expect(d.lost).toBe(lostIn >= 0);
    expect(d.monthsPlayed).toBe(game.reports.length);
    expect(d.monthsPlayed).toBe(lostIn >= 0 ? lostIn + 1 : d.totalMonths);
    expect(d.totalMonths).toBe(game.totalMonths);
    expect(d.length).toBe(c.length);
    expect(d.endedEarly).toBe(false);
    expect(d.named).toBe(true);
    expect(d.happiness).toBe(game.happiness);
    expect(d.grade).toBe(game.grade());
    expect(d.villagers).toBe(c.villagers);
    expect(d.months).toEqual(game.reports);
  });

  it('accounts for every action and every unused action', () => {
    expect(d.actionsByMonth).toHaveLength(d.monthsPlayed);
    expect(totalOf(sumCounts(d.actionsByMonth))).toBe(actionEntries.length);
    expect(d.actionsByMonth.map((m) => m.unused)).toEqual(game.reports.map((r) => r.unusedActions));
    const perPlayer = sumCounts(d.players.map((p) => p.actions));
    expect(perPlayer).toEqual(sumCounts(d.actionsByMonth));
    expect(d.players.reduce((s, p) => s + p.unusedActions, 0)).toBe(d.actionsByMonth.reduce((s, m) => s + m.unused, 0));
  });

  it('gives action shares that sum to 1', () => {
    const total = totalOf(sumCounts(d.actionsByMonth));
    expect(ACTION_GROUPS.reduce((s, g) => s + d.actionShare[g], 0)).toBeCloseTo(1, 12);
    for (const g of ACTION_GROUPS) expect(d.actionShare[g]).toBeCloseTo(sumCounts(d.actionsByMonth)[g] / total, 12);
  });

  it('lists every bot once, in seat order, with its label and final skills', () => {
    expect(d.players.map((p) => p.id)).toEqual(game.playerIds());
    expect(d.players.map((p) => p.label)).toEqual(labels.map((l) => l.label));
    expect(d.players.map((p) => p.color)).toEqual(labels.map((l) => l.color));
    for (const p of d.players) {
      expect(p.education).toBe(game.player(p.id)?.education);
      expect(p.tools).toBe(game.player(p.id)?.tools);
      expect(p.votes.map((v) => v.month)).toEqual(d.months.map((m) => m.month));
    }
  });

  it("agrees with the engine's vote counts", () => {
    d.months.forEach((m, i) => {
      const cast = d.players.filter((p) => p.votes[i]?.option != null).length;
      expect(cast, `month ${m.month}`).toBe(Object.values(m.vote.counts).reduce((a, b) => a + b, 0));
      for (const [option, count] of Object.entries(m.vote.counts)) {
        expect(d.players.filter((p) => p.votes[i]?.option === option).length, `${option} in month ${m.month}`).toBe(count);
      }
    });
    const cast = d.players.reduce((s, p) => s + p.votes.filter((v) => v.option !== null).length, 0);
    expect(d.votes.participation).toBeCloseTo(cast / (d.players.length * d.monthsPlayed), 12);
    expect(d.votes.ties).toBe(d.months.filter((m) => m.vote.outcome === 'tie').length);
    expect(d.votes.emptyMonths).toBe(d.months.filter((m) => m.vote.outcome !== 'built').length);
    expect(d.votes.averageWinningShare).toBeGreaterThanOrEqual(0);
    expect(d.votes.averageWinningShare).toBeLessThanOrEqual(1);
  });

  it('reports crises that match the months', () => {
    for (const crisis of d.crises) {
      const affected = (month: number) => {
        const r = d.months.find((m) => m.month === month)!;
        if (crisis.kind === 'hunger') return r.food.hungry;
        return crisis.kind === 'cold' ? r.heat.cold : r.shelter.unsheltered;
      };
      expect(affected(crisis.month)).toBeGreaterThan(0);
      expect(crisis.people).toBeGreaterThan(0);
      expect(crisis.people).toBeLessThanOrEqual(c.villagers);
      if (crisis.resolvedMonth !== null) expect(affected(crisis.resolvedMonth)).toBe(0);
    }
    const hungry = d.months.filter((m) => m.food.hungry > 0).length;
    expect(hungry > 0).toBe(d.crises.some((x) => x.kind === 'hunger'));
    const cold = d.months.filter((m) => m.heat.cold > 0).length;
    expect(cold > 0).toBe(d.crises.some((x) => x.kind === 'cold'));
  });

  it('asks the loss, cold and warm-all questions as the game calls for', () => {
    const ids = d.questions.map((q) => q.id);
    expect(ids.includes('lost')).toBe(d.lost);
    expect(d.questions[0]?.id === 'lost').toBe(d.lost === true);
    if (d.lost) expect(d.questions[0]?.params).toEqual({ month: d.monthsPlayed });

    const crisis = d.crises.find((x) => x.kind === 'cold');
    const month = d.months.find((m) => m.month === crisis?.month);
    // lost, hunger and cold rank first, so the cold question always makes the four.
    expect(d.questions.find((q) => q.id === 'cold')?.params).toEqual(
      crisis ? { month: crisis.month, people: crisis.people, temperature: month?.heat.temperature } : undefined,
    );
    // Nobody cold in any month: the village may be asked how it shared the wood, never when someone was.
    if (crisis) expect(ids).not.toContain('warm-all');
  });

  it('asks 1-5 valid questions with whole-number params, ending with decision-making', () => {
    expect(d.questions.length).toBeGreaterThanOrEqual(1);
    expect(d.questions.length).toBeLessThanOrEqual(5);
    expect(d.questions.at(-1)).toEqual({ id: 'decision-making', params: {} });
    const ids = d.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of d.questions) {
      expect(QUESTION_IDS).toContain(q.id);
      for (const v of Object.values(q.params)) expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('survives a JSON round trip, named and pseudonymised, and the stored one has no nicknames', () => {
    expect(JSON.parse(JSON.stringify(d))).toEqual(d);
    const stored = pseudonymize(d);
    expect(JSON.parse(JSON.stringify(stored))).toEqual(stored);
    const json = JSON.stringify(stored);
    for (const l of labels) expect(json).not.toContain(l.label);
    expect(json).not.toContain('Nimimerkki');
  });
});

describe('a real bot game with a late joiner and a removed player', () => {
  const game = createGame({ seed: 42, length: 'short' });
  const seats = seatsFor(MIXED, 12);
  for (const s of seats) game.addPlayer(s.id);
  game.start();
  const rng = createRng(42);
  playMonth(game, seats, rng);
  game.addPlayer('late');
  const withLate = [...seats, { id: 'late', strategy: 'cooperative' as const }];
  playMonth(game, withLate, rng);
  playMonth(game, withLate, rng);
  game.removePlayer('b3');
  const remaining = withLate.filter((s) => s.id !== 'b3');
  while (game.phase !== 'ended') playMonth(game, remaining, rng);

  const d: DebriefData = buildDebrief(game, labelsFor(game.playerIds()), NOW);

  it('leaves the removed player out of the list but keeps their actions in the village story', () => {
    expect(d.players.map((p) => p.id)).toEqual(game.playerIds().filter((id) => id !== 'b3'));
    const all = game.log.filter((e) => e.type === 'action').length;
    const removed = game.log.filter((e) => e.type === 'action' && e.player === 'b3').length;
    expect(removed).toBeGreaterThan(0);
    expect(totalOf(sumCounts(d.actionsByMonth))).toBe(all);
    expect(totalOf(sumCounts(d.players.map((p) => p.actions)))).toBe(all - removed);
  });

  it("gives the late joiner no vote before they joined", () => {
    const late = d.players.find((p) => p.id === 'late')!;
    expect(late.votes[0]).toEqual({ month: 1, option: null });
    expect(late.votes).toHaveLength(d.monthsPlayed);
  });

  it('counts possible votes month by month', () => {
    // Month 1: 12 seats; months 2-3: 13 with the late joiner; later: 12 without b3.
    const possible = 12 + 13 + 13 + 12 * (d.monthsPlayed - 3);
    const cast = d.months.reduce((s, m) => s + Object.values(m.vote.counts).reduce((a, b) => a + b, 0), 0);
    expect(d.votes.participation).toBeCloseTo(cast / possible, 12);
  });
});
