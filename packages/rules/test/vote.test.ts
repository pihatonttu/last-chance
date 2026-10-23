import { describe, expect, it } from 'vitest';
import { RULE_TEST_PARAMS as DEFAULT_PARAMS } from './params.ts';
import { act, buildByVote, finishMonth, freeBuildingParams, setup, tileAt, withoutLoss } from './helpers.ts';

const ids = (game: ReturnType<typeof setup>) => game.voteOptions().map((o) => o.id);

describe('vote options', () => {
  it('offers only a shelter (and nothing) before the first shelter exists', () => {
    const game = setup();
    expect(ids(game)).toEqual(['none', 'shelter-1']);
  });

  it('opens school, workshop and gathering place after the first shelter', () => {
    const game = setup({ params: freeBuildingParams() });
    buildByVote(game, 'shelter-1');
    expect(ids(game)).toEqual(['none', 'shelter-1', 'shelter-2', 'school-1', 'workshop-1', 'gathering-1']);
  });

  it('offers the next level of a built school and drops the built one', () => {
    const game = setup({ params: freeBuildingParams() });
    buildByVote(game, 'shelter-1');
    buildByVote(game, 'school-1');
    expect(ids(game)).toContain('school-2');
    expect(ids(game)).not.toContain('school-1');
  });

  it('prices are per villager x N rounded up to 5', () => {
    const game = setup({ players: 7 });
    // Shelter level 1: 4 ice x 7 = 28 -> 30.
    expect(game.voteOptions().find((o) => o.id === 'shelter-1')?.cost).toEqual({ wood: 0, stone: 30 });
  });

  it('marks options the village cannot afford', () => {
    const params = {
      ...DEFAULT_PARAMS,
      costs: { ...DEFAULT_PARAMS.costs, shelter: [{ wood: 100, stone: 100 }, ...DEFAULT_PARAMS.costs.shelter.slice(1)] as never },
    };
    const game = setup({ params });
    expect(game.voteOptions().find((o) => o.id === 'shelter-1')?.blocked).toEqual(['wood', 'stone']);
  });

  it('marks a new building as blocked when no free meadow is revealed', () => {
    // The landing (the fire) is the only meadow; a cleared forest makes room for one shelter.
    const map = ['~~~~~', '~TTT~', '~TLT~', '~~~~~'];
    const game = setup({ map, params: freeBuildingParams() });
    for (const p of ['p1', 'p1', 'p1', 'p2']) act(game, p, 1, 2); // 4 x 10 wood clears it
    expect(tileAt(game, 1, 2).terrain).toBe('meadow');
    buildByVote(game, 'shelter-1');
    expect(tileAt(game, 1, 2).building).toEqual({ kind: 'shelter', level: 1 });
    expect(game.voteOptions().find((o) => o.id === 'school-1')?.blocked).toEqual(['space']);
    // Upgrades need no new space.
    expect(game.voteOptions().find((o) => o.id === 'shelter-2')?.blocked).toEqual([]);
  });
});

describe('casting votes', () => {
  it('only works in the vote phase', () => {
    const game = setup();
    expect(game.vote('p1', 'shelter-1')).toEqual({ ok: false, reason: 'wrong-phase' });
  });

  it('rejects unknown and blocked options', () => {
    // No meadow but the landing: the first shelter has no space.
    const map = ['~~~~~', '~TTT~', '~TLT~', '~~~~~'];
    const game = setup({ map, params: freeBuildingParams() });
    game.endActionPhase();
    expect(game.vote('p1', 'castle-9')).toEqual({ ok: false, reason: 'unknown-option' });
    expect(game.vote('p1', 'shelter-1')).toEqual({ ok: false, reason: 'blocked' });
  });

  it('lets a player change the vote; only the last one counts', () => {
    const game = setup();
    game.endActionPhase();
    game.vote('p1', 'shelter-1');
    game.vote('p1', 'none');
    expect(game.voteCounts()).toEqual({ none: 1, 'shelter-1': 0 });
    expect(game.allVoted()).toBe(false);
  });
});

describe('vote result', () => {
  it('builds the plurality winner, pays the price and logs it', () => {
    const game = setup();
    game.endActionPhase();
    game.vote('p1', 'shelter-1');
    game.vote('p2', 'shelter-1');
    game.vote('p3', 'none');
    const report = game.endVotePhase();
    // Next to the landing, which is the fire; the igloo uses up the 15 ice.
    expect(report.vote).toMatchObject({ outcome: 'built', option: 'shelter-1', x: 2, y: 4 });
    expect(tileAt(game, 2, 4).building).toEqual({ kind: 'shelter', level: 1 });
    expect(game.resources.stone).toBe(0);
  });

  it('builds nothing and charges nothing on a tie at the top', () => {
    const game = setup({ players: 2 });
    game.endActionPhase();
    game.vote('p1', 'shelter-1');
    game.vote('p2', 'none');
    const report = game.endVotePhase();
    expect(report.vote).toMatchObject({ outcome: 'tie' });
    expect(game.resources.stone).toBe(10);
    expect(game.tiles().some((t) => t.building)).toBe(false);
  });

  it('builds nothing when "none" wins or nobody votes', () => {
    const a = setup();
    a.endActionPhase();
    a.vote('p1', 'none');
    expect(a.endVotePhase().vote.outcome).toBe('none');

    const b = setup();
    b.endActionPhase();
    expect(b.endVotePhase().vote.outcome).toBe('no-votes');
  });

  it('places new buildings on the nearest free meadow, unplowed first, then by row and column', () => {
    const game = setup({ params: freeBuildingParams() });
    act(game, 'p1', 2, 4); // start plowing (2,4)
    const report = finishMonth(game, { p1: 'shelter-1', p2: 'shelter-1', p3: 'shelter-1' });
    // Distance-1 meadows besides the landing: (2,4) plowed, (4,4), (2,5), (4,5).
    // Unplowed first, then row, then column.
    expect(report.vote).toMatchObject({ x: 4, y: 4 });
  });

  it('upgrades a building in place', () => {
    const game = setup({ params: freeBuildingParams() });
    buildByVote(game, 'shelter-1');
    const report = buildByVote(game, 'shelter-2');
    expect(report.vote).toMatchObject({ outcome: 'built', option: 'shelter-2', x: 2, y: 4 });
    expect(tileAt(game, 2, 4).building).toEqual({ kind: 'shelter', level: 2 });
  });

  it('voting for an upgrade picks the matching building nearest the landing', () => {
    // Landing (3,3); the only meadow next to it is (4,4), a row below the far meadow (1,1).
    const map = ['~~~~~~~', '~.TTTT~', '~TTTTT~', '~TTLTT~', '~TTT.T~', '~~~~~~~'];
    const game = setup({ map, params: withoutLoss(freeBuildingParams()) });
    buildByVote(game, 'shelter-1'); // (4,4)
    act(game, 'p1', 1, 1); // explore (1,1): 1 + floor(2 / 2) = 2 work
    act(game, 'p1', 1, 1);
    buildByVote(game, 'shelter-1'); // (1,1), distance 2
    buildByVote(game, 'shelter-2'); // upgrades (4,4)
    buildByVote(game, 'shelter-3'); // upgrades (4,4) again
    buildByVote(game, 'shelter-2'); // now upgrades (1,1)
    expect(tileAt(game, 4, 4).building).toEqual({ kind: 'shelter', level: 3 });
    expect(tileAt(game, 1, 1).building).toEqual({ kind: 'shelter', level: 2 });
  });
});
