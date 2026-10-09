import { describe, expect, it } from 'vitest';
import { createGame } from '../src/index.ts';
import { DEFAULT_PARAMS } from '../src/params.ts';

describe('createGame', () => {
  it('generates the island from the seed for the villagers present at start', () => {
    const game = createGame({ seed: 42, length: 'normal' });
    game.addPlayer('a');
    game.addPlayer('b');
    game.start();
    const land = game.tiles().filter((t) => t.terrain !== 'sea').length;
    expect(land).toBe(DEFAULT_PARAMS.map.landBase + DEFAULT_PARAMS.map.landPerVillager * 2);
  });

  it('builds the same island for the same seed', () => {
    const make = () => {
      const g = createGame({ seed: 7, length: 'short' });
      g.addPlayer('a');
      g.start();
      return g.tiles().map((t) => t.terrain).join(',');
    };
    expect(make()).toBe(make());
  });
});
