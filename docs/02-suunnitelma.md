# Saarella-uusioversio: suunnitelma

**Tila: LUONNOS v0 (2026-10-09), ennen grillausta.** Kohdat, joissa lukee *(ehdotus)*,
odottavat päätöstä. Lukitut päätökset kirjataan tiedostoon `03-paatokset.md`, ja tämä
dokumentti päivitetään niiden mukaiseksi.

Pohjana on rakenneanalyysi `01-alkuperainen-peli.md`.

## 1. Tavoite

Moderni uusioversio Saarellasta osoitteeseen `saarelle.novanet.fi`. Ydin pysyy samana:
yhteiset resurssit, rajatut toiminnot, äänestämällä rakentaminen, 15 kierrosta ja noin
25 minuuttia. Tekniikka on nykyaikainen, grafiikka uutta ja alkuperäisen heikkoudet
korjataan.

## 2. Periaatteet

1. **Säännöt ensin.** Puhdas, deterministinen sääntömoottori: TypeScript, siemenellinen
   satunnaisluku, ei I/O:ta. Palvelin, simulaattori ja testit käyttävät samaa koodia.
2. **Palvelin päättää kaiken.** Asiakas näyttää tilan ja lähettää aikeita (klikkasin ruutua,
   äänestin). Hinnat, rajoitteet ja ajastimet tarkistetaan palvelimella.
3. **Data erillään koodista.** Vakiot, aluetyypit, rakennukset, tekstit, vinkit ja
   arvosanarajat ovat yhdessä datamoduulissa (vastaa alkuperäistä `gamedata.json`ia).
4. **Tasapaino simuloimalla.** Puuttuvat vakiot rekonstruoidaan ohjekirjan luvuista ja
   viritetään ajamalla tuhansia pelejä botti-strategioilla.
5. **Novanetin konventiot.** Yksi kontti, Traefik-labelit, `.env` mode 600 ja
   stack-kansion `README.md` (ks. homelab-muistio).

## 3. Arkkitehtuuri *(ehdotus)*

```
saarella/
  packages/rules/   sääntömoottori + pelidata + yksikkötestit (Vitest)
  packages/sim/     CLI-simulaattori: N peliä × strategiat → tasapainoraportti
  apps/server/      Node 22 + TypeScript: HTTP + WebSocket, pelihuoneet muistissa,
                    SQLite tuloksille
  apps/client/      Vite + TypeScript + Svelte 5, kartta SVG:nä, mobiili ensin
  deploy/           Dockerfile (multi-stage), docker-compose, ohjeet novaservulle
  docs/
```

**Protokolla:** WebSocket, JSON-viestit.

- Asiakas lähettää aikeita: `join`, `start`, `inspect{x,y}`, `act{x,y}`, `vote{building}`,
  `pause` ja `resume`.
- Palvelin lähettää täyden näkymän liittyessä ja uudelleenyhdistäessä, muuten tapahtumia.
  Pelaajakohtaiset tiedot (omat toiminnot, taidot) lähetetään vain kyseiselle pelaajalle.

**Identiteetti:** anonyymi pelaajatunniste selaimen `localStorage`ssa pelikohtaisesti.
Sivun päivitys tai yhteyskatko palauttaa saman pelaajan.

**Liittyminen:** lyhyt pelikoodi ja QR-koodi aulassa (projektorille).

**Pelin luoja:** pelaaja, joka saa Start- ja Pause-napit. Jos luoja poistuu, rooli siirtyy
seuraavalle, eikä peli kuole.

## 4. Muutokset alkuperäiseen *(ehdotus)*

| Alkuperäinen | Uusi |
|---|---|
| Luojan poistuminen tappoi pelin | Peli jatkuu, luojan rooli siirtyy |
| Ei uudelleenyhdistämistä | Automaattinen paluu peliin |
| Pause poistettu käytöstä | Luoja voi tauottaa |
| Palvelin luotti asiakkaaseen | Kaikki tarkistetaan palvelimella |
| Kiinteä 1024 × 768 canvas | Responsiivinen, toimii puhelimella ja projektorilla |
| Pusher (maksullinen SaaS) | Oma WebSocket samassa kontissa |
| Kalastuksen näytetty tuotto väärin | Korjattu |
| Rakennus sijoittuu ensimmäiselle vapaalle niitylle | Avoin kysymys (§8) |

