import { describe, expect, it } from 'vitest';
import { badgesFor } from '../src/badges.ts';
import { LogBuilder, noneWon } from './fakes.ts';

const RESULT = noneWon({ none: 1 });

/** Three months: p1 explores twice and fishes once a month and votes; p2 does one thing a month and never votes. */
function threeMonths() {
  const b = new LogBuilder().join('p1', 'p2');
  for (const m of [1, 2, 3]) {
    b.month(m).act('p1', 'explore', 2).act('p1', 'fish').act('p2', m === 1 ? 'chop' : m === 2 ? 'mine' : 'study');
    b.votePhase().vote('p1', 'none').result(RESULT);
  }
  return b;
}

describe('badgesFor (docs/09-uudisasukkaat.md §2.3)', () => {
  it('gives the two most used kinds of work, and voter for voting in every meeting', () => {
    expect(badgesFor(threeMonths().entries, 'p1', 3)).toEqual(['explorer', 'fisher', 'voter']);
  });

  it("needs three actions and a fifth of the player's own actions; settler when nothing fits", () => {
    expect(badgesFor(threeMonths().entries, 'p2', 3)).toEqual(['settler']);
  });

  it('breaks ties in display order and gives at most two work badges', () => {
    const b = new LogBuilder().join('p1').month(1).act('p1', 'study', 3).act('p1', 'chop', 3).act('p1', 'explore', 3).votePhase().result(RESULT);
    expect(badgesFor(b.entries, 'p1', 1)).toEqual(['explorer', 'lumberjack']);
  });

  it('counts harvest and plowing as farming, mining and quarry building as stone work', () => {
    const b = new LogBuilder()
      .join('p1')
      .month(1)
      .act('p1', 'harvest', 2)
      .act('p1', 'plow', 2)
      .act('p1', 'mine')
      .act('p1', 'build-quarry', 2)
      .votePhase()
      .result(RESULT);
    expect(badgesFor(b.entries, 'p1', 1)).toEqual(['farmer', 'stonecutter']);
  });

  it('counts the meetings from joining, and needs at least three', () => {
    const b = new LogBuilder().join('p1');
    b.month(1).votePhase().vote('p1', 'none').result(RESULT);
    b.join('late'); // joins in month 1's summary: first meeting is month 2
    for (const m of [2, 3, 4]) b.month(m).votePhase().vote('p1', 'none').vote('late', 'none').result(RESULT);
    expect(badgesFor(b.entries, 'late', 4)).toEqual(['voter']);

    const short = new LogBuilder().join('p1');
    for (const m of [1, 2]) short.month(m).votePhase().vote('p1', 'none').result(RESULT);
    expect(badgesFor(short.entries, 'p1', 2)).toEqual(['settler']);
  });

  it('leaves out the actions of a month that has no report (an early end)', () => {
    const b = threeMonths().month(4).act('p2', 'study', 5);
    expect(badgesFor(b.entries, 'p2', 3)).toEqual(['settler']);
  });
});
