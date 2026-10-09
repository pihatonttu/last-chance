# Alkuperäinen Saarella-peli: rakenneanalyysi

Lähde: Wayback Machinen kopio `http://saarella.fi/peli/` (2015–2020), suomenkielinen
ohjekirja (`ohjekirja.pdf`, 2017), TeacherGamingin englanninkielinen *Stranded: Manual*
(Samun kopio), opettajan sivu ja pelin lähdekoodi, joka oli arkistoitunut lähes kokonaan. Tutkittu 2026-10-09. Paikalliset kopiot ovat kansiossa `reference/original/`
(ei versionhallinnassa, koska materiaali on Eduplus Oy:n / TeacherGamingin omaisuutta).

## 1. Mikä peli on

- **Saarella** (englanniksi *Stranded*) on suomalainen selainpohjainen yhteistyöoppimispeli
  luokille. Tekijä Eduplus Oy (2013), myöhemmin jakelija TeacherGaming (Tampere).
- Tarina: luokka haaksirikkoutuu tuntemattomalle saarelle. Kaikki resurssit ovat yhteisiä,
  rakentamisesta päätetään äänestämällä. "Opetuspeli, jossa et pärjää yksin."
- Pituus 15 kierrosta ("kuukautta"), noin 25 minuuttia. Kohderyhmä luokat 4–9.
- Ei asennusta eikä rekisteröitymistä: yksi luo pelin, muut liittyvät pelinumerolla.
- KUUMA-kuntien turnaus 2014: ~200 koulua, yli 1700 osallistumista, finaali Educa-messuilla.
- Domain ohjattiin myöhemmin osoitteeseen `strandedgame.net/peli`. Molemmat ovat nyt kuolleita.

## 2. Pelisilmukka

```
Aula (pelinumero, luoja painaa Start)
  └─ 15 × kierros
       1. Toimintavuoro   (ROUND_LENGTH s; päättyy heti kun kaikki ovat käyttäneet toimintonsa)
       2. Tuotantoyhteenveto (asiakkaalla 10 s: kuukauden tuotanto, vinkki, tarinateksti)
       3. Äänestysvuoro   (VOTE_LENGTH s: mikä rakennus rakennetaan)
       4. Kuukausiyhteenveto (WAIT_TIME: uusi rakennus, ruokatilanne, suojatilanne)
       5. Kierroksen vaihto: ruoan kulutus, suojarangaistus, metsän kasvu, peltojen uusiutuminen
  └─ Loppuruutu: kylän onnellisuus → arvosana (hyvä / neutraali / huono loppu)
```

