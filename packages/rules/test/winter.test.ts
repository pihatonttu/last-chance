import { describe, expect, it } from 'vitest';
import { act, finishMonth, setup, tileAt } from './helpers.ts';

/** SMALL_ISLAND: landing (3,5); (2,5) is a meadow and (3,4) a forest, both visible from the start. */
function gameWithField() {
  const game = setup({ players: 3 });
  for (const p of ['p1', 'p2', 'p3']) act(game, p, 2, 5); // 3 x 1 work: the meadow becomes a field
  expect(tileAt(game, 2, 5).terrain).toBe('field');
  return game;
}

describe('winter (docs/09-uudisasukkaat.md §3.2)', () => {
  it('fields lie under snow from December to February and can be harvested again in March', () => {
    const game = gameWithField();
    while (game.month < 9) finishMonth(game); // December
    expect(game.preview('p1', 2, 5)).toMatchObject({ kind: 'harvest', available: false, reason: 'winter' });
    expect(game.act('p1', 2, 5)).toEqual({ ok: false, reason: 'winter' });
    while (game.month < 12) finishMonth(game); // March
    expect(game.preview('p1', 2, 5)).toMatchObject({ kind: 'harvest', available: true });
  });

  it('harvests normally in November', () => {
    const game = gameWithField();
    while (game.month < 8) finishMonth(game);
    expect(game.preview('p1', 2, 5)).toMatchObject({ kind: 'harvest', available: true });
  });

  it('forests do not grow at the end of a winter month, and grow again after March', () => {
    const game = setup({ players: 1 });
    while (game.month < 9) finishMonth(game);
    act(game, 'p1', 3, 4); // chop 10: 40 -> 30
    expect(tileAt(game, 3, 4).stock).toBe(30);
    finishMonth(game); // end of December
    expect(tileAt(game, 3, 4).stock).toBe(30);
    while (game.month < 12) finishMonth(game); // through January and February
    expect(tileAt(game, 3, 4).stock).toBe(30);
    finishMonth(game); // end of March: ceil(30 x 1.25)
    expect(tileAt(game, 3, 4).stock).toBe(38);
  });

  it('fishing, chopping and plowing work in winter', () => {
    const game = setup({ players: 1 });
    while (game.month < 10) finishMonth(game);
    expect(game.preview('p1', 3, 6)).toMatchObject({ kind: 'fish', available: true });
    expect(game.preview('p1', 3, 4)).toMatchObject({ kind: 'chop', available: true });
    expect(game.preview('p1', 4, 5)).toMatchObject({ kind: 'plow', available: true });
  });
});
