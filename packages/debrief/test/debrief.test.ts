import { describe, expect, it } from 'vitest';
import { buildDebrief, pseudonymize, type DebriefData, type DebriefLabel } from '../src/index.ts';
import { FALLBACK_COLOR } from '../src/players.ts';
import { act, newScenarioGame, scriptedGame, SEA, vote } from './scenario.ts';

const NOW = new Date('2026-10-09T10:15:00.000Z');

const LABELS: DebriefLabel[] = [
  { id: 'a', label: 'Aino Ahkera', color: '#e6194b' },
  { id: 'b', label: 'Bertta Bisnes', color: '#3cb44b' },
  { id: 'd', label: 'Daniel Draama', color: '#f58231' },
  { id: 'e', label: 'Eetu Eräjärvi', color: '#4363d8' },
];

describe('buildDebrief on a scripted game', () => {
  const game = scriptedGame();
  const d = buildDebrief(game, LABELS, NOW);

  it('describes the game as a whole', () => {
    expect(d.version).toBe(1);
    expect(d.createdAt).toBe('2026-10-09T10:15:00.000Z');
    expect(d.named).toBe(true);
    expect(d.length).toBe('normal');
    expect(d.totalMonths).toBe(4);
    expect(d.monthsPlayed).toBe(3);
    expect(d.endedEarly).toBe(true);
    expect(d.happiness).toBe(game.happiness);
    expect(d.grade).toBe(game.grade());
    // d was removed during month 3, so month 3 still fed five villagers.
    expect(d.villagers).toBe(5);
    expect(d.springFoundMonth).toBeNull();
  });

  it('copies the month reports instead of sharing them with the engine', () => {
    expect(d.months).toEqual(game.reports);
    expect(d.months[0]).not.toBe(game.reports[0]);
  });

  it('counts the action groups per month, leaving out the unfinished month 4', () => {
    expect(d.actionsByMonth).toEqual([
      { food: 2, fields: 1, materials: 3, explore: 1, skills: 0, recreation: 0, unused: 5 },
      { food: 8, fields: 0, materials: 0, explore: 0, skills: 0, recreation: 0, unused: 7 },
      { food: 4, fields: 0, materials: 0, explore: 1, skills: 3, recreation: 0, unused: 5 },
    ]);
    expect(d.actionsByMonth.map((m) => m.unused)).toEqual(game.reports.map((r) => r.unusedActions));
  });

  it('gives the share of the actions used per group, including the removed player', () => {
    expect(d.actionShare).toEqual({
      food: 14 / 23,
      fields: 1 / 23,
      materials: 3 / 23,
      explore: 2 / 23,
      skills: 3 / 23,
      recreation: 0,
    });
  });

  it('finds the shelter crisis that lasted the whole game', () => {
    const most = Math.max(...game.reports.map((r) => r.shelter.unsheltered));
    expect(d.crises).toEqual([{ kind: 'no-shelter', month: 1, people: most, resolvedMonth: null }]);
  });

  it('sums up the votes', () => {
    // Possible votes 4 + 5 + 4 (e joined in month 2, d was removed in month 3); cast 3 + 5 + 2.
    expect(d.votes.participation).toBeCloseTo(10 / 13, 12);
    expect(d.votes.ties).toBe(1);
    expect(d.votes.emptyMonths).toBe(1);
    // Shelter 3 of 3 votes, school 3 of 5.
    expect(d.votes.averageWinningShare).toBeCloseTo(0.8, 12);
  });

  it('lists the players still in the game with their labels, falling back to a pseudonym', () => {
    expect(d.players).toEqual([
      {
        id: 'a',
        label: 'Aino Ahkera',
        color: '#e6194b',
        actions: { food: 4, fields: 0, materials: 3, explore: 0, skills: 3, recreation: 0 },
        unusedActions: 0,
        education: 2,
        tools: 1,
        votes: [
          { month: 1, option: 'shelter-1' },
          { month: 2, option: 'school-1' },
          { month: 3, option: 'workshop-1' },
        ],
      },
      {
        id: 'b',
        label: 'Bertta Bisnes',
        color: '#3cb44b',
        actions: { food: 3, fields: 0, materials: 0, explore: 0, skills: 0, recreation: 0 },
        unusedActions: 6,
        education: 1,
        tools: 1,
        votes: [
          { month: 1, option: 'shelter-1' },
          { month: 2, option: 'workshop-1' },
          { month: 3, option: 'gathering-1' },
        ],
      },
      {
        id: 'c',
        label: 'Pelaaja 3',
        color: FALLBACK_COLOR,
        actions: { food: 0, fields: 1, materials: 0, explore: 2, skills: 0, recreation: 0 },
        unusedActions: 6,
        education: 1,
        tools: 1,
        votes: [
          { month: 1, option: 'shelter-1' },
          { month: 2, option: 'none' },
          { month: 3, option: null },
        ],
      },
      {
        id: 'e',
        label: 'Eetu Eräjärvi',
        color: '#4363d8',
        actions: { food: 4, fields: 0, materials: 0, explore: 0, skills: 0, recreation: 0 },
        unusedActions: 2,
        education: 1,
        tools: 1,
        votes: [
          { month: 1, option: null },
          { month: 2, option: 'school-1' },
          { month: 3, option: null },
        ],
      },
    ]);
  });

  it('picks the questions the game calls for', () => {
    const ids = d.questions.map((q) => q.id);
    expect(ids).toContain('spring-never');
    // 17 unused of 40 actions.
    expect(d.questions.find((q) => q.id === 'unused-actions')).toEqual({ id: 'unused-actions', params: { percent: 43 } });
    expect(ids.at(-1)).toBe('decision-making');
  });

  it('survives a JSON round trip unchanged', () => {
    expect(JSON.parse(JSON.stringify(d))).toEqual(d);
  });

  it('uses the current time when no end time is given', () => {
    const before = Date.now();
    const at = Date.parse(buildDebrief(game, LABELS).createdAt);
    expect(at).toBeGreaterThanOrEqual(before);
    expect(at).toBeLessThanOrEqual(Date.now());
  });
});

