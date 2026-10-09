import { describe, expect, it } from 'vitest';
import type { Game } from '../src/game.ts';
import { act, buildByVote, freeBuildingParams, setup } from './helpers.ts';

function findBuilding(game: Game, kind: string) {
  const tile = game.tiles().find((t) => t.building?.kind === kind);
  if (!tile) throw new Error(`no ${kind} on the map`);
  return tile;
}

/** Month 1: shelter on the landing. Month 2: the given building on the next meadow. */
function withBuilding(kind: 'school' | 'workshop', players = 3) {
  const game = setup({ players, params: freeBuildingParams() });
  buildByVote(game, 'shelter-1');
  buildByVote(game, `${kind}-1`);
  return { game, tile: findBuilding(game, kind) };
}

describe('school', () => {
  it('3 study actions at a level-1 school raise education to 2 and give an extra action at once', () => {
    const { game, tile } = withBuilding('school');
    act(game, 'p1', tile.x, tile.y);
    act(game, 'p1', tile.x, tile.y);
    expect(game.player('p1')).toMatchObject({ education: 1, educationProgress: 2 });
    act(game, 'p1', tile.x, tile.y);
    expect(game.player('p1')).toMatchObject({ education: 2, educationProgress: 0, maxActions: 4, actionsLeft: 1 });
    expect(game.log.find((e) => e.type === 'level-up')).toMatchObject({ player: 'p1', skill: 'education', level: 2 });
  });

  it('the next level needs 3 x the current level of progress', () => {
    const { game, tile } = withBuilding('school');
    expect(game.preview('p1', tile.x, tile.y).yield).toEqual({
      type: 'progress',
      skill: 'education',
      amount: 1,
      done: 0,
      needed: 3,
      level: 1,
    });
  });

  it('a level-2 school gives 2 progress per action', () => {
    const { game, tile } = withBuilding('school');
    buildByVote(game, 'school-2');
    expect(game.tile(tile.x, tile.y)?.building).toEqual({ kind: 'school', level: 2 });
    act(game, 'p1', tile.x, tile.y);
    expect(game.player('p1')?.educationProgress).toBe(2);
  });

  it('education stops at level 4', () => {
    const { game, tile } = withBuilding('school');
    buildByVote(game, 'school-2');
    buildByVote(game, 'school-3');
    // Level-3 school: +3 per action. Needs 3, 6, 9 => 1 + 2 + 3 actions = 6 actions.
    const use = () => act(game, 'p1', tile.x, tile.y);
    use(); // 3 -> level 2 (4 actions)
    use();
    use(); // 6 -> level 3 (5 actions)
    use();
    use();
    expect(game.player('p1')).toMatchObject({ education: 3, educationProgress: 6 });
    // Month ends; next month finish level 4.
    buildByVote(game, 'none');
    use(); // 9 -> level 4
    expect(game.player('p1')).toMatchObject({ education: 4, maxActions: 6 });
    expect(game.act('p1', tile.x, tile.y)).toEqual({ ok: false, reason: 'max-level' });
  });
});

describe('workshop', () => {
  it('tools level 2 raises every yield by 25 %', () => {
    const { game, tile } = withBuilding('workshop');
    for (let i = 0; i < 3; i++) act(game, 'p1', tile.x, tile.y);
    expect(game.player('p1')?.tools).toBe(2);
    buildByVote(game, 'none');
    // Forest (3,4) next to the landing: round(10 * 1.25) = 13.
    expect(game.preview('p1', 3, 4).yield).toEqual({ type: 'resource', resource: 'wood', amount: 13 });
    const before = game.resources.wood;
    act(game, 'p1', 3, 4);
    expect(game.resources.wood).toBe(before + 13);
  });

  it('tools also speed up work such as plowing', () => {
    const { game, tile } = withBuilding('workshop');
    for (let i = 0; i < 3; i++) act(game, 'p1', tile.x, tile.y);
    buildByVote(game, 'none');
    const meadow = game.tiles().find((t) => t.terrain === 'meadow' && !t.fog && !t.building);
    if (!meadow) throw new Error('no free meadow');
    act(game, 'p1', meadow.x, meadow.y);
    expect(game.tile(meadow.x, meadow.y)?.work).toBe(1.25);
  });
});

describe('shelter', () => {
  it('has no action', () => {
    const game = setup({ params: freeBuildingParams() });
    buildByVote(game, 'shelter-1');
    expect(game.act('p1', 3, 5)).toEqual({ ok: false, reason: 'no-action' });
  });
});
