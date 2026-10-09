import type { PlayerView } from '@saari/rules';
import { describe, expect, it } from 'vitest';
import { buildPlayers, FALLBACK_COLOR, pseudonym } from '../src/players.ts';
import { collectVotes } from '../src/votes.ts';
import { built, LogBuilder, noneWon } from './fakes.ts';

function view(id: string, o: Partial<PlayerView> = {}): PlayerView {
  return {
    id,
    education: 1,
    educationProgress: 0,
    tools: 1,
    toolsProgress: 0,
    maxActions: 3,
    actionsLeft: 0,
    countsFromMonth: 1,
    removed: false,
    connected: true,
    ...o,
  };
}

const log = new LogBuilder()
  .join('a', 'b', 'gone', 'c')
  .month(1)
  .act('a', 'chop', 2)
  .act('gone', 'fish', 3)
  .act('b', 'study')
  .unused('a', 1)
  .unused('b', 2)
  .unused('c', 3)
  .votePhase()
  .vote('a', 'shelter-1')
  .vote('gone', 'shelter-1')
  .vote('c', 'none')
  .result(built('shelter-1', { none: 1, 'shelter-1': 2 }))
  .remove('gone')
  .month(2)
  .act('a', 'harvest')
  .act('b', 'make-tools', 3)
  .act('c', 'swim')
  .unused('a', 2)
  .unused('c', 2)
  .votePhase()
  .vote('b', 'school-1')
  .result(noneWon({}))
  .month(3)
  .act('a', 'explore').entries; // unfinished month: not in the debrief

const views = [
  view('a', { education: 2 }),
  view('b', { tools: 3 }),
  view('gone', { removed: true }),
  view('c'),
];

function players(labels = [
  { id: 'a', label: 'Aino', color: '#ff0000' },
  { id: 'b', label: 'Bertta', color: '#00ff00' },
  { id: 'c', label: 'Cecilia', color: '#0000ff' },
]) {
  return buildPlayers({ views, labels, log, votes: collectVotes(log, 2), monthsPlayed: 2 });
}

describe('buildPlayers', () => {
  it('lists every player not removed, in the given (join) order, with label and colour', () => {
    expect(players().map((p) => [p.id, p.label, p.color])).toEqual([
      ['a', 'Aino', '#ff0000'],
      ['b', 'Bertta', '#00ff00'],
      ['c', 'Cecilia', '#0000ff'],
    ]);
  });

  it('counts each player\'s actions, unused actions, skills and votes over the months played', () => {
    const [a, b, c] = players();
    expect(a).toEqual({
      id: 'a',
      label: 'Aino',
      color: '#ff0000',
      actions: { food: 1, fields: 0, materials: 2, explore: 0, skills: 0, recreation: 0 },
      unusedActions: 3,
      education: 2,
      tools: 1,
      votes: [
        { month: 1, option: 'shelter-1' },
        { month: 2, option: null },
      ],
    });
    expect(b?.actions).toEqual({ food: 0, fields: 0, materials: 0, explore: 0, skills: 4, recreation: 0 });
    expect(b?.unusedActions).toBe(2);
    expect(b?.tools).toBe(3);
    expect(b?.votes).toEqual([
      { month: 1, option: null },
      { month: 2, option: 'school-1' },
    ]);
    expect(c?.actions.recreation).toBe(1);
    expect(c?.unusedActions).toBe(5);
    expect(c?.votes[0]).toEqual({ month: 1, option: 'none' });
  });

  it('falls back to "Pelaaja N" by position and a grey colour when a label is missing or blank', () => {
    const list = players([
      { id: 'b', label: 'Bertta', color: '#00ff00' },
      { id: 'c', label: '   ', color: '#0000ff' },
      { id: 'stranger', label: 'Ville', color: '#123456' },
    ]);
    expect(list.map((p) => [p.label, p.color])).toEqual([
      ['Pelaaja 1', FALLBACK_COLOR],
      ['Bertta', '#00ff00'],
      ['Pelaaja 3', FALLBACK_COLOR],
    ]);
  });
});

describe('pseudonym', () => {
  it('numbers players from 1', () => {
    expect(pseudonym(1)).toBe('Pelaaja 1');
    expect(pseudonym(17)).toBe('Pelaaja 17');
  });
});
