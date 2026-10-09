import { GRADES, type Summary } from './aggregate.ts';
import { ACTION_GROUPS } from './metrics.ts';

export interface ReportRow {
  label: string;
  summary: Summary;
}

const NONE = '–';

/** Fixed decimals without a "-0.0". */
function fixed(value: number, decimals: number): string {
  const s = value.toFixed(decimals);
  return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s;
}

const percent = (share: number) => `${fixed(share * 100, 0)}%`;

function table(header: string[], align: ('l' | 'r')[], rows: string[][]): string[] {
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`;
  return [line(header), line(align.map((a) => (a === 'r' ? '---:' : '---'))), ...rows.map(line)];
}

function mainRow({ label, summary: s }: ReportRow): string[] {
  const h = s.happiness;
  const firstSheltered =
    s.firstShelteredMonth === null
      ? NONE
      : fixed(s.firstShelteredMonth, 1) + (s.shelteredRate < 1 ? ` (${percent(s.shelteredRate)})` : '');
  return [
    label,
    String(s.games),
    [h.p10, h.p50, h.p90].map((v) => fixed(v, 0)).join('/'),
    GRADES.map((g) => `${g}:${s.gradeHistogram[g]}`).join(' '),
    fixed(s.hungryMonths, 1),
    fixed(s.unshelteredMonths, 1),
    firstSheltered,
    fixed(s.buildings, 1),
    fixed(s.avgEducation, 2),
    fixed(s.avgTools, 2),
    ACTION_GROUPS.map((g) => fixed(s.actionShare[g] * 100, 0)).join('/'),
    percent(s.unusedShare),
    percent(s.springFoundRate),
    `${fixed(s.endResources.wood, 0)} / ${fixed(s.endResources.stone, 0)}`,
  ];
}

/**
 * One row per scenario: happiness percentiles, grade counts, hunger and shelter months, the first
 * month with everyone sheltered (mean over the games that got there, with that share when not all
 * did), buildings, final skills, action shares, unused actions, spring found and the wood and stone
 * left at the end. A second table holds the mean mood of every month.
 */
export function markdownReport(rows: readonly ReportRow[]): string {
  const main = table(
    [
      'scenario',
      'games',
      'happiness p10/p50/p90',
      'grades',
      'hungry months',
      'unsheltered months',
      'first sheltered',
      'buildings',
      'education',
      'tools',
      `${ACTION_GROUPS.join('/')} %`,
      'unused',
      'spring found',
      'end wood / stone',
    ],
    ['l', 'r', 'r', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r'],
    rows.map(mainRow),
  );

  const months = Math.max(0, ...rows.map((r) => r.summary.moodByMonth.length));
  const monthIndexes = Array.from({ length: months }, (_, i) => i);
  const mood = table(
    ['scenario', ...monthIndexes.map((i) => `m${i + 1}`)],
    ['l', ...monthIndexes.map(() => 'r' as const)],
    rows.map(({ label, summary }) => [
      label,
      ...monthIndexes.map((i) => {
        const v = summary.moodByMonth[i];
        return v === undefined ? NONE : fixed(v, 1);
      }),
    ]),
  );

  return [...main, '', 'Mean mood per month', '', ...mood, ''].join('\n');
}
