import { describe, expect, it } from 'vitest';
import { Game } from '../src/game.ts';
import { setup, terrainFromAscii, tileAt, SMALL_ISLAND } from './helpers.ts';

describe('lobby', () => {
  it('starts in the lobby with no players', () => {
    const game = new Game({ seed: 1, length: 'normal', terrain: terrainFromAscii(SMALL_ISLAND) });
    expect(game.phase).toBe('lobby');
    expect(game.month).toBe(0);
    expect(game.playerIds()).toEqual([]);
  });

  it('adds players and rejects duplicate ids', () => {
    const game = setup({ start: false, players: 2 });
    expect(game.playerIds()).toEqual(['p1', 'p2']);
    expect(game.addPlayer('p1')).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('refuses to start without players', () => {
    const game = setup({ start: false, players: 0 });
    expect(() => game.start()).toThrow();
  });

  it('start() moves to the action phase of month 1', () => {
    const game = setup({ players: 3 });
    expect(game.phase).toBe('action');
    expect(game.month).toBe(1);
    expect(game.totalMonths).toBe(15);
  });

  it('a short game lasts 10 months', () => {
    expect(setup({ length: 'short' }).totalMonths).toBe(10);
  });

  it('counts every lobby player as a villager', () => {
    expect(setup({ players: 3 }).villagers).toBe(3);
  });

  it('gives one month of food and exactly the price of a level-1 shelter in wood', () => {
    const game = setup({ players: 3 });
    // Food 4 x 3 = 12. Wood 4 x 3 = 12 rounded up to 5 like every price = 15.
    expect(game.resources).toEqual({ food: 12, wood: 15, stone: 0 });
    const shelter = game.voteOptions().find((o) => o.id === 'shelter-1');
    expect(shelter?.cost.wood).toBe(15);
  });

  it('cannot start twice', () => {
    const game = setup();
    expect(() => game.start()).toThrow();
  });
});

describe('initial fog', () => {
  it('reveals the landing and its 8 neighbours and nothing else on land', () => {
    const game = setup();
    // Landing (3,5): neighbours x 2..4, y 4..6.
    for (let y = 4; y <= 6; y++) {
      for (let x = 2; x <= 4; x++) expect(tileAt(game, x, y).fog).toBe(false);
    }
    expect(tileAt(game, 3, 3).fog).toBe(true);
    expect(tileAt(game, 1, 4).fog).toBe(true);
  });

  it('also reveals sea next to every revealed land tile', () => {
    const game = setup();
    // (2,4) is revealed meadow; its sea neighbours (1,5) and (1,3)? (1,3) is meadow. (1,5) is sea.
    expect(tileAt(game, 1, 5).fog).toBe(false);
    // (5,5) is sea next to revealed (4,4) and (4,5).
    expect(tileAt(game, 5, 5).fog).toBe(false);
    // Far sea stays fogged.
    expect(tileAt(game, 0, 0).fog).toBe(true);
  });

  it('hides the true terrain of fogged tiles in the public view', () => {
    const game = setup();
    expect(game.publicTile(3, 1)).toMatchObject({ fog: true, terrain: null });
    expect(game.publicTile(3, 5)).toMatchObject({ fog: false, terrain: 'meadow' });
  });
});
