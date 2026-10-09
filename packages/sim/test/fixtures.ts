import type { GameMetrics } from '../src/metrics.ts';

/** A plausible metrics record for aggregate and report tests; override what the test is about. */
export function fakeMetrics(over: Partial<GameMetrics> = {}): GameMetrics {
  return {
    seed: 1,
    happiness: 0,
    grade: 1,
    months: 3,
    villagers: 4,
    moodByMonth: [0, 0, 0],
    hungryMonths: 0,
    hungerTotal: 0,
    unshelteredMonths: 0,
    firstShelteredMonth: 1,
    spoiledTotal: 0,
    buildings: [],
    ties: 0,
    emptyMonths: 3,
    avgEducation: 1,
    avgTools: 1,
    actions: 10,
    unusedActions: 0,
    actionShare: { food: 0.5, fields: 0.1, materials: 0.2, explore: 0.1, skills: 0.05, recreation: 0.05 },
    springFoundMonth: null,
    endResources: { food: 0, wood: 0, stone: 0 },
    ...over,
  };
}
