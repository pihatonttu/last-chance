import { describe, expect, it } from 'vitest';
import type { Game } from '../src/game.ts';
import { act, buildByVote, finishMonth, freeBuildingParams, setup, tileAt, withoutLoss } from './helpers.ts';

/**
 * Only two free snow fields next to the landing (2,1).
 *   x: 01234
 *   0  ~~~~~
 *   1  ~.L.~
 *   2  ~~~~~
 */
const TINY = ['~~~~~', '~.L.~', '~~~~~'];

/** A forest and one free snow field next to the landing (2,1). */
const ONE_FREE = ['~~~~~', '~TL.~', '~~~~~'];

/** Three plowing actions of one player. */
function plow(game: Game, player: string, x: number, y: number) {
  for (let i = 0; i < 3; i++) act(game, player, x, y);
}

function demolish(game: Game, player: string, x: number, y: number, times = 1) {
  for (let i = 0; i < times; i++) act(game, player, x, y, 'demolish');
}

function smallIgloo(game: Game) {
  const option = game.voteOptions().find((o) => o.id === 'shelter-1');
  if (!option) throw new Error('no small igloo option');
  return option;
}

describe('the dead end of the test game (docs/12-selkeys.md §1)', () => {
  it('greenhouses on every free snow field block the small igloo; demolishing one (3 work) unblocks it', () => {
    const game = setup({ map: TINY });
    plow(game, 'p1', 1, 1);
    plow(game, 'p2', 3, 1);
    expect(smallIgloo(game).blocked).toEqual(['space']);

    demolish(game, 'p3', 1, 1, 2);
    expect(smallIgloo(game).blocked).toEqual(['space']);
    demolish(game, 'p3', 1, 1);
    expect(smallIgloo(game).blocked).toEqual([]);

    const report = buildByVote(game, 'shelter-1');
    expect(report.vote).toMatchObject({ outcome: 'built', option: 'shelter-1', x: 1, y: 1 });
    expect(tileAt(game, 1, 1).building).toEqual({ kind: 'shelter', level: 1 });
  });
});

