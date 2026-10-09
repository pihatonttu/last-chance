import type { Game, LogEntry } from '@saari/rules';
import { copyCounts, countByMonth, shareOf, sumCounts } from './actions.ts';
import { findCrises } from './crises.ts';
import { buildPlayers, pseudonym } from './players.ts';
import { pickQuestions } from './questions.ts';
import type { DebriefData, DebriefLabel } from './types.ts';
import { collectVotes, participation, voteOutcomes } from './votes.ts';

export * from './types.ts';
export { ACTION_GROUPS, groupOf } from './actions.ts';
export { QUESTION_IDS, THRESHOLDS } from './questions.ts';

/** First month a spring was found, within the months played. */
function springFoundMonth(log: readonly LogEntry[], monthsPlayed: number): number | null {
  const found = log.find((e) => e.type === 'spring-found' && e.month >= 1 && e.month <= monthsPlayed);
  return found ? found.month : null;
}

/** true when the teacher ended the game, or when it has not ended at all yet. */
function endedEarly(log: readonly LogEntry[]): boolean {
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]!;
    if (e.type === 'game-ended') return e.early;
  }
  return true;
}

/**
 * Builds the debrief of a finished (or early-ended) game from its reports and log.
 * `labels` maps player ids to the label and colour shown; players missing from it
 * get a pseudonym. `now` is the time of the game end (stored as createdAt).
 *
 * The debrief covers the months that have a report (monthsPlayed = reports.length): the
 * actions, unused actions, votes and spring of an unfinished month at an early end are
 * left out, so every per-month list lines up with `months`. Village totals (actionsByMonth,
 * actionShare, votes) include players the teacher removed, since their actions shaped the
 * village; the player list leaves them out.
 */
export function buildDebrief(game: Game, labels: readonly DebriefLabel[], now: Date = new Date()): DebriefData {
  const reports = game.reports;
  const log = game.log;
  const monthsPlayed = reports.length;

  const actionsByMonth = countByMonth(log, monthsPlayed);
  const actions = sumCounts(actionsByMonth);
  const unused = actionsByMonth.reduce((sum, m) => sum + m.unused, 0);
  const crises = findCrises(reports);
  const voteMonths = collectVotes(log, monthsPlayed);
  const { cast, possible } = participation(voteMonths);
  const outcomes = voteOutcomes(reports);
  const spring = springFoundMonth(log, monthsPlayed);
  const grade = game.grade();
  const views = game.playerIds().flatMap((id) => game.player(id) ?? []);

  return {
    version: 1,
    createdAt: now.toISOString(),
    named: true,
    length: game.length,
    totalMonths: game.totalMonths,
    monthsPlayed,
    endedEarly: endedEarly(log),
    happiness: game.happiness,
    grade,
    villagers: reports.at(-1)?.villagers ?? game.villagers,
    months: reports.map((r) => structuredClone(r)),
    actionsByMonth,
    actionShare: shareOf(actions),
    crises,
    votes: { participation: possible > 0 ? cast / possible : 0, ...outcomes },
    springFoundMonth: spring,
    players: buildPlayers({ views, labels, log, votes: voteMonths, monthsPlayed }),
    questions: pickQuestions({
      totalMonths: game.totalMonths,
      monthsPlayed,
      grade,
      crises,
      unshelteredMonths: reports.filter((r) => r.shelter.unsheltered > 0).length,
      ties: outcomes.ties,
      emptyMonths: outcomes.emptyMonths,
      votesCast: cast,
      votesPossible: possible,
      actions,
      unused,
      springFoundMonth: spring,
    }),
  };
}

/**
 * Same debrief with every label replaced by a pseudonym ("Pelaaja 1"... in list order),
 * named = false: the only version that may be stored (P23). Rebuilt field by field from the
 * DebriefData contract rather than cloned, so nothing outside the contract (a stray nickname
 * property, say) can reach the disk. The month reports are engine data without player
 * references and are deep-copied as they are.
 */
export function pseudonymize(d: DebriefData): DebriefData {
  return {
    version: d.version,
    createdAt: d.createdAt,
    named: false,
    length: d.length,
    totalMonths: d.totalMonths,
    monthsPlayed: d.monthsPlayed,
    endedEarly: d.endedEarly,
    happiness: d.happiness,
    grade: d.grade,
    villagers: d.villagers,
    months: d.months.map((m) => structuredClone(m)),
    actionsByMonth: d.actionsByMonth.map((m) => ({ ...copyCounts(m), unused: m.unused })),
    actionShare: copyCounts(d.actionShare),
    crises: d.crises.map((c) => ({ kind: c.kind, month: c.month, people: c.people, resolvedMonth: c.resolvedMonth })),
    votes: {
      participation: d.votes.participation,
      ties: d.votes.ties,
      emptyMonths: d.votes.emptyMonths,
      averageWinningShare: d.votes.averageWinningShare,
    },
    springFoundMonth: d.springFoundMonth,
    players: d.players.map((p, i) => ({
      id: p.id,
      label: pseudonym(i + 1),
      color: p.color,
      actions: copyCounts(p.actions),
      unusedActions: p.unusedActions,
      education: p.education,
      tools: p.tools,
      votes: p.votes.map((v) => ({ month: v.month, option: v.option })),
    })),
    questions: d.questions.map((q) => ({ id: q.id, params: { ...q.params } })),
  };
}
