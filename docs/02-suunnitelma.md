# Suunnitelma (työnimi `saari`)

**Tila: v1, grillattu 2026-10-09.** Jokainen kohta perustuu `03-paatokset.md`:n
päätöksiin, ja niiden numerot ovat suluissa, esim. (P7). Pohjana on rakenneanalyysi
`01-alkuperainen-peli.md`, joka on referenssi eikä määrittely (P6).

## 1. Tavoite

Selainpohjainen yhteistyöpeli koululuokille (P1), avoin kaikille suomalaisille kouluille heti
(P3), julkisesti internetissä (P2). Peli perustuu Saarellan ydinideaan, mutta muuten se on uusi
peli omalla nimellään (P4, P6). Nimi ja domain `<nimi>.novanet.fi` lukitaan ennen julkaisua (P5).
Projekti menee Pine Hollowin edelle (P24).

## 2. Muuttumaton ydin (P7)

- **(a)** Haaksirikko: koko ryhmällä on yksi yhteinen tavoite ja yhteiset resurssit, eikä
  oppilaiden välillä kilpailla.
- **(b)** Isot yhteiset päätökset tehdään äänestämällä.
- **(c)** Jokaisella on rajallinen määrä toimintoja kierroksessa, ja oman kehityksen ja
  yhteisen hyvän välillä on jännite.
- **(d)** Peli mahtuu oppituntiin (≤ 45 min) ja päättyy palautteeseen ryhmän yhteistyöstä.

## 3. Käyttäjät ja näkymät

### Opettaja: isäntä, ei pelaa (P11)

1. **Pelin luonti** ilman tunnuksia (P14). Selain muistaa isännän.
2. **Aula (projektori):** liittymiskoodi ja QR-koodi sekä liittyneet nimimerkit.
   Moderointi: *vaihda nimi* (satunnainen, lukittu) ja *poista pelistä*. Nimet voi
   piilottaa projektorilta (P13).
3. **Projektorinäkymä pelin aikana:**
   - koko saari, yhteiset resurssit, vaihe ja ajastin sekä äänestystilanne;
   - tauko ja jatka;
   - äänet: musiikki, tikitys ja tapahtumat (P18);
   - paluut peliin näkyvät (P23).
4. **Loppu ja jälkipuinti:**
   - *nimellinen versio* tulostetaan tai ladataan heti, eikä sitä tallenneta palvelimelle;
   - *pseudonymisoitu versio* on yksityisessä linkissä 30 päivää;
   - opettaja voi poistaa tiedot heti (P14, P23).
5. **Kokeilutila:** peli ~20 botin kanssa. Opettaja voi pelata itse oppilasnäkymässä
   toisella välilehdellä. Ei tallenneta (P19).

### Oppilas (P12, P16, P23)

1. Liittyy koodilla tai QR:llä, kirjoittaa nimimerkin, ja suodatin estää kirosanat ja
   loukkaavat nimet.
2. **Oma näkymä:** saarikartta, toiminnot, oma kehitys ja äänestys. Äänet ovat oletuksena
   pois (P18).
3. **Paluu samaan peliin** onnistuu selaimen tunnisteella tai koodilla ja samalla
   nimimerkillä. Nimimerkillä voi palata vain, jos sen pelaajan yhteys on katkennut.

Laitteet: tabletit ja kannettavat, vaakanäyttö vähintään 768 px, kosketus ja hiiri. Puhelin
toimii vaaka-asennossa, mutta sitä ei optimoida (P16).

## 4. Pelisuunnittelu: reunaehdot seuraavalle vaiheelle

Säännöt on kirjoitettu dokumenttiin `docs/04-pelisuunnittelu.md` (v1, grillattu 2026-10-09,
P25–P34). Seuraavat asiat on jo lukittu:

- isometrinen neliöruudukko (P10);
- kartta skaalautuu pelaajamäärän mukaan ja vaihtelee pelistä toiseen siemenen avulla (P8);
- tasapaino viritetään 15–30 pelaajalle, tekninen tuki on 2–40 pelaajaa (P15);
- peli kestää enintään 45 minuuttia (P7d);
- sääntömoottori kirjaa **tapahtumalokin** jälkipuintia varten: kuka teki mitä, äänestykset
  kierroksittain ja kriisihetket (P8);
