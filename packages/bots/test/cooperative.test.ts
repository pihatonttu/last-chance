import { createRng, DEFAULT_PARAMS, Game, type GameParams, type TerrainMap } from '@saari/rules';
import { describe, expect, it } from 'vitest';
import { createBot, plannedBuilding } from '../src/index.ts';

/** Landing (3,5). Rock and spring are far away in the north. */
const TERRAIN: TerrainMap = (() => {
  const rows = ['~~~~~~~', '~^To^T~', '~TT.TT~', '~..T..~', '~T.T.T~', '~~...~~', '~~~~~~~'];
  const legend = { '~': 'sea', '.': 'meadow', T: 'forest', '^': 'rock', o: 'spring' } as const;
  const terrain = rows.flatMap((r) => [...r].map((c) => legend[c as keyof typeof legend]));
  return { width: 7, height: 7, terrain, landing: { x: 3, y: 5 } };
})();

const FREE = [
  { wood: 0, stone: 0 },
  { wood: 0, stone: 0 },
  { wood: 0, stone: 0 },
] as const;

function newGame(params: GameParams = DEFAULT_PARAMS, players = ['a', 'b', 'c']) {
  const game = new Game({ seed: 1, length: 'normal', terrain: TERRAIN, params });
  for (const p of players) game.addPlayer(p);
  game.start();
  return game;
}

const bot = createBot('cooperative', { noise: 0 });
const rng = createRng(1);

function nextKind(game: Game, player = 'a') {
  const move = bot.chooseAction(game, player, rng);
  if (!move) return null;
  return game.preview(player, move.x, move.y).kind;
}

function voteAll(game: Game, option: string) {
  game.endActionPhase();
  for (const p of game.playerIds()) game.vote(p, option);
  game.endVotePhase();
  game.nextMonth();
}

describe('cooperative bot actions', () => {
  it('gets food first when this month would go hungry', () => {
    const game = newGame();
    voteAll(game, 'none'); // month 1 eats the starting food
    expect(game.resources.food).toBe(0);
    expect(['fish', 'harvest']).toContain(nextKind(game));
  });

  it('plows fields while the fields cannot feed the village', () => {
    const game = newGame(); // month 1: food covers this month, no fields yet
    expect(nextKind(game)).toBe('plow');
  });

  it('gathers wood for the planned building', () => {
    const params = { ...DEFAULT_PARAMS, foodPerVillager: 0, startWoodPerVillager: 0 };
    const game = newGame(params);
    expect(plannedBuilding(game)?.id).toBe('shelter-1');
    expect(nextKind(game)).toBe('chop');
  });

  it('explores when food and materials are covered and there is nothing to study', () => {
    const params = {
      ...DEFAULT_PARAMS,
      foodPerVillager: 0,
      costs: { shelter: FREE, school: FREE, workshop: FREE, gathering: FREE },
    };
    const game = newGame(params);
    expect(nextKind(game)).toBe('explore');
  });

  it('studies early in the game once a school exists', () => {
    const params = {
      ...DEFAULT_PARAMS,
      foodPerVillager: 0,
      costs: { shelter: FREE, school: FREE, workshop: FREE, gathering: FREE },
    };
    const game = newGame(params);
    voteAll(game, 'shelter-1');
    voteAll(game, 'school-1');
    expect(nextKind(game)).toBe('study');
  });

  it('stops investing in skills near the end of the game', () => {
    const params = {
      ...DEFAULT_PARAMS,
      foodPerVillager: 0,
      costs: { shelter: FREE, school: FREE, workshop: FREE, gathering: FREE },
    };
    const game = newGame(params);
    voteAll(game, 'shelter-1');
    voteAll(game, 'school-1');
    while (game.month < game.totalMonths - 1) voteAll(game, 'none');
    expect(nextKind(game)).not.toBe('study');
  });

  it('returns null when the player has no actions left', () => {
    const game = newGame();
    for (let i = 0; i < 3; i++) game.act('a', 3, 6);
    expect(bot.chooseAction(game, 'a', rng)).toBeNull();
  });
});

describe('cooperative bot votes', () => {
  it('votes for a shelter first', () => {
    const game = newGame();
    game.endActionPhase();
    expect(bot.chooseVote(game, 'a', rng)).toBe('shelter-1');
  });

  it('votes for the school after the first shelter', () => {
    const params = { ...DEFAULT_PARAMS, costs: { shelter: FREE, school: FREE, workshop: FREE, gathering: FREE } };
    const game = newGame(params);
    voteAll(game, 'shelter-1');
    game.endActionPhase();
    expect(bot.chooseVote(game, 'a', rng)).toBe('school-1');
  });

  it('falls back to an affordable option when the planned one is blocked', () => {
    const params = {
      ...DEFAULT_PARAMS,
      costs: {
        shelter: FREE,
        school: [{ wood: 1000, stone: 0 }, FREE[1], FREE[2]] as const,
        workshop: FREE,
        gathering: FREE,
      },
    };
    const game = newGame(params);
    voteAll(game, 'shelter-1');
    game.endActionPhase();
    const vote = bot.chooseVote(game, 'a', rng);
    expect(vote).not.toBe('school-1');
    expect(game.voteOptions().find((o) => o.id === vote)?.blocked).toEqual([]);
  });
});
