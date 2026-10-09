# Tasapaino (V3)

**Tila: viritetty 2026-10-09.** Viritetyt arvot ovat tiedostossa
`packages/rules/src/params.ts` (`DEFAULT_PARAMS`). Pelisuunnitteludokumentin §16 sisältää
alkuarvot, jotka on jäädytetty sääntötesteihin (`packages/rules/test/params.ts`).

Täysi simulaatioraportti: [`sim/2026-10-09-defaults.md`](sim/2026-10-09-defaults.md).

## Menetelmä

- Botit (`packages/bots`) pelaavat kokonaisia pelejä. Simulaattori (`packages/sim`) mittaa
  arvosanajakauman, kriisit, toimintojen jakauman ja käyttämättä jääneet toiminnot.
- Strategiat:
  - **yhteistyö:** tarpeet ensin ja kiinteä rakennusjärjestys, 10 % kohinaa;
  - **sekoitus:** 60 % yhteistyö, 25 % satunnainen, 15 % laiska;
  - **satunnainen;**
  - **itsekäs:** vain koulu ja työpaja;
  - **laiska:** yksi toiminto kuukaudessa.
- Ajo: `node packages/sim/src/cli.ts --seeds 40 --villagers 2,15,30,40 --short`. Kokeiluarvot
  ilman koodimuutosta: `--params tiedosto.json` (osittainen, yhdistetään oletuksiin).

## Tavoitteet ja tulos (Normaali peli, 15–40 pelaajaa, 40 peliä per rivi)

| Tavoite | Tulos |
|---|---|
| Yhteistyö saa arvosanan 5–6 vähintään 80 %:ssa peleistä | 5–6 kaikissa; 6: 73–95 % |
| Sekoitus asettuu yhteistyön ja satunnaisen väliin | enimmäkseen 5, vaihteluväli 4–6 |
| Satunnainen 2–3 | 2, joskus 3 |
| Itsekäs 1–2 | 1 |
| 15 ja 30 pelaajan mediaanit eroavat alle 15 % | yhteistyö 75 / 72, sekoitus 67 / 66 |
| Yhteistyön toiminnot: ruoka 25–40 %, aineet 20–30 %, taidot 10–25 %, tutkiminen 5–15 %, virkistys 5–15 % | 25 / 28–30 / 24 / 14–15 / 8 % |
| Koulutus ei maksimoidu kaikilla | keskimäärin 2,6–2,7 / 3 |
| Lyhyt peli: samansuuntainen jakauma | yhteistyö 5–6, sekoitus 4–6, satunnainen 2 |

## Mitä muutettiin

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

## Tunnetut rajoitukset ja jatkoseuranta

- **Ruoka on painetta vain heikoille luokille.** Yhteistyö ja sekoitus eivät näe nälkää.
  Satunnainen luokka näkee nälkää harvoin (0,1–0,5 kk), laiska ja itsekäs usein. Oikeat
  luokat ovat todennäköisesti huonommin koordinoituja kuin botit. Seurataan pelitesteissä.
- **Työkaluja ei juuri tehdä** (yhteistyöbotti taso 1,0): botti opiskelee koulutuksen ensin
  täyteen, ja työpajan hyöty jää pieneksi. Selvitetään, onko vika botissa vai työpajan
  arvossa.
- **Suojien rakentaminen määrää alkupelin rytmin.** Kuukausina 1–5 jokainen kylä on osin
  ilman suojaa, koska kuussa rakennetaan yksi rakennus. Tämä on tarkoituksellista (ydin b),
  mutta tekee alusta raskaan.
- **2 pelaajan peli** toimii, mutta hajonta on suuri (yhteistyö 4–6). Viritys koskee 15–40
  pelaajaa (P15).
- Arvosanarajat perustuvat botteihin. Ne tarkistetaan ensimmäisten oikeiden luokkapelien
  jälkeen.
