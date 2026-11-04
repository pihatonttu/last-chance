/**
 * The vote cards (pupils) and vote bars (projector): every card tells at once what the village
 * gets (a big line, before → after where a building grows) and what the children must then do
 * (a small line), with numbers counted from the rules (docs/12-selkeys.md §3).
 */
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import type { VoteView } from '@saari/protocol';
import { DEFAULT_PARAMS, type BuildingKind, type Level, type VoteOption } from '@saari/rules';
import VoteBars from '../src/components/VoteBars.svelte';
import VoteCards from '../src/components/VoteCards.svelte';
import { allMessageKeys } from '../src/i18n/index.ts';
import { actionsToNextSkill, gatheringMood, toolsExample } from '../src/lib/rules-info.ts';
import { missingFor, optionCard, voteShare } from '../src/lib/vote.ts';

/** Visible text of server-rendered HTML: tags and Svelte's hydration comments dropped. */
function text(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function option(over: Partial<VoteOption>): VoteOption {
  return {
    id: 'none',
    kind: 'none',
    level: 0,
    upgrade: false,
    cost: { wood: 0, stone: 0 },
    blocked: [],
    leavesFireCold: false,
    ...over,
  };
}

/** `building-level`, such as `shelter-2`; levels above 1 are upgrades, as in the engine. */
function building(kind: BuildingKind, level: Level, over: Partial<VoteOption> = {}): VoteOption {
  return option({ id: `${kind}-${level}`, kind, level, upgrade: level > 1, cost: { wood: 20, stone: 10 }, ...over });
}

const KINDS: BuildingKind[] = ['shelter', 'school', 'workshop', 'gathering'];
const LEVELS: Level[] = [1, 2, 3];
const EVERY_OPTION: VoteOption[] = [option({}), ...KINDS.flatMap((kind) => LEVELS.map((level) => building(kind, level)))];

/** What each option must say for a class of 15, written out by hand from the default rules. */
const AT_15: Record<string, { name: string; benefit: string; reason: string }> = {
  none: { name: 'Ei rakenneta', benefit: 'Puu ja jää säästyvät', reason: 'Kylä ei saa tässä kuussa mitään uutta.' },
  'shelter-1': { name: 'Pieni iglu', benefit: 'Koti 3 kyläläiselle', reason: 'Rakennetaan vapaalle lumikentälle.' },
  'shelter-2': { name: 'Iglu', benefit: 'Koti 3 → 5 kyläläiselle', reason: 'Pieni iglu kasvaa samalla paikalla.' },
  'shelter-3': { name: 'Iso iglu', benefit: 'Koti 5 → 8 kyläläiselle', reason: 'Iglu kasvaa samalla paikalla.' },
  'school-1': { name: 'Ulkoluokka', benefit: 'Energiaa 3 → 4 joka kuukausi', reason: 'Kun opiskelet täällä 4 kertaa.' },
  'school-2': { name: 'Koulu', benefit: 'Opiskelu käy 2 kertaa nopeammin', reason: 'Kun opiskelet täällä.' },
  'school-3': { name: 'Iso koulu', benefit: 'Opiskelu käy 3 kertaa nopeammin', reason: 'Kun opiskelet täällä.' },
  'workshop-1': { name: 'Työpenkki', benefit: 'Työstä +10 → +13', reason: 'Kun teet täällä työkaluja 4 kertaa.' },
  'workshop-2': { name: 'Paja', benefit: 'Työkalut valmistuvat 2 kertaa nopeammin', reason: 'Kun teet täällä työkaluja.' },
  'workshop-3': { name: 'Iso paja', benefit: 'Työkalut valmistuvat 3 kertaa nopeammin', reason: 'Kun teet täällä työkaluja.' },
  'gathering-1': { name: 'Laavu', benefit: 'Tyytyväisyyttä jopa +3 kuussa', reason: 'Kun vietätte täällä aikaa yhdessä.' },
  'gathering-2': { name: 'Kylätalo', benefit: 'Tyytyväisyyttä jopa +3 → +5 kuussa', reason: 'Kun vietätte täällä aikaa yhdessä.' },
  'gathering-3': { name: 'Lumilinna', benefit: 'Tyytyväisyyttä jopa +5 → +10 kuussa', reason: 'Kun vietätte täällä aikaa yhdessä.' },
};

const RESOURCES = { food: 0, wood: 90, stone: 90 };

function voteOf(options: VoteOption[], counts: Record<string, number> = {}, votesCast = 0): VoteView {
  return { options, counts, votesCast };
}

const base = {
  phase: 'vote' as const,
  myVote: null,
  pending: null,
  villagers: 15,
  resources: RESOURCES,
  lastVote: null,
  onvote: () => {},
};

function cards(options: VoteOption[], over: Record<string, unknown> = {}): string {
  return render(VoteCards, { props: { ...base, vote: voteOf(options), ...over } }).body;
}

/** The inner HTML of the first element that has all of these classes (Svelte adds its own). */
function inner(html: string, tag: string, ...classes: string[]): string | undefined {
  const has = classes.map((c) => `(?=[^"]*\\b${c}\\b)`).join('');
  const match = new RegExp(`<${tag} class="${has}[^"]*"[^>]*>([\\s\\S]*?)</${tag}>`).exec(html);
  return match?.[1]?.replace(/<!--[\s\S]*?-->/g, '');
}

/** How many elements carry all of these classes. */
function countClass(html: string, ...classes: string[]): number {
  const has = classes.map((c) => `(?=[^"]*\\b${c}\\b)`).join('');
  return (html.match(new RegExp(`class="${has}[^"]*"`, 'g')) ?? []).length;
}

/** The picture files in the order they are drawn. */
function pictures(html: string): string[] {
  return [...html.matchAll(/art\/kenney\/props\/([\w-]+)\.png/g)].map((m) => m[1]!);
}

const arrows = (html: string): number => countClass(html, 'arrow');

describe('optionCard (the text of one option)', () => {
  it.each(Object.entries(AT_15))('%s at 15 villagers', (id, expected) => {
    const found = EVERY_OPTION.find((o) => o.id === id)!;
    const card = optionCard(found, 15);
    expect(card.name).toBe(expected.name);
    expect(card.benefit).toBe(expected.benefit);
    expect(card.reason).toBe(expected.reason);
  });

  it('the homes of a new small igloo and of every upgrade grow with the village: 15 and 30', () => {
    const homes = (id: string, villagers: number): string => optionCard(EVERY_OPTION.find((o) => o.id === id)!, villagers).benefit;
    expect(homes('shelter-1', 15)).toBe('Koti 3 kyläläiselle');
    expect(homes('shelter-1', 30)).toBe('Koti 5 kyläläiselle');
    expect(homes('shelter-2', 15)).toBe('Koti 3 → 5 kyläläiselle');
    expect(homes('shelter-2', 30)).toBe('Koti 5 → 10 kyläläiselle');
    expect(homes('shelter-3', 15)).toBe('Koti 5 → 8 kyläläiselle');
    expect(homes('shelter-3', 30)).toBe('Koti 10 → 15 kyläläiselle');
  });

  it('a school and a workshop of level 1 count their steps the same way for 15 and 30', () => {
    for (const villagers of [15, 30]) {
      expect(optionCard(building('school', 1), villagers).benefit).toBe('Energiaa 3 → 4 joka kuukausi');
      expect(optionCard(building('workshop', 1), villagers).benefit).toBe('Työstä +10 → +13');
    }
  });

  it('the mood of a gathering place is the engine formula: round(moodRecreation * uses / villagers)', () => {
    // 15 villagers: 5, 8 and 15 uses; 30: 10, 15 and 30; 20: 7, 10 and 20 (7 * 10 / 20 = 3.5 rounds up).
    const mood = (level: Level, villagers: number): string => optionCard(building('gathering', level), villagers).benefit;
    expect(mood(1, 15)).toBe('Tyytyväisyyttä jopa +3 kuussa');
    expect(mood(1, 30)).toBe('Tyytyväisyyttä jopa +3 kuussa');
    expect(mood(1, 20)).toBe('Tyytyväisyyttä jopa +4 kuussa');
    expect(mood(2, 30)).toBe('Tyytyväisyyttä jopa +3 → +5 kuussa');
    expect(mood(3, 30)).toBe('Tyytyväisyyttä jopa +5 → +10 kuussa');
    expect(gatheringMood(3, 40)).toBe(10);
  });

  it('every number comes from the rules: tuned parameters change the cards', () => {
    const tuned = {
      ...DEFAULT_PARAMS,
      baseActions: 5,
      skillProgressPerLevel: 6,
      toolsBonusPerLevel: 0.5,
      harvestYield: 8,
      moodRecreation: 20,
      shelterDivisors: [4, 2, 1] as const,
    };
    expect(optionCard(building('school', 1), 15, tuned).benefit).toBe('Energiaa 5 → 6 joka kuukausi');
    expect(optionCard(building('school', 1), 15, tuned).reason).toBe('Kun opiskelet täällä 6 kertaa.');
    expect(optionCard(building('workshop', 1), 15, tuned).benefit).toBe('Työstä +8 → +12');
    expect(optionCard(building('workshop', 1), 15, tuned).reason).toBe('Kun teet täällä työkaluja 6 kertaa.');
    expect(optionCard(building('gathering', 1), 15, tuned).benefit).toBe('Tyytyväisyyttä jopa +7 kuussa');
    expect(optionCard(building('shelter', 1), 15, tuned).benefit).toBe('Koti 4 kyläläiselle');
    expect(optionCard(building('shelter', 2), 15, tuned).benefit).toBe('Koti 4 → 8 kyläläiselle');
  });

  it('the tools example is computed, never written down: +10 becomes Math.round(10 * 1.25)', () => {
    expect(toolsExample()).toEqual({ from: 10, to: Math.round(10 * 1.25) });
    expect(toolsExample({ ...DEFAULT_PARAMS, toolsBonusPerLevel: 0.1 })).toEqual({ from: 10, to: 11 });
  });

  it('counts the rounds to the next skill level from the building level', () => {
    expect(actionsToNextSkill(1)).toBe(4);
    expect(actionsToNextSkill(2)).toBe(2);
    expect(actionsToNextSkill(3)).toBe(2);
  });

  it('says "kerran" for exactly one round, and "kertaa" otherwise', () => {
    const quick = { ...DEFAULT_PARAMS, skillProgressPerLevel: 1 };
    expect(optionCard(building('school', 1), 15, quick).reason).toBe('Kun opiskelet täällä kerran.');
    expect(optionCard(building('workshop', 1), 15, quick).reason).toBe('Kun teet täällä työkaluja kerran.');
    expect(optionCard(building('school', 1), 15).reason).toBe('Kun opiskelet täällä 4 kertaa.');
  });

  it('pictures: a new building has one, an upgrade the old one first, "not building" none', () => {
    expect(optionCard(building('shelter', 1), 15)).toMatchObject({ art: 'props/shelter-1', fromArt: null });
    expect(optionCard(building('shelter', 2), 15)).toMatchObject({ art: 'props/shelter-2', fromArt: 'props/shelter-1' });
    expect(optionCard(building('school', 3), 15)).toMatchObject({ art: 'props/school-3', fromArt: 'props/school-2' });
    expect(optionCard(option({}), 15)).toMatchObject({ art: null, fromArt: null });
  });

  it('a small village of one still gets a sensible card', () => {
    expect(optionCard(building('shelter', 1), 1).benefit).toBe('Koti 1 kyläläiselle');
    expect(optionCard(building('gathering', 1), 1).benefit).toBe('Tyytyväisyyttä jopa +10 kuussa');
  });
});

describe('vote card helpers', () => {
  it('voteShare is the share of the votes cast', () => {
    expect(voteShare(voteOf([], { a: 1, b: 3 }, 4), 'b')).toBe(0.75);
    expect(voteShare(voteOf([], {}, 0), 'b')).toBe(0);
  });

  it('missingFor names what is still missing', () => {
    const o = building('school', 1, { cost: { wood: 80, stone: 20 }, blocked: ['wood', 'space'] });
    expect(missingFor(o, { food: 0, wood: 60, stone: 50 })).toEqual({ wood: 20, stone: 0, space: true });
  });
});

describe('vote cards for pupils', () => {
  it('every kind and level tells its big line and its small line, with no help button', () => {
    for (const o of EVERY_OPTION) {
      const html = cards([o]);
      const expected = AT_15[o.id]!;
      const shown = text(html);
      expect(shown, o.id).toContain(expected.name);
      expect(shown, o.id).toContain(expected.benefit);
      expect(shown, o.id).toContain(expected.reason);
      expect(shown, o.id).not.toMatch(/\{\w+\}/);
    }
    const all = text(cards(EVERY_OPTION));
    expect(all).not.toContain('Mitä nämä tekevät?');
    expect(cards(EVERY_OPTION)).not.toContain('<details');
    expect(cards(EVERY_OPTION).match(/<button/g)).toHaveLength(EVERY_OPTION.length);
  });

  it('the big line is words and numbers only: no icon inside it', () => {
    for (const o of EVERY_OPTION) {
      const gain = inner(cards([o]), 'span', 'gain');
      expect(gain, o.id).toBe(AT_15[o.id]!.benefit);
    }
  });

  it('keeps an accessible heading, but no big title of its own', () => {
    const html = cards([option({})]);
    expect(html).toMatch(/<h2 id="vote-title" class="visually-hidden">Kyläkokous[^<]*<\/h2>/);
    expect(html).toContain('aria-labelledby="vote-title"');
  });

  it('shows the stars of the level, and none for not building', () => {
    const three = cards([building('gathering', 3)]);
    expect(countClass(three, 'on')).toBe(3);
    expect(three).toContain('aria-label="Taso 3"');
    expect(countClass(cards([building('school', 1)]), 'on')).toBe(1);
    expect(cards([option({})])).not.toContain('★');
  });

  it('a new small igloo draws one picture; every upgrade draws the old building, an arrow, then the new', () => {
    const fresh = cards([building('shelter', 1)]);
    expect(pictures(fresh)).toEqual(['shelter-1']);
    expect(arrows(fresh)).toBe(0);
    const igloo = cards([building('shelter', 2)]);
    expect(pictures(igloo)).toEqual(['shelter-1', 'shelter-2']);
    expect(arrows(igloo)).toBe(1);
    expect(pictures(cards([building('shelter', 3)]))).toEqual(['shelter-2', 'shelter-3']);
    expect(pictures(cards([building('school', 2)]))).toEqual(['school-1', 'school-2']);
    expect(pictures(cards([building('workshop', 3)]))).toEqual(['workshop-2', 'workshop-3']);
    expect(pictures(cards([building('gathering', 2)]))).toEqual(['gathering-1', 'gathering-2']);
  });

  it('draws the pictures at 104 px, big enough to tell a small igloo from an igloo', () => {
    const html = cards([building('shelter', 2)]);
    expect(html.match(/style="width: 104px; height: 104px;"/g)).toHaveLength(2);
  });

  it('not building has no picture and no price', () => {
    const html = cards([option({})]);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('class="cost');
    expect(html).not.toContain('Ilmainen');
  });

  it('shows the price in wood and ice, red for what is missing', () => {
    const html = cards([building('school', 1, { cost: { wood: 120, stone: 30 }, blocked: ['wood'] })], {
      resources: { food: 0, wood: 100, stone: 90 },
    });
    expect(html).toContain('art/kenney/icons/wood.png');
    expect(html).toContain('art/kenney/icons/stone.png');
    expect(text(html)).toContain('120');
    expect(text(html)).toContain('30');
    expect(countClass(html, 'price', 'short')).toBe(1);
    expect(inner(html, 'span', 'price', 'short')).toContain('wood.png');
    expect(text(html)).toContain('Ei vielä varaa');
  });

  it('the numbers follow the village: 15 and 30 villagers', () => {
    const small = text(cards([building('shelter', 2), building('gathering', 2)]));
    expect(small).toContain('Koti 3 → 5 kyläläiselle');
    const big = text(cards([building('shelter', 2), building('gathering', 2)], { villagers: 30 }));
    expect(big).toContain('Koti 5 → 10 kyläläiselle');
    expect(big).toContain('Tyytyväisyyttä jopa +3 → +5 kuussa');
  });

  it('the refused-space line says what to do, and replaces the small line', () => {
    const html = cards([building('shelter', 1, { blocked: ['space'] })]);
    const shown = text(html);
    expect(shown).toContain('Ei vapaata lumikenttää. Purkakaa kasvihuone tai tutkikaa saarta.');
    expect(shown).not.toContain('Rakennetaan vapaalle lumikentälle.');
    expect(shown).toContain('Koti 3 kyläläiselle');
    expect(shown).not.toContain('Ei vielä varaa');
    expect(html.match(/<button[^>]*>/)![0]).toContain('disabled');
  });

  it('an upgrade is not blocked by the missing snow field, and says it takes no new place', () => {
    const shown = text(cards([building('shelter', 2)]));
    expect(shown).not.toContain('Ei vapaata lumikenttää');
    expect(shown).toContain('Pieni iglu kasvaa samalla paikalla.');
  });

  it('warns that the fire gets no wood, and the card can still be voted', () => {
    const html = cards([building('workshop', 1, { leavesFireCold: true })]);
    expect(text(html)).toContain('Nuotiolle ei jää puuta');
    expect(html.match(/<button[^>]*>/)![0]).not.toContain('disabled');
  });

  it('a card that cannot be afforded shows what is missing instead of the fire warning', () => {
    const shown = text(cards([building('gathering', 1, { blocked: ['wood'], leavesFireCold: true })]));
    expect(shown).toContain('Ei vielä varaa');
    expect(shown).not.toContain('Nuotiolle ei jää puuta');
  });

  it('the tally: the count of votes and a bar for the share', () => {
    const vote = voteOf([building('school', 1)], { 'school-1': 3 }, 4);
    const html = render(VoteCards, { props: { ...base, vote } }).body;
    expect(html).toContain('width: 75%');
    expect(html).toContain('aria-label="3 ääntä"');
    expect(inner(html, 'span', 'count')).toBe('3');
  });

  it('marks your own vote', () => {
    const html = cards([building('school', 1)], { myVote: 'school-1' });
    expect(html).toContain('aria-pressed="true"');
    expect(text(html)).toContain('✓');
    expect(text(html)).toContain('Sinun äänesi');
  });

  it('outside the vote the cards can be read but not pressed', () => {
    const html = cards([building('school', 1)], { phase: 'action' });
    expect(html.match(/<button[^>]*>/)![0]).toContain('disabled');
    expect(text(html)).toContain('Kuun lopussa äänestetään');
  });

  it('calls mood satisfaction, never happiness', () => {
    const shown = text(cards(EVERY_OPTION));
    expect(shown).toContain('Tyytyväisyyttä');
    expect(shown).not.toMatch(/onnelli|mieliala/i);
  });
});

describe('vote bars on the projector', () => {
  function bars(options: VoteOption[], over: Record<string, unknown> = {}): string {
    const vote = voteOf(options, { 'school-1': 2 }, 4);
    return render(VoteBars, { props: { vote, voters: 10, villagers: 15, resources: RESOURCES, ...over } }).body;
  }

  it('every option shows its big line, and in the vote also its small line', () => {
    const html = bars(EVERY_OPTION);
    const shown = text(html);
    for (const o of EVERY_OPTION) {
      const expected = AT_15[o.id]!;
      expect(shown, o.id).toContain(expected.name);
      expect(shown, o.id).toContain(expected.benefit);
      expect(shown, o.id).toContain(expected.reason);
    }
    expect(shown).toContain('Ääniä annettu 4 / 10');
    expect(html).toContain('class="bar');
  });

  it('while the class acts, only the big line and no bars', () => {
    const html = bars([building('school', 1), building('shelter', 2)], { compact: true });
    const shown = text(html);
    expect(shown).toContain('Energiaa 3 → 4 joka kuukausi');
    expect(shown).toContain('Koti 3 → 5 kyläläiselle');
    expect(shown).not.toContain('Kun opiskelet täällä');
    expect(shown).toContain('Kuun lopussa äänestetään');
    expect(html).not.toContain('class="bar');
  });

  it('upgrades show the old picture, an arrow and the new one', () => {
    const html = bars([building('shelter', 2)]);
    expect(pictures(html)).toEqual(['shelter-1', 'shelter-2']);
    expect(arrows(html)).toBe(1);
    expect(pictures(bars([building('shelter', 1)]))).toEqual(['shelter-1']);
  });

  it('counts from the village size it is given', () => {
    expect(text(bars([building('shelter', 1)], { villagers: 30 }))).toContain('Koti 5 kyläläiselle');
  });

  it('the refused-space line and the fire warning', () => {
    const blocked = text(bars([building('shelter', 1, { blocked: ['space'] })]));
    expect(blocked).toContain('Ei vapaata lumikenttää. Purkakaa kasvihuone tai tutkikaa saarta.');
    expect(blocked).not.toContain('Rakennetaan vapaalle lumikentälle.');
    expect(text(bars([building('workshop', 1, { leavesFireCold: true })]))).toContain('Nuotiolle ei jää puuta');
  });

  it('keeps an accessible heading', () => {
    expect(bars([option({})])).toMatch(/<h2 id="vote-bars-title" class="visually-hidden">/);
  });
});

describe('vote texts', () => {
  it('the "What do these do?" toggle and its effect lines are gone', () => {
    const keys = allMessageKeys();
    expect(keys).not.toContain('vote.whatDo');
    expect(keys.filter((k) => k.startsWith('vote.effect.'))).toEqual([]);
  });
});
