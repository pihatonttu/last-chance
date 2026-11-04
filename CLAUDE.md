# CLAUDE.md

Ohjeet Claude Codelle ja kaikille tässä repossa kehittäville. Asennus ja ajaminen ovat
tiedostossa [`README.md`](README.md), työtapa tiedostossa [`CONTRIBUTING.md`](CONTRIBUTING.md) ja
dokumenttien kartta tiedostossa [`docs/README.md`](docs/README.md).

## Projekti

Last Chance: Arctic on selainpeli koululuokille (2.–6. luokka, P46). Opettaja näyttää pelin
projektorilla, ja oppilaat pelaavat omilla laitteillaan. Pelin tarkoitus on harjoitella
yhteistyötä, joten kaikki resurssit ovat yhteisiä (P7, P41) eikä oppilaita tai luokkia
verrata toisiinsa (P20). P-numerot viittaavat päätöslokiin [`docs/03-paatokset.md`](docs/03-paatokset.md).

Tekniikka: pnpm-monorepo, TypeScript, Node 24 (ajaa `.ts`-tiedostot suoraan), Svelte 5, PixiJS 8,
`ws`, `node:sqlite` ja Vitest.

## Komennot

```bash
pnpm test                                                      # kaikki testit
pnpm typecheck                                                 # kaikki tyypit
pnpm --filter @saari/client build                              # tuotantokäännös
pnpm --filter @saari/rules exec vitest run test/heat.test.ts   # yksi testitiedosto
pnpm --filter @saari/client dev                                # http://localhost:5173/?mock=1
node apps/server/src/main.ts                                   # palvelin portissa 8080
node packages/sim/src/cli.ts --seeds 40 --villagers 15,30,40 --short   # tasapaino
```

Ennen kuin sanot muutoksen olevan valmis, aja `pnpm typecheck` ja `pnpm test`. Kun näkymä muuttuu,
katso se myös selaimessa (`?mock=1` riittää yleensä).

## Arkkitehtuuri

Palvelin omistaa kaiken tilan. Selain lähettää aikeita ja piirtää näkymät, jotka se saa. Pelit
ovat vain palvelimen muistissa, ja levylle tallennetaan ainoastaan pseudonymisoidut jälkipuinnit.

| Paikka | Vastuu |
|---|---|
| `packages/rules/src/game.ts` | `Game`: säännöt ja pelin tila. Ei tiedä verkosta eikä ajastimista. |
| `packages/rules/src/params.ts` | `DEFAULT_PARAMS`: kaikki viritetyt luvut |
| `packages/rules/src/mapgen.ts`, `weather.ts` | kartta ja pakkanen, deterministisiä siemenestä |
| `packages/protocol/src/index.ts` | viestit, näkymämallit ja `PROTOCOL_VERSION` |
| `packages/debrief` | jälkipuinnin laskenta, kysymykset, merkit ja `pseudonymize` |
| `packages/bots`, `packages/sim` | botit ja tasapainosimulaattori |
| `packages/names` | nimimerkkisuodatin ja satunnaiset nimet |
| `apps/server/src/session.ts` | `GameSession`: yksi peli, ajastimet, botit ja varoitukset |
| `apps/server/src/hub.ts` | pelit ja yhteydet |
| `apps/server/src/store.ts` | jälkipuinnit SQLitessä, poisto 30 päivän jälkeen |
| `apps/server/src/http.ts`, `ws.ts`, `validate.ts` | HTTP, WebSocket ja syötteiden tarkistus |
| `apps/client/src/state/reducer.ts` | selaimen tila puhtaana funktiona palvelimen viesteistä |
| `apps/client/src/net/mock/` | demopalvelin `?mock=1`-tilaan: oikeat säännöt ja botit selaimessa |
| `apps/client/src/map/` | PixiJS-kartta |
| `apps/client/src/i18n/fi.ts` | kaikki näkyvät tekstit |
| `apps/client/src/views/`, `components/` | sivut ja komponentit |