- **ei MVP:ssä:** satunnaistapahtumat, odottelun vähentäminen eikä luokkien vertailu (P8, P20).

Alkuperäisestä otetaan mallia (aluetyypit, toiminnot, rakennukset, ruoka- ja suojapaine,
henkilökohtainen koulu ja työpaja), mutta mitään ei kopioida sellaisenaan.

## 5. Jälkipuinti (P8, P14, P23)

Sisältöehdotus, joka tarkennetaan pelisuunnittelussa:

- aikajana kierroksittain: resurssit, onnellisuus ja rakennukset;
- äänestykset: vaihtoehdot ja jakaumat sekä nimellisessä versiossa kuka äänesti mitä;
- kriisihetket, esimerkiksi ruoka loppui tai suojat puuttuivat;
- toimintojen jakauma: oma kehitys vs. yhteinen hyvä, ryhmänä ja pelaajittain;
- opettajalle 3–5 keskustelukysymystä, jotka valitaan pelin kulun mukaan.

## 6. Tietosuoja

- Palvelimen levylle ei tallenneta henkilötietoja (P23). Nimimerkit ovat olemassa vain
  muistissa pelin ajan.
- Ei tunnuksia (P14). Pseudonymisoitu jälkipuinti poistetaan automaattisesti 30 päivän kuluttua.
- Traefikin pääsyloki pois päältä tästä reitistä (`observability.accesslogs=false`, kuten
  telemetriassa), jotta oppilaiden IP-osoitteet eivät tallennu.
- Tietosuojaseloste ja opettajan ohjesivu kuuluvat MVP:hen (P3). Rekisterinpitäjän tiedot ovat
  avoinna (§11).

## 7. Arkkitehtuuri (P21)

```
saari/
  packages/rules/   sääntömoottori + pelidata + tapahtumaloki + Vitest
  packages/bots/    bottistrategiat (simulaattori, testit, kokeilutila)
  packages/sim/     CLI-simulaattori: N peliä × strategiat × pelaajamäärät → raportti
  apps/server/      Node 24 LTS + ws, pelit muistissa, SQLite (pseudonymisoidut jälkipuinnit),
                    30 päivän poistoajo
  apps/client/      Vite + Svelte 5 + PixiJS 8: oppilas-, projektori- ja jälkipuintinäkymät
  deploy/           Dockerfile, compose, novaservun ohjeet
  docs/
```

- **Palvelin päättää kaiken.** Asiakas lähettää aikeita, ja palvelin tarkistaa hinnat,
  rajoitteet, ajastimet ja vuorot.
- **Protokolla:** WebSocket ja JSON. Täysi näkymä liittyessä ja palatessa, muuten tapahtumia.
  Pelaajakohtaiset tiedot lähetetään vain kyseiselle pelaajalle, ja isäntänäkymä saa oman
  näkymänsä.
- **Uudelleenkäynnistys kesken pelin:** pelitila voidaan tallentaa levylle pseudonymisoituna.
  Nimimerkit katoavat, ja oppilaat kirjoittavat ne uudelleen. Tarkennetaan V4:ssä.
- **Testit:** Vitest säännöille, bottipelit WebSocketin yli ja Playwright päästä päähän.

## 8. Grafiikka ja äänet

- Grafiikka: Kenney CC0 -sarjat (P9) isometrisellä neliöruudukolla (P10). Kuvat nimetään
  datassa, joten ne ovat vaihdettavissa.
- **Grafiikkakokeilu:** reunasiirtymät vs. palikkatyyli. Samu valitsee näkemiensä
  vaihtoehtojen perusteella.
- Äänet: CC0-lähteet, soitetaan projektorinäkymästä (P18).

## 9. Julkaisu (P22)

- Yksityinen GitHub-repo `pihatonttu/<nimi>` ja read-only-deploy key novaservulla
  (PrinttiPajan malli).
- Novaservulla: `~/docker/<nimi>/`, `docker-compose.override.yml` (proxy-verkko,
  Traefik-labelit), `.env` mode 600, stackin `README.md`.
