import { describe, expect, it } from 'vitest';
import type { MonthReport } from '@saari/rules';
import { fireShort, gaveUp, givingUpSoon, hardFrost, heatOf, temperatureText } from '../src/lib/heat.ts';
import { PARAMS } from '../src/lib/rules-info.ts';
import { monthReport, village } from './fixtures.ts';

describe('heatOf (docs/10-arktinen.md §6)', () => {
  it('gives the fire part of a month report', () => {
    expect(heatOf(monthReport())).toEqual({ temperature: -30, need: 30, burned: 18, cold: 4 });
  });

  it('is null for a report stored before the arctic rules, which has no heat', () => {
    const { heat: _heat, ...old } = monthReport();
    expect(heatOf(old as MonthReport)).toBeNull();
  });
});

describe('temperatureText', () => {
  it('writes frost with a real minus sign (U+2212) and a degree sign', () => {
    expect(temperatureText(-25)).toBe('−25°');
    expect(temperatureText(-10)).toBe('−10°');
    expect(temperatureText(0)).toBe('0°');
  });
});

describe('fire and loss warnings', () => {
  it('the fire is short when the wood does not cover this month’s need', () => {
    expect(fireShort(village({ resources: { food: 0, wood: 19, stone: 0 }, heatNeed: 20 }))).toBe(true);
    expect(fireShort(village({ resources: { food: 0, wood: 20, stone: 0 }, heatNeed: 20 }))).toBe(false);
  });

  it('hard frost is the coldest band the fire burns most for (−30° or colder)', () => {
    expect(hardFrost(PARAMS.weather.hardAt)).toBe(true);
    expect(hardFrost(-35)).toBe(true);
    expect(hardFrost(PARAMS.weather.hardAt + PARAMS.weather.step)).toBe(false);
  });

  it('the village gave up when the happiness fell below the limit, as the rules decide', () => {
    expect(gaveUp(-61, -60)).toBe(true);
    expect(gaveUp(-60, -60)).toBe(false);
    expect(gaveUp(0, -60)).toBe(false);
  });

  it('warns that the village is giving up within the warning margin above the limit', () => {
    const margin = PARAMS.lossWarningMargin;
    expect(givingUpSoon(-60 + margin - 1, -60)).toBe(true);
    expect(givingUpSoon(-60 + margin, -60)).toBe(false);
    expect(givingUpSoon(-70, -60)).toBe(true);
    expect(givingUpSoon(0, -60)).toBe(false);
  });
});
