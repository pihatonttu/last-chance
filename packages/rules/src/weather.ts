import type { GameParams } from './params.ts';
import { createRng } from './rng.ts';

/**
 * The frost of every month (docs/10-arktinen.md §4), index 0 = month 1. A random walk of at
 * most one step (5°) a month between `mildest` and `coldest`; month 1 is no colder than
 * `firstMonthColdest`. A game of 3 months or more gets at least `minHardMonths` hard-frost
 * months. The walk alone reaches them in a few games only, so the missing ones come as a cold
 * spell in the second half of the game (never before month 3): one of the coldest months
 * there, drawn from the seed, turns to `hardAt`, and the months around it cool down so the
 * frost still changes at most one step a month (month 1 stays mild). Then the next, until
 * there are enough; the second one usually lands next to the first.
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
    // Index of the first month of the second half, month 3 at the earliest.
    const from = Math.max(2, Math.floor(months / 2));
    let hard = temperatures.filter((t) => t <= W.hardAt).length;
    while (hard < W.minHardMonths) {
      const candidates: number[] = [];
      for (let i = from; i < months; i++) if (temperatures[i]! > W.hardAt) candidates.push(i);
      if (candidates.length === 0) break;
      const coldest = Math.min(...candidates.map((i) => temperatures[i]!));
      const month = rng.pick(candidates.filter((i) => temperatures[i] === coldest));
      temperatures[month] = W.hardAt;
      // The cold spreads: d months away it is at most d steps milder (month 1 stays as drawn).
      for (let i = 1; i < months; i++) {
        temperatures[i] = Math.min(temperatures[i]!, W.hardAt + Math.abs(i - month) * W.step);
      }
      hard = temperatures.filter((t) => t <= W.hardAt).length;
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
