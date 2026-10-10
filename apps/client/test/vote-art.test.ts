import { describe, expect, it } from 'vitest';
import type { VoteOption } from '@saari/rules';
import { missingFor, optionArt } from '../src/lib/vote.ts';

function option(over: Partial<VoteOption>): VoteOption {
  return { id: 'none', kind: 'none', level: 0, upgrade: false, cost: { wood: 0, stone: 0 }, blocked: [], ...over };
}

describe('optionArt', () => {
  it('shows the building the option would give, at its level', () => {
    expect(optionArt(option({ id: 'shelter-2', kind: 'shelter', level: 2, upgrade: true }))).toBe('props/shelter-2');
    expect(optionArt(option({ id: 'school-1', kind: 'school', level: 1 }))).toBe('props/school-1');
  });

  it('has no picture for not building', () => {
    expect(optionArt(option({}))).toBeNull();
  });
});

describe('missingFor', () => {
  it('says how much wood and stone is still missing', () => {
    const o = option({ id: 'school-1', kind: 'school', level: 1, cost: { wood: 80, stone: 20 }, blocked: ['wood', 'stone'] });
    expect(missingFor(o, { food: 0, wood: 60, stone: 5 })).toEqual({ wood: 20, stone: 15, space: false });
  });

  it('is nothing for affordable options, and flags a missing building place', () => {
    const o = option({ id: 'shelter-1', kind: 'shelter', level: 1, cost: { wood: 50, stone: 0 }, blocked: ['space'] });
    expect(missingFor(o, { food: 0, wood: 90, stone: 0 })).toEqual({ wood: 0, stone: 0, space: true });
  });
});
