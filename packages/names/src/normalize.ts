/**
 * Text normalisation for the offensive-word filter. Display names are never changed by
 * this module; it only produces the strings the block lists are matched against.
 *
 * Pipeline (filterTokens, then normalizeForFilter):
 *   1. NFKC (folds full-width, ligatures, mathematical letters), lowercase.
 *   2. Leetspeak: 4/@ a, 3 e, 1/!/| i, 0 o, 5/$ s, 7 t, 8 b, 9 g.
 *   3. Letters NFD cannot split (ß ss, ø ö, æ ä, ł l ...) and Cyrillic/Greek look-alikes.
 *   4. Fold diacritics (é e, ü u) except å, ä, ö, which stay distinct. Read w as v and
 *      x as ks, as Finnish spelling does ("wittu", "sexi").
 *   5. Everything that is not a letter separates tokens (spaces, hyphens, dots,
 *      underscores, leftover digits).
 *   6. Join the tokens and collapse runs of the same letter to one ("vittttu" -> "vitu").
 */

const LEET: Readonly<Record<string, string>> = {
  '4': 'a',
  '@': 'a',
  '3': 'e',
  '1': 'i',
  '!': 'i',
  '|': 'i',
  '0': 'o',
  '5': 's',
  $: 's',
  '7': 't',
  '8': 'b',
  '9': 'g',
};

/** Letters without a canonical decomposition, and look-alikes from Cyrillic and Greek. */
const LETTER_MAP: Readonly<Record<string, string>> = {
  ß: 'ss',
  ø: 'ö',
  æ: 'ä',
  œ: 'oe',
  ł: 'l',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  ı: 'i',
  ŋ: 'n',
  ħ: 'h',
  ŧ: 't',
  // Cyrillic (lowercase forms; the uppercase look-alike decides where it helps, e.g. Н -> h).
  а: 'a',
  в: 'b',
  г: 'r',
  е: 'e',
  ё: 'e',
  і: 'i',
  ї: 'i',
  ј: 'j',
  к: 'k',
  м: 'm',
  н: 'h',
  о: 'o',
  п: 'n',
  р: 'p',
  с: 'c',
  ѕ: 's',
  т: 't',
  у: 'y',
  х: 'x',
  ш: 'w',
  ь: 'b',
  ԁ: 'd',
  ӏ: 'l',
  // Greek.
  α: 'a',
  β: 'b',
  ε: 'e',
  η: 'n',
  ι: 'i',
  κ: 'k',
  ν: 'v',
  ο: 'o',
  ρ: 'p',
  τ: 't',
  υ: 'u',
  χ: 'x',
  ω: 'w',
};

const KEPT_NORDIC = new Set(['å', 'ä', 'ö']);
const MARKS = /\p{M}/gu;
const LETTER = /\p{L}/u;

/** Finnish spelling equivalents, applied after diacritic folding. */
const SPELLING: Readonly<Record<string, string>> = { w: 'v', x: 'ks' };

function foldChar(ch: string): string {
  if (KEPT_NORDIC.has(ch)) return ch;
  let out = '';
  for (const c of ch.normalize('NFD').replace(MARKS, '')) out += SPELLING[c] ?? c;
  return out;
}

/**
 * Lowercased, leetspeak-read, look-alike-mapped, diacritic-folded letter tokens of `s`
 * (å/ä/ö kept, letter runs not yet collapsed). Any non-letter ends a token; a combining
 * mark left on its own is dropped without splitting ("v̶ittu" stays one token).
 */
export function filterTokens(s: string): string[] {
  const tokens: string[] = [];
  let current = '';
  for (const original of s.normalize('NFKC').toLowerCase()) {
    const folded = foldChar(LEET[original] ?? LETTER_MAP[original] ?? original);
    for (const ch of folded) {
      if (LETTER.test(ch)) {
        current += ch;
      } else {
        if (current !== '') tokens.push(current);
        current = '';
      }
    }
  }
  if (current !== '') tokens.push(current);
  return tokens;
}

/**
 * Maximal runs of letters or of ASCII digits, without leetspeak ("kalle88" -> kalle, 88).
 * Used for number codes such as 88 that leetspeak would turn into letters.
 */
export function codeTokens(s: string): string[] {
  let text = '';
  for (const original of s.normalize('NFKC').toLowerCase()) {
    text += foldChar(LETTER_MAP[original] ?? original);
  }
  return text.match(/\p{L}+|[0-9]+/gu) ?? [];
}

/** å -> a, ä -> a, ö -> o: the "folded" variant checked alongside the å/ä/ö-preserving one. */
export function foldNordic(s: string): string {
  return s.replace(/[åä]/g, 'a').replace(/ö/g, 'o');
}

/** Runs of the same letter shortened to one: "vittttu" -> "vitu". */
export function collapseRuns(s: string): string {
  return s.replace(/(.)\1+/gsu, '$1');
}

/**
 * Runs of the same letter shortened to two: "kuuuusi" -> "kuusi". Keeps the one-or-two
 * distinction that Finnish spelling depends on (kusi/kuusi, ryssä/rysä).
 */
export function squeezeRuns(s: string): string {
  return s.replace(/(.)\1{2,}/gsu, '$1$1');
}

/**
 * The string the word filter matches against: lowercase, leetspeak read as letters,
 * diacritics folded except å/ä/ö, separators removed, letter runs collapsed.
 */
export function normalizeForFilter(s: string): string {
  return collapseRuns(filterTokens(s).join(''));
}
