/**
 * The numbers on the vote cards against a real game: the homes a card promises are the number the
 * top bar shows once it is built, and the mood a gathering card promises is the mood the engine
 * gives when every use is taken (docs/12-selkeys.md §3).
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS, Game, type Level, type MonthReport, type NaturalTerrain, type TerrainMap } from '@saari/rules';
import { gatheringMood, gatheringUses } from '../src/lib/rules-info.ts';
import { optionCard } from '../src/lib/vote.ts';

const FREE = { wood: 0, stone: 0 } as const;

/** A small island with meadows around the landing (L), so every month can build somewhere new. */
const ISLAND = ['~~~~~~~', '~^To^T~', '~TT.TT~', '~..T..~', '~T.T.T~', '~~.L.~~', '~~~~~~~'];
const LEGEND: Record<string, NaturalTerrain> = { '~': 'sea', '.': 'meadow', T: 'forest', '^': 'rock', o: 'spring', L: 'meadow' };

function island(): TerrainMap {
  const terrain = ISLAND.flatMap((row) => [...row].map((ch) => LEGEND[ch]!));
  const y = ISLAND.findIndex((row) => row.includes('L'));
  return { width: ISLAND[0]!.length, height: ISLAND.length, terrain, landing: { x: ISLAND[y]!.indexOf('L'), y } };
}

/** A started game of `villagers` players where building costs nothing and the village cannot lose. */
function newGame(villagers: number): Game {
  const params = {
    ...DEFAULT_PARAMS,
    costs: { shelter: [FREE, FREE, FREE], school: [FREE, FREE, FREE], workshop: [FREE, FREE, FREE], gathering: [FREE, FREE, FREE] },
    lossThreshold: { normal: -Infinity, short: -Infinity },
  } as const;
  const game = new Game({ seed: 7, length: 'normal', params, terrain: island() });
  for (let i = 1; i <= villagers; i++) game.addPlayer(`p${i}`);
  game.start();
  return game;
}

/** End the action phase, let everyone vote for `option`, resolve the month and open the next one. */
function build(game: Game, option: string): MonthReport {
  game.endActionPhase();
  for (const id of game.playerIds()) {
    const result = game.vote(id, option);
    if (!result.ok) throw new Error(`${id} could not vote for ${option}: ${result.reason}`);
  }
  const report = game.endVotePhase();
  game.nextMonth();
  return report;
}

/** Every player takes one use of the place at (x, y) until it is full; returns how many uses were taken. */
function fill(game: Game, x: number, y: number): number {
  let taken = 0;
  for (const id of game.playerIds()) {
    if (game.act(id, x, y).ok) taken += 1;
  }
  return taken;
}

describe('home cards against the top bar', () => {
  // [homes now, homes after] for the small igloo, the igloo and the big igloo, one built after the other.
  const HOMES: Record<number, [number, number][]> = {
    15: [[0, 2], [2, 5], [5, 7]],
    20: [[0, 3], [3, 7], [7, 10]],
    30: [[0, 5], [5, 10], [10, 15]],
  };

  it.each([15, 20, 30])('at %i villagers the card says what the top bar shows afterwards', (villagers) => {
    const game = newGame(villagers);
    ['shelter-1', 'shelter-2', 'shelter-3'].forEach((id, step) => {
      const now = game.shelterCapacity();
      const option = game.voteOptions().find((o) => o.id === id)!;
      const card = optionCard(option, { villagers, shelterCapacity: now });
      expect(card.benefit, id).toBe(`Kotipaikkoja ${now} → ${option.shelterAfter}`);
      expect([now, option.shelterAfter], id).toEqual(HOMES[villagers]![step]);
      build(game, id);
      expect(game.shelterCapacity(), id).toBe(option.shelterAfter);
    });
  });

  it('keeps matching when igloos of different levels stand together', () => {
    for (const villagers of [15, 20, 30]) {
      const game = newGame(villagers);
      for (const id of ['shelter-1', 'shelter-1', 'shelter-2', 'shelter-1', 'shelter-2', 'shelter-3']) {
        const now = game.shelterCapacity();
        const option = game.voteOptions().find((o) => o.id === id)!;
        expect(optionCard(option, { villagers, shelterCapacity: now }).benefit).toBe(`Kotipaikkoja ${now} → ${option.shelterAfter}`);
        build(game, id);
        expect(game.shelterCapacity(), `${id} at ${villagers}`).toBe(option.shelterAfter);
      }
    }
  });
});

describe('gathering cards against the engine', () => {
  it.each([15, 20, 30])('at %i villagers a full gathering place gives the month the mood the card says', (villagers) => {
    const game = newGame(villagers);
    build(game, 'shelter-1');
    const placed = build(game, 'gathering-1');
    expect(placed.vote).toMatchObject({ outcome: 'built', option: 'gathering-1' });
    const { x, y } = placed.vote as { x: number; y: number };

    // Each month: take every use of the place as it stands, then build the next level in the vote.
    const next = ['gathering-2', 'gathering-3', 'none'];
    for (const level of [1, 2, 3] as Level[]) {
      const uses = fill(game, x, y);
      expect(uses, `uses of level ${level}`).toBe(gatheringUses(level, villagers));
      const report = build(game, next[level - 1]!);
      expect(report.mood.recreation, `level ${level} at ${villagers}`).toBe(gatheringMood(level, villagers));
    }
  });

  it('the card promises the mood of the engine for the building it replaces and the one it makes', () => {
    for (const villagers of [15, 20, 30]) {
      const game = newGame(villagers);
      build(game, 'shelter-1');
      build(game, 'gathering-1');
      const option = game.voteOptions().find((o) => o.id === 'gathering-2')!;
      const card = optionCard(option, { villagers, shelterCapacity: game.shelterCapacity() });
      expect(card.benefit).toBe(`Tyytyväisyyttä jopa +${gatheringMood(1, villagers)} → +${gatheringMood(2, villagers)} kuussa`);
    }
  });
});
