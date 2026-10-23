# Tasapaino (V3 ja napa)

**Tila: viritetty 2026-10-09, vuodenajat 2026-10-13, napa 2026-10-23.** Viritetyt arvot ovat
tiedostossa `packages/rules/src/params.ts` (`DEFAULT_PARAMS`). Pelisuunnitteludokumentin §16 ja
napasuunnitelman (`docs/10-arktinen.md`) alkuarvot on jäädytetty sääntötesteihin
(`packages/rules/test/params.ts`).

Täysi simulaatioraportti: [`sim/2026-10-23-arctic.md`](sim/2026-10-23-arctic.md) (napa).
Edelliset: [`sim/2026-10-13-seasons.md`](sim/2026-10-13-seasons.md) (vuodenajat) ja
[`sim/2026-10-09-defaults.md`](sim/2026-10-09-defaults.md).

## Menetelmä

- Botit (`packages/bots`) pelaavat kokonaisia pelejä. Simulaattori (`packages/sim`) mittaa
  arvosanajakauman, kriisit (nälkä, palelu eli `cold`, häviö eli `lost`), toimintojen jakauman
  ja käyttämättä jääneet toiminnot.
- Strategiat:
  - **yhteistyö:** tarpeet ensin ja kiinteä rakennusjärjestys, 10 % kohinaa;
  - **sekoitus:** 60 % yhteistyö, 25 % satunnainen, 15 % laiska;
  - **satunnainen;**
  - **vain taidot (`skillsOnly`, ent. "itsekäs"):** vain koulu ja työpaja;
  - **laiska:** yksi toiminto kuukaudessa.
- Ajo: `node packages/sim/src/cli.ts --seeds 40 --villagers 2,15,30,40 --short`. Kokeiluarvot
  ilman koodimuutosta: `--params tiedosto.json` (osittainen, yhdistetään oletuksiin).

## Napa (2026-10-23, `docs/10-arktinen.md`)

Napateemassa nuotio polttaa joka kuu puuta pakkasen mukaan, iglut maksavat jäätä ja kylä voi
luovuttaa (häviö, §4b). Vuodenaikoja ei enää ole. Kaikki luvut viritettiin uudelleen.

**Luvut olettavat metsänhoidon.** Nuotion puuntarve on viritetty yhteistyöbotilla, joka hoitaa
metsiään (kohta Bottien muutokset): se kaataa ensin täysimmän metsän eikä raivaa metsää loppuun
rakennusten puun vuoksi (rakennustilan vuoksi se raivaa yhä ohuimman metsän, ks. Bottien
muutokset). Luokka, joka ei hoida metsiään, palelee enemmän. Ilman metsänhoitoa
yhteistyöbotti raivasi 30 hengen kylässä noin 31 metsää 35:stä ja paleli 65–68 %:ssa peleistä
jo pienemmällä puuntarpeella (2 / 3 / 4).

### Hyväksymisehdot ja tulos (N = 15–40, molemmat pituudet, 40 peliä per rivi)

Arvosanat lasketaan peleistä, joita ei hävitty: hävityssä pelissä ei näytetä tähtiä eikä
tasonimeä (§4b), joten simulaattorin arvosanajakauma jättää ne pois (ne näkyvät sarakkeessa
`lost`).

