import type { Coord, Game, Rng } from '@saari/rules';
import { availableMoves, hasActionsLeft, movesOfKind, openOptions, toCoord, type Bot } from './bot.ts';
import { cooperativeAction, cooperativeVote } from './cooperative.ts';

/** Any legal action, any open vote (abstains one time in ten). */
export const randomBot: Bot = {
  strategy: 'random',
  chooseAction: randomAction,
  chooseVote(game, _playerId, rng) {
    return rng.next() < 0.9 ? rng.pick(openOptions(game)).id : null;
  },
};

export function randomAction(game: Game, playerId: string, rng: Rng): Coord | null {
  if (!hasActionsLeft(game, playerId)) return null;
  const moves = availableMoves(game, playerId);
  return moves.length > 0 ? toCoord(rng.pick(moves)) : null;
}

/** Studies and makes tools whenever it can; votes for its own development. */
export const selfishBot: Bot = {
  strategy: 'selfish',
  chooseAction(game, playerId, rng) {
    if (!hasActionsLeft(game, playerId)) return null;
    const moves = availableMoves(game, playerId);
    const own = movesOfKind(moves, 'study', 'make-tools');
    if (own.length > 0) return toCoord(rng.pick(own));
    return moves.length > 0 ? toCoord(rng.pick(moves)) : null;
  },
  chooseVote(game, _playerId, rng) {
    const open = openOptions(game);
    const own = open.filter((o) => o.kind === 'school' || o.kind === 'workshop');
    return rng.pick(own.length > 0 ? own : open).id;
  },
};

/** Does one sensible action a month and votes half of the time. */
export function lazyBot(noise: number): Bot {
  return {
    strategy: 'lazy',
    chooseAction(game, playerId, rng) {
      const p = game.player(playerId);
      if (!p || p.actionsLeft < p.maxActions) return null;
      return cooperativeAction(game, playerId, rng, noise);
    },
    chooseVote(game, playerId, rng) {
      return rng.next() < 0.5 ? cooperativeVote(game, playerId, rng, noise) : null;
    },
  };
}
