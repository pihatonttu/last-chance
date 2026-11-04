# Avoimet asiat

**Tila: elävä lista, koottu 2026-11-04.** Kun asia ratkeaa, poista se täältä ja kirjaa
ratkaisu sinne, minne se kuuluu (päätökset tiedostoon `03-paatokset.md`).

## Samun päätettävät

1. **Lisenssi.** Repo on julkinen, mutta lisenssiä ei ole.
2. **Rekisterinpitäjä.** Tietosuojaselosteesta ja ohjesivulta puuttuvat nimi ja yhteystieto
   (`06-tietosuoja.md`).
3. **Tutkittavien ruutujen väri.** Laatikot ovat yhä mintunvihreitä (`EXPLORE_LOOK` tiedostossa
   `apps/client/src/map/sprites.ts`). Väri on peräisin alkuperäisen pelin vaikutteesta, ja
   vaihtoehto on jäänsininen.
4. **Demon bottien määrä.** Demo alkaa 11 botilla (`demoBots` tiedostossa
   `apps/client/src/net/mock/server.ts`) ja näyttää siksi pienen kylän heikon tapauksen: kun
   kyläläisiä on 9–11, kaikki saavat kodin vain 60–78 %:ssa sekaluokan lyhyistä peleistä, ja
   silloinkin vasta noin kuukautena 8, koska lumikentät loppuvat. Ihmispelaaja voi purkaa
   kasvihuoneen (P60), mutta botit eivät pura. Luokkakoossa 15–40 ongelmaa ei ole. Ehdotus:
   demon boteiksi 15.
5. **Hyvin kylmät pelit.** Noin 8 %:ssa 15 kuukauden peleistä on vähintään 7 kovan pakkasen
   kuukautta. Silloin yhteistyöluokkakin palelee ja jää tasolle 4–5, vaikka se ei häviä, ja
   jälkipuinti kysyy nuotiosta, vaikka pakkanen olisi tehnyt palelemisesta väistämätöntä.
   Vaihtoehdot: rajoitetaan kovien kuukausien määrää, lasketaan kovan pakkasen puuntarvetta tai
   pidetään vaihteluna.
6. **Merkit ja nimimerkkipaluu.** Pelin päätyttyä luokkakaveri voi nähdä toisen merkit liittymällä
   tämän nimimerkillä. Merkit ovat aina myönteisiä, ja nimimerkki on tunniste (P23), joten asia
   jätettiin ennalleen. Vaihtoehto: merkit vain, kun paluu tapahtuu selaimen muistamalla
   tunnisteella.
7. **Nimimerkkisuodattimen rajatapaukset.** Esimerkiksi homo ja gay on estetty kokonaisina sanoina,
   koska niitä käytetään haukkumasanoina, mutta queer ja trans on sallittu. Perustelut ovat
   tiedostossa `packages/names/src/blocklist.ts`.

## Vapaat työt

Näihin ei tarvitse odottaa päätöstä, mutta kerro silti, mihin tartut.

- **Päästä päähän -testi** (vaihe V6): opettaja ja kolme oppilasta pelaavat pelin selaimessa läpi.
  Playwrightia ei ole vielä asennettu. Tämä on MVP:n valmiin määritelmässä.
- **Hävityn pelin tarkistus selaimessa.** Loppuruutu on testattu renderöintitesteillä, mutta demo ei
  pääse siihen, koska demon botit ovat enimmäkseen yhteistyöbotteja. Tarvitaan keino pakottaa häviö
  demossa.
- **Äänet.** `apps/client/src/audio/sound.svelte.ts` on tynkä: kutsukohdat ovat valmiina, mutta
  äänitiedostoja ei ole. Vain CC0-ääniä.
- **Opettajan ohjesivu.** Sivu `/ohje` on lyhyt luonnos (`help.*` tiedostossa `fi.ts`), ja se sanoo
  itsekin, että tarkempi ohje valmistuu myöhemmin. Pohjaksi käy `07-opettajan-ohje.md`.
- **Pelin säilyminen uudelleenkäynnistyksessä.** Pelit ovat vain muistissa, joten päivitys tai
  katkos katkaisee oppitunnin (`02-suunnitelma.md` §12).

## Pienet siistimiset

- `lastMonth`-ehto on kopioitu kahteen paikkaan (`Play.svelte`, `Host.svelte`).
- Jälkipuinnin lukutaulukon "–" vanhoille raporteille ei kerro ruudunlukijalle mitään
  (`Debrief.svelte`). Kuukausinäkymässä sama on jo tehty piilotetulla tekstillä.
- Testi `preloads a sprite for every prop top the badges measure` (`kenney.test.ts`) ei voi kaatua,
  koska esiladattavat kuvat lasketaan samasta listasta.
