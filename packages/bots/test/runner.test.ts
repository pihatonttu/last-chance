import { createGame, createRng } from '@saari/rules';
import { describe, expect, it } from 'vitest';
import { playActionPhase, playGame, playVotePhase, seatsFor } from '../src/index.ts';

describe('seatsFor', () => {
  it('splits the class by weight with largest remainders and ids b1..bN', () => {
    const seats = seatsFor({ cooperative: 0.6, random: 0.25, lazy: 0.15 }, 20);
    expect(seats).toHaveLength(20);
    const count = (s: string) => seats.filter((x) => x.strategy === s).length;
    expect([count('cooperative'), count('random'), count('lazy')]).toEqual([12, 5, 3]);
    expect(seats.map((s) => s.id)).toEqual(Array.from({ length: 20 }, (_, i) => `b${i + 1}`));
  });

  it('always fills every seat, even when weights do not divide evenly', () => {
    const seats = seatsFor({ cooperative: 1, random: 1, selfish: 1 }, 2);
    expect(seats).toHaveLength(2);
  });
});

describe('playActionPhase', () => {
  it('lets random bots use every action when moves exist', () => {
    const game = createGame({ seed: 3, length: 'normal' });
    const seats = seatsFor({ random: 1 }, 5);
    for (const s of seats) game.addPlayer(s.id);
    game.start();
    playActionPhase(game, seats, createRng(1));
    expect(game.allActionsUsed()).toBe(true);
  });
});

describe('playVotePhase', () => {
  it('casts at most one vote per seat, all on offered options', () => {
    const game = createGame({ seed: 3, length: 'normal' });
    const seats = seatsFor({ random: 1 }, 5);
    for (const s of seats) game.addPlayer(s.id);
    game.start();
    game.endActionPhase();
    playVotePhase(game, seats, createRng(1));
    const total = Object.values(game.voteCounts()).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(5);
  });
});

describe('playGame', () => {
  it('plays a whole game to the end', () => {
    const game = playGame({ seed: 1, villagers: 15, length: 'normal', mix: { random: 1 } });
    expect(game.phase).toBe('ended');
    expect(game.reports).toHaveLength(15);
  });

  it('is deterministic for the same seed and mix', () => {
    const run = () => playGame({ seed: 9, villagers: 12, length: 'short', mix: { random: 1 } });
    const a = run();
    const b = run();
    expect(a.happiness).toBe(b.happiness);
    expect(a.log.length).toBe(b.log.length);
  });
});
