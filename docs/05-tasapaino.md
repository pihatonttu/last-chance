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

### Hyväksymisehdot ja tulos (N = 15–40, molemmat pituudet, 40 peliä per rivi)

| Ehto | Raja | Tulos Normaali | Tulos Lyhyt |
|---|---|---|---|
| Arvosana: yhteistyö | 5–6 vähintään 80 %:ssa | 5–6 kaikissa (6: 90–95 %) | 5–6 kaikissa (6: 88–100 %) |
| Arvosana: sekoitus | enimmäkseen 5 (4–6) | 5: 70–75 %, 4–6: 95–100 % | 5: 68–85 %, 4–6: 98–100 % |
| Arvosana: satunnainen | 2–3 | 2–3 kaikissa | 2–3 kaikissa |
| Arvosana: vain taidot | 1–2 | 2 (N = 40: yksi peli 40:stä sai 3) | – (ei lyhyttä ajoa) |
| Palelu: yhteistyö | enintään 20 % | 0–8 % | 0 % |
| Palelu: sekoitus | yli 0 % | 5–25 % | 3–5 % |
| Palelu: satunnainen | yli 50 % | 70–100 % | 57–95 % |
| Häviö: yhteistyö | 0 % | 0 % | 0 % |
| Häviö: sekoitus | alle 5 % | 0 % | 0 % |
| Häviö: satunnainen | 30–50 % | 35 / 50 / 38 % | 40 / 48 / 35 % |
| Häviö: laiska ja vain taidot | yli 80 % | 98–100 % | – |
| Mediaanit 15 vs 30 | ero alle 15 % | yhteistyö 100 / 98, sekoitus 76 / 82 | yhteistyö 49 / 46, sekoitus 30 / 31 |

Häviöprosentit ovat järjestyksessä N = 15 / 30 / 40. Tarkistusajo 120 siemenellä täyttää kaikki
ehdot: satunnaisen häviö 44 / 50 / 44 % (Normaali) ja 38 / 48 / 45 % (Lyhyt), sekoituksen
palelu 2–28 %, yhteistyön palelu 0–6 %.

Häviön ajankohta (N = 30): satunnainen luovuttaa kuukausina 8–14 (Lyhyt 7–10), vain taidot
kuukausina 4–11 ja laiska yleensä kuukautena 5.

### Lukuarvot (ennen → nyt)

| Parametri | Ennen | Nyt | Miksi |
|---|---|---|---|
| nuotion puu / hlö: leuto / kylmä / kova pakkanen | 1 / 2 / 3 | **2 / 4 / 8** | Satunnainen paleli vain 10–55 %:ssa peleistä ja sekoitus ei koskaan. Kova pakkanen vaatii nyt edellisen kuun varautumista, ja sekoituksen 60 % yhteistyöpelaajista ei aina ehdi. |
| palelun mielialavaikutus | −10 × palelevat / N | **−6 × palelevat / N** | Yksi häviöraja osuu nyt satunnaisen jakaumaan kaikilla kyläkoilla. Isot kylät palelevat useammin (vähemmän metsää per kyläläinen). |
| aloitusjää / hlö | 4 | **8** | Kaksi ensimmäistä iglua. 15 hengen kylä ei enää jää jälkeen 30 hengen kylästä, kun jäälouhoksen etsiminen ja perustaminen vievät siltä suuremman osan kuukaudesta (lyhyen pelin sekoitus 20 / 26 → 30 / 31). |
| louhoksen jäämäärä | 60 | **120** | Kartalla oli jäätä 27–32 *N*, ja yhteistyö olisi käyttänyt noin 48 *N*. Nyt kartalla on 54–64 *N*, ja yhteistyö käyttää 52–55 *N* (N = 40: 96 % kartan jäästä). |
| louhinnan tuotto (täysi louhos) | 8 | **12** | Jäätä toiminnolta suunnilleen kuten puuta (10). |
| louhoksen perustaminen (työ) | 4 | **2** | Pienen kylän kiinteä kustannus. |
| arvosanarajat Normaali (2–6) | −100 / −30 / 20 / 58 / 70 | **−100 / −30 / 20 / 55 / 90** | Lämpö tuo +2 joka kuu, joten yhteistyön onnellisuus nousi noin 75:stä 100:aan. |
| arvosanarajat Lyhyt (2–6) | −70 / −25 / 10 / 23 / 31 | **−70 / −25 / 0 / 18 / 40** | Sama. |
| häviöraja Normaali / Lyhyt | −60 / −60 | **−51 / −45** | Satunnaisen häviö 30–50 %. Lyhyt peli tarvitsee oman rajan. |

