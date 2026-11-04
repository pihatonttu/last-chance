# Last Chance: Arctic

Selainpohjainen yhteistyöpeli koululuokille (2.–6. luokka). Jäänmurtaja tuo luokan jäiselle
arktiselle saarelle. Luokka perustaa kylän nuotion ympärille, rakentaa iglut ja kasvihuoneet ja
valmistautuu revontulijuhlaan. Kaikki kerätty menee yhteiseen varastoon, ja kuun lopussa luokka
äänestää, mitä rakennetaan. Kylän nuotio polttaa puuta pakkasen mukaan, ja jos kylän tyytyväisyys
putoaa liian alas, kylä luovuttaa. Pelin lopussa opettaja saa jälkipuinnin.

Opettaja näyttää pelin projektorilla, ja oppilaat liittyvät omilla laitteillaan koodilla tai
QR-koodilla. Tunnuksia ei ole.

Pelaa: <https://last-chance.novanet.fi>

Pohjana on suomalaisen *Saarella*-oppimispelin (Eduplus Oy 2013, myöhemmin TeacherGaming /
*Stranded*) ydinidea: yhteiset resurssit ja rakentamisesta äänestäminen. Muuten peli on uusi ja
sillä on oma nimensä.

## Aloitus

Tarvitset [Node 24:n](https://nodejs.org/) ja pnpm 10:n. Tarkka pnpm-versio on tiedostossa
`package.json`, ja Node 24:n mukana tuleva Corepack ottaa sen käyttöön. Jos `corepack enable`
ei onnistu oikeuksien takia, aja `npm install -g pnpm@10`.

```bash
git clone https://github.com/pihatonttu/last-chance.git
cd last-chance
corepack enable
pnpm install
pnpm test
```

Windowsissa kannattaa kloonata lyhyeen polkuun (esim. `C:\dev\last-chance`), koska pnpm:n
kansiorakenne on syvä.

### Pelin ajaminen ilman palvelinta

```bash
pnpm --filter @saari/client dev
```

Avaa <http://localhost:5173/?mock=1>. Demotilassa sääntömoottori ja botit pyörivät selaimessa.
Etusivulta pääsee kokeilemaan opettajan ja oppilaan näkymää, ja demopaneelista voi siirtyä
seuraavaan vaiheeseen, muuttaa nopeutta ja lisätä botteja. Useimmat käyttöliittymämuutokset
voi kehittää näin.

### Pelin ajaminen oikean palvelimen kanssa

Kaksi terminaalia:

```bash
node apps/server/src/main.ts          # portti 8080, tietokanta kansiossa data/
pnpm --filter @saari/client dev       # http://localhost:5173, ohjaa /api:n ja /ws:n palvelimelle
```

Palvelimen asetukset ovat ympäristömuuttujia:

| Muuttuja | Oletus | Merkitys |
|---|---|---|
| `PORT` | `8080` | portti |
| `DATA_DIR` | `data` | kansio, jossa on `saari.db` |
| `STATIC_DIR` | ei asetettu | käännetty käyttöliittymä, jos palvelin tarjoaa senkin |
| `TIME_SCALE` | `1` | jakaa vaiheiden pituudet, eli `10` tekee pelistä 10 kertaa nopeamman |
| `TRUST_PROXY` | ei asetettu | `1` kun palvelin on käänteisen välityspalvelimen takana |

## Komennot

| Komento | Tekee |
|---|---|
| `pnpm test` | kaikkien pakettien testit |
| `pnpm typecheck` | kaikkien pakettien tyyppitarkistus |
| `pnpm --filter @saari/client build` | käyttöliittymän tuotantokäännös |
| `pnpm --filter @saari/rules test` | yhden paketin testit |
| `pnpm --filter @saari/rules exec vitest run test/heat.test.ts` | yksi testitiedosto |
| `node packages/sim/src/cli.ts --seeds 40 --short` | tasapainosimulaatio, ks. [`docs/05-tasapaino.md`](docs/05-tasapaino.md) |

## Rakenne

| Paketti | Sisältö |
|---|---|
| `packages/rules` | sääntömoottori, kartangeneraattori, viritetyt parametrit |
| `packages/bots` | botit (simulaattori, testit, opettajan kokeilutila) |
| `packages/sim` | tasapainosimulaattori |
| `packages/names` | nimimerkkisuodatin, satunnaiset nimet, pelaajavärit |
| `packages/debrief` | jälkipuinnin laskenta ja pseudonymisointi |
| `packages/protocol` | palvelimen ja selaimen välinen viestisopimus |
| `apps/server` | Node-palvelin (HTTP, WebSocket, SQLite) |
| `apps/client` | Svelte 5 + PixiJS -käyttöliittymä |
| `tools/art` | kuvien tuotanto Blenderillä, ks. [`tools/art/README.md`](tools/art/README.md) |

## Kehittäjälle

- [`CONTRIBUTING.md`](CONTRIBUTING.md): näin muutos kulkee ideasta tuotantoon
- [`CLAUDE.md`](CLAUDE.md): arkkitehtuuri, ehdottomat säännöt ja yleisimmät muutokset. Claude
  Code lukee tiedoston itse, mutta se on kirjoitettu myös ihmiselle.
- [`docs/README.md`](docs/README.md): dokumenttien kartta ja se, mikä on voimassa
- [`docs/11-avoimet-asiat.md`](docs/11-avoimet-asiat.md): mitä seuraavaksi voi tehdä

## Lisenssi

Repossa ei ole vielä lisenssiä, eli koodin käyttöoikeudet ovat tekijällä, vaikka repo on
julkinen. Kartan kuvat perustuvat Kenneyn CC0-paketteihin
([`LICENSE-kenney.txt`](apps/client/public/art/kenney/LICENSE-kenney.txt)).

Alkuperäisen pelin materiaalia ei ole repossa, koska se kuuluu alkuperäisille tekijöille.
