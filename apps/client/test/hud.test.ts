/**
 * The in-game top bar and the energy meter (docs/12-selkeys.md §2): the helpers, and what a
 * pupil and the projector read, rendered on the server (svelte/server).
 */
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import type { GameView } from '@saari/protocol';
import EnergyMeter from '../src/components/EnergyMeter.svelte';
import TopBar from '../src/components/TopBar.svelte';
import { t } from '../src/i18n/index.ts';
import { PHASES } from '../src/lib/enums.ts';
import { forecastLook } from '../src/lib/heat.ts';
import { energyPips, phaseHeading, ringDash } from '../src/lib/hud.ts';
import { PARAMS } from '../src/lib/rules-info.ts';
import { gameView, monthReport, timer, village } from './fixtures.ts';

/** Visible text of server-rendered HTML: tags and Svelte's hydration comments dropped. */
function text(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bar(over: Partial<GameView> = {}, size: 'projector' | 'student' = 'student'): string {
  return render(TopBar, { props: { game: gameView(over), clockOffset: 0, phaseTotalMs: 60_000, size } }).body;
}

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

describe('phaseHeading', () => {
  it('names each phase in big words, with what to do under them', () => {
    expect(phaseHeading('action', false)).toEqual({ title: 'HOMMIIN!', subtitle: 'Keskustelkaa ja toimikaa yhdessä' });
    expect(phaseHeading('vote', false)).toEqual({ title: 'KYLÄKOKOUS', subtitle: 'Puhukaa ensin, äänestäkää sitten' });
    expect(phaseHeading('summary', false)).toEqual({ title: 'KUUKAUSI PÄÄTTYI', subtitle: 'Katsokaa, miten kylällä menee' });
  });

  it('the lobby and the end have their own screens, so they read like the action phase', () => {
    const action = phaseHeading('action', false);
    expect(phaseHeading('lobby', false)).toEqual(action);
    expect(phaseHeading('ended', false)).toEqual(action);
  });

  it('a pause says only TAUKO, whatever the phase', () => {
    for (const phase of PHASES) expect(phaseHeading(phase, true)).toEqual({ title: 'TAUKO', subtitle: null });
  });
});

describe('forecastLook', () => {
  it('sorts the frost by the rule numbers, with the limits on the colder side', () => {
    const { hardAt, coldAt } = PARAMS.weather;
    expect(forecastLook(hardAt - 1)).toBe('hard');
    expect(forecastLook(hardAt)).toBe('hard');
    expect(forecastLook(hardAt + 1)).toBe('cold');
    expect(forecastLook(coldAt)).toBe('cold');
    expect(forecastLook(coldAt + 1)).toBe('mild');
  });

  it('every temperature of the weather walk has its level', () => {
    expect([-35, -30, -25, -20, -15, -10].map(forecastLook)).toEqual(['hard', 'hard', 'cold', 'cold', 'mild', 'mild']);
  });

  it('the last month has no next month, only the party', () => {
    expect(forecastLook(null)).toBe('party');
  });
});

describe('top bar: the big title', () => {
  it.each([
    ['action', 'HOMMIIN!', 'Keskustelkaa ja toimikaa yhdessä'],
    ['vote', 'KYLÄKOKOUS', 'Puhukaa ensin, äänestäkää sitten'],
    ['summary', 'KUUKAUSI PÄÄTTYI', 'Katsokaa, miten kylällä menee'],
  ] as const)('%s: %s', (phase, title, subtitle) => {
    const html = bar({ phase });
    expect(html).toMatch(new RegExp(`<h1[^>]*>(\\s|<!--[^>]*-->)*${title}`));
    expect(text(html)).toContain(subtitle);
  });

  it('the vote title has no exclamation mark (Samu 2026-11-04)', () => {
    expect(text(bar({ phase: 'vote' }))).not.toContain('KYLÄKOKOUS!');
  });

  it('a pause replaces the title and drops the subtitle', () => {
    const shown = text(bar({ phase: 'vote', timer: timer({ paused: true, phaseEndsAt: null, remainingMs: 30_000 }) }));
    expect(shown).toContain('TAUKO');
    expect(shown).not.toContain('KYLÄKOKOUS');
    expect(shown).not.toContain('Puhukaa ensin');
  });
});

describe('top bar: the weather clock', () => {
  it('shows this month and the seconds inside the ring, and says both to a screen reader', () => {
    const shown = text(
      bar({
        village: village({ temperature: -20 }),
        timer: timer({ phaseEndsAt: null, remainingMs: 42_000 }),
      }),
    );
    expect(shown).toContain('−20°');
    expect(shown).toContain('42 s');
    expect(shown).toContain('Pakkanen: Nyt −20°');
    expect(shown).toContain('Aikaa jäljellä 42 sekuntia');
  });

  it('stops counting in a pause but keeps the temperature', () => {
    const shown = text(
      bar({
        village: village({ temperature: -20 }),
        timer: timer({ paused: true, phaseEndsAt: null, remainingMs: 42_000 }),
      }),
    );
    expect(shown).toContain('−20°');
    expect(shown).not.toContain('42 s');
    expect(shown).not.toContain('Aikaa jäljellä');
  });

  it('the ring shows the share of the phase that is left', () => {
    const html = bar({ timer: timer({ phaseEndsAt: null, remainingMs: 30_000, phaseMs: 60_000 }) });
    expect(html).toContain(`stroke-dasharray="${ringDash(0.5, 19)}"`);
  });

  it('turns urgent in the last seconds, but not in a pause', () => {
    const urgent = /class="clock[^"]*\burgent\b/;
    expect(bar({ timer: timer({ phaseEndsAt: null, remainingMs: 8_000 }) })).toMatch(urgent);
    expect(bar({ timer: timer({ phaseEndsAt: null, remainingMs: 30_000 }) })).not.toMatch(urgent);
    expect(bar({ timer: timer({ paused: true, phaseEndsAt: null, remainingMs: 8_000 }) })).not.toMatch(urgent);
  });

  it('no longer repeats the old phase name beside the clock', () => {
    expect(text(bar({ phase: 'action' }))).not.toContain('Toimintavuoro');
  });
});

