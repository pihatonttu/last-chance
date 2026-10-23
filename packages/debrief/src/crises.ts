import type { MonthReport } from '@saari/rules';
import type { DebriefCrisis } from './types.ts';

type CrisisKind = DebriefCrisis['kind'];

/** Hunger, then cold, then shelter when crises start in the same month (the question priority). */
const KINDS: readonly CrisisKind[] = ['hunger', 'cold', 'no-shelter'];

function affected(report: MonthReport, kind: CrisisKind): number {
  if (kind === 'hunger') return report.food.hungry;
  // Debriefs stored before the arctic rules have no heat in their reports: nobody was cold.
  if (kind === 'cold') return (report as Partial<Pick<MonthReport, 'heat'>>).heat?.cold ?? 0;
  return report.shelter.unsheltered;
}

/** Maximal runs of consecutive months in which somebody went hungry, was cold or had no shelter. */
function runsOf(reports: readonly MonthReport[], kind: CrisisKind): DebriefCrisis[] {
  const crises: DebriefCrisis[] = [];
  let current: DebriefCrisis | null = null;
  for (const report of reports) {
    const people = affected(report, kind);
    if (people > 0) {
      if (current) current.people = Math.max(current.people, people);
      else current = { kind, month: report.month, people, resolvedMonth: null };
    } else if (current) {
      // The first month after the run is, by definition, a month with nobody affected.
      current.resolvedMonth = report.month;
      crises.push(current);
      current = null;
    }
  }
  if (current) crises.push(current);
  return crises;
}

/**
 * Crisis moments (design doc §13.2 item 2), ordered by their first month: "Month 6: food ran
 * out, 9 went hungry. Resolved in month 8."
 */
export function findCrises(reports: readonly MonthReport[]): DebriefCrisis[] {
  return KINDS.flatMap((kind) => runsOf(reports, kind)).sort(
    (a, b) => a.month - b.month || KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind),
  );
}
