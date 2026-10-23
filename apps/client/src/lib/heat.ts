/** The village fire and the frost in the views (docs/10-arktinen.md §4, §4b, §6). */
import type { VillageView } from '@saari/protocol';
import type { MonthReport } from '@saari/rules';
import { formatNumber } from '../i18n/index.ts';
import { PARAMS } from './rules-info.ts';

/**
 * The fire part of a month report, or null for a report stored before the arctic rules
 * (debriefs kept on the server for 30 days have none).
 */
export function heatOf(report: MonthReport): MonthReport['heat'] | null {
  return (report as Partial<MonthReport>).heat ?? null;
}

/** "−25°" with a real minus sign (U+2212), whatever the browser's number format does. */
export function temperatureText(t: number): string {
  return `${t < 0 ? '−' : ''}${formatNumber(Math.abs(t))}°`;
}

/** Hard frost (−30° or colder): the fire burns the most, and the ticker warns of it. */
export function hardFrost(t: number): boolean {
  return t <= PARAMS.weather.hardAt;
}

/** The wood in store does not cover what the fire burns at the end of this month. */
export function fireShort(village: Pick<VillageView, 'resources' | 'heatNeed'>): boolean {
  return village.resources.wood < village.heatNeed;
}

/**
 * The village gave up: the happiness after the month end fell below the limit. Same test as
 * the rules engine, which shows that month's summary and then ends the game.
 */
export function gaveUp(happiness: number, lossThreshold: number): boolean {
  return happiness < lossThreshold;
}

/** The happiness is close to (or below) the limit where the village gives up. */
export function givingUpSoon(happiness: number, lossThreshold: number): boolean {
  return happiness < lossThreshold + PARAMS.lossWarningMargin;
}
