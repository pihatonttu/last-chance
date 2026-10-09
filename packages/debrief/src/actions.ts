import type { ActionKind, LogEntry } from '@saari/rules';
import type { ActionGroup, GroupCounts } from './types.ts';

/** The groups in display order (design doc §13.2 item 3). */
export const ACTION_GROUPS: readonly ActionGroup[] = ['food', 'fields', 'materials', 'explore', 'skills', 'recreation'];

/** A Record over every ActionKind, so a new kind in the engine fails to compile until it has a group. */
const GROUP_OF: Readonly<Record<ActionKind, ActionGroup>> = {
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

export function groupOf(kind: ActionKind): ActionGroup {
  return GROUP_OF[kind];
}

export function emptyCounts(): GroupCounts {
  return { food: 0, fields: 0, materials: 0, explore: 0, skills: 0, recreation: 0 };
}

/** Copies only the group fields, so extra columns (such as `unused`) never leak along. */
export function copyCounts(c: GroupCounts): GroupCounts {
  const out = emptyCounts();
  for (const g of ACTION_GROUPS) out[g] = c[g];
  return out;
}

export function totalOf(c: GroupCounts): number {
  return ACTION_GROUPS.reduce((sum, g) => sum + c[g], 0);
}

export function sumCounts(rows: readonly GroupCounts[]): GroupCounts {
  const out = emptyCounts();
  for (const row of rows) for (const g of ACTION_GROUPS) out[g] += row[g];
  return out;
}

/** Share of the actions used per group (0..1, summing to 1); all zeros when nobody acted. */
export function shareOf(c: GroupCounts): GroupCounts {
  const total = totalOf(c);
  const out = emptyCounts();
  if (total === 0) return out;
  for (const g of ACTION_GROUPS) out[g] = c[g] / total;
  return out;
}

/**
 * Action group counts and unused actions per month for months 1..monthsPlayed (index 0 =
 * month 1), for the whole village or for one player. Entries of a month without a report
 * (a game ended in the middle of a month) are left out, so the rows line up with the reports.
 */
export function countByMonth(
  log: readonly LogEntry[],
  monthsPlayed: number,
  player?: string,
): (GroupCounts & { unused: number })[] {
  const rows = Array.from({ length: Math.max(0, monthsPlayed) }, () => ({ ...emptyCounts(), unused: 0 }));
  for (const e of log) {
    if (e.type !== 'action' && e.type !== 'actions-unused') continue;
    if (player !== undefined && e.player !== player) continue;
    const row = rows[e.month - 1];
    if (!row) continue;
    if (e.type === 'action') row[groupOf(e.kind)] += 1;
    else row.unused += e.count;
  }
  return rows;
}
