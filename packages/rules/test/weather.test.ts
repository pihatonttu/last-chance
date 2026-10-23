import { describe, expect, it } from 'vitest';
import { generateTemperatures, woodPerVillager } from '../src/weather.ts';
import { RULE_TEST_PARAMS as P } from './params.ts';

const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);
const LENGTHS = [10, 15] as const;

describe('generateTemperatures (docs/10-arktinen.md §4)', () => {
  it('gives one temperature per month in 5° steps between -10 and -35', () => {
    for (const seed of SEEDS) {
      for (const months of LENGTHS) {
        const temperatures = generateTemperatures(seed, months, P);
        expect(temperatures).toHaveLength(months);
        for (const t of temperatures) expect([-10, -15, -20, -25, -30, -35]).toContain(t);
      }
    }
  });

  it('starts mild: month 1 is -10 or -15', () => {
    for (const seed of SEEDS) {
      for (const months of LENGTHS) expect([-10, -15]).toContain(generateTemperatures(seed, months, P)[0]);
    }
  });

  it('has at least two hard months (-30 or colder) in a 10- and a 15-month game', () => {
    for (const seed of SEEDS) {
      for (const months of LENGTHS) {
        const hard = generateTemperatures(seed, months, P).filter((t) => t <= -30);
        expect(hard.length, `seed ${seed}, ${months} months`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('is the same for the same seed and differs between seeds', () => {
    expect(generateTemperatures(7, 15, P)).toEqual(generateTemperatures(7, 15, P));
    const winters = new Set(SEEDS.map((seed) => generateTemperatures(seed, 15, P).join(',')));
    expect(winters.size).toBeGreaterThanOrEqual(45);
  });
});

describe('woodPerVillager', () => {
  it('burns 1 wood per villager down to -15, 2 down to -25 and 3 from -30', () => {
    expect([-10, -15, -20, -25, -30, -35].map((t) => woodPerVillager(t, P))).toEqual([1, 1, 2, 2, 3, 3]);
  });
});
