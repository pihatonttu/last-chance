import { describe, expect, it } from 'vitest';
import { findCrises } from '../src/crises.ts';
import { report, reports } from './fakes.ts';

describe('findCrises', () => {
  it('finds nothing when everyone was fed and sheltered', () => {
    expect(findCrises(reports([{}, {}, {}]))).toEqual([]);
  });

  it('turns a run of hungry months into one crisis with the most hungry people and the month it ended', () => {
    const r = reports([{}, {}, { hungry: 3 }, { hungry: 9 }, { hungry: 2 }, {}, {}]);
    expect(findCrises(r)).toEqual([{ kind: 'hunger', month: 3, people: 9, resolvedMonth: 6 }]);
  });

  it('leaves resolvedMonth null when the crisis lasted to the last month played', () => {
    const r = reports([{}, { unsheltered: 4 }, { unsheltered: 6 }]);
    expect(findCrises(r)).toEqual([{ kind: 'no-shelter', month: 2, people: 6, resolvedMonth: null }]);
  });

  it('splits separate runs of the same kind into separate crises', () => {
    const r = reports([{ hungry: 1 }, {}, { hungry: 2 }, { hungry: 5 }, {}]);
    expect(findCrises(r)).toEqual([
      { kind: 'hunger', month: 1, people: 1, resolvedMonth: 2 },
      { kind: 'hunger', month: 3, people: 5, resolvedMonth: 5 },
    ]);
  });

  it('tracks hunger and shelter independently, ordered by first month, hunger first on the same month', () => {
    const r = reports([
      { unsheltered: 10 },
      { unsheltered: 8, hungry: 2 },
      { unsheltered: 3, hungry: 4 },
      { hungry: 1 },
      {},
      { hungry: 2, unsheltered: 1 },
    ]);
    expect(findCrises(r)).toEqual([
      { kind: 'no-shelter', month: 1, people: 10, resolvedMonth: 4 },
      { kind: 'hunger', month: 2, people: 4, resolvedMonth: 5 },
      { kind: 'hunger', month: 6, people: 2, resolvedMonth: null },
      { kind: 'no-shelter', month: 6, people: 1, resolvedMonth: null },
    ]);
  });

  it('uses the month numbers of the reports', () => {
    const r = [report(4, { hungry: 2 }), report(5, {}), report(6, { hungry: 1 })];
    expect(findCrises(r)).toEqual([
      { kind: 'hunger', month: 4, people: 2, resolvedMonth: 5 },
      { kind: 'hunger', month: 6, people: 1, resolvedMonth: null },
    ]);
  });

  it('finds nothing in a game with no months played', () => {
    expect(findCrises([])).toEqual([]);
  });
});