describe('demolish', () => {
  it('one action does not finish it, three do', () => {
    const game = setup();
    plow(game, 'p1', 2, 4);
    demolish(game, 'p2', 2, 4);
    expect(tileAt(game, 2, 4)).toMatchObject({ terrain: 'field', stock: 30, work: 1 });
    demolish(game, 'p2', 2, 4);
    expect(tileAt(game, 2, 4)).toMatchObject({ terrain: 'field', stock: 30, work: 2 });
    demolish(game, 'p2', 2, 4);
    expect(tileAt(game, 2, 4)).toMatchObject({ terrain: 'meadow', stock: 0, work: 0 });
  });

  it('a second pupil who comes too late is refused and keeps the action', () => {
    const game = setup();
    plow(game, 'p1', 2, 4);
    demolish(game, 'p2', 2, 4, 3);
    expect(game.act('p3', 2, 4, 'demolish')).toEqual({ ok: false, reason: 'no-action' });
    expect(game.player('p3')?.actionsLeft).toBe(3);
    expect(tileAt(game, 2, 4)).toMatchObject({ terrain: 'meadow', stock: 0, work: 0 });
  });

  it('logs the action and, when done, the field-removed event', () => {
    const game = setup();
    plow(game, 'p1', 2, 4);
    const first = game.act('p2', 2, 4, 'demolish');
    expect(first.ok && first.events.map((e) => e.type)).toEqual(['action']);
    expect(first.ok && first.events[0]).toMatchObject({ kind: 'demolish', player: 'p2', x: 2, y: 4, gain: { work: 1 } });
    game.act('p2', 2, 4, 'demolish');
    const last = game.act('p3', 2, 4, 'demolish');
    expect(last.ok && last.events.map((e) => e.type)).toEqual(['action', 'field-removed']);
    expect(game.log.find((e) => e.type === 'field-removed')).toMatchObject({ x: 2, y: 4, player: 'p3' });
  });

  it('several players share the work, and it waits over a month end like plowing', () => {
    const game = setup({ params: withoutLoss() });
    plow(game, 'p1', 2, 4);
    demolish(game, 'p2', 2, 4);
    finishMonth(game);
    expect(tileAt(game, 2, 4)).toMatchObject({ terrain: 'field', stock: 30, work: 1 });
    demolish(game, 'p3', 2, 4, 2);
    expect(tileAt(game, 2, 4)).toMatchObject({ terrain: 'meadow', work: 0 });
  });

  it('tools make it quicker exactly like plowing', () => {
    const params = withoutLoss({ ...freeBuildingParams(), toolsBonusPerLevel: 0.5 });
    const game = setup({ params });
    buildByVote(game, 'shelter-1');
    buildByVote(game, 'workshop-1');
    const workshop = game.tiles().find((t) => t.building?.kind === 'workshop')!;
    for (let i = 0; i < 3; i++) act(game, 'p1', workshop.x, workshop.y);
    expect(game.player('p1')?.tools).toBe(2);
    finishMonth(game);

    // 1.5 work per action: two actions instead of three, for both.
    const meadow = game.tiles().find((t) => !t.fog && t.terrain === 'meadow' && !t.building && (t.x !== 3 || t.y !== 5))!;
    const { x, y } = meadow;
    expect(game.preview('p1', x, y).yield).toEqual({ type: 'work', amount: 1.5, done: 0, needed: 3 });
    act(game, 'p1', x, y);
    expect(tileAt(game, x, y).terrain).toBe('meadow');
    act(game, 'p1', x, y);
    expect(tileAt(game, x, y).terrain).toBe('field');

    expect(game.preview('p1', x, y).alternative?.yield).toEqual({ type: 'work', amount: 1.5, done: 0, needed: 3 });
    finishMonth(game);
    demolish(game, 'p1', x, y);
    expect(tileAt(game, x, y).terrain).toBe('field');
    demolish(game, 'p1', x, y);
    expect(tileAt(game, x, y)).toMatchObject({ terrain: 'meadow', stock: 0, work: 0 });
  });

  it('costs one action like any work and is refused without actions', () => {
    const game = setup();
    plow(game, 'p1', 2, 4);
    expect(game.act('p1', 2, 4, 'demolish')).toEqual({ ok: false, reason: 'no-actions-left' });
    expect(tileAt(game, 2, 4).work).toBe(0);
    demolish(game, 'p2', 2, 4);
    expect(game.player('p2')?.actionsLeft).toBe(2);
  });

  it('is refused outside the action phase and for removed players', () => {
    const game = setup();
    plow(game, 'p1', 2, 4);
    game.removePlayer('p3');
    expect(game.act('p3', 2, 4, 'demolish')).toEqual({ ok: false, reason: 'removed' });
    game.endActionPhase();
    expect(game.act('p2', 2, 4, 'demolish')).toEqual({ ok: false, reason: 'wrong-phase' });
  });

  it('works on an empty field too', () => {
    const game = setup();
    plow(game, 'p1', 2, 4);
    for (let i = 0; i < 3; i++) act(game, 'p2', 2, 4);
    expect(tileAt(game, 2, 4).stock).toBe(0);
    expect(game.act('p3', 2, 4)).toEqual({ ok: false, reason: 'field-empty' });
    demolish(game, 'p3', 2, 4, 3);
    expect(tileAt(game, 2, 4)).toMatchObject({ terrain: 'meadow', stock: 0, work: 0 });
  });

  it('does not disturb harvesting: a partly demolished field can still be harvested', () => {
    const game = setup();
    plow(game, 'p1', 2, 4);
    demolish(game, 'p2', 2, 4, 2);
    const food = game.resources.food;
    act(game, 'p3', 2, 4);
    expect(game.resources.food).toBe(food + 10);
    expect(tileAt(game, 2, 4)).toMatchObject({ terrain: 'field', stock: 20, work: 2 });
    demolish(game, 'p3', 2, 4);
    expect(tileAt(game, 2, 4)).toMatchObject({ terrain: 'meadow', stock: 0, work: 0 });
    expect(game.resources.food).toBe(food + 10);
  });

  it('gives nothing back and leaves an ordinary snow field that can be plowed again', () => {
    const game = setup();
    const before = game.resources;
    plow(game, 'p1', 2, 4);
    demolish(game, 'p2', 2, 4, 3);
    expect(game.resources).toEqual(before);
    expect(game.preview('p3', 2, 4).kind).toBe('plow');
    plow(game, 'p3', 2, 4);
    expect(tileAt(game, 2, 4)).toMatchObject({ terrain: 'field', stock: 30, work: 0 });
  });

  it('is refused on everything but a field, without using an action or touching the work', () => {
    const game = setup({ params: freeBuildingParams() });
    buildByVote(game, 'shelter-1');
    const igloo = game.tiles().find((t) => t.building)!;
    act(game, 'p1', 4, 5); // a half-plowed snow field
    const refused = [
      { x: 4, y: 5, what: 'snow field' },
      { x: 3, y: 4, what: 'forest' },
      { x: 3, y: 6, what: 'sea' },
      { x: 3, y: 3, what: 'fog' },
      { x: 3, y: 5, what: 'landing' },
      { x: igloo.x, y: igloo.y, what: 'igloo' },
    ];
    for (const { x, y, what } of refused) {
      expect(game.act('p2', x, y, 'demolish'), what).toEqual({ ok: false, reason: 'no-action' });
    }
    expect(game.player('p2')?.actionsLeft).toBe(3);
    expect(tileAt(game, 4, 5).work).toBe(1);
    expect(game.tile(igloo.x, igloo.y)?.building).toEqual({ kind: 'shelter', level: 1 });
  });

  it('the intent defaults to the main action, and "main" says the same out loud', () => {
    const game = setup();
    plow(game, 'p1', 2, 4);
    act(game, 'p2', 2, 4);
    act(game, 'p2', 2, 4, 'main');
    expect(tileAt(game, 2, 4)).toMatchObject({ terrain: 'field', stock: 10, work: 0 });
  });
});

