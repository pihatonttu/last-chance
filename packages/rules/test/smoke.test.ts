import { describe, expect, it } from 'vitest';
import { createGame, createRng, type Game, type Rng } from '../src/index.ts';

/** One player's random but legal month: up to maxActions actions on random usable tiles. */
function randomActions(game: Game, rng: Rng, player: string): void {
  for (let tries = 0; tries < 40 && (game.player(player)?.actionsLeft ?? 0) > 0; tries++) {
    const candidates = game.tiles().filter((t) => game.preview(player, t.x, t.y).available);
    if (candidates.length === 0) return;
    const t = rng.pick(candidates);
    const res = game.act(player, t.x, t.y);
    expect(res.ok).toBe(true);
  }
}

function playRandomGame(seed: number, villagers: number, length: 'normal' | 'short' = 'normal') {
  const rng = createRng(seed * 1000 + villagers);
  const game = createGame({ seed, length });
  for (let i = 0; i < villagers; i++) game.addPlayer(`p${i}`);
  game.start();
  let moodSum = 0;
  while (game.phase !== 'ended') {
    for (const id of game.playerIds()) randomActions(game, rng, id);
    game.endActionPhase();
    const open = game.voteOptions().filter((o) => o.blocked.length === 0);
    for (const id of game.playerIds()) {
      if (rng.next() < 0.9) expect(game.vote(id, rng.pick(open).id)).toEqual({ ok: true });
    }
    const report = game.endVotePhase();
    moodSum += report.mood.total;
    const r = game.resources;
    expect(r.food).toBeGreaterThanOrEqual(0);
    expect(r.wood).toBeGreaterThanOrEqual(0);
    expect(r.stone).toBeGreaterThanOrEqual(0);
    expect(r.food).toBeLessThanOrEqual(2 * 4 * game.villagers);
    expect(report.happiness).toBe(moodSum);
    game.nextMonth();
  }
  return game;
}

describe('random full games on generated islands', () => {
  for (const villagers of [2, 15, 30]) {
    it(`${villagers} villagers play to the end without breaking invariants`, () => {
      for (const seed of [1, 2, 3]) {
        const game = playRandomGame(seed, villagers);
        expect(game.reports).toHaveLength(15);
        expect(game.grade()).toBeGreaterThanOrEqual(1);
        expect(game.grade()).toBeLessThanOrEqual(6);
        const seqs = game.log.map((e) => e.seq);
        expect(seqs.every((s, i) => s === i + 1)).toBe(true);
      }
    });
  }

  it('a short game ends after 10 months', () => {
    expect(playRandomGame(4, 10, 'short').reports).toHaveLength(10);
  });
});
