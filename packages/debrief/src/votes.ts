import type { LogEntry, MonthReport } from '@saari/rules';

/** The vote of one month as the log tells it. */
export interface MonthVotes {
  month: number;
  /** Players who could vote: joined before the result and not removed by then, in join order. */
  eligible: string[];
  /** Each eligible voter's last vote of the month, by player id. */
  ballots: ReadonlyMap<string, string>;
}

/**
 * Replays the log for months 1..monthsPlayed. A month is closed by its 'vote-result' entry:
 * whoever had joined by then and was not removed counts as a possible voter, and their last
 * 'vote' entry of the month is their vote. A player removed during the vote phase loses the
 * vote, as in the engine.
 */
export function collectVotes(log: readonly LogEntry[], monthsPlayed: number): MonthVotes[] {
  const joined: string[] = [];
  const removed = new Set<string>();
  let ballots = new Map<string, string>();
  let ballotMonth = -1;
  const months: MonthVotes[] = [];

  for (const e of log) {
    switch (e.type) {
      case 'player-joined':
        if (!joined.includes(e.player)) joined.push(e.player);
        break;
      case 'player-removed':
        removed.add(e.player);
        break;
      case 'vote':
        if (e.month !== ballotMonth) {
          ballots = new Map();
          ballotMonth = e.month;
        }
        ballots.set(e.player, e.option);
        break;
      case 'vote-result': {
        if (e.month < 1 || e.month > monthsPlayed) break;
        const eligible = joined.filter((id) => !removed.has(id));
        const cast = new Map<string, string>();
        if (ballotMonth === e.month) {
          for (const id of eligible) {
            const option = ballots.get(id);
            if (option !== undefined) cast.set(id, option);
          }
        }
        months.push({ month: e.month, eligible, ballots: cast });
        break;
      }
      default:
        break;
    }
  }
  return months;
}

/** Votes cast and possible votes summed over the months. */
export function participation(months: readonly MonthVotes[]): { cast: number; possible: number } {
  let cast = 0;
  let possible = 0;
  for (const m of months) {
    cast += m.ballots.size;
    possible += m.eligible.length;
  }
  return { cast, possible };
}

/**
 * Ties, months that built nothing (tie, 'none' won, nobody voted) and the mean share of the
 * winning option among the votes cast, over the months that built something (0 if none did).
 */
export function voteOutcomes(reports: readonly MonthReport[]): {
  ties: number;
  emptyMonths: number;
  averageWinningShare: number;
} {
  let ties = 0;
  let emptyMonths = 0;
  let shareSum = 0;
  let builtMonths = 0;
  for (const { vote } of reports) {
    if (vote.outcome === 'tie') ties += 1;
    if (vote.outcome !== 'built') {
      emptyMonths += 1;
      continue;
    }
    const cast = Object.values(vote.counts).reduce((a, b) => a + b, 0);
    const winner = vote.option === undefined ? 0 : (vote.counts[vote.option] ?? 0);
    if (cast > 0) {
      shareSum += winner / cast;
      builtMonths += 1;
    }
  }
  return { ties, emptyMonths, averageWinningShare: builtMonths > 0 ? shareSum / builtMonths : 0 };
}

/** One entry per month 1..monthsPlayed: the option the player voted for, or null. */
export function playerBallots(
  months: readonly MonthVotes[],
  player: string,
  monthsPlayed: number,
): { month: number; option: string | null }[] {
  const byMonth = new Map(months.map((m) => [m.month, m]));
  return Array.from({ length: Math.max(0, monthsPlayed) }, (_, i) => ({
    month: i + 1,
    option: byMonth.get(i + 1)?.ballots.get(player) ?? null,
  }));
}
