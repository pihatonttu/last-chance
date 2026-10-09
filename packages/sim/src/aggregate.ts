import type { Resources } from '@saari/rules';
import { ACTION_GROUPS, type ActionGroup, type GameMetrics } from './metrics.ts';

export type Grade = 1 | 2 | 3 | 4 | 5 | 6;
export const GRADES: readonly Grade[] = [1, 2, 3, 4, 5, 6];

export interface Distribution {
  mean: number;
  p10: number;
  p50: number;
  p90: number;
}

/** Means over a batch of games, plus the happiness distribution and the grade histogram. */
export interface Summary {
  games: number;
  happiness: Distribution;
  grade: number;
  gradeHistogram: Record<Grade, number>;
  months: number;
  villagers: number;
  moodByMonth: number[];

  hungryMonths: number;
  hungerTotal: number;
  unshelteredMonths: number;
  /** Mean over the games that got everyone sheltered; null when none did. */
  firstShelteredMonth: number | null;
  /** Share of games that got everyone sheltered at some point. */
  shelteredRate: number;
  spoiledTotal: number;

  buildings: number;
  ties: number;
  emptyMonths: number;

  avgEducation: number;
  avgTools: number;

  actions: number;
  unusedActions: number;
  /** Mean per game of unused / (used + unused) actions. */
  unusedShare: number;
  actionShare: Record<ActionGroup, number>;

  springFoundRate: number;
  /** Mean over the games that found the spring; null when none did. */
  springFoundMonth: number | null;
  endResources: Resources;
}

/** Arithmetic mean; 0 for an empty sample. */
export function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

/** Nearest-rank percentile (p in 0..100): the value at rank ceil(p/100 * n). 0 for an empty sample. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil((p / 100) * sorted.length)));
  return sorted[rank - 1]!;
}

export function distribution(values: readonly number[]): Distribution {
  return { mean: mean(values), p10: percentile(values, 10), p50: percentile(values, 50), p90: percentile(values, 90) };
}

export function summarize(metrics: readonly GameMetrics[]): Summary {
  const avg = (pick: (m: GameMetrics) => number) => mean(metrics.map(pick));
  const meanOrNull = (values: (number | null)[]) => {
    const seen = values.filter((v) => v !== null);
    return seen.length > 0 ? mean(seen) : null;
  };
  const rate = (hits: number) => (metrics.length > 0 ? hits / metrics.length : 0);

  const gradeHistogram: Record<Grade, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const m of metrics) {
    const g = Math.min(6, Math.max(1, Math.round(m.grade))) as Grade;
    gradeHistogram[g] += 1;
  }

  const actionShare = { food: 0, fields: 0, materials: 0, explore: 0, skills: 0, recreation: 0 };
  for (const g of ACTION_GROUPS) actionShare[g] = avg((m) => m.actionShare[g]);

  const longest = Math.max(0, ...metrics.map((m) => m.moodByMonth.length));
  const moodByMonth = Array.from({ length: longest }, (_, i) =>
    mean(metrics.flatMap((m) => (i < m.moodByMonth.length ? [m.moodByMonth[i]!] : []))),
  );

  const sheltered = metrics.map((m) => m.firstShelteredMonth);
  const springs = metrics.map((m) => m.springFoundMonth);

  return {
    games: metrics.length,
    happiness: distribution(metrics.map((m) => m.happiness)),
    grade: avg((m) => m.grade),
    gradeHistogram,
    months: avg((m) => m.months),
    villagers: avg((m) => m.villagers),
    moodByMonth,

    hungryMonths: avg((m) => m.hungryMonths),
    hungerTotal: avg((m) => m.hungerTotal),
    unshelteredMonths: avg((m) => m.unshelteredMonths),
    firstShelteredMonth: meanOrNull(sheltered),
    shelteredRate: rate(sheltered.filter((v) => v !== null).length),
    spoiledTotal: avg((m) => m.spoiledTotal),

    buildings: avg((m) => m.buildings.length),
    ties: avg((m) => m.ties),
    emptyMonths: avg((m) => m.emptyMonths),

    avgEducation: avg((m) => m.avgEducation),
    avgTools: avg((m) => m.avgTools),

    actions: avg((m) => m.actions),
    unusedActions: avg((m) => m.unusedActions),
    unusedShare: avg((m) => {
      const offered = m.actions + m.unusedActions;
      return offered > 0 ? m.unusedActions / offered : 0;
    }),
    actionShare,

    springFoundRate: rate(springs.filter((v) => v !== null).length),
    springFoundMonth: meanOrNull(springs),
    endResources: {
      food: avg((m) => m.endResources.food),
      wood: avg((m) => m.endResources.wood),
      stone: avg((m) => m.endResources.stone),
    },
  };
}
