import { createGame, createRng, type Game, type GameLength, type GameParams, type MonthReport, type Rng } from '@saari/rules';
import type { Bot, BotOptions, Strategy } from './bot.ts';
import { cooperativeAction, cooperativeVote } from './cooperative.ts';
import { lazyBot, randomBot, selfishBot } from './simple.ts';

/** Default chance of a random move for the cooperative and lazy bots: a class is never perfect. */
export const DEFAULT_NOISE = 0.1;

export function createBot(strategy: Strategy, options: BotOptions = {}): Bot {
  const noise = options.noise ?? DEFAULT_NOISE;
  switch (strategy) {
    case 'cooperative':
      return {
        strategy,
        chooseAction: (game, id, rng) => cooperativeAction(game, id, rng, noise),
        chooseVote: (game, id, rng) => cooperativeVote(game, id, rng, noise),
      };
    case 'random':
      return randomBot;
    case 'selfish':
      return selfishBot;
    case 'lazy':
      return lazyBot(noise);
  }
}

export interface Seat {
  id: string;
  strategy: Strategy;
}

/** Share of the class per strategy; weights need not sum to 1. */
export type ClassMix = Partial<Record<Strategy, number>>;

/** Seats b1..bN split by weight with the largest-remainder method, in the mix's key order. */
export function seatsFor(mix: ClassMix, villagers: number): Seat[] {
  const entries = Object.entries(mix).filter(([, w]) => (w ?? 0) > 0) as [Strategy, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  const quotas = entries.map(([s, w]) => ({ s, exact: (w / total) * villagers }));
  const counts = quotas.map((q) => Math.floor(q.exact));
  let left = villagers - counts.reduce((a, b) => a + b, 0);
  const order = quotas
    .map((q, i) => ({ i, rest: q.exact - Math.floor(q.exact) }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    counts[i] = (counts[i] ?? 0) + 1;
    left -= 1;
  }
  const seats: Seat[] = [];
  quotas.forEach((q, i) => {
    for (let k = 0; k < (counts[i] ?? 0); k++) seats.push({ id: `b${seats.length + 1}`, strategy: q.s });
  });
  return seats;
}

function botsFor(seats: readonly Seat[], options: BotOptions): Map<Strategy, Bot> {
  const bots = new Map<Strategy, Bot>();
  for (const s of seats) if (!bots.has(s.strategy)) bots.set(s.strategy, createBot(s.strategy, options));
  return bots;
}

/** Everyone acts one action at a time in a shuffled order until nobody wants to act. */
export function playActionPhase(game: Game, seats: readonly Seat[], rng: Rng, options: BotOptions = {}): void {
  const bots = botsFor(seats, options);
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const seat of rng.shuffle(seats)) {
      const move = bots.get(seat.strategy)!.chooseAction(game, seat.id, rng);
      if (move && game.act(seat.id, move.x, move.y).ok) progressed = true;
    }
  }
}

export function playVotePhase(game: Game, seats: readonly Seat[], rng: Rng, options: BotOptions = {}): void {
  const bots = botsFor(seats, options);
  for (const seat of rng.shuffle(seats)) {
    const option = bots.get(seat.strategy)!.chooseVote(game, seat.id, rng);
    if (option !== null) game.vote(seat.id, option);
  }
}

export function playMonth(game: Game, seats: readonly Seat[], rng: Rng, options: BotOptions = {}): MonthReport {
  playActionPhase(game, seats, rng, options);
  game.endActionPhase();
  playVotePhase(game, seats, rng, options);
  const report = game.endVotePhase();
  game.nextMonth();
  return report;
}

export interface PlayOptions extends BotOptions {
  seed: number;
  villagers: number;
  length: GameLength;
  mix: ClassMix;
  params?: GameParams;
}

/** A whole game played by bots. The bots' randomness is seeded from the game seed. */
export function playGame(options: PlayOptions): Game {
  const { seed, villagers, length, mix, params, ...botOptions } = options;
  const game = createGame({ seed, length, ...(params ? { params } : {}) });
  const seats = seatsFor(mix, villagers);
  for (const s of seats) game.addPlayer(s.id);
  game.start();
  const rng = createRng(seed ^ 0x5bd1e995);
  while (game.phase !== 'ended') playMonth(game, seats, rng, botOptions);
  return game;
}