- Julkinen A-tietue Cloudflaren API:lla. Kontti käynnistetään vasta, kun DNS on olemassa.
- `alerts.py` tarkistaa sertifikaatin ja kontin automaattisesti Traefik-labelin perusteella.
- Mitään ei pushata eikä julkaista ilman Samun lupaa.

## 10. Vaiheet

| Vaihe | Sisältö | Valmis kun |
|---|---|---|
| V0 ✓ | Tutkimus, suunnitelma, grillaus | tämä dokumentti ja `03-paatokset.md` |
| V1 ✓ | Pelisuunnitteludokumentti `04-pelisuunnittelu.md` ja sen grillaus (P25–P34) | säännöt, kartta, rakennukset, kierrosrakenne ja jälkipuinnin sisältö lukittu |
| V2 ✓ | Sääntömoottori, data ja tapahtumaloki (`packages/rules`, 157 testiä 2026-10-09) | Vitest kattaa jokaisen toiminnon, rakennuksen, kierroksen lopun ja lokin |
| V3 | Botit ja simulaattori, tasapainon viritys | raportti 2/15/30 pelaajalla: hyvä yhteistyö voittaa ja huono häviää |
| V4 | Palvelin: huoneet, ajastimet, tauko, paluu, moderointi, kokeilutila, jälkipuinnin tallennus ja poisto | 30 bottia pelaa koko pelin WebSocketin yli testissä |
| V5 | Grafiikkakokeilu | Samu on valinnut tyylin |
| V6 | Asiakas: oppilas-, projektori- ja jälkipuintinäkymät, nimimerkkisuodatin | Playwright-testi: opettaja ja 3 oppilasta pelaavat pelin läpi |
| V7 | Opettajan ohjesivu, tietosuojaseloste, lopullinen nimi ja domain | tekstit hyväksytty |
| V8 | Julkaisu novaservulle ja valvonta | `https://<nimi>.novanet.fi` toimii, README kirjoitettu |

## 11. MVP:n valmiin määritelmä

- Opettaja luo pelin ja näyttää aulan projektorilla, ja 2–40 oppilasta liittyy koodilla tai
  QR:llä eri laitteilta.
- Peli pelataan alusta loppuun alle 45 minuutissa. Tauko toimii, ja sivun päivitys tai
  laitteen vaihto palauttaa oppilaan peliin.
- Opettaja saa nimellisen jälkipuinnin tulostettavaksi ja pseudonymisoidun linkin, joka
  poistuu 30 päivässä.
- Kokeilutila boteilla toimii.
- Levyllä ei ole yhtään nimimerkkiä. Tämä tarkistetaan testillä, joka tutkii tietokannan
  pelin jälkeen.
- Sääntö-, botti- ja päästä päähän -testit menevät läpi.

## 12. Riskit

- **Kotipalvelin avoimessa koulukäytössä.** Sähkö- tai verkkokatkos kesken oppitunnin on
  opettajalle iso asia, eikä palvelulla ole palvelutasolupausta. Lievennys: `alerts.py`,
  pelitilan tallennus ja opettajan ohjesivulla rehellinen maininta. Ulkoinen
  palvelin on myöhempi vaihtoehto.
- **Kuntien hyväksyntäkäytännöt.** Lievennys: henkilötietoja ei tallenneta (P23), ja
  tietosuojaseloste on selkeä.
- **Tasapaino.** Uudet säännöt viritetään simulaattorilla, eikä alkuperäisiä lukuja ole.
- **Isometriset reunat Kenneyn sarjoilla.** Grafiikkakokeilu ratkaisee tyylin ennen
  käyttöliittymätyötä.
- **Suodattimen aukot.** Opettajan varatyökalut ovat varmistus (P13).

## 13. Lykätyt päätökset

- Lopullinen nimi ja domain: ennen V7:ää (P5).
- Takaraja: ei asetettu (P24).
- Rekisterinpitäjän nimi ja yhteystiedot tietosuojaselosteeseen ja ohjesivulle: ennen V7:ää.
- Pelisääntöjen yksityiskohdat: V1-grillaus.
- Yhteydenotto alkuperäisiin tekijöihin (Eduplus, Jere Linnanen): vapaaehtoinen, Samun
  päätös. Uusi nimi ja oma grafiikka tekevät siitä tarpeettoman.
