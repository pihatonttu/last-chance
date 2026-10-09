import { describe, expect, it } from 'vitest';
import { collectVotes, participation, playerBallots, voteOutcomes } from '../src/votes.ts';
import { built, LogBuilder, noneWon, noVotes, report, tie } from './fakes.ts';

describe('collectVotes', () => {
  it("keeps each player's last vote of the month", () => {
    const log = new LogBuilder()
      .join('a', 'b', 'c')
      .month(1)
      .votePhase()
      .vote('a', 'none')
      .vote('b', 'shelter-1')
      .vote('a', 'shelter-1')
      .vote('a', 'school-1')
      .result(built('shelter-1', {})).entries;
    expect(collectVotes(log, 1)).toEqual([
      {
        month: 1,
        eligible: ['a', 'b', 'c'],
        ballots: new Map([
          ['a', 'school-1'],
          ['b', 'shelter-1'],
        ]),
      },
    ]);
  });

  it('counts as eligible everyone who joined before the result and was not removed by then', () => {
    const log = new LogBuilder()
      .join('a', 'b', 'c', 'd')
      .month(1)
      .join('late') // joins in the action phase: may vote this month
      .remove('b') // removed in the action phase: not eligible this month
      .votePhase()
      .vote('a', 'none')
      .vote('c', 'none')
      .remove('c') // removed in the vote phase: the vote is dropped
      .vote('late', 'none')
      .result(noneWon({}))
      .join('after') // joins after the result: eligible from next month
      .remove('d') // removed after the result: still eligible this month
      .month(2)
      .votePhase()
      .vote('after', 'none')
      .result(noneWon({})).entries;
    const months = collectVotes(log, 2);
    expect(months.map((m) => m.eligible)).toEqual([
      ['a', 'd', 'late'],
      ['a', 'late', 'after'],
    ]);
    expect(months.map((m) => [...m.ballots.keys()])).toEqual([['a', 'late'], ['after']]);
  });

  it('ignores votes of months after the last month played', () => {
    const log = new LogBuilder()
      .join('a')
      .month(1)
      .votePhase()
      .vote('a', 'none')
      .result(noneWon({}))
      .month(2)
      .votePhase()
      .vote('a', 'none').entries;
    expect(collectVotes(log, 1).map((m) => m.month)).toEqual([1]);
    expect(collectVotes(log, 0)).toEqual([]);
  });
});

describe('participation', () => {
  it('sums the votes cast and the eligible voters over the months', () => {
    const months = [
      { month: 1, eligible: ['a', 'b', 'c', 'd'], ballots: new Map([['a', 'none'], ['b', 'none'], ['c', 'none']]) },
      { month: 2, eligible: ['a', 'b', 'c', 'd', 'e'], ballots: new Map([['e', 'none']]) },
    ];
    expect(participation(months)).toEqual({ cast: 4, possible: 9 });
  });

  it('is zero over zero for no months', () => {
    expect(participation([])).toEqual({ cast: 0, possible: 0 });
  });
});

describe('voteOutcomes', () => {
  it('counts ties and months that built nothing, and averages the winning share over built months', () => {
    const r = [
      report(1, { vote: built('shelter-1', { none: 1, 'shelter-1': 3 }) }),
      report(2, { vote: tie({ none: 2, 'shelter-1': 2 }) }),
      report(3, { vote: noneWon({ none: 3, 'shelter-1': 1 }) }),
      report(4, { vote: noVotes() }),
      report(5, { vote: built('school-1', { none: 0, 'school-1': 2 }) }),
      report(6, { vote: tie({ none: 1, 'school-2': 1 }) }),
    ];
    expect(voteOutcomes(r)).toEqual({ ties: 2, emptyMonths: 4, averageWinningShare: 0.875 });
  });

  it('gives a zero winning share when nothing was built', () => {
    expect(voteOutcomes([report(1, { vote: noVotes() })])).toEqual({ ties: 0, emptyMonths: 1, averageWinningShare: 0 });
    expect(voteOutcomes([])).toEqual({ ties: 0, emptyMonths: 0, averageWinningShare: 0 });
  });
});

describe('playerBallots', () => {
  const months = [
    { month: 1, eligible: ['a'], ballots: new Map([['a', 'shelter-1']]) },
    { month: 2, eligible: ['a', 'b'], ballots: new Map([['b', 'none']]) },
  ];

  it('gives one entry per month played, null when the player did not vote', () => {
    expect(playerBallots(months, 'a', 3)).toEqual([
      { month: 1, option: 'shelter-1' },
      { month: 2, option: null },
      { month: 3, option: null },
    ]);
  });

  it("keeps a vote for 'none' apart from not voting", () => {
    expect(playerBallots(months, 'b', 2)).toEqual([
      { month: 1, option: null },
      { month: 2, option: 'none' },
    ]);
  });
});