**Pelin kulku.** `GameSession` vie `Game`-oliota vaiheesta toiseen ajastimilla:
`start()` → `endActionPhase()` → `endVotePhase()` (äänestys ja kuun loppu, palauttaa
`MonthReport`in) → `nextMonth()`. Vaiheet ovat `lobby`, `action`, `vote`, `summary` ja `ended`.
Kuun lopun järjestys on kohdassa `docs/04-pelisuunnittelu.md` §9.

**Paketit ilman käännöstä.** Työtilan paketit viedään lähdekoodina (`"exports": "./src/index.ts"`).
Niitä ei käännetä, ja palvelin ajaa ne Noden tyypinpoistolla.

## Ehdottomat säännöt

Näitä ei muuteta ilman Samun päätöstä. Useimmat on varmistettu testeillä.

1. **Nimimerkit eivät koskaan päädy levylle eivätkä lokiin** (P23). Palvelin ei kirjaa myöskään
   pyyntöjä tai IP-osoitteita. Vartija: `apps/server/test/privacy.test.ts`.
2. **Tallennettava jälkipuinti on pseudonymisoitu.** `pseudonymize` rakentaa tiedot kenttä
   kentältä, joten uusi kenttä ei kulje sen läpi vahingossa. Lisää kenttä sinne harkiten.
3. **Merkit näkyvät vain omalle pelaajalle** (P42). Nimiä ei näytetä kartalla pelin aikana (P34).
4. **Vanhojen jälkipuintien pitää aueta.** Linkit toimivat 30 päivää. `DebriefData.version` pysyy
   ennallaan, ja uudet kentät ovat valinnaisia. Kun luet tallennettua dataa, oleta että uusin
   kenttä puuttuu (esim. `heatOf` tiedostossa `apps/client/src/lib/heat.ts`).
5. **Kaikki näkyvät tekstit ovat tiedostossa `fi.ts`.** Testi `apps/client/test/i18n.test.ts`
   kaatuu puuttuvaan ja käyttämättömään avaimeen. Ajon aikana koottavat avaimet lisätään testin
   `familyKeys()`-listaan. Tekstit mitoitetaan 2.-luokkalaiselle.
6. **Kuvat tulevat Kenneyn CC0-paketeista tai omista Blender-skripteistä** (P59). Ei tekoälyn
   generoimaa grafiikkaa eikä mitään alkuperäisen pelin materiaalia.
7. **Tietosuojaseloste pysyy totena.** Jos käsiteltävät tiedot muuttuvat, päivitä
   `docs/06-tietosuoja.md` samassa muutoksessa.

## Sisäiset nimet

Pelin teema vaihtui, mutta sisäiset tunnisteet pysyivät, koska ne ovat protokollassa ja
tallennetuissa jälkipuinneissa. **Älä nimeä niitä uudelleen.** Paketit ovat yhä `@saari/*`.

| Koodissa | Pelissä |
|---|---|
| `stone` | jää |
| `meadow`, `field` | lumikenttä, kasvihuone |
| `rock`, `quarry` | jäätikkö, jäälouhos |
| `spring` | kuuma lähde |
| `shelter` | koti (pieni iglu, iglu, iso iglu) |
| `gathering` | kylätalo (laavu, kylätalo, lumilinna) |
| `plow`, `mine`, `fish` | Rakenna kasvihuone, Louhi jäätä, Pilki |
| `farmer`, `stonecutter` | Puutarhuri, Jäänhakkaaja (merkit) |
| landing-ruutu | kylän nuotio, sille ei voi rakentaa |

## Tyyli

- Koodi, kommentit ja commit-viestit englanniksi. Dokumentit ja pelin tekstit suomeksi.
- Importeissa `.ts`-pääte. Tyypit tuodaan `import type` -muodossa.
- `erasableSyntaxOnly` on päällä: ei `enum`eja eikä konstruktorin parametriominaisuuksia.
- Tiukat asetukset (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) ovat käytössä.
  Valinnaista kenttää ei aseteta arvoon `undefined`, vaan se jätetään pois.
