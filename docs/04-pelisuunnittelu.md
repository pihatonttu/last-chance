# Pelisuunnittelu (Last Chance: Arctic)

**Tila: v2 (2026-10-23).** Päätökset P25–P34 ja P40–P59 (`03-paatokset.md`) on viety tähän,
ja niiden numerot ovat suluissa. Napateema (aina talvi, nuotio, iglut ja jää, häviö):
`10-arktinen.md`. Kehystys ja omat merkit: `09-uudisasukkaat.md`. Vuodenajat (P43) ja
vanhat nimet (P44) on korvattu (P49, P54). V3:n tasapainotyön sääntömuutokset (sumu, kodit,
pyöristys, arvosanarajat) on merkitty **(V3)**; perustelut ovat dokumentissa `05-tasapaino.md`.

- Luvut ovat pelin **nykyiset oletusarvot** (`DEFAULT_PARAMS` tiedostossa
  `packages/rules/src/params.ts`). Ne on viritetty simulaattorilla, ja muutosten perustelut sekä
  suunnittelun alkuarvot ovat dokumentissa `05-tasapaino.md`. Jos luku tässä ja `params.ts` eroavat,
  `params.ts` on oikea.

Reunaehdot tulevat tiedostosta `03-paatokset.md` (P1–P59). Tärkeimmät: ydin (P7), isometriset
neliöt (P10), kartta skaalautuu (P8), 15–30 pelaajaa (P15), enintään 45 minuuttia ja
tapahtumaloki jälkipuintia varten (P8).

---

## 1. Tarina ja maasto

**(P48, P52)** Jäänmurtaja tuo luokan jäiselle arktiselle saarelle (Huippuvuorten tapaan), ja
vene soutaa heidät maihin. Luokka perustaa kylän ja pitää kylän nuotion palamassa: nuotio pitää
kaikki lämpimänä, jos luokka muistaa ruokkia sitä. Kaikki tehdään talkoilla. **15 kuukauden
päästä** (Lyhyessä pelissä 10) pidetään **revontulijuhla**, ja jäänmurtaja tuo vieraat. Tulos
kertoo, millaisen kylän vieraat näkevät.

- Jokainen kierros on yksi kuukausi. Kuukaudet ovat numeroita (yläpalkissa kalenterikuvake ja
  "3 / 15"), eikä vuodenaikoja ole: aina on talvi (P49). Pakkanen vaihtelee kuukaudesta toiseen (§9.1).