Pelin luoja (ensimmäinen liittynyt) on tavallinen pelaaja, mutta vain hän näkee Start-napin.
Pause oli suunniteltu luojalle, mutta sen nappi oli koodissa kommentoitu pois ("until the
problems are fixed"). Jos luoja sulki selaimen, peli kuoli kaikilta.

## 3. Kartta

- Isometrinen 10 × 5 ruudukko (ruutu 256 × 128 px). Reunat (rivit 1 ja 5, sarakkeet 1 ja 10)
  ovat merta, sisäosa 8 × 3 = 24 maaruutua.
- Aloitusruutu (niitty) on alarannalla kohdassa (5,5); sen vieressä näkyy kaksi meriruutua.
  Muu kartta on sumun peitossa.
- Generointi: määrätty määrä niittyä, metsää ja kalliota satunnaisiin sisäruutuihin
  (`WASTELAND_TILES`, `FOREST_TILES`, `ROCK_TILES`). Kalliota ei laiteta rantaa lähelle
  (vain rivit 2–3). Yksi **lähde** satunnaiseen sisäruutuun sumun alle.
- Sumuruutua voi tutkia vain, jos jokin sen 8 naapurista on paljastettu. Kun ruutu paljastuu,
  myös sen viereiset meriruudut paljastuvat.
- Ruutugrafiikka valitaan naapurien perusteella (reunabitit T/R/B/L + kulmamuunnelmat), joten
  metsä, kallio ja ranta yhtyvät saumattomasti.

## 4. Aluetyypit ja toiminnot

Jokainen toiminto kuluttaa yhden pelaajan toiminnoista (alussa 3 per kierros). Ruutua
klikatessa avautuu **toimintaympyrä**: alueen nimi ja kuvaus, nykytila (esim. `45%` tai
`30 / 50`), yksi toimintonappi ja sen tuotto (esim. `+12`).

| Alue | Toiminto | Sääntö (`Tile.js`) |
|---|---|---|
| Tutkimaton alue (sumu) | Tutki aluetta | `workDone += teho`; vaadittu työ = etäisyys aloituksesta (Manhattan) / `FOG_DISTANCE_DIVIDER` × `FOG_EXPLORE_MODIFIER`. Kaukana tutkiminen on raskaampaa. |
| Niitty (joutomaa) | Kynnä peltoa | `workDone += teho`, kunnes `WASTELAND_REQUIRED_EFFORT` → pelto. Niitty on myös ainoa rakennuspaikka. |
| Pelto | Viljele | ruokaa `min(jäljellä, round(teho × FARMLAND_MODIFIER))`. Täyttyy joka kierroksen lopussa takaisin maksimiin (50). Tyhjänä ei toimintoa. |
| Metsä | Kaada metsää | puuta `min(jäljellä, teho)`. Kasvaa kierroksittain kertoimella `FOREST_REGROWTH` (katto `FOREST_MAX_RESOURCE`). Kun puu loppuu, metsästä tulee niitty. |
| Kallio | Perusta louhos | `workDone += teho`, kunnes `ROCK_REQUIRED_EFFORT` → louhos. |
| Louhos | Louhi kiveä | kiveä `round(teho × jäljellä/max × MINE_EFFICIENCY)`. Tuotto pienenee louhoksen ehtyessä, mutta se ei ehdy koskaan kokonaan. |
| Meri | Kalasta | ruokaa `round(teho / SEA_MODIFIER)`, rajattomasti mutta heikommin kuin pelto. (Bugi: toimintaympyrä näytti `teho × SEA_MODIFIER`.) |
| Lähde (1 kpl) | Mene uimaan | onnellisuutta `round(FOUNTAIN_HAPPINESS / käyttökerrat)`. Käyttökertoja per kierros `ceil(pelaajat / FOUNTAIN_MODIFIER)`, joten koko joukkueen saalis on vakio. |
| Koulu (rakennus) | Opiskele | henkilökohtainen edistyminen; taso n vaatii `2^(n-1) × SCHOOL_START_EFFORT`. Tasonnousu = **+1 toiminto per kierros pysyvästi**. Korkeamman tason koulu edistää nopeammin. |
| Työpaja (rakennus) | Tee työkaluja | sama kaava; tasonnousu = **teho + round(perusteho × `WORKSHOP_EFFICIENCY_BOOST`)** per taso. Ohjekirjan esimerkki: kaada metsää +60 → +100. |
| Vapaa-ajan rakennus (leirinuotio → teatteri → amfiteatteri) | Vietä aikaa | onnellisuutta kuten lähteessä, rajatut käyttökerrat per kierros. |
| Suoja (taso 1–3) | ei toimintoa | antaa suojapaikkoja. |

**Teho ja pelaajamäärä.** Perusteho on `round(COEFFICIENT / pelaajamäärä)`. Koko ryhmän tuotto
per kierros on siis vakio pelaajamäärästä riippumatta: 25 hengen luokassa jokainen klikkaus on
pieni, kolmen kaveruksen pelissä iso. Tämä on hyvä ominaisuus, ja se kannattaa säilyttää.

## 5. Resurssit ja kierroksen loppu

Kylällä on yhteiset **puu**, **kivi**, **ruoka** ja **onnellisuus** (= pistemäärä).
Pelaajakohtaisia ovat vain toimintojen määrä, kouluntaso ja työkalutaso. Pelissä ei ole
nälkämittareita, inventaariota eikä hahmoja.

Kierroksen vaihtuessa (`endOfRoundConsumption`):

1. **Ruoka:** kulutus on aina `FOOD_CONSUMPTION` = 100. Jos ruoka riittää, onnellisuus kasvaa
   `FOOD_GAIN_HAPPINESS`. Jos ei riitä, ruoka nollataan ja onnellisuus laskee
   `round(puuttuva / STARVE_PENALTY_DIVIDER)`.
2. **Suojat:** vaatimus `REQUIRED_SHELTER_BONUS` = 10 paikkaa. Onnellisuus muuttuu
   `suojapaikat − 10`: ilman suojia −10 joka kierros, ylimäärästä plussaa. Tavoite on kaksi
   tason 3 suojaa.
3. Metsät kasvavat, pellot täyttyvät, lähteen ja vapaa-ajan rakennusten käyttökerrat nollautuvat.
4. Jokaisen pelaajan toiminnot palautuvat.

## 6. Äänestys ja rakennukset

Neljä rakennusta, kullakin kolme tasoa:

| Rakennus | Tasot (grafiikka) | Ehto | Vaikutus |
|---|---|---|---|
| Suoja | A/B/C | aina saatavilla; useita voi rakentaa | suojapaikat (taso 3 = 5 paikkaa) |
| Koulu | A/B/C | vain yksi, päivitetään | +toimintoja (henkilökohtainen) |
| Vapaa-ajan rakennus (`arena`) | leirinuotio / teatteri / amfiteatteri | vaatii koulun | onnellisuutta käyttämällä |
| Työpaja | A/B/C | vaatii suojan | +tehoa (henkilökohtainen) |

- Äänestyksessä vaihtoehtoina ovat kaikkien rakennusten seuraavat tasot sekä "ei rakenneta"
  (`-1`, aina ensimmäisenä). Kortissa näkyvät hinta (puu/kivi), kuvaus ja rajoitteet: ei
  vapaata niittyä, ei tarpeeksi puuta tai ei tarpeeksi kiveä. Rajoitetuille ei voi äänestää.
- Äänen voi vaihtaa, ja prosentit päivittyvät kaikille reaaliajassa. Äänestämättä jättäneitä
  ei lasketa.
- Voittaja on suurin prosentti. Tasapelissä voittaa listassa ensimmäinen, joten tasapeli
  "ei rakenneta" -vaihtoehdon kanssa tarkoittaa ettei rakenneta.
- Hinta maksetaan ja rakennus sijoitetaan **automaattisesti ensimmäiselle vapaalle niitylle**
  (päivitys samaan ruutuun). Pelaajat eivät valitse paikkaa.
- Tunnettu hinta: Koulu taso 1 = 200 puuta. Muut hinnat ovat tuntemattomia (ks. §9).
- Palvelin luotti asiakkaaseen: rajoitettuun vaihtoehtoon äänestäminen estettiin vain
  käyttöliittymässä.

## 7. Käyttöliittymä

- Ruudut: lataus → kielen valinta (FI/EN/SV) → kuvitettu intro (3 kuvaa haaksirikosta) →
  päävalikko (Luo peli / Liity peliin) → aula (pelinumero, pelaajamäärä, Start) → peli →
  loppuruutu (kaksi vaihetta).
- HUD: ylhäällä puu, kivi, ruoka, vaihe (toiminta/äänestys), kuukausi ja hymiö sekä
  onnellisuusluku. Hymiöllä viisi tilaa rajoilla 200, 100, 50 ja 0. Keskellä ylhäällä
  vuorokausikello: viisari kiertää vaiheen ajan, kuun/auringon kiekko kääntyy vaiheen
  vaihtuessa. Vasemmalla alhaalla "toiminnot 3/3", oikealla alhaalla koulu- ja
  työkalutaso.
- Toiminnon jälkeen ruudun päältä nousee "+N" ja ikoni, ja kuuluu ääni. Kaikki näkevät
  toisten toiminnot ja kuulevat lähteen löytymisen.
- Kosketus: pinch-zoom ja inertiapanorointi. Työpöydällä ei zoomia.
- Ei nimiä, chattia eikä pelaajalistaa: pelaajat ovat anonyymejä, ja keskustelu käytiin
  luokassa ääneen. Tämä on pelin ydintä.
- Loppuruutu: kylän onnellisuus, arvosanataulukko (vähintään 6 tasoa), oma taso korostettuna.
  Kolme loppukuvaa: indeksi 0–1 = hyvä, 2–4 = neutraali, 5+ = huono.
- Grafiikka: maalattu isometrinen tyyli (TexturePacker-atlas, 162 framea), fontit Carter One
  ja Abel. Ääniä 25 (musiikki, ambienssi, toimintojen efektit, tikittävä äänestys).

## 8. Tekniikka

- Asiakas: KineticJS 4.7 (canvas), GSAP, jQuery, underscore; suunniteltu 1024 × 768 ja skaalattu.
- Palvelin: Node.js (`ServerModel.js` ja `Tile.js` jaettiin asiakkaan ja palvelimen kesken).
  Asiakas lähetti HTTP POSTin `/saarellaData`, ja palvelin lähetti tapahtumat **Pusher**-palvelun
  (maksullinen SaaS) kanavien `presence-saarella_<id>` ja `private-<guid>` kautta.
- Synkronointi: täysi tilannekuva alussa ja myöhässä liittyvälle, muuten deltoja (3 × 3
  ruutua toiminnon ympäriltä, koko kartta kierroksen vaihtuessa).
- Pelit olivat vain palvelimen muistissa. Lopputilastot tallennettiin tietokantaan
  (TOP-lista, turnaus: kunta → koulu → luokka).
- TeacherGaming Desk -SDK: oppilaan kirjautuminen luokkakoodilla ja analytiikkatapahtumat
  (`EndOfTurn`, `FinishedTheGame`). Uudessa versiossa tätä ei tarvita.

## 9. Mitä puuttuu: `gamedata.json`

Kaikki tasapainoluvut, tekstit (FI/EN/SV), rakennusten hinnat, tarinatekstit (15 kpl) ja
arvosanarajat olivat tiedostossa `nodejs/gamedata.json`. Sitä ei ole arkistoitu millään
domainilla tai vuodella, eikä lähdekoodia löydy julkisesti. Tiedossa olevat luvut:

| Vakio | Arvo | Lähde |
|---|---|---|
| `GAME_ROUNDS` | 15 | ohjekirja |
| `AVAILABLE_ACTIONS_PER_PLAYER` | 3 | ohjekirja, HUD |
| `FOOD_CONSUMPTION` | 100 | ohjekirja |
| `FARMLAND_MAX_RESOURCE` | 50 | ohjekirja |
| `REQUIRED_SHELTER_BONUS` | 10 | ohjekirja ("enintään 10 miinusta") |
| `SHELTER_LVL3_BONUS` | 5 | ohjekirja ("kaksi tason 3 suojaa") |
| Koulu taso 1 hinta | 200 puuta | ohjekirjan kuva |
| Kierroksen kesto | yhteensä ~100 s | 25 min / 15 |
| Työpajan vaikutus | 60 → 100 (FI 2017), 135 → 176 (TG EN) | ohjekirjojen kuvat; luvut eroavat, joten vakioita muutettiin versioiden välillä |
| Hymiörajat | 200 / 100 / 50 / 0 | `View.js` |

Loput (~45 vakiota) on rekonstruoitava ja viritettävä simuloimalla. Tekstit (alueiden kuvaukset
ja 10 vihjettä) löytyvät ohjekirjasta. Tarinatekstit, rakennusten kuvaukset ja arvosanojen
nimet kirjoitetaan uudelleen.

## 10. Havaitut bugit ja heikkoudet (ei kopioida)

- Luojan poistuminen tappoi pelin. Uudelleenyhdistämistä ei ollut, vain uusi liittyminen.
- Palvelin luotti asiakkaaseen äänestysrajoitteissa ja hinnoissa.
- Rakennus maksettiin, vaikka vapaata niittyä ei olisi löytynyt.
- Kalastuksen näytetty tuotto ei vastannut todellista.
- Pause-nappi oli poistettu käytöstä.
- Työpöydällä ei voinut zoomata. Asettelu oli kiinteä 1024 × 768.
- `Tile.js`:n suojien `happinessPenalty`- ja `foodConsumption`-koodi oli kuollutta.
