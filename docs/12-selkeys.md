# Selkeys: lasten testipelin korjaukset

**Tila: toteutettu 2026-11-04, ei vielä tuotannossa.** Samu testasi peliä lasten kanssa. Lapset eivät nähneet, mikä
vuoro oli menossa, mitä energia maksaa, miksi rakennuksia kannattaa rakentaa eikä mikä pelin
tavoite on. He rakensivat kasvihuoneita koko kartan täyteen, eivätkä koteja voinut enää rakentaa.

Mallikuvat hyväksyi Samu vaihtoehdosta A (sääkello ylhäällä keskellä) palautteineen.

## 1. Umpikuja: kasvihuoneet täyttävät kartan

Kasvihuoneesta ei äänestetä, ja se maksaa 3 energiaa. Iglu vaatii vapaan lumikentän, joten luokka
voi estää kotien rakentamisen jo ensimmäisenä kuukautena. Tämä on suunnitteluvirhe, ei lasten vika
(`10-arktinen.md` §4b: vain laiminlyönti häviää). Botit eivät joutuneet umpikujaan, koska ne
säästävät lumikentän igluille.

- **Pura kasvihuone:** uusi toiminto kasvihuoneruudulla. Sama hinta kuin rakentamisessa
  (`demolishWork: 3`, työkalut nopeuttavat samoin), ei palauta mitään, ja ruudusta tulee lumikenttä.
  Kuka tahansa voi tehdä sen heti ilman äänestystä.
- **Vain kasvihuoneet.** Igluja, koulua, pajaa ja kylätaloa ei voi purkaa (Samu).
- **Varoitus:** kun kasvihuone jättäisi vapaita lumikenttiä enintään `meadowWarningAt: 2`, ruudun
  ponnahdusikkunassa lukee, että iglut tarvitsevat tilaa. Varoitus ei estä rakentamista.
- **Ratkaisu näkyviin:** "Ei vapaata lumikenttää" -kortti sanoo myös "Purkakaa kasvihuone tai
  tutkikaa saarta".

### Rajapinta

```ts
// packages/rules
type ActionKind = ... | 'demolish';
type ActionIntent = 'main' | 'demolish';
game.act(playerId, x, y, intent: ActionIntent = 'main'): ActResult;
interface ActionPreview {
  // nykyiset kentät ennallaan: kuvaavat ruudun pääasiallisen toiminnon
  alternative?: { kind: 'demolish'; available: boolean; reason?: Refusal; yield: Yield };
  freeMeadowsAfter?: number; // vain plow-esikatselussa, kun arvo <= meadowWarningAt
}
// packages/protocol, PROTOCOL_VERSION 3
{ t: 'act'; x: number; y: number; intent?: 'demolish' }
```

Valmis purku: `terrain = 'meadow'`, `stock = 0`, `work = 0`, ja tapahtuma `field-removed`. Palvelimen
ja demopalvelimen `act` välittävät `intent`in. Asiakkaan `session.act(x, y, intent?)`.

## 2. Pelinäkymä

Ylärivi kaikissa pelin vaiheissa, projektorilla sama isompana:

- **Vasemmalla iso otsikko ja alaotsikko:**
  - toimintavuoro: **HOMMIIN!** / Keskustelkaa ja toimikaa yhdessä
  - äänestys: **KYLÄKOKOUS** / Puhukaa ensin, äänestäkää sitten
  - kuukauden vaihde: **KUUKAUSI PÄÄTTYI** / Katsokaa, miten kylällä menee
  - tauko: **TAUKO**
- **Keskellä sääkello:** iso rengas, jonka sisällä on tämän kuun lämpötila ja sekunnit. Rengas on
  aika. Sääkello korvaa erillisen kellon ja lämpötilapillerin.
- **Oikealla ennuste:** "Ensi kuussa −30°" ja kevyt vinkki, joka kertoo mitä tapahtuu eikä määrää:
  - kova pakkanen (≤ −30°): Kova pakkanen: nuotio vie paljon puuta
  - kylmä (−20°, −25°): Kylmä sää: nuotio vie enemmän puuta
  - leuto (≥ −15°): Leuto sää: puuta voi jäädä rakentamiseen
  - viimeinen kuukausi: Juhla tämän kuun lopussa!

