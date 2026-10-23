# Last Chance: Arctic

Selainpohjainen yhteistyöpeli koululuokille (2.–6. luokka). Jäänmurtaja tuo luokan jäiselle
arktiselle saarelle. Luokka perustaa kylän nuotion ympärille, rakentaa iglut ja kasvihuoneet ja
valmistautuu revontulijuhlaan. Kaikki kerätty menee yhteiseen varastoon, ja kuun lopussa luokka
äänestää, mitä rakennetaan. Kylän nuotio polttaa puuta pakkasen mukaan, ja jos kylän onnellisuus
putoaa liian alas, kylä luovuttaa. Pelin lopussa opettaja saa jälkipuinnin.

Pohjana on suomalaisen *Saarella*-oppimispelin (Eduplus Oy 2013, myöhemmin TeacherGaming /
*Stranded*) ydinidea: yhteiset resurssit ja rakentamisesta äänestäminen. Muuten peli on uusi ja
sillä on oma nimensä.

Osoite: `https://last-chance.novanet.fi` (novaservu), avoin kaikille kouluille.
Koodi: <https://github.com/pihatonttu/last-chance> (julkinen, ei vielä lisenssiä).

## Dokumentit

- [`docs/01-alkuperainen-peli.md`](docs/01-alkuperainen-peli.md): alkuperäisen pelin
  rakenne, säännöt ja tekniikka arkistoidusta lähdekoodista ja ohjekirjoista
- [`docs/02-suunnitelma.md`](docs/02-suunnitelma.md): uusioversion suunnitelma
- [`docs/03-paatokset.md`](docs/03-paatokset.md): lukitut päätökset
- [`docs/04-pelisuunnittelu.md`](docs/04-pelisuunnittelu.md): pelisäännöt
- [`docs/05-tasapaino.md`](docs/05-tasapaino.md): tasapainon viritys ja simulaatiotulokset
- [`docs/06-tietosuoja.md`](docs/06-tietosuoja.md), [`docs/07-opettajan-ohje.md`](docs/07-opettajan-ohje.md): luonnokset
- [`docs/09-uudisasukkaat.md`](docs/09-uudisasukkaat.md): oma tarina, kehystys ja omat merkit
- [`docs/10-arktinen.md`](docs/10-arktinen.md): napateema (nuotio, pakkanen, iglut, häviö)

## Kehitys

Vaatii Node 24:n ja pnpm 10:n.

```bash
pnpm install
pnpm test                                   # kaikkien pakettien testit
node apps/server/src/main.ts                # palvelin portissa 8080
pnpm --filter @saari/client dev             # käyttöliittymä, http://localhost:5173 (?mock=1 ilman palvelinta)
node packages/sim/src/cli.ts --seeds 40     # tasapainosimulaatio
```

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

Julkaisu: [`docs/08-julkaisu.md`](docs/08-julkaisu.md).

## Referenssimateriaali

`reference/original/` sisältää Wayback Machinesta ladatun alkuperäisen lähdekoodin, kuvia ja
ohjekirjat. Kansio on `.gitignore`ssa, koska materiaali on alkuperäisten tekijöiden omaisuutta.
Se on vain paikallista tutkimuskäyttöä varten.