- Testit ovat kunkin paketin `test/`-kansiossa ja käyttävät oikeaa koodia, ei mockeja.
- Noudata ympäröivän koodin tyyliä ja kommenttien määrää.

## Yleisimmät muutokset

**Säännöt.** Muutos tehdään `packages/rules`-pakettiin ja kirjataan
`docs/04-pelisuunnittelu.md`-tiedostoon. Merkittävä päätös saa rivin päätöslokiin. Sääntötestit
käyttävät jäädytettyjä lukuja (`packages/rules/test/params.ts`), joita muutetaan vain, kun itse
sääntö muuttuu. Pidä mielessä myös botit, simulaattori ja demopalvelin.

**Tasapaino.** Luvut muutetaan tiedostossa `params.ts`, ja hyväksymisehdot tarkistetaan
simulaattorilla (`docs/05-tasapaino.md`). Raportti tallennetaan kansioon `docs/sim/`. Käyttöliittymä
lukee osan luvuista suoraan oletuksista (`apps/client/src/lib/rules-info.ts`).

**Pelikulku palvelimella.** `apps/client/src/net/mock/server.ts` jäljittelee tiedostoa
`apps/server/src/session.ts`. Muuta molemmat, tai demo alkaa käyttäytyä eri tavalla kuin oikea peli.

**Protokolla.** Muokkaa `packages/protocol/src/index.ts`-tiedostoa. Jos vanha välilehti ei enää
toimi uuden palvelimen kanssa, kasvata `PROTOCOL_VERSION`-arvoa ja kerro syy sen kommentissa.
Vanhoille välilehdille näytetään kehotus päivittää sivu.

**Uusi arvo unioniin** (toiminto, tapahtuma, kysymys, merkki...). `apps/client/src/lib/enums.ts`
kaatuu käännökseen, kunnes arvo on lisätty sinne, ja i18n-testi vaatii sille tekstin.

**Kuvat.** Ohje on tiedostossa [`tools/art/README.md`](tools/art/README.md). Tiedosto
`apps/client/src/map/kenney-props.ts` on generoitu, joten sitä ei muokata käsin. Yksi puuttuva
kuva pudottaa koko kartan "ei voitu näyttää" -viestiin, koska varakarttaa ei ole. Testi
`has a file for every preloaded texture` vartioi tätä.

## Sudenkuopat

- Hävityn pelin `game.grade()` palauttaa arvon, vaikka tasoa ei näytetä. Tarkista aina ensin
  `result.lost`.
- `packages/debrief/test/scenario.ts` lukitsee omat lukunsa, jotta tasapainon viritys ei muuta
  jälkipuinnin testejä. Jos testi kaatuu virityksen takia, lukitse luku sinne.
- Palvelin välimuistittaa kuvat tunniksi (`/art/kenney/**`). Saman nimisen kuvan korvaaminen näkyy
  jo pelanneilla laitteilla viiveellä.
- Palvelimen uudelleenkäynnistys katkaisee käynnissä olevat pelit.

## Mitä et tee

- **Et julkaise.** `main` ei mene tuotantoon itsestään, ja vain Samu julkaisee
  ([`docs/08-julkaisu.md`](docs/08-julkaisu.md)). Älä aja `tools/smoke-public.mjs`-skriptiä
  tuotantoa vasten pyytämättä.
- **Et pushaa suoraan `main`-haaraan.** Työ kulkee haaran ja pull requestin kautta.
- **Et lisää reposta salaisuuksia tai oppilaiden tietoja.** Repo on julkinen.
- **Et muuta pelin ydintä omin päin:** yhteiset resurssit, äänestys ja kilpailun puute ovat
  pelin tarkoitus. Avoimet kysymykset ovat tiedostossa
  [`docs/11-avoimet-asiat.md`](docs/11-avoimet-asiat.md).
