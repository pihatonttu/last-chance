import { playGame } from '@saari/bots';
import { DEFAULT_PARAMS } from '@saari/rules';
import { describe, expect, it } from 'vitest';
import { measureGame } from '../src/metrics.ts';
import { mergeParams } from '../src/params-file.ts';
import { simulate } from '../src/simulate.ts';

describe('simulate', () => {
  it('plays one game per seed and measures it', () => {
    const metrics = simulate({ mix: { cooperative: 1 }, villagers: 3, length: 'short', seeds: [1, 2] });
    expect(metrics.map((m) => m.seed)).toEqual([1, 2]);
    expect(metrics[0]).toEqual(measureGame(playGame({ seed: 1, villagers: 3, length: 'short', mix: { cooperative: 1 } })));
  });

  it('passes params and noise to the games', () => {
    const params = mergeParams(DEFAULT_PARAMS, { months: { short: 4 } });
    const [m] = simulate({ mix: { lazy: 1 }, villagers: 2, length: 'short', seeds: [5], params, noise: 0 });
    expect(m!.months).toBe(4);
    expect(m).toEqual(measureGame(playGame({ seed: 5, villagers: 2, length: 'short', mix: { lazy: 1 }, params, noise: 0 })));
  });
});
