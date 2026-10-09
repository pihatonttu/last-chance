import type { LogEntry, PlayerView } from '@saari/rules';
import { countByMonth, sumCounts } from './actions.ts';
import type { DebriefLabel, DebriefPlayer } from './types.ts';
import { playerBallots, type MonthVotes } from './votes.ts';

/** Colour of a player the server gave no label for. */
export const FALLBACK_COLOR = '#9e9e9e';

/** "Pelaaja 7" for index 7 (1-based), as in the stored debrief (P23). */
export function pseudonym(index: number): string {
  return `Pelaaja ${index}`;
}

export interface PlayersInput {
  /** Every player in join order, removed ones included (they are left out here). */
  views: readonly PlayerView[];
  labels: readonly DebriefLabel[];
  log: readonly LogEntry[];
  votes: readonly MonthVotes[];
  monthsPlayed: number;
}

/**
 * One entry per player the teacher did not remove, in join order. A player with no label
 * (or a blank one) gets "Pelaaja N" by position in the list and a grey colour.
 */
export function buildPlayers({ views, labels, log, votes, monthsPlayed }: PlayersInput): DebriefPlayer[] {
  const byId = new Map<string, DebriefLabel>();
  for (const l of labels) if (!byId.has(l.id) && l.label.trim() !== '') byId.set(l.id, l);

  return views
    .filter((v) => !v.removed)
    .map((v, i) => {
      const label = byId.get(v.id);
      const months = countByMonth(log, monthsPlayed, v.id);
      return {
        id: v.id,
        label: label?.label ?? pseudonym(i + 1),
        color: label?.color ?? FALLBACK_COLOR,
        actions: sumCounts(months),
        unusedActions: months.reduce((sum, m) => sum + m.unused, 0),
        education: v.education,
        tools: v.tools,
        votes: playerBallots(votes, v.id, monthsPlayed),
      };
    });
}
