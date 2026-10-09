import { describe, expect, it } from 'vitest';
import { act, finishMonth, setup } from './helpers.ts';

describe('event log', () => {
  it('numbers entries in order and stamps month, phase and clock time', () => {
    let now = 1000;
    const game = setup({ clock: () => now });
    now = 2500;
    act(game, 'p1', 3, 6);
    const entry = game.log.at(-1);
    expect(entry).toMatchObject({ type: 'action', month: 1, phase: 'action', t: 2500, player: 'p1', kind: 'fish' });
    const seqs = game.log.map((e) => e.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
  });

  it('records each action with its gain', () => {
    const game = setup();
    act(game, 'p1', 3, 4);
    expect(game.log.at(-1)).toMatchObject({ type: 'action', kind: 'chop', x: 3, y: 4, gain: { wood: 10 } });
  });

  it('records votes, vote changes, the result and the month report', () => {
    const game = setup();
    game.endActionPhase();
    game.vote('p1', 'shelter-1');
    game.vote('p1', 'none');
    game.endVotePhase();
    const votes = game.log.filter((e) => e.type === 'vote');
    expect(votes).toEqual([
      expect.objectContaining({ player: 'p1', option: 'shelter-1', previous: null }),
      expect.objectContaining({ player: 'p1', option: 'none', previous: 'shelter-1' }),
    ]);
    expect(game.log.some((e) => e.type === 'vote-result')).toBe(true);
    expect(game.log.some((e) => e.type === 'month-end')).toBe(true);
  });

  it('records phase changes, joins and teacher actions', () => {
    const game = setup({ players: 1 });
    game.logTeacher('pause');
    finishMonth(game);
    const types = game.log.map((e) => e.type);
    expect(types).toContain('player-joined');
    expect(types).toContain('game-started');
    expect(types).toContain('phase');
    expect(game.log.find((e) => e.type === 'teacher')).toMatchObject({ action: 'pause' });
  });

  it('contains player ids only, never anything else about the player', () => {
    const game = setup();
    act(game, 'p1', 3, 6);
    const playerFields = game.log.flatMap((e) => Object.keys(e)).filter((k) => /name|nick/i.test(k));
    expect(playerFields).toEqual([]);
  });
});
