import { describe, expect, it } from 'vitest';
import { energyPips, ringDash } from '../src/lib/hud.ts';

describe('ringDash', () => {
  it('draws the share of the ring that is left', () => {
    const c = 2 * Math.PI * 10;
    expect(ringDash(0.5, 10)).toBe(`${(c / 2).toFixed(2)} ${c.toFixed(2)}`);
    expect(ringDash(1, 10)).toBe(`${c.toFixed(2)} ${c.toFixed(2)}`);
  });

  it('keeps the arc inside the ring for odd timer values', () => {
    const c = (2 * Math.PI * 10).toFixed(2);
    expect(ringDash(-0.2, 10)).toBe(`0.00 ${c}`);
    expect(ringDash(1.7, 10)).toBe(`${c} ${c}`);
    expect(ringDash(Number.NaN, 10)).toBe(`0.00 ${c}`);
  });
});

describe('energyPips', () => {
  it('fills one bolt per action left, out of the actions this month', () => {
    expect(energyPips(2, 3)).toEqual([true, true, false]);
    expect(energyPips(0, 4)).toEqual([false, false, false, false]);
  });

  it('never shows more bolts than there are, or fewer than none', () => {
    expect(energyPips(5, 3)).toEqual([true, true, true]);
    expect(energyPips(-1, 2)).toEqual([false, false]);
    expect(energyPips(1, 0)).toEqual([]);
  });
});
