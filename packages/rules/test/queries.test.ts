import { describe, expect, it } from 'vitest';
import { buildByVote, freeBuildingParams, setup } from './helpers.ts';

describe('village queries', () => {
  it('foodNeed() is 4 per villager this month and foodStorage() twice that', () => {
    const game = setup({ players: 5 });
    expect(game.foodNeed()).toBe(20);
    expect(game.foodStorage()).toBe(40);
  });

  it('shelterCapacity() sums ceil(N / divisor) over the shelters', () => {
    const game = setup({ players: 7, params: freeBuildingParams() });
    expect(game.shelterCapacity()).toBe(0);
    buildByVote(game, 'shelter-1'); // ceil(7/6) = 2
    expect(game.shelterCapacity()).toBe(2);
    buildByVote(game, 'shelter-2'); // ceil(7/3) = 3
    expect(game.shelterCapacity()).toBe(3);
    buildByVote(game, 'shelter-1'); // 3 + 2
    expect(game.shelterCapacity()).toBe(5);
  });

  it('the month report uses the same shelter capacity', () => {
    const game = setup({ players: 7, params: freeBuildingParams() });
    const report = buildByVote(game, 'shelter-1');
    expect(report.shelter.capacity).toBe(game.shelterCapacity());
  });
});