| Ehto | Raja | Tulos Normaali | Tulos Lyhyt |
|---|---|---|---|
| Arvosana: yhteistyö | 5–6 vähintään 80 %:ssa | 5–6: 95–100 % (6: 90–93 %) | 5–6 kaikissa (6: 93–100 %) |
| Arvosana: sekoitus | enimmäkseen 5 (4–6) | 5: 70–80 %, 4–6: 95–100 % | 5: 58–80 %, 4–6: 95–98 % |
| Arvosana: satunnainen | 2–3 | 2–3: 96–100 % (1: 0–1 peli) | 2–3: 90–96 % (1: 1–2 peliä) |
| Arvosana: vain taidot | 1–2 | ei arvosanaa: 98–100 % hävitään (N = 40: ainoa selvinnyt peli sai 3) | sama |
| Palelu: yhteistyö | enintään 20 % | 3 / 10 / 15 % | 0 / 0 / 3 % |
| Palelu: sekoitus | yli 0 % | 10 / 25 / 33 % | 3 / 5 / 13 % |
| Palelu: satunnainen | yli 50 % | 73 / 98 / 100 % | 60 / 93 / 100 % |
| Häviö: yhteistyö | 0 % | 0 % | 0 % |
| Häviö: sekoitus | alle 5 % | 0 % | 0 % |
| Häviö: satunnainen | 30–50 % | 33 / 45 / 35 % | 38 / 50 / 43 % |
| Häviö: laiska | yli 80 % | 100 % | 100 % |
| Häviö: vain taidot | yli 80 % | 100 / 100 / 98 % | 100 / 100 / 98 % |
| Mediaanit 15 vs 30 | ero alle 15 % | yhteistyö 102 / 99, sekoitus 80 / 82 | yhteistyö 52 / 51, sekoitus 34 / 32 |

Prosentit ovat järjestyksessä N = 15 / 30 / 40. Tarkistusajo 120 siemenellä täyttää samat
ehdot: satunnaisen häviö 40 / 46 / 39 % (Normaali) ja 39 / 49 / 49 % (Lyhyt), sekoituksen
palelu 2–31 %, yhteistyön palelu 0–13 %, vain taitojen ja laiskan häviö 98–100 %.

Arvosana 1 ("Leiri rannalla") on nyt mahdollinen. Arvosanan 2 raja on yhden pisteen
häviörajan yläpuolella, joten arvosanan 1 saa kylä, joka selvisi juuri ja juuri. Simulaatiossa
näin käy satunnaiselle luokalle 0–2 kertaa 40 pelistä. Kauempana oleva raja (esim. −40 / −35)
antaisi arvosanan 1 jopa puolelle selvinneistä satunnaisista peleistä (ehto 2–3 ei täyttyisi),
koska satunnainen luokka on usein juuri häviörajan yläpuolella.

Häviön ajankohta (N = 30): satunnainen luovuttaa kuukausina 9–15 (Lyhyt 8–10), vain taidot
kuukausina 4–9 ja laiska yleensä kuukautena 5.

### Lukuarvot (ennen → nyt)

| Parametri | Ennen | Nyt | Miksi |
|---|---|---|---|
| nuotion puu / hlö: leuto / kylmä / kova pakkanen | 1 / 2 / 3 | **2 / 4 / 10** | Satunnainen paleli vain 10–55 %:ssa peleistä ja sekoitus ei koskaan. Kova pakkanen vaatii nyt edellisen kuun varautumista, eikä sekoituksen 60 % yhteistyöpelaajista aina ehdi. |
| aloituspuu / hlö | 2 | **3** | Kattaa ensimmäisen kuun nuotion (2) ja vähän yli (§5). Testi `packages/rules/test/defaults.test.ts` pitää vähintään puolen puun marginaalin kyläläistä kohden. |
| palelun mielialavaikutus | −10 × palelevat / N | **−6 × palelevat / N** | Yksi häviöraja osuu nyt satunnaisen jakaumaan kaikilla kyläkoilla. Isot kylät palelevat useammin (vähemmän metsää per kyläläinen). |
| aloitusjää / hlö | 4 | **9** | Kaksi ensimmäistä iglua ja vähän yli. 15 hengen kylä ei enää jää jälkeen 30 hengen kylästä, kun jäälouhoksen etsiminen ja perustaminen vievät siltä suuremman osan kuukaudesta (lyhyen pelin sekoitus 20 / 26 → 34 / 32). |
| louhoksen jäämäärä | 60 | **120** | Kartalla oli jäätä 27–32 *N*, ja yhteistyö olisi käyttänyt noin 48 *N*. Nyt kartalla on 54–64 *N*, ja yhteistyö louhii siitä 71–75 %. |
| louhinnan tuotto (täysi louhos) | 8 | **12** | Jäätä toiminnolta suunnilleen kuten puuta (10). |
| louhoksen perustaminen (työ) | 4 | **2** | Pienen kylän kiinteä kustannus. |
| arvosanarajat Normaali (2–6) | −100 / −30 / 20 / 58 / 70 | **−51 / −30 / 20 / 55 / 90** | Lämpö tuo +2 joka kuu, joten yhteistyön onnellisuus nousi noin 75:stä 100:aan. Arvosanan 2 raja häviörajan yläpuolelle, jotta arvosana 1 on mahdollinen. |
| arvosanarajat Lyhyt (2–6) | −70 / −25 / 10 / 23 / 31 | **−44 / −25 / 0 / 18 / 40** | Sama. |
| häviöraja Normaali / Lyhyt | −60 / −60 | **−52 / −45** | Satunnaisen häviö 30–50 %. Lyhyt peli tarvitsee oman rajan. |

