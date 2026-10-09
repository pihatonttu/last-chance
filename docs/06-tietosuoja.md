# Tietosuojaseloste (luonnos)

**Tila: luonnos 2026-10-09.** Hakasulkeissa olevat kohdat täydennetään ennen virallista
julkaisua. Teksti näytetään pelissä sivulla `/tietosuoja`. Kuvaukset vastaavat toteutusta
(P12, P14, P23); jos toteutus muuttuu, tätä päivitetään samassa muutoksessa.

---

## Last Chance -pelin tietosuojaseloste

**Rekisterinpitäjä:** [nimi], [yhteystieto]
**Palvelu:** Last Chance, koululuokille tarkoitettu selainpeli osoitteessa
`https://last-chance.novanet.fi`.

### Lyhyesti

Peli **ei tallenna henkilötietoja**. Oppilaat eivät rekisteröidy, opettajalla ei ole
tunnusta, ja nimimerkit katoavat palvelimelta, kun peli päättyy.

### Mitä tietoja pelissä käsitellään

| Tieto | Mihin | Kauanko |
|---|---|---|
| Oppilaan nimimerkki | Näytetään opettajan näkymässä ja opettajan jälkipuinnissa. Toisille oppilaille nimiä ei näytetä pelin aikana. | Vain palvelimen muistissa pelin ajan. **Ei tallenneta levylle.** |
| Pelin tapahtumat (toiminnot, äänet, kuukausien tulokset) | Pelin kulku ja jälkipuinti | Pelin ajan muistissa. Jälkipuinti tallennetaan **ilman nimimerkkejä** (pelaajat esitetään muodossa "Pelaaja 7") 30 päiväksi. |
| Pelin ja pelaajan tunniste selaimessa (`localStorage`) | Paluu samaan peliin sivun päivityksen jälkeen | Selaimessa, kunnes selaimen tiedot tyhjennetään |
| IP-osoite | Välttämätön tekninen yhteys (HTTPS ja WebSocket) | Ei tallenneta lokeihin. Palvelin ei kirjaa yksittäisiä pyyntöjä. |

### Mitä emme tee

- Emme käytä evästeitä seurantaan, analytiikkaa emmekä mainoksia.
- Peli ei lataa mitään kolmansilta osapuolilta: fontit ja kaikki muu tulevat pelin omalta
  palvelimelta.
- Emme luovuta tietoja kenellekään.

### Opettajan jälkipuinti

Pelin lopussa opettaja saa jälkipuinnin, jossa näkyvät nimimerkit. Se on vain opettajan
selaimessa, ja opettaja voi tulostaa sen tai tallentaa sen omalle laitteelleen. Tallennettu
tai tulostettu versio on koulun vastuulla. Palvelimelle jäävä versio on ilman nimimerkkejä,
siihen pääsee vain pitkällä satunnaisella linkillä, ja se **poistuu automaattisesti 30 päivän
kuluttua**. Opettaja voi poistaa sen heti jälkipuintisivun napista.

### Nimimerkit

Pyydämme, ettei oppilas käytä nimimerkkinään koko oikeaa nimeään. Peli estää kirosanat ja
loukkaavat nimet, ja opettaja voi vaihtaa minkä tahansa nimimerkin satunnaiseksi.

### Palvelin

Palvelin sijaitsee Suomessa. [Ylläpitäjän tiedot.]

### Yhteydenotot

Tietosuojaa koskevat kysymykset: [yhteystieto].
