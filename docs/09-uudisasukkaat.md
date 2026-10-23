# Uudisasukkaat: oma peli Saarellan pohjalta

**Tila: toteutettu 2026-10-13.** Samu hyväksyi suunnitelman 2026-10-13. Päätökset ovat
päätöslokissa (P40–P47), ja ne on viety pelisuunnitteluun (`04-pelisuunnittelu.md`).
Toteutussuunnitelma: `superpowers/plans/2026-10-13-uudisasukkaat.md`.
**Osin korvattu 2026-10-23:** vuodenajat, tarina ja nimet ks. `10-arktinen.md` (P49, P52, P54).
Kehystys, omat merkit ja `skillsOnly` säilyvät.

## Tausta

Samu 2026-10-13: peli halutaan irti siitä, että se on Saarellan kopio. Yhteiskunnan
rakentaminen ja koululaisille sopiva tyyli säilyvät. Lisäksi kaveri sanoi, että peli on
"erittäin kommunistinen".

Katsauksen havainnot:

- **Rakenne on lähes sama kuin Saarellassa.** Tarina (haaksirikko, pelastuslaiva 15 kuukauden
  päästä), kierros (3 toimintoa, yksi rakennus äänestetään), maasto ja toiminnot, yhteiset
  resurssit, neljä rakennusta tehoineen ja nimineen (nuotio → teatteri → amfiteatteri myöten)
  ja pisteet onnellisuuksien summana. Omaa ovat opettaja isäntänä, jälkipuinti, mitoitus per
  kyläläinen, tasapelisääntö, ruokavaraston katto ja grafiikka.
- **Kommunistinen tuntu tulee kehystyksestä yhtä paljon kuin säännöistä:** kenelläkään ei ole
  mitään omaa, asunnot jaetaan "suojapaikkoina", itsensä kehittäminen on leimattu itsekkääksi
  (bottistrategia "itsekäs" ja jälkipuinnin kysymys "Kannattiko se kylälle?"), ja oma panos ei
  näy missään.

## Grillauksen tulos (2026-10-13)

| Kysymys | Päätös |
|---|---|
| Oma ja yhteinen | **Kaikki pysyy yhteisenä, korjataan kehystyksellä.** Säännöt ennallaan (P7a). Samu: pelin idea on kehittää lasten yhteistyötaitoja, ja automaattisesti yhteinen on helpoin. |
| Tarina | **Uudisasukkaat** perustavat kylän, ja peli päättyy avajaisjuhlaan. |
| Laajuus | **Uusi ilme ja vuodenajat.** Talvella mikään ei kasva. |
| Rakennukset ja maasto | **Koti, Koulu, Paja, Kylätalo, Lampi.** |
| Kohderyhmä | **2.–6. luokka.** Tekstit ja monimutkaisuus mitoitetaan 2.-luokkalaiselle. |

## Onnistumisen mittarit

- Saarellan tuntija ei tunnista peliä samaksi tarinan, nimien eikä kuvien perusteella.
- Pelissä ei ole yhtään tekstiä, joka leimaa oppimisen tai oman kehityksen itsekkääksi.
- Jokainen oppilas näkee pelin lopussa jotain omaa (merkit), mutta ketään ei aseteta
  järjestykseen.
- Talvi on painetta myös hyville luokille: ruoan varastointi ennen talvea on oikea yhteinen
  suunnittelutehtävä.
- 2.-luokkalainen ymmärtää vuodenajan, talven ja juhlan ilman lukemista (kuvat ja kuvakkeet).

## 1. Tarina

Luokka purjehtii veneellä autiolle saarelle perustamaan oman kylän. Kaikki tehdään talkoilla.
15 kuukauden päästä (Lyhyessä pelissä 10) pidetään **kylän avajaisjuhla**, ja mantereelta
saapuu vieraita. Tulos kertoo, millaisen kylän vieraat näkevät.

- Aulan ja oppilaan odotusruudun "Näin pelataan" -askel 1 kertoo tämän.
- Loppuruudun laiva on **liputettu vieraslaiva**: "Vieraat saapuivat juhlaan!"
- Rantautumispaikan soutuvene sopii sellaisenaan.

