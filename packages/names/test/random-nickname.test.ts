import { describe, expect, it } from 'vitest';
import { checkNickname, randomNickname } from '../src/index.ts';

/** Small deterministic PRNG (mulberry32) so the tests do not depend on Math.random. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Drawn {
  plain: string[];
  firstNumbered: string;
}

let drawn: Drawn | undefined;

/** Draws names until one carries a number, i.e. every plain colour + animal name is taken. */
function allPlainNames(): Drawn {
  if (drawn) return drawn;
  const random = seeded(1);
  const taken = new Set<string>();
  const plain: string[] = [];
  for (let i = 0; i < 10_000; i++) {
    const name = randomNickname(random, taken);
    if (/\d/.test(name)) {
      drawn = { plain, firstNumbered: name };
      return drawn;
    }
    plain.push(name);
    taken.add(name);
  }
  throw new Error('never ran out of plain names');
}

const words = (name: string): string[] => name.split(' ');

describe('randomNickname', () => {
  it('builds "Colour animal" with only the first letter capitalised', () => {
    const name = randomNickname(seeded(42), new Set());
    expect(name).toMatch(/^\p{Lu}\p{Ll}+ \p{Ll}+$/u);
  });

  it('is deterministic for the same random source', () => {
    const r1 = seeded(7);
    const r2 = seeded(7);
    const a = Array.from({ length: 5 }, () => randomNickname(r1, new Set()));
    const b = Array.from({ length: 5 }, () => randomNickname(r2, new Set()));
    expect(a).toEqual(b);
  });

  it('copes with random() values at the edges of [0, 1)', () => {
    expect(() => randomNickname(() => 0, new Set())).not.toThrow();
    expect(() => randomNickname(() => 0.9999999999, new Set())).not.toThrow();
  });

  it('has at least 12 colours x 30 animals, all distinct names', () => {
    const { plain } = allPlainNames();
    const colours = new Set(plain.map((n) => words(n)[0]?.toLowerCase()));
    const animals = new Set(plain.map((n) => words(n)[1]));
    expect(colours.size).toBeGreaterThanOrEqual(12);
    expect(animals.size).toBeGreaterThanOrEqual(30);
    expect(plain.length).toBe(colours.size * animals.size);
    expect(new Set(plain.map((n) => n.toLowerCase())).size).toBe(plain.length);
  });

  it('produces only names that pass checkNickname unchanged', () => {
    for (const name of allPlainNames().plain) {
      expect(checkNickname(name), name).toEqual({ ok: true, nickname: name });
    }
  });

  it('uses no animal that doubles as an insult or a racist trope', () => {
    const banned = [
      'apina', 'gorilla', 'simpanssi', 'sika', 'possu', 'aasi', 'lehmä', 'rotta', 'käärme', 'mato',
      'kana', 'lammas', 'virtahepo', 'valas', 'norsu', 'pöllö', 'lepakko', 'hanhi', 'koira', 'mursu',
    ];
    const animals = new Set(allPlainNames().plain.map((n) => words(n)[1]));
    for (const word of banned) expect(animals.has(word), word).toBe(false);
  });

  it('never returns a taken name, comparing case-insensitively', () => {
    const random = () => 0;
    const first = randomNickname(random, new Set());
    const second = randomNickname(random, new Set([first.toUpperCase()]));
    expect(second.toLowerCase()).not.toBe(first.toLowerCase());
    const third = randomNickname(random, new Set([`  ${first.toLowerCase()} `, second]));
    expect([first.toLowerCase(), second.toLowerCase()]).not.toContain(third.toLowerCase());
  });

  it('appends a number once every plain name is taken', () => {
    const { firstNumbered } = allPlainNames();
    expect(firstNumbered).toMatch(/^\p{Lu}\p{Ll}+ \p{Ll}+ 2$/u);
    expect(checkNickname(firstNumbered).ok).toBe(true);
  });

  it('keeps numbered names unique and within 16 characters as the class grows', () => {
    const random = seeded(3);
    const taken = new Set<string>(allPlainNames().plain);
    for (let i = 0; i < 1_000; i++) {
      const name = randomNickname(random, taken);
      expect(taken.has(name), name).toBe(false);
      expect(checkNickname(name), name).toEqual({ ok: true, nickname: name });
      taken.add(name);
    }
  });

  it('skips numbers the filter blocks (69)', () => {
    const { plain } = allPlainNames();
    const taken = new Set<string>(plain);
    for (const base of plain) for (let n = 2; n <= 68; n++) taken.add(`${base} ${n}`);
    const name = randomNickname(seeded(11), taken);
    expect(name).toMatch(/ 70$/);
    expect(checkNickname(name).ok).toBe(true);
  });

  it('moves to two-digit numbers on a base name short enough to fit', () => {
    const { plain } = allPlainNames();
    const taken = new Set<string>(plain);
    for (const base of plain) for (let n = 2; n <= 9; n++) taken.add(`${base} ${n}`);
    const name = randomNickname(seeded(9), taken);
    expect(name).toMatch(/ 10$/);
    expect(name.length).toBeLessThanOrEqual(16);
  });
});
