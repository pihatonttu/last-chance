/**
 * The settlers' calendar (docs/09-uudisasukkaat.md §3.1). The arctic rules no longer use it
 * (docs/10-arktinen.md §1) and GameParams no longer has a start month; it stays only until
 * the bots, the simulator and the client stop using it.
 */

/** Seasons as Finnish schools count them (docs/09-uudisasukkaat.md §3.1). */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** The game started in April. Any object passes (callers hand in GameParams), so the month is optional. */
type CalendarParams = object & { readonly startCalendarMonth?: number };

const START_CALENDAR_MONTH = 4;

/** Calendar month 1..12 (1 = January) of game month 1, 2, ...; the lobby (0) counts as month 1. */
export function calendarMonth(month: number, params: CalendarParams): number {
  const start = params.startCalendarMonth ?? START_CALENDAR_MONTH;
  return ((start - 1 + Math.max(1, month) - 1) % 12) + 1;
}

/** Spring March-May, summer June-August, autumn September-November, winter December-February. */
export function seasonOfCalendarMonth(calendar: number): Season {
  if (calendar >= 3 && calendar <= 5) return 'spring';
  if (calendar >= 6 && calendar <= 8) return 'summer';
  if (calendar >= 9 && calendar <= 11) return 'autumn';
  return 'winter';
}

export function seasonOf(month: number, params: CalendarParams): Season {
  return seasonOfCalendarMonth(calendarMonth(month, params));
}

/** Winter months: fields lie under snow and forests do not grow (§3.2). */
export function isWinter(month: number, params: CalendarParams): boolean {
  return seasonOf(month, params) === 'winter';
}

/**
 * Months from `month` until the first winter month after it (1 = winter starts next month);
 * null when it is winter now or no winter month comes before the game ends.
 */
export function monthsUntilWinter(month: number, totalMonths: number, params: CalendarParams): number | null {
  if (isWinter(month, params)) return null;
  for (let m = month + 1; m <= totalMonths; m++) if (isWinter(m, params)) return m - month;
  return null;
}
