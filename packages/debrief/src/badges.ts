import type { ActionKind, LogEntry } from '@saari/rules';
import { collectVotes } from './votes.ts';

/** A player's own end-of-game badges (docs/09-uudisasukkaat.md §2.3). */
export type BadgeId =
  | 'explorer'
  | 'fisher'
  | 'lumberjack'
  | 'farmer'
  | 'stonecutter'
  | 'learner'
  | 'smith'
  | 'cheerer'
  | 'voter'
  | 'settler';

type WorkBadge = Exclude<BadgeId, 'voter' | 'settler'>;

/** Display order; ties between work badges go to the earlier one. */
export const BADGE_IDS: readonly BadgeId[] = [
  'explorer',
  'fisher',
  'lumberjack',
  'farmer',
  'stonecutter',
  'learner',
  'smith',
  'cheerer',
  'voter',
  'settler',
];

/** A Record over every ActionKind, so a new kind in the engine fails to compile until it has a badge. */
const BADGE_OF: Readonly<Record<ActionKind, WorkBadge>> = {
  explore: 'explorer',
  fish: 'fisher',
  chop: 'lumberjack',
  plow: 'farmer',
  harvest: 'farmer',
  'build-quarry': 'stonecutter',
  mine: 'stonecutter',
  study: 'learner',
  'make-tools': 'smith',
  swim: 'cheerer',
  gather: 'cheerer',
};

export const BADGE_RULES = {
  /** At most this many badges for kinds of work. */
  maxWorkBadges: 2,
  /** A work badge needs at least this many actions... */
  minActions: 3,
  /** ...and this share of the player's own actions. */
  minShare: 0.2,
  /** "voter" needs at least this many village meetings since joining. */
  minMeetings: 3,
} as const;

/**
 * The player's badges: their most used kinds of work, "voter" when they voted in every
 * village meeting since joining, and "settler" when nothing else fits, so everyone gets
 * one. Months without a report (an early end) are left out, as in the debrief. Only the
 * player sees these; they are never stored, compared or shown on the projector.
 */
export function badgesFor(log: readonly LogEntry[], playerId: string, monthsPlayed: number): BadgeId[] {
  const counts = new Map<WorkBadge, number>();
  let total = 0;
  for (const e of log) {
    if (e.type !== 'action' || e.player !== playerId || e.month < 1 || e.month > monthsPlayed) continue;
    const badge = BADGE_OF[e.kind];
    counts.set(badge, (counts.get(badge) ?? 0) + 1);
    total += 1;
  }
  const order = (b: BadgeId) => BADGE_IDS.indexOf(b);
  const earned: BadgeId[] = [...counts.entries()]
    .filter(([, n]) => n >= BADGE_RULES.minActions && n >= BADGE_RULES.minShare * total)
    .sort(([a, na], [b, nb]) => nb - na || order(a) - order(b))
    .slice(0, BADGE_RULES.maxWorkBadges)
    .map(([badge]) => badge);
  const meetings = collectVotes(log, monthsPlayed).filter((m) => m.eligible.includes(playerId));
  if (meetings.length >= BADGE_RULES.minMeetings && meetings.every((m) => m.ballots.has(playerId))) earned.push('voter');
  return earned.length > 0 ? earned : ['settler'];
}
