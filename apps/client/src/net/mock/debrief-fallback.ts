/**
 * A simple DebriefData builder for the in-browser mock server, used only while
 * @saari/debrief's buildDebrief is still a stub (it throws). The real server uses the
 * package. Good enough to demo the debrief view; not the reference implementation.
 */
import type {
  ActionGroup,
  DebriefCrisis,
  DebriefData,
  DebriefLabel,
  DebriefPlayer,
  DebriefQuestion,
  GroupCounts,
} from '@saari/debrief';
import type { ActionKind, Game } from '@saari/rules';

const GROUP_OF: Record<ActionKind, ActionGroup> = {
  explore: 'explore',
  plow: 'fields',
  harvest: 'food',
  fish: 'food',
  chop: 'materials',
  'build-quarry': 'materials',
  mine: 'materials',
  swim: 'recreation',
  gather: 'recreation',
  study: 'skills',
  'make-tools': 'skills',
};

function emptyCounts(): GroupCounts {
  return { food: 0, fields: 0, materials: 0, explore: 0, skills: 0, recreation: 0 };
}

function total(counts: GroupCounts): number {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

function crises(game: Game): DebriefCrisis[] {
  const result: DebriefCrisis[] = [];
  const reports = game.reports;
  const track = (kind: DebriefCrisis['kind'], affected: (i: number) => number) => {
    let open: DebriefCrisis | null = null;
    reports.forEach((report, i) => {
      const people = affected(i);
      if (people > 0) {
        if (!open) {
          open = { kind, month: report.month, people, resolvedMonth: null };
          result.push(open);
        } else open.people = Math.max(open.people, people);
      } else if (open) {
        open.resolvedMonth = report.month;
        open = null;
      }
    });
  };
  track('hunger', (i) => reports[i]!.food.hungry);
  track('no-shelter', (i) => reports[i]!.shelter.unsheltered);
  return result.sort((a, b) => a.month - b.month);
}

export function fallbackDebrief(game: Game, labels: readonly DebriefLabel[], now: Date = new Date()): DebriefData {
  const reports = [...game.reports];
  const monthsPlayed = reports.length;
  const actionsByMonth = reports.map(() => ({ ...emptyCounts(), unused: 0 }));
  const perPlayer = new Map<string, GroupCounts>();
  const unusedPerPlayer = new Map<string, number>();
  const votesByMonth = new Map<string, Map<number, string>>();
  let springFoundMonth: number | null = null;

  for (const entry of game.log) {
    const monthIndex = entry.month - 1;
    if (entry.type === 'action') {
      const group = GROUP_OF[entry.kind];
      const row = actionsByMonth[monthIndex];
      if (row) row[group] += 1;
      const counts = perPlayer.get(entry.player) ?? emptyCounts();
      counts[group] += 1;
      perPlayer.set(entry.player, counts);
    } else if (entry.type === 'actions-unused') {
      const row = actionsByMonth[monthIndex];
      if (row) row.unused += entry.count;
      unusedPerPlayer.set(entry.player, (unusedPerPlayer.get(entry.player) ?? 0) + entry.count);
    } else if (entry.type === 'vote') {
      const months = votesByMonth.get(entry.player) ?? new Map<number, string>();
      months.set(entry.month, entry.option);
      votesByMonth.set(entry.player, months);
    } else if (entry.type === 'spring-found' && springFoundMonth === null) {
      springFoundMonth = entry.month;
    }
  }

  const actionCounts = emptyCounts();
  for (const row of actionsByMonth) {
    for (const key of Object.keys(actionCounts) as ActionGroup[]) actionCounts[key] += row[key];
  }
  // Like @saari/debrief: shares (0..1) of the used actions.
  const usedTotal = total(actionCounts);
  const actionShare = emptyCounts();
  for (const key of Object.keys(actionShare) as ActionGroup[]) {
    actionShare[key] = usedTotal > 0 ? actionCounts[key] / usedTotal : 0;
  }

  const labelOf = new Map(labels.map((l) => [l.id, l]));
  const players: DebriefPlayer[] = game.playerIds().map((id, i) => {
    const view = game.player(id);
    const label = labelOf.get(id);
    return {
      id,
      label: label?.label ?? `Pelaaja ${i + 1}`,
      color: label?.color ?? '#888888',
      actions: perPlayer.get(id) ?? emptyCounts(),
      unusedActions: unusedPerPlayer.get(id) ?? 0,
      education: view?.education ?? 1,
      tools: view?.tools ?? 1,
      votes: reports.map((r) => ({ month: r.month, option: votesByMonth.get(id)?.get(r.month) ?? null })),
    };
  });

  const ties = reports.filter((r) => r.vote.outcome === 'tie').length;
  const emptyMonths = reports.filter((r) => r.vote.outcome !== 'built').length;
  const possibleVotes = reports.reduce((sum, r) => sum + r.villagers, 0);
  const castVotes = reports.reduce((sum, r) => sum + Object.values(r.vote.counts).reduce((a, b) => a + b, 0), 0);
  const builtShares = reports
    .filter((r) => r.vote.outcome === 'built' && r.vote.option)
    .map((r) => {
      const cast = Object.values(r.vote.counts).reduce((a, b) => a + b, 0);
      return cast > 0 ? (r.vote.counts[r.vote.option!] ?? 0) / cast : 0;
    });
  const participation = possibleVotes > 0 ? Math.min(1, castVotes / possibleVotes) : 0;

  const crisisList = crises(game);
  const allActions = usedTotal;
  const unused = actionsByMonth.reduce((sum, r) => sum + r.unused, 0);
  const grade = game.grade();
  const questions: DebriefQuestion[] = [];
  const hunger = crisisList.find((c) => c.kind === 'hunger');
  if (hunger) questions.push({ id: 'hunger', params: { month: hunger.month, people: hunger.people } });
  const unshelteredMonths = reports.filter((r) => r.shelter.unsheltered > 0).length;
  if (unshelteredMonths >= 3) questions.push({ id: 'no-shelter-long', params: { months: unshelteredMonths } });
  if (ties > 0) questions.push({ id: 'ties', params: { count: ties } });
  else if (emptyMonths >= 3) questions.push({ id: 'empty-months', params: { count: emptyMonths } });
  if (allActions > 0) {
    const skills = actionShare.skills;
    if (skills >= 0.35) questions.push({ id: 'skills-heavy', params: { percent: Math.round(skills * 100) } });
    else if (actionCounts.skills === 0) questions.push({ id: 'skills-none', params: {} });
  }
  if (springFoundMonth === null) questions.push({ id: 'spring-never', params: {} });
  else if (springFoundMonth > Math.ceil(game.totalMonths / 2)) {
    questions.push({ id: 'spring-late', params: { month: springFoundMonth } });
  }
  const unusedShare = allActions + unused > 0 ? unused / (allActions + unused) : 0;
  if (unusedShare >= 0.2) questions.push({ id: 'unused-actions', params: { percent: Math.round(unusedShare * 100) } });
  if (participation < 0.7 && monthsPlayed > 0) {
    questions.push({ id: 'low-participation', params: { percent: Math.round(participation * 100) } });
  }
  if (grade >= 5) questions.push({ id: 'good-result', params: { grade } });
  const picked = questions.slice(0, 4);
  picked.push({ id: 'decision-making', params: {} });

  return {
    version: 1,
    createdAt: now.toISOString(),
    named: true,
    length: game.length,
    totalMonths: game.totalMonths,
    monthsPlayed,
    endedEarly: monthsPlayed < game.totalMonths,
    happiness: game.happiness,
    grade,
    villagers: game.villagers,
    months: reports,
    actionsByMonth,
    actionShare,
    crises: crisisList,
    votes: {
      participation,
      ties,
      emptyMonths,
      averageWinningShare: builtShares.length > 0 ? builtShares.reduce((a, b) => a + b, 0) / builtShares.length : 0,
    },
    springFoundMonth,
    players,
    questions: picked,
  };
}

export function fallbackPseudonymize(debrief: DebriefData): DebriefData {
  return {
    ...debrief,
    named: false,
    players: debrief.players.map((p, i) => ({ ...p, label: `Pelaaja ${i + 1}` })),
  };
}