Ennallaan: iglujen hinnat (4 / 6 / 6 + 3 puuta), aloituspuu 2, lämmön mieliala +2, varoitusraja
(häviöraja + 20), pakkasen asteikko, ruoka, metsät ja kartta. Louhoksen jäämäärää ei tarvinnut
sitoa kyläläisten määrään (`quarryCapacityPerVillager`), koska kiinteä 120 antaa kaikille
kyläkoille riittävästi.

### Pakkasen arvonta

Pelkkä satunnaiskävely ehti kovaan pakkaseen vain noin neljänneksessä peleistä. Vanha korjaus
muutti siksi 73–86 %:ssa peleistä kylmimmän kuukauden kuukaudesta 3 alkaen suoraan −35°:een,
yleensä kuukausina 3–5 ja suoraan −10°:n tai −15°:n jälkeen. Nyt puuttuva kova kuukausi arvotaan
pelin jälkimmäisen puoliskon kylmimmistä kuukausista, se saa −30°, ja ympäröivät kuukaudet
kylmenevät niin, että pakkanen muuttuu enintään 5° kuussa. Tuloksena on pakkasjakso pelin
loppupuolella, jota ennuste näyttää kuukausi kerrallaan. Ensimmäinen kuukausi on edelleen leuto.
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
  raivasi noin 31 metsää 35:stä, suurimman osan kuukausina 12–15, ja paleli viimeisinä kuukausina.
  Rakennuksiin otetaan puuta vain metsistä, joihin jää vähintään puolet puista, ja metsän saa
  raivata loppuun vain nuotiota varten. Nyt 30 hengen kylässä 32 metsää 35:stä on pystyssä
  pelin lopussa.
- Talvivarautuminen (`foodTarget`) poistui. Ruokaa kerätään tämän kuun tarpeeseen.
- Botti ei enää varaa rantautumisruutua seuraavalle rakennukselle. Rantautumisruutu on nuotio,
  eikä sille rakenneta.

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
  18–25 % peleistä, lyhyessä pelissä ja 15 hengen kylässä vain 3–5 % (1–2 peliä 40:stä).
  Botit näkevät ennusteen täydellisesti, ja sekoituksen yhteistyöpelaajat kaatavat aina
  ensin nuotiopuun. Oikea luokka palelee todennäköisesti useammin.
- **Kyläkoko vaikuttaa heikkoon luokkaan.** Kartalla on kiinteä pohja (12 ruutua), joten
  pienellä saarella on enemmän metsää ja jäätä kyläläistä kohden. Satunnainen 15 hengen kylä
  palelee ja häviää harvemmin kuin 30–40 hengen kylä (Normaali: palelu 70 % vs 93–100 %,
  häviö 35 % vs 38–50 %). Yksi häviöraja on kompromissi; 120 siemenellä häviö on
  44 / 50 / 44 %.
- **Aineiden osuus on suuri.** Yhteistyön toiminnoista 38–42 % on puuta ja jäätä (V3:ssa
  23–30 %), koska nuotio vie puuta joka kuu ja iglut vievät jäätä. Taitoihin menee 13–14 % ja
  virkistykseen 7–8 %.
- **Jää loppuu isossa kylässä melkein kokonaan.** Yhteistyö käyttää 40 hengen kylässä 96 %
  kartan jäästä (15 hengen kylässä 86 %). Jos isoja kyliä halutaan väljemmiksi, louhoksen
  jäämäärä voidaan sitoa kyläläisten määrään P25:n hengessä.
- **Heikot luokat luovuttavat aikaisin.** Laiska luovuttaa yleensä kuukautena 5 ja vain taidot
  kuukausina 4–11. Ehto (yli 80 %) täyttyy, mutta luokka näkee häviön jo pelin alkupuolella.
- **Työkaluja ei juuri tehdä** (yhteistyöbotti taso 1,0): botti opiskelee koulutuksen ensin
  täyteen, ja työpajan hyöty jää pieneksi. Selvitetään, onko vika botissa vai työpajan
  arvossa.
- **Suojien rakentaminen määrää alkupelin rytmin.** Kuukausina 1–5 jokainen kylä on osin
  ilman suojaa, koska kuussa rakennetaan yksi rakennus. Tämä on tarkoituksellista (ydin b),
  mutta tekee alusta raskaan.
- **2 pelaajan peli** toimii, mutta hajonta on suuri (yhteistyö 3–5, satunnainen häviää
  80–88 %:ssa). Viritys koskee 15–40 pelaajaa (P15).
- Arvosanarajat ja häviörajat perustuvat botteihin. Ne tarkistetaan ensimmäisten oikeiden
  luokkapelien jälkeen.
