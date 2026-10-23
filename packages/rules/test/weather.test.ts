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

  it('never changes by more than one step (5°) from one month to the next', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const months of LENGTHS) {
        const temperatures = generateTemperatures(seed, months, P);
        for (let i = 1; i < months; i++) {
          expect(Math.abs(temperatures[i]! - temperatures[i - 1]!), `seed ${seed}, ${months} months, month ${i + 1}`).toBeLessThanOrEqual(5);
        }
      }
    }
  });

  it('brings the hard frost the walk did not reach in the second half of the game, not right after the start', () => {
    // The walk alone reaches -30 in a few games only, so most hard months are added ones.
    const seeds = Array.from({ length: 200 }, (_, i) => i + 1);
    for (const months of LENGTHS) {
      const firstHalf = Math.floor(months / 2);
      const early = seeds.filter((seed) => generateTemperatures(seed, months, P).slice(0, firstHalf).some((t) => t <= -30));
      const late = seeds.filter((seed) => generateTemperatures(seed, months, P).slice(firstHalf).filter((t) => t <= -30).length >= 2);
      expect(early.length, `${months} months`).toBeLessThan(seeds.length * 0.2);
      expect(late.length, `${months} months`).toBeGreaterThan(seeds.length * 0.8);
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
