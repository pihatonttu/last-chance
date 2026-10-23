# Uudisasukkaat: toteutussuunnitelma

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Last Chance irtoaa Saarellasta: uudisasukastarina ja avajaisjuhla, talkoo- ja kyläkokouskehystys, omat merkit, vuodenajat ja talvisääntö, uudet rakennusten nimet ja kuvat.

**Architecture:** Kalenteri ja talvisääntö ovat sääntömoottorissa (`packages/rules`) puhtaina funktioina, joita botit, simulaattori, jälkipuinti, palvelin ja asiakas käyttävät samoina. Merkit lasketaan puhtaalla funktiolla tapahtumalokista (`packages/debrief`), ja palvelin lähettää ne uudella `badges`-viestillä vain pelaajalle itselleen. Asiakas laskee vuodenajan kuukauden numerosta, joten protokolla ja tallennettu jälkipuinti eivät saa uusia kenttiä. Talvikuvat renderöidään samalla Blender-putkella kuin nykyiset kuvat.

**Tech Stack:** pnpm-monorepo, Node 24 (type stripping), TypeScript 7, Vitest 5, Svelte 5 (runes), PixiJS 8, Blender 5.1 (headless), Python 3.13 + Pillow.

**Spec:** [`docs/09-uudisasukkaat.md`](../../09-uudisasukkaat.md) (Samu hyväksyi 2026-10-13).

## Global Constraints

- Säännöt pysyvät ennallaan talvisääntöä lukuun ottamatta (spec §5): tuotot, hinnat, mitoitus per kyläläinen, kierroksen vaiheet, äänestys ja tasapeli.
- Sisäiset tunnisteet `shelter`, `school`, `workshop`, `gathering` ja `spring` sekä kuvien nimet `props/shelter-1` jne. pysyvät. `DebriefData.version` on edelleen 1, eikä tallennettuun jälkipuintiin tule uusia kenttiä.
- Merkit menevät vain pelaajalle itselleen. Niitä ei näytetä projektorilla eikä vertailla, eikä niitä tallenneta levylle tai lokiin (P20, P23, P34).
- Nimimerkkejä ei koskaan tallenneta levylle (P23).
- Jokainen näkyvä teksti on tiedostossa `apps/client/src/i18n/fi.ts` (P17). i18n-testi vaatii, ettei kuolleita eikä puuttuvia avaimia ole.
- Kuvat tehdään vain Kenneyn CC0-paketeista. Alkuperäisen pelin grafiikkaa ei käytetä.
- Uusia riippuvuuksia ei tule.
- Koodi ja kommentit ovat englanniksi, dokumentit suomeksi.
- Commitit tehdään osoitteella `15238375+pihatonttu@users.noreply.github.com` (repossa jo asetettu). Viestin loppuun lisätään rivi `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Tuotantoon julkaistaan vain tehtävässä 14, ja siitä kerrotaan Samulle selvästi.
- Työkalujen polut:
  - Blender: `"/c/Program Files/Blender Foundation/Blender 5.1/blender.exe"`.
  - Kenneyn 3D-paketit: `$KITS = /c/Users/tontt/AppData/Local/Temp/claude/C--Users-tontt-Project-Pine-Project-Pine/55ef158b-4d16-4913-b19c-e50cd4bf72db/scratchpad/kenney3d/x`, alikansiot `nature/ pirate/ survival/ town/`. Jos kansio puuttuu, lataa Nature Kit, Pirate Kit, Survival Kit 2.0 ja Fantasy Town Kit 2.0 osoitteesta kenney.nl ja pura ne samaan rakenteeseen.

## Review Focus

1. **Vanha välilehti julkaisun jälkeen** (protokolla 1) yhdistää uuteen palvelimeen. Sen pitää saada "Sivu on vanhentunut", ei kaatua tuntemattomaan `badges`-viestiin. Testi: tehtävä 7, askel 1.
2. **Puuttuva kuvatiedosto kaataa koko Kenney-kartan** varakarttaan, koska `loadKenneyTexturesOrNull` hylkää kaikki kuvat yhden puuttuessa. Testi: jokaiselle `KENNEY_TEXTURES`-nimelle on tiedosto. Tehtävä 12, askel 1.
3. **Merkit:**
   - Takaisin palaava pelaaja saa merkkinsä uudelleen.
   - Poistettu pelaaja ei saa merkkejä, eikä projektori saa niitä koskaan.
   - Testit: tehtävä 7, askel 1.
4. **Kesken talven lopetettu peli:**
   - `winter-ready`-kysymystä ei saa tulla.
   - Lyhyt peli päättyy tammikuussa, ja talven pitää silloin olla "ohi".
   - Testit: tehtävä 6, askel 1 (`winterOver`) ja tehtävä 6, askel 6 (`buildDebrief`).
5. **Uudet tekstiperheet** (kuukaudet, vuodenajat, merkit, talvikysymykset) ovat täydellisiä. Puuttuva avain näkyisi lapselle raakana avaimena. Testi: tehtävä 9, askel 1 (`familyKeys`).

---

## Tiedostokartta

| Tiedosto | Vastuu | Tehtävä |
|---|---|---|
| `tools/art/render-kenney.py` | uusi spritekohtainen `snow`-valinta | 1 |
| `tools/art/kenney-snow-grass.py` (uusi) | `grass-snow.png` ruohoruudusta | 1 |
| `packages/rules/src/calendar.ts` (uusi) | kalenterikuukausi, vuodenaika, talvi, kuukaudet talveen | 2 |
| `packages/rules/src/params.ts`, `test/params.ts` | `startCalendarMonth` | 2 |
| `packages/rules/src/game.ts` | talvisääntö (`winter`-kieltäytyminen, metsän kasvu) | 3 |
| `packages/bots/src/{bot,simple,runner,index,cooperative}.ts` | `skillsOnly`, talveen varautuminen | 4 |
| `packages/sim/src/{cli,metrics,aggregate,report}.ts` | `skillsOnly`, talven nälkä -mittari | 5 |
| `packages/debrief/src/{types,questions,index}.ts`, `badges.ts` (uusi) | talvikysymykset, merkit | 6 |
| `packages/protocol/src/index.ts` | `badges`-viesti, `winter-coming`-tapahtuma, protokolla 2 | 7 |
| `apps/server/src/session.ts` | merkit omalle pelaajalle, talvivaroitus | 7 |
| `apps/client/src/net/mock/server.ts` | sama selaimen demopalvelimeen | 7 |
| `tools/art/kenney-props-spec.py`, `kenney-icons.json` | laavu, kylätalo, juhlatalo, lampi, koti- ja vieraslaivakuvake, talviversiot | 8, 11 |
| `apps/client/src/state/reducer.ts` | merkit asiakkaan tilaan | 7 |
| `apps/client/src/i18n/fi.ts`, `lib/{enums,format}.ts` | tekstit, listat, kuukauden nimi, pilkkiminen | 9 |
| `apps/client/src/components/*` | yläpalkki, ruutu, yhteenveto, säännöt, loppuruutu, merkit, jälkipuinti, tapahtumat | 10 |
| `apps/client/src/map/{kenney,renderer,sprites}.ts`, `MapView.svelte` | talvikartta | 12 |
| `docs/*` | päätökset P40–P47, pelisuunnittelu, ohjeet | 13 |

---

### Task 1: Lumikokeilu (kuva Samulle)

Tavoitteena on näyttää Samulle, miltä talvi näyttää, ennen kuin kaikki talvikuvat renderöidään (tehtävä 11). Tehtävät 2–10 eivät odota vastausta.

**Files:**
- Modify: `tools/art/render-kenney.py`
- Create: `tools/art/kenney-snow-grass.py`
- Create: `docs/art/2026-10-13-lumikokeilu.jpg`

**Interfaces:**
- Produces:
  - spritekohtainen avain `"snow": true` render-kenney.py:n speksissä (tehtävä 11 käyttää sitä);
  - `apps/client/public/art/kenney/grass-snow.png` (tehtävä 12 käyttää sitä).

- [ ] **Step 1: Lisää lumi render-kenney.py:hin**

Lisää funktio `recolor`-funktion jälkeen ja kutsu sitä renderöintisilmukassa:

```python
SNOW = spec.get('snowColor', '#f1f6fa')


def socket(sockets, identifier):
    return next(s for s in sockets if s.identifier == identifier)


def add_snow(objects):
    """Snow on every face that points up: each material's colour is mixed toward white by
    how much the surface normal points up (world space), so roofs, tree tops and the ground
    turn white and walls keep their colour (docs/09-uudisasukkaat.md §3.3)."""
    snow = [srgb_to_linear(c) for c in hex_rgb(SNOW)]
    done = set()
    for o in objects:
        if o.type != 'MESH':
            continue
        for mat in o.data.materials:
            if not mat or not mat.use_nodes or mat.name in done:
                continue
            done.add(mat.name)
            nodes, links = mat.node_tree.nodes, mat.node_tree.links
            for bsdf in [n for n in nodes if n.type == 'BSDF_PRINCIPLED']:
                base = bsdf.inputs['Base Color']
                geometry = nodes.new('ShaderNodeNewGeometry')
                split = nodes.new('ShaderNodeSeparateXYZ')
                links.new(geometry.outputs['Normal'], split.inputs['Vector'])
                ramp = nodes.new('ShaderNodeMapRange')
                ramp.inputs['From Min'].default_value = 0.55
                ramp.inputs['From Max'].default_value = 0.8
                links.new(split.outputs['Z'], ramp.inputs['Value'])
                mix = nodes.new('ShaderNodeMix')
                mix.data_type = 'RGBA'
                links.new(ramp.outputs['Result'], socket(mix.inputs, 'Factor_Float'))
                colour_a = socket(mix.inputs, 'A_Color')
                if base.links:
                    links.new(base.links[0].from_socket, colour_a)
                else:
                    colour_a.default_value = base.default_value
                socket(mix.inputs, 'B_Color').default_value = (*snow, 1)
                links.new(socket(mix.outputs, 'Result_Color'), base)
```

Silmukassa `recolor(...)`-rivin jälkeen:

```python
    if sprite.get('snow'):
        add_snow(list(bpy.context.scene.objects))
```

Päivitä tiedoston docstringiin rivi: `A sprite with "snow": true gets snow on its upward faces (winter variants).`

- [ ] **Step 2: Kirjoita ruohoruudun lumiversio**

`tools/art/kenney-snow-grass.py`:

```python
"""Write grass-snow.png: the land block with snow on its top, for winter months.

Usage: python -I tools/art/kenney-snow-grass.py

Reads apps/client/public/art/kenney/grass.png (the Tower Defense block, 132 x 99 with a
132 x 66 top diamond) and writes grass-snow.png next to it: the top diamond turns snow
white with a hint of the grass texture left in it; the dirt sides stay as they are.
"""
import os

from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
art = os.path.join(os.path.dirname(os.path.dirname(here)), 'apps', 'client', 'public', 'art', 'kenney')
SNOW = (241, 246, 250)

image = Image.open(os.path.join(art, 'grass.png')).convert('RGBA')
px = image.load()
width = image.width
for y in range(66):
    for x in range(width):
        r, g, b, a = px[x, y]
        if a == 0 or abs(x - 65.5) / 66 + abs(y - 32.5) / 33 > 1.0:
            continue
        shade = 0.9 + 0.1 * (0.3 * r + 0.59 * g + 0.11 * b) / 160
        px[x, y] = (*(min(255, round(c * shade)) for c in SNOW), a)
image.save(os.path.join(art, 'grass-snow.png'), optimize=True)
print('grass-snow', image.size)
```

Run: `python -I tools/art/kenney-snow-grass.py`
Expected: `grass-snow (132, 99)`

- [ ] **Step 3: Renderöi kokeilukuvat**

Kirjoita kokeiluspeksi scratchpadiin. Kopioi `tools/art/kenney-props.json`, jätä siihen vain sprite-nimet `forest-3a`, `shelter-3`, `field-0` ja `school-2`, ja lisää jokaisesta kopio, jonka nimeen on lisätty `-snow` ja jossa on `"snow": true`. Esimerkiksi Pythonilla:

```bash
SP=/c/Users/tontt/AppData/Local/Temp/claude/C--Users-tontt-Project-Pine-Project-Pine/55ef158b-4d16-4913-b19c-e50cd4bf72db/scratchpad
python -I -c "
import json,sys
spec=json.load(open('tools/art/kenney-props.json',encoding='utf-8'))
keep=[s for s in spec['sprites'] if s['name'] in ('forest-3a','shelter-3','field-0','school-2')]
spec['sprites']=keep+[{**s,'name':s['name']+'-snow','snow':True} for s in keep]
json.dump(spec,open(sys.argv[1],'w',encoding='utf-8'))
" $SP/snow-spike.json
"/c/Program Files/Blender Foundation/Blender 5.1/blender.exe" -b --factory-startup -P tools/art/render-kenney.py -- $SP/snow-spike.json $SP/kenney3d/x $SP/snow-spike
```

Expected: `rendered forest-3a` … `rendered school-2-snow` (8 riviä).

- [ ] **Step 4: Kokoa vertailukuva ja tarkista se itse**

Koosta vertailukuva scratchpadiin kirjoitetulla Python-skriptillä samaan tapaan kuin `tools/art/kenney-hero.py`:
- Rivi 1 on kesä ja rivi 2 talvi.
- Kussakin rivissä on neljä ruutua: `grass.png` tai `grass-snow.png` 2× skaalattuna ja kuva päällä kohdassa (`cx - 160`, `cy - 330`).

Tallenna kuva tiedostoon `docs/art/2026-10-13-lumikokeilu.jpg` (leveys 1200 px, JPEG-laatu 88) ja katso se Read-työkalulla.

Jos lumi näkyy seinillä tai puuttuu katoilta, säädä `From Min` / `From Max` -arvoja ja renderöi uudelleen. Kuvan pitää täyttää nämä:
- talvikatot ja puiden latvat ovat valkoiset;
- seinät pysyvät puun värisinä;
- pelto on lumen alla, mutta aidat näkyvät.

- [ ] **Step 5: Commit ja kuva Samulle**

```bash
git add tools/art/render-kenney.py tools/art/kenney-snow-grass.py apps/client/public/art/kenney/grass-snow.png docs/art/2026-10-13-lumikokeilu.jpg
git commit -m "Art: snow on upward faces for winter sprites, snowy grass block, spike picture"
```

Lähetä kuva SendUserFile-työkalulla (`status: proactive`). Kuvateksti: "Lumikokeilu: ylärivi kesä, alarivi talvi. Kelpaako tämä talven ilmeeksi?" Tehtävä 11 odottaa Samun vastausta. Tehtäviä 2–10 voi jatkaa sillä välin.

---

### Task 2: Kalenteri säännöissä

**Files:**
- Create: `packages/rules/src/calendar.ts`
- Modify: `packages/rules/src/params.ts` (GameParams + DEFAULT_PARAMS)
- Modify: `packages/rules/test/params.ts` (RULE_TEST_PARAMS)
- Modify: `packages/rules/src/index.ts`
- Test: `packages/rules/test/calendar.test.ts`

**Interfaces:**
- Produces (from `@saari/rules`):
  - `type Season = 'spring' | 'summer' | 'autumn' | 'winter'`
  - `calendarMonth(month: number, params: Pick<GameParams, 'startCalendarMonth'>): number` (1–12, 1 = tammikuu; kuukausi 0 eli aula = kuukausi 1)
  - `seasonOfCalendarMonth(calendar: number): Season`
  - `seasonOf(month: number, params): Season`
  - `isWinter(month: number, params): boolean`
  - `monthsUntilWinter(month: number, totalMonths: number, params): number | null`
  - `GameParams.startCalendarMonth: number` (oletus 4)

- [ ] **Step 1: Kirjoita testit**

`packages/rules/test/calendar.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { calendarMonth, isWinter, monthsUntilWinter, seasonOf, seasonOfCalendarMonth } from '../src/calendar.ts';
import { RULE_TEST_PARAMS as P } from './params.ts';

describe('calendar (docs/09-uudisasukkaat.md §3.1)', () => {
  it('starts in April: game months 1..15 run from April to the next June', () => {
    expect(Array.from({ length: 15 }, (_, i) => calendarMonth(i + 1, P))).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6]);
  });

  it('counts the lobby (month 0) as the first month', () => {
    expect(calendarMonth(0, P)).toBe(4);
  });

  it('uses the seasons Finnish schools teach', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(seasonOfCalendarMonth)).toEqual([
      'winter', 'winter', 'spring', 'spring', 'spring', 'summer',
      'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter',
    ]);
  });

  it('puts winter in months 9-11 of a normal game and 9-10 of a short one', () => {
    const winter = (total: number) => Array.from({ length: total }, (_, i) => i + 1).filter((m) => isWinter(m, P));
    expect(winter(15)).toEqual([9, 10, 11]);
    expect(winter(10)).toEqual([9, 10]);
    expect(seasonOf(12, P)).toBe('spring');
    expect(seasonOf(7, P)).toBe('autumn');
  });

  it('counts the months until winter; null in winter, after the last winter or when the game ends first', () => {
    expect(monthsUntilWinter(1, 15, P)).toBe(8);
    expect(monthsUntilWinter(7, 15, P)).toBe(2);
    expect(monthsUntilWinter(8, 15, P)).toBe(1);
    expect(monthsUntilWinter(9, 15, P)).toBeNull();
    expect(monthsUntilWinter(12, 15, P)).toBeNull();
    expect(monthsUntilWinter(7, 8, P)).toBeNull();
  });

  it('follows the start month parameter', () => {
    expect(calendarMonth(1, { startCalendarMonth: 12 })).toBe(12);
    expect(calendarMonth(2, { startCalendarMonth: 12 })).toBe(1);
  });
});
```

- [ ] **Step 2: Aja testit ja varmista, että ne epäonnistuvat**

Run: `pnpm --filter @saari/rules exec vitest run test/calendar.test.ts`
Expected: FAIL, "Failed to load url ../src/calendar.ts" (tiedostoa ei ole).

- [ ] **Step 3: Toteuta**

`packages/rules/src/calendar.ts`:

```ts
import type { GameParams } from './params.ts';

/** Seasons as Finnish schools count them (docs/09-uudisasukkaat.md §3.1). */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

