# Pelisuunnittelu (työnimi `saari`)

**Tila: v1.1 (2026-10-09).** Päätökset P25–P34 (`03-paatokset.md`) on viety tähän, ja niiden
numerot ovat suluissa. V3:n tasapainotyön sääntömuutokset (sumu, suojat, pyöristys,
arvosanarajat) on merkitty **(V3)**; perustelut ovat dokumentissa `05-tasapaino.md`.

- Luvut ovat **alkuarvoja**. Ne viritetään simulaattorilla vaiheessa V3, ja lopulliset arvot ovat
  datatiedostossa eivätkä tässä dokumentissa.

Reunaehdot tulevat tiedostosta `03-paatokset.md` (P1–P34). Tärkeimmät: ydin (P7), isometriset
neliöt (P10), kartta skaalautuu (P8), 15–30 pelaajaa (P15), enintään 45 minuuttia ja
tapahtumaloki jälkipuintia varten (P8).

---

## 1. Tarina

Luokka on laivalla, joka ajaa myrskyssä karille tuntemattoman saaren edustalla. Kaikki pääsevät
rantaan. Hylystä pelastettiin vähän ruokaa ja lautoja, ja radiosta kuului viesti, että
pelastuslaiva saapuu **15 kuukauden kuluttua** (Lyhyessä pelissä 10). Siihen asti saarella pitää
pärjätä yhdessä.

- Jokainen kierros on yksi kuukausi.
- Peli päättyy, kun pelastuslaiva saapuu. Tulos kertoo, millainen yhteisö saarelle ehti syntyä.
- Loppuäänestystä ei ole (P31). Peli päättyy suoraan arvosanaan.

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
  - jokainen syö 4 ruokaa kuukaudessa, joten 30 hengen kylä tarvitsee 120;
  - suoja tason 1 maksaa 4 puuta kyläläistä kohden, joten 30 hengen kylässä 120 puuta.
- Kartta kasvaa pelaajamäärän mukaan (P8).

**Miksi näin**
- Luvut ovat ymmärrettäviä ja samoja jokaisessa luokassa.
- Ne opettavat samalla: "Meitä on 24 ja jokainen syö 4, joten ruokaa tarvitaan 96. Varastossa on
  60. Montako peltoa pitää korjata?" Tämä on sopiva päässälaskutehtävä 4.–9.-luokkalaiselle, ja
  laskemalla oppilaat ehtivät keskustella.
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
3. Kuukauden vaihde ~8 s yhteenveto: mitä rakennettiin, riittikö ruoka ja suojat, mieliala
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
  pelaajalla 92. Ympärillä on 1–2 ruudun levyinen merirengas.
- Saaren muoto kasvatetaan satunnaisesti keskeltä ulospäin ja pyöristetään. Pohjana on
  vaakasuuntainen ellipsi (noin 1,6 : 1), joka sopii vaakanäytölle. Muoto määräytyy pelin
  **siemenestä**, joten sama siemen tuottaa saman saaren (testaus, uusintapelit).

### 5.2 Aluetyypit alussa

| Alue | Osuus maaruuduista | Huom. |
|---|---|---|
| Metsä | ~50 % | puuta, kaadettuna niittyä |
| Niitty | ~30 % | pelloksi tai rakennuspaikaksi |
| Kallio | ~20 % | louhokseksi, ei kahden ruudun säteellä rantautumispaikasta |
| Lähde | 1 kpl | saaren kaukaisimmassa kolmanneksessa |
| Meri | rengas | rannikkomeressä voi kalastaa |

**Rantautumispaikka** on etelärannalla oleva niitty, jolla hylky näkyy. Sen naapureissa on
vähintään yksi niitty, yksi metsä ja kaksi meriruutua, jotta ensimmäinen kierros ei jumitu.

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
| Puu | metsän kaataminen | kaikki rakennukset |
| Kivi | louhos | paremmat rakennukset (tasot 2–3) |
| Ruoka | pelto, kalastus | jokainen syö 4 joka kuukausi |
| Onnellisuus | kuukauden mieliala (§9) | pisteet ja arvosana |

