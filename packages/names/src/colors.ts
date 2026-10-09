/**
 * Player colours. The first eight are the Okabe-Ito palette (Okabe & Ito 2008); the last
 * four (indigo and wine from Paul Tol's palettes, a dark brown and a light green) were
 * chosen to stay at least CIE76 deltaE 20 from every other colour under normal vision and
 * simulated protanopia, deuteranopia and tritanopia (Machado et al. 2009). Okabe-Ito's own
 * closest pair (sky blue vs bluish green under tritanopia) is about 16.
 * test/pseudonym-colors.test.ts checks both bounds.
 *
 * TEXT ON THESE COLOURS: no single text colour is readable on all of them (white on the
 * yellow is 1.3:1, black on the indigo is 1.7:1). The client must pick the text colour per
 * background with textColorOn(), which gives at least 4.5:1 (WCAG AA) on every entry.
 */
export const PLAYER_COLORS: readonly string[] = Object.freeze([
  '#E69F00', // orange
  '#56B4E9', // sky blue
  '#009E73', // bluish green
  '#F0E442', // yellow
  '#0072B2', // blue
  '#D55E00', // vermillion
  '#CC79A7', // reddish purple
  '#000000', // black
  '#332288', // indigo
  '#882255', // wine
  '#6B3E00', // brown
  '#B2DF8A', // light green
]);

/** Player colour for a 0-based index (e.g. join order), cycling through PLAYER_COLORS. */
export function colorFor(index: number): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError(`colorFor: index must be a non-negative integer, got ${index}`);
  }
  const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
  if (color === undefined) throw new RangeError('colorFor: empty palette');
  return color;
}

const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

function relativeLuminance(hex: string): number {
  const m = HEX.exec(hex);
  if (!m) throw new RangeError(`Not a #RRGGBB colour: ${hex}`);
  const [r, g, b] = [m[1], m[2], m[3]].map((part) => {
    const c = Number.parseInt(part ?? '0', 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Black or white text, whichever has the higher WCAG contrast on `background` (#RRGGBB). */
export function textColorOn(background: string): '#000000' | '#FFFFFF' {
  const l = relativeLuminance(background);
  const onBlack = (l + 0.05) / 0.05;
  const onWhite = 1.05 / (l + 0.05);
  return onBlack >= onWhite ? '#000000' : '#FFFFFF';
}
