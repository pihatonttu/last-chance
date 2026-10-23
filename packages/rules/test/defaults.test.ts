import { describe, expect, it } from 'vitest';
import { createGame } from '../src/index.ts';
import { DEFAULT_PARAMS } from '../src/params.ts';

/**
 * Properties the tuned defaults must keep whatever the numbers (docs/05-tasapaino.md). The
 * formula tests use the frozen design values in ./params.ts instead.
 */
describe('tuned defaults', () => {
  const VILLAGERS = [15, 30, 40] as const;
  const SEEDS = Array.from({ length: 10 }, (_, i) => i + 1);

  it("start with wood for the first month's fire and a little more (docs/10-arktinen.md §5)", () => {
    for (const villagers of VILLAGERS) {
      for (const seed of SEEDS) {
        for (const length of ['normal', 'short'] as const) {
          const game = createGame({ seed, length });
          for (let i = 0; i < villagers; i++) game.addPlayer(`p${i}`);
          game.start();
          // A margin of at least half a wood per villager, so no building that costs wood
          // warns "Nuotiolle ei jää puuta" just because the store is exactly the need.
          const margin = Math.ceil(villagers / 2);
          expect(game.resources.wood, `N=${villagers} seed ${seed} ${length}`).toBeGreaterThanOrEqual(
            game.heatNeed() + margin,
          );
        }
      }
    }
  });

  it('let a village that does not give up still end at grade 1: the grade-2 floor lies above the loss limit', () => {
    for (const length of ['normal', 'short'] as const) {
      const [grade2, grade3] = DEFAULT_PARAMS.gradeThresholds[length];
      expect(grade2, length).toBeGreaterThan(DEFAULT_PARAMS.lossThreshold[length]);
      expect(grade2, length).toBeLessThan(grade3);
    }
  });
});
