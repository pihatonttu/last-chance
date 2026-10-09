import { describe, expect, it } from 'vitest';
import { mean, percentile, summarize } from '../src/aggregate.ts';
import { fakeMetrics } from './fixtures.ts';

describe('percentile (nearest rank)', () => {
  it('picks the value at rank ceil(p * n)', () => {
    const tens = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    expect(percentile(tens, 10)).toBe(1);
    expect(percentile(tens, 50)).toBe(5);
    expect(percentile(tens, 90)).toBe(9);
    expect(percentile(tens, 100)).toBe(10);
  });

  it('rounds the rank up on small samples', () => {
    expect(percentile([3, 1, 2], 10)).toBe(1);
    expect(percentile([3, 1, 2], 50)).toBe(2);
    expect(percentile([3, 1, 2], 90)).toBe(3);
    expect(percentile([42], 10)).toBe(42);
  });

  it('does not reorder the input', () => {
    const xs = [3, 1, 2];
    percentile(xs, 50);
    expect(xs).toEqual([3, 1, 2]);
  });

  it('is 0 for an empty sample, like the mean', () => {
    expect(percentile([], 50)).toBe(0);
    expect(mean([])).toBe(0);
  });
});

describe('summarize', () => {
  const games = [
    fakeMetrics({ happiness: -20, grade: 1, moodByMonth: [-10, -5, -5], hungryMonths: 2, springFoundMonth: null, firstShelteredMonth: null }),
    fakeMetrics({ happiness: 10, grade: 3, moodByMonth: [0, 5, 5], hungryMonths: 1, springFoundMonth: 2, firstShelteredMonth: 2 }),
    fakeMetrics({ happiness: 30, grade: 3, moodByMonth: [10, 10, 10], hungryMonths: 0, springFoundMonth: 4, firstShelteredMonth: 1 }),
    fakeMetrics({
      happiness: 50,
      grade: 6,
      moodByMonth: [20, 30],
      hungryMonths: 0,
      springFoundMonth: 3,
      firstShelteredMonth: 3,
      buildings: [
        { month: 1, option: 'shelter-1' },
        { month: 2, option: 'school-1' },
      ],
      actions: 30,
      unusedActions: 10,
      endResources: { food: 4, wood: 8, stone: 12 },
      actionShare: { food: 0.1, fields: 0.1, materials: 0.2, explore: 0.2, skills: 0.2, recreation: 0.2 },
    }),
  ];
  const s = summarize(games);

  it('describes the happiness distribution', () => {
    expect(s.games).toBe(4);
    expect(s.happiness.mean).toBe(17.5);
    expect(s.happiness.p10).toBe(-20);
    expect(s.happiness.p50).toBe(10);
    expect(s.happiness.p90).toBe(50);
  });

  it('counts the grades 1..6', () => {
    expect(s.gradeHistogram).toEqual({ 1: 1, 2: 0, 3: 2, 4: 0, 5: 0, 6: 1 });
    expect(s.grade).toBe(13 / 4);
  });

  it('averages the other metrics', () => {
    expect(s.hungryMonths).toBe(0.75);
    expect(s.buildings).toBe(0.5);
    expect(s.actions).toBe(15);
    expect(s.unusedActions).toBe(2.5);
    // per game unused / (actions + unused): 0, 0, 0, 0.25
    expect(s.unusedShare).toBeCloseTo(0.0625, 12);
    expect(s.endResources).toEqual({ food: 1, wood: 2, stone: 3 });
    expect(s.actionShare.food).toBeCloseTo(0.4, 12);
    expect(s.actionShare.recreation).toBeCloseTo((0.05 * 3 + 0.2) / 4, 12);
  });

  it('averages the months that happened and reports how often they happened', () => {
    expect(s.springFoundRate).toBe(0.75);
    expect(s.springFoundMonth).toBe(3);
    expect(s.shelteredRate).toBe(0.75);
    expect(s.firstShelteredMonth).toBe(2);
  });

  it('averages the mood per month index over the games that reached it', () => {
    expect(s.moodByMonth).toHaveLength(3);
    expect(s.moodByMonth[0]).toBeCloseTo(5, 12);
    expect(s.moodByMonth[1]).toBeCloseTo(10, 12);
    expect(s.moodByMonth[2]).toBeCloseTo(10 / 3, 12);
  });

  it('uses null for months that never happened', () => {
    const none = summarize([fakeMetrics({ springFoundMonth: null, firstShelteredMonth: null })]);
    expect(none.springFoundMonth).toBeNull();
    expect(none.firstShelteredMonth).toBeNull();
    expect(none.springFoundRate).toBe(0);
  });

  it('handles an empty run', () => {
    const empty = summarize([]);
    expect(empty.games).toBe(0);
    expect(empty.happiness).toEqual({ mean: 0, p10: 0, p50: 0, p90: 0 });
    expect(empty.moodByMonth).toEqual([]);
  });
});
