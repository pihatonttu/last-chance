import { describe, expect, it } from 'vitest';
import type { VoteOption } from '@saari/rules';
import { actionName, gainText, monthName, optionName, tickerText, yieldGain } from '../src/lib/format.ts';
import { checkNickname } from '../src/lib/names.ts';
import { parseOptionId, shelterPeople } from '../src/lib/rules-info.ts';
import { effectText, voteShare } from '../src/lib/vote.ts';

function option(over: Partial<VoteOption>): VoteOption {
  return { id: 'none', kind: 'none', level: 0, upgrade: false, cost: { wood: 0, stone: 0 }, blocked: [], ...over };
}

describe('game text', () => {
  it('shows the exact previewed yield of every yield type', () => {
    expect(yieldGain({ type: 'resource', resource: 'wood', amount: 13 })).toBe('+13 puuta');
    expect(yieldGain({ type: 'work', amount: 1.25, done: 0, needed: 3 })).toBe('+1,25 työtä');
    expect(yieldGain({ type: 'recreation', usesLeft: 2, capacity: 5 })).toBe('+1 virkistyskerta');
    expect(yieldGain({ type: 'progress', skill: 'education', amount: 2, done: 0, needed: 3, level: 1 })).toBe('+2 koulutukseen');
    expect(yieldGain({ type: 'none' })).toBe('');
  });

  it('names gains, options and ticker events without anyone’s name', () => {
    expect(gainText({ wood: 10 })).toBe('+10 puuta');
    expect(gainText({ food: 5, work: 1 })).toBe('+5 ruokaa, +1 työ');
    expect(optionName({ id: 'shelter-2' })).toBe('Mökki');
    expect(optionName({ id: 'gathering-3' })).toBe('Juhlatalo');
    expect(optionName({ id: 'school-2' })).toBe('Koulu');
    expect(optionName({ id: 'none' })).toBe('Ei rakenneta tässä kuussa');
    expect(tickerText({ kind: 'built', option: 'shelter-1', x: 1, y: 2 })).toBe('Rakennettiin: Teltta');
    expect(tickerText({ kind: 'food-short', missing: 12 })).toBe('Ruoka ei riitä: puuttuu 12.');
    expect(parseOptionId('workshop-3')).toEqual({ kind: 'workshop', level: 3 });
    expect(parseOptionId('castle-1')).toBeNull();
  });
});

describe('calendar and seasonal names (docs/09-uudisasukkaat.md §3)', () => {
  it('names the game month by the calendar: the game starts in April', () => {
    expect(monthName(1)).toBe('Huhtikuu');
    expect(monthName(9)).toBe('Joulukuu');
    expect(monthName(10)).toBe('Tammikuu');
  });

  it('calls fishing ice fishing in winter', () => {
    expect(actionName('fish', 7)).toBe('Kalasta');
    expect(actionName('fish', 10)).toBe('Pilki');
    expect(actionName('chop', 10)).toBe('Kaada puita');
  });

  it('names every building level by its own name', () => {
    expect(optionName({ id: 'school-1' })).toBe('Ulkoluokka');
    expect(optionName({ id: 'workshop-2' })).toBe('Paja');
    expect(optionName({ id: 'gathering-1' })).toBe('Laavu');
  });
});

describe('vote cards', () => {
  it('what an option does', () => {
    const tent = option({ id: 'shelter-1', kind: 'shelter', level: 1, cost: { wood: 120, stone: 0 }, blocked: ['wood', 'space'] });
    expect(effectText(tent, 30)).toBe(`Koti noin ${shelterPeople(1, 30)} kyläläiselle`);
    const hut = option({ id: 'shelter-2', kind: 'shelter', level: 2, upgrade: true });
    expect(effectText(hut, 30)).toMatch(/^Noin \d+ kotipaikkaa lisää$/);
    expect(effectText(option({}), 30)).toBe('Puut ja kivet säästetään');
  });

  it('live percentages', () => {
    const vote = { options: [], counts: { none: 1, 'shelter-1': 3 }, votesCast: 4 };
    expect(voteShare(vote, 'shelter-1')).toBe(0.75);
    expect(voteShare({ ...vote, votesCast: 0 }, 'none')).toBe(0);
  });
});

describe('nickname pre-check', () => {
  it('gives instant feedback before the server checks again', () => {
    expect(checkNickname('')).toEqual({ ok: false, reason: 'empty' });
    expect(checkNickname('  Aino  ').ok).toBe(true);
  });
});
