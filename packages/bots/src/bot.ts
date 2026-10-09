import type { ActionKind, ActionPreview, Coord, Game, Rng, VoteOption } from '@saari/rules';

export type Strategy = 'cooperative' | 'random' | 'selfish' | 'lazy';

export interface BotOptions {
  /** Chance of a random action or vote instead of the planned one (cooperative, lazy). */
  noise?: number;
  /** Build order for the cooperative and lazy bots; see DEFAULT_BUILD_ORDER. */
  buildOrder?: readonly string[];
}

/** A simulated player. Picks one action at a time so the runner can interleave the class. */
export interface Bot {
  readonly strategy: Strategy;
  /** Next tile to act on, or null when the bot is done for this action phase. */
  chooseAction(game: Game, playerId: string, rng: Rng): Coord | null;
  /** Option id to vote for, or null to abstain. */
  chooseVote(game: Game, playerId: string, rng: Rng): string | null;
}

export interface Move {
  x: number;
  y: number;
  preview: ActionPreview;
}

export function hasActionsLeft(game: Game, playerId: string): boolean {
  return (game.player(playerId)?.actionsLeft ?? 0) > 0;
}

/** Every tile the player could act on right now, with the preview of that action. */
export function availableMoves(game: Game, playerId: string): Move[] {
  const moves: Move[] = [];
  for (const t of game.tiles()) {
    const preview = game.preview(playerId, t.x, t.y);
    if (preview.available) moves.push({ x: t.x, y: t.y, preview });
  }
  return moves;
}

export function movesOfKind(moves: readonly Move[], ...kinds: ActionKind[]): Move[] {
  return moves.filter((m) => m.preview.kind !== null && kinds.includes(m.preview.kind));
}

/** Vote options nobody is blocked from choosing. */
export function openOptions(game: Game): VoteOption[] {
  return game.voteOptions().filter((o) => o.blocked.length === 0);
}

export function toCoord(move: Move | undefined): Coord | null {
  return move ? { x: move.x, y: move.y } : null;
}