describe('preview: alternative', () => {
  it('a field offers demolishing beside the harvest', () => {
    const game = setup();
    plow(game, 'p1', 2, 4);
    expect(game.preview('p2', 2, 4)).toEqual({
      kind: 'harvest',
      available: true,
      yield: { type: 'resource', resource: 'food', amount: 10 },
      alternative: { kind: 'demolish', available: true, yield: { type: 'work', amount: 1, done: 0, needed: 3 } },
    });
  });

  it('shows the work done so far', () => {
    const game = setup();
    plow(game, 'p1', 2, 4);
    demolish(game, 'p2', 2, 4, 2);
    expect(game.preview('p3', 2, 4).alternative?.yield).toEqual({ type: 'work', amount: 1, done: 2, needed: 3 });
  });

  it('stays available on an empty field, whose harvest is refused', () => {
    const game = setup();
    plow(game, 'p1', 2, 4);
    for (let i = 0; i < 3; i++) act(game, 'p2', 2, 4);
    const preview = game.preview('p3', 2, 4);
    expect(preview).toMatchObject({ kind: 'harvest', available: false, reason: 'field-empty' });
    expect(preview.alternative).toMatchObject({ kind: 'demolish', available: true });
    expect(preview.alternative).not.toHaveProperty('reason');
  });

  it('respects the energy, phase and removal refusals like any action', () => {
    const game = setup();
    plow(game, 'p1', 2, 4);
    expect(game.preview('p1', 2, 4).alternative).toMatchObject({ available: false, reason: 'no-actions-left' });
    game.removePlayer('p3');
    expect(game.preview('p3', 2, 4).alternative).toMatchObject({ available: false, reason: 'removed' });
    game.endActionPhase();
    expect(game.preview('p2', 2, 4).alternative).toMatchObject({ available: false, reason: 'wrong-phase' });
  });

  it('appears only on field tiles', () => {
    const game = setup({ params: freeBuildingParams() });
    buildByVote(game, 'shelter-1');
    const igloo = game.tiles().find((t) => t.building)!;
    const others = [
      { x: 4, y: 5, what: 'snow field' },
      { x: 3, y: 4, what: 'forest' },
      { x: 3, y: 6, what: 'sea' },
      { x: 3, y: 3, what: 'fog' },
      { x: 3, y: 5, what: 'landing' },
      { x: igloo.x, y: igloo.y, what: 'igloo' },
    ];
    for (const { x, y, what } of others) expect(game.preview('p1', x, y), what).not.toHaveProperty('alternative');
    expect(game.preview('p1', 99, 0)).not.toHaveProperty('alternative');
  });
});