type CalendarParams = Pick<GameParams, 'startCalendarMonth'>;

/** Calendar month 1..12 (1 = January) of game month 1, 2, ...; the lobby (0) counts as month 1. */
export function calendarMonth(month: number, params: CalendarParams): number {
  return ((params.startCalendarMonth - 1 + Math.max(1, month) - 1) % 12) + 1;
}

/** Spring March-May, summer June-August, autumn September-November, winter December-February. */
export function seasonOfCalendarMonth(calendar: number): Season {
  if (calendar >= 3 && calendar <= 5) return 'spring';
  if (calendar >= 6 && calendar <= 8) return 'summer';
  if (calendar >= 9 && calendar <= 11) return 'autumn';
  return 'winter';
}

export function seasonOf(month: number, params: CalendarParams): Season {
  return seasonOfCalendarMonth(calendarMonth(month, params));
}

/** Winter months: fields lie under snow and forests do not grow (§3.2). */
export function isWinter(month: number, params: CalendarParams): boolean {
  return seasonOf(month, params) === 'winter';
}

/**
 * Months from `month` until the first winter month after it (1 = winter starts next month);
 * null when it is winter now or no winter month comes before the game ends.
 */
export function monthsUntilWinter(month: number, totalMonths: number, params: CalendarParams): number | null {
  if (isWinter(month, params)) return null;
  for (let m = month + 1; m <= totalMonths; m++) if (isWinter(m, params)) return m - month;
  return null;
}
```

`packages/rules/src/params.ts`: Lisää `GameParams`-rajapintaan heti `months`-kentän jälkeen:

```ts
  /** Calendar month (1 = January) of the game's first month; the game starts in spring (docs/09 §3.1). */
  startCalendarMonth: number;
```

`DEFAULT_PARAMS`-olioon kenttä `startCalendarMonth: 4,` heti rivin `months: { normal: 15, short: 10 },` jälkeen. Lisää sama kenttä `packages/rules/test/params.ts`:n `RULE_TEST_PARAMS`-olioon `months`-rivin jälkeen.

`packages/rules/src/index.ts`: lisää rivi `export * from './calendar.ts';` rivin `export * from './game.ts';` yläpuolelle.

- [ ] **Step 4: Aja koko sääntöpaketin testit ja tyypit**

Run: `pnpm --filter @saari/rules test && pnpm --filter @saari/rules typecheck`
Expected: PASS. Jos jokin muu testi vertaa koko `GameParams`-oliota kentittäin (esim. `params.test.ts` tai `queries.test.ts`), lisää siihen `startCalendarMonth: 4`.

- [ ] **Step 5: Commit**

```bash
git add packages/rules
git commit -m "Rules: calendar - the game starts in April, seasons by the school calendar"
```

---

### Task 3: Talvisääntö

**Files:**
- Modify: `packages/rules/src/game.ts` (Refusal, kentän plan, #endOfMonth)
- Modify: `apps/client/src/lib/enums.ts` (REFUSALS)
- Modify: `apps/client/src/i18n/fi.ts` (`refusal.winter`)
- Test: `packages/rules/test/winter.test.ts`

**Interfaces:**
- Consumes: `isWinter` (tehtävä 2)
- Produces: `Refusal` sisältää `'winter'`. Sadonkorjuun esikatselu talvella on `{ kind: 'harvest', available: false, reason: 'winter' }`.

- [ ] **Step 1: Kirjoita testit**

`packages/rules/test/winter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { act, finishMonth, setup, tileAt } from './helpers.ts';

/** SMALL_ISLAND: landing (3,5); (2,5) is a meadow and (3,4) a forest, both visible from the start. */
function gameWithField() {
  const game = setup({ players: 3 });
  for (const p of ['p1', 'p2', 'p3']) act(game, p, 2, 5); // 3 x 1 work: the meadow becomes a field
  expect(tileAt(game, 2, 5).terrain).toBe('field');
  return game;
}

