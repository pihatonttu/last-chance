import { describe, expect, it } from 'vitest';
import type { Game } from '../src/game.ts';
import type { GameLength } from '../src/params.ts';
import { RULE_TEST_PARAMS as P } from './params.ts';
import { act, finishMonth, setup, withoutLoss } from './helpers.ts';

const limit = (normal: number, short = normal) => ({ ...P, lossThreshold: { normal, short } });

/**
 * An idle village of 3: month 1 is fed and warm but homeless (+2 + 2 - 10 = -6), month 2
 * hungry and homeless with 7 wood left for the fire (-10 + 2 - 10 = -18, happiness -24).
 */
function idleVillage(params = P, length: GameLength = 'normal'): Game {
  return setup({ players: 3, params, length });
}

/** Happiness after each month of an idle village that never gives up. */
function idleHappiness(length: GameLength): number[] {
  const game = idleVillage(withoutLoss(), length);
  const happiness: number[] = [];
  while (game.phase !== 'ended') happiness.push(finishMonth(game).happiness);
  return happiness;
}

describe('losing (docs/10-arktinen.md §4b)', () => {
  it("happiness below the loss limit ends the game after that month's summary as lost", () => {
    const game = idleVillage();
    let report;
    for (;;) {
      game.endActionPhase();
      report = game.endVotePhase();
      if (report.happiness < -60) break;
      expect(game.lost).toBe(false);
      game.nextMonth();
    }
    expect(report.month).toBeLessThan(game.totalMonths);
    // The month's summary is still shown.
    expect(game.lost).toBe(true);
    expect(game.phase).toBe('summary');
    expect(game.reports.at(-1)).toEqual(report);
    game.nextMonth();
    expect(game.phase).toBe('ended');
    expect(game.month).toBe(report.month);
    expect(game.log.at(-1)).toMatchObject({ type: 'game-ended', early: false, lost: true, happiness: report.happiness });
  });

  it('at the limit exactly the game goes on', () => {
    const atLimit = idleVillage(limit(-6));
    expect(finishMonth(atLimit).happiness).toBe(-6);
    expect(atLimit.lost).toBe(false);
    expect(atLimit.phase).toBe('action');
    expect(atLimit.month).toBe(2);

    const below = idleVillage(limit(-5));
    finishMonth(below);
    expect(below.lost).toBe(true);
    expect(below.phase).toBe('ended');
  });

  it('falling below the limit in the last month is a loss, not the party', () => {
    const happiness = idleHappiness('short');
    const last = happiness.at(-1)!;
    expect(Math.min(...happiness.slice(0, -1))).toBeGreaterThan(last);
    // A limit that only the last month's happiness falls below.
    const game = idleVillage(limit(-1000, last + 1), 'short');
    for (let month = 1; month < 10; month++) finishMonth(game);
    expect(game.lost).toBe(false);
    finishMonth(game);
    expect(game.lost).toBe(true);
    expect(game.phase).toBe('ended');
    expect(game.log.at(-1)).toMatchObject({ type: 'game-ended', early: false, lost: true });
  });

  it('a normal end is not lost', () => {
    // One villager who fishes and keeps the fire going in a small igloo: -4 a month.
    const game = setup({ players: 1, length: 'short' });
    finishMonth(game, { p1: 'shelter-1' });
    while (game.phase !== 'ended') {
      if (game.resources.wood < game.heatNeed()) act(game, 'p1', 3, 4);
      act(game, 'p1', 3, 6);
      finishMonth(game);
    }
    expect(game.reports).toHaveLength(10);
    expect(game.happiness).toBeGreaterThanOrEqual(-60);
    expect(game.lost).toBe(false);
    expect(game.log.at(-1)).toMatchObject({ type: 'game-ended', early: false, lost: false });
  });

  it('short and normal games use their own limit', () => {
    const normal = idleVillage(limit(-7, -5), 'normal');
    const short = idleVillage(limit(-7, -5), 'short');
    expect(finishMonth(normal).happiness).toBe(-6);
    expect(finishMonth(short).happiness).toBe(-6);
    expect(normal.lost).toBe(false);
    expect(short.lost).toBe(true);
  });
});
