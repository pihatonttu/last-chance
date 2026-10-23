import type { MonthReport } from '@saari/rules';
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

  it('finds cold crises like hunger', () => {
    const r = reports([{}, { cold: 2 }, { cold: 7 }, { cold: 3 }, {}, { cold: 1 }, { cold: 4 }]);
    expect(findCrises(r)).toEqual([
      { kind: 'cold', month: 2, people: 7, resolvedMonth: 5 },
      { kind: 'cold', month: 6, people: 4, resolvedMonth: null },
    ]);
  });

  it('puts cold between hunger and shelter when crises start in the same month', () => {
    const r = reports([{ unsheltered: 3, cold: 2, hungry: 1 }, { unsheltered: 3 }, {}]);
    expect(findCrises(r)).toEqual([
      { kind: 'hunger', month: 1, people: 1, resolvedMonth: 2 },
      { kind: 'cold', month: 1, people: 2, resolvedMonth: 2 },
      { kind: 'no-shelter', month: 1, people: 3, resolvedMonth: 3 },
    ]);
  });

  it('tracks cold independently of hunger and shelter', () => {
    const r = reports([{ hungry: 4 }, { hungry: 4, cold: 5 }, { cold: 5 }, {}]);
    expect(findCrises(r)).toEqual([
      { kind: 'hunger', month: 1, people: 4, resolvedMonth: 3 },
      { kind: 'cold', month: 2, people: 5, resolvedMonth: 4 },
    ]);
  });

  it('counts a report without heat as nobody cold (debriefs stored before the arctic rules)', () => {
    const r = reports([{ hungry: 2 }, {}, {}]);
    for (const month of r) delete (month as Partial<MonthReport>).heat;
    expect(findCrises(r)).toEqual([{ kind: 'hunger', month: 1, people: 2, resolvedMonth: 2 }]);
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