- Peli päättyy revontulijuhlaan. Loppuruudulla ovat revontulet ja jäänmurtaja ("Vieraat
  saapuivat revontulijuhlaan!").
- Jos kylä luovuttaa ennen juhlaa (§9.2), jäänmurtaja tulee ilman juhlaa.
- Loppuäänestystä ei ole (P31). Peli päättyy suoraan arvosanaan.

**Maasto (P48, P50, P51):**
- Saarella on lumisia havumetsiä, lumikenttiä ja jäätiköitä sekä kuuma lähde.
- Ruoka tulee kasvihuoneista ja pilkkimällä. Puu tulee lumimetsistä ja jää jäälouhoksesta.
- Rannalla on rantajäätä ja avantoja, ja kauempana on avomerta ja jäälauttoja.
- Eläimiä ei ole, eikä kukaan kuole tai sairastu. Nälkä ja palelu laskevat vain kylän mielialaa.

## 2. Mitoitusperiaate: kaikki lasketaan per kyläläinen (P25)

Tämä on pelin suurin rakenteellinen muutos alkuperäiseen.

**Alkuperäisessä** jokaisen pelaajan teho oli `vakio / pelaajamäärä`. Koko ryhmän tuotto oli
siksi sama pelaajamäärästä riippumatta. Haittana olivat oudot luvut: 25 hengen luokassa puun
kaataminen antoi +12, kaksinpelissä +150. Ruokaa tarvittiin aina 100, oli kylässä 3 tai 30
asukasta.

**Uudessa versiossa**
- Jokainen toiminto tuottaa **saman verran** pelaajamäärästä riippumatta: kaataminen antaa aina
  +10 puuta.
- Tarpeet ja hinnat lasketaan **per kyläläinen** ja kerrotaan pelaajamäärällä *N*:
  - jokainen syö 6 ruokaa kuukaudessa, joten 30 hengen kylä tarvitsee 180;
  - iglu (koti, taso 1) maksaa 4 jäätä kyläläistä kohden, joten 30 hengen kylässä 120 jäätä.
- Kartta kasvaa pelaajamäärän mukaan (P8).

**Miksi näin**
- Luvut ovat ymmärrettäviä ja samoja jokaisessa luokassa.
- Ne opettavat samalla: "Meitä on 24 ja jokainen syö 6, joten ruokaa tarvitaan 144. Varastossa on
  90. Montako kasvihuonetta pitää korjata?" Tämä on sopiva päässälaskutehtävä vanhemmille
  oppilaille (kohderyhmä 2.–6. luokka, P46), ja laskemalla oppilaat ehtivät keskustella.
- Pelin kulku pysyy samanlaisena 15 ja 30 pelaajan luokassa. Simulaattori tarkistaa tämän.

## 3. Oppitunnin kulku

| Vaihe | Kesto | Mitä tapahtuu |
|---|---|---|
| Aula | ~5 min | Opettaja luo pelin ja näyttää koodin ja QR:n. Oppilaat liittyvät ja kirjoittavat nimimerkin. |
| Opetus | 0–5 min | Opettaja kertoo tarinan ja tavoitteen (aulassa on näytettävä "Näin pelataan" -kortti). |
| Peli | ~15–25 min | *Normaali* 15 kierrosta tai *Lyhyt* 10 kierrosta, kukin enintään ~100 s. Kierros päättyy aiemmin, kun kaikki ovat valmiita. |
| Jälkipuinti | 10–15 min | Projektorilla pelin kulku, ja keskustelukysymykset luokalle. |

**Pelin pituus (P26):** opettaja valitsee pelin luodessaan *Normaalin* (15 kuukautta, ~25 min)
tai *Lyhyen* (10 kuukautta, ~15 min) pelin. Tarpeet ja hinnat ovat samat, ja vain arvosanarajat
skaalataan. Simulaattori virittää molemmat.

## 4. Kierros (kuukausi)

```
1. Toimintavuoro   60 s  (opettaja voi muuttaa: 45 / 60 / 90 s)
                         päättyy heti, kun jokainen paikalla oleva on käyttänyt toimintonsa
2. Äänestys        30 s  päättyy, kun kaikki paikalla olevat ovat äänestäneet (+3 s varmistus)
3. Kuukauden vaihde ~8 s yhteenveto: mitä rakennettiin, ruoka, lämpö, kodit ja mieliala
```

- Täysi kierros kestää ~100 s, ja 15 kierrosta enintään ~25 min. Käytännössä vähemmän, koska
  vaiheet päättyvät aiemmin.
- Opettaja voi milloin tahansa **tauottaa**, **lisätä 30 s** käynnissä olevaan vaiheeseen tai
  **lopettaa pelin**. Keskeytetty peli saa jälkipuinnin siihen mennessä tapahtuneesta.
- "Paikalla oleva" on pelaaja, jonka yhteys on auki. Katkenneen yhteyden pelaajaa ei odoteta,
  mutta hänet lasketaan silti kyläläiseksi (§11).

## 5. Kartta

### 5.1 Koko ja muoto

- Maaruutuja on **`12 + 2N`**: 2 pelaajalla 16, 15 pelaajalla 42, 30 pelaajalla 72 ja 40
  pelaajalla 92. Ympärillä on 1–2 ruudun levyinen merirengas. Rannan vieressä meri on
  rantajäätä, jossa on avantoja, ja kauempana on avomerta, jossa on jäälauttoja (P48).
- Saaren muoto kasvatetaan satunnaisesti keskeltä ulospäin ja pyöristetään. Pohjana on
  vaakasuuntainen ellipsi (noin 1,6 : 1), joka sopii vaakanäytölle. Muoto määräytyy pelin
  **siemenestä**, joten sama siemen tuottaa saman saaren (testaus, uusintapelit).

### 5.2 Aluetyypit alussa

| Alue (sisäinen tunniste) | Osuus maaruuduista | Huom. |
|---|---|---|
| Lumimetsä (`forest`) | ~50 % | puuta, kaadettuna lumikenttää |
| Lumikenttä (`meadow`) | ~30 % | kasvihuoneeksi tai rakennuspaikaksi |
| Jäätikkö (`rock`) | ~20 % | jäälouhokseksi, ei kahden ruudun säteellä rantautumispaikasta |
| Kuuma lähde (`spring`) | 1 kpl | saaren kaukaisimmassa kolmanneksessa (P54) |
| Meri | rengas | rantajäällä voi pilkkiä |

**Rantautumispaikka** on etelärannalla oleva lumikenttä, jolla vene on rannassa ja **kylän
nuotio palaa** (P55). Siihen ei rakenneta, eikä siitä tehdä kasvihuonetta. Sen naapureissa on
vähintään yksi lumikenttä, yksi lumimetsä ja kaksi meriruutua, jotta ensimmäinen kierros ei
jumitu.

### 5.3 Sumu ja tutkiminen

- Alussa näkyvät rantautumispaikka ja sen 8 naapuria. Muu saari on sumun peitossa.
- **(V3) Sumu peittää vain maan:** meri näkyy aina, joten saaren ääriviivat näkyvät alusta
  asti mutta sisältö ei. Ennen muutosta noin 2/3 tutkimisesta meni avomereen.
- Sumuruutua voi tutkia, jos jokin sen **8 naapurista on tutkittua maata** (V3: ei pelkkä
  näkyvä meri).
- Tutkimiseen tarvittava työ on `1 + ⌊d / 2⌋`. *d* on etäisyys rantautumispaikasta ruutuina
  (Chebyshev), joten kaukana tutkiminen on raskaampaa. Yksi toiminto antaa yhden työyksikön
  kerrottuna työkalukertoimella.
- Usean pelaajan työ samaan ruutuun lasketaan yhteen.

## 6. Resurssit

Kaikki resurssit ovat **koko kylän yhteisiä** (ydin a).

| Resurssi | Mistä | Mihin |
|---|---|---|
| Puu | lumimetsän kaataminen | kylän nuotio (joka kuukausi, §9.1) ja rakennukset |
| Jää | jäälouhos | iglut ja paremmat rakennukset (tasot 2–3) |
| Ruoka | kasvihuone, pilkkiminen | jokainen syö 6 joka kuukausi |
| Onnellisuus | kuukauden mieliala (§9) | pisteet, arvosana ja häviöraja (§9.2) |

**Ruokavarasto (P27):** varastoon mahtuu enintään kahden kuukauden tarve (`2 × 6N = 12N`), ja
ylimenevä osa pilaantuu kuukauden vaihteessa, kun kylä on syönyt (§9). Pilaantunut määrä näkyy
yhteenvedossa ("Varasto oli täynnä: 14 ruokaa pilaantui."). Puulla ja jäällä ei ole ylärajaa.

## 7. Toiminnot

Jokaisella on alussa **3 toimintoa kuukaudessa** (ydin c). Ruutua napautetaan, sivupaneeli
kertoo alueen tilan ja mitä toiminto tuottaa, ja nappi käyttää yhden toiminnon. Tuotot ovat
työkalutasolla 1. Työkalukerroin on kuvattu kohdassa §8.

| Alue | Toiminto | Vaikutus |
|---|---|---|
| Sumu | **Tutki** | +1 työ (× työkalut); paljastuu, kun työ ≥ `1 + ⌊d/2⌋` |
| Lumikenttä | **Rakenna kasvihuone** | +1 työ (× työkalut); 3 työtä → kasvihuone |
| Kasvihuone | **Korjaa sato** | +10 ruokaa (× työkalut), enintään kasvihuoneen jäljellä oleva sato. Kasvihuone kasvaa joka kuukausi täyteen 30 ruokaan. Tyhjästä kasvihuoneesta ei saa mitään. |
| Rantajää | **Pilki** | +4 ruokaa (× työkalut), rajaton mutta selvästi vähemmän kuin kasvihuoneesta (+10). (V3) Vain rantajää, jonka vieressä on tutkittua maata. |
| Lumimetsä | **Kaada puita** | +10 puuta (× työkalut), enintään metsän puumäärä (täysi metsä 40). Metsä kasvaa kuukaudessa ×1,25 kohti täyttä. Tyhjästä metsästä tulee lumikenttä. |
| Jäätikkö | **Perusta jäälouhos** | +1 työ (× työkalut); 2 työtä → jäälouhos |
| Jäälouhos | **Louhi jäätä** | jäätä `12 × jäljellä/120` (× työkalut), vähintään 2. Louhoksessa on 120 jäätä, joten uusi louhos tuottaa hyvin ja vanha huonosti. |
| Kuuma lähde | **Ui** | +1 virkistyskerta (§9). Käyttökertoja on `N/4` kuukaudessa, pyöristettynä lähimpään kokonaislukuun ja vähintään 1. |
| Kylätalo | **Vietä aikaa yhdessä** | +1 virkistyskerta (§9). Käyttökertoja on tason mukaan `N/3`, `N/2` tai `N` kuukaudessa, pyöristettynä lähimpään kokonaislukuun ja vähintään 1. |
| Koulu | **Opiskele** | oma koulutus (§8) |
| Paja | **Tee työkaluja** | omat työkalut (§8) |
| Koti (iglu) | ei toimintoa | tarjoaa kotipaikkoja (§9) |
| Kylän nuotio | ei toimintoa | rantautumisruutu; napautus näyttää pakkasen, ennusteen ja puuntarpeen (§9.1) |

Tuotot pyöristetään kokonaisluvuiksi. Paneelissa näytetään aina tarkka tuotto ennen napautusta,
esim. "Kaada puita +13".

Taulukon luvut ovat `params.ts`:n oletusarvot (`harvestYield`, `fishYield`, `chopYield`,
`mineYield`, `quarryCapacity`, `plowWork`, `quarryWork`, `springDivisor`, `gatheringDivisors`).
Suunnittelun alkuarvot ja viritysten perustelut ovat dokumentissa `05-tasapaino.md`.

## 8. Oma kehitys: koulu ja paja

Ydin (c) on jännite: käytänkö toiminnon nyt yhteiseen hyvään, vai sijoitanko itseeni, jolloin
autan myöhemmin enemmän? Etu on aina **henkilökohtainen**.

| | Koulutus | Työkalut |
|---|---|---|
| Taso alussa | 1 | 1 |
| Tasolla *k* saa | `2 + k` toimintoa kuukaudessa | tuottokerroin `1 + 0,25 × (k − 1)` |
| Enimmäistaso | 3 (5 toimintoa) | 3 (×1,5) |
| Seuraavaan tasoon tarvitaan | `4 × k` edistystä | `4 × k` edistystä |
| Edistystä per toiminto | rakennuksen taso (1 / 2 / 3) | rakennuksen taso (1 / 2 / 3) |

Esimerkki: tason 1 koulussa neljä opiskelutoimintoa nostaa koulutuksen tasolle 2, mikä antaa
+1 toiminnon jokaiseen jäljellä olevaan kuukauteen. Kannattaa aikaisin, ei enää lopussa. Juuri
tällaisesta oppilaat voivat keskustella.

## 9. Kuukauden vaihde ja onnellisuus

Kuukauden lopussa tapahtuu järjestyksessä:

1. **Äänestys:** voittaneen vaihtoehdon hinta maksetaan (§10.2).
2. **Ruoka:** kylä syö `6 × N`.
   - Jos ruoka riittää, kaikki ovat ravittuja.
   - Jos ei, varasto tyhjenee ja `nälkäiset = ⌈puuttuva / 6⌉` henkeä.
   - **Pilaantuminen (P27):** syömisen jälkeen ruoka, joka ylittää varaston ylärajan `12N`,
     pilaantuu.
3. **Nuotio (P55):** kylän nuotio polttaa puuta pakkasen mukaan (§9.1).
   - Jos puuta riittää, kaikki ovat lämpimiä.
   - Jos ei, varasto tyhjenee ja `palelevat = ⌈puuttuva / puuta per kyläläinen⌉` henkeä.
4. **Kodit (V3):** koti kattaa tasonsa mukaan (pieni iglu, iglu, iso iglu) **1/6, 1/3 tai
   1/2 kylästä**, ja osuudet lasketaan yhteen. Ilman kotia on `round(N × (1 − osuus))` henkeä,
   kuitenkin vähintään yksi, jos osuus on alle 1. Osuuksina laskettuna 15 ja 30 hengen kylä
   saa samasta tilanteesta saman mielialan.
5. **Mieliala** lasketaan kokonaislukuna. Arvot ovat nykyiset oletusarvot:

   | Osa | Ehto | Vaikutus |
   |---|---|---|
   | Ruoka | kaikki ravittuja | +2 |
   | Ruoka | osa nälässä | −round(10 × nälkäiset / N), vähintään −1 |
   | Lämpö | nuotio sai kaiken puun | +2 |
   | Lämpö | puu ei riittänyt | −round(6 × palelevat / N), vähintään −1 |
   | Koti | kaikilla koti | +2 |
   | Koti | osuus ≥ 1,25 | +1 lisää |
   | Koti | osa ilman | −round(10 × (1 − osuus)), vähintään −1 |
   | Virkistys | kuukauden virkistyskerrat yhteensä | +round(10 × kerrat / N) |

   (V3) Pyöristykset ovat symmetrisiä (`round`). Alkuperäinen `ceil`/`floor` rankaisi isoa
   kylää joka kuukausi.

   Kuukauden mieliala on noin −25…+15. **Onnellisuus** (pisteet) on kaikkien kuukausien
   mielialojen summa.
6. **Luonto:** metsät kasvavat, kasvihuoneet kasvavat täyteen, ja kuuman lähteen ja kylätalon
   käyttökerrat nollautuvat. Mikään ei pidä taukoa talven vuoksi (P49).
7. **Häviö (P56):** jos onnellisuus on nyt alle häviörajan, kylä luovuttaa (§9.2).
8. Jokaisen toiminnot palautuvat.

Pisteitä ei jaeta per pelaaja. Kylä onnistuu tai epäonnistuu yhdessä (ydin a).

### 9.1 Pakkanen ja nuotio (P49, P55)

Vuodenaikoja ei ole: aina on talvi (P49). Kylmyyttä mittaa pakkanen, joka vaihtelee kuukaudesta
toiseen, ja vastapainona palaa kylän yksi nuotio.

**Pakkanen**
- Jokaisella kuukaudella on lämpötila −10°, −15°, −20°, −25°, −30° tai −35°. Se arvotaan pelin
  siemenestä, joten sama siemen antaa saman talven.
- Ensimmäinen kuukausi on leuto (−10° tai −15°), jotta kylä ehtii aloittaa. Pelissä on aina
  vähintään kaksi kovaa pakkaskuukautta (−30° tai kylmempi).
- **Ensi kuun ennuste näkyy koko ajan** (yläpalkissa ja nuotion ikkunassa), joten kovaan
  pakkaseen ehtii varautua. Kun ennuste on −30° tai kylmempi, tapahtumanauha varoittaa: "Ensi
  kuussa kova pakkanen: −35°!".

**Kylän nuotio**
- Nuotio palaa rantautumisruudussa ja pitää koko kylän lämpimänä. Se on kiinteä: sitä ei
  paranneta, eikä sillä ole toimintoa.
- Nuotio polttaa kuun lopussa puuta per kyläläinen pakkasen mukaan. Esimerkkinä 30 hengen kylä:

  | Pakkanen | Puuta per kyläläinen | 30 hengen kylässä |
  |---|---|---|
  | −10° … −15° (leuto) | 2 | 60 |
  | −20° … −25° (kylmä) | 4 | 120 |
  | −30° … −35° (kova pakkanen) | 10 | 300 |

  Luvut ovat nykyiset oletusarvot (`heatWoodPerVillager` tiedostossa `params.ts`, perustelut
  `05-tasapaino.md`). Suunnittelun alkuarvot olivat 1 / 2 / 3 (`10-arktinen.md` §4).
- Kova pakkanen on jyrkkä: 10 puuta kyläläistä kohden on noin yksi kaato jokaiselta. Siksi
  ennuste kannattaa lukea ja varautua edellisenä kuukautena.
- Jos puuta riittää, kaikki ovat lämpimiä (mieliala +2). Jos ei, nuotio polttaa kaiken
  varastossa olevan puun, ja ne, joiden osuuteen puuta ei riittänyt, palelevat (mieliala
  −round(6 × palelevat / N), vähintään −1). Palelu laskee vain mielialaa kuten nälkä: kukaan ei
  kuole eikä sairastu.
- Kodit (iglut) eivät tarvitse lämmitystä. Vain yhteinen nuotio lämmittää.
- Aloituspuu (3 per kyläläinen) riittää ensimmäisen kuun nuotioon (leuto 2) ja vähän yli.
- Tapahtumanauha ilmoittaa kuun alussa, jos puu ei riitä tämän kuun nuotiolle: "Puu ei riitä
  nuotiolle: puuttuu N". Äänestyskortin varoitus on kohdassa §10.2.

### 9.2 Häviö (P56)

Peli voi päättyä ennen revontulijuhlaa: jos kylä jätetään kylmään ja nälkään, se luovuttaa.
Häviö tekee pakkasesta ja nuotiosta oikean uhan.

- **Sääntö:** jos onnellisuus (kuukausien mielialojen summa) on kuukauden vaihteen jälkeen alle
  **häviörajan**, kylä luovuttaa. Kuukauden yhteenveto näytetään, ja sen jälkeen peli päättyy.
  Raja on **−52** Normaalissa ja **−45** Lyhyessä pelissä (`lossThreshold` tiedostossa
  `params.ts`).
- **Aina käytössä:** opettajalla ei ole valintaa.
- **Varoitus:** yläpalkissa häviöraja näkyy onnellisuusluvun alla ("raja −52"). Kun onnellisuus
  on alle rajan + 20, tapahtumanauha ja kuukauden yhteenveto varoittavat: "Kylä on luovuttamassa!
  Pitäkää nuotio ja ruoka kunnossa."
- **Loppu:** jäänmurtaja tulee ilman juhlaa. Teksti on "Kylä ei jaksanut." ja "Jäänmurtaja haki
  kaikki kotiin. Kokeilkaa uudelleen!" Tähtiä ja tasonimeä ei näytetä. Omat merkit ja
  jälkipuinti näkyvät kuten muulloinkin.
- **Jälkipuinti:** ensimmäinen keskustelukysymys on "Kylä luovutti kuukautena {month}. Mikä meni
  pieleen, ja milloin sen olisi voinut huomata?"
- **Vain laiminlyönti häviää** (simulaattori, 15–40 pelaajaa): yhteistyö ja sekoitus eivät
  häviä, satunnainen häviää noin 33–50 %:ssa peleistä ja laiska sekä vain taidot 98–100 %:ssa
  (`05-tasapaino.md`).
- **Tekniikka:** häviö on oma tuloksensa. `GameResult` saa kentän `lost`, ja lokin
  `game-ended`-tapahtuma kertoo syyn. Jälkipuinnin vastaava kenttä on valinnainen, joten vanhat
  tallennetut jälkipuinnit toimivat ennallaan. Sääntömoottori lopettaa pelin kuukauden vaihteen
  jälkeen, ja palvelin päättää pelin kuten opettajan lopetuksessa.

## 10. Rakennukset ja äänestys

### 10.1 Rakennukset

Hinnat ovat **per kyläläinen**, ja ne kerrotaan *N*:llä ja pyöristetään ylöspäin viiteen.
Suluissa on esimerkkinä 30 hengen luokan hinta.

| Rakennus | Taso 1 | Taso 2 | Taso 3 | Ehto |
|---|---|---|---|---|
| **Koti** (pieni iglu → iglu → iso iglu) | 4 jäätä (120) | 6 jäätä (180) | 6 jäätä + 3 puuta (180 jäätä + 90 puuta) | Saatavilla heti. Koteja voi rakentaa useita. Tavoite on kaksi tason 3 kotia. Iglut eivät tarvitse lämmitystä. |
| **Koulu** (ulkoluokka → koulu → iso koulu) | 6 puuta (180) | 8 puuta + 2 jäätä (240 + 60) | 8 puuta + 6 jäätä (240 + 180) | Vain yksi, joka päivitetään. Avautuu ensimmäisen kodin jälkeen. |
| **Paja** (työpenkki → paja → iso paja) | 6 puuta (180) | 6 puuta + 4 jäätä (180 + 120) | 8 puuta + 8 jäätä (240 + 240) | Vain yksi. Avautuu ensimmäisen kodin jälkeen. |
| **Kylätalo** (laavu → kylätalo → lumilinna) | 4 puuta (120) | 8 puuta + 2 jäätä (240 + 60) | 8 puuta + 8 jäätä (240 + 240) | Vain yksi. Avautuu ensimmäisen kodin jälkeen. Laavussa ei ole nuotiota. |

Iglujen hinnat ovat P53:n mukaiset. Koulun, pajan ja kylätalon hinnat ovat ennallaan, ja jää
tarkoittaa entistä kiveä. Hinnat ovat tiedostossa `params.ts` (`costs`).

**Esiehdot (P30): koti ensin.** Alussa voi äänestää vain kodista (pieni iglu) tai olla
rakentamatta. Kun ensimmäinen koti on valmis, koulu, paja ja kylätalo avautuvat kerralla.
Aloitusvarat (6 ruokaa, 3 puuta ja 9 jäätä per kyläläinen; puu ja jää pyöristetään hintojen
tapaan ylöspäin viiden kerrannaiseksi) riittävät kahteen ensimmäiseen
pieneen igluun ja ensimmäisen kuun nuotioon.

Nimet ovat P54:n mukaiset. Sisäiset tunnisteet (`shelter`, `school`, `workshop`, `gathering`)
pysyvät.

### 10.2 Äänestys

- Vaihtoehtoina ovat jokaisen rakennuksen **seuraava taso** ja uusi tason 1 koti. Lisäksi aina
  on mukana **"Ei rakenneta tässä kuussa"**.
- Kortissa näkyvät hinta, vaikutus ja syy, jos vaihtoehtoa ei voi valita: puu ei riitä, jää
  ei riitä tai vapaata lumikenttää ei ole. Sellaiseen ei voi äänestää, ja palvelin tarkistaa sen.
- **Nuotion varoitus (P55):** jos vaihtoehdon puuhinta on suurempi kuin `puu − tämän kuun
  nuotion tarve`, kortissa lukee punaisella "Nuotiolle ei jää puuta". Äänestää saa silti, ja
  palvelin hyväksyy äänen. Vaihtoehto, joka ei maksa puuta, ei varoita koskaan.
- Äänen voi vaihtaa vaiheen aikana. Jakauma päivittyy kaikille ja projektorille reaaliajassa.
  Kuka äänesti mitä, näkyy vain opettajalle jälkipuinnissa.
- Eniten ääniä saanut vaihtoehto voittaa. Äänestämättä jättäneitä ei lasketa.
- **Tasapeli (P28):** jos kärjessä on tasapeli, **mitään ei rakenneta eikä veloiteta**, ja
  projektori näyttää viestin "Tasapeli! Neuvotelkaa ja yrittäkää ensi kuussa uudelleen".
  Tasapelit näkyvät jälkipuinnissa.
- Voittajan hinta maksetaan äänestyksen päättyessä, ja rakennus valmistuu kuukauden vaihteessa.
- Kuukaudessa voi rakentaa enintään yhden rakennuksen.

### 10.3 Sijoitus (P29)

- Uusi rakennus sijoitetaan automaattisesti **lähimmälle vapaalle lumikentälle
  rantautumispaikasta**, joten kylä kasvaa nuotion ympärille. Itse rantautumisruutuun, jossa
  nuotio palaa, ei rakenneta. Tasapelissä ratkaisee ensin rivi, sitten sarake, jotta sijoitus
  on deterministinen.
- Päivitys rakennetaan samaan ruutuun.
- Pelaajat vaikuttavat sijoitukseen sillä, mitkä lumikentät he jättävät ilman kasvihuonetta.
  Erillistä sijoitusvaihetta ei ole, koska se pidentäisi kierrosta.

## 11. Liittyminen, poistuminen ja poissaolevat

- *N* = pelaajat, jotka ovat liittyneet eikä opettaja ole poistanut. Katkenneen yhteyden pelaaja
  on edelleen kyläläinen: hän syö, tarvitsee kodin ja lasketaan mukaan nuotion puuntarpeeseen.
  Pelissä, kuten luokassakin, poissaolevasta pidetään huolta.
- *N* lasketaan **kuukauden alussa**. Kesken kuukauden liittyvä pelaa heti, mutta tarpeisiin ja
  hintoihin hänet lasketaan vasta seuraavasta kuukaudesta.
- **Myöhäinen liittyminen (P33):** uusi pelaaja voi liittyä kuukausien 1–3 aikana. Kuukauden 4
  alusta liittyminen sulkeutuu automaattisesti, myös Lyhyessä pelissä. Liittymiskoodi näyttää
  silloin viestin "Peli on jo käynnissä, liittyminen on suljettu". **Paluu omaan peliin (P23)
  toimii koko pelin ajan.**
- Paluu samaan peliin palauttaa koulutuksen, työkalut ja kuukauden käyttämättömät toiminnot.

## 12. Pisteet ja loppu

- Lopputulos on **onnellisuus**, eli kuukausien mielialojen summa.
- Arvosanatasoja on kuusi (P32). Ne kuvaavat **kylän tilaa eivätkä ryhmän luonnetta**, ja alin
  taso kertoo silti, että kaikki selvisivät:

  | Taso | Nimi |
  |---|---|
  | 6 | Unelmien kylä |
  | 5 | Kukoistava kylä |
  | 4 | Toimiva kylä |
  | 3 | Kasvava kylä |
  | 2 | Sinnittelevä leiri |
  | 1 | Leiri rannalla |

  Nimet ovat P45:n mukaiset (korvaavat P32:n nimet).

  Rajat asetetaan simulaattorilla. Tavoitteena on, että hyvin yhteistyötä tekevä botti saa tason
  5–6 ja satunnainen botti tason 2–3, jos se selviää. Vain taitoja kehittävä botti (`skillsOnly`)
  ja laiska botti häviävät lähes aina (§9.2), joten niille ei anneta tasoa.
- Rajat asetetaan erikseen Normaalille ja Lyhyelle pelille (P26). **(V3)** Rajat ovat
  pituuskohtaiset eivätkä skaalattuja, koska kotien rakentaminen vie lyhyessäkin pelissä
  yhtä monta kuukautta. Viritetyt tasojen 2–6 alarajat ovat Normaalissa −51 / −30 / 20 / 55 / 90
  ja Lyhyessä −44 / −25 / 0 / 18 / 40 (`gradeThresholds` tiedostossa `params.ts`, perustelut
  `05-tasapaino.md`). Taso 1 (Leiri rannalla) tarkoittaa, että kylä selvisi vain juuri ja juuri:
  onnellisuus pysyi täsmälleen häviörajalla (−52 Normaalissa, −45 Lyhyessä).
- **Revontulijuhla (P52):** loppuruudulla näkyvät revontulet ja jäänmurtaja ("Vieraat saapuivat
  revontulijuhlaan!"), arvosana tähtinä ja nimenä sekä siirtymä jälkipuintiin.
- **Kun kylä luovutti (P56):** jäänmurtaja tulee ilman juhlaa ("Kylä ei jaksanut."), eikä tähtiä
  tai tasonimeä näytetä.
- **Omat merkit (P42):** oppilaan omalla laitteella näkyy 1–3 merkkiä sen mukaan, mitä hän teki
  (`docs/09-uudisasukkaat.md` §2.3). Projektori ei näytä niitä, eikä niitä tallenneta. Merkkien
  tekstit on sovitettu napateemaan: Kalastaja ("Pilkit kylälle kalaa."), Puutarhuri ("Hoidit
  kasvihuoneita."), Jäänhakkaaja ("Hankit jäätä kylälle.") ja Metsuri ("Kaadoit puita nuotioon
  ja rakennuksiin."). Merkit näkyvät myös, kun kylä luovutti.

## 13. Tapahtumaloki ja jälkipuinti

### 13.1 Mitä kirjataan

Sääntömoottori kirjaa jokaisesta tapahtumasta kuukauden, vaiheen, ajan, pelaajatunnisteen,
tyypin ja tiedot. Tyypit:

- **Liittymiset:** liittyminen, paluu, yhteyden katkeaminen, nimen vaihto, poisto.
- **Toiminnot:** jokainen toiminto (alue, ruutu, tuotto).
- **Tilamuutokset:** alue paljastui, kuuma lähde löytyi, kasvihuone valmistui, jäälouhos
  valmistui, metsä loppui (kaadettiin lumikentäksi), tasonnousu.
- **Äänestykset:** äänet ja niiden muutokset, tulos, tasapeli.
- **Kuukauden vaihde:** ruoka, nälkäiset, pakkanen, nuotion puu ja palelevat, kodittomat,
  mieliala, käyttämättä jääneet toiminnot.
- **Opettajan toimet:** tauko, jatko, lisäaika, lopetus.
- **Pelin päättyminen:** onnellisuus, arvosana, onko kyseessä opettajan lopetus ja luovuttiko
  kylä (`lost`, P56).

Lokiin tallennetaan vain pelaajatunniste, ei nimimerkkiä. Nimet yhdistetään tunnisteisiin
**vain muistissa** nimellistä jälkipuintia varten (P23).

### 13.2 Jälkipuinnin sisältö

1. **Kylän tarina kuukausittain:** kaavio, jossa näkyvät ruoka ja ruoan tarve, kotipaikat ja
   *N*, mieliala ja onnellisuus. Jokaisesta kuukaudesta näkyy lisäksi lämpö: kuukauden pakkanen
   ja se, riittikö nuotion puu (✓ / ✗). Rakennukset merkitään aikajanalle.
2. **Kriisihetket:** esim. "Kuukausi 6: ruoka loppui, 9 jäi nälkään. Korjaantui kuukaudessa 8."
   Kriisejä on kolmea lajia: ruoka loppui, kodit eivät riittäneet ja nuotion puut loppuivat
   (`cold`), esim. "Kuukausi 8: nuotion puut loppuivat, 12 paleli."
3. **Mihin toiminnot käytettiin:** ruoka, rakennusaineet, tutkiminen, oma kehitys, virkistys ja
   käyttämättä jääneet. Koko kylän osalta kuukausittain, ja nimellisessä versiossa myös
   pelaajittain.
4. **Äänestykset:** voittajan osuus, tasapelit, osallistumisprosentti ja kuukaudet, joina ei
   rakennettu mitään. Nimellisessä versiossa myös kuka äänesti mitä.
5. **Yhteistyön merkit:** äänestysaktiivisuus, käyttämättä jääneet toiminnot, kuinka nopeasti
   kriiseihin reagoitiin, ja kuinka moni teki muutakin kuin omaa kehitystään.
6. **Keskustelukysymykset:** 3–5 kysymystä, jotka valitaan pelin kulun perusteella. Esimerkkejä:

   | Laukaisin | Kysymys |
   |---|---|
   | kylä luovutti | "Kylä luovutti kuukautena 9. Mikä meni pieleen, ja milloin sen olisi voinut huomata?" (aina ensimmäinen) |
   | ruoka loppui | "Kuukautena 6 ruoka loppui. Kuka huomasi sen ensin? Mitä silloin tehtiin?" |
   | nuotion puut loppuivat | "Kuukautena 8 oli −30° ja nuotion puut loppuivat: 12 paleli. Kuka muisti nuotion?" |
   | tasapeli tai monta tyhjää kuukautta | "Miten päätitte, mitä rakennetaan? Kuuntelitteko kaikkia?" |
   | paljon omaa kehitystä | "Moni opiskeli paljon. Kannattiko se kylälle? Milloin se kannattaa?" |
   | kuuma lähde löytyi myöhään tai ei koskaan | "Olisiko saaren tutkimiseen kannattanut käyttää enemmän aikaa?" |
   | korkea arvosana | "Mikä teidän yhteistyössänne toimi? Mitä tekisitte eri tavalla?" |
   | kukaan ei palellut koko pelissä (yleiskysymys) | "Nuotio paloi koko pelin. Miten jaoitte puun keräämisen?" |
   | aina | "Mitä opitte siitä, miten ryhmä tekee päätöksiä?" |

## 14. Pelilliset näkymät

Tarkka käyttöliittymä suunnitellaan vaiheessa V6, ja napateeman näkymät on kuvattu kohdassa
`10-arktinen.md` §6. Pelin kannalta olennaista on tämä:

**Oppilas**
- **Saarikartta:** panorointi ja zoomaus, napautus avaa ruudun ponnahdusikkunan. Toimintoympyrää
  ei ole, koska se peittää kartan tabletilla. Rantautumisruudun napautus näyttää **kylän
  nuotion** tilan (pakkanen, ennuste, puuntarve ja varastossa oleva puu) ilman toimintonappia.
- **Yläpalkki (P55, P56):** kuvakkeet ja luvut, sanat vain ruudunlukijalle ja vihjeenä (P38).
  - Vasemmalla: puu muodossa "120/60" (varasto / nuotion tarve tässä kuussa, punaisena, jos
    puu ei riitä), jää, ruoka (varasto/tarve) ja kodit (kotipaikat / *N*).
  - Keskellä: kello, joka näyttää vaiheen ja ajan.
  - Oikealla: lämpömittari, esim. "−25°", ja sen alla pieni ennuste "→ −35°"; kalenterikuvake ja
    kuukausi muodossa "3 / 15"; sekä onnellisuus häviörajoineen ("raja −52"). Onnellisuus on
    punaisena, kun se on lähellä rajaa.
  - Projektorilla lisäksi "Juhlaan N kuukautta".
- **Oma tila:** energiaa jäljellä (esim. 2 / 4), koulutus- ja työkalutaso sekä edistyminen.
- **Äänestys:** kortit, jakauma ja oma valinta. Jos vaihtoehto veisi nuotion puun, kortissa on
  punainen varoitus "Nuotiolle ei jää puuta" (§10.2).
- **Kuukauden yhteenveto:** viisi kuvaruutua: mitä rakennettiin, ruoka, **lämpö** ("Kaikilla oli
  lämmin" tai esim. "4 paleli"), kodit ja mieliala. Tiedot pakkasesta ja poltetusta puusta ovat
  avattavissa.
- **Ei nimiä pelin aikana (P34):** toisten toiminnot näkyvät kartalla pelkkinä tekoina
  ("+10 puuta"), myös projektorilla. Tekijät käsitellään jälkipuinnissa opettajan johdolla.

**Projektori**
- Koko saari ja kaikki yhteiset luvut isolla, myös lämpömittari ja häviöraja.
- Ajastin ja vaihe sekä äänestysjakauma.
- Tapahtumanauha, esim. "Kylä löysi kuuman lähteen!", "Ensi kuussa kova pakkanen: −35°!",
  "Puu ei riitä nuotiolle: puuttuu 40.", "Ruoka ei riitä: puuttuu 12." ja "Kylä on
  luovuttamassa! Pitäkää nuotio ja ruoka kunnossa."
- Kuukauden vaihteen yhteenveto. Viimeisen kuukauden yhteenvedossa lukee "Revontulijuhla alkaa
  pian!"
- Opettajan napit: tauko, +30 s, lopeta, piilota nimet ja moderointi.

## 15. Botit

Botit ovat samoja kolmessa käytössä: simulaattorissa (V3), palvelintestissä (V4) ja opettajan
kokeilutilassa (P19).

| Strategia | Käyttäytyminen | Käyttö |
|---|---|---|
| **Yhteistyö** | Tarpeet ensin (ruoka, nuotion puu ja kodit): kaataa heti ruoan jälkeen tämän kuun ja ennusteen mukaisen ensi kuun nuotiopuun eikä raivaa metsiä loppuun rakennusten puuta varten. Hankkii rakennusaineet (puu ja jää) äänestystavoitteen mukaan, tutkii, opiskelee aikaisin ja äänestää suunnitelman mukaan. Äänestys ohittaa vaihtoehdot, jotka jättäisivät nuotion kylmäksi. Toiminnot valitaan vähän satunnaisesti. | tasapainon yläraja, kokeilutila |
| **Satunnainen** | Satunnainen sallittu toiminto ja satunnainen ääni. | tasapainon alaraja |
| **Vain taidot** (`skillsOnly`) | Vain koulu ja paja, kun ne ovat olemassa. Muuten satunnainen. | ydin c:n tarkistus |
| **Laiska** | Käyttää vain osan toiminnoistaan ja äänestää harvoin. | poissaolojen vaikutus |
| **Sekoitus** | Luokka, jossa on esim. 60 % yhteistyö-, 25 % satunnais- ja 15 % laiskoja botteja. | arvosanarajojen asetus |

**Simulaattorin hyväksymisehdot:**
- Tasot erottuvat toisistaan kuten §12:ssa kuvataan.
- Arvosanajakauma on 2, 15 ja 30 pelaajan peleissä samansuuntainen.
- Kukaan ei jumitu: rakennettavaa ja tekemistä on jokaisessa kuukaudessa.
- Koti, ruoka ja nuotio ovat painetta alkupuolella eivätkä ratkea itsestään.
- Palelu: yhteistyö palelee enintään 20 %:ssa peleistä, sekoitus joskus ja satunnainen usein
  (yli 50 %).
- Häviö (§9.2): yhteistyö ei koskaan, sekoitus alle 5 %:ssa peleistä, satunnainen noin 30–50 %:ssa
  sekä laiska ja vain taidot yli 80 %:ssa.
- Tulokset ovat dokumentissa `05-tasapaino.md`.

**Tiedossa oleva riski (päässälasku 2026-10-09, N = 30):** 90 toimintoa kuukaudessa voisi tuottaa
900 puuta, kun rakennus maksaa ~180. Puu voi siis olla liian helppoa, ellei toimintoja kulu
muualle. Koko pelin kysyntä (~2000 toimintoa: ruoka ~225, rakennusaineet ~500, tutkiminen ~200,
oma kehitys jopa ~1000) ylittää tarjonnan (~1350), joten niukkuutta on, mutta jakauma pitää
tarkistaa simulaattorilla. Luvut ovat suunnitteluvaiheen päässälaskua; simulaattorin
tulokset ovat dokumentissa `05-tasapaino.md`.

## 16. Parametrit (oletusarvot)

Nämä ovat pelin nykyiset oletusarvot (`DEFAULT_PARAMS` tiedostossa
`packages/rules/src/params.ts`). Suluissa on suunnittelun alkuarvo, jos se poikkeaa; alkuarvot on
jäädytetty sääntötesteihin (`packages/rules/test/params.ts`), ja muutosten syyt ovat
dokumentissa `05-tasapaino.md`.

| Parametri | Arvo | Kohta |
|---|---|---|
| kierroksia | Normaali 15, Lyhyt 10 | §3 |
| toimintavuoro / äänestys / vaihde | 60 s / 30 s / 8 s | §4 |
| maaruutuja | 12 + 2N | §5 |
| lumimetsä / lumikenttä / jäätikkö | 50 / 30 / 20 % | §5 |
| tutkimistyö | 1 + ⌊d/2⌋ | §5 |
| aloitustoiminnot | 3 | §7 |
| ruoan tarve | 6 / hlö / kk (alkuarvo 4) | §9 |
| kasvihuoneen sato | 30 / kk, +10 / toiminto | §7 |
| pilkkiminen | +4 / toiminto (alkuarvo 5) | §7 |
| metsä | 40 puuta, kasvu ×1,25 / kk, +10 / toiminto | §7 |
| jäälouhos | 120 jäätä, `12 × jäljellä/120`, väh. 2 (alkuarvot 60 ja `8 × jäljellä/60`) | §7 |
| kasvihuoneen rakennus / jäälouhoksen perustus | 3 / 2 työtä (alkuarvo 3 / 4) | §7 |
| koulutus / työkalut | +1 toiminto / +25 % per taso, max 3, tarve 4k (alkuarvot max 4, tarve 3k) | §8 |
| kotipaikat per iglu | 1/6, 1/3 ja 1/2 kylästä | §9 |
| virkistyskerrat | kuuma lähde N/4, kylätalo N/3 / N/2 / N, pyöristettynä, väh. 1 (alkuarvot N/6 ja N/5 / N/4 / N/3) | §7 |
| pakkanen | −10° … −35° viiden asteen askelin | §9.1 |
| nuotion puu per kyläläinen | leuto 2, kylmä 4, kova pakkanen 10 (alkuarvot 1 / 2 / 3) | §9.1 |
| lämmön mieliala | +2 / −round(6 × palelevat / N) (alkuarvo 10) | §9 |
| iglujen hinta per kyläläinen | 4 jäätä / 6 jäätä / 6 jäätä + 3 puuta | §10.1 |
| häviöraja | −52 Normaali, −45 Lyhyt, varoitus rajan + 20 (alkuarvo −60) | §9.2 |
| aloitusvarat | ruokaa 6N (yksi kuukausi), puuta 3N (nuotio), jäätä 9N (kaksi pientä iglua) (alkuarvot 4N, 2N ja 4N) | — |
| ruokavaraston yläraja | 12N (kaksi kuukautta, alkuarvo 8N) | §6 |
| liittyminen sulkeutuu | kuukauden 4 alussa | §11 |

## 17. Grillauksen tulos

Kaikki kymmenen kohtaa on lukittu 2026-10-09 (P25–P34). Niiden luvut ovat päätöksen hetken
alkuarvoja (esimerkiksi varaston yläraja 8N, kun jokainen söi 4); nykyiset arvot ovat kohdassa §16.

1. Mitoitus per kyläläinen: **kyllä** (P25)
2. Pelin pituus: **Normaali 15 tai Lyhyt 10** (P26)
3. Ruoka: **varaston yläraja 8N** (P27)
4. Tasapeli: **ei rakenneta** (P28)
5. Sijoitus: **automaattinen, lähin vapaa niitty** (P29)
6. Esiehdot: **suoja ensin**, sitten kaikki muut (P30)
7. Loppuäänestys: **ei** (P31)
8. Arvosanat: **kuusi kylää kuvaavaa tasoa** (P32)
9. Myöhäinen liittyminen: **kuukaudet 1–3** (P33)
10. Nimet kartalla: **ei** (P34)

Seuraavaksi luvut tarkistetaan simulaattorilla (V3). Jos simulaattori osoittaa, että jokin
lukittu sääntö ei toimi, siitä keskustellaan uudelleen eikä sitä muuteta hiljaa.
