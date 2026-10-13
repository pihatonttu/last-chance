import { describe, expect, it } from 'vitest';
import { calendarMonth, isWinter, monthsUntilWinter, seasonOf, seasonOfCalendarMonth } from '../src/calendar.ts';
import { RULE_TEST_PARAMS as P } from './params.ts';

describe('calendar (docs/09-uudisasukkaat.md §3.1)', () => {
  it('starts in April: game months 1..15 run from April to the next June', () => {
    expect(Array.from({ length: 15 }, (_, i) => calendarMonth(i + 1, P))).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6]);
  });

  it('counts the lobby (month 0) as the first month', () => {
    expect(calendarMonth(0, P)).toBe(4);
  });

  it('uses the seasons Finnish schools teach', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(seasonOfCalendarMonth)).toEqual([
      'winter', 'winter', 'spring', 'spring', 'spring', 'summer',
      'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter',
    ]);
  });

  it('puts winter in months 9-11 of a normal game and 9-10 of a short one', () => {
    const winter = (total: number) => Array.from({ length: total }, (_, i) => i + 1).filter((m) => isWinter(m, P));
    expect(winter(15)).toEqual([9, 10, 11]);
    expect(winter(10)).toEqual([9, 10]);
    expect(seasonOf(12, P)).toBe('spring');
    expect(seasonOf(7, P)).toBe('autumn');
  });

  it('counts the months until winter; null in winter, after the last winter or when the game ends first', () => {
    expect(monthsUntilWinter(1, 15, P)).toBe(8);
    expect(monthsUntilWinter(7, 15, P)).toBe(2);
    expect(monthsUntilWinter(8, 15, P)).toBe(1);
    expect(monthsUntilWinter(9, 15, P)).toBeNull();
    expect(monthsUntilWinter(12, 15, P)).toBeNull();
    expect(monthsUntilWinter(7, 8, P)).toBeNull();
  });

  it('follows the start month parameter', () => {
    expect(calendarMonth(1, { startCalendarMonth: 12 })).toBe(12);
    expect(calendarMonth(2, { startCalendarMonth: 12 })).toBe(1);
  });
});