## 2. Kehystys

### 2.1 Sanasto

| Nyt | Uusi |
|---|---|
| Kylän yhteiset tavarat | **Kylän varasto** |
| Äänestys / Mitä rakennetaan? | **Kyläkokous: mitä rakennetaan?** |
| Suoja, suojapaikat 15 / 30 | **Koti, kodit 15 / 30** ("Talo antaa kodin noin 5 kyläläiselle") |
| Oma kehitys | **Taitosi** |
| Opiskele: koulutus antaa sinulle lisää toimintoja | "Kun opit, saat enemmän aikaan koko kylälle" |
| "Puu, kivi ja ruoka ovat yhteisiä" | "Rakennatte kylän talkoilla: kaikki kerätty menee kylän varastoon" |

### 2.2 Ei itsekäs-leimaa

- Bottistrategia `selfish` → **`skillsOnly`** ("vain taidot") koodissa, simulaattorin
  raporteissa ja dokumenteissa. Strategia ja sen tavoitearvosana (1–2) pysyvät: jos kaikki vain
  opiskelevat, kukaan ei kerää ruokaa. Tämä on tasapainon opetus, ei moraalinen leima.
- Jälkipuinnin kysymykset:
  - `skills-heavy`: "{percent} % toiminnoista meni oppimiseen. Miten se auttoi kylää? Milloin
    oppiminen kannattaa eniten?"
  - `skills-none`: "Kukaan ei opiskellut eikä tehnyt työkaluja. Olisiko oppiminen auttanut kylää
    myöhemmin?"

### 2.3 Omat merkit

Pelin lopussa jokainen näkee **omalla laitteellaan** 1–3 merkkiä sen mukaan, mitä teki.

| Merkki | Toiminnot |
|---|---|
| Löytöretkeilijä | tutki |
| Kalastaja | kalasta / pilki |
| Metsuri | kaada puita |
| Viljelijä | raivaa pelloksi, korjaa sato |
| Kivenhakkaaja | perusta louhos, louhi kiveä |
| Oppija | opiskele |
| Seppä | tee työkaluja |
| Ilonpitäjä | ui, vietä aikaa yhdessä |
| Kyläkokouksen jäsen | äänesti jokaisessa kyläkokouksessa liittymisensä jälkeen, vähintään 3 kertaa |
| Uudisasukas | annetaan, jos mikään muu merkki ei tullut |

- Toimintomerkkejä on enintään kaksi: pelaajan kaksi eniten käyttämää ryhmää, joissa kummassakin
  on vähintään 3 toimintoa ja 20 % hänen toiminnoistaan. Tasatilanteessa ratkaisee taulukon
  järjestys.
- Merkit lasketaan puhtaalla funktiolla tapahtumalokista (`packages/debrief`).
- Palvelin lähettää merkit pelin lopussa **vain pelaajalle itselleen**. Niitä ei näytetä
  projektorilla, ei vertailla eikä tallenneta (P20, P23 ja P34 ennallaan).
- Merkeissä on kuva (sama Kenney-tyyli kuin kartalla).

### 2.4 Arvosanat (korvaa P32:n nimet)

| Taso | Nimi |
|---|---|
| 6 | Unelmien kylä |
| 5 | Kukoistava kylä |
| 4 | Toimiva kylä |
| 3 | Kasvava kylä |
| 2 | Sinnittelevä leiri |
| 1 | Leiri rannalla |

## 3. Vuodenajat

### 3.1 Kalenteri

Molemmat pelit alkavat **huhtikuussa**. Kuukaudella on nimi ja vuodenaika koulun tapaan:
kevät maalis–toukokuu, kesä kesä–elokuu, syksy syys–marraskuu, talvi joulu–helmikuu.

| Peli | Kuukaudet | Talvi | Juhla |
|---|---|---|---|
| Normaali (15) | huhtikuu → seuraava kesäkuu | kuukaudet 9–11 | kesän alussa |
| Lyhyt (10) | huhtikuu → tammikuu | kuukaudet 9–10 | talvella |

Parametrit: `startCalendarMonth` (4) ja talvikuukaudet (12, 1, 2). Säännöt tarjoavat kyselyt
kuukauden kalenterinimelle ja vuodenajalle.

