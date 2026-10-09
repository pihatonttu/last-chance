import { describe, expect, it } from 'vitest';
import { buildByVote, freeBuildingParams, setup } from './helpers.ts';

describe('village queries', () => {
  it('foodNeed() is 4 per villager this month and foodStorage() twice that', () => {
    const game = setup({ players: 5 });
    expect(game.foodNeed()).toBe(20);
    expect(game.foodStorage()).toBe(40);
  });

  it('shelterShare() sums 1 / divisor over the shelters', () => {
    const game = setup({ players: 7, params: freeBuildingParams() });
    expect(game.shelterShare()).toBe(0);
    buildByVote(game, 'shelter-1');
    expect(game.shelterShare()).toBeCloseTo(1 / 6);
    buildByVote(game, 'shelter-2');
    expect(game.shelterShare()).toBeCloseTo(1 / 3);
    buildByVote(game, 'shelter-1');
    expect(game.shelterShare()).toBeCloseTo(1 / 2);
  });

  it('shelterCapacity() is the whole-person count: N minus round(N x uncovered share)', () => {
    const game = setup({ players: 7, params: freeBuildingParams() });
    expect(game.shelterCapacity()).toBe(0);
    buildByVote(game, 'shelter-1'); // 7 - round(7 x 5/6 = 5.83) = 1
    expect(game.shelterCapacity()).toBe(1);
    buildByVote(game, 'shelter-2'); // 7 - round(4.67) = 2
    expect(game.shelterCapacity()).toBe(2);
    buildByVote(game, 'shelter-1'); // 7 - round(3.5) = 3
    expect(game.shelterCapacity()).toBe(3);
  });

  it('anyone left without shelter counts as at least one person', () => {
    // 1 villager, share 1/2: round(0.5) = 1 unsheltered, never 0 while share < 1.
    const game = setup({ players: 1, params: freeBuildingParams() });
    buildByVote(game, 'shelter-1');
    buildByVote(game, 'shelter-2');
    const report = buildByVote(game, 'shelter-3');
    expect(report.shelter).toMatchObject({ capacity: 0, unsheltered: 1 });
  });

  it('the month report uses the same shelter capacity', () => {
    const game = setup({ players: 7, params: freeBuildingParams() });
    const report = buildByVote(game, 'shelter-1');
    expect(report.shelter.capacity).toBe(game.shelterCapacity());
  });
});