Yläkulmissa kartan päällä: vasemmalla varasto (puu/tarve, jää, ruoka/tarve, kodit), oikealla
`Kuukausi 4 / 10` ja tyytyväisyys naamalla (`−9`, `raja −45`). Alareunan tavoitepalkkia ei tule.

**Energia:** iso mittari vasemmassa alakulmassa: "Energiaa 2" ja suuret salamat.

**Toimintonappi:** toiminnon nimi ja sen alla sama merkintä joka kerta:
`−1 ⚡ → +10 [puukuvake]`. Resurssi näkyy pelin omana kuvakkeena. Työssä (tutki, rakenna, pura)
oikealla ovat edistymispallot `●○○`, opiskelussa ja työkaluissa samoin, ja virkistyksessä naama.

## 3. Äänestys ja rakennukset

Kortti kertoo hyödyn heti ilman "Mitä nämä tekevät?" -nappia. Iso rivi kertoo mitä saatte, ja pieni
rivi mitä teidän pitää tehdä. Isolla rivillä ei ole kuvaketta. Rakennus näkyy isona kuvana, ja
parannuksessa näkyvät vanha ja uusi kuva nuolella.

| Kortti | Iso rivi | Pieni rivi |
|---|---|---|
| Pieni iglu | Kotipaikkoja 0 → 3 | Rakennetaan vapaalle lumikentälle. |
| Iglu | Kotipaikkoja 3 → 7 | Pieni iglu kasvaa samalla paikalla. |
| Iso iglu | Kotipaikkoja 7 → 10 | Iglu kasvaa samalla paikalla. |
| Laavu | Tyytyväisyyttä jopa +4 kuussa | Kun vietätte täällä aikaa yhdessä. |
| Kylätalo | Tyytyväisyyttä jopa +4 → +5 kuussa | Kun vietätte täällä aikaa yhdessä. |
| Lumilinna | Tyytyväisyyttä jopa +5 → +10 kuussa | Kun vietätte täällä aikaa yhdessä. |
| Ulkoluokka | Energiaa 3 → 4 joka kuukausi | Kun opiskelet täällä 4 kertaa. |
| Koulu | Opiskelu: 1 → 2 askelta kerralla | Kun opiskelet täällä. |
| Iso koulu | Opiskelu: 2 → 3 askelta kerralla | Kun opiskelet täällä. |
| Työpenkki | Työstä +10 → +13 | Kun teet täällä työkaluja 4 kertaa. |
| Paja | Työkalut: 1 → 2 askelta kerralla | Kun teet täällä työkaluja. |
| Iso paja | Työkalut: 2 → 3 askelta kerralla | Kun teet täällä työkaluja. |
| Ei rakenneta | Puu ja jää säästyvät | Kylä ei saa tässä kuussa mitään uutta. |

Luvut ovat esimerkkejä 20 hengen luokasta ja lasketaan säännöistä, ei kirjoiteta tekstiin. Kotiluvut
ovat esimerkki ensimmäisestä kodista ja sen parannuksista. Kotipaikat ovat koko kylän luvut
(`shelterAfter`), samat kuin yläpalkissa, koska peli pyöristää koko kylän kerralla. Kartalla
rakennuksen ponnahdusikkuna kertoo saman. Otsikon `vote.title` korvaa ylärivin KYLÄKOKOUS.

## 4. Tavoite ja Näin pelataan

- Näkyvä sana on **tyytyväisyys** (ei onnellisuus eikä mieliala). Sisäinen `happiness` pysyy.
- Näin pelataan -osassa on neljä lyhyttä askelta, ja ensimmäinen kertoo tavoitteen: pitäkää kylä
  tyytyväisenä, niin saatte juhlassa tähtiä.

## 5. Kuvat

Kuvat tehdään uudelleen Codexilla (Samu 2026-11-04). Tämä muuttaa päätöstä P59, ja uusi päätös
kirjataan päätöslokiin. Promptit ovat tiedostossa `tools/art/codex-prompts.md`.