**Ruokavarasto (P27):** varastoon mahtuu enintään kahden kuukauden tarve (`8N`), ja ylimenevä
osa pilaantuu kuukauden vaihteessa. Pilaantunut määrä näkyy yhteenvedossa ("varasto oli täynnä,
14 ruokaa pilaantui"). Puulla ja kivellä ei ole ylärajaa.

## 7. Toiminnot

Jokaisella on alussa **3 toimintoa kuukaudessa** (ydin c). Ruutua napautetaan, sivupaneeli
kertoo alueen tilan ja mitä toiminto tuottaa, ja nappi käyttää yhden toiminnon. Tuotot ovat
työkalutasolla 1. Työkalukerroin on kuvattu kohdassa §8.

| Alue | Toiminto | Vaikutus |
|---|---|---|
| Sumu | **Tutki** | +1 työ (× työkalut); paljastuu, kun työ ≥ `1 + ⌊d/2⌋` |
| Niitty | **Raivaa pelloksi** | +1 työ (× työkalut); 3 työtä → pelto |
| Pelto | **Korjaa sato** | +10 ruokaa (× työkalut), enintään pellon jäljellä oleva sato. Pelto kasvaa joka kuukausi täyteen 30 ruokaan. Tyhjästä pellosta ei saa mitään. |
| Rannikkomeri | **Kalasta** | +5 ruokaa (× työkalut), rajaton mutta puolet pellon tuotosta. (V3) Vain meri, jonka vieressä on tutkittua maata. |
| Metsä | **Kaada puita** | +10 puuta (× työkalut), enintään metsän puumäärä (täysi metsä 40). Metsä kasvaa kuukaudessa ×1,25 kohti täyttä. Tyhjästä metsästä tulee niitty. |
| Kallio | **Perusta louhos** | +1 työ (× työkalut); 4 työtä → louhos |
| Louhos | **Louhi kiveä** | kiveä `8 × jäljellä/60` (× työkalut), vähintään 2. Louhoksessa on 60 kiveä, joten uusi louhos tuottaa hyvin ja vanha huonosti. |
| Lähde | **Ui** | +1 virkistyskerta (§9). Käyttökertoja on ⌈N/6⌉ kuukaudessa. |
| Kokoontumispaikka | **Vietä aikaa yhdessä** | +1 virkistyskerta (§9). Käyttökertoja on tason mukaan ⌈N/5⌉ / ⌈N/4⌉ / ⌈N/3⌉. |
| Koulu | **Opiskele** | oma koulutus (§8) |
| Työpaja | **Tee työkaluja** | omat työkalut (§8) |
| Suoja | ei toimintoa | tarjoaa suojapaikkoja (§9) |

Tuotot pyöristetään kokonaisluvuiksi. Paneelissa näytetään aina tarkka tuotto ennen napautusta,
esim. "Kaada puita +13".

## 8. Oma kehitys: koulu ja työpaja

Ydin (c) on jännite: käytänkö toiminnon nyt yhteiseen hyvään, vai sijoitanko itseeni, jolloin
autan myöhemmin enemmän? Etu on aina **henkilökohtainen**.

| | Koulutus | Työkalut |
|---|---|---|
| Taso alussa | 1 | 1 |
| Tasolla *k* saa | `2 + k` toimintoa kuukaudessa | tuottokerroin `1 + 0,25 × (k − 1)` |
| Enimmäistaso | 4 (6 toimintoa) | 4 (×1,75) |
| Seuraavaan tasoon tarvitaan | `3 × k` edistystä | `3 × k` edistystä |
| Edistystä per toiminto | rakennuksen taso (1 / 2 / 3) | rakennuksen taso (1 / 2 / 3) |

Esimerkki: tason 1 koulussa kolme opiskelutoimintoa nostaa koulutuksen tasolle 2, mikä antaa
+1 toiminnon jokaiseen jäljellä olevaan kuukauteen. Kannattaa aikaisin, ei enää lopussa. Juuri
tällaisesta oppilaat voivat keskustella.

## 9. Kuukauden vaihde ja onnellisuus

Kuukauden lopussa tapahtuu järjestyksessä:

1. **Ruoka:** kylä syö `4 × N`.
   - Jos ruoka riittää, kaikki ovat ravittuja.
   - Jos ei, varasto tyhjenee ja `nälkäiset = ⌈puuttuva / 4⌉` henkeä.
2. **Suojat (V3):** suoja kattaa tasonsa mukaan **1/6, 1/3 tai 1/2 kylästä**, ja osuudet
   lasketaan yhteen. Ilman suojaa on `round(N × (1 − osuus))` henkeä, kuitenkin vähintään yksi,
   jos osuus on alle 1. Osuuksina laskettuna 15 ja 30 hengen kylä saa samasta tilanteesta
   saman mielialan.
3. **Mieliala** lasketaan kokonaislukuna. Arvot ovat alkuarvoja:

   | Osa | Ehto | Vaikutus |
   |---|---|---|
   | Ruoka | kaikki ravittuja | +2 |
   | Ruoka | osa nälässä | −round(10 × nälkäiset / N), vähintään −1 |
   | Suoja | kaikilla suoja | +2 |
   | Suoja | osuus ≥ 1,25 | +1 lisää |
   | Suoja | osa ilman | −round(10 × (1 − osuus)), vähintään −1 |
   | Virkistys | kuukauden virkistyskerrat yhteensä | +round(10 × kerrat / N) |

   (V3) Pyöristykset ovat symmetrisiä (`round`). Alkuperäinen `ceil`/`floor` rankaisi isoa
   kylää joka kuukausi.

   Kuukauden mieliala on noin −20…+15. **Onnellisuus** (pisteet) on kaikkien kuukausien
   mielialojen summa.
4. **Luonto:** metsät kasvavat, pellot kasvavat täyteen, ja lähteen ja kokoontumispaikan
   käyttökerrat nollautuvat.
5. **Pilaantuminen:** ruoka, joka ylittää varaston ylärajan `8N`, pilaantuu (P27).
6. Jokaisen toiminnot palautuvat.

Pisteitä ei jaeta per pelaaja. Kylä onnistuu tai epäonnistuu yhdessä (ydin a).

## 10. Rakennukset ja äänestys

### 10.1 Rakennukset

Hinnat ovat **per kyläläinen**, ja ne kerrotaan *N*:llä ja pyöristetään ylöspäin viiteen.
Suluissa on esimerkkinä 30 hengen luokan hinta.

| Rakennus | Taso 1 | Taso 2 | Taso 3 | Ehto |
|---|---|---|---|---|
| **Suoja** (teltta → maja → talo) | 4 puuta (120) | 6 puuta (180) | 6 puuta + 3 kiveä (180 + 90) | Saatavilla heti. Suojia voi rakentaa useita. Tavoite on kaksi tason 3 suojaa. |
| **Koulu** | 6 puuta (180) | 8 puuta + 2 kiveä (240 + 60) | 8 puuta + 6 kiveä (240 + 180) | Vain yksi, joka päivitetään. Avautuu ensimmäisen suojan jälkeen. |
| **Työpaja** | 6 puuta (180) | 6 puuta + 4 kiveä (180 + 120) | 8 puuta + 8 kiveä (240 + 240) | Vain yksi. Avautuu ensimmäisen suojan jälkeen. |
| **Kokoontumispaikka** (nuotio → teatteri → amfiteatteri) | 4 puuta (120) | 8 puuta + 2 kiveä (240 + 60) | 8 puuta + 8 kiveä (240 + 240) | Vain yksi. Avautuu ensimmäisen suojan jälkeen. |

**Esiehdot (P30): suoja ensin.** Alussa voi äänestää vain suojasta tai olla rakentamatta. Kun
ensimmäinen suoja on valmis, koulu, työpaja ja kokoontumispaikka avautuvat kerralla. Aloitusvarat
(`4N` puuta) riittävät juuri ensimmäiseen suojaan.

Rakennusten nimet ja ulkoasu sovitetaan Kenneyn kuviin grafiikkakokeilussa (V5).

### 10.2 Äänestys

- Vaihtoehtoina ovat jokaisen rakennuksen **seuraava taso** ja uusi tason 1 suoja. Lisäksi aina
  on mukana **"Ei rakenneta tässä kuussa"**.
- Kortissa näkyvät hinta, vaikutus ja syy, jos vaihtoehtoa ei voi valita: puu ei riitä, kivi
  ei riitä tai vapaata niittyä ei ole. Sellaiseen ei voi äänestää, ja palvelin tarkistaa sen.
- Äänen voi vaihtaa vaiheen aikana. Jakauma päivittyy kaikille ja projektorille reaaliajassa.
  Kuka äänesti mitä, näkyy vain opettajalle jälkipuinnissa.
- Eniten ääniä saanut vaihtoehto voittaa. Äänestämättä jättäneitä ei lasketa.
- **Tasapeli (P28):** jos kärjessä on tasapeli, **mitään ei rakenneta eikä veloiteta**, ja
  projektori näyttää viestin "Tasapeli! Neuvotelkaa ja yrittäkää ensi kuussa uudelleen".
  Tasapelit näkyvät jälkipuinnissa.
- Voittajan hinta maksetaan äänestyksen päättyessä, ja rakennus valmistuu kuukauden vaihteessa.
- Kuukaudessa voi rakentaa enintään yhden rakennuksen.

### 10.3 Sijoitus (P29)

- Uusi rakennus sijoitetaan automaattisesti **lähimmälle vapaalle niitylle rantautumispaikasta**,
  joten kylä kasvaa hylyn ympärille. Tasapelissä ratkaisee ensin rivi, sitten sarake, jotta
  sijoitus on deterministinen.
- Päivitys rakennetaan samaan ruutuun.
- Pelaajat vaikuttavat sijoitukseen sillä, mitkä niityt he jättävät raivaamatta. Erillistä
  sijoitusvaihetta ei ole, koska se pidentäisi kierrosta.

## 11. Liittyminen, poistuminen ja poissaolevat

- *N* = pelaajat, jotka ovat liittyneet eikä opettaja ole poistanut. Katkenneen yhteyden pelaaja
  on edelleen kyläläinen: hän syö ja tarvitsee suojan. Pelissä, kuten luokassakin, poissaolevasta
  pidetään huolta.
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
  | 6 | Saaren paratiisi |
  | 5 | Kukoistava kylä |
  | 4 | Toimiva kylä |
  | 3 | Sinnittelevä leiri |
  | 2 | Ahdinko |
  | 1 | Selviytyjät rannalla |

  Rajat asetetaan simulaattorilla. Tavoitteena on, että hyvin yhteistyötä tekevä botti saa tason
  5–6, satunnainen botti 2–3, ja itsekäs botti, joka vain kehittää itseään, tason 1–2.
- Rajat asetetaan erikseen Normaalille ja Lyhyelle pelille (P26). **(V3)** Rajat ovat
  pituuskohtaiset eivätkä skaalattuja, koska suojien rakentaminen vie lyhyessäkin pelissä
  yhtä monta kuukautta. Arvot ovat dokumentissa `05-tasapaino.md`.
- Loppuruudulla näkyvät arvosana, tasoa vastaava kuva sekä siirtymä jälkipuintiin.

## 13. Tapahtumaloki ja jälkipuinti

### 13.1 Mitä kirjataan

Sääntömoottori kirjaa jokaisesta tapahtumasta kuukauden, vaiheen, ajan, pelaajatunnisteen,
tyypin ja tiedot. Tyypit:

- **Liittymiset:** liittyminen, paluu, yhteyden katkeaminen, nimen vaihto, poisto.
- **Toiminnot:** jokainen toiminto (alue, ruutu, tuotto).
- **Tilamuutokset:** alue paljastui, lähde löytyi, pelto valmistui, louhos valmistui, metsä
  loppui, tasonnousu.
- **Äänestykset:** äänet ja niiden muutokset, tulos, tasapeli.
- **Kuukauden vaihde:** ruoka, nälkäiset, suojattomat, mieliala, käyttämättä jääneet toiminnot.
- **Opettajan toimet:** tauko, jatko, lisäaika, lopetus.

Lokiin tallennetaan vain pelaajatunniste, ei nimimerkkiä. Nimet yhdistetään tunnisteisiin
**vain muistissa** nimellistä jälkipuintia varten (P23).

### 13.2 Jälkipuinnin sisältö

1. **Kylän tarina kuukausittain:** kaavio, jossa näkyvät ruoka ja ruoan tarve, suojapaikat ja
   *N*, mieliala ja onnellisuus. Rakennukset merkitään aikajanalle.
2. **Kriisihetket:** esim. "Kuukausi 6: ruoka loppui, 9 jäi nälkään. Korjaantui kuukaudessa 8."
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
   | ruoka loppui | "Kuukautena 6 ruoka loppui. Kuka huomasi sen ensin? Mitä silloin tehtiin?" |
   | tasapeli tai monta tyhjää kuukautta | "Miten päätitte, mitä rakennetaan? Kuuntelitteko kaikkia?" |
   | paljon omaa kehitystä | "Moni opiskeli paljon. Kannattiko se kylälle? Milloin se kannattaa?" |
   | lähde löytyi myöhään tai ei koskaan | "Olisiko saaren tutkimiseen kannattanut käyttää enemmän aikaa?" |
   | korkea arvosana | "Mikä teidän yhteistyössänne toimi? Mitä tekisitte eri tavalla?" |
   | aina | "Mitä opitte siitä, miten ryhmä tekee päätöksiä?" |

## 14. Pelilliset näkymät

Tarkka käyttöliittymä suunnitellaan vaiheessa V6. Pelin kannalta olennaista on tämä:

**Oppilas**
- **Saarikartta:** panorointi ja zoomaus, napautus avaa sivupaneelin. Toimintoympyrää ei ole,
  koska se peittää kartan tabletilla.
- **Ylärivi:** puu, kivi, ruoka ja tarve ("ruoka 80 / tarve 96"), suojapaikat / *N*, mieliala ja
  onnellisuus, kuukausi, vaihe ja ajastin.
- **Oma tila:** toiminnot jäljellä (esim. 2 / 4), koulutus- ja työkalutaso sekä edistyminen.
- **Äänestys:** kortit, jakauma ja oma valinta.
- **Ei nimiä pelin aikana (P34):** toisten toiminnot näkyvät kartalla pelkkinä tekoina
  ("+10 puuta"), myös projektorilla. Tekijät käsitellään jälkipuinnissa opettajan johdolla.

**Projektori**
- Koko saari ja kaikki yhteiset luvut isolla.
- Ajastin ja vaihe sekä äänestysjakauma.
- Tapahtumanauha, esim. "Lähde löytyi!" tai "Ruoka ei riitä ensi kuussa".
- Kuukauden vaihteen yhteenveto.
- Opettajan napit: tauko, +30 s, lopeta, piilota nimet ja moderointi.

## 15. Botit

Botit ovat samoja kolmessa käytössä: simulaattorissa (V3), palvelintestissä (V4) ja opettajan
kokeilutilassa (P19).

| Strategia | Käyttäytyminen | Käyttö |
|---|---|---|
| **Yhteistyö** | Tarpeet ensin (ruoka, suojat). Hankkii rakennusaineet äänestystavoitteen mukaan, tutkii, opiskelee aikaisin. Äänestää suunnitelman mukaan. Toiminnot valitaan vähän satunnaisesti. | tasapainon yläraja, kokeilutila |
| **Satunnainen** | Satunnainen sallittu toiminto ja satunnainen ääni. | tasapainon alaraja |
| **Itsekäs** | Vain koulu ja työpaja, kun ne ovat olemassa. Muuten satunnainen. | ydin c:n tarkistus |
| **Laiska** | Käyttää vain osan toiminnoistaan ja äänestää harvoin. | poissaolojen vaikutus |
| **Sekoitus** | Luokka, jossa on esim. 60 % yhteistyö-, 25 % satunnais- ja 15 % laiskoja botteja. | arvosanarajojen asetus |

**Simulaattorin hyväksymisehdot:**
- Tasot erottuvat toisistaan kuten §12:ssa kuvataan.
- Arvosanajakauma on 2, 15 ja 30 pelaajan peleissä samansuuntainen.
- Kukaan ei jumitu: rakennettavaa ja tekemistä on jokaisessa kuukaudessa.
- Suoja ja ruoka ovat painetta alkupuolella eivätkä ratkea itsestään.

**Tiedossa oleva riski (päässälasku 2026-10-09, N = 30):** 90 toimintoa kuukaudessa voisi tuottaa
900 puuta, kun rakennus maksaa ~180. Puu voi siis olla liian helppoa, ellei toimintoja kulu
muualle. Koko pelin kysyntä (~2000 toimintoa: ruoka ~225, rakennusaineet ~500, tutkiminen ~200,
oma kehitys jopa ~1000) ylittää tarjonnan (~1350), joten niukkuutta on, mutta jakauma pitää
tarkistaa simulaattorilla.

## 16. Parametrit (alkuarvot)

Nämä ovat suunnittelun alkuarvot, jotka on jäädytetty sääntötesteihin. **Pelissä käytetyt
viritetyt arvot ja muutosten syyt ovat dokumentissa `05-tasapaino.md`.**

| Parametri | Arvo | Kohta |
|---|---|---|
| kierroksia | Normaali 15, Lyhyt 10 | §3 |
| toimintavuoro / äänestys / vaihde | 60 s / 30 s / 8 s | §4 |
| maaruutuja | 12 + 2N | §5 |
| metsä / niitty / kallio | 50 / 30 / 20 % | §5 |
| tutkimistyö | 1 + ⌊d/2⌋ | §5 |
| aloitustoiminnot | 3 | §7 |
| ruoan tarve | 4 / hlö / kk | §9 |
| pellon sato | 30 / kk, +10 / toiminto | §7 |
| kalastus | +5 / toiminto | §7 |
| metsä | 40 puuta, kasvu ×1,25 / kk, +10 / toiminto | §7 |
| louhos | 60 kiveä, `8 × jäljellä/60`, väh. 2 | §7 |
| pelloksi raivaus / louhoksen perustus | 3 / 4 työtä | §7 |
| koulutus / työkalut | +1 toiminto / +25 % per taso, max 4, tarve 3k | §8 |
| suojapaikat per suoja | ⌈N/6⌉ / ⌈N/3⌉ / ⌈N/2⌉ | §9 |
| virkistyskerrat | lähde ⌈N/6⌉, kokoontumispaikka ⌈N/5⌉ / ⌈N/4⌉ / ⌈N/3⌉ | §7 |
| aloitusvarat | ruokaa 4N (yksi kuukausi), puuta 4N (yksi suoja), kiveä 0 | — |
| ruokavaraston yläraja | 8N (kaksi kuukautta) | §6 |
| liittyminen sulkeutuu | kuukauden 4 alussa | §11 |

## 17. Grillauksen tulos

Kaikki kymmenen kohtaa on lukittu 2026-10-09 (P25–P34):

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
