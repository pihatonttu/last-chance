import { describe, expect, it } from 'vitest';
import { ALLOW, CODE_TOKENS, LISTS, STAFF_NAMES } from '../src/blocklist.ts';
import { findOffensiveTerm, normalizeForFilter } from '../src/index.ts';

/** Strips the entry flags documented in src/blocklist.ts. */
const bare = (entry: string): string => entry.replace(/^[~!]+/, '');

describe('block-list data', () => {
  const all = Object.values(LISTS).flatMap((l) => [...l.substring, ...l.word]);

  it('covers Finnish, Swedish and English with real lists', () => {
    expect(LISTS.fi.substring.length + LISTS.fi.word.length).toBeGreaterThanOrEqual(100);
    expect(LISTS.sv.substring.length + LISTS.sv.word.length).toBeGreaterThanOrEqual(40);
    expect(LISTS.en.substring.length + LISTS.en.word.length).toBeGreaterThanOrEqual(100);
  });

  it('has no entry that normalises to nothing or to a single letter', () => {
    for (const entry of [...all, ...STAFF_NAMES, ...ALLOW]) {
      expect(normalizeForFilter(bare(entry)).length, entry).toBeGreaterThanOrEqual(2);
    }
  });

  it('has no duplicate entries', () => {
    const seen = new Set<string>();
    for (const entry of all) {
      expect(seen.has(entry), entry).toBe(false);
      seen.add(entry);
    }
  });

  it('blocks every entry when typed on its own', () => {
    for (const entry of [...all, ...STAFF_NAMES]) {
      expect(findOffensiveTerm(bare(entry)), entry).not.toBeNull();
    }
  });

  it('lets every allow-list word through on its own', () => {
    for (const word of ALLOW) expect(findOffensiveTerm(word), word).toBeNull();
  });

  it('keeps the number and code tokens as valid regular expressions', () => {
    for (const source of CODE_TOKENS) expect(() => new RegExp(`^(?:${source})$`, 'u')).not.toThrow();
  });
});