Ennallaan: iglujen hinnat (4 / 6 / 6 + 3 puuta), lämmön mieliala +2, varoitusraja
(häviöraja + 20), pakkasen asteikko, ruoka, metsät ja kartta. Louhoksen jäämäärää ei tarvinnut
sitoa kyläläisten määrään (`quarryCapacityPerVillager`), koska kiinteä 120 antaa kaikille
kyläkoille riittävästi.

### Pakkasen arvonta

Pelkkä satunnaiskävely ehti kovaan pakkaseen vain noin neljänneksessä peleistä. Vanha korjaus
muutti siksi 73–86 %:ssa peleistä kylmimmän kuukauden kuukaudesta 3 alkaen suoraan −35°:een,
yleensä kuukausina 3–5 ja suoraan −10°:n tai −15°:n jälkeen. Nyt puuttuva kova kuukausi arvotaan
pelin jälkimmäisen puoliskon kylmimmistä kuukausista, se saa −30°, ja ympäröivät kuukaudet
kylmenevät niin, että pakkanen muuttuu kuukaudesta 2 alkaen enintään 5° kuussa. Ensimmäinen
kuukausi on edelleen leuto. Alle 8 kuukauden pelissä kylmä voi ulottua kuukauteen 2 ja pudottaa
sen jyrkemmin (3–5 kuukautta: enintään 15°, 6–7 kuukautta: 10°). Pelin pituudet 10 ja 15 eivät
tätä tee. Tuloksena on pakkasjakso pelin loppupuolella, jota ennuste näyttää kuukausi kerrallaan.
Nuotion puuntarve on keskimäärin 1,7–1,8 (ennen 1,6) taulukon yksikköä kuussa.

### Bottien muutokset

- **Puu nuotiolle (`woodTarget`):** tämän kuun tarve ja ennusteen mukainen ensi kuun tarve
  (viimeisenä kuuna vain tämän kuun). Yhteistyöbotti kaataa sen heti ruoan jälkeen.
- **Äänestys** ohittaa vaihtoehdot, jotka jättäisivät nuotion kylmäksi (`leavesFireCold`), kun
  jokin muu avoin vaihtoehto on tarjolla. Myös kohinan satunnaisäänet ohittavat ne.
- **Rakennusten puu tulee nuotion puun päälle** (tämä ja ensi kuu). Muuten botti käytti ensi
  kuun nuotiopuun rakennukseen ja paleli viimeisenä kuuna.
- **Metsänhoito:** botti kaataa ensin täysimmän metsän. Ennen se kaatoi lähimmät metsät ohuiksi
  (alle 10 puuta), joissa metsä tuskin kasvaa, ja raivasi lopulta kaiken: 30 hengen kylä
  raivasi noin 31 metsää 35:stä, suurimman osan kuukausina 12–15, ja paleli viimeisinä
  kuukausina. Rakennuksiin otetaan puuta vain metsistä, joihin jää vähintään puolet puista.
  Puun vuoksi metsän saa raivata loppuun vain nuotiota varten. Tilan vuoksi botti raivaa yhä
  ohuimman metsän, kun uudelle rakennukselle ei ole niittyä eikä tutkittavaa (rakentamisen
  vaihe 3, ennallaan). Nyt 30 hengen kylässä 30 metsää 35:stä ja 40 hengen kylässä 36 metsää
  45:stä on pystyssä pelin lopussa.