describe('preview: freeMeadowsAfter', () => {
  it('appears only when this greenhouse leaves meadowWarningAt or fewer free snow fields', () => {
    // SMALL_ISLAND shows (2,4), (4,4), (2,5) and (4,5); more snow fields wait under the fog.
    const game = setup();
    expect(game.preview('p1', 2, 4)).not.toHaveProperty('freeMeadowsAfter'); // would leave 3
    plow(game, 'p1', 4, 5);
    expect(game.preview('p2', 2, 4).freeMeadowsAfter).toBe(2);
    plow(game, 'p2', 4, 4);
    expect(game.preview('p3', 2, 4).freeMeadowsAfter).toBe(1);
    plow(game, 'p3', 2, 5);
    expect(game.preview('p1', 2, 4).freeMeadowsAfter).toBe(0);
  });

  it('never counts the landing, even though it is a snow field', () => {
    const game = setup({ map: TINY });
    expect(game.preview('p1', 1, 1).freeMeadowsAfter).toBe(1);
    expect(game.preview('p1', 2, 1)).not.toHaveProperty('freeMeadowsAfter');
  });

  it('counts a half-plowed snow field as free, like the vote does', () => {
    const game = setup({ map: TINY });
    act(game, 'p1', 3, 1);
    expect(game.preview('p2', 1, 1).freeMeadowsAfter).toBe(1);
  });

  it('does not count a snow field with a building on it', () => {
    const game = setup({ params: freeBuildingParams() });
    buildByVote(game, 'shelter-1'); // takes one of the four free snow fields
    const free = game.tiles().find((t) => !t.fog && t.terrain === 'meadow' && !t.building && (t.x !== 3 || t.y !== 5))!;
    expect(game.preview('p1', free.x, free.y).freeMeadowsAfter).toBe(2);
  });

  it('is on plow previews only', () => {
    const game = setup({ map: ONE_FREE });
    expect(game.preview('p1', 3, 1)).toMatchObject({ kind: 'plow', freeMeadowsAfter: 0 });
    expect(game.preview('p1', 1, 1)).toMatchObject({ kind: 'chop' });
    expect(game.preview('p1', 1, 1)).not.toHaveProperty('freeMeadowsAfter');
    plow(game, 'p1', 3, 1);
    expect(game.preview('p2', 3, 1)).toMatchObject({ kind: 'harvest' });
    expect(game.preview('p2', 3, 1)).not.toHaveProperty('freeMeadowsAfter');
  });

  it('warns but never blocks: the last snow field can still be plowed', () => {
    const game = setup({ map: ONE_FREE });
    expect(game.preview('p1', 3, 1).available).toBe(true);
    plow(game, 'p1', 3, 1);
    expect(tileAt(game, 3, 1).terrain).toBe('field');
  });

  it('follows the meadowWarningAt param', () => {
    const game = setup({ params: { ...freeBuildingParams(), meadowWarningAt: 3 } });
    expect(game.preview('p1', 2, 4).freeMeadowsAfter).toBe(3);
  });
});
