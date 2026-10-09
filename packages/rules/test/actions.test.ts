import { describe, expect, it } from 'vitest';
import { act, setup, tileAt } from './helpers.ts';

/**
 * Rock and spring close to the landing (3,3).
 *   x: 012345
 *   0  ~~~~~~
 *   1  ~T.o.~
 *   2  ~.^T.~
 *   3  ~T.L.~
 *   4  ~~~~~~
 */
const ROCK_MAP = ['~~~~~~', '~T.o.~', '~.^T.~', '~T.L.~', '~~~~~~'];

describe('explore', () => {
  it('needs 1 + floor(distance / 2) work and reveals the tile when done', () => {
    const game = setup();
    // (3,3) is forest at distance 2 from the landing (3,5): needs 2 work.
    act(game, 'p1', 3, 3);
    expect(tileAt(game, 3, 3).fog).toBe(true);
    expect(tileAt(game, 3, 3).exploreWork).toBe(1);
    act(game, 'p2', 3, 3);
    expect(tileAt(game, 3, 3).fog).toBe(false);
    expect(game.publicTile(3, 3)).toMatchObject({ terrain: 'forest' });
  });

  it('only allows fog that touches a revealed tile (8 neighbours)', () => {
    const game = setup();
    expect(game.act('p1', 3, 1)).toEqual({ ok: false, reason: 'not-explorable' });
  });

  it('reveals the sea around a newly revealed tile', () => {
    const game = setup();
    // (1,4) forest, distance 2 -> 2 work. Its sea neighbours (0,3),(0,4),(0,5) start fogged.
    expect(tileAt(game, 0, 4).fog).toBe(true);
    act(game, 'p1', 1, 4);
    act(game, 'p1', 1, 4);
    expect(tileAt(game, 1, 4).fog).toBe(false);
    expect(tileAt(game, 0, 3).fog).toBe(false);
    expect(tileAt(game, 0, 4).fog).toBe(false);
    expect(tileAt(game, 0, 5).fog).toBe(false);
  });

  it('logs the revealed tile and the spring discovery', () => {
    const game = setup({ map: ROCK_MAP });
    act(game, 'p1', 3, 1);
    act(game, 'p2', 3, 1);
    const types = game.log.map((e) => e.type);
    expect(types).toContain('tile-revealed');
    expect(game.log.find((e) => e.type === 'spring-found')).toMatchObject({ player: 'p2', x: 3, y: 1 });
  });
});

describe('meadow and field', () => {
  it('plowing a meadow 3 times turns it into a full field', () => {
    const game = setup();
    act(game, 'p1', 2, 4);
    act(game, 'p1', 2, 4);
    expect(tileAt(game, 2, 4).terrain).toBe('meadow');
    expect(tileAt(game, 2, 4).work).toBe(2);
    act(game, 'p1', 2, 4);
    expect(tileAt(game, 2, 4)).toMatchObject({ terrain: 'field', stock: 30, work: 0 });
  });

  it('harvesting takes 10 food from the field until it is empty', () => {
    const game = setup();
    for (let i = 0; i < 3; i++) act(game, 'p1', 2, 4);
    const before = game.resources.food;
    act(game, 'p2', 2, 4);
    expect(game.resources.food).toBe(before + 10);
    expect(tileAt(game, 2, 4).stock).toBe(20);
    act(game, 'p2', 2, 4);
    act(game, 'p2', 2, 4);
    expect(tileAt(game, 2, 4).stock).toBe(0);
    expect(game.act('p3', 2, 4)).toEqual({ ok: false, reason: 'field-empty' });
  });
});

describe('sea', () => {
  it('fishing in coastal sea gives 5 food', () => {
    const game = setup();
    const before = game.resources.food;
    act(game, 'p1', 3, 6);
    expect(game.resources.food).toBe(before + 5);
  });

  it('cannot fish in deep sea with no land next to it', () => {
    const game = setup();
    // Reveal (0,6) by exploring it from the revealed sea at (1,5).
    act(game, 'p1', 0, 6);
    act(game, 'p1', 0, 6);
    expect(tileAt(game, 0, 6).fog).toBe(false);
    expect(game.act('p2', 0, 6)).toEqual({ ok: false, reason: 'deep-sea' });
  });
});

