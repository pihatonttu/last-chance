/**
 * The arctic views rendered on the server (svelte/server): what a pupil and the projector
 * read on the end screen, the month summary, the vote cards, the top bar, the fire popup,
 * the ticker and the debrief (docs/10-arktinen.md §4, §4b, §6).
 */
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import type { DebriefData } from '@saari/debrief';
import type { MonthReport, VoteOption } from '@saari/rules';
import Debrief from '../src/components/debrief/Debrief.svelte';
import EndScreen from '../src/components/EndScreen.svelte';
import MonthSummary from '../src/components/MonthSummary.svelte';
import Ticker from '../src/components/Ticker.svelte';
import TilePanel from '../src/components/TilePanel.svelte';
import TopBar from '../src/components/TopBar.svelte';
import VoteCards from '../src/components/VoteCards.svelte';
import { gameView, monthReport, tile, village } from './fixtures.ts';

/** Visible text of server-rendered HTML: tags and Svelte's hydration comments dropped. */
function text(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The class attribute of the first element whose title starts with `title`. */
function classOfTitled(html: string, title: string): string {
  const match = new RegExp(`class="([^"]*)"[^>]*title="${title}`).exec(html);
  if (!match) throw new Error(`no element titled ${title}`);
  return match[1]!;
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

describe('end screen', () => {
  it('a village that gave up: the icebreaker without a party, no stars or level, badges still shown', () => {
    const { body } = render(EndScreen, {
      props: { result: { happiness: -64, grade: 1, early: false, lost: true }, badges: ['settler'] },
    });
    const shown = text(body);
    expect(shown).toContain('Kylä ei jaksanut. Jäänmurtaja haki kaikki kotiin. Kokeilkaa uudelleen!');
    expect(shown).toContain('Uudisasukas');
    expect(shown).not.toContain('★');
    expect(shown).not.toContain('Leiri rannalla');
    expect(shown).not.toContain('Kaikki tasot');
    expect(body).not.toContain('aurora');
  });

  it('the aurora party: northern lights, stars and the level', () => {
    const { body } = render(EndScreen, { props: { result: { happiness: 40, grade: 5, early: false, lost: false } } });
    expect(text(body)).toContain('Vieraat saapuivat revontulijuhlaan!');
    expect(text(body)).toContain('Kukoistava kylä');
    expect(body).toContain('aurora');
  });
});

describe('month summary', () => {
  function summary(report: MonthReport, lastMonth = false): string {
    return text(render(MonthSummary, { props: { report, lossThreshold: -60, lastMonth } }).body);
  }

  it('shows warmth as its own picture, with who was cold and the fire in the details', () => {
    const shown = summary(monthReport());
    expect(shown).toContain('4 paleli');
    expect(shown).toContain('Pakkanen oli −30°');
    expect(shown).toContain('Nuotio poltti 18 / 30 puuta');
    expect(shown).toContain('Lämpö: −4');
    expect(shown).not.toContain('luovuttamassa');
    expect(shown).toContain('Seuraava kuukausi alkaa pian.');
  });

  it('says everyone was warm when nobody was cold', () => {
    const warm = monthReport({
      heat: { temperature: -10, need: 10, burned: 10, cold: 0 },
      mood: { food: 2, heat: 2, shelter: 2, recreation: 0, total: 6 },
    });
    expect(summary(warm)).toContain('Kaikilla oli lämmin');
  });

  it('warns when the village is close to giving up', () => {
    const shown = summary(monthReport({ happiness: -45 }));
    expect(shown).toContain('Kylä on luovuttamassa! Pitäkää nuotio ja ruoka kunnossa.');
    expect(shown).toContain('Jos onnellisuus putoaa alle −60, kylä luovuttaa.');
    expect(shown).toContain('Seuraava kuukausi alkaa pian.');
  });

  it('the month the village gives up says so in the past tense, with no warning and no next month', () => {
    const shown = summary(monthReport({ happiness: -65 }));
    expect(shown).toContain('Kylä luovutti. Jäänmurtaja tulee hakemaan kaikki kotiin.');
    expect(shown).not.toContain('luovuttamassa');
    expect(shown).not.toContain('Seuraava kuukausi alkaa pian.');
  });

  it('the last month warns of nothing when the village held on: the party comes next', () => {
    const shown = summary(monthReport({ month: 10, happiness: -45 }), true);
    expect(shown).not.toContain('luovuttamassa');
    expect(shown).not.toContain('luovutti');
  });

  it('the last month can still be lost', () => {
    const shown = summary(monthReport({ month: 10, happiness: -61 }), true);
    expect(shown).toContain('Kylä luovutti. Jäänmurtaja tulee hakemaan kaikki kotiin.');
    expect(shown).not.toContain('Seuraava kuukausi alkaa pian.');
  });
});

describe('vote cards', () => {
  const base = {
    phase: 'vote' as const,
    myVote: null,
    pending: null,
    villagers: 10,
    resources: { food: 0, wood: 30, stone: 40 },
    lastVote: null,
    onvote: () => {},
  };

  it('warns in red when the option leaves the fire without wood, and the card can still be voted', () => {
    const school = option({ id: 'school-1', kind: 'school', level: 1, cost: { wood: 25, stone: 0 }, leavesFireCold: true });
    const vote = { options: [option({}), school], counts: {}, votesCast: 0 };
    const { body } = render(VoteCards, { props: { ...base, vote } });
    expect(text(body)).toContain('Nuotiolle ei jää puuta');
    expect(body.match(/<button[^>]*class="card[^"]*"[^>]*>/g)!.some((b) => b.includes('disabled'))).toBe(false);
  });

  it('a blocked option says what is missing instead', () => {
    const hall = option({
      id: 'gathering-1',
      kind: 'gathering',
      level: 1,
      cost: { wood: 45, stone: 0 },
      blocked: ['wood'],
      leavesFireCold: true,
    });
    const vote = { options: [hall], counts: {}, votesCast: 0 };
    const shown = text(render(VoteCards, { props: { ...base, vote } }).body);
    expect(shown).toContain('Ei vielä varaa');
    expect(shown).not.toContain('Nuotiolle ei jää puuta');
  });
});

describe('top bar', () => {
  /** Food, homes and everything else fine: only wood and happiness vary. */
  function bar(wood: number, happiness: number): string {
    const game = gameView({
      village: village({
        resources: { food: 40, wood, stone: 5 },
        foodNeed: 40,
        shelterCapacity: 10,
        villagers: 10,
        heatNeed: 20,
        temperature: -25,
        forecast: -35,
        happiness,
      }),
    });
    return render(TopBar, { props: { game, clockOffset: 0, phaseTotalMs: 60_000 } }).body;
  }

  it('wood as store / fire, the frost with its forecast, and the loss limit by the happiness', () => {
    const shown = text(bar(12, -45));
    expect(shown).toContain('Puu: 12 / nuotiolle 20');
    expect(shown).toContain('−25°');
    expect(shown).toContain('→ −35°');
    expect(shown).toContain('1 / 15');
    expect(shown).toContain('raja −60');
    expect(shown).not.toMatch(/Huhtikuu|Kevät/);
  });

  it('the wood is red when it does not cover the fire, the happiness when it is near the limit', () => {
    const red = bar(12, -45);
    expect(classOfTitled(red, 'Puu')).toMatch(/\bshort\b/);
    expect(classOfTitled(red, 'Onnellisuus')).toMatch(/\bshort\b/);
    const fine = bar(20, -40);
    expect(classOfTitled(fine, 'Puu')).not.toMatch(/\bshort\b/);
    expect(classOfTitled(fine, 'Onnellisuus')).not.toMatch(/\bshort\b/);
  });
});

describe('the village fire popup', () => {
  it('the landing shows the frost, the forecast and the wood the fire burns, with no action button', () => {
    const game = gameView({ village: village({ resources: { food: 0, wood: 15, stone: 0 }, heatNeed: 20, temperature: -20, forecast: -30 }) });
    const { body } = render(TilePanel, {
      props: {
        tile: tile(1, 1),
        landing: { x: 1, y: 1 },
        village: game.village,
        phase: 'action',
        preview: { kind: null, available: false, reason: 'no-action', yield: { type: 'none' } },
        pending: false,
        lastAct: null,
        onact: () => {},
        onclose: () => {},
      },
    });
    const shown = text(body);
    expect(shown).toContain('Kylän nuotio');
    expect(shown).toContain('−20°');
    expect(shown).toContain('−30°');
    expect(shown).toContain('Nuotio polttaa kuun lopussa 20 puuta.');
    expect(shown).toContain('Puu ei riitä! Puuttuu 5.');
    expect(body).not.toContain('btn-primary');
  });

  it('fishing is always "Pilki" with the ice-hole picture', () => {
    const { body } = render(TilePanel, {
      props: {
        tile: tile(0, 0, { terrain: 'sea' }),
        landing: { x: 1, y: 1 },
        village: village(),
        phase: 'action',
        preview: { kind: 'fish', available: true, yield: { type: 'resource', resource: 'food', amount: 8 } },
        pending: false,
        lastAct: null,
        onact: () => {},
        onclose: () => {},
      },
    });
    expect(text(body)).toContain('Pilki');
    expect(body).toContain('#2f6f9f'); // the ice hole
  });
});

describe('ticker', () => {
  it('the giving-up face is a picture only; the sentence says it', () => {
    const { body } = render(Ticker, { props: { items: [{ id: 1, event: { kind: 'giving-up' }, month: 5, at: 0 }] } });
    expect(text(body)).toContain('Kylä on luovuttamassa!');
    expect(body).toMatch(/aria-hidden="true"[^>]*>(\s|<!--[^>]*-->)*<svg[^>]*role="img"/);
  });
});

describe('debrief', () => {
  function debrief(over: Partial<DebriefData> = {}): DebriefData {
    const months = [monthReport({ month: 1 }), monthReport({ month: 2 })];
    return {
      version: 1,
      createdAt: '2026-10-23T10:00:00.000Z',
      named: false,
      length: 'short',
      totalMonths: 10,
      monthsPlayed: 2,
      endedEarly: false,
      happiness: -64,
      grade: 1,
      villagers: 10,
      months,
      actionsByMonth: months.map(() => ({ food: 1, fields: 0, materials: 1, explore: 1, skills: 0, recreation: 0, unused: 0 })),
      actionShare: { food: 0.34, fields: 0, materials: 0.33, explore: 0.33, skills: 0, recreation: 0 },
      crises: [
        { kind: 'cold', month: 1, people: 4, resolvedMonth: null },
        { kind: 'hunger', month: 2, people: 1, resolvedMonth: null },
      ],
      votes: { participation: 1, ties: 0, emptyMonths: 2, averageWinningShare: 0 },
      springFoundMonth: null,
      players: [],
      questions: [{ id: 'lost', params: { month: 2 } }],
      ...over,
    };
  }

  it('a lost game: the loss banner, no stars or level, and a warmth row in the story', () => {
    const shown = text(render(Debrief, { props: { debrief: debrief({ lost: true }) } }).body);
    expect(shown).toContain('Kylä luovutti kuukautena 2. Jäänmurtaja haki kaikki kotiin.');
    expect(shown).not.toContain('Leiri rannalla');
    expect(shown).toContain('−30°');
  });

  it('a crisis names the month it began and the most people it hit', () => {
    const shown = text(render(Debrief, { props: { debrief: debrief() } }).body);
    expect(shown).toContain('Kuukaudesta 1 alkaen nuotion puut eivät riittäneet. Pahimmillaan 4 kyläläistä paleli.');
    expect(shown).toContain('Kuukaudesta 2 alkaen ruoka ei riittänyt. Pahimmillaan 1 kyläläinen jäi nälkään.');
  });

  it('a debrief stored before the arctic rules (no heat, no lost) still renders, with "–" for warmth', () => {
    const old = debrief({ crises: [], questions: [{ id: 'decision-making', params: {} }], grade: 3, happiness: 10 });
    for (const m of old.months) {
      delete (m as Partial<MonthReport>).heat;
      delete (m.mood as Partial<MonthReport['mood']>).heat;
    }
    const { body } = render(Debrief, { props: { debrief: old } });
    const shown = text(body);
    expect(shown).toContain('Kasvava kylä');
    expect(shown).not.toContain('luovutti');
    expect(shown).not.toContain('°');
    // "–" is drawn; a screen reader hears that nothing is known.
    expect(body).toMatch(/<span class="visually-hidden">Ei tietoa<\/span>/);
  });
});