describe('winter (docs/09-uudisasukkaat.md §3.2)', () => {
  it('fields lie under snow from December to February and can be harvested again in March', () => {
    const game = gameWithField();
    while (game.month < 9) finishMonth(game); // December
    expect(game.preview('p1', 2, 5)).toMatchObject({ kind: 'harvest', available: false, reason: 'winter' });
    expect(game.act('p1', 2, 5)).toEqual({ ok: false, reason: 'winter' });
    while (game.month < 12) finishMonth(game); // March
    expect(game.preview('p1', 2, 5)).toMatchObject({ kind: 'harvest', available: true });
  });

  it('harvests normally in November', () => {
    const game = gameWithField();
    while (game.month < 8) finishMonth(game);
    expect(game.preview('p1', 2, 5)).toMatchObject({ kind: 'harvest', available: true });
  });

  it('forests do not grow at the end of a winter month, and grow again after March', () => {
    const game = setup({ players: 1 });
    while (game.month < 9) finishMonth(game);
    act(game, 'p1', 3, 4); // chop 10: 40 -> 30
    expect(tileAt(game, 3, 4).stock).toBe(30);
    finishMonth(game); // end of December
    expect(tileAt(game, 3, 4).stock).toBe(30);
    while (game.month < 12) finishMonth(game); // through January and February
    expect(tileAt(game, 3, 4).stock).toBe(30);
    finishMonth(game); // end of March: ceil(30 x 1.25)
    expect(tileAt(game, 3, 4).stock).toBe(38);
  });

  it('fishing, chopping and plowing work in winter', () => {
    const game = setup({ players: 1 });
    while (game.month < 10) finishMonth(game);
    expect(game.preview('p1', 3, 6)).toMatchObject({ kind: 'fish', available: true });
    expect(game.preview('p1', 3, 4)).toMatchObject({ kind: 'chop', available: true });
    expect(game.preview('p1', 4, 5)).toMatchObject({ kind: 'plow', available: true });
  });
});
```

- [ ] **Step 2: Aja testit ja varmista, että ne epäonnistuvat**

Run: `pnpm --filter @saari/rules exec vitest run test/winter.test.ts`
Expected: FAIL. Ensimmäinen testi saa `available: true`, ja metsätesti saa arvon 38 eikä 30.

- [ ] **Step 3: Toteuta**

`game.ts`:
1. Lisää import: `import { isWinter } from './calendar.ts';`
2. `Refusal`-unioniin lisätään rivi `| 'winter'` rivin `| 'field-empty'` jälkeen.
3. Korvaa `case 'field'`:

```ts
      case 'field': {
        const amount = Math.min(tile.stock, Math.round(P.harvestYield * m));
        // Winter (docs/09 §3.2): the field lies under snow until spring.
        const refusal = isWinter(this.#month, P) ? ('winter' as const) : tile.stock <= 0 ? ('field-empty' as const) : undefined;
        return {
          kind: 'harvest',
          yield: { type: 'resource', resource: 'food', amount },
          ...(refusal ? { refusal } : {}),
          perform: () => {
            tile.stock -= amount;
            return this.#add('food', amount);
          },
        };
      }
```

4. Korvaa `#endOfMonth`:n luontosilmukka:

```ts
    // Nothing grows in winter (docs/09 §3.2); fields refill as before, so they are full in March.
    const winter = isWinter(this.#month, P);
    for (const t of this.#tiles) {
      if (t.terrain === 'forest' && !winter) t.stock = Math.min(P.forestCapacity, Math.ceil(t.stock * P.forestRegrowth));
      if (t.terrain === 'field') t.stock = P.fieldCapacity;
      t.uses = 0;
    }
```

`apps/client/src/lib/enums.ts`: `REFUSALS`-olioon `winter: true,` rivin `'field-empty': true,` jälkeen.

`apps/client/src/i18n/fi.ts`: rivin `'refusal.field-empty'` jälkeen lisätään `'refusal.winter': 'Pelto on lumen alla. Se kasvaa taas keväällä.',`

- [ ] **Step 4: Aja testit**

Run: `pnpm --filter @saari/rules test && pnpm --filter @saari/client test && pnpm -r typecheck`
Expected: PASS. Jos jokin vanha sääntötesti korjaa satoa kuukausina 9–11 (esim. `smoke.test.ts` tai `actions.test.ts`), siirrä se korjaamaan ennen joulukuuta. Talvisääntö on tarkoituksellinen sääntömuutos.

- [ ] **Step 5: Commit**

```bash
git add packages/rules apps/client/src/lib/enums.ts apps/client/src/i18n/fi.ts
git commit -m "Rules: winter - no harvest from December to February, forests rest"
```

---

### Task 4: Botit: `skillsOnly` ja talveen varautuminen

**Files:**
- Modify: `packages/bots/src/bot.ts`, `simple.ts`, `runner.ts`, `index.ts`, `cooperative.ts`
- Modify: `packages/bots/test/runner.test.ts`, `simple-bots.test.ts` (nimi)
- Modify: `packages/debrief/test/real-games.test.ts` (`mix: { skillsOnly: 1 }`), `packages/debrief/src/questions.ts` (kommentti "lazy and selfish" → "lazy and skills-only")
- Modify: `apps/client/src/net/mock/server.ts` (`BOT_MIX`: `'selfish'` → `'skillsOnly'`)
- Test: `packages/bots/test/cooperative.test.ts`

**Interfaces:**
- Consumes: `isWinter`, `monthsUntilWinter` (tehtävä 2)
- Produces:
  - `Strategy = 'cooperative' | 'random' | 'skillsOnly' | 'lazy'`
  - `skillsOnlyBot: Bot`
  - `foodTarget(game: Game): number` (vientinä tiedostosta `cooperative.ts` ja paketin `index.ts`:stä)

- [ ] **Step 1: Kirjoita testit**

Lisää `packages/bots/test/cooperative.test.ts`:n loppuun. Lisää `foodTarget` importtiin `../src/index.ts`:stä.

```ts
describe('cooperative bot and winter (docs/09-uudisasukkaat.md §3.5)', () => {
  it("wants this month's need outside the run-up to winter", () => {
    const game = newGame();
    while (game.month < 4) voteAll(game, 'none'); // July
    expect(foodTarget(game)).toBe(game.foodNeed());
    while (game.month < 6) voteAll(game, 'none'); // September: winter is still 3 months away
    expect(foodTarget(game)).toBe(game.foodNeed());
  });

  it('fills the store in October and November: this month plus what keeps over the month end', () => {
    const game = newGame();
    while (game.month < 7) voteAll(game, 'none');
    expect(foodTarget(game)).toBe(game.foodNeed() + game.foodStorage());
    voteAll(game, 'none');
    expect(foodTarget(game)).toBe(game.foodNeed() + game.foodStorage());
  });

  it('in winter wants the food of the winter months still ahead', () => {
    const game = newGame();
    while (game.month < 9) voteAll(game, 'none');
    expect(foodTarget(game)).toBe(3 * game.foodNeed());
    voteAll(game, 'none');
    expect(foodTarget(game)).toBe(2 * game.foodNeed());
    voteAll(game, 'none');
    expect(foodTarget(game)).toBe(game.foodNeed());
  });
});
```

Muuta `runner.test.ts`:ssä `seatsFor({ cooperative: 1, random: 1, selfish: 1 }, 2)` muotoon `seatsFor({ cooperative: 1, random: 1, skillsOnly: 1 }, 2)`. Muuta `simple-bots.test.ts`:ssä jokainen `selfishBot` muotoon `skillsOnlyBot` ja `'selfish'` muotoon `'skillsOnly'`.

- [ ] **Step 2: Aja testit ja varmista, että ne epäonnistuvat**

Run: `pnpm --filter @saari/bots test`
Expected: FAIL. `foodTarget` puuttuu, eikä `skillsOnly`-strategiaa ole.

- [ ] **Step 3: Toteuta**

`bot.ts`: `export type Strategy = 'cooperative' | 'random' | 'skillsOnly' | 'lazy';`

`simple.ts`: korvaa `selfishBot`:

```ts
/**
 * Studies and makes tools whenever it can and votes for school and workshop. A class that
 * only learns gathers no food: the balance check of core c (P7), not a moral label (docs/09 §2.2).
 */
export const skillsOnlyBot: Bot = {
  strategy: 'skillsOnly',
  chooseAction(game, playerId, rng) {
    if (!hasActionsLeft(game, playerId)) return null;
    const moves = availableMoves(game, playerId);
    const own = movesOfKind(moves, 'study', 'make-tools');
    if (own.length > 0) return toCoord(rng.pick(own));
    return moves.length > 0 ? toCoord(rng.pick(moves)) : null;
  },
  chooseVote(game, _playerId, rng) {
    const open = openOptions(game);
    const own = open.filter((o) => o.kind === 'school' || o.kind === 'workshop');
    return rng.pick(own.length > 0 ? own : open).id;
  },
};
```

`runner.ts`: import `skillsOnlyBot`, ja `case 'skillsOnly': return skillsOnlyBot;`.
`index.ts`: muuta vientirivi muotoon `export { lazyBot, randomAction, randomBot, skillsOnlyBot } from './simple.ts';` ja lisää `foodTarget` cooperative-vientiin.

`cooperative.ts`:
- Import: `import { chebyshev, isWinter, monthsUntilWinter, type Coord, type Game, type Rng, type VoteOption } from '@saari/rules';`
- Uusi vakio ja funktio `SKILL_HORIZON`-vakion jälkeen:

```ts
/** Months before winter in which the class fills the store (October and November). */
const WINTER_PREP_MONTHS = 2;

/**
 * Food the class wants in store now. Fields lie under snow from December to February
 * (docs/09 §3.2), so in the two months before winter it wants this month's meal plus all
 * that keeps over the month end, and in winter the need of every winter month still ahead.
 * Never more than this month's meal plus the store limit; otherwise this month's need.
 */
export function foodTarget(game: Game): number {
  const need = game.foodNeed();
  const P = game.params;
  const cap = need + game.foodStorage();
  if (isWinter(game.month, P)) {
    let months = 0;
    for (let m = game.month; m <= game.totalMonths && isWinter(m, P); m++) months += 1;
    return Math.min(need * months, cap);
  }
  const until = monthsUntilWinter(game.month, game.totalMonths, P);
  if (until !== null && until <= WINTER_PREP_MONTHS) return cap;
  return need;
}
```

- Funktion `choose` kohta 1:

```ts
  // 1. Nobody goes hungry this month, and the store carries the village through winter.
  if (food < foodTarget(game)) {
    const m = richest(movesOfKind(moves, 'harvest')) ?? richest(movesOfKind(moves, 'fish'));
    if (m) return m;
  }
```

Päivitä `apps/client/src/net/mock/server.ts`:n `BOT_MIX`, `packages/debrief/test/real-games.test.ts`:n `{ selfish: 1 }` ja `packages/debrief/src/questions.ts`:n kommentti.

- [ ] **Step 4: Aja testit**

Run: `pnpm --filter @saari/bots test && pnpm --filter @saari/debrief test && pnpm -r typecheck`
Expected: PASS. Simulaattorin `cli.ts` muutetaan tehtävässä 5. Jos `pnpm -r typecheck` kaatuu nyt `packages/sim/src/cli.ts`:n `selfish`-sanaan, tee tehtävän 5 askel 3:n `STANDARD_SCENARIOS`-muutos jo tässä.

- [ ] **Step 5: Commit**

```bash
git add packages/bots packages/debrief packages/sim apps/client/src/net/mock/server.ts
git commit -m "Bots: skills-only instead of selfish, cooperative class stocks food for winter"
```

---

### Task 5: Simulaattori ja tasapainon uudelleenviritys

**Files:**
- Modify: `packages/sim/src/cli.ts` (`STANDARD_SCENARIOS`), `metrics.ts`, `aggregate.ts`, `report.ts`
- Modify: `packages/sim/test/cli.test.ts`, `metrics.test.ts`, `fixtures.ts`, `aggregate.test.ts`, `report.test.ts`
- Modify: `packages/rules/src/params.ts` (`gradeThresholds`)
- Create: `docs/sim/2026-10-13-seasons.md`
- Modify: `docs/05-tasapaino.md`

**Interfaces:**
- Consumes: `isWinter` (tehtävä 2), `skillsOnly` (tehtävä 4)
- Produces:
  - `GameMetrics.winterHungryMonths: number`
  - `Summary.winterHungerRate: number` (0–1)
  - raportin sarake `winter hunger`
  - uudet `DEFAULT_PARAMS.gradeThresholds`

- [ ] **Step 1: Kirjoita testit**

`metrics.test.ts`:
- Lisää `import { DEFAULT_PARAMS } from '@saari/rules';`.
- Lisää käsin tehtyyn `fake`-peliin kenttä `params: DEFAULT_PARAMS,`.
- Lisää testi:

```ts
  it('counts the hungry months that fell in winter', () => {
    const hungry = { before: 0, need: 8, eaten: 0, hungry: 2, spoiled: 0, after: 0 };
    const wintry = measureGame({ ...fake, reports: [9, 10, 11, 12].map((month) => report(month, { food: hungry })) });
    expect(wintry.winterHungryMonths).toBe(3);
    expect(wintry.hungryMonths).toBe(4);
  });
```

(Testi kuuluu `describe('measureGame on a hand-made game'`-lohkoon, jossa `report`-apuri ja `fake` ovat.)

`fixtures.ts`: `fakeMetrics`-olioon `winterHungryMonths: 0,` rivin `hungryMonths: 0,` jälkeen.

`aggregate.test.ts`: lisää testi:

```ts
  it('reports the share of games with hunger in winter', () => {
    const s = summarize([fakeMetrics({ winterHungryMonths: 2 }), fakeMetrics(), fakeMetrics(), fakeMetrics({ winterHungryMonths: 1 })]);
    expect(s.winterHungerRate).toBe(0.5);
  });
```

`report.test.ts`: header-testiin `expect(lines[0]).toContain('| winter hunger |');`.

`cli.test.ts`: `'selfish'` → `'skillsOnly'` kaikissa odotuksissa (nimet ja rivit `'skillsOnly N=2'` jne.).

- [ ] **Step 2: Aja testit ja varmista, että ne epäonnistuvat**

Run: `pnpm --filter @saari/sim test`
Expected: FAIL. Kentät `winterHungryMonths` ja `winterHungerRate` puuttuvat, eikä saraketta ole.

- [ ] **Step 3: Toteuta**

`cli.ts`: `{ name: 'skillsOnly', mix: { skillsOnly: 1 }, short: false },`

`metrics.ts`:
- import `isWinter` from `@saari/rules`;
- `MeasurableGame`-tyyppiin `'params'` Pick-listaan;
- `GameMetrics`-rajapintaan `hungryMonths`-kentän jälkeen:

```ts
  /** Hungry months that fell in winter (December-February, docs/09 §3.5). */
  winterHungryMonths: number;
```

- ja `measureGame`-paluuarvoon `hungryMonths`-rivin jälkeen:

```ts
    winterHungryMonths: reports.filter((r) => r.food.hungry > 0 && isWinter(r.month, game.params)).length,
```

`aggregate.ts`:
- `Summary`-rajapintaan `hungryMonths`-kentän jälkeen `/** Share of games with at least one hungry winter month. */ winterHungerRate: number;`;
- `summarize`-paluuarvoon `winterHungerRate: rate(metrics.filter((m) => m.winterHungryMonths > 0).length),`.

`report.ts`:
- `mainRow`-listaan `fixed(s.hungryMonths, 1),`-rivin jälkeen `percent(s.winterHungerRate),`;
- otsikoihin `'hungry months',`-rivin jälkeen `'winter hunger',`;
- tasauslistaan yksi `'r'` lisää samaan kohtaan (lista on 15 alkiota pitkä);
- funktion `markdownReport` kommenttiin "hunger and shelter months" → "hunger months, the share of games hungry in winter, shelter months".

- [ ] **Step 4: Aja testit**

Run: `pnpm --filter @saari/sim test && pnpm -r typecheck`
Expected: PASS

- [ ] **Step 5: Aja simulaatio nykyisillä arvosanarajoilla**

```bash
cd packages/sim && node src/cli.ts --seeds 40 --villagers 2,15,30,40 --short > ../../docs/sim/2026-10-13-seasons.md; cd ../..
```

Lue raportti. Kirjaa ylös kunkin skenaarion `happiness p10/p50/p90` ja `winter hunger`, ja vertaa niitä vanhaan raporttiin `docs/sim/2026-10-09-defaults.md`.

- [ ] **Step 6: Viritä arvosanarajat**

Hyväksymisehdot (spec §3.5), Normaali ja Lyhyt peli, N = 15–40:
- yhteistyö saa 5–6 vähintään 80 %:ssa peleistä;
- sekoitus on enimmäkseen 5, vaihteluväli 4–6;
- satunnainen saa 2–3;
- `skillsOnly` saa 1–2;
- 15 ja 30 pelaajan yhteistyömediaanit eroavat alle 15 %;
- yhteistyön `winter hunger` on enintään 20 %;
- sekoituksen `winter hunger` on suurempi kuin 0 %.

Menettely:
1. Aseta `gradeThresholds[length]` niin, että raja 6 on yhteistyön p50:n tuntumassa, raja 5 yhteistyön p10:n alapuolella ja sekoituksen p50:n tuntumassa, raja 4 sekoituksen p10:n alapuolella, raja 3 satunnaisen p90:n yläpuolella ja raja 2 `skillsOnly`-skenaarion p90:n yläpuolella.
2. Kokeile ensin ilman koodimuutosta osittaisella parametritiedostolla, esim. `--params ../../../scratch.json` (JSON-muoto `{ "gradeThresholds": { "normal": [..5 lukua..], "short": [...] } }`).
3. Kun ehdot täyttyvät, kirjoita luvut `DEFAULT_PARAMS.gradeThresholds`-kenttään ja aja askeleen 5 komento uudelleen, jotta raportti vastaa oletuksia.

Jos yhteistyön talvinälkä ylittää 20 %, korjaa ensin yhteistyöbotin `foodTarget`-kohta ennen rajojen virittämistä. Botti ei saa olla huonompi kuin hyvin toimiva luokka.

- [ ] **Step 7: Päivitä `docs/05-tasapaino.md`**

- Muuta tilarivi muotoon "viritetty 2026-10-09, vuodenajat 2026-10-13".
- Lisää osio "### Vuodenajat (2026-10-13, docs/09-uudisasukkaat.md)". Siihen tulevat talvisääntö, yhteistyöbotin varautuminen, uudet arvosanarajat taulukkona (vanha → uusi) ja `winter hunger` -tulokset.
- Muuta "itsekäs" muotoon "vain taidot (`skillsOnly`)" koko dokumentissa.
- Poista tunnetuista rajoituksista kohta "Ruoka on painetta vain heikoille luokille", jos sekoituksen talvinälkä on yli 0 %. Kirjaa muuten, mitä havaittiin.
- Raporttilinkiksi `sim/2026-10-13-seasons.md`.

- [ ] **Step 8: Commit**

```bash
git add packages/sim packages/rules/src/params.ts docs/sim/2026-10-13-seasons.md docs/05-tasapaino.md
git commit -m "Sim: winter hunger metric, grade thresholds re-tuned for the seasons"
```

---

### Task 6: Jälkipuinti: talvikysymykset ja merkit

**Files:**
- Modify: `packages/debrief/src/types.ts` (QuestionId)
- Modify: `packages/debrief/src/questions.ts` (QuestionFacts, QUESTION_IDS, triggered, pickQuestions)
- Modify: `packages/debrief/src/index.ts` (buildDebrief, viennit)
- Create: `packages/debrief/src/badges.ts`
- Test: `packages/debrief/test/questions.test.ts`, `packages/debrief/test/badges.test.ts`, `packages/debrief/test/debrief.test.ts`

**Interfaces:**
- Consumes: `isWinter` (tehtävä 2)
- Produces (from `@saari/debrief`):
  - `QuestionId`: lisäksi `'winter-hunger'` (parametrit `month`, `people`) ja `'winter-ready'` (ei parametreja)
  - `QuestionFacts`: lisäksi `winterMonths: readonly number[]`, `winterOver: boolean`, `winterHungryMonths: number`
  - `type BadgeId = 'explorer' | 'fisher' | 'lumberjack' | 'farmer' | 'stonecutter' | 'learner' | 'smith' | 'cheerer' | 'voter' | 'settler'`
  - `BADGE_IDS: readonly BadgeId[]`
  - `BADGE_RULES`
  - `badgesFor(log: readonly LogEntry[], playerId: string, monthsPlayed: number): BadgeId[]`

- [ ] **Step 1: Kirjoita kysymystestit**

`questions.test.ts`: lisää `quiet()`-oletuksiin `winterMonths: [], winterOver: false, winterHungryMonths: 0,` ja testit:

```ts
describe('winter questions (docs/09-uudisasukkaat.md §3.4)', () => {
  it('asks about winter hunger instead of hunger when the food first ran out in winter', () => {
    const facts = quiet({
      crises: [{ kind: 'hunger', month: 10, people: 5, resolvedMonth: 12 }],
      winterMonths: [9, 10, 11],
      winterOver: true,
      winterHungryMonths: 1,
    });
    expect(find(facts, 'winter-hunger')).toEqual({ id: 'winter-hunger', params: { month: 10, people: 5 } });
    expect(find(facts, 'hunger')).toBeUndefined();
  });

  it('keeps the hunger question when the first hungry month was before winter', () => {
    const facts = quiet({
      crises: [
        { kind: 'hunger', month: 4, people: 2, resolvedMonth: 5 },
        { kind: 'hunger', month: 10, people: 6, resolvedMonth: 11 },
      ],
      winterMonths: [9, 10, 11],
      winterOver: true,
      winterHungryMonths: 1,
    });
    expect(find(facts, 'hunger')).toEqual({ id: 'hunger', params: { month: 4, people: 6 } });
    expect(ids(facts)).not.toContain('winter-hunger');
  });

  it('asks how the class got ready when the food lasted through the whole winter', () => {
    expect(ids(quiet({ winterMonths: [9, 10, 11], winterOver: true }))).toEqual(['winter-ready', 'next-time', 'decision-making']);
  });

  it('does not ask it before the winter is over or after a hungry winter', () => {
    expect(ids(quiet({ winterMonths: [9], winterOver: false }))).not.toContain('winter-ready');
    expect(ids(quiet({ winterMonths: [9, 10, 11], winterOver: true, winterHungryMonths: 1 }))).not.toContain('winter-ready');
  });
});
```

- [ ] **Step 2: Kirjoita merkkitestit**

`packages/debrief/test/badges.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { badgesFor } from '../src/badges.ts';
import { LogBuilder, noneWon } from './fakes.ts';

const RESULT = noneWon({ none: 1 });

/** Three months: p1 explores twice and fishes once a month and votes; p2 does one thing a month and never votes. */
function threeMonths() {
  const b = new LogBuilder().join('p1', 'p2');
  for (const m of [1, 2, 3]) {
    b.month(m).act('p1', 'explore', 2).act('p1', 'fish').act('p2', m === 1 ? 'chop' : m === 2 ? 'mine' : 'study');
    b.votePhase().vote('p1', 'none').result(RESULT);
  }
  return b;
}

describe('badgesFor (docs/09-uudisasukkaat.md §2.3)', () => {
  it('gives the two most used kinds of work, and voter for voting in every meeting', () => {
    expect(badgesFor(threeMonths().entries, 'p1', 3)).toEqual(['explorer', 'fisher', 'voter']);
  });

  it('needs three actions and a fifth of the player\'s own actions; settler when nothing fits', () => {
    expect(badgesFor(threeMonths().entries, 'p2', 3)).toEqual(['settler']);
  });

  it('breaks ties in display order and gives at most two work badges', () => {
    const b = new LogBuilder().join('p1').month(1).act('p1', 'study', 3).act('p1', 'chop', 3).act('p1', 'explore', 3).votePhase().result(RESULT);
    expect(badgesFor(b.entries, 'p1', 1)).toEqual(['explorer', 'lumberjack']);
  });

  it('counts harvest and plowing as farming, mining and quarry building as stone work', () => {
    const b = new LogBuilder()
      .join('p1')
      .month(1)
      .act('p1', 'harvest', 2)
      .act('p1', 'plow', 2)
      .act('p1', 'mine')
      .act('p1', 'build-quarry', 2)
      .votePhase()
      .result(RESULT);
    expect(badgesFor(b.entries, 'p1', 1)).toEqual(['farmer', 'stonecutter']);
  });

  it('counts the meetings from joining, and needs at least three', () => {
    const b = new LogBuilder().join('p1');
    b.month(1).votePhase().vote('p1', 'none').result(RESULT);
    b.join('late'); // joins in month 1's summary: first meeting is month 2
    for (const m of [2, 3, 4]) b.month(m).votePhase().vote('p1', 'none').vote('late', 'none').result(RESULT);
    expect(badgesFor(b.entries, 'late', 4)).toEqual(['voter']);

    const short = new LogBuilder().join('p1');
    for (const m of [1, 2]) short.month(m).votePhase().vote('p1', 'none').result(RESULT);
    expect(badgesFor(short.entries, 'p1', 2)).toEqual(['settler']);
  });

  it('leaves out the actions of a month that has no report (an early end)', () => {
    const b = threeMonths().month(4).act('p2', 'study', 5);
    expect(badgesFor(b.entries, 'p2', 3)).toEqual(['settler']);
  });
});
```

Lisää `debrief.test.ts`:hen testi, joka ajaa oikean bottipelin ja tarkistaa talvitiedot. Normaali 15 kuukauden yhteistyöpeli, kuten tiedoston muut `playGame`-kutsut:

```ts
  it('fills the winter facts from the game calendar', () => {
    const game = playGame({ seed: 3, villagers: 5, length: 'short', mix: { cooperative: 1 } });
    const d = buildDebrief(game, []);
    const asked = d.questions.map((q) => q.id);
    // A short game ends in January: its winter (months 9-10) is over, so one of the two winter questions can come up.
    expect(asked.includes('winter-hunger') && asked.includes('winter-ready')).toBe(false);
  });
```

Jos `debrief.test.ts` ei vielä tuo `playGame`-funktiota, tuo se `@saari/bots`:sta kuten `real-games.test.ts`.

- [ ] **Step 3: Aja testit ja varmista, että ne epäonnistuvat**

Run: `pnpm --filter @saari/debrief test`
Expected: FAIL. `badges.ts` puuttuu, ja talvikentät ja -kysymykset puuttuvat.

- [ ] **Step 4: Toteuta kysymykset**

`types.ts`: lisää `QuestionId`-unioniin `| 'winter-hunger'` rivin `| 'hunger'` jälkeen ja `| 'winter-ready'` rivin `| 'good-result'` jälkeen. Lisää dokumenttikommenttiin rivit:

```
 * - 'winter-hunger': month (first hungry month, in winter), people (most hungry in one month); replaces 'hunger'
 * - 'winter-ready': (no params) the game got through its whole winter with nobody hungry in it; a general question
```

`questions.ts`:
- `QuestionFacts`-rajapintaan:

```ts
  /** Winter months among the months played (docs/09 §3.4). */
  winterMonths: readonly number[];
  /** Every winter month of the game was played. */
  winterOver: boolean;
  /** Played winter months with someone hungry. */
  winterHungryMonths: number;
```

- `QUESTION_IDS`: `'winter-hunger'` heti `'hunger'`-alkion jälkeen ja `'winter-ready'` ennen `'next-time'`-alkiota.
- `triggered`-funktion nälkähaara:

```ts
  const hunger = f.crises.filter((c) => c.kind === 'hunger');
  if (hunger.length > 0) {
    const params = { month: hunger[0]!.month, people: Math.max(...hunger.map((c) => c.people)) };
    // The food first running out in winter is a question about getting ready for it.
    if (f.winterMonths.includes(hunger[0]!.month)) out['winter-hunger'] = params;
    else out.hunger = params;
  }
```

- `pickQuestions`-funktion yleiskysymyssilmukka:

```ts
  // A winter got through without hunger is worth talking about before the general questions.
  const general: readonly QuestionId[] =
    f.winterOver && f.winterHungryMonths === 0 ? ['winter-ready', ...GENERAL_QUESTIONS] : GENERAL_QUESTIONS;
  for (const id of f.monthsPlayed > 0 ? general : []) {
```

(silmukan runko pysyy ennallaan).

- [ ] **Step 5: Toteuta merkit**

`packages/debrief/src/badges.ts`:

```ts
import type { ActionKind, LogEntry } from '@saari/rules';
import { collectVotes } from './votes.ts';

/** A player's own end-of-game badges (docs/09-uudisasukkaat.md §2.3). */
export type BadgeId =
  | 'explorer'
  | 'fisher'
  | 'lumberjack'
  | 'farmer'
  | 'stonecutter'
  | 'learner'
  | 'smith'
  | 'cheerer'
  | 'voter'
  | 'settler';

type WorkBadge = Exclude<BadgeId, 'voter' | 'settler'>;

/** Display order; ties between work badges go to the earlier one. */
export const BADGE_IDS: readonly BadgeId[] = [
  'explorer',
  'fisher',
  'lumberjack',
  'farmer',
  'stonecutter',
  'learner',
  'smith',
  'cheerer',
  'voter',
  'settler',
];

/** A Record over every ActionKind, so a new kind in the engine fails to compile until it has a badge. */
const BADGE_OF: Readonly<Record<ActionKind, WorkBadge>> = {
  explore: 'explorer',
  fish: 'fisher',
  chop: 'lumberjack',
  plow: 'farmer',
  harvest: 'farmer',
  'build-quarry': 'stonecutter',
  mine: 'stonecutter',
  study: 'learner',
  'make-tools': 'smith',
  swim: 'cheerer',
  gather: 'cheerer',
};

export const BADGE_RULES = {
  /** At most this many badges for kinds of work. */
  maxWorkBadges: 2,
  /** A work badge needs at least this many actions... */
  minActions: 3,
  /** ...and this share of the player's own actions. */
  minShare: 0.2,
  /** "voter" needs at least this many village meetings since joining. */
  minMeetings: 3,
} as const;

/**
 * The player's badges: their most used kinds of work, "voter" when they voted in every
 * village meeting since joining, and "settler" when nothing else fits, so everyone gets
 * one. Months without a report (an early end) are left out, as in the debrief. Only the
 * player sees these; they are never stored, compared or shown on the projector.
 */
export function badgesFor(log: readonly LogEntry[], playerId: string, monthsPlayed: number): BadgeId[] {
  const counts = new Map<WorkBadge, number>();
  let total = 0;
  for (const e of log) {
    if (e.type !== 'action' || e.player !== playerId || e.month < 1 || e.month > monthsPlayed) continue;
    const badge = BADGE_OF[e.kind];
    counts.set(badge, (counts.get(badge) ?? 0) + 1);
    total += 1;
  }
  const order = (b: BadgeId) => BADGE_IDS.indexOf(b);
  const earned: BadgeId[] = [...counts.entries()]
    .filter(([, n]) => n >= BADGE_RULES.minActions && n >= BADGE_RULES.minShare * total)
    .sort(([a, na], [b, nb]) => nb - na || order(a) - order(b))
    .slice(0, BADGE_RULES.maxWorkBadges)
    .map(([badge]) => badge);
  const meetings = collectVotes(log, monthsPlayed).filter((m) => m.eligible.includes(playerId));
  if (meetings.length >= BADGE_RULES.minMeetings && meetings.every((m) => m.ballots.has(playerId))) earned.push('voter');
  return earned.length > 0 ? earned : ['settler'];
}
```

`index.ts`:
- Lisää `import { isWinter, type Game, type LogEntry } from '@saari/rules';`. Korvaa nykyinen `import type { Game, LogEntry }`.
- Lisää viennit `export { BADGE_IDS, BADGE_RULES, badgesFor, type BadgeId } from './badges.ts';`.
- Lisää `buildDebrief`-funktioon ennen `return`-lausetta:

```ts
  const winterAll = Array.from({ length: game.totalMonths }, (_, i) => i + 1).filter((m) => isWinter(m, game.params));
```

- Lisää `pickQuestions`-olioon:

```ts
      winterMonths: winterAll.filter((m) => m <= monthsPlayed),
      winterOver: winterAll.length > 0 && winterAll.every((m) => m <= monthsPlayed),
      winterHungryMonths: reports.filter((r) => r.food.hungry > 0 && isWinter(r.month, game.params)).length,
```

- [ ] **Step 6: Aja testit**

Run: `pnpm --filter @saari/debrief test && pnpm -r typecheck`
Expected: PASS. Asiakkaan `enums.ts`:n `QUESTION_IDS` on `Record<QuestionId, true>`, joten typecheck kaatuu, kunnes uudet id:t lisätään. Lisää ne tässä tehtävässä: `'winter-hunger': true` ja `'winter-ready': true`. Lisää myös fi.ts-tekstit `debrief.question.winter-hunger` ja `debrief.question.winter-ready` (sisällöt tehtävän 9 taulukosta), jotta i18n-testi pysyy vihreänä.

- [ ] **Step 7: Commit**

```bash
git add packages/debrief apps/client/src/lib/enums.ts apps/client/src/i18n/fi.ts
git commit -m "Debrief: winter questions and per-player badges"
```

---

### Task 7: Protokolla, palvelin ja demopalvelin: merkit ja talvivaroitus

**Files:**
- Modify: `packages/protocol/src/index.ts`
- Modify: `apps/server/src/session.ts`
- Modify: `apps/server/test/fixtures.ts`
- Modify: `apps/client/src/net/mock/server.ts`
- Modify: `apps/client/src/lib/enums.ts` (TICKER_KINDS), `apps/client/src/i18n/fi.ts` (`ticker.winter-coming`)
- Modify: `apps/client/src/state/reducer.ts` (`badges`)
- Test: `apps/server/test/session.test.ts`, `apps/server/test/hub.test.ts`, `apps/client/test/mock.test.ts`, `apps/client/test/reducer.test.ts`

**Interfaces:**
- Consumes: `badgesFor`, `BadgeId` (tehtävä 6), `monthsUntilWinter` (tehtävä 2)
- Produces:
  - `PROTOCOL_VERSION = 2`
  - `ServerMessage` sisältää `{ t: 'badges'; badges: BadgeId[] }`
  - `TickerEvent` sisältää `{ kind: 'winter-coming' }`
  - `Debriefing.badges(game: Game, playerId: string): BadgeId[]`

- [ ] **Step 1: Kirjoita testit**

`apps/server/test/fixtures.ts`: lisää `fakeDebriefing`-olioon `badges: () => ['settler'],`.

`session.test.ts`: tuo `import type { BadgeId } from '@saari/debrief';` ja lisää `describe('phases and timers'` -lohkoon:

```ts
  it('sends every player their own badges at the end; never the host or anyone else', () => {
    const own = new Map<string, BadgeId[]>();
    const { clock, command, host, join } = setup({
      debriefing: { ...fakeDebriefing, badges: (_game, id) => own.get(id) ?? ['settler'] },
    });
    const aino = join('Aino');
    const eero = join('Eero');
    own.set(aino.id, ['explorer', 'voter']);
    command({ type: 'start' });
    clock.advance(MONTH * 10);
    expect(aino.peer.all('badges')).toEqual([{ t: 'badges', badges: ['explorer', 'voter'] }]);
    expect(eero.peer.all('badges')).toEqual([{ t: 'badges', badges: ['settler'] }]);
    expect(host.all('badges')).toEqual([]);
  });

  it('a removed player gets no badges; a returning one gets them again', () => {
    const { session, command, join } = setup();
    const aino = join('Aino');
    const eero = join('Eero');
    command({ type: 'start' });
    command({ type: 'kick', playerId: eero.id });
    command({ type: 'end' });
    expect(eero.peer.all('badges')).toEqual([]);
    session.disconnect(aino.peer);
    const again = new FakePeer();
    expect(session.joinPlayer(again, { playerToken: aino.token })).toBeNull();
    expect(again.last('badges')).toEqual({ t: 'badges', badges: ['settler'] });
  });

  it('warns the class in October and November that winter is coming', () => {
    const { clock, command, host, join } = setup({ length: 'normal' });
    join('Aino');
    command({ type: 'start' });
    const warnings = () => host.all('ticker').filter((m) => m.event.kind === 'winter-coming').length;
    clock.advance(MONTH * 5); // month 6, September
    expect(warnings()).toBe(0);
    clock.advance(MONTH); // October
    expect(warnings()).toBe(1);
    clock.advance(MONTH); // November
    expect(warnings()).toBe(2);
    clock.advance(MONTH); // December
    expect(warnings()).toBe(2);
  });
```

`hub.test.ts`: lisää testi vanhalle välilehdelle samaan tapaan kuin nykyinen `PROTOCOL_VERSION + 1` -testi (rivi ~96):

```ts
  it('refuses a tab from before the seasons (protocol 1) so it reloads', () => {
    // same set-up as the PROTOCOL_VERSION + 1 test above
    conn.receive({ t: 'hello-player', protocol: 1, code, nickname: 'Aino' });
    expect(peer.last('refused-join')).toEqual({ t: 'refused-join', reason: 'protocol-mismatch' });
  });
```

Kopioi set-up nykyisestä mismatch-testistä, eli `conn`, `peer` ja `code` luodaan samalla tavalla.

- [ ] **Step 2: Aja testit ja varmista, että ne epäonnistuvat**

Run: `pnpm --filter @saari/server test`
Expected: FAIL. Merkkejä ei lähetetä, talvivaroitusta ei tule, ja protokolla 1 hyväksytään.

- [ ] **Step 3: Toteuta protokolla**

`packages/protocol/src/index.ts`:
- `import type { BadgeId, DebriefData } from '@saari/debrief';`
- `export const PROTOCOL_VERSION = 2;` ja sen yläpuolelle kommentti `/** 2: seasons and badges (docs/09-uudisasukkaat.md); tabs from before must reload. */`
- `TickerEvent`-unioniin `| { kind: 'winter-coming' }` ja kommentti `/** October and November: fields lie under snow from December (docs/09 §3.3). */`
- `ServerMessage`-unioniin `debrief`-viestin jälkeen:

```ts
  /**
   * A player's own badges at the end of the game (docs/09 §2.3): only to that player,
   * never to the host or other players, and never stored.
   */
  | { t: 'badges'; badges: BadgeId[] }
```

- [ ] **Step 4: Toteuta palvelin**

`apps/server/src/session.ts`:
- Import: `import { badgesFor, buildDebrief, pseudonymize, type BadgeId, type DebriefData, type DebriefLabel } from '@saari/debrief';`. Lisää `monthsUntilWinter` `@saari/rules`-importtiin.
- `Debriefing`-rajapintaan:

```ts
  /** The player's own badges for their end screen (docs/09 §2.3). */
  badges(game: Game, playerId: string): BadgeId[];
```

- `defaultDebriefing`:

```ts
export const defaultDebriefing: Debriefing = {
  build: buildDebrief,
  pseudonymize,
  badges: (game, playerId) => badgesFor(game.log, playerId, game.reports.length),
};
```

- Tiedoston alkuun vakio: `/** Months before winter in which the ticker warns the class (October and November). */ const WINTER_WARNING_MONTHS = 2;`
- `#beginPhase`, `if (g.phase === 'action') { ... }` -lohkon sisälle food-short-rivin jälkeen:

```ts
      const untilWinter = monthsUntilWinter(g.month, g.totalMonths, g.params);
      if (untilWinter !== null && untilWinter <= WINTER_WARNING_MONTHS) this.#broadcast({ t: 'ticker', event: { kind: 'winter-coming' } });
```

- `#finish`, isäntien jälkipuintisilmukan jälkeen:

```ts
    if (this.#game.month >= 1) {
      for (const m of this.#members.values()) if (m.peer && !m.kicked) this.#sendBadges(m, m.peer);
    }
```

- Uusi metodi `#makeDebrief`-metodin jälkeen:

```ts
  /** Badges go to their own player only (docs/09 §2.3). */
  #sendBadges(member: Member, peer: Peer): void {
    peer.send({ t: 'badges', badges: this.#debriefing.badges(this.#game, member.id) });
  }
```

- `joinPlayer`, heti `welcome`-lähetyksen jälkeen ennen `this.#afterChange()`-kutsua:

```ts
    if (this.#game.phase === 'ended' && this.#game.month >= 1) this.#sendBadges(member, peer);
```

- [ ] **Step 5: Toteuta demopalvelin**

`apps/client/src/net/mock/server.ts`:
- Import `badgesFor` paketista `@saari/debrief` ja `monthsUntilWinter` paketista `@saari/rules`.
- `#enterPhase`, food-short-rivin jälkeen `action`-haarassa:

```ts
      const untilWinter = monthsUntilWinter(game.month, game.totalMonths, game.params);
      if (untilWinter !== null && untilWinter <= 2) this.#broadcastTicker(room, { kind: 'winter-coming' });
```

- `#finish`, silmukka `for (const conn of room.conns)`:

```ts
    for (const conn of room.conns) {
      if (conn.role === 'host') this.#send(conn, { t: 'debrief', debrief: room.debrief, storedToken: room.storedToken });
      else if (conn.playerId) this.#send(conn, { t: 'badges', badges: badgesFor(room.game.log, conn.playerId, room.game.reports.length) });
    }
```

- Etsi kohta, jossa demopalvelin lähettää pelaajalle `welcome`-viestin (`#send(conn, { t: 'welcome', role: 'player'`). Lisää sen perään sama merkkilähetys, kun `room.game.phase === 'ended' && room.started`.

`apps/client/src/lib/enums.ts`: `TICKER_KINDS`-olioon `'winter-coming': true,`.
`apps/client/src/i18n/fi.ts`: `'ticker.winter-coming': 'Talvi tulee! Kerätkää ruokaa varastoon.',`

`apps/client/test/mock.test.ts`: lisää testiin `'plays a short trial game to the end with a host, a student and bots'` jälkipuintitarkistusten jälkeen ennen riviä `transport.close();`:

```ts
    // The student's own badges, never the host's (docs/09 §2.3).
    expect(student.of('badges')).toHaveLength(1);
    expect(student.state.badges?.length).toBeGreaterThan(0);
    expect(host.of('badges')).toHaveLength(0);
    // Winter warnings in October and November (months 7 and 8).
    expect(host.of('ticker').filter((m) => m.event.kind === 'winter-coming')).toHaveLength(2);
```

`apps/client/test/reducer.test.ts`:

```ts
  it("keeps the player's own badges from the end of the game", () => {
    const state = applyServerMessage(initialState(), { t: 'badges', badges: ['explorer', 'voter'] }, 0);
    expect(state.badges).toEqual(['explorer', 'voter']);
  });
```

Toteuta reducerissa (`apps/client/src/state/reducer.ts`):
- `import type { BadgeId, DebriefData } from '@saari/debrief';`;
- `ClientState`-rajapintaan `debrief`-kentän viereen `/** The player's own badges at the end (docs/09 §2.3). */ badges: BadgeId[] | null;`;
- `initialState()`-funktioon `badges: null,`;
- `applyServerMessage`-funktioon `debrief`-haaran jälkeen:

```ts
    case 'badges':
      return { ...base, badges: msg.badges };
```

- [ ] **Step 6: Aja testit**

Run: `pnpm --filter @saari/server test && pnpm --filter @saari/client test && pnpm -r typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/protocol apps/server apps/client/src/net apps/client/src/lib/enums.ts apps/client/src/i18n/fi.ts apps/client/src/state apps/client/test/mock.test.ts
git commit -m "Protocol 2: own badges at the end, winter warning on the ticker"
```

---

### Task 8: Uudet kuvat: laavu, kylätalo, juhlatalo, lampi, kodin kuvake ja vieraslaiva

Tämä tehtävä ei odota lumikokeilun hyväksyntää.

**Files:**
- Modify: `tools/art/kenney-props-spec.py` (house-apuri, `gathering`, `spring`)
- Modify: `tools/art/kenney-icons.json` (`home`, `ship`)
- Regenerate: `tools/art/kenney-props.json`, `apps/client/public/art/kenney/props/gathering-{1,2,3}.png`, `props/spring.png`, `icons/home.png`, `icons/ship.png`, `hero.png`, `apps/client/src/map/kenney-props.ts`
- Modify: `apps/client/public/art/kenney/SOURCES.txt`

**Interfaces:**
- Produces: `icons/home.png` (tehtävä 10 vaihtaa `ArtIcon`-nimen `shelter` → `home`). Tiedostoa `icons/shelter.png` ei vielä poisteta.

- [ ] **Step 1: Lisää oviparametri `house`-apuriin**

```python
def house(scale, roof='roof-gable', storeys=1, chimney=False, at=(0, 0), door='wall-wood-door'):
    """Fantasy Town walls (1 unit tall, on the cell edges) with the door at the front left."""
    parts = []
    for floor in range(storeys):
        front_left = T + (door if floor == 0 else 'wall-wood-window-shutters')
```

(loppu ennallaan).

- [ ] **Step 2: Korvaa `gathering(level)` kylätaloksi**

```python
def gathering(level):
    if level == 1:  # Laavu: a lean-to with a fire in front of it, logs to sit on
        return [part(S + 'tent-canvas-half', (-0.12, 0.14), 1.2, 45), *campfire((0.16, -0.14), 0.9),
                part(N + 'log_large', (0.32, 0.04), 0.24, 0), part(N + 'log_large', (-0.04, -0.34), 0.24, 90)]
    if level == 2:  # Kylätalo: a wooden village hall with a wide door and benches outside
        return [*house(0.42, 'roof-high-gable', door='wall-wood-doorway-square-wide', at=(-0.08, 0.08)),
                part(T + 'stall-bench', (0.3, -0.04), 0.4, -45), part(T + 'stall-bench', (0.06, -0.3), 0.4, -45),
                part(T + 'lantern', (0.33, -0.3), 0.3)]
    # Juhlatalo: a bigger hall dressed for a party, with banners and pennants
    return [*house(0.5, 'roof-high-gable', door='wall-wood-doorway-square-wide', at=(-0.06, 0.06)),
            part(T + 'banner-green', (0.2, -0.28), 0.4, -45), part(T + 'banner-red', (-0.3, 0.22), 0.4, -45),
            part(P + 'flag-high-pennant', (0.36, 0.0), 0.12), part(P + 'flag-high-pennant', (0.0, -0.38), 0.12),
            part(T + 'lantern', (0.36, -0.36), 0.3)]
```

Muuta `gathering`-rakennusten väritys (`recolor`) muotoon `['town-red-purple']`, kuten ennenkin. Sijainnit ja mittakaavat ovat lähtöarvoja. Ne viritetään kuvan perusteella askeleessa 5.

- [ ] **Step 3: Korvaa lähteen kuva lammella**

Sprite-listan `spring`-alkio (nimi pysyy, spec §4):

```python
    {'name': 'spring', 'parts': [  # Lampi: a pond with a small jetty for swimming
        part(N + 'ground_riverTile', scale=0.9, z=0.09, materials={'grass': '#5b8e50', 'water': '#62c0ea'}),
        part(P + 'structure-platform-dock-small', (0.22, -0.2), 0.16, 45),
        part(N + 'lily_large', (-0.08, 0.06), 0.8, z=0.0), part(N + 'lily_small', (0.08, 0.2), 0.8, z=0.0),
        part(N + 'stone_smallA', (-0.32, -0.28), 0.6), bush((-0.32, 0.3), 0.8)]},
```

- [ ] **Step 4: Kuvakkeet**

Lisää `tools/art/kenney-icons.json`:n `sprites`-listaan `home`-alkio. Se on pieni talo punaisella katolla, ja sen seinät kirjoitetaan auki, koska JSON ei käytä apuria:

```json
{
  "name": "home",
  "recolor": ["town-roof-red"],
  "parts": [
    {"model": "town/wall-wood-window-shutters", "scale": 0.9, "at": [0, 0]},
    {"model": "town/wall-wood", "scale": 0.9, "turn": 90, "at": [0, 0]},
    {"model": "town/wall-wood", "scale": 0.9, "turn": 180, "at": [0, 0]},
    {"model": "town/wall-wood-door", "scale": 0.9, "turn": 270, "at": [0, 0]},
    {"model": "town/roof-gable", "scale": 0.9, "z": 0.9, "at": [0, 0]},
    {"model": "town/chimney", "scale": 0.9, "turn": 180, "z": 0.9, "at": [0, 0]}
  ]
}
```

Lisää `swatches`-olioon `town-roof-red` samoilla arvoilla kuin `kenney-props-spec.py`:ssä (`{"kit": "town", "from": [0, 384], "into": [64, 384], "size": [64, 128]}`).

Vaihda `ship`-alkio vieraslaivaksi. Renderöi ensin nykyinen ja tarkista, onko `pirate/ship-medium`-mallissa merirosvolippu:
- jos on, vaihda malliksi `pirate/ship-large` tai `pirate/ship-small` (se, jossa on valkoiset purjeet eikä pääkallolippua);
- lisää kaksi `pirate/flag-high-pennant`-osaa kannelle (`at` noin `[0.1, 0]` ja `[-0.3, 0]`, `z` noin 0.3, `scale` 0.06);
- viritä kuvan perusteella.

- [ ] **Step 5: Renderöi ja tarkista**

```bash
SP=/c/Users/tontt/AppData/Local/Temp/claude/C--Users-tontt-Project-Pine-Project-Pine/55ef158b-4d16-4913-b19c-e50cd4bf72db/scratchpad
BL="/c/Program Files/Blender Foundation/Blender 5.1/blender.exe"
python -I tools/art/kenney-props-spec.py
"$BL" -b --factory-startup -P tools/art/render-kenney.py -- tools/art/kenney-props.json $SP/kenney3d/x $SP/props-new
"$BL" -b --factory-startup -P tools/art/render-kenney.py -- tools/art/kenney-icons.json $SP/kenney3d/x $SP/icons-new
python -I tools/art/kenney-props-post.py $SP/props-new
python -I tools/art/kenney-icons-post.py $SP/icons-new
python -I tools/art/kenney-hero.py
```

Katso Read-työkalulla `props/gathering-1.png`, `gathering-2.png`, `gathering-3.png`, `spring.png`, `icons/home.png` ja `icons/ship.png`. Kuvien pitää täyttää nämä:
- Laavu lukee "katos + nuotio".
- Kylätalo on mökkiä isompi mutta puuta matalampi (P39: rakennukset puun korkuisia).
- Juhlatalo on kylätaloa isompi, ja siinä on värikkäitä lippuja.
- Lampi lukee "vettä ja laituri".
- Koti erottuu 32 px:n koossa.
- Vieraslaivassa ei ole pääkalloa.

Viritä tarvittaessa sijainnit ja mittakaavat ja renderöi vain muuttuneet: lisää komennon loppuun nimet, esim. `gathering-2 gathering-3`.

- [ ] **Step 6: Päivitä SOURCES.txt ja commit**

Lisää `SOURCES.txt`:hen `icons/`-riville `home`. Lisää myös rivi: "gathering-1..3 (laavu, kylätalo, juhlatalo) and spring (lampi) changed 2026-10-13 (docs/09-uudisasukkaat.md §4)".

```bash
git add tools/art apps/client/public/art/kenney apps/client/src/map/kenney-props.ts
git commit -m "Art: lean-to, village hall and party hall, a pond with a jetty, home icon, guests' ship"
```

---

### Task 9: Asiakkaan tekstit, listat ja muotoilu

**Files:**
- Modify: `apps/client/src/i18n/fi.ts`
- Modify: `apps/client/src/lib/enums.ts`
- Modify: `apps/client/src/lib/format.ts`
- Modify: `apps/client/src/components/TilePanel.svelte` (`buildingTitle` → `buildingName`)
- Test: `apps/client/test/i18n.test.ts`, `apps/client/test/format.test.ts`

**Interfaces:**
- Consumes: `calendarMonth`, `isWinter`, `Season` (tehtävä 2), `BadgeId` (tehtävä 6)
- Produces:
  - `monthName(month: number): string`, esim. 1 → "Huhtikuu"
  - `actionName(kind: ActionKind, month?: number): string`, kalastus talvella "Pilki"
  - `SEASONS`, `CALENDAR_MONTHS`, `BADGE_IDS` (enums)
  - `buildingTitle` poistuu, ja tilalla käytetään `buildingName`-funktiota
  - tekstiavaimet: `month.1`–`month.12`, `season.*`, `badge.*.name`, `badge.*.text`, `bar.untilParty.*`, `bar.partyThisMonth`, `summary.winterComing.*`, `end.badges`, `action.ice-fish`, `lobby.howTo.6`

- [ ] **Step 1: Kirjoita testit**

`i18n.test.ts`:
- Tuo `SEASONS`, `CALENDAR_MONTHS` ja `BADGE_IDS` enumsista.
- Lisää `familyKeys()`-funktioon:

```ts
  for (const season of SEASONS) keys.push(`season.${season}`);
  for (const month of CALENDAR_MONTHS) keys.push(`month.${month}`);
  for (const badge of BADGE_IDS) keys.push(`badge.${badge}.name`, `badge.${badge}.text`);
```

- Lisää testi:

```ts
  it('tells the settlers story and uses the new names (docs/09-uudisasukkaat.md)', () => {
    expect(t('app.name')).toBe('Last Chance');
    expect(t('building.gathering.2')).toBe('Kylätalo');
    expect(t('terrain.spring.name')).toBe('Lampi');
    expect(t('grade.1')).toBe('Leiri rannalla');
    expect(t('vote.title')).toMatch(/^Kyläkokous/);
    const all = allMessageKeys().map((k) => t(k as never)).join('\n');
    expect(all).not.toMatch(/itsek|Oma kehitys|haaksirik|pelastuslaiva|Selviytyjät/i);
  });
```

`format.test.ts`:

```ts
describe('calendar and seasonal names', () => {
  it('names the game month by the calendar: the game starts in April', () => {
    expect(monthName(1)).toBe('Huhtikuu');
    expect(monthName(9)).toBe('Joulukuu');
    expect(monthName(10)).toBe('Tammikuu');
  });

  it('calls fishing ice fishing in winter', () => {
    expect(actionName('fish', 7)).toBe('Kalasta');
    expect(actionName('fish', 10)).toBe('Pilki');
    expect(actionName('chop', 10)).toBe('Kaada puita');
  });

  it('names every building level by its own name', () => {
    expect(optionName({ id: 'school-1' })).toBe('Ulkoluokka');
    expect(optionName({ id: 'workshop-2' })).toBe('Paja');
    expect(optionName({ id: 'shelter-2' })).toBe('Mökki');
  });
});
```

Poista tai päivitä `format.test.ts`:n vanhat odotukset muotoa `"Koulu (taso 2)"`.

- [ ] **Step 2: Aja testit ja varmista, että ne epäonnistuvat**

Run: `pnpm --filter @saari/client test`
Expected: FAIL. Avaimet ja funktiot `monthName` ja `actionName(…, month)` puuttuvat, ja nimet ovat vanhat.

(Merkkien reducer-testi on jo tehtävässä 7.)

- [ ] **Step 3: Toteuta enums ja format**

`enums.ts`:

```ts
import type { ActionGroup, BadgeId, QuestionId } from '@saari/debrief';
// add Season to the @saari/rules type import

export const SEASONS = keys<Season>({ spring: true, summer: true, autumn: true, winter: true });

export const CALENDAR_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const BADGE_IDS = keys<BadgeId>({
  explorer: true,
  fisher: true,
  lumberjack: true,
  farmer: true,
  stonecutter: true,
  learner: true,
  smith: true,
  cheerer: true,
  voter: true,
  settler: true,
});
```

`format.ts`:
- Import `calendarMonth` ja `isWinter` paketista `@saari/rules`, `PARAMS` tiedostosta `./rules-info.ts` (sama rivi kuin `parseOptionId`).
- Poista `buildingTitle`. `optionName`: `return parsed ? buildingName(parsed.kind, parsed.level) : t('building.none');`
- Korvaa `actionName` ja lisää `monthName`:

```ts
/** Fishing through a hole in the ice in winter (docs/09 §3.2). `month` 0 = no month (lobby). */
export function actionName(kind: ActionKind, month = 0): string {
  return kind === 'fish' && month > 0 && isWinter(month, PARAMS) ? t('action.ice-fish') : t(`action.${kind}`);
}

/** "Huhtikuu" for game month 1: the settlers arrive in spring (docs/09 §3.1). */
export function monthName(month: number): string {
  return t(`month.${calendarMonth(month, PARAMS)}` as MessageKey);
}
```

`TilePanel.svelte`: import `buildingName` funktion `buildingTitle` tilalle, ja `title`-derived käyttää `buildingName`-funktiota.

- [ ] **Step 4: Päivitä fi.ts**

Muutettavat avaimet (uusi teksti):

| Avain | Uusi teksti |
|---|---|
| `app.name` | `Last Chance` |
| `app.tagline` | `Yhteistyöpeli luokalle: rakentakaa yhdessä kylä autiolle saarelle!` |
| `lobby.howTo.1` | `Purjehditte autiolle saarelle ja perustatte kylän. Avajaisjuhla on {months} kuukauden päästä.` |
| `lobby.howTo.3` | `Rakennatte talkoilla: kaikki kerätty menee kylän varastoon. Jokainen syö {food} ruokaa kuussa.` |
| `lobby.howTo.4` | `Kuun lopussa kyläkokous päättää, mitä rakennetaan. Kodit ensin!` |
| `lobby.howTo.5` | `Talvella pelto ei kasva. Kerätkää ruokaa ennen talvea!` |
| `bar.resources` | `Kylän varasto` |
| `bar.shelter` | `Kodit` |
| `phase.vote` | `Kyläkokous` |
| `terrain.spring.name` | `Lampi` |
| `terrain.spring.description` | `Lammessa voi uida. Virkistys parantaa kylän mielialaa.` |
| `tile.landing` | `Rantautumispaikka: tähän saavuitte veneellä.` |
| `building.shelter.kind` | `Koti` |
| `building.shelter.2` | `Mökki` |
| `building.school.1` / `.2` / `.3` | `Ulkoluokka` / `Koulu` / `Iso koulu` |
| `building.workshop.kind` | `Paja` |
| `building.workshop.1` / `.2` / `.3` | `Työpenkki` / `Paja` / `Iso paja` |
| `building.gathering.kind` | `Kylätalo` |
| `building.gathering.1` / `.2` / `.3` | `Laavu` / `Kylätalo` / `Juhlatalo` |
| `building.shelter.description` | `Koti antaa katon pään päälle noin {people} kyläläiselle.` |
| `building.school.description` | `Opiskele koulussa: kun opit, saat enemmän aikaan koko kylälle.` |
| `building.workshop.description` | `Tee pajassa työkaluja: hyvillä työkaluilla saat enemmän aikaan koko kylälle.` |
| `play.skills.title` | `Taitosi` |
| `vote.title` | `Kyläkokous: mitä rakennetaan?` |
| `vote.effect.shelter` | `Koti noin {people} kyläläiselle` |
| `vote.effect.shelterUpgrade` | `Noin {delta} kotipaikkaa lisää` |
| `summary.shelter` | `Kodit` |
| `summary.shelter.value` | `Kotipaikkoja {capacity} / {villagers}` |
| `summary.shelter.all` | `Kaikilla oli koti` |
| `summary.shelter.without.one` / `.other` | `{n} ilman kotia` |
| `summary.mood.shelter` | `Kodit` |
| `end.arrived` | `Vieraat saapuivat juhlaan!` |
| `grade.1`–`grade.6` | `Leiri rannalla`, `Sinnittelevä leiri`, `Kasvava kylä`, `Toimiva kylä`, `Kukoistava kylä`, `Unelmien kylä` |
| `ticker.spring-found` | `Lampi löytyi!` |
| `debrief.chart.shelter` | `Kotipaikat` |
| `debrief.chart.shelterShare` | `Kotien osuus kylästä` |
| `debrief.story.shelter` | `Kodit` |
| `debrief.story.unsheltered.one` / `.other` | `{n} ilman kotia` |
| `debrief.crisis.no-shelter.one` | `Kuukausi {month}: {people} kyläläinen jäi ilman kotia.` |
| `debrief.crisis.no-shelter.other` | `Kuukausi {month}: {people} kyläläistä jäi ilman kotia.` |
| `debrief.group.skills` | `Oppiminen` |
| `debrief.spring.found` | `Lampi löytyi kuukautena {month}.` |
| `debrief.spring.never` | `Lampea ei löytynyt.` |
| `debrief.question.no-shelter-long` | `Joku oli ilman kotia {months} kuukautta. Miksi kotien rakentaminen viivästyi?` |
| `debrief.question.skills-heavy` | `{percent} % toiminnoista meni oppimiseen. Miten se auttoi kylää? Milloin oppiminen kannattaa eniten?` |
| `debrief.question.skills-none` | `Kukaan ei opiskellut eikä tehnyt työkaluja. Olisiko oppiminen auttanut kylää myöhemmin?` |
| `debrief.question.spring-late` | `Lampi löytyi vasta kuukautena {month}. Olisiko saaren tutkimiseen kannattanut käyttää enemmän aikaa?` |
| `debrief.question.spring-never` | `Lampea ei löytynyt koskaan. Olisiko saaren tutkimiseen kannattanut käyttää enemmän aikaa?` |
| `help.3` | `Kuukauden lopuksi luokka pitää kyläkokouksen ja äänestää rakennuksesta. Tasapelissä mitään ei rakenneta.` |

Poistettava avain: `building.withLevel`.

Uudet avaimet (lisää aiheensa kohdalle):

```ts
  'lobby.howTo.6': 'Tavoite: iloinen kylä, kun vieraat saapuvat juhlaan.',
  'bar.untilParty.one': 'Juhlaan {n} kuukausi',
  'bar.untilParty.other': 'Juhlaan {n} kuukautta',
  'bar.partyThisMonth': 'Juhla tämän kuun lopussa!',
  'action.ice-fish': 'Pilki',
  'summary.winterComing.one': 'Talveen {n} kuukausi: kerätkää ruokaa varastoon!',
  'summary.winterComing.other': 'Talveen {n} kuukautta: kerätkää ruokaa varastoon!',
  'end.badges': 'Sinun merkkisi',
  'season.spring': 'Kevät',
  'season.summer': 'Kesä',
  'season.autumn': 'Syksy',
  'season.winter': 'Talvi',
  'month.1': 'Tammikuu',
  'month.2': 'Helmikuu',
  'month.3': 'Maaliskuu',
  'month.4': 'Huhtikuu',
  'month.5': 'Toukokuu',
  'month.6': 'Kesäkuu',
  'month.7': 'Heinäkuu',
  'month.8': 'Elokuu',
  'month.9': 'Syyskuu',
  'month.10': 'Lokakuu',
  'month.11': 'Marraskuu',
  'month.12': 'Joulukuu',
  'badge.explorer.name': 'Löytöretkeilijä',
  'badge.explorer.text': 'Tutkit saarta rohkeasti.',
  'badge.fisher.name': 'Kalastaja',
  'badge.fisher.text': 'Toit kylälle kalaa.',
  'badge.lumberjack.name': 'Metsuri',
  'badge.lumberjack.text': 'Kaadoit puita rakennuksiin.',
  'badge.farmer.name': 'Viljelijä',
  'badge.farmer.text': 'Huolehdit pelloista.',
  'badge.stonecutter.name': 'Kivenhakkaaja',
  'badge.stonecutter.text': 'Hankit kiveä kylälle.',
  'badge.learner.name': 'Oppija',
  'badge.learner.text': 'Opit koulussa uutta.',
  'badge.smith.name': 'Seppä',
  'badge.smith.text': 'Teit työkaluja pajassa.',
  'badge.cheerer.name': 'Ilonpitäjä',
  'badge.cheerer.text': 'Pidit kylän iloisena.',
  'badge.voter.name': 'Kyläkokouksen jäsen',
  'badge.voter.text': 'Olit mukana jokaisessa kyläkokouksessa.',
  'badge.settler.name': 'Uudisasukas',
  'badge.settler.text': 'Rakensit kylää yhdessä muiden kanssa.',
```

Tarkista, että talvikysymykset (tehtävä 6) ja `ticker.winter-coming` (tehtävä 7) ovat jo tiedostossa:

```ts
  'debrief.question.winter-hunger': 'Talvella ruoka loppui ja {people} jäi nälkään. Milloin olisi pitänyt alkaa varautua?',
  'debrief.question.winter-ready': 'Ruoka riitti talven yli. Miten varauduitte? Kuka muistutti muita?',
```

Uusia käyttämättömiä avaimia (`lobby.howTo.6`, `bar.untilParty`, `bar.partyThisMonth`, `summary.winterComing`, `end.badges`, `badge.*`, `action.ice-fish`) i18n-testi pitää kuolleina, kunnes tehtävä 10 käyttää ne. Siksi tehtävät 9 ja 10 commitoidaan yhdessä. Älä commitoi tätä tehtävää ennen kuin tehtävän 10 testit menevät läpi. Aja kuitenkin tämän tehtävän testit nyt, ja hyväksy, että vain "no dead strings" -testi epäonnistuu.

- [ ] **Step 5: Aja testit**

Run: `pnpm --filter @saari/client test`
Expected: kaikki läpi paitsi "every key in fi.ts is used (no dead strings)". Sen listassa näkyvät täsmälleen yllä luetellut uudet avaimet. Korjaus tulee tehtävässä 10.

---

### Task 10: Asiakkaan näkymät: kalenteri, pilkkiminen, talvivaroitus, säännöt, vieraslaiva ja merkit

**Files:**
- Modify: `apps/client/src/components/Icon.svelte`, `ArtIcon.svelte`, `TopBar.svelte`, `TilePanel.svelte`, `MonthSummary.svelte`, `HowToPlay.svelte`, `EndScreen.svelte`, `Ticker.svelte`, `debrief/Debrief.svelte`
- Create: `apps/client/src/components/BadgePicture.svelte`
- Modify: `apps/client/src/views/Play.svelte`, `Host.svelte`
- Delete: `apps/client/public/art/kenney/icons/shelter.png`

**Interfaces:**
- Consumes: `monthName`, `actionName(kind, month)`, `BADGE_IDS`, `ClientState.badges` (tehtävät 7 ja 9), `icons/home.png` (tehtävä 8)
- Produces:
  - `IconName` sisältää lisäksi `spring`, `summer`, `autumn`, `winter`, `compass`, `vote` ja `ice-hole`
  - `ArtIconName` on `'wood' | 'stone' | 'food' | 'home' | 'ship'`
  - `EndScreen`-props `badges?: readonly BadgeId[] | null`
  - `MonthSummary`-props `totalMonths: number`
  - `TilePanel`-props `month: number`

- [ ] **Step 1: Ikonit**

`Icon.svelte`:
- Laajenna `IconName`-tyyppi uusilla nimillä.
- Lisää haarat ennen `{/if}`-riviä:

```svelte
  {:else if name === 'spring'}
    <path d="M12 21 V11" stroke="#5a8f3c" stroke-width="2" stroke-linecap="round" />
    <path d="M12 13 C 6 13, 4 9, 5 5 C 9 5, 12 8, 12 13 Z" fill="#79b851" />
    <path d="M12 11 C 17 11, 20 8, 19 4 C 15 4, 12 7, 12 11 Z" fill="#9bd06a" />
  {:else if name === 'summer'}
    <circle cx="12" cy="12" r="5" fill="#ffc83d" />
    <path d="M12 2 V4.5 M12 19.5 V22 M2 12 H4.5 M19.5 12 H22 M4.9 4.9 L6.7 6.7 M17.3 17.3 L19.1 19.1 M4.9 19.1 L6.7 17.3 M17.3 6.7 L19.1 4.9" stroke="#f5a623" stroke-width="2" stroke-linecap="round" />
  {:else if name === 'autumn'}
    <path d="M12 2 C 18 6, 20 12, 12 21 C 4 12, 6 6, 12 2 Z" fill="#e0782f" />
    <path d="M12 5 V21" stroke="#9c4a17" stroke-width="1.5" stroke-linecap="round" />
  {:else if name === 'winter'}
    <path d="M12 2 V22 M3.3 7 L20.7 17 M3.3 17 L20.7 7 M9 4 L12 6.5 L15 4 M9 20 L12 17.5 L15 20" stroke="#4aa3df" stroke-width="2" stroke-linecap="round" fill="none" />
  {:else if name === 'compass'}
    <circle cx="12" cy="12" r="9" fill="#fff" stroke="#8a6d3b" stroke-width="2" />
    <path d="M12 5 L14.5 12 L12 19 L9.5 12 Z" fill="#d9534f" />
    <path d="M14.5 12 L12 19 L9.5 12 Z" fill="#9aa5ad" />
  {:else if name === 'vote'}
    <rect x="4" y="11" width="16" height="10" rx="2" fill="#7a5cc4" />
    <rect x="7" y="13" width="10" height="2" rx="1" fill="#4b3a80" />
    <path d="M8 3 H16 V11 H8 Z" fill="#fff" stroke="#4b3a80" stroke-width="1.5" />
    <path d="M10 7 L11.5 8.5 L14 5.5" stroke="#3f8f3f" stroke-width="1.6" fill="none" stroke-linecap="round" />
  {:else if name === 'ice-hole'}
    <ellipse cx="12" cy="15" rx="10" ry="6" fill="#e8f2f8" stroke="#9cc3dc" stroke-width="1.5" />
    <ellipse cx="12" cy="15" rx="5" ry="2.6" fill="#2f6f9f" />
    <path d="M12 3 V14" stroke="#7a5230" stroke-width="1.5" />
```

`ArtIcon.svelte`: `export type ArtIconName = 'wood' | 'stone' | 'food' | 'home' | 'ship';`.

Vaihda kaikki `ArtIcon name="shelter"` -käytöt muotoon `name="home"`. Etsi ne komennolla `grep -rn 'name="shelter"' apps/client/src`. Ne ovat ainakin `TopBar`-, `MonthSummary`- ja `debrief/Debrief`-komponenteissa. Poista sen jälkeen `public/art/kenney/icons/shelter.png`.

- [ ] **Step 2: Yläpalkki**

`TopBar.svelte`:
- Import: `seasonOf` paketista `@saari/rules`, `PARAMS` tiedostosta `../lib/rules-info.ts`, `monthName` tiedostosta `../lib/format.ts` ja `tp` i18n:stä.
- Lisää derived-arvot:

```ts
  const season = $derived(seasonOf(game.month, PARAMS));
  const monthsLeft = $derived(game.totalMonths - game.month);
```

- Korvaa kuukausi-pill:

```svelte
    <div class="pill" class:winter={season === 'winter'} title="{t(`season.${season}`)} · {t('bar.monthValue', { month: game.month, total: game.totalMonths })}">
      <Icon name={season} size={size === 'projector' ? 30 : 22} />
      <span class="visually-hidden">{t(`season.${season}`)}, {t('bar.monthValue', { month: game.month, total: game.totalMonths })}</span>
      <span class="value" aria-hidden="true">{monthName(game.month)}</span>
    </div>
    {#if size === 'projector'}
      <div class="pill party">
        <span class="value">{monthsLeft > 0 ? tp('bar.untilParty', monthsLeft) : t('bar.partyThisMonth')}</span>
      </div>
    {/if}
```

- CSS: `.pill.winter { background: #eaf4fb; border-color: #9cc3dc; }` ja `.party .value { font-size: 0.95em; }`.

- [ ] **Step 3: Ruutu, yhteenveto ja tapahtumat**

`TilePanel.svelte`:
- Lisää props-rajapintaan `month: number;` ja destrukturointiin `month`.
- Lisää importit `isWinter` (`@saari/rules`), `PARAMS` ja `Icon`.
- Nappi:

```svelte
          {#if preview.kind === 'fish' && isWinter(month, PARAMS)}<Icon name="ice-hole" size={28} />{/if}
          <span>{actionName(preview.kind, month)}</span>
```

`Play.svelte`: lisää `<TilePanel ... month={game.month}` ja `<MonthSummary report={game.lastReport} totalMonths={game.totalMonths} />`. Lisää `Host.svelte`:een sama `totalMonths`.

`MonthSummary.svelte`:
- Props: lisää `totalMonths: number`.
- Lisää importit `monthsUntilWinter` ja `seasonOf` (`@saari/rules`), `PARAMS`, `Icon` ja `tp`.
- Derived ja näkymä:

```ts
  const untilWinter = $derived(
    seasonOf(report.month, PARAMS) === 'autumn' ? monthsUntilWinter(report.month, totalMonths, PARAMS) : null,
  );
```

```svelte
  {#if untilWinter !== null}
    <p class="winter-note"><Icon name="winter" size={28} /> {tp('summary.winterComing', untilWinter)}</p>
  {/if}
```

  Sijoita tämä neljän kuvaruudun jälkeen ennen `<details>`-elementtiä. CSS: `.winter-note { display: flex; align-items: center; justify-content: center; gap: 0.4em; font-weight: 800; color: #1f6f9f; margin: 0.4em 0 0; }`.

`Ticker.svelte`: import `Icon`. Laajenna kuvavalinta:

```svelte
        {#if art}<PropPicture texture={art} size={34} />{:else if item.event.kind === 'food-short'}<ArtIcon name="food" size={30} />{:else if item.event.kind === 'winter-coming'}<Icon name="winter" size={28} />{/if}
```

- [ ] **Step 4: Säännöt kuvina**

`HowToPlay.svelte`: kuusi askelta. Lisää importit `Icon` ja `ArtIcon`.

```svelte
<ol class="steps">
  <li><span class="art"><PropPicture texture="props/boat" size={64} /></span>{t('lobby.howTo.1', { months })}</li>
  <li><!-- energy bolts: unchanged --></li>
  <li><!-- wood, stone, food: unchanged --></li>
  <li><span class="art"><PropPicture texture="props/shelter-1" size={64} /></span>{t('lobby.howTo.4')}</li>
  <li><span class="art"><Icon name="winter" size={52} /></span>{t('lobby.howTo.5')}</li>
  <li><span class="art"><ArtIcon name="ship" size={64} /></span>{t('lobby.howTo.6')}</li>
</ol>
```

Vaihda `MoodFace`-import pois, jos sitä ei enää käytetä. Päivitä komponentin kommentti: "The rules in six pictures".

- [ ] **Step 5: Merkit ja vieraslaiva loppuruudulla**

`BadgePicture.svelte`:

```svelte
<script lang="ts">
  import type { BadgeId } from '@saari/debrief';
  import ArtIcon, { type ArtIconName } from './ArtIcon.svelte';
  import Icon, { type IconName } from './Icon.svelte';
  import PropPicture from './PropPicture.svelte';

  /** A picture for each badge, from the map's own art where there is one (docs/09 §2.3). */
  const ART: Record<BadgeId, { icon: ArtIconName } | { prop: string } | { svg: IconName }> = {
    explorer: { svg: 'compass' },
    fisher: { icon: 'food' },
    lumberjack: { icon: 'wood' },
    farmer: { prop: 'props/field-3' },
    stonecutter: { icon: 'stone' },
    learner: { prop: 'props/school-1' },
    smith: { prop: 'props/workshop-1' },
    cheerer: { prop: 'props/gathering-1' },
    voter: { svg: 'vote' },
    settler: { prop: 'props/boat' },
  };

  let { badge, size = 56 }: { badge: BadgeId; size?: number } = $props();
  const art = $derived(ART[badge]);
</script>

<span class="badge-picture" style:width="{size}px" style:height="{size}px">
  {#if 'icon' in art}<ArtIcon name={art.icon} {size} />{:else if 'prop' in art}<PropPicture texture={art.prop} {size} />{:else}<Icon name={art.svg} {size} />{/if}
</span>

<style>
  .badge-picture {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--card-2);
    border: 3px solid var(--gold);
    padding: 0.35em;
  }
</style>
```

`EndScreen.svelte`:
- Props: `let { result, badges = null, children }: { result: GameResult; badges?: readonly BadgeId[] | null; children?: Snippet } = $props();`
- Kommentti: "The result as a picture: the guests' ship arriving for the opening party, the village's level as stars and its name, and on a pupil's own device their badges."
- Lisää ennen `<details class="more">`-elementtiä:

```svelte
  {#if badges && badges.length > 0}
    <section class="badges" aria-labelledby="badges-title">
      <h2 id="badges-title">{t('end.badges')}</h2>
      <ul>
        {#each badges as badge (badge)}
          <li>
            <BadgePicture {badge} size={56} />
            <strong>{t(`badge.${badge}.name`)}</strong>
            <span>{t(`badge.${badge}.text`)}</span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
```

- CSS: `.badges ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.8em; } .badges li { display: flex; flex-direction: column; align-items: center; gap: 0.2em; max-width: 9em; text-align: center; } .badges h2 { margin: 0.3em 0; font-size: 1.1em; }`.

`Play.svelte`: `<EndScreen result={game.result} badges={client.badges}>`. Host ei saa merkkejä, joten sen `EndScreen` jää ennalleen.

- [ ] **Step 6: Jälkipuinnin talvikuukaudet**

`debrief/Debrief.svelte`:
- Import `isWinter` (`@saari/rules`), `PARAMS` (`../../lib/rules-info.ts`) ja `Icon` (`../Icon.svelte`).
- Kuukausirivillä:

```svelte
{#each debrief.months as m (m.month)}<td class="month">{m.month}{#if isWinter(m.month, PARAMS)}<Icon name="winter" size={14} />{/if}</td>{/each}
```

- [ ] **Step 7: Aja kaikki asiakkaan testit ja tyypit**

Run: `pnpm --filter @saari/client test && pnpm --filter @saari/client typecheck`
Expected: PASS, myös "no dead strings".

- [ ] **Step 8: Katso näkymät selaimessa**

Käynnistä demo (`pnpm --filter @saari/client dev`, demotila ilman palvelinta) ja aja botti-peli DevPanelin "Seuraava vaihe" -napilla kuukauteen 10. Tarkista projektori- ja oppilasnäkymästä:
- yläpalkissa "❄ Tammikuu" ja projektorilla "Juhlaan 5 kuukautta";
- meriruudun napissa "Pilki" ja avannon kuva;
- loka- ja marraskuussa tapahtumanauhassa "Talvi tulee!";
- syksyn yhteenvedossa "Talveen N kuukautta";
- aulassa kuusi sääntökuvaa;
- loppuruudulla vieraslaiva ja oppilaalla merkit.

Piilotetussa selainpaneelissa: rAF-paikkaus ja näkymän emulointi ennen kartan liittämistä (ks. projektin muisti).

- [ ] **Step 9: Commit (tehtävät 9 ja 10 yhdessä)**

```bash
git add apps/client
git commit -m "Client: settlers story, village meeting, homes, month names and seasons, ice fishing, badges on the end screen"
```

---

### Task 11: Talvikuvat (vasta Samun hyväksynnän jälkeen)

**Edellytys:** Samu on hyväksynyt tehtävän 1 lumikokeilun tai antanut siitä palautetta. Palaute toteutetaan ensin `add_snow`-funktioon.

**Files:**
- Modify: `tools/art/kenney-props-spec.py`
- Regenerate: `tools/art/kenney-props.json`, `apps/client/public/art/kenney/props/*-snow.png`, `apps/client/src/map/kenney-props.ts`

**Interfaces:**
- Produces: kuvat `props/<nimi>-snow` kaikille spriteille paitsi `boat`, `field-1`, `field-2` ja `field-3` (talvella pelto on aina vaiheessa 0). `PROP_TOPS` sisältää nämä nimet.

- [ ] **Step 1: Lisää talviversiot speksiin**

`kenney-props-spec.py`, heti sprite-listan viimeisen `sprites += [...]`-lauseen jälkeen:

```python
# Winter (docs/09-uudisasukkaat.md §3.3): the same sprites with snow on their upward faces.
# The boat stays on the water, and fields are bare under the snow (stage 0) all winter.
SNOWLESS = {'boat', 'field-1', 'field-2', 'field-3'}
sprites += [{**s, 'name': s['name'] + '-snow', 'snow': True} for s in list(sprites) if s['name'] not in SNOWLESS]
```

- [ ] **Step 2: Renderöi ja jälkikäsittele**

```bash
python -I tools/art/kenney-props-spec.py
"$BL" -b --factory-startup -P tools/art/render-kenney.py -- tools/art/kenney-props.json $SP/kenney3d/x $SP/props-winter
python -I tools/art/kenney-props-post.py $SP/props-winter
```

Expected: `56 sprites` speksistä (30 + 26) ja `copied 56 sprites`.

- [ ] **Step 3: Tarkista koko ja ulkoasu**

`du -ch apps/client/public/art/kenney/props/*-snow.png | tail -1` on alle 250 kt. Katso kontaktiarkki talvikuvista samalla tavalla kuin tehtävän 1 askeleessa 4. Kaikkien kuvien pitää täyttää samat ehdot.

- [ ] **Step 4: Commit**

```bash
git add tools/art apps/client/public/art/kenney/props apps/client/src/map/kenney-props.ts
git commit -m "Art: winter versions of every map sprite"
```

---

### Task 12: Talvikartta

**Files:**
- Modify: `apps/client/src/map/kenney.ts`, `renderer.ts`, `sprites.ts`, `MapView.svelte`
- Modify: `apps/client/src/views/Play.svelte`, `Host.svelte`
- Test: `apps/client/test/kenney.test.ts`, `apps/client/test/sprites.test.ts`

**Interfaces:**
- Consumes:
  - `grass-snow.png` (tehtävä 1)
  - `props/*-snow.png` ja `PROP_TOPS` (tehtävä 11)
  - `isWinter` (tehtävä 2)
- Produces:
  - `kenneyTile(tile, style, winter = false)`
  - `kenneyProp(tile, ctx, style, landingBoat = false, winter = false)`
  - `drawShore(pen, cx, cy, layer, winter = false)`
  - `MapRenderer.update(map, villagers, winter = false)`
  - `MapView`-props `winter?: boolean`

- [ ] **Step 1: Kirjoita testit**

`kenney.test.ts`:

```ts
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

describe('winter map (docs/09-uudisasukkaat.md §3.3)', () => {
  it('has a file for every preloaded texture, so one missing picture cannot drop the whole map', () => {
    const base = fileURLToPath(new URL('../public/art/kenney/', import.meta.url));
    const missing = KENNEY_TEXTURES.filter((name) => !existsSync(`${base}${name}.png`));
    expect(missing).toEqual([]);
  });

  it('puts snow on the land blocks in winter, also under the fog', () => {
    expect(kenneyTile(tile(), 'kenney', true)?.texture).toBe('grass-snow');
    expect(kenneyTile(tile({ fog: true, terrain: null }), 'kenney', true)?.texture).toBe('grass-snow');
    expect(kenneyTile(tile(), 'kenney')?.texture).toBe('grass');
  });

  it('uses the snowy version of what stands on a tile, but keeps the boat as it is', () => {
    expect(kenneyProp(tile({ terrain: 'forest', stock: 40 }), ctx(40), 'kenney', false, true)?.texture).toMatch(/^props\/forest-3[ab]-snow$/);
    expect(kenneyProp(tile({ building: { kind: 'gathering', level: 2 } }), ctx(), 'kenney', false, true)?.texture).toBe('props/gathering-2-snow');
    expect(kenneyProp(tile({ terrain: 'sea' }), ctx(), 'kenney', true, true)?.texture).toBe('props/boat');
  });

  it('shows a field bare under the snow whatever crop it had', () => {
    for (const stock of [0, 10, 30]) {
      expect(kenneyProp(tile({ terrain: 'field', stock }), ctx(30), 'kenney', false, true)?.texture).toBe('props/field-0-snow');
    }
  });

  it('only returns preloaded textures in winter', () => {
    for (let x = 0; x < 20; x++) {
      for (const terrain of LAND) {
        for (const stock of [0, 15, 40]) {
          const p = kenneyProp(tile({ x, y: x * 7, terrain, stock }), ctx(terrain === 'forest' ? 40 : 30), 'kenney', false, true);
          if (p) expect(KENNEY_TEXTURES).toContain(p.texture);
        }
      }
      for (const kind of BUILDING_KINDS) {
        for (const level of LEVELS) {
          const p = kenneyProp(tile({ building: { kind, level } }), ctx(), 'kenney', false, true);
          expect(KENNEY_TEXTURES).toContain(p?.texture);
        }
      }
    }
  });
});
```

`sprites.test.ts`: kirjoita nykyisen `drawShore`-testin (rivi ~163) viereen sama kirjauskynällä:

```ts
  it('covers the dry beach with snow in winter; the wet edge stays', () => {
    // same recording pen as the drawShore test above
    drawShore(pen, 0, 0, 'dry', true);
    expect(lastEllipseColor(pen)).toBe(SHORE_LOOK.snow);
  });
```

Käytä kynää samalla tavalla kuin viereinen testi. Jos tiedostossa ei ole valmista apuria viimeisen ellipsin värille, lue väri kynän kirjaamista kutsuista kuten viereinen testi tekee.

- [ ] **Step 2: Aja testit ja varmista, että ne epäonnistuvat**

Run: `pnpm --filter @saari/client exec vitest run test/kenney.test.ts test/sprites.test.ts`
Expected: FAIL. Funktiot eivät vielä ota `winter`-parametria, eikä `SHORE_LOOK.snow` ole olemassa. Tiedostotesti menee läpi, jos tehtävät 1 ja 11 on tehty.

- [ ] **Step 3: Toteuta**

`kenney.ts`:
- `KENNEY_TEXTURES`: `['grass', 'grass-snow', ...PROPS, ...CLOUDS, ...RESOURCE_ICONS]`. `PROPS` saa talvikuvat `PROP_TOPS`:sta automaattisesti.
- `kenneyTile`:

```ts
/** The block a land tile stands on; the sea has none (it is the background). Snowy in winter (docs/09 §3.3). */
export function kenneyTile(tile: PublicTile, style: ArtStyle, winter = false): TileSprite | null {
  if (style === 'placeholder') return null;
  const texture = winter ? 'grass-snow' : 'grass';
  if (tile.fog || tile.terrain === null) return { texture, tint: FOG_TINT };
  if (tile.terrain === 'sea') return null;
  return { texture, tint: winter ? 0xffffff : pick(GRASS_TINTS, tile.x, tile.y, 3) };
}
```

- `kenneyProp`: lisää viimeiseksi parametriksi `winter = false`. Talvella kenttä on aina vaihe 0, ja kuvan nimeen lisätään `-snow` (paitsi veneelle):

```ts
  const look = propFor(tile, ctx, landingBoat, winter);
  return look && winter && look.texture !== 'props/boat' ? { ...look, texture: `${look.texture}-snow` } : look;
}

function propFor(tile: PublicTile, ctx: { stockMax: number | null }, landingBoat: boolean, winter: boolean): PropSprite | null {
  if (tile.building) return prop(`${tile.building.kind}-${tile.building.level}`);
  // ... the current switch, with the field case:
  //   case 'field':
  //     return prop(`field-${winter || stock <= 0 ? 0 : stage(stock, max)}`);
}
```

  Siirrä nykyinen `switch` sellaisenaan `propFor`-funktioon. Pidä `if (style === 'placeholder' || tile.fog) return null;` -tarkistus `kenneyProp`-funktiossa. Päivitä `kenneyProp`:n kommenttiin: "In winter everything but the boat has snow on it, and fields are bare."

`sprites.ts`: `SHORE_LOOK`-olioon `snow: 0xeef4f8,`. Lisäksi:

```ts
/** Kenney style: sand under a land block, round the island at the water; `wet` for every tile first, then `dry`. Snow covers the dry beach in winter. */
export function drawShore(pen: Pen, cx: number, cy: number, layer: 'wet' | 'dry', winter = false): void {
  if (layer === 'wet') pen.ellipse(cx, cy + 2, HALF_W * 1.32, HALF_H * 1.32, SHORE_LOOK.wetSand, 1);
  else pen.ellipse(cx, cy, HALF_W * 1.22, HALF_H * 1.22, winter ? SHORE_LOOK.snow : SHORE_LOOK.sand, 1);
}
```

`renderer.ts`:
- Kenttä `#winter = false;` kentän `#villagers` jälkeen.
- `update(map: MapView, villagers: number, winter = false)`. Metodin alkuun:

```ts
    const seasonChanged = winter !== this.#winter;
    this.#winter = winter;
```

  Ehto `first` pysyy. `#draw()` piirtää aina koko kartan, joten `seasonChanged` tarvitaan vain, jos piirtoa on rajattu. Jos ei ole, jätä muuttuja pois.
- `#draw`:
  - `drawShore(ground, ..., layer, this.#winter)`
  - `kenneyTile(tile, style, this.#winter)`
  - `kenneyProp(tile, ctx, style, isWreck, this.#winter)`

`MapView.svelte`:
- Props-rajapintaan `winter?: boolean;` ja destrukturointiin `winter = false`.
- Effect: `renderer?.update(map, villagers, winter);`

`Play.svelte` ja `Host.svelte`: `<MapView ... winter={isWinter(game.month, PARAMS)}`. Lisää importit `isWinter` (`@saari/rules`) ja `PARAMS` (`../lib/rules-info.ts`).

- [ ] **Step 4: Aja testit ja tyypit**

Run: `pnpm --filter @saari/client test && pnpm --filter @saari/client typecheck && pnpm --filter @saari/client build`
Expected: PASS ja build onnistuu.

- [ ] **Step 5: Katso talvikartta selaimessa**

Demotilassa kuukauteen 9 (joulukuu):
- saari on luminen;
- rakennuksilla on lumikatot;
- pellot ovat lumen alla;
- ranta on valkoinen ja rantavesi sininen;
- vene ei ole luminen.

Kuukaudessa 12 (maaliskuu) kartta on taas vihreä. Ota projektorinäkymästä kuva tiedostoon `docs/art/2026-10-13-talvi.jpg` (sama kaappausmenetelmä kuin `ulkoasu.jpg`:ssä).

- [ ] **Step 6: Commit**

```bash
git add apps/client docs/art/2026-10-13-talvi.jpg
git commit -m "Map: snowy island in winter, bare fields, snow on the beach"
```

---

### Task 13: Dokumentit

**Files:**
- Modify: `docs/03-paatokset.md`, `docs/04-pelisuunnittelu.md`, `docs/07-opettajan-ohje.md`, `docs/02-suunnitelma.md`, `docs/09-uudisasukkaat.md`

- [ ] **Step 1: Päätösloki**

`03-paatokset.md`:
- Yliviivaa P32:n nimet (`~~6 Saaren paratiisi … 1 Selviytyjät rannalla~~`), ja lisää perään "nimet korvattu P45:ssä".
- Lisää P1:een "Tarkennettu P46:ssa (2.–6. luokka)".
- Lisää rivit:

| # | Päivä | Aihe | Päätös | Perustelu |
|---|---|---|---|---|
| 40 | 2026-10-13 | Irti Saarellasta | **Oma tarina ja ilme:** uudisasukkaat perustavat kylän autiolle saarelle, ja peli päättyy avajaisjuhlaan, johon saapuu vieraita. Lisäksi vuodenajat ja uudet nimet. Säännöt pysyvät talvisääntöä lukuun ottamatta (`docs/09-uudisasukkaat.md`). | Samu: peli ei saa olla Saarellan kopio; yhteiskunnan rakentaminen ja koululaistyyli säilyvät. |
| 41 | 2026-10-13 | Kehystys | **Kaikki resurssit pysyvät yhteisinä** (P7a ennallaan). Sanasto talkoista, kyläkokouksesta ja kodeista. Oppiminen esitetään myönteisenä ("kun opit, saat enemmän aikaan koko kylälle"), ja "itsekäs"-strategian nimi on nyt `skillsOnly` (vain taidot). | Kaverin palaute "erittäin kommunistinen". Samu: pelin idea on yhteistyötaitojen kehittäminen, ja automaattisesti yhteinen on helpoin. |
| 42 | 2026-10-13 | Omat merkit | **1–3 merkkiä pelaajan omalla laitteella** pelin lopussa: kaksi eniten tehtyä työtä (vähintään 3 kertaa ja 20 %), Kyläkokouksen jäsen ja Uudisasukas varamerkkinä. Merkkejä ei näytetä projektorilla eikä tallenneta. | Jokainen näkee jotain omaa ilman järjestykseen asettamista (P20, P34). |
| 43 | 2026-10-13 | Vuodenajat | **Peli alkaa huhtikuussa.** Talvi on joulu–helmikuu: satoa ei voi korjata, metsät eivät kasva ja kalastus on pilkkimistä. Varoitus tulee loka- ja marraskuussa. | Lapsille tuttu asia. Varastointi ennen talvea on yhteinen suunnittelutehtävä myös hyville luokille. |
| 44 | 2026-10-13 | Nimet | **Koti** (teltta → mökki → talo), **Koulu** (ulkoluokka → koulu → iso koulu), **Paja** (työpenkki → paja → iso paja), **Kylätalo** (laavu → kylätalo → juhlatalo) ja **Lampi**. Sisäiset tunnisteet pysyvät. | Saarellan nimet (nuotio → teatteri → amfiteatteri, lähde) pois. |
| 45 | 2026-10-13 | Arvosanojen nimet (korvaa P32:n nimet) | 6 Unelmien kylä, 5 Kukoistava kylä, 4 Toimiva kylä, 3 Kasvava kylä, 2 Sinnittelevä leiri, 1 Leiri rannalla. Rajat on viritetty uudelleen simulaattorilla (`05-tasapaino.md`). | Uusi tarina. Ei haaksirikkoa eikä sanaa "Ahdinko". |
| 46 | 2026-10-13 | Kohderyhmä (tarkentaa P1) | **2.–6. luokka.** Tekstit ja monimutkaisuus mitoitetaan 2.-luokkalaiselle. | Samu. |
| 47 | 2026-10-13 | Nimi (sulkee P5, vahvistaa P36) | **Last Chance.** Käyttöliittymän työnimi "Saari" poistuu. Pakettinimet `@saari/*` jäävät. | Samu: "nimi oli jo päätetty". |

- [ ] **Step 2: Pelisuunnittelu**

`04-pelisuunnittelu.md`:
- tila v1.2 (2026-10-13), viittaukset P40–P47;
- §1 Tarina uudisasukkaiksi;
- uusi §9.1 "Vuodenajat ja talvi" (kalenteri ja talvisääntö spec §3:sta);
- §10.1 rakennusten nimet;
- §12 arvosanojen nimet;
- §14 yläpalkki (kuukauden nimi ja vuodenaika) ja loppuruutu (vieraslaiva, omat merkit);
- §15 "Itsekäs" → "Vain taidot (`skillsOnly`)";
- §2:n "4.–9.-luokkalaiselle" → "2.–6.-luokkalaiselle";
- §7 lähde → lampi.

- [ ] **Step 3: Opettajan ohje ja suunnitelma**

`07-opettajan-ohje.md`: lue tiedosto ja päivitä tarina, kyläkokous, vuodenajat ("talvella pelto ei kasva: muistuttakaa toisianne syksyllä") ja omat merkit.

`02-suunnitelma.md`:
- vaihetaulukkoon rivi `| V9 ✓ | Oma peli: uudisasukkaat, vuodenajat, kehystys, merkit (docs/09-uudisasukkaat.md, P40–P47) | testit läpi, simulaattori viritetty, talvi tarkistettu selaimessa |`;
- poista lykätyistä päätöksistä "Lopullinen nimi ja domain".

`09-uudisasukkaat.md`: tila "**toteutettu 2026-10-13**". Korjaa kohdan "Hyväksytyt päätökset kirjataan päätöslokiin (P40–P46)" numerot muotoon P40–P47.

- [ ] **Step 4: Commit**

```bash
git add docs
git commit -m "Docs: decisions P40-P47, settlers and seasons in the design doc and the teacher's guide"
```

---

### Task 14: Tarkistus ja julkaisu

- [ ] **Step 1: Kaikki testit ja tyypit**

Run: `pnpm test && pnpm typecheck && pnpm --filter @saari/client build`
Expected: kaikki paketit läpi. Kirjaa testimäärät loppuraporttiin.

- [ ] **Step 2: Kokonainen bottipeli selaimessa**

Aja demotilassa Lyhyt ja Normaali peli loppuun projektori- ja oppilasnäkymässä. Tarkista:
- tehtävän 10 askeleen 8 kohdat;
- tehtävän 12 askeleen 5 kohdat;
- jälkipuinnin lumihiutaleet ja talvikysymys;
- että mikään teksti ei puhu haaksirikosta, pelastuslaivasta, suojista, nuotio/teatteri/amfiteatterista tai itsekkyydestä: `grep -rniE "haaksirik|pelastuslaiv|suojapaik|amfiteatter|itsek" apps/client/src` palauttaa tyhjää.

- [ ] **Step 3: Push**

```bash
git push origin main
```

- [ ] **Step 4: Julkaisu tuotantoon (katkaisee käynnissä olevat pelit)**

Tarkista ensin, onko tuotannossa käynnissä peli. Lue palvelimen loki (`ssh novaservu 'cd ~/docker/last-chance && docker compose logs --tail=50'`) ja etsi rivejä "game … started", joilla ei ole vastaavaa "ended"-riviä viimeisen tunnin ajalta. Jos käynnissä on peli, odota tai kysy Samulta. Sitten:

```bash
ssh novaservu 'cd ~/docker/last-chance && git pull && docker compose up -d --build'
node tools/smoke-public.mjs
```

Expected: smoke OK. `smoke-public.mjs` käyttää protokollaversiota `@saari/protocol`-paketista. Jos se on kovakoodattu, päivitä se arvoon 2 ennen ajoa.

- [ ] **Step 5: Raportti Samulle**

Kerro suomeksi:
- mitä muuttui (tarina, kehystys, merkit, vuodenajat, nimet, kuvat);
- uudet arvosanarajat;
- testimäärät;
- että tuotanto päivitettiin ja käynnissä olleet pelit katkesivat;
- linkit kuviin `docs/art/2026-10-13-lumikokeilu.jpg` ja `docs/art/2026-10-13-talvi.jpg`.

Päivitä projektin muisti (`project_saari_classroom_game_2026-10.md`): V9 tehty, `skillsOnly`, talvisääntö ja protokolla 2.