- Talvivarautuminen (`foodTarget`) poistui. Ruokaa kerätään tämän kuun tarpeeseen.
- Botti ei enää varaa rantautumisruutua seuraavalle rakennukselle. Rantautumisruutu on nuotio,
  eikä sille rakenneta.

### Simulaattorin muutokset

- Mittarit `coldMonths`, `coldTotal` ja `lost`; yhteenvedossa `coldMonths`, `coldRate` ja
  `lostRate`; raportissa sarakkeet `cold months`, `cold` ja `lost`.
- Arvosanajakauma ja keskiarvo lasketaan peleistä, joita ei hävitty.
- `--short` ajaa lyhyen pelin kaikille viidelle luokalle, myös laiskalle ja vain taidoille.

## Tavoitteet ja tulos V3 (Normaali peli, 15–40 pelaajaa, 40 peliä per rivi)

| Tavoite | Tulos |
|---|---|
| Yhteistyö saa arvosanan 5–6 vähintään 80 %:ssa peleistä | 5–6 kaikissa; 6: 73–95 % |
| Sekoitus asettuu yhteistyön ja satunnaisen väliin | enimmäkseen 5, vaihteluväli 4–6 |
| Satunnainen 2–3 | 2, joskus 3 |
| Vain taidot 1–2 | 1 |
| 15 ja 30 pelaajan mediaanit eroavat alle 15 % | yhteistyö 75 / 72, sekoitus 67 / 66 |
| Yhteistyön toiminnot: ruoka 25–40 %, aineet 20–30 %, taidot 10–25 %, tutkiminen 5–15 %, virkistys 5–15 % | 25 / 28–30 / 24 / 14–15 / 8 % |
| Koulutus ei maksimoidu kaikilla | keskimäärin 2,6–2,7 / 3 |
| Lyhyt peli: samansuuntainen jakauma | yhteistyö 5–6, sekoitus 4–6, satunnainen 2 |

## Mitä muutettiin V3:ssa

### Sääntömuutokset (päätöksen P25 hengessä, lukitut päätökset ennallaan)

1. **Suojat ovat kylän osuuksia** (taso 1 = 1/6, taso 2 = 1/3, taso 3 = 1/2 kylästä).
   Mielialatermeissä on symmetrinen pyöristys (`round`). Vanha `ceil`/`floor` rankaisi 30
   hengen kylää noin yhdellä pisteellä joka kuukausi ja vaati siltä yhden ylimääräisen suojan.
   Suojattomia on aina vähintään yksi henkilö, jos osuus on alle 1.
2. **Sumu peittää vain maan.** Saaren ääriviivat näkyvät alusta asti. Tutkiminen etenee
   vain tunnetulta maalta, ja kalastaa voi vain tutkitun rannan vieressä. Ennen tätä noin 2/3
   kaikesta tutkimisesta meni sumun alla olevaan avomereen.
3. **Arvosanarajat ovat pelin pituuskohtaiset.** Lyhyessä pelissä suojia rakennetaan yhtä
   monta kuukautta, joten lineaarinen skaalaus olisi rangaissut lyhyttä peliä.
4. Uudet kyselyt käyttöliittymää varten: `foodNeed()`, `foodStorage()`, `shelterShare()` ja
   `shelterCapacity()`.

### Lukuarvot (alkuarvo → viritetty)

