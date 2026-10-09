import { describe, expect, it } from 'vitest';
import { checkNickname, type NicknameRefusal } from '../src/index.ts';

function refusal(raw: string): NicknameRefusal | null {
  const r = checkNickname(raw);
  return r.ok ? null : r.reason;
}

describe('checkNickname cleaning', () => {
  it('trims and collapses internal whitespace to one space', () => {
    expect(checkNickname('  Musta   kissa \t')).toEqual({ ok: true, nickname: 'Musta kissa' });
    expect(checkNickname('Anna\n\nLiisa')).toEqual({ ok: true, nickname: 'Anna Liisa' });
    // No-break space and ideographic space count as whitespace too.
    expect(checkNickname('Kalle 　Ville')).toEqual({ ok: true, nickname: 'Kalle Ville' });
  });

  it('NFC-normalises so a decomposed ä becomes one character', () => {
    const decomposed = 'Väinö'; // "Väinö" typed with combining marks
    const r = checkNickname(decomposed);
    expect(r).toEqual({ ok: true, nickname: 'Väinö' });
    if (r.ok) expect(r.nickname).toBe('Väinö');
  });

  it('keeps the original letter case and diacritics in the returned name', () => {
    expect(checkNickname('Åsa-Linnéa')).toEqual({ ok: true, nickname: 'Åsa-Linnéa' });
    expect(checkNickname('BJÖRN')).toEqual({ ok: true, nickname: 'BJÖRN' });
  });
});

describe('checkNickname length', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['\t\n', 'empty'],
    ['A', 'too-short'],
    [' Ö ', 'too-short'],
    ['Abcdefghijklmnopq', 'too-long'], // 17
    ['Kalle   Ville   Pekka', 'too-long'], // 17 after collapsing
  ] as const)('%j -> %s', (raw, reason) => {
    expect(refusal(raw)).toBe(reason);
  });

  it('accepts exactly 2 and exactly 16 characters', () => {
    expect(refusal('Jo')).toBeNull();
    expect(refusal('Abcdefghijklmnop')).toBeNull(); // 16
    expect(refusal('Väinämöinen Ilma')).toBeNull(); // 16, ä/ö count as one each
  });

  it('measures length after cleaning, not before', () => {
    expect(refusal('      Pekka Pouta      ')).toBeNull();
  });
});

describe('checkNickname characters', () => {
  it.each([
    'Kalle',
    'Anna-Liisa',
    'Pekka 2',
    'R2D2',
    'Åsa',
    'Häkkinen',
    'Linnéa',
    'Müller',
    'Zoë',
    'Saša',
    'Łukasz',
    'Ngọc Anh', // Vietnamese, precomposed after NFC
    'Саша', // Cyrillic letters are letters
    'さくら',
    'Ali Öztürk',
  ])('accepts %j', (raw) => {
    expect(refusal(raw)).toBeNull();
  });

  it.each([
    ['Kalle!', 'punctuation'],
    ['Kalle_V', 'underscore'],
    ['Kalle.V', 'dot'],
    ['Kalle 🙂', 'emoji'],
    ['Kal​le', 'zero-width space'],
    ['Kal­le', 'soft hyphen'],
    ['Kalle–Ville', 'en dash'],
    ['<b>Kalle</b>', 'markup'],
    ['Z̶a̶l̶g̶o̶', 'generic combining marks (strikethrough)'],
    ['Ká́́́lle', 'stacked generic combining marks (Zalgo)'],
    ['ṉ́an', 'generic combining mark left over after NFC'],
    ['́Kalle', 'combining mark with no letter before it'],
    ['िKalle', 'script mark with no letter before it'],
    ['पििि', 'more than two script marks on one letter'],
    ['Kalle ½', 'vulgar fraction'],
    ['Kalle ١٢', 'non-ASCII digits'],
  ])('rejects %j (%s) as invalid-chars', (raw) => {
    expect(refusal(raw)).toBe('invalid-chars');
  });

  it('accepts script-specific vowel signs that have no precomposed form', () => {
    expect(refusal('प्रिया')).toBeNull(); // प्रिया (Priya, Devanagari)
    expect(refusal('Príya')).toBeNull(); // i + acute composes to í under NFC
  });

  it.each(['12', '2026', '1 2 3', '--', '- 7 -'])('rejects %j: no letters at all', (raw) => {
    expect(refusal(raw)).toBe('invalid-chars');
  });
});

describe('checkNickname refusal order', () => {
  it('reports length before content', () => {
    expect(refusal('vittuvittuvittuvittu')).toBe('too-long');
    expect(refusal('!')).toBe('too-short');
  });

  it('counts a letter with its script marks by code points', () => {
    expect(refusal('प्रिया')).toBeNull(); // 6 code points
  });

  it('reports an offensive name as offensive even when it also has invalid characters', () => {
    // The point: f.u.c.k should not be answered with "remove the dots".
    expect(refusal('f.u.c.k')).toBe('offensive');
    expect(refusal('v_i_t_t_u')).toBe('offensive');
  });

  it('refuses an offensive name that is otherwise valid', () => {
    expect(refusal('Paska')).toBe('offensive');
  });
});