describe('top bar: the forecast card', () => {
  const HARD = 'Kova pakkanen: nuotio vie paljon puuta';
  const COLD = 'Kylmä sää: nuotio vie enemmän puuta';
  const MILD = 'Leuto sää: puuta voi jäädä rakentamiseen';

  it.each([
    [-35, 'hard', '−35°', HARD],
    [-30, 'hard', '−30°', HARD],
    [-25, 'cold', '−25°', COLD],
    [-20, 'cold', '−20°', COLD],
    [-15, 'mild', '−15°', MILD],
    [-10, 'mild', '−10°', MILD],
  ] as const)('%i° is %s', (forecast, look, degrees, hint) => {
    const html = bar({ village: village({ forecast }) });
    expect(html).toMatch(new RegExp(`class="forecast ${look}\\b`));
    expect(text(html)).toContain(`Ensi kuussa ${degrees}`);
    expect(text(html)).toContain(hint);
  });

  it('the words carry the level, so colour is never alone', () => {
    const hints = [-30, -20, -10].map((forecast) => {
      const shown = text(bar({ village: village({ forecast }) }));
      return [HARD, COLD, MILD].filter((hint) => shown.includes(hint));
    });
    expect(hints).toEqual([[HARD], [COLD], [MILD]]);
  });

  it('the last month shows the party instead of a next month', () => {
    const html = bar({ month: 10, totalMonths: 10, village: village({ forecast: null }) });
    expect(html).toMatch(/class="forecast party\b/);
    expect(text(html)).toContain('Juhla tämän kuun lopussa!');
    expect(text(html)).not.toContain('Ensi kuussa');
  });
});

describe('top bar: the corners', () => {
  const fourthMonth = {
    month: 4,
    totalMonths: 10,
    lastReport: monthReport({ mood: { food: 0, heat: 0, shelter: 0, recreation: 0, total: 1 } }),
    village: village({
      resources: { wood: 45, stone: 14, food: 54 },
      heatNeed: 36,
      foodNeed: 54,
      shelterCapacity: 4,
      villagers: 9,
      happiness: -9,
      lossThreshold: -45,
    }),
  };

  it('the stock: wood and food against their needs, ice, and homes', () => {
    const shown = text(bar(fourthMonth));
    expect(shown).toContain('45 /36');
    expect(shown).toContain('14');
    expect(shown).toContain('54 /54');
    expect(shown).toContain('4 / 9');
    expect(shown).toContain('Puu: 45 / nuotiolle 36');
    expect(shown).toContain('Ruoka: 54 / tarve 54');
  });

  it('the month and the small happiness pill: face, number and limit', () => {
    const html = bar(fourthMonth);
    const shown = text(html);
    expect(shown).toContain('Kuukausi 4 / 10');
    expect(shown).toContain('−9');
    expect(shown).toContain('raja −45');
    expect(html).toContain('aria-label="Tavallinen mieli"');
  });

  it('the word stands beside the face, because this pill is the only place the goal shows in play', () => {
    expect(bar(fourthMonth)).toMatch(new RegExp(`class="word[^"]*"[^>]*>${t('bar.happiness')}<`));
  });

  it('the projector still counts down to the party (docs/10-arktinen.md §1), pupils do not', () => {
    expect(text(bar(fourthMonth, 'projector'))).toContain('Juhlaan 6 kuukautta');
    expect(text(bar(fourthMonth))).not.toContain('Juhlaan');
  });

  it('the last month does not say the party twice on the projector', () => {
    const shown = text(bar({ ...fourthMonth, month: 10, village: village({ forecast: null }) }, 'projector'));
    expect(shown.match(/Juhla tämän kuun lopussa!/g)).toHaveLength(1);
    expect(shown).not.toContain('Juhlaan');
  });
});

describe('energy meter', () => {
  it('says the count in words and fills one bolt for each', () => {
    const { body } = render(EnergyMeter, { props: { left: 2, max: 3 } });
    expect(text(body)).toBe('Energiaa 2');
    expect(body).toContain('aria-label="Energiaa jäljellä 2 / 3"');
    expect(body.match(/<svg/g)).toHaveLength(3);
    expect(body.match(/class="[^"]*\bfull\b/g)).toHaveLength(2);
  });

  it('an empty meter still shows the bolts and says zero', () => {
    const { body } = render(EnergyMeter, { props: { left: 0, max: 3 } });
    expect(text(body)).toBe('Energiaa 0');
    expect(body.match(/<svg/g)).toHaveLength(3);
    expect(body).not.toMatch(/class="[^"]*\bfull\b/);
  });
});