| Parametri | Alku | Viritetty | Miksi |
|---|---|---|---|
| ruoan tarve / hlö / kk | 4 | **6** | ruoka ei ollut kenellekään painetta |
| aloitusruoka / hlö | 4 | **6** | pysyy "yksi kuukausi" |
| kalastus / toiminto | 5 | **4** | pellon pitää olla selvästi parempi |
| taitojen enimmäistaso | 4 | **3** | koulutus × työkalut kasvatti tuotannon 3,5-kertaiseksi; kaikki maksimoivat |
| taitoon tarvittava edistys | 3 × taso | **4 × taso** | sama syy |
| lähteen käyttökerrat | N/6 | **N/4** | ylijäämätoiminnot kylän viihtyvyydeksi |
| kokoontumispaikan käyttökerrat | N/5, N/4, N/3 | **N/3, N/2, N** | sama |
| arvosanarajat (Normaali) | −60 / 0 / 40 / 80 / 110 | **−100 / −30 / 20 / 64 / 70** | simulaattorin jakaumista |
| arvosanarajat (Lyhyt) | skaalaus 10/15 | **−70 / −25 / 10 / 28 / 31** | oma jakauma |

Rakennusten hinnat, satojen ja metsien luvut sekä kartan koko ovat ennallaan.

### Bottien parannukset

Simulaattori on vain niin hyvä kuin sen botit. Yhteistyöbotti oli aluksi huonompi kuin
sekoitus, joten näitä korjattiin:

- se jumittui opiskelemaan, kun puuta tarvittiin eikä metsää ollut näkyvissä (nyt se tutkii);
- se säästää myös seuraavan kuun rakennukseen eikä kalasta pilaantuvaa ruokaa;
- se ei kaada metsää loppuun, jos toisen metsän voi löytää (alkuperäisen pelin opetus);
- liukulukuvirhe: 6 × 1/6 < 1 aiheutti ylimääräisen suojan;
- rakennusjärjestys "kaikki suojaan ensin" voitti koulun tai nuotion ensin.

## Vuodenajat (2026-10-13, `docs/09-uudisasukkaat.md`) – korvattu

**Korvattu 2026-10-23:** napateemassa ei ole vuodenaikoja eikä talvea (`docs/10-arktinen.md` §1).
Talvivarautuminen (`foodTarget`) ja talvinälkämittari poistettiin. Niiden tilalle tulivat
nuotion puu (`woodTarget`) sekä mittarit `cold` ja `lost` (osio Napa). Tämä osio on
historiaa.

Peli alkaa huhtikuussa, ja joulu–helmikuussa satoa ei voi korjata eivätkä metsät kasva
(kuukaudet 9–11 Normaalissa ja 9–10 Lyhyessä pelissä). Ruokavaraston katto pysyy kahdessa
kuukaudessa, joten Normaalin pelin kolmen kuukauden talvi vaatii syksyllä täyden varaston ja
talvella pilkkimistä.

- **Yhteistyöbotti varautuu talveen:** loka- ja marraskuussa se kerää varastoon tämän kuun
  aterian ja kaiken, mikä säilyy kuun vaihteen yli; talvella se haluaa jäljellä olevien
  talvikuukausien tarpeen (`foodTarget` tiedostossa `packages/bots/src/cooperative.ts`).
- **Talvi maksaa sekoitusluokalle noin 5–7 onnellisuuspistettä** (Normaali N = 15: mediaani
  67 → 60), koska varastointiin menee toimintoja virkistyksestä ja taidoista. Nälkää talvi
  tuottaa vain heikoille luokille: satunnainen 0–3 % peleistä, vain taidot 80–88 %, laiska 100 %.
  Yhteistyö ja sekoitus eivät näe talvella nälkää.
- **Arvosanarajat viritettiin uudelleen** niin, että sekoitus on taas enimmäkseen tasolla 5:

  | Peli | Ennen (2–6) | Nyt (2–6) |
  |---|---|---|
  | Normaali | −100 / −30 / 20 / 64 / 70 | −100 / −30 / 20 / **58** / 70 |
  | Lyhyt | −70 / −25 / 10 / 28 / 31 | −70 / −25 / 10 / **23** / 31 |

