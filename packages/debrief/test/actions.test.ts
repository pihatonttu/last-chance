import type { ActionKind } from '@saari/rules';
import { describe, expect, it } from 'vitest';
import { ACTION_GROUPS, countByMonth, emptyCounts, groupOf, shareOf, sumCounts, totalOf } from '../src/actions.ts';
import type { ActionGroup } from '../src/types.ts';
import { LogBuilder } from './fakes.ts';

describe('groupOf', () => {
  it('maps every action kind to its debrief group', () => {
    const expected: Record<ActionKind, ActionGroup> = {
      harvest: 'food',
      fish: 'food',
      plow: 'fields',
      chop: 'materials',
      mine: 'materials',
      'build-quarry': 'materials',
      explore: 'explore',
      study: 'skills',
      'make-tools': 'skills',
      swim: 'recreation',
      gather: 'recreation',
    };
    for (const [kind, group] of Object.entries(expected)) expect(groupOf(kind as ActionKind), kind).toBe(group);
  });

  it('lists the six groups in display order', () => {
    expect(ACTION_GROUPS).toEqual(['food', 'fields', 'materials', 'explore', 'skills', 'recreation']);
  });
});

describe('countByMonth', () => {
  const log = new LogBuilder()
    .join('a', 'b')
    .month(1)
    .act('a', 'chop', 2)
    .act('a', 'fish')
    .act('b', 'harvest')
    .act('b', 'study')
    .unused('b', 1)
    .votePhase()
    .result({ outcome: 'no-votes', counts: { none: 0 } })
    .month(2)
    .unused('a', 3)
    .unused('b', 3)
    .votePhase()
    .result({ outcome: 'no-votes', counts: { none: 0 } })
    .month(3)
    .act('a', 'explore')
    .act('b', 'swim')
    .act('b', 'gather')
    .act('a', 'plow')
    .act('a', 'mine')
    .act('a', 'build-quarry')
    .act('b', 'make-tools')
    .unused('a', 0).entries;

  it('counts actions by group and unused actions, one row per month played', () => {
    expect(countByMonth(log, 3)).toEqual([
      { food: 2, fields: 0, materials: 2, explore: 0, skills: 1, recreation: 0, unused: 1 },
      { food: 0, fields: 0, materials: 0, explore: 0, skills: 0, recreation: 0, unused: 6 },
      { food: 0, fields: 1, materials: 2, explore: 1, skills: 1, recreation: 2, unused: 0 },
    ]);
  });

  it('leaves out an unfinished month after the last month played', () => {
    const rows = countByMonth(log, 2);
    expect(rows).toHaveLength(2);
    expect(totalOf(sumCounts(rows))).toBe(5);
  });

  it('counts one player only when given an id', () => {
    expect(countByMonth(log, 3, 'b')).toEqual([
      { food: 1, fields: 0, materials: 0, explore: 0, skills: 1, recreation: 0, unused: 1 },
      { food: 0, fields: 0, materials: 0, explore: 0, skills: 0, recreation: 0, unused: 3 },
      { food: 0, fields: 0, materials: 0, explore: 0, skills: 1, recreation: 2, unused: 0 },
    ]);
  });

  it('gives an empty list when no month was played', () => {
    expect(countByMonth(log, 0)).toEqual([]);
  });
});

describe('sumCounts / totalOf', () => {
  it('adds the group counts of every row and ignores the unused column', () => {
    const rows = [
      { ...emptyCounts(), food: 2, skills: 1, unused: 5 },
      { ...emptyCounts(), food: 1, recreation: 4, unused: 1 },
    ];
    const sum = sumCounts(rows);
    expect(sum).toEqual({ food: 3, fields: 0, materials: 0, explore: 0, skills: 1, recreation: 4 });
    expect(totalOf(sum)).toBe(8);
  });
});

describe('shareOf', () => {
  it('turns counts into shares of the actions used that sum to 1', () => {
    const share = shareOf({ food: 2, fields: 1, materials: 1, explore: 0, skills: 0, recreation: 0 });
    expect(share).toEqual({ food: 0.5, fields: 0.25, materials: 0.25, explore: 0, skills: 0, recreation: 0 });
  });

  it('is all zeros when nobody acted', () => {
    expect(shareOf(emptyCounts())).toEqual(emptyCounts());
  });
});
