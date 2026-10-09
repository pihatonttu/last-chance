import { playGame, type ClassMix } from '@saari/bots';
import type { GameLength, GameParams } from '@saari/rules';
import { measureGame, type GameMetrics } from './metrics.ts';

export interface SimulateConfig {
  mix: ClassMix;
  villagers: number;
  length: GameLength;
  seeds: readonly number[];
  params?: GameParams;
  /** Bot noise; the bots' default when left out. */
  noise?: number;
}

/** One bot game per seed, measured. */
export function simulate(config: SimulateConfig): GameMetrics[] {
  const { mix, villagers, length, seeds, params, noise } = config;
  return seeds.map((seed) =>
    measureGame(
      playGame({
        seed,
        villagers,
        length,
        mix,
        ...(params ? { params } : {}),
        ...(noise !== undefined ? { noise } : {}),
      }),
    ),
  );
}
