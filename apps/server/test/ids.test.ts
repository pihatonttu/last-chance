import { describe, expect, it } from 'vitest';
import { newJoinCode, newSecret, newSeed, sameSecret } from '../src/ids.ts';

describe('newJoinCode', () => {
  it('is six digits without a leading zero', () => {
    for (let i = 0; i < 200; i++) {
      const code = newJoinCode(() => false);
      expect(code).toMatch(/^[1-9]\d{5}$/);
    }
  });

  it('skips codes that are taken', () => {
    const values = [111111, 222222, 333333];
    const code = newJoinCode((c) => c !== '333333', () => values.shift()!);
    expect(code).toBe('333333');
  });

  it('gives up when every try is taken', () => {
    expect(() => newJoinCode(() => true)).toThrow();
  });
});

describe('secrets', () => {
  it('are long url-safe random strings', () => {
    const a = newSecret();
    const b = newSecret();
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(a).not.toBe(b);
  });

  it('compare in constant time and handle different lengths', () => {
    const s = newSecret();
    expect(sameSecret(s, s)).toBe(true);
    expect(sameSecret(s, `${s}x`)).toBe(false);
    expect(sameSecret(s, newSecret())).toBe(false);
  });

  it('seeds are 32-bit unsigned integers', () => {
    const seed = newSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 32);
  });
});
