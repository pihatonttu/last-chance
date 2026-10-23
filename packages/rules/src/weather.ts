import type { GameParams } from './params.ts';
import { createRng } from './rng.ts';

/**
 * The frost of every month (docs/10-arktinen.md §4), index 0 = month 1. A random walk of at
 * most one step (5°) a month between `mildest` and `coldest`; month 1 is no colder than
 * `firstMonthColdest`. A game of 3 months or more gets at least `minHardMonths` hard-frost
 * months: when the walk leaves too few, the coldest month from month 3 on (the earliest on a
 * tie) turns to `coldest`, then the next coldest, until there are enough.
 */
export function generateTemperatures(seed: number, months: number, params: Pick<GameParams, 'weather'>): number[] {
  const W = params.weather;
  const rng = createRng(seed ^ 0x7e57);
  // Steps below the mildest temperature: 0 = mildest, top = coldest.
  const top = Math.round((W.mildest - W.coldest) / W.step);
  const firstTop = Math.min(top, Math.round((W.mildest - W.firstMonthColdest) / W.step));
  const temperatures: number[] = [];
  let level = rng.int(0, firstTop);
  for (let m = 0; m < months; m++) {
    if (m > 0) level = Math.min(top, Math.max(0, level + rng.int(-1, 1)));
    temperatures.push(W.mildest - level * W.step);
  }

  if (months >= 3) {
    let hard = temperatures.filter((t) => t <= W.hardAt).length;
    while (hard < W.minHardMonths) {
      let coldest = -1;
      for (let i = 2; i < months; i++) {
        const t = temperatures[i]!;
        if (t > W.hardAt && (coldest < 0 || t < temperatures[coldest]!)) coldest = i;
      }
      if (coldest < 0) break;
      temperatures[coldest] = W.coldest;
      hard += 1;
    }
  }
  return temperatures;
}

/** Wood the fire burns per villager at this temperature: mild, cold or hard frost. */
export function woodPerVillager(temperature: number, params: Pick<GameParams, 'weather' | 'heatWoodPerVillager'>): number {
  const [mild, cold, hard] = params.heatWoodPerVillager;
  if (temperature <= params.weather.hardAt) return hard;
  if (temperature <= params.weather.coldAt) return cold;
  return mild;
}