- Tulokset (N = 15–40): yhteistyö 5–6 kaikissa peleissä, sekoitus enimmäkseen 5 (4–6),
  satunnainen 2–3, vain taidot 1–2. Talvinälkä: yhteistyö 0 %, sekoitus 0 %.

## Tunnetut rajoitukset ja jatkoseuranta

- **Ruoka on painetta vain heikoille luokille.** Yhteistyö ja sekoitus eivät näe nälkää.
  Napateemassa painetta tuovat nuotio ja jää. Oikeat luokat ovat todennäköisesti huonommin
  koordinoituja kuin botit. Seurataan pelitesteissä.
- **Sekoitus palelee lähinnä pitkässä isossa pelissä.** Normaalissa pelissä N = 30–40 palelee
  25–33 % peleistä, lyhyessä pelissä ja 15 hengen kylässä 3–13 % (1–5 peliä 40:stä). Botit
  näkevät ennusteen täydellisesti, ja sekoituksen yhteistyöpelaajat kaatavat aina ensin
  nuotiopuun. Oikea luokka palelee todennäköisesti useammin.
- **Nuotion luvut olettavat metsänhoidon** (osio Napa). Luokka, joka kaataa aina lähimmän
  metsän tai raivaa metsiä rakennuksiin, palelee pelin loppupuolella selvästi useammin.
- **Kyläkoko vaikuttaa heikkoon luokkaan.** Kartalla on kiinteä pohja (12 ruutua), joten
  pienellä saarella on enemmän metsää ja jäätä kyläläistä kohden. Satunnainen 15 hengen kylä
  palelee ja häviää harvemmin kuin 30–40 hengen kylä (Normaali: palelu 73 % vs 98–100 %,
  häviö 33 % vs 35–45 %). Yksi häviöraja on kompromissi; 120 siemenellä häviö on
  40 / 46 / 39 %.
- **Kova pakkanen on jyrkkä.** Kovassa pakkasessa nuotio tarvitsee 10 puuta kyläläistä kohden
  (alkuarvo 3), eli noin yhden kaadon jokaiselta. Ennuste varoittaa kuukautta ennen.
- **Aineiden osuus on suuri.** Yhteistyön toiminnoista 38–42 % on puuta ja jäätä (V3:ssa
  23–30 %), koska nuotio vie puuta joka kuu ja iglut vievät jäätä. Taitoihin menee 12–14 % ja
  virkistykseen 7–8 %.
- **Jäätä riittää.** Yhteistyö louhii 71–75 % kartan jäästä. Jos isoja kyliä halutaan
  väljemmiksi, louhoksen jäämäärä voidaan sitoa kyläläisten määrään P25:n hengessä.
- **Heikot luokat luovuttavat aikaisin.** Laiska luovuttaa yleensä kuukautena 5 ja vain taidot
  kuukausina 4–9. Ehto (yli 80 %) täyttyy, mutta luokka näkee häviön jo pelin alkupuolella.
- **Arvosana 1 on harvinainen.** Sen saa vain kylä, joka päättää pelin yhden pisteen sisällä
  häviörajasta (osio Napa).
- **Työkaluja ei juuri tehdä** (yhteistyöbotti taso 1,0): botti opiskelee koulutuksen ensin
  täyteen, ja työpajan hyöty jää pieneksi. Selvitetään, onko vika botissa vai työpajan
  arvossa.
- **Suojien rakentaminen määrää alkupelin rytmin.** Kuukausina 1–5 jokainen kylä on osin
  ilman suojaa, koska kuussa rakennetaan yksi rakennus. Tämä on tarkoituksellista (ydin b),
  mutta tekee alusta raskaan.
- **2 pelaajan peli** toimii, mutta hajonta on suuri (yhteistyö 3–6, satunnainen häviää
  75–88 %:ssa, sekoitus 8–10 %:ssa). Viritys koskee 15–40 pelaajaa (P15).
- Arvosanarajat ja häviörajat perustuvat botteihin. Ne tarkistetaan ensimmäisten oikeiden
  luokkapelien jälkeen.