## 5. Vaiheet

| Vaihe | Sisältö | Valmis kun |
|---|---|---|
| V0 | Tutkimus, suunnitelma, grillaus | `03-paatokset.md` lukittu |
| V1 | Sääntömoottori ja data, säännöt 1:1 ja bugit korjattuina | yksikkötestit kattavat jokaisen aluetyypin, rakennuksen ja kierroksen lopun |
| V2 | Simulaattori ja tasapainon viritys | raportti: arvosanajakauma strategioittain, hyvä yhteistyö voittaa |
| V3 | Palvelin: huoneet, vaiheajastimet, pause, uudelleenyhdistäminen | botit pelaavat koko pelin WebSocketin yli testissä |
| V4 | Asiakas MVP väliaikaisgrafiikalla | 2–6 pelaajaa pelaa pelin läpi eri laitteilla |
| V5 | Julkaisu novaservulle | `https://saarelle.novanet.fi` toimii, stack-README kirjoitettu |
| V6 | Grafiikka ja äänet | kaikki aluetyypit ja rakennukset omilla kuvillaan |
| V7 | Lisät: TOP-lista, kielet, opettajanäkymä… | grillauksen mukaan |

## 6. MVP:n valmiin määritelmä *(ehdotus)*

- 2–6 pelaajaa eri laitteilla pelaa 15 kierroksen pelin osoitteessa `saarelle.novanet.fi`.
- Sivun päivitys kesken pelin palauttaa pelaajan samaan peliin.
- Automaattinen bottitesti pelaa kokonaisen pelin palvelinta vasten.
- Sääntömoottorin testit menevät läpi, ja simulaattorin raportti on hyväksytty.

## 7. Riskit

- **Tekijänoikeus ja nimi.** "Saarella" on Eduplusin tuotenimi. Grafiikka, äänet ja tekstit
  ovat tekijänoikeuden suojaamia, pelimekaniikka ei. Julkisessa versiossa ei käytetä
  alkuperäisiä kuvia, ääniä eikä tekstejä sellaisenaan.
- **Tasapaino.** `gamedata.json` puuttuu, joten ~45 vakiota on arvioita. Simulaattori on
  tämän takia oma vaiheensa.
- **Grafiikan määrä.** Alkuperäisessä oli 162 framea (aluetyypit reunamuunnelmineen ja
  12 rakennusta). Grafiikkalinja ratkaisee suurimman osan työmäärästä.
- **Pelaajamäärän skaalautuvuus.** Säännöt skaalautuvat jo (teho = vakio / pelaajat), mutta
  kahden pelaajan peli tuntuu erilaiselta kuin 25 hengen luokka. Simuloidaan molemmat.

## 8. Avoimet kysymykset (grillataan)

1. Kenelle peli tehdään ja missä tilanteessa sitä pelataan?
2. Julkinen internet vai vain tailnet?
3. Kuinka uskollinen: 1:1-säännöt vai "Saarellan inspiroima"?
4. Nimi ja domain: `saarelle` vai `saarella`? Käytetäänkö nimeä Saarella?
5. Grafiikka: alkuperäiset (vain yksityisesti), avoimet CC0-paketit, itse tehty vai
   AI-generoitu?
6. Pelaajamäärä: kaveriporukka (2–6) vai luokka (jopa 30)?
7. Yksinpeli ja botit?
8. Kielet: FI, vai myös EN/SV?
9. Rakennuksen sijainti: automaattinen vai pelaajien valitsema?
10. Pelaajien nimet ja chat, vai anonyymi kuten alkuperäinen?
11. TOP-lista ja tilastot?
12. Opettaja-/projektorinäkymä (katsoja ilman pelaajaroolia)?
13. Äänet ja musiikki?
14. Teknologia: Svelte + SVG, PixiJS, vai jokin muu?
15. Git-remote ja julkaisu: yksityinen GitHub-repo ja deploy key (PrinttiPaja-malli) vai
    scp (telemetry-malli)?
16. Aikataulu ja tärkeysjärjestys suhteessa Pine Hollowiin?