### 3.2 Talvisääntö: talvella mikään ei kasva

1. **Talvikuukautena satoa ei voi korjata.** Pelto on lumen alla. Kieltäytymisen syy on
   `winter`: "Pelto on lumen alla. Se kasvaa taas keväällä."
2. **Talvikuukauden lopussa metsät eivät kasva.** Puita saa kaataa normaalisti.
3. Pellot täyttyvät kuukauden vaihteessa kuten ennenkin, joten keväällä (maaliskuussa) ne ovat
   täynnä.
4. **Kalastus talvella on pilkkimistä:** sama sääntö ja tuotto, nimi "Pilki" ja napissa avannon
   kuva.
5. Raivaus, louhinta, tutkiminen, rakentaminen ja virkistys toimivat talvella kuten ennenkin.

Ruokavarastoon mahtuu yhä kahden kuukauden tarve (P27). Normaalissa pelissä talvi kestää kolme
kuukautta, joten syksyllä varasto täytetään ja talvella pilkitään. Lyhyessä pelissä täysi
varasto riittää kahden kuukauden talven yli.

### 3.3 Varoitukset ja näkymät

- **Loka- ja marraskuun alussa** projektorin tapahtumanauha näyttää viestin "Talvi tulee!
  Kerätkää ruokaa varastoon." Kuukauden yhteenveto syksyllä: "Talveen {n} kuukautta".
- **Yläpalkki:** kuukauden nimi ja vuodenajan kuvake (verso, aurinko, lehti, lumihiutale),
  esim. "❄ Tammikuu", lukujen 10 / 15 sijaan. Projektorilla lisäksi "Juhlaan {n} kuukautta".
- **Kartta talvella on luminen:** ruohoruudut ja kaikki maalla olevat kuvat talviversioina, ja
  pelto lumen alla ilman viljaa. Talvikuvat renderöidään samalla Blender-putkella (ylöspäin
  osoittavat pinnat valkoisiksi). Meri pysyy ennallaan.
- **"Näin pelataan"** saa talviaskeleen: "Talvella pelto ei kasva. Kerätkää ruokaa ennen
  talvea!"

### 3.4 Jälkipuinti

- Kuukausitarinan talvikuukausilla on lumihiutale.
- Uudet kysymykset:
  - `winter-hunger` korvaa kysymyksen `hunger`, kun ensimmäinen nälkäkuukausi oli talvella:
    "Talvella ruoka loppui ja {people} jäi nälkään. Milloin olisi pitänyt alkaa varautua?"
  - `winter-ready` on yleiskysymys, kun peli eteni talven yli ilman nälkää: "Ruoka riitti
    talven yli. Miten varauduitte? Kuka muistutti muita?"

### 3.5 Tasapaino

- Yhteistyöbotti varautuu talveen: syksyllä se täyttää varaston, ja talvella se pilkkii, jos
  varasto ei riitä talven loppuun.
- Arvosanarajat viritetään uudelleen simulaattorilla molemmille pituuksille, ja tulokset ja
  syyt kirjataan tiedostoon `05-tasapaino.md`.
- Hyväksymisehdot ovat samat kuin V3:ssa: yhteistyö 5–6, sekoitus väliin, satunnainen 2–3,
  vain taidot 1–2, 15 ja 30 pelaajan mediaanit eroavat alle 15 %.
- Lisäksi:
  - yhteistyöbotti ei näe nälkää talvella vähintään 80 %:ssa peleistä;
  - sekoitus näkee joskus nälkää talvella, eli talvi on oikeasti painetta.

## 4. Rakennukset ja maasto

Säännöt, tehot ja hinnat pysyvät. Nimet ja osa kuvista vaihtuvat.

| Rakennus nyt | Uusi | Tasot | Kuvat |
|---|---|---|---|
| Suoja | **Koti** | Teltta → Mökki → Talo | nykyiset |
| Koulu | **Koulu** | Ulkoluokka → Koulu → Iso koulu | nykyiset |
| Työpaja | **Paja** | Työpenkki → Paja → Iso paja | nykyiset |
| Kokoontumispaikka | **Kylätalo** | Laavu → Kylätalo → Juhlatalo | **uudet:** laavu ja nuotio, puinen talo penkkeineen, iso talo lippuineen |

