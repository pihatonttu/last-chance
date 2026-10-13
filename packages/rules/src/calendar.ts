import type { GameParams } from './params.ts';

/** Seasons as Finnish schools count them (docs/09-uudisasukkaat.md §3.1). */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

type CalendarParams = Pick<GameParams, 'startCalendarMonth'>;

/** Calendar month 1..12 (1 = January) of game month 1, 2, ...; the lobby (0) counts as month 1. */
export function calendarMonth(month: number, params: CalendarParams): number {
  return ((params.startCalendarMonth - 1 + Math.max(1, month) - 1) % 12) + 1;
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
