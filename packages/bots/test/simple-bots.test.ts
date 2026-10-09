import { createRng, Game, type TerrainMap } from '@saari/rules';
import { describe, expect, it } from 'vitest';
import { createBot } from '../src/index.ts';

/** Landing (3,5) with sea, meadow and forest around it. */
const TERRAIN: TerrainMap = (() => {
  const rows = ['~~~~~~~', '~^To^T~', '~TT.TT~', '~..T..~', '~T.T.T~', '~~...~~', '~~~~~~~'];
  const legend = { '~': 'sea', '.': 'meadow', T: 'forest', '^': 'rock', o: 'spring' } as const;
  const terrain = rows.flatMap((r) => [...r].map((c) => legend[c as keyof typeof legend]));
  return { width: 7, height: 7, terrain, landing: { x: 3, y: 5 } };
})();

function newGame(players: string[]) {
  const game = new Game({ seed: 1, length: 'normal', terrain: TERRAIN });
  for (const p of players) game.addPlayer(p);
  game.start();
  return game;
}

describe('random bot', () => {
  it('chooses tiles where the action is available', () => {
    const game = newGame(['a']);
    const bot = createBot('random');
    const rng = createRng(2);
    for (let i = 0; i < 3; i++) {
      const move = bot.chooseAction(game, 'a', rng);
      expect(move).not.toBeNull();
      expect(game.preview('a', move!.x, move!.y).available).toBe(true);
      game.act('a', move!.x, move!.y);
    }
    expect(bot.chooseAction(game, 'a', rng)).toBeNull();
  });

  it('votes for an offered, unblocked option or abstains', () => {
    const game = newGame(['a']);
    game.endActionPhase();
    const bot = createBot('random');
    const ids = game.voteOptions().filter((o) => o.blocked.length === 0).map((o) => o.id);
    const rng = createRng(4);
    for (let i = 0; i < 20; i++) {
      const vote = bot.chooseVote(game, 'a', rng);
      if (vote !== null) expect(ids).toContain(vote);
    }
  });
});

describe('lazy bot', () => {
  it('uses at most one action a month', () => {
    const game = newGame(['a']);
    const bot = createBot('lazy');
    const rng = createRng(1);
    const move = bot.chooseAction(game, 'a', rng);
    expect(move).not.toBeNull();
    game.act('a', move!.x, move!.y);
    expect(bot.chooseAction(game, 'a', rng)).toBeNull();
  });
});