describe('forest', () => {
  it('chopping gives 10 wood and a cleared forest becomes a meadow', () => {
    const game = setup({ players: 2 });
    const before = game.resources.wood;
    act(game, 'p1', 3, 4);
    expect(game.resources.wood).toBe(before + 10);
    expect(tileAt(game, 3, 4).stock).toBe(30);
    act(game, 'p1', 3, 4);
    act(game, 'p1', 3, 4);
    act(game, 'p2', 3, 4);
    expect(tileAt(game, 3, 4)).toMatchObject({ terrain: 'meadow', stock: 0 });
    expect(game.log.some((e) => e.type === 'forest-cleared')).toBe(true);
  });
});

describe('rock and quarry', () => {
  it('4 work turns a rock into a quarry with 60 stone', () => {
    const game = setup({ map: ROCK_MAP, players: 2 });
    for (let i = 0; i < 3; i++) act(game, 'p1', 2, 2);
    expect(tileAt(game, 2, 2).terrain).toBe('rock');
    act(game, 'p2', 2, 2);
    expect(tileAt(game, 2, 2)).toMatchObject({ terrain: 'quarry', stock: 60 });
  });

  it('a quarry yields less stone as it empties, at least 2', () => {
    const game = setup({ map: ROCK_MAP, players: 4 });
    for (let i = 0; i < 3; i++) act(game, 'p1', 2, 2);
    act(game, 'p2', 2, 2);
    act(game, 'p2', 2, 2); // full: round(8 * 60/60) = 8
    expect(game.resources.stone).toBe(8);
    act(game, 'p2', 2, 2); // round(8 * 52/60) = 7
    expect(game.resources.stone).toBe(15);
    expect(tileAt(game, 2, 2).stock).toBe(45);
  });
});

describe('spring', () => {
  it('swimming counts recreation and is limited to max(1, round(N/6)) uses a month', () => {
    const game = setup({ map: ROCK_MAP, players: 3 });
    act(game, 'p1', 3, 1);
    act(game, 'p1', 3, 1);
    act(game, 'p2', 3, 1);
    expect(game.recreationThisMonth).toBe(1);
    expect(game.act('p3', 3, 1)).toEqual({ ok: false, reason: 'no-uses-left' });
  });
});

describe('action limits and validation', () => {
  it('each player has 3 actions a month', () => {
    const game = setup();
    act(game, 'p1', 3, 6);
    act(game, 'p1', 3, 6);
    act(game, 'p1', 3, 6);
    expect(game.act('p1', 3, 6)).toEqual({ ok: false, reason: 'no-actions-left' });
    expect(game.player('p1')).toMatchObject({ actionsLeft: 0, maxActions: 3 });
  });

  it('refuses unknown players, tiles outside the map and the wrong phase', () => {
    const game = setup();
    expect(game.act('nobody', 3, 6)).toEqual({ ok: false, reason: 'unknown-player' });
    expect(game.act('p1', 99, 0)).toEqual({ ok: false, reason: 'out-of-bounds' });
    game.endActionPhase();
    expect(game.act('p1', 3, 6)).toEqual({ ok: false, reason: 'wrong-phase' });
  });

  it('a refused action does not use up an action', () => {
    const game = setup();
    game.act('p1', 3, 1);
    expect(game.player('p1')?.actionsLeft).toBe(3);
  });
});

describe('preview', () => {
  it('describes the yield of the next action without changing anything', () => {
    const game = setup();
    expect(game.preview('p1', 3, 4)).toEqual({
      kind: 'chop',
      available: true,
      yield: { type: 'resource', resource: 'wood', amount: 10 },
    });
    expect(game.preview('p1', 3, 3)).toEqual({
      kind: 'explore',
      available: true,
      yield: { type: 'work', amount: 1, done: 0, needed: 2 },
    });
    expect(game.preview('p1', 3, 1)).toMatchObject({ kind: 'explore', available: false, reason: 'not-explorable' });
    expect(game.resources.wood).toBe(15);
  });

  it('caps the previewed yield at what is left', () => {
    const game = setup();
    for (let i = 0; i < 3; i++) act(game, 'p1', 2, 4);
    act(game, 'p2', 2, 4);
    act(game, 'p2', 2, 4);
    // Field has 10 left.
    expect(game.preview('p3', 2, 4).yield).toEqual({ type: 'resource', resource: 'food', amount: 10 });
  });
});