- **Lähde → Lampi.** Toiminto "Ui", tapahtuma "Lampi löytyi!", kuvana lampi ja pieni laituri.
- **Kuvakkeet:** suojan kuvake → kodin kuvake, pelastuslaiva → liputettu vieraslaiva.
- Etusivun saarikuva renderöidään uudelleen uusilla kuvilla.
- Koodin sisäiset tunnisteet (`shelter`, `gathering`, `spring`) pysyvät, jotta muutos ei leviä
  protokollaan, lokiin ja tallennettuihin jälkipuinteihin. Vain näkyvät nimet ja kuvat
  vaihtuvat.

## 5. Mitä ei muuteta

Toiminnot ja niiden tuotot, kartan generointi, mitoitus per kyläläinen, kierroksen vaiheet ja
ajat, äänestys- ja tasapelisäännöt, yläpalkin ja ponnahdusikkunan rakenne, opettajan näkymä,
moderointi ja tietosuoja.

## 6. Toteutusjärjestys

1. **Lumikokeilu:** metsä, talo, pelto ja ruohoruutu talviversioina. Samu näkee kuvan ennen
   kuin kaikki kuvat renderöidään.
2. **Säännöt** (`packages/rules`), testit ensin: kalenteri, vuodenaika, talvisääntö.
3. **Botit ja simulaattori:** talveen varautuminen, `skillsOnly`, uudelleenviritys.
4. **Jälkipuinti ja merkit** (`packages/debrief`), **palvelin ja protokolla:** talvikysymykset,
   merkkifunktio, merkit vain omalle pelaajalle.
5. **Asiakas:** tekstit, kalenteri yläpalkkiin ja projektoriin, luminen kartta, pilkkiminen,
   vieraslaiva ja merkit loppuruutuun, talviaskel sääntökortteihin.
6. **Uudet kuvat:** laavu, kylätalo, juhlatalo, lampi, kodin kuvake, vieraslaiva, talviversiot,
   etusivun saarikuva.
7. **Dokumentit:** päätösloki (P40–P46; P32:n nimet ja P1:n kohderyhmä yliviivataan ja
   tarkennetaan), pelisuunnittelu, tasapaino, opettajan ohje, suunnitelman vaihetaulukko.
8. **Tarkistus ja julkaisu:** kaikki testit, bottipeli selaimessa talven yli projektori- ja
   oppilasnäkymässä, julkaisu tuotantoon ja julkinen smoke-testi. Julkaisu katkaisee käynnissä
   olevat pelit, ja siitä kerrotaan Samulle.

## 7. Testaus

- **Säännöt:** kalenterinimet ja vuodenajat molemmille pituuksille; sadonkorjuu estetty
  talvella ja sallittu maaliskuussa; metsä ei kasva talvikuukauden lopussa; pilkkiminen toimii
  talvella; pitkä peli talven yli ilman muutoksia muihin sääntöihin.
- **Botit ja simulaattori:** hyväksymisehdot kohdasta 3.5.
- **Jälkipuinti:** talvikysymysten laukaisimet, uudet sanamuodot, merkkifunktio (rajat,
  tasatilanteet, Uudisasukas, Kyläkokouksen jäsen myöhään liittyneelle).
- **Palvelin:** merkit menevät vain pelaajalle itselleen, eivät projektorille eivätkä muille.
- **Asiakas:** kalenteriapurit, i18n-testi (ei kuolleita eikä puuttuvia tekstejä), ja selaimessa
  talvikartta ja loppuruudun merkit.

## 8. Nimi

Pelin nimi on **Last Chance** (Samu 2026-10-13, vahvistaa P36:n ja sulkee P5:n). Käyttöliittymän
työnimi "Saari" (`app.name`) vaihdetaan, ja nimen lykkäys poistetaan suunnitelman
lykätyistä päätöksistä. Koodin pakettinimet (`@saari/*`) pysyvät.

## 9. Myöhemmin

- Syksyn värit (ruska) kartalle ovat mahdollinen myöhempi lisä.
