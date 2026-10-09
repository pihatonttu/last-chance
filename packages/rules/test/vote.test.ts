import { describe, expect, it } from 'vitest';
import { RULE_TEST_PARAMS as DEFAULT_PARAMS } from './params.ts';
import { act, buildByVote, finishMonth, freeBuildingParams, setup, tileAt } from './helpers.ts';

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
    // Shelter level 1: 4 x 7 = 28 -> 30.
    expect(game.voteOptions().find((o) => o.id === 'shelter-1')?.cost).toEqual({ wood: 30, stone: 0 });
  });

  it('marks options the village cannot afford', () => {
    const params = {
      ...DEFAULT_PARAMS,
      costs: { ...DEFAULT_PARAMS.costs, shelter: [{ wood: 100, stone: 1 }, ...DEFAULT_PARAMS.costs.shelter.slice(1)] as never },
    };
    const game = setup({ params });
    expect(game.voteOptions().find((o) => o.id === 'shelter-1')?.blocked).toEqual(['wood', 'stone']);
  });

  it('marks a new building as blocked when no free meadow is revealed', () => {
    // Landing is the only meadow; after a shelter is built on it there is no space.
    const map = ['~~~~~', '~TTT~', '~TLT~', '~~~~~'];
    const game = setup({ map, params: freeBuildingParams() });
    buildByVote(game, 'shelter-1');
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
    const map = ['~~~~~', '~TTT~', '~TLT~', '~~~~~'];
    const game = setup({ map, params: freeBuildingParams() });
    buildByVote(game, 'shelter-1');
    game.endActionPhase();
    expect(game.vote('p1', 'castle-9')).toEqual({ ok: false, reason: 'unknown-option' });
    expect(game.vote('p1', 'school-1')).toEqual({ ok: false, reason: 'blocked' });
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
    expect(report.vote).toMatchObject({ outcome: 'built', option: 'shelter-1', x: 3, y: 5 });
    expect(tileAt(game, 3, 5).building).toEqual({ kind: 'shelter', level: 1 });
    expect(game.resources.wood).toBe(0);
  });

  it('builds nothing and charges nothing on a tie at the top', () => {
    const game = setup({ players: 2 });
    game.endActionPhase();
    game.vote('p1', 'shelter-1');
    game.vote('p2', 'none');
    const report = game.endVotePhase();
    expect(report.vote).toMatchObject({ outcome: 'tie' });
    expect(game.resources.wood).toBe(10);
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
    buildByVote(game, 'shelter-1'); // landing (3,5)
    act(game, 'p1', 2, 4); // start plowing (2,4)
    const report = finishMonth(game, { p1: 'shelter-1', p2: 'shelter-1', p3: 'shelter-1' });
    // Distance-1 meadows: (2,4) plowed, (4,4), (2,5), (4,5). Unplowed first, then row, then column.
    expect(report.vote).toMatchObject({ x: 4, y: 4 });
  });

  it('upgrades a building in place', () => {
    const game = setup({ params: freeBuildingParams() });
    buildByVote(game, 'shelter-1');
    const report = buildByVote(game, 'shelter-2');
    expect(report.vote).toMatchObject({ outcome: 'built', option: 'shelter-2', x: 3, y: 5 });
    expect(tileAt(game, 3, 5).building).toEqual({ kind: 'shelter', level: 2 });
  });

  it('voting for an upgrade picks the matching building nearest the landing', () => {
    const game = setup({ params: freeBuildingParams() });
    buildByVote(game, 'shelter-1'); // (3,5)
    buildByVote(game, 'shelter-1'); // (2,4)
    buildByVote(game, 'shelter-2'); // upgrades (3,5)
    buildByVote(game, 'shelter-3'); // upgrades (3,5) again
    buildByVote(game, 'shelter-2'); // now upgrades (2,4)
    expect(tileAt(game, 3, 5).building).toEqual({ kind: 'shelter', level: 3 });
    expect(tileAt(game, 2, 4).building).toEqual({ kind: 'shelter', level: 2 });
  });
});
