import { describe, expect, it } from 'vitest';
import { summarize } from '../src/aggregate.ts';
import { markdownReport } from '../src/report.ts';
import { fakeMetrics } from './fixtures.ts';

describe('markdownReport', () => {
  const coop = summarize([
    fakeMetrics({ happiness: 40, grade: 4, months: 15, moodByMonth: Array.from({ length: 15 }, () => 2), springFoundMonth: 3 }),
    fakeMetrics({ happiness: 60, grade: 5, months: 15, moodByMonth: Array.from({ length: 15 }, () => 4), springFoundMonth: null }),
  ]);
  const lazy = summarize([
    fakeMetrics({
      happiness: -30,
      grade: 1,
      firstShelteredMonth: null,
      unusedActions: 10,
      actions: 30,
      endResources: { food: 0, wood: 12, stone: 3 },
      actionShare: { food: 0.32, fields: 0.08, materials: 0.21, explore: 0.09, skills: 0.2, recreation: 0.1 },
    }),
  ]);
  const text = markdownReport([
    { label: 'cooperative N=15', summary: coop },
    { label: 'lazy N=2 short', summary: lazy },
  ]);
  const lines = text.split('\n');

  it('starts with a header and a separator', () => {
    expect(lines[0]).toMatch(/^\| scenario \| games \| happiness p10\/p50\/p90 \| grades \|/);
    expect(lines[0]).toContain('food/fields/materials/explore/skills/recreation %');
    expect(lines[1]).toMatch(/^\|( ?-+:? ?\|)+$/);
  });

  it('writes one row per scenario', () => {
    const rows = lines.filter((l) => l.startsWith('| cooperative N=15 |') || l.startsWith('| lazy N=2 short |'));
    // one in the main table and one in the mood table per scenario
    expect(rows).toHaveLength(4);
    const coopRow = lines.find((l) => l.startsWith('| cooperative N=15 | 2 |'))!;
    expect(coopRow).toContain('| 40/40/60 |');
    expect(coopRow).toContain('| 1:0 2:0 3:0 4:1 5:1 6:0 |');
    expect(coopRow).toContain('| 50% |');
  });

  it('formats shares, unused, never-sheltered and end materials', () => {
    const lazyRow = lines.find((l) => l.startsWith('| lazy N=2 short | 1 |'))!;
    expect(lazyRow).toContain('| 32/8/21/9/20/10 |');
    expect(lazyRow).toContain('| 25% |');
    expect(lazyRow).toContain('| – |');
    expect(lazyRow).toContain('| 12 / 3 |');
  });

  it('adds a mood-per-month table as wide as the longest game', () => {
    const header = lines.find((l) => l.startsWith('| scenario | m1 |'))!;
    expect(header).toContain('| m15 |');
    expect(header).not.toContain('m16');
    const lazyMood = lines.filter((l) => l.startsWith('| lazy N=2 short |'))[1]!;
    // three months of data, the rest of the 15 columns empty
    expect(lazyMood.split('|').filter((c) => c.trim() === '–')).toHaveLength(12);
  });
});
