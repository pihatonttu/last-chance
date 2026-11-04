# Näin kehität peliä

Asennus on tiedostossa [`README.md`](README.md). Arkkitehtuuri ja ehdottomat säännöt ovat
tiedostossa [`CLAUDE.md`](CLAUDE.md): lue ainakin kohdat *Ehdottomat säännöt* ja *Sisäiset nimet*.

## Työn kulku

1. **Valitse työ.** Ideoita on tiedostossa [`docs/11-avoimet-asiat.md`](docs/11-avoimet-asiat.md).
   Sovi Samun kanssa ensin kaikesta, mikä muuttaa pelisääntöjä tai pelin tuntumaa. Bugikorjaukset
   ja pienet parannukset voi vain tehdä.
2. **Tee oma haara** ajan tasalla olevasta `main`-haarasta. Älä pushaa suoraan `main`-haaraan.

   ```bash
   git switch main
   git pull
   git switch -c nuotion-animaatio
   ```

3. **Tee muutos ja sen testit.** Bugista kirjoitetaan ensin testi, joka kaatuu.
4. **Tarkista paikallisesti:**

   ```bash
   pnpm typecheck
   pnpm test
   ```

   Katso näkymämuutokset selaimessa osoitteessa <http://localhost:5173/?mock=1>.
5. **Avaa pull request.** GitHub ajaa tarkistukset (tyypit, testit ja käännös) jokaiselle pushille.
   Pohja kysyy, mitä muuttui ja miten tarkistit sen.
6. **Samu yhdistää ja julkaisee.** `main` ei mene tuotantoon itsestään, vaan julkaisu tehdään
   käsin silloin, kun pelejä ei ole käynnissä ([`docs/08-julkaisu.md`](docs/08-julkaisu.md)).

## Commitit

Viestit kirjoitetaan englanniksi muodossa `Alue: mitä muuttui`.

```text
Rules: an option that costs no wood never warns that it leaves the fire cold
Client: the fire in the month summary
Docs: numbers match params
```

Tavallisia alueita ovat `Rules`, `Bots`, `Sim`, `Debrief`, `Server`, `Client`, `Map`, `Art`, `Balance`
ja `Docs`.

Repo on julkinen, joten commitin sähköpostiosoite näkyy kaikille. Ota GitHubin asetuksista
käyttöön *Keep my email addresses private* ja aseta sieltä saamasi `noreply`-osoite repoon:

```bash
git config user.email "123456+tunnus@users.noreply.github.com"
```

## Dokumentit muuttuvat koodin mukana

Päivitä dokumentit samassa pull requestissa:

| Kun muutat | Päivitä |
|---|---|
| sääntöjä | `docs/04-pelisuunnittelu.md` |
| isoa linjausta | uusi rivi päätöslokiin `docs/03-paatokset.md` (vanhaa riviä ei poisteta, vaan se merkitään korvatuksi) |
| viritettyjä lukuja | `docs/05-tasapaino.md` ja uusi raportti kansioon `docs/sim/` |
| käsiteltäviä tietoja | `docs/06-tietosuoja.md` |
| asioita, jotka opettajan pitää tietää | `docs/07-opettajan-ohje.md` |
| kuvien tuotantoa | `tools/art/README.md` |
| avointen asioiden listaa | `docs/11-avoimet-asiat.md` |

## Claude Coden kanssa

Claude Code lukee tiedoston [`CLAUDE.md`](CLAUDE.md) automaattisesti, kun se käynnistetään repon
juuressa. Tarkista silti itse, mitä se tekee, ja katso muutos selaimessa ennen pull requestia.
Jos huomaat, että ohjeesta puuttuu jotain tai jokin siinä on väärin, korjaa `CLAUDE.md`
samalla.

## Kuvat ja äänet

Vain Kenneyn CC0-paketit tai omat Blender-skriptit (P59), ei tekoälyn generoimaa grafiikkaa eikä
alkuperäisen pelin materiaalia. Ohje: [`tools/art/README.md`](tools/art/README.md).
