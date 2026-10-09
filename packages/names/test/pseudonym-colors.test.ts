import { describe, expect, it } from 'vitest';
import { colorFor, PLAYER_COLORS, pseudonym, textColorOn } from '../src/index.ts';

describe('pseudonym', () => {
  it.each([
    [1, 'Pelaaja 1'],
    [7, 'Pelaaja 7'],
    [40, 'Pelaaja 40'],
  ])('%i -> %s', (index, expected) => {
    expect(pseudonym(index)).toBe(expected);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('throws for %s', (index) => {
    expect(() => pseudonym(index)).toThrow(RangeError);
  });
});

// --- colour maths for the palette tests -------------------------------------------------

type Rgb = readonly [number, number, number];

function hexToRgb(hex: string): Rgb {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) as unknown as Rgb;
}
const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linear = (hex: string): Rgb => hexToRgb(hex).map(toLinear) as unknown as Rgb;

/** Machado, Oliveira & Fernandes (2009) simulation matrices, severity 1.0, linear RGB. */
const VISION: Record<string, readonly number[]> = {
  normal: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritanopia: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
};

function simulate(rgb: Rgb, m: readonly number[]): Rgb {
  const at = (i: number): number => m[i] ?? 0;
  const row = (r: number): number =>
    Math.min(1, Math.max(0, at(r * 3) * rgb[0] + at(r * 3 + 1) * rgb[1] + at(r * 3 + 2) * rgb[2]));
  return [row(0), row(1), row(2)];
}

function lab([r, g, b]: Rgb): Rgb {
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

const deltaE = (a: Rgb, b: Rgb): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function luminance(hex: string): number {
  const [r, g, b] = linear(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe('PLAYER_COLORS', () => {
  it('has 12 distinct upper-case CSS hex colours', () => {
    expect(PLAYER_COLORS).toHaveLength(12);
    for (const c of PLAYER_COLORS) expect(c).toMatch(/^#[0-9A-F]{6}$/);
    expect(new Set(PLAYER_COLORS).size).toBe(12);
  });

  it('starts with the eight Okabe-Ito colours', () => {
    expect(PLAYER_COLORS.slice(0, 8)).toEqual([
      '#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000',
    ]);
  });

  it('keeps every pair apart under normal vision and simulated protan-, deuter- and tritanopia', () => {
    // CIE76 distance in CIELAB. Okabe-Ito's own closest pair (sky blue vs bluish green
    // under tritanopia) is about 16; the four additions must not get closer than 20 to anything.
    for (const [vision, m] of Object.entries(VISION)) {
      const labs = PLAYER_COLORS.map((c) => lab(simulate(linear(c), m)));
      for (let i = 0; i < labs.length; i++) {
        for (let j = i + 1; j < labs.length; j++) {
          const d = deltaE(labs[i] as Rgb, labs[j] as Rgb);
          const pair = `${PLAYER_COLORS[i]} vs ${PLAYER_COLORS[j]} (${vision})`;
          expect(d, pair).toBeGreaterThanOrEqual(j >= 8 ? 20 : 15);
        }
      }
    }
  });
});

describe('colorFor', () => {
  it('cycles through the palette by 0-based index', () => {
    expect(colorFor(0)).toBe(PLAYER_COLORS[0]);
    expect(colorFor(11)).toBe(PLAYER_COLORS[11]);
    expect(colorFor(12)).toBe(PLAYER_COLORS[0]);
    expect(colorFor(25)).toBe(PLAYER_COLORS[1]);
  });

  it.each([-1, 0.5, Number.NaN])('throws for %s', (index) => {
    expect(() => colorFor(index)).toThrow(RangeError);
  });
});

describe('textColorOn', () => {
  it('picks black or white text with WCAG AA contrast (4.5:1) on every player colour', () => {
    for (const bg of PLAYER_COLORS) {
      const fg = textColorOn(bg);
      expect(['#000000', '#FFFFFF']).toContain(fg);
      expect(contrast(fg, bg), bg).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('puts black text on yellow and white text on blue', () => {
    expect(textColorOn('#F0E442')).toBe('#000000');
    expect(textColorOn('#0072B2')).toBe('#FFFFFF');
    expect(textColorOn('#f0e442')).toBe('#000000');
  });

  it('throws on something that is not a #RRGGBB colour', () => {
    expect(() => textColorOn('red')).toThrow(RangeError);
  });
});
