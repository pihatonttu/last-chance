# Kuvien tuotanto

Pelin kuvat ovat valmiina kansiossa `apps/client/public/art/kenney/`, joten pelin kehittämiseen ei
tarvita mitään tästä. Tämä ohje tarvitaan vain, kun kuvia lisätään tai muutetaan.

Kuvat tulevat Kenneyn CC0-paketeista ja omista Blender-skripteillä tehdyistä malleista (P59).
Tekoälyn generoimaa grafiikkaa ei käytetä. Lähteet on listattu tiedostossa
`apps/client/public/art/kenney/SOURCES.txt`.

## Tarvitset

- **Blender** 4.2 tai uudempi (viimeksi käytetty 5.1). Jos `blender` ei ole polussa, käytä koko polkua.
- **Python 3** ja paketit Pillow ja numpy: `pip install pillow numpy`. Älä käytä `--user`-valitsinta,
  koska skriptit ajetaan valitsimella `python -I`, joka ei näe käyttäjäkohtaisia paketteja.
- **Kenneyn paketit** (kenney.nl/assets). Niitä ei ole repossa. Pura ne yhden kansion alle
  näillä nimillä:

  ```text
  <3d-paketit>/
    survival/     Survival Kit 2.0
    town/         Fantasy Town Kit 2.0
    nature/       Nature Kit
    pirate/       Pirate Kit
  <2d-paketit>/
    towerdefense/ Tower Defense (kartan palikka)
    background/   Background Elements Remastered (sumun pilvet)
  ```

Aja komennot repon juuresta. Renderöinnin tulokset menevät johonkin repon ulkopuoliseen kansioon.

## Kartan kuvat

Yksi kuva on ryhmä malleja yhden ruudun päällä. Kaikki renderöidään samalla kameralla ja valolla
samalle kankaalle, joten ne istuvat Kenneyn 2D-palikoiden päälle.

1. Muokkaa tiedostoa `tools/art/kenney-props-spec.py` ja kirjoita siitä `kenney-props.json`:

   ```bash
   python -I tools/art/kenney-props-spec.py
   ```

2. Jos muutit omia malleja (`tools/art/own-models.py`), rakenna ne kansioon `tools/art/own/`:

   ```bash
   blender -b --factory-startup -P tools/art/own-models.py
   ```

3. Renderöi kaikki kuvat:

   ```bash
   blender -b --factory-startup -P tools/art/render-kenney.py -- tools/art/kenney-props.json <3d-paketit> <tulos>
   ```

   Komennon loppuun voi lisätä kuvien nimiä, jos haluat vain vilkaista muutamaa. Seuraava vaihe
   tarvitsee silti kansioon kaikki speksin kuvat.

4. Kopioi kuvat peliin. Skripti pienentää ne 256 väriin, poistaa kuvat, joita speksissä ei enää
   ole, ja kirjoittaa tiedoston `apps/client/src/map/kenney-props.ts`:

   ```bash
   python -I tools/art/kenney-props-post.py <tulos>
   ```

5. Päivitä etusivun kuva, joka kootaan kartan kuvista:

   ```bash
   python -I tools/art/kenney-hero.py
   ```

Uusi kuva otetaan käyttöön tiedostossa `apps/client/src/map/kenney.ts`. Esilataus syntyy
`kenney-props.ts`-tiedostosta automaattisesti.

**Lumi.** Kuva, jossa on `"snow": true`, saa lunta ylöspäin oleville pinnoille. Osa, jossa on
`"snow": false`, säilyttää värinsä, ja materiaalit `water` ja `glass` eivät saa lunta koskaan.

## Käyttöliittymän kuvakkeet

```bash
blender -b --factory-startup -P tools/art/render-kenney.py -- tools/art/kenney-icons.json <3d-paketit> <tulos-kuvakkeet>
python -I tools/art/kenney-icons-post.py <tulos-kuvakkeet>
```

Kuvakkeet määritellään tiedostossa `tools/art/kenney-icons.json`, ja tulokset menevät kansioon
`apps/client/public/art/kenney/icons/`.

## Palikka ja pilvet

```bash
python -I tools/art/kenney-assets.py <2d-paketit>
python -I tools/art/kenney-arctic-block.py apps/client/public/art/kenney/grass.png
```

Ensimmäinen komento kopioi vihreän palikan ja pilvet, ja toinen tekee palikasta lumisen ja
jäänsinisen. Palikan värit ovat skriptin alussa. Skripti lähtee aina vihreästä alkuperäisestä ja
kieltäytyy käsittelemästä valmista palikkaa, joten jos muutat vain värejä, ota alkuperäinen gitistä:

```bash
git show 8059cc2:apps/client/public/art/kenney/grass.png > vihrea-palikka.png
python -I tools/art/kenney-arctic-block.py vihrea-palikka.png
```

## Lopuksi

Aja `pnpm --filter @saari/client test`. Testi `has a file for every preloaded texture` varmistaa,
että jokaiselle esiladattavalle kuvalle on tiedosto. Katso kartta selaimessa, ja lisää uudet lähteet
tiedostoon `SOURCES.txt`.

Palvelin välimuistittaa kuvat tunniksi. Jos korvaat kuvan samalla nimellä, jo pelanneet laitteet
näyttävät vanhaa kuvaa enintään tunnin ajan, joten julkaisu kannattaa tehdä koulupäivän ulkopuolella.
