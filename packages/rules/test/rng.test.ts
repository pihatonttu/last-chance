import { describe, expect, it } from 'vitest';
import { createRng } from '../src/rng.ts';

describe('createRng', () => {
  it('returns the same sequence for the same seed', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('returns different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('keeps next() within [0, 1)', () => {
    const rng = createRng(99);
    for (let i = 0; i < 10_000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() covers both inclusive bounds and nothing outside them', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2_000; i++) {
      const v = rng.int(3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });

  it('pick() returns an element of the array', () => {
    const rng = createRng(5);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it('pick() throws on an empty array', () => {
    expect(() => createRng(5).pick([])).toThrow();
  });

  it('shuffle() returns a permutation without mutating the input', () => {
    const rng = createRng(11);
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = rng.shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort((p, q) => p - q)).toEqual(input);
  });
});
