import type { ActionKind, Game, Resources } from '@saari/rules';

export type ActionGroup = 'food' | 'fields' | 'materials' | 'explore' | 'skills' | 'recreation';

export const ACTION_GROUPS: readonly ActionGroup[] = ['food', 'fields', 'materials', 'explore', 'skills', 'recreation'];

/** Which share every action kind counts toward. A new kind in the rules fails the typecheck here. */
export const ACTION_GROUP_OF: Readonly<Record<ActionKind, ActionGroup>> = {
  harvest: 'food',
  fish: 'food',
  plow: 'fields',
  chop: 'materials',
  mine: 'materials',
  'build-quarry': 'materials',
  explore: 'explore',
  study: 'skills',
  'make-tools': 'skills',
  swim: 'recreation',
  gather: 'recreation',
};

/** The parts of a finished game the metrics read; a real `Game` fits, tests can pass a hand-made one. */
export type MeasurableGame = Pick<
  Game,
  'seed' | 'villagers' | 'happiness' | 'resources' | 'grade' | 'playerIds' | 'player' | 'reports' | 'log'
>;

export interface GameMetrics {
  seed: number;
  happiness: number;
  grade: number;
  /** Months played (report count). */
  months: number;
  /** Villagers in the last month. */
  villagers: number;
  moodByMonth: number[];

  hungryMonths: number;
  /** Sum of hungry villagers over all months. */
  hungerTotal: number;
  unshelteredMonths: number;
  /** First month in which nobody was unsheltered. */
  firstShelteredMonth: number | null;
  spoiledTotal: number;

  buildings: { month: number; option: string }[];
  ties: number;
  /** Months whose vote built nothing: outcome 'none', 'no-votes' or 'tie'. */
  emptyMonths: number;

  /** Final skill levels averaged over all players. */
  avgEducation: number;
  avgTools: number;

  actions: number;
  unusedActions: number;
  /** Fraction of all actions per group; all zero when nobody acted. */
  actionShare: Record<ActionGroup, number>;

  springFoundMonth: number | null;
  endResources: Resources;
}

export function measureGame(game: MeasurableGame): GameMetrics {
  const reports = game.reports;

  const buildings: GameMetrics['buildings'] = [];
  let ties = 0;
  let emptyMonths = 0;
  for (const r of reports) {
    if (r.vote.outcome === 'built') buildings.push({ month: r.month, option: r.vote.option ?? '?' });
    else emptyMonths += 1;
    if (r.vote.outcome === 'tie') ties += 1;
  }

  const counts: Record<ActionGroup, number> = { food: 0, fields: 0, materials: 0, explore: 0, skills: 0, recreation: 0 };
  let actions = 0;
  let springFoundMonth: number | null = null;
  for (const e of game.log) {
    if (e.type === 'action') {
      actions += 1;
      counts[ACTION_GROUP_OF[e.kind]] += 1;
    } else if (e.type === 'spring-found' && springFoundMonth === null) {
      springFoundMonth = e.month;
    }
  }
  const actionShare = { ...counts };
  for (const g of ACTION_GROUPS) actionShare[g] = actions > 0 ? counts[g] / actions : 0;

  const players = game.playerIds().map((id) => game.player(id)).filter((p) => p !== undefined);
  const avg = (pick: (p: (typeof players)[number]) => number) =>
    players.length > 0 ? players.reduce((s, p) => s + pick(p), 0) / players.length : 0;

  const firstSheltered = reports.find((r) => r.shelter.unsheltered === 0);

  return {
    seed: game.seed,
    happiness: game.happiness,
    grade: game.grade(),
    months: reports.length,
    villagers: game.villagers,
    moodByMonth: reports.map((r) => r.mood.total),

    hungryMonths: reports.filter((r) => r.food.hungry > 0).length,
    hungerTotal: sumOf(reports, (r) => r.food.hungry),
    unshelteredMonths: reports.filter((r) => r.shelter.unsheltered > 0).length,
    firstShelteredMonth: firstSheltered ? firstSheltered.month : null,
    spoiledTotal: sumOf(reports, (r) => r.food.spoiled),

    buildings,
    ties,
    emptyMonths,

    avgEducation: avg((p) => p.education),
    avgTools: avg((p) => p.tools),

    actions,
    unusedActions: sumOf(reports, (r) => r.unusedActions),
    actionShare,

    springFoundMonth,
    endResources: { ...game.resources },
  };
}

function sumOf<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((s, item) => s + pick(item), 0);
}
