/**
 * Random replacement names for the teacher's rename button (P13): "Punainen kettu".
 *
 * Words are chosen so that every colour + animal pair fits the 16-character limit
 * (colours up to 9 letters, animals up to 6). No animal doubles as a Finnish insult or a
 * racist trope when paired with a colour (no apina, sika, aasi, lehmä, rotta, käärme,
 * pöllö, lepakko, norsu, valas ...): the name replaces a pupil's own choice in front of
 * the class.
 */

import { checkNickname, cleanNickname, NICKNAME_MAX_LENGTH } from './nickname.ts';

export const NICKNAME_COLORS: readonly string[] = [
  'punainen',
  'sininen',
  'vihreä',
  'keltainen',
  'oranssi',
  'violetti',
  'valkoinen',
  'musta',
  'harmaa',
  'ruskea',
  'pinkki',
  'turkoosi',
  'kultainen',
  'hopeinen',
];

export const NICKNAME_ANIMALS: readonly string[] = [
  'kettu',
  'karhu',
  'ilves',
  'jänis',
  'orava',
  'siili',
  'hirvi',
  'susi',
  'majava',
  'saukko',
  'kärppä',
  'kotka',
  'tikka',
  'peippo',
  'kurki',
  'panda',
  'koala',
  'seepra',
  'norppa',
  'kissa',
  'laama',
  'hiiri',
  'haukka',
  'sorsa',
  'poro',
  'kauris',
  'näätä',
  'mäyrä',
  'puuma',
  'kuikka',
  'tilhi',
  'korppi',
  'kameli',
  'pupu',
  'myyrä',
  'lokki',
];

const capitalise = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const BASES: readonly string[] = NICKNAME_COLORS.flatMap((colour) =>
  NICKNAME_ANIMALS.map((animal) => capitalise(`${colour} ${animal}`)),
);

/** Base names are already clean, so their lowercase form is their comparison key. */
const BASE_KEYS: readonly string[] = BASES.map((b) => b.toLowerCase());

const SHORTEST_BASE = Math.min(...BASES.map((b) => b.length));

const key = (name: string): string => cleanNickname(name).toLowerCase();

function pickIndex(random: () => number, length: number): number {
  const r = random();
  const i = Number.isFinite(r) ? Math.floor(r * length) : 0;
  return Math.min(length - 1, Math.max(0, i));
}

/**
 * A random "Colour animal" name not in `taken` (compared case-insensitively, after the
 * same cleaning as checkNickname). Once every plain name is taken it appends 2, 3 ... on a
 * base name short enough to stay within 16 characters. The result always passes
 * checkNickname, so numbers such as 69 or 88 are skipped.
 */
export function randomNickname(random: () => number, taken: ReadonlySet<string>): string {
  const takenKeys = new Set<string>();
  for (const name of taken) takenKeys.add(key(name));

  for (let n = 1; ; n++) {
    const suffix = n === 1 ? '' : ` ${n}`;
    if (SHORTEST_BASE + suffix.length > NICKNAME_MAX_LENGTH) {
      throw new Error('randomNickname: every name is taken');
    }
    const free: string[] = [];
    BASES.forEach((base, i) => {
      const name = base + suffix;
      if (name.length <= NICKNAME_MAX_LENGTH && !takenKeys.has(BASE_KEYS[i] + suffix)) free.push(name);
    });
    while (free.length > 0) {
      const i = pickIndex(random, free.length);
      const candidate = free[i];
      if (candidate !== undefined && checkNickname(candidate).ok) return candidate;
      free.splice(i, 1);
    }
  }
}