describe('buildDebrief on a game that has not ended', () => {
  it('covers the months with a report and counts as ended early', () => {
    const game = newScenarioGame();
    game.addPlayer('a');
    game.addPlayer('b');
    game.start();
    act(game, 'a', SEA, 3);
    game.endActionPhase();
    vote(game, 'a', 'shelter-1');
    game.endVotePhase();
    game.nextMonth();
    act(game, 'b', SEA, 1);

    const d = buildDebrief(game, [], NOW);
    expect(d.monthsPlayed).toBe(1);
    expect(d.endedEarly).toBe(true);
    expect(d.actionsByMonth).toHaveLength(1);
    expect(d.players.map((p) => p.label)).toEqual(['Pelaaja 1', 'Pelaaja 2']);
    expect(d.players.map((p) => p.votes)).toEqual([[{ month: 1, option: 'shelter-1' }], [{ month: 1, option: null }]]);
    expect(d.votes.participation).toBe(0.5);
  });

  it('handles a game ended before the first month was over', () => {
    const game = newScenarioGame();
    game.addPlayer('a');
    game.start();
    act(game, 'a', SEA, 1);
    game.endEarly();

    const d = buildDebrief(game, [{ id: 'a', label: 'Aino', color: '#e6194b' }], NOW);
    expect(d.monthsPlayed).toBe(0);
    expect(d.endedEarly).toBe(true);
    expect(d.months).toEqual([]);
    expect(d.actionsByMonth).toEqual([]);
    expect(d.actionShare).toEqual({ food: 0, fields: 0, materials: 0, explore: 0, skills: 0, recreation: 0 });
    expect(d.crises).toEqual([]);
    expect(d.votes).toEqual({ participation: 0, ties: 0, emptyMonths: 0, averageWinningShare: 0 });
    expect(d.villagers).toBe(1);
    expect(d.players).toHaveLength(1);
    expect(d.players[0]?.votes).toEqual([]);
    // Nothing about the play itself; only the grade (engine-tuned) could add 'good-result'.
    expect(d.questions.filter((q) => q.id !== 'good-result')).toEqual([{ id: 'decision-making', params: {} }]);
    expect(JSON.parse(JSON.stringify(d))).toEqual(d);
  });
});

describe('pseudonymize', () => {
  const named = buildDebrief(scriptedGame(), LABELS, NOW);

  it('replaces every label with "Pelaaja N" in list order and marks the debrief as not named', () => {
    const stored = pseudonymize(named);
    expect(stored.named).toBe(false);
    expect(stored.players.map((p) => p.label)).toEqual(['Pelaaja 1', 'Pelaaja 2', 'Pelaaja 3', 'Pelaaja 4']);
  });

  it('keeps everything else as it was', () => {
    const stored = pseudonymize(named);
    const expected: DebriefData = {
      ...named,
      named: false,
      players: named.players.map((p, i) => ({ ...p, label: `Pelaaja ${i + 1}` })),
    };
    expect(stored).toEqual(expected);
  });

  it('leaves no nickname anywhere in what would be stored', () => {
    const json = JSON.stringify(pseudonymize(named));
    for (const { label } of LABELS) expect(json).not.toContain(label);
  });

  it('drops anything outside the contract, so a stray nickname field cannot reach the disk', () => {
    const tampered = structuredClone(named) as DebriefData & { nicknames?: string[] };
    tampered.nicknames = ['Aino Ahkera'];
    Object.assign(tampered.players[0]!, { nickname: 'Aino Ahkera' });
    Object.assign(tampered.players[0]!.actions, { by: 'Aino Ahkera' });
    Object.assign(tampered.players[0]!.votes[0]!, { voter: 'Aino Ahkera' });
    const json = JSON.stringify(pseudonymize(tampered));
    expect(json).not.toContain('Aino');
  });

  it('is a deep copy: the named debrief is untouched and shares nothing', () => {
    const before = structuredClone(named);
    const stored = pseudonymize(named);
    expect(named).toEqual(before);
    stored.players[0]!.actions.food = 999;
    stored.players[0]!.votes[0]!.option = 'changed';
    stored.months[0]!.food.hungry = 999;
    stored.actionsByMonth[0]!.food = 999;
    stored.crises.push({ kind: 'hunger', month: 1, people: 1, resolvedMonth: null });
    stored.questions[0]!.params['x'] = 1;
    expect(named).toEqual(before);
  });

  it('gives the same result when applied twice and survives a JSON round trip', () => {
    const once = pseudonymize(named);
    expect(pseudonymize(once)).toEqual(once);
    expect(JSON.parse(JSON.stringify(once))).toEqual(once);
  });
});
