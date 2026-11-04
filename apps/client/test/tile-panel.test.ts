/**
 * The tile popup (docs/12-selkeys.md §1, §2, §3): one action costs one energy and the
 * button says what it gives, a greenhouse can be torn down, the snow field warning, and
 * the line a building gives. Rendered on the server (svelte/server), like views.test.ts.
 */
import { describe, expect, it } from 'vitest';
import type { ComponentProps } from 'svelte';
import { render } from 'svelte/server';
import type { ActionPreview, PublicTile, Yield } from '@saari/rules';
import Ticker from '../src/components/Ticker.svelte';
import TilePanel from '../src/components/TilePanel.svelte';
import { shelterPeople } from '../src/lib/rules-info.ts';
import { tile, village } from './fixtures.ts';

type Props = ComponentProps<typeof TilePanel>;

const LANDING = { x: 1, y: 1 };

/** Visible text of server-rendered HTML: tags and Svelte's hydration comments dropped. */
function text(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderPanel(tileOver: Partial<PublicTile>, preview: ActionPreview | null, over: Partial<Props> = {}): string {
  const props: Props = {
    tile: tile(0, 0, tileOver),
    landing: LANDING,
    village: village(),
    phase: 'action',
    preview,
    pending: false,
    lastAct: null,
    onact: () => {},
    onclose: () => {},
    ...over,
  };
  return render(TilePanel, { props }).body;
}

interface Button {
  attrs: string;
  inner: string;
  disabled: boolean;
}

/** The action buttons of the popup (the close button is left out). */
function buttons(html: string): Button[] {
  return [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
    .map((m) => ({ attrs: m[1]!, inner: m[2]!, disabled: /\sdisabled(\s|=|$)/.test(m[1]!) }))
    .filter((b) => !/class="close\b/.test(b.attrs));
}

function labelOf(button: Button): string {
  return /aria-label="([^"]*)"/.exec(button.attrs)?.[1] ?? '';
}

/** The states of the progress pips, left to right. */
function pips(html: string): string[] {
  return [...html.matchAll(/data-pip="(done|add|empty)"/g)].map((m) => m[1]!);
}

function fills(html: string): number[] {
  return [...html.matchAll(/--fill:\s*([\d.]+)%/g)].map((m) => Number(m[1]));
}

function resource(resource: 'wood' | 'stone' | 'food', amount: number): Yield {
  return { type: 'resource', resource, amount };
}

function work(done: number, needed: number, amount = 1): Yield {
  return { type: 'work', amount, done, needed };
}

function ready(kind: NonNullable<ActionPreview['kind']>, yieldOf: Yield): ActionPreview {
  return { kind, available: true, yield: yieldOf };
}

describe('the action button pill: what one energy buys', () => {
  it('a resource action shows −1, the bolt and +10 with the resource picture', () => {
    const html = renderPanel({ terrain: 'forest', stock: 40 }, ready('chop', resource('wood', 10)));
    const [act] = buttons(html);
    expect(act).toBeDefined();
    expect(text(act!.inner)).toContain('Kaada puita');
    expect(text(act!.inner)).toMatch(/−1\s+→\s+\+10/);
    expect(act!.inner).toContain('art/kenney/icons/wood.png');
    expect(act!.inner).toMatch(/class="bolt\b/);
    expect(act!.disabled).toBe(false);
  });

  it('uses the real picture of stone and of food', () => {
    const stone = buttons(renderPanel({ terrain: 'quarry', stock: 20 }, ready('mine', resource('stone', 12))))[0]!;
    expect(stone.inner).toContain('art/kenney/icons/stone.png');
    const food = buttons(renderPanel({ terrain: 'field', stock: 20 }, ready('harvest', resource('food', 10))))[0]!;
    expect(food.inner).toContain('art/kenney/icons/food.png');
  });

  it('names the action, the cost and the gain in words for a screen reader', () => {
    const [act] = buttons(renderPanel({ terrain: 'forest', stock: 40 }, ready('chop', resource('wood', 10))));
    expect(labelOf(act!)).toBe('Kaada puita, 1 energia, saat 10 puuta');
    const [one] = buttons(renderPanel({ terrain: 'forest', stock: 1 }, ready('chop', resource('wood', 1))));
    expect(labelOf(one!)).toBe('Kaada puita, 1 energia, saat 1 puun');
  });

  it('shows the amount of the preview: a child with tools sees +13', () => {
    const [act] = buttons(renderPanel({ terrain: 'forest', stock: 40 }, ready('chop', resource('wood', 13))));
    expect(text(act!.inner)).toMatch(/→\s+\+13/);
    expect(labelOf(act!)).toBe('Kaada puita, 1 energia, saat 13 puuta');
  });

  it('fishing keeps the ice hole next to its name and still shows the food', () => {
    const [act] = buttons(renderPanel({ terrain: 'sea' }, ready('fish', resource('food', 4))));
    expect(text(act!.inner)).toContain('Pilki');
    expect(act!.inner).toContain('#2f6f9f');
    expect(act!.inner).toContain('art/kenney/icons/food.png');
  });

  it('work shows the steps done and the one this action adds: ●○○ on a fresh snow field', () => {
    const html = renderPanel({ terrain: 'meadow' }, ready('plow', work(0, 3)));
    const [act] = buttons(html);
    expect(pips(act!.inner)).toEqual(['add', 'empty', 'empty']);
    expect(labelOf(act!)).toBe('Rakenna kasvihuone, 1 energia, työ etenee: 1 / 3');
  });

  it('work in progress: the earlier step stays filled, this one is added', () => {
    const [act] = buttons(renderPanel({ terrain: 'meadow', work: 1 }, ready('plow', work(1, 3))));
    expect(pips(act!.inner)).toEqual(['done', 'add', 'empty']);
    expect(labelOf(act!)).toBe('Rakenna kasvihuone, 1 energia, työ etenee: 2 / 3');
  });

  it('the last step fills every pip and no more than the needed count', () => {
    const [act] = buttons(renderPanel({ terrain: 'meadow', work: 2 }, ready('plow', work(2, 3))));
    expect(pips(act!.inner)).toEqual(['done', 'done', 'add']);
  });

  it('tools make a step bigger than one: the part of the pip it fills is shown', () => {
    const [act] = buttons(renderPanel({ terrain: 'meadow' }, ready('plow', work(0, 3, 1.25))));
    expect(pips(act!.inner)).toEqual(['add', 'add', 'empty']);
    expect(fills(act!.inner)).toEqual([100, 25, 0]);
    expect(labelOf(act!)).toBe('Rakenna kasvihuone, 1 energia, työ etenee: 1,25 / 3');
  });

  it('exploring is work too, and far tiles need more than six steps: then it says 3 / 8', () => {
    const [near] = buttons(renderPanel({ fog: true, terrain: null }, ready('explore', work(0, 2))));
    expect(pips(near!.inner)).toEqual(['add', 'empty']);
    const [far] = buttons(renderPanel({ fog: true, terrain: null, exploreWork: 2 }, ready('explore', work(2, 8))));
    expect(pips(far!.inner)).toEqual([]);
    expect(text(far!.inner)).toMatch(/→\s+3 \/ 8/);
    expect(labelOf(far!)).toBe('Tutki, 1 energia, työ etenee: 3 / 8');
  });

  it('studying shows progress as pips up to six, and as 5 / 8 beyond', () => {
    const study: Yield = { type: 'progress', skill: 'education', amount: 1, done: 1, needed: 4, level: 1 };
    const [first] = buttons(renderPanel({ building: { kind: 'school', level: 1 } }, ready('study', study)));
    expect(pips(first!.inner)).toEqual(['done', 'add', 'empty', 'empty']);
    expect(labelOf(first!)).toBe('Opiskele, 1 energia, edistyt: 2 / 4');
    const second: Yield = { type: 'progress', skill: 'education', amount: 2, done: 3, needed: 8, level: 2 };
    const [next] = buttons(renderPanel({ building: { kind: 'school', level: 2 } }, ready('study', second)));
    expect(pips(next!.inner)).toEqual([]);
    expect(text(next!.inner)).toMatch(/→\s+5 \/ 8/);
  });

  it('making tools is progress too', () => {
    const tools: Yield = { type: 'progress', skill: 'tools', amount: 1, done: 0, needed: 4, level: 1 };
    const [act] = buttons(renderPanel({ building: { kind: 'workshop', level: 1 } }, ready('make-tools', tools)));
    expect(pips(act!.inner)).toEqual(['add', 'empty', 'empty', 'empty']);
  });

  it('recreation shows the mood face', () => {
    const rec: Yield = { type: 'recreation', usesLeft: 3, capacity: 3 };
    const [act] = buttons(renderPanel({ terrain: 'spring' }, ready('swim', rec)));
    expect(text(act!.inner)).toContain('Ui');
    expect(act!.inner).toContain('aria-label="Hyvä mieli"');
    expect(pips(act!.inner)).toEqual([]);
    expect(labelOf(act!)).toBe('Ui, 1 energia, kylä on tyytyväisempi');
  });

  it('shows no empty promise when the field has nothing left to give', () => {
    const html = renderPanel(
      { terrain: 'field', stock: 0 },
      { kind: 'harvest', available: false, reason: 'field-empty', yield: resource('food', 0) },
    );
    const [act] = buttons(html);
    expect(act!.disabled).toBe(true);
    expect(text(act!.inner)).not.toContain('+0');
    expect(labelOf(act!)).toBe('Korjaa sato, 1 energia');
    expect(text(html)).toContain('Kasvihuone on korjattu tyhjäksi.');
  });

  it('keeps the old progress bar out of the popup: the pips are the progress', () => {
    const html = renderPanel({ terrain: 'meadow', work: 1 }, ready('plow', work(1, 3)));
    expect(html).not.toMatch(/class="work\b/);
  });
});

describe('the demolish button', () => {
  const demolish = { kind: 'demolish' as const, available: true, yield: work(0, 3) };

  it('a greenhouse offers a second, quieter button with the same pill', () => {
    const html = renderPanel({ terrain: 'field', stock: 40 }, { ...ready('harvest', resource('food', 10)), alternative: demolish });
    const [main, alt] = buttons(html);
    expect(main).toBeDefined();
    expect(alt).toBeDefined();
    expect(text(alt!.inner)).toContain('Pura kasvihuone');
    expect(text(alt!.inner)).toMatch(/−1\s+→/);
    expect(alt!.inner).toMatch(/class="bolt\b/);
    expect(pips(alt!.inner)).toEqual(['add', 'empty', 'empty']);
    expect(labelOf(alt!)).toBe('Pura kasvihuone, 1 energia, työ etenee: 1 / 3');
    expect(alt!.attrs).not.toContain('btn-primary');
    expect(main!.attrs).toContain('btn-primary');
    expect(text(html)).toContain('Ruudusta tulee taas lumikenttä.');
  });

  it('works while the greenhouse is empty and the main action is refused', () => {
    const html = renderPanel(
      { terrain: 'field', stock: 0 },
      {
        kind: 'harvest',
        available: false,
        reason: 'field-empty',
        yield: resource('food', 0),
        alternative: demolish,
      },
    );
    const [main, alt] = buttons(html);
    expect(main!.disabled).toBe(true);
    expect(alt!.disabled).toBe(false);
    expect(text(html)).toContain('Kasvihuone on korjattu tyhjäksi.');
    expect(text(html)).toContain('Pura kasvihuone');
  });

  it('with no energy both buttons are disabled and the reason is said once', () => {
    const html = renderPanel(
      { terrain: 'field', stock: 40 },
      {
        kind: 'harvest',
        available: false,
        reason: 'no-actions-left',
        yield: resource('food', 10),
        alternative: { ...demolish, available: false, reason: 'no-actions-left' },
      },
    );
    const [main, alt] = buttons(html);
    expect(main!.disabled).toBe(true);
    expect(alt!.disabled).toBe(true);
    const shown = text(html);
    expect(shown).toContain('Energiasi on käytetty tältä kuulta.');
    expect(shown.split('Energiasi on käytetty tältä kuulta.')).toHaveLength(2);
  });

  it('shows its own reason when it differs from the main one', () => {
    const html = renderPanel(
      { terrain: 'field', stock: 40 },
      {
        ...ready('harvest', resource('food', 10)),
        alternative: { ...demolish, available: false, reason: 'wrong-phase' },
      },
    );
    const [main, alt] = buttons(html);
    expect(main!.disabled).toBe(false);
    expect(alt!.disabled).toBe(true);
    expect(text(html)).toContain('Toimintoja voi tehdä vain toimintavuorolla.');
  });

  it('is not offered outside the action phase or on tiles without an alternative', () => {
    const waiting = renderPanel({ terrain: 'field', stock: 40 }, { ...ready('harvest', resource('food', 10)), alternative: demolish }, { phase: 'vote' });
    expect(text(waiting)).not.toContain('Pura kasvihuone');
    const forest = renderPanel({ terrain: 'forest', stock: 40 }, ready('chop', resource('wood', 10)));
    expect(text(forest)).not.toContain('Pura kasvihuone');
    expect(text(forest)).not.toContain('Ruudusta tulee taas lumikenttä.');
  });

  it('"More info" says what happens when this step finishes the tear-down', () => {
    const finishing = renderPanel(
      { terrain: 'field', stock: 40 },
      { ...ready('harvest', resource('food', 10)), alternative: { ...demolish, yield: work(2, 3) } },
    );
    const inside = text(finishing.slice(finishing.indexOf('<details')));
    expect(inside).toContain('Työtä 2 → 3 / 3');
    expect(inside).toContain('Ruudusta tulee taas lumikenttä.');
    const early = renderPanel({ terrain: 'field', stock: 40 }, { ...ready('harvest', resource('food', 10)), alternative: demolish });
    expect(text(early.slice(early.indexOf('<details')))).not.toContain('Ruudusta tulee taas lumikenttä.');
  });

  it('is disabled while an action is on its way', () => {
    const html = renderPanel({ terrain: 'field', stock: 40 }, { ...ready('harvest', resource('food', 10)), alternative: demolish }, { pending: true });
    for (const b of buttons(html)) expect(b.disabled).toBe(true);
  });
});

describe('the snow field warning', () => {
  function plow(freeMeadowsAfter?: number, over: Partial<ActionPreview> = {}): string {
    const preview: ActionPreview = {
      ...ready('plow', work(0, 3)),
      ...(freeMeadowsAfter === undefined ? {} : { freeMeadowsAfter }),
      ...over,
    };
    return renderPanel({ terrain: 'meadow' }, preview);
  }

  it('says how many free snow fields are left when there are two', () => {
    expect(text(plow(2))).toContain('Iglut tarvitsevat lumikenttiä: tämän jälkeen vapaita on 2.');
  });

  it('says it when only one is left', () => {
    expect(text(plow(1))).toContain('Iglut tarvitsevat lumikenttiä: tämän jälkeen vapaita on 1.');
  });

  it('has its own words when none are left', () => {
    const shown = text(plow(0));
    expect(shown).toContain('Tämän jälkeen vapaita lumikenttiä ei ole.');
    expect(shown).not.toContain('vapaita on');
  });

  it('is silent when the rules say nothing', () => {
    const shown = text(plow());
    expect(shown).not.toContain('Iglut tarvitsevat');
    expect(shown).not.toContain('vapaita');
  });

  it('never blocks: the plow button stays usable', () => {
    const [act] = buttons(plow(0));
    expect(act!.disabled).toBe(false);
  });

  it('shows even when the plow action is unavailable, as long as its button is shown', () => {
    const html = plow(1, { available: false, reason: 'no-actions-left' });
    expect(text(html)).toContain('tämän jälkeen vapaita on 1.');
    expect(buttons(html)[0]!.disabled).toBe(true);
  });

  it('sits right under the plow button, before the reason', () => {
    const html = plow(1, { available: false, reason: 'no-actions-left' });
    const warning = html.indexOf('Iglut tarvitsevat');
    expect(warning).toBeGreaterThan(html.indexOf('</button>', html.indexOf('</header>')));
    expect(warning).toBeLessThan(html.indexOf('Energiasi on käytetty'));
  });

  it('is hidden when the plow button is not shown (not the action phase)', () => {
    const html = renderPanel({ terrain: 'meadow' }, { ...ready('plow', work(0, 3)), freeMeadowsAfter: 1 }, { phase: 'vote' });
    expect(text(html)).not.toContain('Iglut tarvitsevat');
    expect(buttons(html)).toHaveLength(0);
  });

  it('is not shown for other actions', () => {
    const html = renderPanel({ terrain: 'forest', stock: 40 }, { ...ready('chop', resource('wood', 10)), freeMeadowsAfter: 1 });
    expect(text(html)).not.toContain('Iglut tarvitsevat');
  });
});

describe('what a building gives, above the button', () => {
  const v = village({ villagers: 10 });

  /** The line must stand before the button and outside "More info". */
  function expectLineFirst(html: string, line: string): void {
    const at = html.indexOf(line);
    expect(at).toBeGreaterThan(-1);
    const more = html.indexOf('<details');
    if (more !== -1) expect(at).toBeLessThan(more);
    const button = html.indexOf('<button', html.indexOf('</header>'));
    if (button !== -1) expect(at).toBeLessThan(button);
  }

  it('a home says how many villagers it shelters', () => {
    const people = shelterPeople(1, 10);
    const html = renderPanel(
      { terrain: 'meadow', building: { kind: 'shelter', level: 1 } },
      { kind: null, available: false, reason: 'no-action', yield: { type: 'none' } },
      { village: v },
    );
    expect(text(html)).toContain(`Koti ${people} kyläläiselle`);
    expectLineFirst(html, `Koti ${people} kyläläiselle`);
    // Bigger homes shelter more.
    const big = renderPanel(
      { terrain: 'meadow', building: { kind: 'shelter', level: 3 } },
      { kind: null, available: false, reason: 'no-action', yield: { type: 'none' } },
      { village: v },
    );
    expect(text(big)).toContain(`Koti ${shelterPeople(3, 10)} kyläläiselle`);
  });

  it('the school says studying gives more energy', () => {
    const study: Yield = { type: 'progress', skill: 'education', amount: 1, done: 0, needed: 4, level: 1 };
    const html = renderPanel({ terrain: 'meadow', building: { kind: 'school', level: 1 } }, ready('study', study));
    expect(text(html)).toContain('Opiskelemalla saat lisää energiaa.');
    expectLineFirst(html, 'Opiskelemalla saat lisää energiaa.');
  });

  it('the workshop says tools make every job give more', () => {
    const tools: Yield = { type: 'progress', skill: 'tools', amount: 1, done: 0, needed: 4, level: 1 };
    const html = renderPanel({ terrain: 'meadow', building: { kind: 'workshop', level: 1 } }, ready('make-tools', tools));
    expect(text(html)).toContain('Työkaluilla saat enemmän joka työstä.');
    expectLineFirst(html, 'Työkaluilla saat enemmän joka työstä.');
  });

  it('the gathering place says time together makes the village content', () => {
    const rec: Yield = { type: 'recreation', usesLeft: 2, capacity: 2 };
    const html = renderPanel({ terrain: 'meadow', building: { kind: 'gathering', level: 1 } }, ready('gather', rec));
    expect(text(html)).toContain('Yhdessä vietetty aika tekee kylästä tyytyväisemmän.');
    expectLineFirst(html, 'Yhdessä vietetty aika tekee kylästä tyytyväisemmän.');
  });

  it('shows the line outside the action phase too', () => {
    const html = renderPanel({ terrain: 'meadow', building: { kind: 'school', level: 1 } }, null, { phase: 'vote' });
    expect(text(html)).toContain('Opiskelemalla saat lisää energiaa.');
  });

  it('terrain tiles have no such line', () => {
    const html = renderPanel({ terrain: 'forest', stock: 40 }, ready('chop', resource('wood', 10)));
    expect(text(html)).not.toContain('kyläläiselle');
    expect(text(html)).not.toContain('saat lisää energiaa');
  });
});

describe('ticker', () => {
  it('a torn-down greenhouse has a picture of its snow field, like a new one', () => {
    const { body } = render(Ticker, { props: { items: [{ id: 1, event: { kind: 'field-removed', x: 2, y: 3 }, month: 2, at: 0 }] } });
    expect(text(body)).toContain('Kasvihuone purettiin lumikentäksi.');
    expect(body).toContain('art/kenney/props/meadow-b.png');
  });
});
