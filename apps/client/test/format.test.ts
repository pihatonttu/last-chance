import { describe, expect, it } from 'vitest';
import { actionName, gainText, optionName, questionText, tickerText } from '../src/lib/format.ts';
import { checkNickname } from '../src/lib/names.ts';
import { parseOptionId } from '../src/lib/rules-info.ts';
import { voteShare } from '../src/lib/vote.ts';

describe('game text', () => {
  it('names gains, options and ticker events without anyone’s name', () => {
    expect(gainText({ wood: 10 })).toBe('+10 puuta');
    expect(gainText({ food: 5, work: 1 })).toBe('+5 ruokaa, +1 työ');
    expect(optionName({ id: 'shelter-2' })).toBe('Iglu');
    expect(optionName({ id: 'school-2' })).toBe('Koulu');
    expect(optionName({ id: 'none' })).toBe('Ei rakenneta tässä kuussa');
    expect(tickerText({ kind: 'built', option: 'shelter-1', x: 1, y: 2 })).toBe('Rakennettiin: Pieni iglu');
    expect(tickerText({ kind: 'food-short', missing: 12 })).toBe('Ruoka ei riitä: puuttuu 12.');
    expect(parseOptionId('workshop-3')).toEqual({ kind: 'workshop', level: 3 });
    expect(parseOptionId('castle-1')).toBeNull();
  });
});

describe('arctic names (docs/10-arktinen.md §3)', () => {
  it('names homes igloos and the third gathering place a snow castle', () => {
    expect(optionName({ id: 'shelter-1' })).toBe('Pieni iglu');
    expect(optionName({ id: 'shelter-3' })).toBe('Iso iglu');
    expect(optionName({ id: 'gathering-3' })).toBe('Lumilinna');
  });

  it('fishing is always ice fishing, and greenhouses and ice replace fields and stone', () => {
    expect(actionName('fish')).toBe('Pilki');
    expect(actionName('plow')).toBe('Rakenna kasvihuone');
    expect(actionName('mine')).toBe('Louhi jäätä');
    expect(actionName('build-quarry')).toBe('Perusta jäälouhos');
    expect(actionName('chop')).toBe('Kaada puita');
  });

  it('names every building level by its own name', () => {
    expect(optionName({ id: 'school-1' })).toBe('Ulkoluokka');
    expect(optionName({ id: 'workshop-2' })).toBe('Paja');
    expect(optionName({ id: 'gathering-1' })).toBe('Laavu');
  });

  it('writes frost with a real minus sign in the ticker and the questions', () => {
    expect(tickerText({ kind: 'hard-frost-coming', temperature: -35 })).toBe('Ensi kuussa kova pakkanen: −35°!');
    expect(tickerText({ kind: 'wood-short', missing: 7 })).toBe('Puu ei riitä nuotiolle: puuttuu 7.');
    expect(questionText({ id: 'cold', params: { month: 4, people: 3, temperature: -30 } })).toBe(
      'Kuukautena 4 oli −30° ja nuotion puut loppuivat: 3 paleli. Kuka muisti nuotion?',
    );
  });
});

describe('vote cards', () => {
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
