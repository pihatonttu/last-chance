# Last Chance: Arctic: kuvien Codex-promptit

Nämä kuvat korvaavat Kenneyn CC0-kuvat ja Blender-kuvat, joten `SOURCES.txt` ja lisenssimerkintä on
päivitettävä integroinnin jälkeen, ja integrointiprompti X tekee sen.

**Oletus Codexista.** Oletan, että Codex tekee kuvat kuvatyökalullaan (`$imagegen`, gpt-image-2).
Se palauttaa läpinäkymättömän PNG:n itse valitsemassaan koossa, eikä aitoa läpinäkyvyyttä tai tarkkaa
pikselikokoa voi pyytää luotettavasti. Siksi jokainen kuvaprompti tuottaa raakakuvan tasaisella
magentalla taustalla, ja skripti `tools/art/codex-art.py` leikkaa kuvan irti, skaalaa sen ja asettaa
sen oikeaan kohtaan. Jos työkalu antaa aidon läpinäkyvyyden, skripti käyttää sitä. Vain maaruutu
piirretään koodilla, koska sen reunojen on osuttava pikselilleen. Valmiit kuvat kulkevat repon
nykyisten skriptien läpi, joten tiedostonimet ja mitat pysyvät ennallaan.

En ole ajanut promptteja Codexissa. Skripti, integroinnin koodimuutokset, testit, tyypit ja
tuotantokäännös on kokeiltu erillisessä kopiossa nykyisillä kuvilla.

## 1. Näin käytät

Kuvia on 47: 31 karttakuvaa, 11 kuvaketta, maaruutu ja 4 pilveä. Etusivun `hero.png` kootaan niistä
skriptillä. Aja promptit tässä järjestyksessä. Kuvakkeet tulevat ensin, jotta näet tyylin muutamasta
tiedostosta ennen kuin kaikki generoidaan.

| Vaihe | Liitä Codexiin | Sen jälkeen |
|---|---|---|
| 1 | **S** (liite lopussa), kerran | Codex kertoo, että kaikki 47 kuvaa puuttuvat. Se on oikein. |
| 2 | **M**, jokaisen session alussa | Codex vastaa `ready`. |
| 3 | **I1, I2, I3, I4** (koti, ruoka, puu, jää) | Avaa `tools/art/codex-out/sheet-icons.png`. **Tässä päätät tyylin.** Jos se ei kelpaa, muuta M:ää ja aja nämä neljä uudelleen. |
| 4 | **I5–I9** (loput kuvakkeet) | Katso `sheet-icons.png`. |
| 5 | **B1** (kodit) | Avaa `tools/art/codex-out/sheet-props.png`. Tässä päätät karttakuvien tyylin ennen muita. |
| 6 | **B2, B3, B4** (koulu, paja, kylätalo) | Katso `sheet-props.png`: erottuvatko rakennukset toisistaan 64 px:n koossa? |
| 7 | **T1–T8** (maasto) | Katso `sheet-props.png`. |
| 8 | **L1, C1** (maaruutu, pilvet) | Pyydä Codexia ajamaan `python -I tools/art/codex-art.py check`. Kaikkien 47 rivin pitää olla `ok`. |
| 9 | **X** (integrointi) | Lue raportti ja tee kohdan 9 tarkistukset. Codex ei kommitoi, vaan sinä kommitoit, kun kuvat kelpaavat. |

Jokainen kuvaprompti ajaa lopuksi skriptin, joka tulostaa `ok` tai `FAIL` ja syyn. Codex yrittää
kuvaa kaksi kertaa uudelleen, ja sitten se pysähtyy. Silloin voit kertoa sille, mitä muuttaa, tai
käyttää kohdan 9 ohjetta yhden kuvan uusimiseen.

Raakakuvat ja välitulokset ovat kansiossa `tools/art/codex-out/`. Se on repon sisällä, koska Codex
kirjoittaa oletuksena vain työkansioonsa. Kansio jättää itsensä gitin ulkopuolelle omalla
`.gitignore`-tiedostollaan, eikä `Dockerfile` kopioi `tools/`-kansiota. Pidä kansio tallessa, koska
kuvien uusiminen tarvitsee kaikki sen kuvat.

Aja kaikki haarassa, jossa tämä tiedosto on. Promptit X ja R eivät tarvitse M:ää. Laske noin 46 kuvan
generointia ja uusinnat päälle.

## 2. Master-prompti M

Liitä tämä ensimmäiseksi jokaisessa Codex-sessiossa.

````text
You are making the pictures for "Last Chance: Arctic", a browser co-op game for school classes in
grades 2-6 (ages 8-12). It plays on an arctic island seen from an isometric camera. In a test game
the children could not tell the buildings apart, so this set is judged on one thing: a child knows
what a picture is at a glance, at small size.

These rules hold for every picture in this session. Do not generate anything yet. Answer "ready".

WORKFLOW
- Use your image generation tool ($imagegen) at its highest quality. One image per file. Never put
  two files in one image and never make a contact sheet.
- Background of every raw image: one flat solid magenta, #FF00FF, edge to edge. No gradient, no
  vignette, no floor, no shadow on it, no drawn checkerboard. If your tool gives real transparency,
  that is fine too. Never use green or white as the background: the art contains both.
- Keep magenta and hot pink out of the object itself.
- Keep the whole object inside the image, with a clear margin on every side. Never crop it.
- Wherever the tool saves the image, copy it to tools/art/codex-out/raw/<name>.png, exact name.
- Run the commands the prompt names and show me their output. If a line says FAIL, generate that
  file again with the fix it asks for and run the commands again, at most twice, then stop and tell
  me what is wrong.
- When a prompt says to use a file as a reference, attach it as an input image so the new picture
  matches it in shapes, palette and line weight.
- While making pictures, do not touch anything under apps/. Do not edit tools/art/codex-art.py. Do
  not commit.
- If tools/art/codex-art.py does not exist, stop and tell me to run Prompt S.

SHARED STYLE
A bright, friendly storybook sticker look: clean flat shapes, as if cut from coloured paper and drawn
with a thick marker. Big simple forms, rounded corners, a little chunky and oversized. Three flat
tones per material: light, mid, dark. No gradients, no texture, no noise, no brush marks, no glossy
highlights, no photo realism, no 3D render look, no voxels, no pixel art.

Read test: the object must be recognisable from its silhouette and main colour when the picture is
64 px wide. Six big shapes beat thirty small ones. Exaggerate the part that says what the thing is
for. Leave out anything that disappears at that size.

CAMERA FOR MAP PICTURES (icons have their own rules)
True 2:1 dimetric projection, the classic isometric game view: orthographic, no perspective at all.
The camera looks 30 degrees down and is turned 45 degrees, so a square on the ground becomes a
diamond twice as wide as it is tall. Ground lines rise 1 px for every 2 px across (26.6 degrees on
the image). Vertical edges stay exactly vertical and parallel edges stay parallel. We see the top,
the left-facing side and the right-facing side of everything.

LIGHT
One light from the upper left, in front of the object. Top faces are brightest (100 %), left-facing
sides 89 %, right-facing sides 68 %. No cast shadows and no shadow under the object.

GROUND
The object stands on nothing. The game puts it on a snow tile, so do not draw a tile, a plinth, a
patch of snow, a ground line or a shadow, unless a prompt asks for something in the ground.

SNOW
Everything on land stands in snow. Upward outdoor surfaces carry a thin white cap with a wavy lower
edge, and the snow never hides what makes the object recognisable.

COLOURS
Outline and darkest line #1D2A33. Snow #F1F6FA, snow shade #C9DCE8. Glacier ice #BFE3F2, ice mid
#78B5D5, ice dark #5A8B9F. Wood #A0663F, wood dark #7A4B2E, cut wood #D9B98C. Spruce #3F7F39 and
#4F9A45. Warm light #FFD166. Fire #F28C28 and #F2C94C. Red #D9403A. The game draws around these
pictures with sea #1F5F86, shore ice #D6ECF7 and ice edge #9CC9E8.

NEVER
No text, letters, digits, runes, logos, emblems, signatures, watermarks, labels, arrows or UI
anywhere, also not on signs, blackboards, flags or crates. A blackboard carries simple chalk
pictures only. No people, no animals, no faces (the mood icons are the only faces). Child-friendly:
nothing scary, no weapons, no injury. Nothing copied from or modelled on any existing game, film,
brand, mascot or named artist. Do not use any picture already in apps/ as a reference.

FILES
Raw images are PNG in any size. Final pictures are 8-bit RGBA PNG with a transparent background;
the scripts make them from the raw images.
````

## 3. Kuvakkeet (ensimmäinen prioriteetti)

Kuvakkeet ovat suunniteltu sarja, eivät pieniä renderöintejä: lihavat, litteät ja yksinkertaiset
muodot ja paksu ääriviiva. Niiden pitää näkyä heti 24–32 px:n koossa sekä valkoisella että tummalla
merellä. Skripti lisää jokaiseen ohuen valkoisen tarrareunan, jonka ansiosta tumma ääriviiva näkyy
myös merellä.

Viisi kuvaketta on jo olemassa (`wood`, `stone`, `food`, `home`, `ship`). Kuusi on uusia ja korvaa
nykyiset SVG:t: `bolt`, `mood-good`, `mood-ok`, `mood-bad`, `thermometer` ja `calendar`.
Integrointiprompti X tekee niiden vaatimat koodimuutokset. `Icon.svelte`:n muut SVG:t (`people`,
`sound`, `mute`, `compass`, `vote`, `ice-hole`) jäävät ennalleen.

### I1: home (Koti)

````text
Make the UI icon `home`. The master rules apply. This is a UI icon, so ignore the map camera.

Raw image: a square image, saved as tools/art/codex-out/raw/home.png.
Game file: apps/client/public/art/kenney/icons/home.png, 96 x 96 px, transparent PNG. The game shows
it at 26 to 64 px, on white cards and on the dark blue sea #1F5F86.

Icon style: a designed icon, not a small render. One bold, flat, simple object seen from the front.
Two to four flat fill colours. A very thick outline in #1D2A33, about 8 % of the icon's width, with
rounded corners. No gradients, no texture, no shadow, no background shape, no tiny details. The
object fills about 85 % of the image and is centred. Flat #FF00FF background. Do not draw a white
edge: the script adds it.

What it shows: a chunky igloo, a low wide dome with one arched doorway in the middle.
The dome must NOT be white: a white igloo vanishes on a white page, which is why the old icon
failed. Fill it with a strong medium blue #4EA6E0, with one lighter blue #A7D8F5 highlight shape on
the upper left and two or three thick dark curved block lines. The doorway glows warm orange-yellow
#FFB52E, as if a lit room is inside, with its own thick dark outline.

When the image is saved, run:
python -I tools/art/codex-art.py fit home
python -I tools/art/codex-art.py check home
python -I tools/art/codex-art.py sheet
````

### I2: food (Ruoka)

````text
Make the UI icon `food`. The master rules apply. This is a UI icon, so ignore the map camera.

Raw image: a square image, saved as tools/art/codex-out/raw/food.png.
Game file: apps/client/public/art/kenney/icons/food.png, 96 x 96 px, transparent PNG. The game shows
it at 24 to 64 px on white cards, over the map and on the dark blue sea #1F5F86.

Icon style: a designed icon, not a small render. One bold, flat, simple object seen from the side.
Two to four flat fill colours. A very thick outline in #1D2A33, about 8 % of the icon's width, with
rounded corners. No gradients, no texture, no shadow, no background shape, no tiny details. The
object fills about 85 % of the image and is centred. Flat #FF00FF background. Do not draw a white
edge: the script adds it.

What it shows: one plump fish in side view, facing right, in warm orange-red #F0643C with a pale
#FFC38A belly, a big forked tail, one top fin and one big round dark eye. It is food, not a
character: no smile. No plate, no bones, no water.

When the image is saved, run:
python -I tools/art/codex-art.py fit food
python -I tools/art/codex-art.py check food
python -I tools/art/codex-art.py sheet
````

### I3: wood (Puu)

````text
Make the UI icon `wood`. The master rules apply. This is a UI icon, so ignore the map camera.

Raw image: a square image, saved as tools/art/codex-out/raw/wood.png.
Game file: apps/client/public/art/kenney/icons/wood.png, 96 x 96 px, transparent PNG. The game shows
it at 20 to 56 px on white cards, over the map and on the dark blue sea #1F5F86.

Icon style: a designed icon, not a small render. One bold, flat, simple object seen from the front.
Two to four flat fill colours. A very thick outline in #1D2A33, about 8 % of the icon's width, with
rounded corners. No gradients, no texture, no shadow, no background shape, no tiny details. The
object fills about 85 % of the image and is centred. Flat #FF00FF background. Do not draw a white
edge: the script adds it.

What it shows: three fat logs stacked in a pyramid, two below and one on top, seen from the end, so
we look at the round cut ends. Bark #A0663F, cut ends a bright #F0C98A with one dark ring each. The
three pale circles are what make it read as wood at 20 px.

When the image is saved, run:
python -I tools/art/codex-art.py fit wood
python -I tools/art/codex-art.py check wood
python -I tools/art/codex-art.py sheet
````

### I4: stone (Jää)

Tiedoston nimi pysyy `stone`, koska koodi käyttää sitä, vaikka pelissä resurssi on jää.

````text
Make the UI icon `stone`. In the game this resource is ice, the file name is only historic. The
master rules apply. This is a UI icon, so ignore the map camera.

Raw image: a square image, saved as tools/art/codex-out/raw/stone.png.
Game file: apps/client/public/art/kenney/icons/stone.png, 96 x 96 px, transparent PNG. The game shows
it at 20 to 56 px on white cards, over the map and on the dark blue sea #1F5F86.

Icon style: a designed icon, not a small render. One bold, flat, simple object in a simple
three-quarter view. Two to four flat fill colours. A very thick outline in #1D2A33, about 8 % of the
icon's width, with rounded corners. No gradients, no texture, no shadow, no background shape, no
tiny details. The object fills about 85 % of the image and is centred. Flat #FF00FF background. Do
not draw a white edge: the script adds it.

What it shows: one chunky block of ice, a cube with rounded corners. Top face #CDEEFB, front face a
strong #5DB8E8, side face #3A8FC7, and one white diagonal glint on the front. It is ice, not rock:
no grey. It must look like a block someone cut, not like a boulder.

When the image is saved, run:
python -I tools/art/codex-art.py fit stone
python -I tools/art/codex-art.py check stone
python -I tools/art/codex-art.py sheet
````

### I5: ship (Jäänmurtaja)

````text
Make the UI icon `ship`. The master rules apply. This is a UI icon, so ignore the map camera.

Raw image: a square image, saved as tools/art/codex-out/raw/ship.png.
Game file: apps/client/public/art/kenney/icons/ship.png, 192 x 192 px, transparent PNG. It is the only
icon at 192 px, because the game shows it from 44 px up to 150 px on the end screen.

Icon style: a designed icon, not a small render. One bold, flat, simple object seen from the side.
Two to four flat fill colours. A very thick outline in #1D2A33, about 6 % of the icon's width, with
rounded corners. No gradients, no texture, no shadow, no background shape, no tiny details. The
object fills about 85 % of the image width and is centred. Flat #FF00FF background. Do not draw a
white edge: the script adds it.

What it shows: an icebreaker in side view, bow to the right. A strong red hull #D9403A with a darker
band at the waterline and a high sharp bow that clearly means breaking ice. A white block of cabins
with two or three dark square windows, one fat yellow funnel #F2C94C with a dark top. No water, no
ice, no flag, no name, no number on the hull.

When the image is saved, run:
python -I tools/art/codex-art.py fit ship
python -I tools/art/codex-art.py check ship
python -I tools/art/codex-art.py sheet
````

### I6: bolt (Energia)

Uusi tiedosto. Korvaa salaman SVG:n tiedostoissa `EnergyMeter.svelte` ja `HowToPlay.svelte`. Käytetty
energia näytetään samasta kuvasta harmaana ja haaleana CSS:llä.

````text
Make the UI icon `bolt`. The master rules apply. This is a UI icon, so ignore the map camera.

Raw image: a square image, saved as tools/art/codex-out/raw/bolt.png.
Game file: apps/client/public/art/kenney/icons/bolt.png, 96 x 96 px, transparent PNG. The game shows
it at 32 to 34 px in a row, on a white panel. Used energy is the same picture greyed out by code, so
the shape alone must carry it.

Icon style: a designed icon, not a small render. One bold, flat, simple object seen from the front.
Two flat fill colours. A very thick outline in #1D2A33, about 8 % of the icon's width, with rounded
corners. No gradients, no texture, no shadow, no background shape, no tiny details. The object fills
about 85 % of the image and is centred. Flat #FF00FF background. Do not draw a white edge: the
script adds it.

What it shows: one fat lightning bolt, the plain zigzag shape, leaning a little to the right, in
yellow #FFCF3F with one lighter #FFE98A stripe along its left edge. The thinnest part of the bolt is
still at least a fifth of its width. Not any known superhero, energy brand or warning sign.

When the image is saved, run:
python -I tools/art/codex-art.py fit bolt
python -I tools/art/codex-art.py check bolt
python -I tools/art/codex-art.py sheet
````

### I7: mood-good, mood-ok, mood-bad (Tyytyväisyys)

Uudet tiedostot. Korvaavat SVG:n tiedostossa `MoodFace.svelte`.

````text
Make the UI icons mood-good, mood-ok and mood-bad. The master rules apply, and these three are the
only faces allowed in the set. These are UI icons, so ignore the map camera. If my message starts
with ONLY <file>, make just that file and use mood-good as the reference.

Raw images: square images, saved as tools/art/codex-out/raw/mood-good.png,
tools/art/codex-out/raw/mood-ok.png and tools/art/codex-out/raw/mood-bad.png.
Game files: apps/client/public/art/kenney/icons/mood-good.png, mood-ok.png and mood-bad.png in the
same folder, each 96 x 96 px, transparent PNG. The game shows them at 24 to 64 px on white panels.

Icon style: designed icons, not small renders. A plain flat circle seen from the front. A very
thick outline in #1D2A33, about 8 % of the icon's width. No gradients, no texture, no shadow, no
background shape. The circle fills about 85 % of the image and is centred. Flat #FF00FF background.
Do not draw a white edge: the script adds it.

What they show: one head, three moods. Make mood-good first, then make the other two from it as the
reference: same circle, same size, same two eyes in the same place. Only the fill and the mouth
change. Two big solid round dark eyes, one thick dark mouth line. No eyebrows, no nose, no cheeks,
no tears, no hair, no tongue, no teeth. Not any existing smiley or emoji design.
- mood-good: fill sunny yellow #FFD166, a wide happy curved smile.
- mood-ok: fill pale yellow #FFE8A3, a straight mouth.
- mood-bad: fill soft red #F4A08C, a downturned mouth. Sad, not angry.

When the images are saved, run:
python -I tools/art/codex-art.py fit mood-good mood-ok mood-bad
python -I tools/art/codex-art.py check mood-good mood-ok mood-bad
python -I tools/art/codex-art.py sheet
````

### I8: thermometer (Pakkanen)

Uusi tiedosto. Korvaa SVG:n tiedostossa `Icon.svelte`.

````text
Make the UI icon `thermometer`. The master rules apply. This is a UI icon, so ignore the map camera.

Raw image: a square image, saved as tools/art/codex-out/raw/thermometer.png.
Game file: apps/client/public/art/kenney/icons/thermometer.png, 96 x 96 px, transparent PNG. The game
shows it at 16 to 52 px on white panels, so it must still read at 16 px.

Icon style: a designed icon, not a small render. One bold, flat, simple object seen from the front.
Two to four flat fill colours. A very thick outline in #1D2A33, about 8 % of the icon's width, with
rounded corners. No gradients, no texture, no shadow, no background shape, no tiny details. The
object fills about 85 % of the image height and is centred. Flat #FF00FF background. Do not draw a
white edge: the script adds it.

What it shows: one fat upright thermometer. A white tube with a rounded top and a big round bulb at
the bottom. Red liquid #E5484D fills the bulb and rises halfway up the tube. Three short thick tick
marks on the right side of the tube. The tube is at least half as wide as the bulb. No numbers and
no scale text.

When the image is saved, run:
python -I tools/art/codex-art.py fit thermometer
python -I tools/art/codex-art.py check thermometer
python -I tools/art/codex-art.py sheet
````

### I9: calendar (Kuukausi)

Uusi tiedosto. Korvaa SVG:n tiedostossa `Icon.svelte`.

````text
Make the UI icon `calendar`. The master rules apply. This is a UI icon, so ignore the map camera.

Raw image: a square image, saved as tools/art/codex-out/raw/calendar.png.
Game file: apps/client/public/art/kenney/icons/calendar.png, 96 x 96 px, transparent PNG. The game
shows it at 22 to 30 px next to the month number.

Icon style: a designed icon, not a small render. One bold, flat, simple object seen from the front.
Two to four flat fill colours. A very thick outline in #1D2A33, about 8 % of the icon's width, with
rounded corners. No gradients, no texture, no shadow, no background shape, no tiny details. The
object fills about 85 % of the image and is centred. Flat #FF00FF background. Do not draw a white
edge: the script adds it.

What it shows: one wall calendar page. A white rounded sheet with a thick red band #D9403A across the
top, two short dark binder rings sticking up through the band, and below it two rows of three solid
blue-grey #8FA3B2 squares. No numbers, no letters, no month name.

When the image is saved, run:
python -I tools/art/codex-art.py fit calendar
python -I tools/art/codex-art.py check calendar
python -I tools/art/codex-art.py sheet
````

## 4. Rakennukset

Lapset eivät erottaneet rakennuksia toisistaan, joten tämä on uusinnan tärkein osa. Jokaisella
rakennustyypillä on oma siluetti ja oma väri, jotka näkyvät 64 px:n koossa. Saman rakennuksen tasot
näyttävät samalta rakennukselta, joka kasvaa, koska niillä on sama tunnus ja väri.

| Rakennus | Siluetti | Väri | Mitä se kertoo |
|---|---|---|---|
| Koti | kupoleita: 1, 2, 3 | lumenvalkoinen, keltainen ovi | kupolit voi laskea: kasvu näkyy |
| Koulu | korkea kellotorni | sininen katto | iso liitutaulu |
| Paja | paksu savupiippu tai työkalutaulu | liuskeenharmaa, oranssi hehku | isot työkalut, alasin |
| Kylätalo | pitkä ja matala, viirinauha | marjanpunainen | istumapaikat yhdessä olemiseen |
| Kasvihuone | lasinen harja | lasi ja kasvien väri | mitä sisällä kasvaa |

**Vähimmäiskoko.** Rakennuksen pitää täyttää suurin osa ruudun 264 px:n leveydestä, koska kortit
näyttävät sen noin 100 px:n kokoisena ja kartta pienempänä. Taulukoissa leveys on 62–86 % ruudusta.
Vain pieni iglu on alle 70 %, koska kotien kasvun pitää näkyä. Skripti hylkää kuvan, joka jää alle
85 %:n taulukon leveydestä.

Vanhat kuvat olivat tätä kapeampia, joten kortit rajaisivat uudet kuvat reunoilta. Integrointi korjaa
tämän tiedostossa `PropPicture.svelte`.

### B1: shelter-1, shelter-2, shelter-3 (Pieni iglu, Iglu, Iso iglu)

Aja tämä ensin. Näistä näet, toimiiko karttakuvien tyyli.

````text
Make the homes of the village, files shelter-1, shelter-2 and shelter-3 (Small igloo, Igloo, Big
igloo). The master rules apply. If my message starts with ONLY <file>, make just that file and use
the other two raw files as references.

Style reminder: 2:1 dimetric view, orthographic, 30 degrees down and turned 45 degrees, verticals
vertical, no perspective. Light from the upper left, right-facing sides darkest. Flat storybook
sticker colours, three tones per material, a thick #1D2A33 outline round the whole silhouette (about
1.5 % of the object's width) and thinner lines inside. Flat #FF00FF background. No ground, no snow
patch, no shadow, no text, no people.

Raw images: portrait, saved as tools/art/codex-out/raw/<file>.png.
Final files: tools/art/codex-out/props/<file>.png, which become
apps/client/public/art/kenney/props/<file>.png, each 320 x 400 px RGBA.
Placement: the tile centre is pixel (160, 330). One tile is a diamond 264 px wide and 132 px tall,
with corners at back (160, 264), right (292, 330), front (160, 396) and left (28, 330). The fit
script centres the object on x = 160 and puts its lowest point at y = 330 + width / 4. So the
footprint must be centred under the object and stay inside the diamond.

| File | Width | Share of the tile | Height limit | Lowest point |
|---|---|---|---|---|
| shelter-1 | 164 px | 62 % | 124 px | y = 371 |
| shelter-2 | 190 px | 72 % | 150 px | y = 378 |
| shelter-3 | 216 px | 82 % | 176 px | y = 384 |

Readable size: the game shows these at about 100 px on cards and smaller on the map, so each must use
its whole width. If one comes out narrow, make it broader, not taller.

What they are for: this is where the class's villagers live. A bigger home houses more people. A
child must be able to count the growth: one dome, two domes, three domes.

All three are the same igloo family: white snow blocks #F1F6FA with clear blue-grey #8FB4CC block
lines, the right-hand side shaded #C9DCE8, an arched tunnel entrance on the front left, with warm
#FFD166 light inside. White alone vanishes on the snow tile, so shade the right side strongly and
keep the outline thick.
- shelter-1: one small dome and one tunnel. Nothing else.
- shelter-2: the same dome, bigger, with one small dome joined to its right side, and one round
  window of blue ice glowing yellow.
- shelter-3: the biggest. One large dome at the back with two smaller domes joined to it, left and
  right, the tunnel in the front, two glowing windows. Seen from above the three domes form a
  triangle, not one big circle, so the footprint fits the diamond tile.

Make shelter-1 first, then use it as the reference for shelter-2, and shelter-2 for shelter-3.

When the images are saved, run:
python -I tools/art/codex-art.py fit shelter-1 shelter-2 shelter-3
python -I tools/art/codex-art.py check shelter-1 shelter-2 shelter-3
python -I tools/art/codex-art.py sheet
````

### B2: school-1, school-2, school-3 (Ulkoluokka, Koulu, Iso koulu)

````text
Make the school, files school-1, school-2 and school-3 (Outdoor class, School, Big school). The
master rules apply. If my message starts with ONLY <file>, make just that file and use the other two
raw files as references.

Style reminder: 2:1 dimetric view, orthographic, 30 degrees down and turned 45 degrees, verticals
vertical, no perspective. Light from the upper left, right-facing sides darkest. Flat storybook
sticker colours, three tones per material, a thick #1D2A33 outline round the whole silhouette (about
1.5 % of the object's width) and thinner lines inside. Flat #FF00FF background. No ground, no snow
patch, no shadow, no text, no people.

Raw images: portrait, saved as tools/art/codex-out/raw/<file>.png.
Final files: tools/art/codex-out/props/<file>.png, which become
apps/client/public/art/kenney/props/<file>.png, each 320 x 400 px RGBA.
Placement: the tile centre is pixel (160, 330). One tile is a diamond 264 px wide and 132 px tall,
with corners at back (160, 264), right (292, 330), front (160, 396) and left (28, 330). The fit
script centres the object on x = 160 and puts its lowest point at y = 330 + width / 4. So the
footprint must be centred under the object, with the corner nearest the viewer at the object's
horizontal centre, and stay inside the diamond.

| File | Width | Share of the tile | Height limit | Lowest point |
|---|---|---|---|---|
| school-1 | 204 px | 77 % | 190 px | y = 381 |
| school-2 | 212 px | 80 % | 222 px | y = 383 |
| school-3 | 224 px | 85 % | 258 px | y = 386 |

Readable size: the game shows these at about 100 px on cards and smaller on the map, so each must use
its whole width. Keep the building broad: if one comes out narrow, make it wider, not taller.

What it is for: children study here and learn to work better. It must shout "school" at 64 px. Two
things say so on all three levels and on no other building: a strong blue roof #2F6DB5, and one big
blackboard, dark green #2F5D50 in a wooden frame, carrying simple white chalk pictures of a sun, a
star and a small house. Absolutely no letters, numbers or scribbles that look like writing. The
board is big enough to be the first thing you see.
- school-1: an outdoor classroom. A blue canvas roof on four wooden posts. The big blackboard stands
  under the back of the roof, its face turned to the viewer. Two rows of low wooden benches face it.
- school-2: a small wooden schoolhouse with the same blue colour on a gabled roof, an open little
  bell tower with a yellow bell on the ridge, a door, and the same blackboard fixed on the left wall.
  One bench in front of it.
- school-3: the same house grown: two storeys, a wider body, three windows in a row, a clearly taller
  bell tower with the same yellow bell, and a bigger blackboard on the left wall. This is the tallest
  building in the game.

The bell tower is the school's silhouette: tall and thin at the top. Do not add a chimney.

Make school-1 first, then use it as the reference for school-2, and school-2 for school-3.

When the images are saved, run:
python -I tools/art/codex-art.py fit school-1 school-2 school-3
python -I tools/art/codex-art.py check school-1 school-2 school-3
python -I tools/art/codex-art.py sheet
````

### B3: workshop-1, workshop-2, workshop-3 (Työpenkki, Paja, Iso paja)

````text
Make the workshop, files workshop-1, workshop-2 and workshop-3 (Workbench, Workshop, Big workshop).
The master rules apply. If my message starts with ONLY <file>, make just that file and use the other
two raw files as references.

Style reminder: 2:1 dimetric view, orthographic, 30 degrees down and turned 45 degrees, verticals
vertical, no perspective. Light from the upper left, right-facing sides darkest. Flat storybook
sticker colours, three tones per material, a thick #1D2A33 outline round the whole silhouette (about
1.5 % of the object's width) and thinner lines inside. Flat #FF00FF background. No ground, no snow
patch, no shadow, no text, no people.

Raw images: portrait, saved as tools/art/codex-out/raw/<file>.png.
Final files: tools/art/codex-out/props/<file>.png, which become
apps/client/public/art/kenney/props/<file>.png, each 320 x 400 px RGBA.
Placement: the tile centre is pixel (160, 330). One tile is a diamond 264 px wide and 132 px tall,
with corners at back (160, 264), right (292, 330), front (160, 396) and left (28, 330). The fit
script centres the object on x = 160 and puts its lowest point at y = 330 + width / 4. So the
footprint must be centred under the object, with the corner nearest the viewer at the object's
horizontal centre, and stay inside the diamond.

| File | Width | Share of the tile | Height limit | Lowest point |
|---|---|---|---|---|
| workshop-1 | 204 px | 77 % | 160 px | y = 381 |
| workshop-2 | 214 px | 81 % | 206 px | y = 384 |
| workshop-3 | 224 px | 85 % | 250 px | y = 386 |

Readable size: the game shows these at about 100 px on cards and smaller on the map, so each must use
its whole width. Keep it broad: workshop-1 is at least as wide as it is tall.

What it is for: the village makes tools here, so all work gets more done. It must shout "tools" at
64 px. Two things say so on all three levels and on no other building: oversized tools, and a dark
slate-grey #56636E roof or board with warm orange #F28C28 forge glow as the accent. The same tool
board comes back on every level: a wooden board with a big hammer and a big saw hanging on it.
The hammer and the saw are huge, far bigger than real ones, so their shapes read at small size.
- workshop-1: a sturdy wooden workbench in the open, with the tool board standing tall behind it, a
  vice on the bench, a stack of cut logs on one side and a few planks on the other. No roof.
- workshop-2: an open shed: a slate roof on thick posts, open at the front. The same bench and tool
  board inside, and a big black anvil on a tree stump at the front, with orange glow from a small
  forge at the back.
- workshop-3: a closed forge: wooden walls, a steep slate roof, one thick stone chimney with two
  round grey smoke puffs on top, big double doors standing open with orange glow inside, the anvil
  outside, and the same tool board on the left wall.

A thick chimney is the workshop's silhouette. Do not add a tower or a bell. The smoke is solid
grey-blue with an outline, not see-through.

Make workshop-1 first, then use it as the reference for workshop-2, and workshop-2 for workshop-3.

When the images are saved, run:
python -I tools/art/codex-art.py fit workshop-1 workshop-2 workshop-3
python -I tools/art/codex-art.py check workshop-1 workshop-2 workshop-3
python -I tools/art/codex-art.py sheet
````

### B4: gathering-1, gathering-2, gathering-3 (Laavu, Kylätalo, Lumilinna)

````text
Make the gathering place, files gathering-1, gathering-2 and gathering-3 (Lean-to, Village hall, Snow
castle). The master rules apply. If my message starts with ONLY <file>, make just that file and use
the other two raw files as references.

Style reminder: 2:1 dimetric view, orthographic, 30 degrees down and turned 45 degrees, verticals
vertical, no perspective. Light from the upper left, right-facing sides darkest. Flat storybook
sticker colours, three tones per material, a thick #1D2A33 outline round the whole silhouette (about
1.5 % of the object's width) and thinner lines inside. Flat #FF00FF background. No ground, no snow
patch, no shadow, no text, no people.

Raw images: portrait, saved as tools/art/codex-out/raw/<file>.png.
Final files: tools/art/codex-out/props/<file>.png, which become
apps/client/public/art/kenney/props/<file>.png, each 320 x 400 px RGBA.
Placement: the tile centre is pixel (160, 330). One tile is a diamond 264 px wide and 132 px tall,
with corners at back (160, 264), right (292, 330), front (160, 396) and left (28, 330). The fit
script centres the object on x = 160 and puts its lowest point at y = 330 + width / 4. So the
footprint must be centred under the object, with the corner nearest the viewer at the object's
horizontal centre, and stay inside the diamond.

| File | Width | Share of the tile | Height limit | Lowest point |
|---|---|---|---|---|
| gathering-1 | 204 px | 77 % | 176 px | y = 381 |
| gathering-2 | 224 px | 85 % | 196 px | y = 386 |
| gathering-3 | 228 px | 86 % | 214 px | y = 387 |

Readable size: the game shows these at about 100 px on cards and smaller on the map, so each must use
its whole width. All three are wide and low: if one comes out narrow, make it wider, not taller.

What it is for: this is where the village spends time together, and that keeps everyone content. It
must say "come and sit together" at 64 px. Three things say so on all three levels and on no other
building: a berry red #B3324F roof or cone, a string of triangular pennants in red, yellow and blue,
and big log benches with bright cushions, many seats side by side. The pennants carry no emblems.
- gathering-1: a Finnish lean-to: a low log shelter with three walls and one sloping berry red roof,
  wide open towards the viewer, a long bench inside and three fat sitting logs with cushions in a
  half circle in front of it. The pennant string runs along the roof edge. No campfire, no flames, no
  smoke, no fire ring: the village fire is a separate picture and must not be confused with this.
- gathering-2: a long, low wooden village hall, clearly longer than it is high, with a berry red
  roof, wide double doors in the middle, warm yellow windows, the pennant string along the eaves and
  a long bench on each side of the doors. No tower and no chimney: it must not look like the school
  or the workshop.
- gathering-3: a snow castle for parties: low ice-blue walls #BFE3F2 with square battlements, two
  round towers with berry red cone roofs, a wide gate with warm yellow light in the middle, the
  pennant string between the towers and benches on both sides of the gate. It is a playful place, not
  a fort: nothing military.

Make gathering-1 first, then use it as the reference for gathering-2, and gathering-2 for gathering-3.

When the images are saved, run:
python -I tools/art/codex-art.py fit gathering-1 gathering-2 gathering-3
python -I tools/art/codex-art.py check gathering-1 gathering-2 gathering-3
python -I tools/art/codex-art.py sheet
````

## 5. Maasto

### T1: field-0, field-1, field-2, field-3 (Kasvihuone)

Kartta vaihtaa kuvaa sadon mukaan: 0 on korjattu, 1–3 kasvaa. Rungon pitää pysyä samana, ettei kuva
hypi.

````text
Make the greenhouse, files field-0, field-1, field-2 and field-3. The master rules apply. If my
message starts with ONLY <file>, make just that file and use field-0 as the reference.

Style reminder: 2:1 dimetric view, orthographic, 30 degrees down and turned 45 degrees, verticals
vertical, no perspective. Light from the upper left, right-facing sides darkest. Flat storybook
sticker colours, three tones per material, a thick #1D2A33 outline round the whole silhouette (about
1.5 % of the object's width) and thinner lines inside. Flat #FF00FF background. No ground, no snow
patch, no shadow, no text, no people.

Raw images: portrait, saved as tools/art/codex-out/raw/<file>.png.
Final files: tools/art/codex-out/props/<file>.png, which become
apps/client/public/art/kenney/props/<file>.png, each 320 x 400 px RGBA.
Placement: the tile centre is pixel (160, 330). One tile is a diamond 264 px wide and 132 px tall,
with corners at back (160, 264), right (292, 330), front (160, 396) and left (28, 330). The fit
script centres the object on x = 160 and puts its lowest point at y = 330 + width / 4. So the
footprint must be centred under the object, with the corner nearest the viewer at the object's
horizontal centre, and stay inside the diamond.

| File | Width | Share of the tile | Height limit | Lowest point |
|---|---|---|---|---|
| field-0, field-1, field-2, field-3 | 218 px | 83 % | 196 px | y = 384 |

What it is for: the village grows its food here. A child must see from the picture how much food is
ready, even at 34 px.

A gabled glass house on a low wooden base: a simple brown frame #7A4B2E with wide panes, and two
raised soil beds inside. The glass is almost clear, a very pale blue tint only, with no reflections,
so that the plants show through as if the glass were hardly there. A thin line of snow on the ridge.
No snow on the plants. No door detail, no pots, no tools.

The four files show the same greenhouse, identical in every line. Only the plants change:
- field-0: harvested. Bare dark soil beds #8F6540, nothing growing.
- field-1: rows of small bright green sprouts #7CBF4A.
- field-2: thick leafy green plants up to half the height of the walls.
- field-3: ripe. Tall green plants full of big red tomatoes #D9403A and yellow-orange fruit #F2C94C,
  so many that the house looks red and green from far away.

Make field-0 first. Make the other three by editing field-0 as the input image: keep the frame, the
glass and the outline exactly as they are and paint only the plants.

When the images are saved, run:
python -I tools/art/codex-art.py fit field-0 field-1 field-2 field-3
python -I tools/art/codex-art.py check field-0 field-1 field-2 field-3
python -I tools/art/codex-art.py sheet
````

### T2: forest-1a, forest-1b, forest-2a, forest-2b, forest-3a, forest-3b (Lumimetsä)

Numero kertoo, kuinka paljon puuta on jäljellä. Kirjain on saman vaiheen toinen muunnelma.

````text
Make the snowy forest, files forest-1a, forest-1b, forest-2a, forest-2b, forest-3a and forest-3b. The
master rules apply. If my message starts with ONLY <file>, make just that file and use forest-3a as
the reference.

Style reminder: 2:1 dimetric view, orthographic, 30 degrees down and turned 45 degrees, verticals
vertical, no perspective. Light from the upper left, right-facing sides darkest. Flat storybook
sticker colours, three tones per material, a thick #1D2A33 outline round the whole silhouette (about
1.5 % of the object's width) and thinner lines inside. Flat #FF00FF background. No ground, no snow
patch, no shadow, no text, no people.

Raw images: portrait, saved as tools/art/codex-out/raw/<file>.png.
Final files: tools/art/codex-out/props/<file>.png, which become
apps/client/public/art/kenney/props/<file>.png, each 320 x 400 px RGBA.
Placement: the tile centre is pixel (160, 330). One tile is a diamond 264 px wide and 132 px tall,
with corners at back (160, 264), right (292, 330), front (160, 396) and left (28, 330). The fit
script centres the group on x = 160 and puts its lowest point at y = 330 + width / 4. So the group
must be centred and all trunks must stand inside the diamond: tall trees at the back, small things
at the front.

| File | Width | Share of the tile | Height limit | Lowest point |
|---|---|---|---|---|
| forest-1a, forest-1b | 176 px | 67 % | 206 px | y = 374 |
| forest-2a, forest-2b | 200 px | 76 % | 206 px | y = 380 |
| forest-3a, forest-3b | 218 px | 83 % | 206 px | y = 384 |

What it is for: the class cuts wood here, and the picture shows how much wood is left. The tallest
tree is the same height in all six, so the forest does not jump when it changes.

Two tree kinds, both dark green with thick white snow on each tier: spruces, wide cones in three
chunky tiers, and pines, tall bare brown trunks with a small snowy crown. Trees are big simple
shapes, about 60 % as wide as they are tall, each with a thick outline.
- forest-3a, forest-3b: full forest. Seven big trees close together and two small saplings at the
  front.
- forest-2a, forest-2b: half cut. Four big trees, one sapling, one fresh tree stump with a pale cut
  top.
- forest-1a, forest-1b: nearly gone. Two big trees, one sapling, and two or three fresh stumps. The
  stumps must be easy to see, because this is the warning that the wood is running out.

The a and b files of one stage have the same number of trees in a different arrangement. Make
forest-3a first and use it as the reference for all the others.

When the images are saved, run:
python -I tools/art/codex-art.py fit forest-1a forest-1b forest-2a forest-2b forest-3a forest-3b
python -I tools/art/codex-art.py check forest-1a forest-1b forest-2a forest-2b forest-3a forest-3b
python -I tools/art/codex-art.py sheet
````

### T3: rock-a, rock-b (Jäätikkö)

````text
Make the glacier, files rock-a and rock-b. The master rules apply. If my message starts with ONLY
<file>, make just that file and use the other raw file as the reference.

Style reminder: 2:1 dimetric view, orthographic, 30 degrees down and turned 45 degrees, verticals
vertical, no perspective. Light from the upper left, right-facing sides darkest. Flat storybook
sticker colours, three tones per material, a thick #1D2A33 outline round the whole silhouette (about
1.5 % of the object's width) and thinner lines inside. Flat #FF00FF background. No ground, no snow
patch, no shadow, no text, no people.

Raw images: landscape, saved as tools/art/codex-out/raw/<file>.png.
Final files: tools/art/codex-out/props/<file>.png, which become
apps/client/public/art/kenney/props/<file>.png, each 320 x 400 px RGBA.
Placement: the tile centre is pixel (160, 330). One tile is a diamond 264 px wide and 132 px tall,
with corners at back (160, 264), right (292, 330), front (160, 396) and left (28, 330). The fit
script centres the object on x = 160 and puts its lowest point at y = 330 + width / 4. So the group
must be centred and stay inside the diamond.

| File | Width | Share of the tile | Height limit | Lowest point |
|---|---|---|---|---|
| rock-a, rock-b | 206 px | 78 % | 150 px | y = 382 |

What it is for: untouched glacier ice, where the class can later open an ice quarry. It must read as
natural ice, not stone and not snow, and it must clearly differ from the quarry, which has straight
cuts. No tools, no cut blocks, no straight edges.

A cluster of big rough ice boulders with angular faces: tops white #F1F6FA, left faces glacier blue
#BFE3F2, right faces deeper blue #78B5D5, with one or two darker cracks. No grey.
- rock-a: one large boulder at the back with two smaller ones in front of it.
- rock-b: two large boulders side by side with one small one at the front.

When the images are saved, run:
python -I tools/art/codex-art.py fit rock-a rock-b
python -I tools/art/codex-art.py check rock-a rock-b
python -I tools/art/codex-art.py sheet
````

### T4: meadow-a, meadow-b, meadow-c (Lumikenttä)

````text
Make the open snow field, files meadow-a, meadow-b and meadow-c. The master rules apply. If my
message starts with ONLY <file>, make just that file and use the other raw files as references.

Style reminder: 2:1 dimetric view, orthographic, 30 degrees down and turned 45 degrees, verticals
vertical, no perspective. Light from the upper left, right-facing sides darkest. Flat storybook
sticker colours, three tones per material, a thick #1D2A33 outline round each piece and thinner lines
inside. Flat #FF00FF background. No ground, no snow patch, no shadow, no text, no people.

Raw images: landscape, saved as tools/art/codex-out/raw/<file>.png.
Final files: tools/art/codex-out/props/<file>.png, which become
apps/client/public/art/kenney/props/<file>.png, each 320 x 400 px RGBA.
Placement: the tile centre is pixel (160, 330). One tile is a diamond 264 px wide and 132 px tall,
with corners at back (160, 264), right (292, 330), front (160, 396) and left (28, 330). The fit
script centres the scattered pieces on x = 160 and puts the lowest piece at y = 330 + width / 4.

| File | Width | Share of the tile | Height limit | Lowest point |
|---|---|---|---|---|
| meadow-a, meadow-b, meadow-c | 150 px | 57 % | 78 px | y = 368 |

What it is for: empty land. New buildings go on these tiles, so the picture must say "free to build
here" by being nearly empty. Keep it quiet and low.

Only a few small separate things, spread wide with plenty of empty space between them, at least
twice as wide as high: two short brown twigs poking out of the snow and two or three small grey
stones with a cap of snow. Each piece is small, at most a quarter of the width. No trees, no bushes,
no flowers, no grass, no snow mound under them.
- meadow-a: two twigs and two stones.
- meadow-b: two twigs and three stones.
- meadow-c: one twig and three stones.

When the images are saved, run:
python -I tools/art/codex-art.py fit meadow-a meadow-b meadow-c
python -I tools/art/codex-art.py check meadow-a meadow-b meadow-c
python -I tools/art/codex-art.py sheet
````

### T5: quarry (Jäälouhos)

````text
Make the ice quarry, file quarry. The master rules apply. If rock-a already exists in
tools/art/codex-out/raw/, use it as the reference for the ice.

Style reminder: 2:1 dimetric view, orthographic, 30 degrees down and turned 45 degrees, verticals
vertical, no perspective. Light from the upper left, right-facing sides darkest. Flat storybook
sticker colours, three tones per material, a thick #1D2A33 outline round the whole silhouette (about
1.5 % of the object's width) and thinner lines inside. Flat #FF00FF background. No ground, no snow
patch, no shadow, no text, no people.

Raw image: landscape, saved as tools/art/codex-out/raw/quarry.png.
Final file: tools/art/codex-out/props/quarry.png, which becomes
apps/client/public/art/kenney/props/quarry.png, 320 x 400 px RGBA.
Placement: the tile centre is pixel (160, 330). One tile is a diamond 264 px wide and 132 px tall,
with corners at back (160, 264), right (292, 330), front (160, 396) and left (28, 330). The fit
script centres the object on x = 160 and puts its lowest point at y = 330 + width / 4. So the group
must be centred and stay inside the diamond.

Size: 206 px wide (78 % of the tile), at most 170 px high, lowest point about y = 382.

What it is for: the class cuts ice here for building igloos. It must read as a working place, not
as a rock. A wall of blue glacier ice at the back, cut into two big steps with straight clean faces.
In front of it a neat stack of four square ice blocks, the same blocks as the ice icon: top #CDEEFB,
front #5DB8E8, side #3A8FC7. Beside the stack a huge pickaxe with a wooden handle leans on the ice,
far bigger than a real one, so its shape reads at 34 px.

When the image is saved, run:
python -I tools/art/codex-art.py fit quarry
python -I tools/art/codex-art.py check quarry
python -I tools/art/codex-art.py sheet
````

### T6: spring (Kuuma lähde)

````text
Make the hot spring, file spring. The master rules apply.

Style reminder: 2:1 dimetric view, orthographic, 30 degrees down and turned 45 degrees, verticals
vertical, no perspective. Light from the upper left, right-facing sides darkest. Flat storybook
sticker colours, three tones per material, a thick #1D2A33 outline round the whole silhouette (about
1.5 % of the object's width) and thinner lines inside. Flat #FF00FF background. No shadow, no text,
no people. The pool is the one thing here set into the ground, so draw its rim, but no other ground
and no tile.

Raw image: portrait, saved as tools/art/codex-out/raw/spring.png.
Final file: tools/art/codex-out/props/spring.png, which becomes
apps/client/public/art/kenney/props/spring.png, 320 x 400 px RGBA.
Placement: the tile centre is pixel (160, 330). One tile is a diamond 264 px wide and 132 px tall,
with corners at back (160, 264), right (292, 330), front (160, 396) and left (28, 330). The fit
script centres the object on x = 160 and puts its lowest point at y = 330 + width / 4. So the pool
must be an oval twice as wide as it is deep, stay inside the diamond and be centred under the steam.

Size: 220 px wide (83 % of the tile), at most 196 px high with the steam, lowest point about y = 385.

What it is for: a warm place in the frozen island where the class bathes and cheers up. It is a rare
find on the map, so it should look like a treasure. An oval pool of bright warm turquoise water
#4FC3E0, ringed by round dark grey stones and low snow banks, with a short wooden step going into
the water at the front. Three tall fat puffs of steam rise from the water, each a solid white shape
with a pale blue shade and an outline, so they show on the snow. The steam is what says "hot". No
fish, no boat, no ice on the water.

When the image is saved, run:
python -I tools/art/codex-art.py fit spring
python -I tools/art/codex-art.py check spring
python -I tools/art/codex-art.py sheet
````

### T7: fire (Kylän nuotio)

````text
Make the village fire, file fire. The master rules apply.

Style reminder: 2:1 dimetric view, orthographic, 30 degrees down and turned 45 degrees, verticals
vertical, no perspective. Light from the upper left, right-facing sides darkest. Flat storybook
sticker colours, three tones per material, a thick #1D2A33 outline round the whole silhouette (about
1.5 % of the object's width) and thinner lines inside. Flat #FF00FF background. No ground, no snow
patch, no shadow, no text, no people.

Raw image: portrait, saved as tools/art/codex-out/raw/fire.png.
Final file: tools/art/codex-out/props/fire.png, which becomes
apps/client/public/art/kenney/props/fire.png, 320 x 400 px RGBA.
Placement: the tile centre is pixel (160, 330). One tile is a diamond 264 px wide and 132 px tall,
with corners at back (160, 264), right (292, 330), front (160, 396) and left (28, 330). The fit
script centres the object on x = 160 and puts its lowest point at y = 330 + width / 4. So the fire
must be centred and stay inside the diamond.

Size: 176 px wide (67 % of the tile), at most 190 px high, lowest point about y = 374.

What it is for: the heart of the game. The whole village keeps warm by this fire on the landing tile,
and the class has to feed it wood every month. It must read as a big, friendly, burning fire at 64
px. A bonfire of fat logs leaning together in a cone, on a ring of dark grey stones, with huge simple
flames rising through the logs: outer flame #F28C28, inner flame #F2C94C, and a few big sparks. The
flames make up at least half of the height. No pot, no stick, no smoke.

When the image is saved, run:
python -I tools/art/codex-art.py fit fire
python -I tools/art/codex-art.py check fire
python -I tools/art/codex-art.py sheet
````

### T8: boat (Vene)

Vene on ainoa kuva, joka ei seiso maaruudulla. Peli piirtää sen rantajäälle ruudun alemmas.

````text
Make the rowing boat, file boat. The master rules apply. This is the one picture with no snow on it.

Style reminder: 2:1 dimetric view, orthographic, 30 degrees down and turned 45 degrees, verticals
vertical, no perspective. Light from the upper left, right-facing sides darkest. Flat storybook
sticker colours, three tones per material, a thick #1D2A33 outline round the whole silhouette (about
1.5 % of the object's width) and thinner lines inside. Flat #FF00FF background. No ground, no water,
no ice, no shadow, no text, no people.

Raw image: landscape, saved as tools/art/codex-out/raw/boat.png.
Final file: tools/art/codex-out/props/boat.png, which becomes
apps/client/public/art/kenney/props/boat.png, 320 x 400 px RGBA.
Placement: the tile centre is pixel (160, 330). One tile is a diamond 264 px wide and 132 px tall,
with corners at back (160, 264), right (292, 330), front (160, 396) and left (28, 330). The fit
script centres the object on x = 160 and puts its lowest point at y = 330 + width / 4. The game draws
this sprite 50 px lower than the others, on pale shore ice #D6ECF7, with no tile under it.

Size: 196 px wide (74 % of the tile), at most 140 px high, lowest point about y = 379.

What it is for: the boat that brought the class ashore. It lies on the shore ice next to the village
fire. A wooden rowing boat lying along the diagonal of the tile, seen from above and the side, so we
look into it: a strong red-orange hull #E4633A with a dark rim, pale wooden benches inside, two oars
resting across it and one wooden crate on board. The hull must not be white or pale blue: it lies on
pale ice.

When the image is saved, run:
python -I tools/art/codex-art.py fit boat
python -I tools/art/codex-art.py check boat
python -I tools/art/codex-art.py sheet
````

## 6. Maaruutu ja pilvet

### L1: grass (Maaruutu)

Tiedoston nimi pysyy `grass`, koska koodi käyttää sitä. Tämä on ainoa kuva, joka piirretään koodilla:
kuvamalli ei osaa osua timantin reunoihin pikselilleen, ja reunat näkyisivät kartalla saumoina.

````text
Make the land block, file grass. The master rules for colours and "never" apply. This picture is
drawn by code, not by the image tool, because every tile of the map must join its neighbours exactly.

Write a short Python script tools/art/codex-out/draw_block.py using Pillow, and run it with
python -I tools/art/codex-out/draw_block.py
Draw at 4 x size and shrink with LANCZOS, so the edges are smooth.

Output: tools/art/codex-out/block/grass.png, which becomes apps/client/public/art/kenney/grass.png,
exactly 132 x 99 px RGBA, transparent outside the block. The game puts pixel (66, 33) on the tile
centre, so the top diamond is the tile. The block fills the whole 132 px width: one map tile.

Exact shapes in final pixels:
- Top diamond: (66, 0), (132, 33), (66, 66), (0, 33). Flat snow (235, 240, 244).
- Left side: (0, 33), (66, 66), (66, 99), (0, 66). Flat ice blue (120, 181, 213).
- Right side: (66, 66), (132, 33), (132, 66), (66, 99). Flat ice blue in shade (90, 139, 159).

Details, quiet ones only:
- Keep the top diamond one flat colour with no lines, marks or outline. The game multiplies this
  block by a slight tint per tile and a grey tint for fog, and any mark would repeat all over the
  island as a pattern. It must stay near-white.
- No dark outline anywhere: neighbouring blocks must join with no visible grid.
- On each side, a snow lip hanging down from the top edge: a white band of the top's colour, 3 px
  deep, with a gently wavy lower edge up to 6 px deep. Use the same wave on both sides, mirrored.
- On each side, two thin horizontal strata lines following the slope of the side, a little lighter
  than the side, broken in two or three places.
- Keep the pixels (20, 60) and (110, 60) in the plain side colour.

Run:
python -I tools/art/codex-art.py check grass
````

### C1: cloud-1, cloud-2, cloud-3, cloud-4 (Sumun pilvet)

````text
Make the clouds that hide unexplored land, files cloud-1, cloud-2, cloud-3 and cloud-4. The master
rules apply, with one exception: no outline. If my message starts with ONLY <file>, make just that
file and use the other raw files as references.

Raw images: landscape, saved as tools/art/codex-out/raw/<file>.png. Flat #FF00FF background.
Final files: tools/art/codex-out/clouds/<file>.png, which become
apps/client/public/art/kenney/clouds/<file>.png, RGBA with a transparent background, in exactly
these sizes. The script resizes the cloud to fill the whole file:

| File | Size |
|---|---|
| cloud-1 | 203 x 121 px |
| cloud-2 | 196 x 156 px |
| cloud-3 | 216 x 139 px |
| cloud-4 | 250 x 146 px |

How the game uses them: a cloud covers each hidden tile, shrunk to 55 %, a little wider than the
tile. Many overlap into one sheet of fog, and some are mirrored. A dark outline would turn that sheet
into a pile of stickers, so there is no outline at all.

What they show: one fluffy, rounded, friendly cloud made of five to seven soft bumps, no flat bottom,
seen from the side. Body very pale blue-white #F0F9FB, with one simple flat band of pale blue #D7F0F6
along the underside. Solid and fully opaque inside. Four clearly different shapes. No sky, no sun, no
rain, no face.

When the images are saved, run:
python -I tools/art/codex-art.py fit cloud-1 cloud-2 cloud-3 cloud-4
python -I tools/art/codex-art.py check cloud-1 cloud-2 cloud-3 cloud-4
````

## 7. Kattavuus

Kaikki tiedostot on laskettu. Skriptin `check` käy samat 47 tiedostoa läpi.

| Prompti | Tiedostot | Määrä |
|---|---|---|
| I1 | `icons/home` | 1 |
| I2 | `icons/food` | 1 |
| I3 | `icons/wood` | 1 |
| I4 | `icons/stone` | 1 |
| I5 | `icons/ship` | 1 |
| I6 | `icons/bolt` (uusi) | 1 |
| I7 | `icons/mood-good`, `mood-ok`, `mood-bad` (uudet) | 3 |
| I8 | `icons/thermometer` (uusi) | 1 |
| I9 | `icons/calendar` (uusi) | 1 |
| B1 | `props/shelter-1`, `shelter-2`, `shelter-3` | 3 |
| B2 | `props/school-1`, `school-2`, `school-3` | 3 |
| B3 | `props/workshop-1`, `workshop-2`, `workshop-3` | 3 |
| B4 | `props/gathering-1`, `gathering-2`, `gathering-3` | 3 |
| T1 | `props/field-0`, `field-1`, `field-2`, `field-3` | 4 |
| T2 | `props/forest-1a`, `forest-1b`, `forest-2a`, `forest-2b`, `forest-3a`, `forest-3b` | 6 |
| T3 | `props/rock-a`, `rock-b` | 2 |
| T4 | `props/meadow-a`, `meadow-b`, `meadow-c` | 3 |
| T5 | `props/quarry` | 1 |
| T6 | `props/spring` | 1 |
| T7 | `props/fire` | 1 |
| T8 | `props/boat` | 1 |
| L1 | `grass` | 1 |
| C1 | `clouds/cloud-1`, `cloud-2`, `cloud-3`, `cloud-4` | 4 |
| | **Yhteensä: 31 karttakuvaa, 11 kuvaketta, maaruutu ja 4 pilveä** | **47** |
| X | `hero.png`, koostetaan skriptillä `kenney-hero.py` | (+1) |

## 8. Integrointiprompti X

Aja tämä, kun `check` näyttää 47 ok. Prompti tarvitsee koodimuutoksia, koska uudet kuvakkeet korvaavat
SVG:itä ja rakennukset ovat aiempaa leveämpiä.

````text
Integrate the new pictures of "Last Chance: Arctic" into this repo. Work through the steps in order.
Stop at the first step that fails and report it. Do not change a picture or weaken a test to get past
a failure. Do not commit. Line numbers may have moved, so find code by its content. If a component has
been rewritten and an edit no longer fits, make the same change in its new form and say so in your
report.

Keep every name with "kenney" in it (public/art/kenney/, kenney-props.ts, kenney.ts, the kenney-*.py
scripts) and the file name grass.png: the code and the server's cache rule use them. Do not run
render-kenney.py, kenney-assets.py, kenney-arctic-block.py or own-models.py: they need Blender or
Kenney packs, and kenney-arctic-block.py refuses anything but the old green block.

STEP 1: preconditions
Run python -I -c "import PIL, numpy; print('ok')". If it fails, run pip install pillow numpy, without
--user, because python -I cannot see user packages.
Run python -I tools/art/codex-art.py check. Every one of the 47 lines must say ok. If not, stop and
list the failures.
Run git check-ignore tools/art/codex-out/raw/home.png. It must print the path.

STEP 2: keep wide sprites whole on the cards
The new sprites fill more of the tile, and PropPicture crops by height alone, so it would cut their
sides off.
In tools/art/kenney-props-post.py:
- under the line tops = {} add reach = {}
- after tops[name] = origin_y - top_row add
    box = alpha.point(lambda a: 255 if a > 8 else 0).getbbox()
    reach[name] = max(origin_x - box[0], box[2] - origin_x)
- at the end of the lines list, after the PROP_TOPS block's closing '};' and '', add
    '/** How far each sprite reaches sideways from the tile centre, in sprite pixels (card cropping). */',
    'export const PROP_REACH: Readonly<Record<string, number>> = {',
    *[f"  '{name}': {value}," for name, value in reach.items()],
    '};',
    '',
In apps/client/src/components/PropPicture.svelte import PROP_REACH from ../map/kenney-props.ts as well,
and change the box calculation to
    const reach = PROP_REACH[name] ?? PROP_CANVAS.originX;
    const box = Math.min(PROP_CANVAS.width, Math.max(150, bottom - (PROP_CANVAS.originY - top) + 18, 2 * reach + 12));

STEP 3: use the six new icons
In tools/art/kenney-icons.json add these to "sprites", so that the post script handles them:
    { "name": "bolt", "parts": [] }, { "name": "mood-good", "parts": [] }, { "name": "mood-ok", "parts": [] },
    { "name": "mood-bad", "parts": [] }, { "name": "thermometer", "parts": [] }, { "name": "calendar", "parts": [] }

apps/client/src/components/ArtIcon.svelte:
- add 'bolt', 'mood-good', 'mood-ok', 'mood-bad', 'thermometer' and 'calendar' to ArtIconName
- add an optional prop label = '' (label?: string) and change alt="" to alt={label}
- replace the comment "rendered from the same Kenney models as the map" with a line saying the icons
  come from tools/art/codex-prompts.md

apps/client/src/components/MoodFace.svelte: replace the svg, and the fill and mouth constants, with
    import ArtIcon from './ArtIcon.svelte';
    const icon = $derived(`mood-${kind}` as const);
    <ArtIcon name={icon} {size} label={t(`mood.${kind}`)} />
Keep the kind constant and the mood thresholds as they are.

apps/client/src/components/EnergyMeter.svelte: import ArtIcon and replace the svg in the #each with
    <span class="bolt" class:full><ArtIcon name="bolt" size={46} /></span>
Replace the .bolt, .bolt path and .bolt.full path styles with
    .bolt { display: inline-flex; width: 46px; height: 46px; }
    .bolt :global(img) { width: 100%; height: 100%; }
    .bolt:not(.full) { filter: grayscale(1); opacity: 0.35; }
Keep the phone rule that makes .bolt 36 px.

apps/client/src/components/GainChip.svelte: this is the action button's "-1 energy" pill. Import
ArtIcon, replace the bolt svg with <ArtIcon name="bolt" size={20} /> and remove the .bolt and .bolt path
styles.

apps/client/src/components/HowToPlay.svelte: replace the bolt svg with
    <ArtIcon name="bolt" size={32} />
and remove the .bolts svg and .bolts path styles. Then search apps/client/src for the path
"M13.5 1.5" and replace any other copy of the bolt the same way.

apps/client/src/components/Icon.svelte: keep the names 'thermometer' and 'calendar' in IconName, so
that no call site changes, and remove their two svg branches. Wrap the svg like this:
    {#if name === 'thermometer' || name === 'calendar'}
      <img class="icon" src="{import.meta.env.BASE_URL}art/kenney/icons/{name}.png" width={size} height={size} alt="" draggable="false" />
    {:else}
      <svg ...>...</svg>
    {/if}

CSS that targeted the old mood svg:
- apps/client/src/components/TopBar.svelte: change .mood :global(svg[role='img']) to .mood :global(.art-icon)
- apps/client/src/components/MonthSummary.svelte: delete the selector line .tile :global(svg[role='img']),

Tests in apps/client/test/views.test.ts that looked at the old svg:
- in "draws the warmth tile with the village fire's own picture", change the not.toContain line to
  expect(body).not.toContain('icons/thermometer.png');
- in "the giving-up face is a picture only", change the regular expression's end from
  <svg[^>]*role="img"/ to <img[^>]*icons\/mood-bad\.png/

Tests in apps/client/test/hud.test.ts count the energy bolts with body.match(/<svg/g). Count
icons/bolt.png instead. The count of bolts itself must stay the same.
If another test fails only because it looks for the old svg markup of a bolt or a face, change that
assertion to the new picture and list it in your report. Never change what a test expects of the game.

STEP 4: install the pictures, in this order
python -I tools/art/kenney-props-post.py tools/art/codex-out/props
python -I tools/art/kenney-icons-post.py tools/art/codex-out/icons
python -I tools/art/codex-art.py install
python -I tools/art/kenney-hero.py
Then look at apps/client/public/art/kenney/hero.png. If it is not 640 x 363 px, set the img height in
apps/client/src/views/Home.svelte to its real height. The width stays 640.

STEP 5: verify the files in the game folder
With a short Python check, confirm under apps/client/public/art/kenney/:
- props/ holds exactly the 31 sprite names of tools/art/kenney-props.json, each 320 x 400 px with
  transparency and transparent corners
- icons/ holds 11 files: wood, stone, food, home, bolt, mood-good, mood-ok, mood-bad, thermometer and
  calendar at 96 x 96 px, ship at 192 x 192 px, each with transparent corners
- clouds/ holds cloud-1 203 x 121, cloud-2 196 x 156, cloud-3 216 x 139, cloud-4 250 x 146
- grass.png is 132 x 99 px and hero.png is 640 px wide
- apps/client/src/map/kenney-props.ts still has width 320, height 400, originX 160, originY 330 and
  tilePx 264, and has both PROP_TOPS and PROP_REACH with 31 entries
Report the total size of the folder and any single file over 60 KB. These pictures go over school
networks.

STEP 6: sources and licence
The Kenney and Blender art is gone, so update what says otherwise. Write these in Finnish where the
file is Finnish, and use the next free P number where it says P<n>: read the last row of
docs/03-paatokset.md.
- apps/client/public/art/kenney/SOURCES.txt: replace the whole file with a short note: the game's
  pictures were made on today's date with OpenAI Codex image generation from the prompts in
  tools/art/codex-prompts.md, cut out and placed by tools/art/codex-art.py; grass.png is
  drawn by code; hero.png is composed by tools/art/kenney-hero.py; no Kenney art remains; the folder
  keeps the name kenney because the code and the server's cache rule use it. Name the image model if
  your tool reports it.
- Delete apps/client/public/art/kenney/LICENSE-kenney.txt.
- README.md, section Lisenssi: replace the sentence about Kenney's CC0 packs and its link with:
  Pelin kuvat on tehty OpenAI Codexin kuvatyökalulla (lähteet:
  [`SOURCES.txt`](apps/client/public/art/kenney/SOURCES.txt)).
- CLAUDE.md, rule 6: replace it with:
  6. **Kuvat tehdään OpenAI Codexilla promptien `tools/art/codex-prompts.md` pohjalta** (P<n>). Ei
     mitään alkuperäisen pelin materiaalia eikä muiden pelien tai brändien jäljitelmiä.
- CONTRIBUTING.md, section Kuvat ja äänet: replace the first sentence with:
  Kuvat tehdään OpenAI Codexilla promptien `tools/art/codex-prompts.md` pohjalta (P<n>), eikä
  alkuperäisen pelin materiaalia käytetä.
- tools/art/README.md: replace the paragraph that starts "Kuvat tulevat Kenneyn" with one saying that
  the pictures are made with the prompts in codex-prompts.md and tools/art/codex-art.py. Add a short
  section on redoing a picture (prompt, fit, check, the commands of STEP 4). Mark the existing Blender
  and Kenney sections as the old pipeline, no longer in use.
- docs/03-paatokset.md: add a row:
  | <n> | 2026-11-04 | Kuvat Codexilla (muuttaa P9:ää ja P59:ää) | **Kaikki pelin kuvat tehdään uudelleen OpenAI Codexilla** (`tools/art/codex-prompts.md`), ja Kenneyn CC0-kuvat ja Blender-mallit poistuvat pelistä. Kielto käyttää alkuperäisen pelin grafiikkaa pysyy. | Samun valinta 2026-11-04: lasten testipelissä rakennuksia ei erotettu toisistaan (`12-selkeys.md` §5). |
- docs/README.md: change the range P1–P59 to end at P<n>.

STEP 7: tests
If node_modules is missing, run pnpm install --frozen-lockfile.
pnpm --filter @saari/client test
pnpm typecheck

STEP 8: report
Do not commit. Report:
- each step: passed or failed, with the error if it failed
- the output of git status --short, which must not list tools/art/codex-out
- anything you had to change beyond these instructions
- the total art size and any file over 60 KB
````

## 9. Tarkista silmällä

Ennen kuin hyväksyt sarjan:

- **Kuvakkeet:** avaa `tools/art/codex-out/sheet-icons.png`. Tunnistatko jokaisen 24 px:n koossa sekä
  valkoisella että merellä? Näkyykö koti valkoisella?
- **Rakennukset:** avaa `tools/art/codex-out/sheet-props.png`. Peitä nimet. Erotatko 64 px:n koossa
  koulun, pajan ja kylätalon? Parasta on kysyä lapselta.
- **Tasot:** näyttääkö jokainen rakennus samalta rakennukselta, joka kasvaa? Näkyvätkö kodeissa 1, 2
  ja 3 kupolia?
- **Laavu:** ei tulta, ei savua.
- **Teksti:** kuvamalli piirtää helposti kirjainten näköisiä viivoja. Katso liitutaulut ja viirit
  suurennettuna.
- **Kulma ja valo:** ovatko pystyviivat pystyssä ja maalinjat samassa 2:1-kulmassa joka kuvassa? Onko
  oikea kylki aina tummin? Eikö maassa ole varjoja?
- **Vaiheet:** onko kasvihuoneen runko sama kaikissa neljässä kuvassa? Ovatko metsän puut samankokoisia
  joka vaiheessa?
- **Kartta:** aja `pnpm --filter @saari/client dev` ja avaa `http://localhost:5173/?mock=1`. Liittyvätkö
  ruudut saumatta? Peittääkö sumu saaren? Leikkautuuko jokin kuva etureunasta? Onko vene rantajäällä?
- **Kortit ja etusivu:** näkyvätkö rakennukset kokonaan äänestyskorteissa? Näyttääkö etusivun kuva
  hyvältä?

Palvelin välimuistittaa kuvat tunniksi, joten julkaise koulupäivän ulkopuolella.

**Yhden kuvan uusiminen.** Liitä M, ja sen jälkeen kuvan oma prompti. Ryhmäpromptissa kirjoita
ensimmäiselle riville `ONLY shelter-2`. Voit lisätä perään, mikä kuvassa pitää muuttaa. Kun kuva on
hyvä, liitä prompti R. Se tarvitsee kaikki muutkin kuvat kansiosta `tools/art/codex-out/`.

````text
Install the redone pictures of "Last Chance: Arctic". Do not commit.
python -I tools/art/codex-art.py check
Every line must say ok. Then run:
python -I tools/art/kenney-props-post.py tools/art/codex-out/props
python -I tools/art/kenney-icons-post.py tools/art/codex-out/icons
python -I tools/art/codex-art.py install
python -I tools/art/kenney-hero.py
pnpm --filter @saari/client test
Report any failure and the output of git status --short.
````

## Liite: asennusprompti S

Aja tämä kerran. Prompti lisää repoon tiedoston `tools/art/codex-art.py`, joka tekee raakakuvista
pelin kuvat. Skripti on kokeiltu, joten Codexin ei pidä muuttaa sitä. Tiedosto kuuluu kommitoida
kuvien mukana.

````text
Create the file tools/art/codex-art.py with exactly the content between the two lines of ======.
Do not change, reformat or improve it. Then run these and show me the output:

python -I -c "import PIL, numpy; print('ok')"
python -I tools/art/codex-art.py check
git check-ignore tools/art/codex-out/raw/home.png

If the first one fails, run pip install pillow numpy without --user, because python -I cannot see
user packages, and try again. The second must list 47 lines of FAIL ... missing and end with "0 ok, 47
failed": that is correct at this point. The third must print the path. Do not commit.

======
"""Turn raw Codex images into the game's picture files, and check them.

Run from the repo root:
  python -I tools/art/codex-art.py fit NAME [NAME ...]   raw/NAME.png -> props/, icons/ or clouds/
  python -I tools/art/codex-art.py check [NAME ...]      size, alpha and placement of every picture
  python -I tools/art/codex-art.py sheet                 sheet-icons.png, sheet-props.png for the eye
  python -I tools/art/codex-art.py install               block and clouds into the client

The work folder tools/art/codex-out/ ignores itself in git. A raw image is opaque on flat
magenta (the exact shade is read from its border) or has real alpha; any size is fine. Map sprites
land on the 320 x 400 canvas with the tile centre at (160, 330): the picture is centred on
x = 160 and its bottom row is y = 330 + width / 4, where an object centred on the tile ends.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.dont_write_bytecode = True  # no __pycache__ in tools/art
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)  # python -I leaves this folder off the path
from palette import quantize  # noqa: E402

OUT = os.path.join(HERE, 'codex-out')
ART = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'apps', 'client', 'public', 'art', 'kenney')
for folder in ('raw', 'props', 'icons', 'clouds', 'block'):
    os.makedirs(os.path.join(OUT, folder), exist_ok=True)
with open(os.path.join(OUT, '.gitignore'), 'w', encoding='utf-8') as f:
    f.write('*\n')

W, H, OX, OY, TILE = 320, 400, 160, 330, 264
SEA = (31, 95, 134)  # --map-sea
# name: (width on the canvas, height limit), in sprite pixels
PROPS = {
    'shelter-1': (164, 124), 'shelter-2': (190, 150), 'shelter-3': (216, 176),
    'school-1': (204, 190), 'school-2': (212, 222), 'school-3': (224, 258),
    'workshop-1': (204, 160), 'workshop-2': (214, 206), 'workshop-3': (224, 250),
    'gathering-1': (204, 176), 'gathering-2': (224, 196), 'gathering-3': (228, 214),
    'field-0': (218, 196), 'field-1': (218, 196), 'field-2': (218, 196), 'field-3': (218, 196),
    'forest-1a': (176, 206), 'forest-1b': (176, 206), 'forest-2a': (200, 206), 'forest-2b': (200, 206),
    'forest-3a': (218, 206), 'forest-3b': (218, 206),
    'rock-a': (206, 150), 'rock-b': (206, 150),
    'meadow-a': (150, 78), 'meadow-b': (150, 78), 'meadow-c': (150, 78),
    'quarry': (206, 170), 'spring': (220, 196), 'fire': (176, 190), 'boat': (196, 140),
}
ICONS = ('home', 'food', 'wood', 'stone', 'ship', 'bolt', 'mood-good', 'mood-ok', 'mood-bad', 'thermometer', 'calendar')
ICON_CANVAS, ICON_ART, KEYLINE = 512, 440, 14  # the blur radius that leaves about 19 px of white
CLOUDS = {'cloud-1': (203, 121), 'cloud-2': (196, 156), 'cloud-3': (216, 139), 'cloud-4': (250, 146)}


def cutout(path):
    """The raw image as RGBA, without its background and cropped to the picture."""
    if not os.path.exists(path):
        sys.exit(f'missing raw image: {path}')
    px = np.asarray(Image.open(path).convert('RGBA')).astype(float)
    if (px[..., 3] < 128).mean() < 0.02:  # opaque: key out the flat magenta of the border
        rgb = px[..., :3]
        border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
        key = np.median(border, axis=0)
        flat = (np.abs(border - key).max(axis=1) > 30).mean() < 0.1
        if not (flat and key[0] > 180 and key[2] > 180 and key[1] < 90):
            sys.exit(f'{path}: the background must be flat magenta and clear of the picture; generate it again')
        distance = np.sqrt(((rgb - key) ** 2).sum(axis=2))
        alpha = np.clip((distance - 60) / 80, 0, 1)[..., None]
        rgb = np.where(alpha > 0, (rgb - (1 - alpha) * key) / np.maximum(alpha, 0.001), 0).clip(0, 255)
        px = np.dstack([rgb, alpha * 255])
    image = Image.fromarray(px.round().astype(np.uint8))
    # The box ignores specks: anything thinner than 5 raw pixels does not count.
    solid = image.getchannel('A').point(lambda a: 255 if a > 128 else 0)
    box = solid.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5)).getbbox()
    if box is None:
        sys.exit(f'{path}: nothing left after removing the background')
    if box[0] == 0 or box[1] == 0 or box[2] == image.width or box[3] == image.height:
        sys.exit(f'{path}: the picture touches the image edge; generate it again with a margin')
    return image.crop(box)


def overhang(alpha):
    """Share of the picture past the tile's front edges, where the next tile's block covers it."""
    ys, xs = np.mgrid[0:H, 0:W]
    over = (ys > OY) & (np.abs(xs - OX) / (TILE / 2) + (ys - OY) / (TILE / 4) > 1.02)
    return (over & (alpha > 128)).sum() / max(1, (alpha > 8).sum())


def fit_prop(name):
    art = cutout(os.path.join(OUT, 'raw', name + '.png'))
    max_w, max_h = PROPS[name]
    scale = min(max_w / art.width, max_h / art.height)
    for _ in range(12):  # a round footprint overhangs sooner than a square one: shrink until it fits
        small = art.resize((max(1, round(art.width * scale)), max(1, round(art.height * scale))), Image.LANCZOS)
        canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        canvas.alpha_composite(small, (OX - small.width // 2, round(OY + small.width / 4) - small.height))
        if name == 'boat' or overhang(np.asarray(canvas.getchannel('A'))) <= 0.02:
            break
        scale *= 0.97
    canvas.save(os.path.join(OUT, 'props', name + '.png'))


def fit_icon(name):
    art = cutout(os.path.join(OUT, 'raw', name + '.png'))
    scale = ICON_ART / max(art.size)
    art = art.resize((max(1, round(art.width * scale)), max(1, round(art.height * scale))), Image.LANCZOS)
    canvas = Image.new('RGBA', (ICON_CANVAS, ICON_CANVAS), (0, 0, 0, 0))
    canvas.alpha_composite(art, ((ICON_CANVAS - art.width) // 2, (ICON_CANVAS - art.height) // 2))
    # A white sticker edge all round, so the dark outline still shows on the dark sea.
    halo = canvas.getchannel('A').filter(ImageFilter.GaussianBlur(KEYLINE)).point(lambda a: 255 if a > 24 else 0)
    sticker = Image.new('RGBA', canvas.size, (255, 255, 255, 0))
    sticker.putalpha(halo.filter(ImageFilter.GaussianBlur(1.5)))
    sticker.alpha_composite(canvas)
    sticker.save(os.path.join(OUT, 'icons', name + '.png'))


def fit_cloud(name):
    art = cutout(os.path.join(OUT, 'raw', name + '.png'))
    art.resize(CLOUDS[name], Image.LANCZOS).save(os.path.join(OUT, 'clouds', name + '.png'))


def fit(names):
    for name in names:
        if name in PROPS:
            fit_prop(name)
        elif name in ICONS:
            fit_icon(name)
        elif name in CLOUDS:
            fit_cloud(name)
        else:
            sys.exit(f'unknown picture: {name}')
        print('fitted', name)


def key_left(rgba):
    a = np.asarray(rgba)
    return ((a[..., 0] > 200) & (a[..., 2] > 200) & (a[..., 1] < 90) & (a[..., 3] > 128)).sum()


def check_prop(name):
    path = os.path.join(OUT, 'props', name + '.png')
    if not os.path.exists(path):
        return ['missing']
    image = Image.open(path)
    if image.size != (W, H) or image.mode != 'RGBA':
        return [f'must be {W} x {H} RGBA, is {image.size} {image.mode}']
    alpha = np.asarray(image.getchannel('A'))
    solid = alpha > 8
    if not solid.any():
        return ['empty']
    rows, cols = np.where(solid)
    left, right, top, bottom = cols.min(), cols.max(), rows.min(), rows.max()
    width, problems = right - left + 1, []
    if left == 0 or right == W - 1 or top == 0 or bottom == H - 1:
        problems.append('touches the canvas edge')
    if solid.mean() > 0.55:
        problems.append('background not removed')
    if width < 0.85 * PROPS[name][0]:
        problems.append(f'too small: {width} px wide, wanted about {PROPS[name][0]}; make the object wider, not taller')
    if max(OX - left, right - OX) > TILE // 2:
        problems.append('wider than the tile')
    if name != 'boat' and overhang(alpha) > 0.02:
        problems.append('hangs over the front edges of the tile')
    if key_left(image.convert('RGBA')) > 0.002 * solid.sum():
        problems.append('background colour left in the picture')
    return problems


def check_icon(name):
    path = os.path.join(OUT, 'icons', name + '.png')
    if not os.path.exists(path):
        return ['missing']
    image = Image.open(path).convert('RGBA')
    box = image.getchannel('A').getbbox()
    problems = []
    if image.size != (ICON_CANVAS, ICON_CANVAS):
        problems.append(f'must be {ICON_CANVAS} x {ICON_CANVAS}, is {image.size}')
    if box is None or max(box[2] - box[0], box[3] - box[1]) < 400:
        problems.append('does not fill the square')
    if image.getpixel((0, 0))[3] or image.getpixel((ICON_CANVAS - 1, ICON_CANVAS - 1))[3]:
        problems.append('corners are not transparent')
    if key_left(image) > 200:
        problems.append('background colour left in the picture')
    return problems


def check_cloud(name):
    path = os.path.join(OUT, 'clouds', name + '.png')
    if not os.path.exists(path):
        return ['missing']
    image = Image.open(path).convert('RGBA')
    problems = []
    if image.size != CLOUDS[name]:
        problems.append(f'must be {CLOUDS[name]}, is {image.size}')
    w, h = image.size
    if image.getpixel((w // 2, round(h * 0.55)))[3] < 250:
        problems.append('the middle must be solid')
    if image.getpixel((0, 0))[3] or image.getpixel((w - 1, 0))[3]:
        problems.append('top corners are not transparent')
    return problems


def check_block():
    path = os.path.join(OUT, 'block', 'grass.png')
    if not os.path.exists(path):
        return ['missing']
    image = Image.open(path).convert('RGBA')
    if image.size != (132, 99):
        return [f'must be 132 x 99, is {image.size}']
    alpha = np.asarray(image.getchannel('A')).astype(int)
    ys, xs = np.mgrid[0:99, 0:132]
    across = np.abs(xs + 0.5 - 66)
    edge = np.minimum(np.minimum(ys + 0.5 - across / 2, 99 - across / 2 - (ys + 0.5)), 66 - across)  # > 0: inside
    problems = []
    if (alpha[edge > 2] < 255).any():
        problems.append('holes inside the block outline')
    if (alpha[edge < -2] > 0).any():
        problems.append('pixels outside the block outline')
    top, left, right = image.getpixel((66, 33)), image.getpixel((20, 60)), image.getpixel((110, 60))
    if min(top[:3]) < 225:
        problems.append('the top must be near-white snow')
    if not (left[2] > left[0] and right[2] > right[0] and sum(left[:3]) > sum(right[:3])):
        problems.append('the sides must be ice blue, the left lighter than the right')
    return problems


def check(names):
    rows = [(n, check_prop) for n in PROPS] + [(n, check_icon) for n in ICONS]
    rows += [(n, check_cloud) for n in CLOUDS] + [('grass', lambda _: check_block())]
    failed = 0
    for name, test in rows:
        if names and name not in names:
            continue
        problems = test(name)
        failed += bool(problems)
        print(('FAIL ' + name + ': ' + '; '.join(problems)) if problems else 'ok   ' + name)
    print(f'{len(names or rows) - failed} ok, {failed} failed')
    sys.exit(1 if failed else 0)


def on(background, size):
    return Image.new('RGBA', size, (*background, 255))


def sheet_icons():
    names = [n for n in ICONS if os.path.exists(os.path.join(OUT, 'icons', n + '.png'))]
    sheet = on((255, 255, 255), (560, 60 * max(1, len(names))))
    draw = ImageDraw.Draw(sheet)
    draw.rectangle((280, 0, 560, sheet.height), fill=(*SEA, 255))
    for row, name in enumerate(names):
        icon = Image.open(os.path.join(OUT, 'icons', name + '.png')).convert('RGBA')
        icon = icon.crop(icon.getchannel('A').getbbox())
        for base in (90, 370):
            x = base
            for size in (24, 32, 48):
                scale = size / max(icon.size)
                small = icon.resize((max(1, round(icon.width * scale)), max(1, round(icon.height * scale))), Image.LANCZOS)
                sheet.alpha_composite(small, (x + (size - small.width) // 2, row * 60 + 6 + (48 - small.height) // 2))
                x += size + 12
        draw.text((4, row * 60 + 24), name, fill=(29, 42, 51, 255))
    sheet.save(os.path.join(OUT, 'sheet-icons.png'))


def card(sprite, size):
    """The map sprite cropped like PropPicture.svelte."""
    box_all = sprite.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    reach = max(OX - box_all[0], box_all[2] - OX)
    top = OY - box_all[1]
    bottom = OY + TILE // 4 + 12
    box = min(W, max(150, bottom - (OY - top) + 18, 2 * reach + 12))
    window = Image.new('RGBA', (box, box), (255, 255, 255, 255))
    window.alpha_composite(sprite.crop((OX - box // 2, bottom - box, OX - box // 2 + box, min(H, bottom))))
    return window.resize((size, size), Image.LANCZOS)


def sheet_props():
    block_path = os.path.join(OUT, 'block', 'grass.png')
    block = Image.open(block_path if os.path.exists(block_path) else os.path.join(ART, 'grass.png')).convert('RGBA')
    block = block.resize((264, 198), Image.LANCZOS)
    names = [n for n in PROPS if os.path.exists(os.path.join(OUT, 'props', n + '.png'))]
    across = 5
    sheet = on((226, 238, 246), (across * 300, 170 * max(1, (len(names) + across - 1) // across)))
    draw = ImageDraw.Draw(sheet)
    for i, name in enumerate(names):
        x, y = i % across * 300 + 4, i // across * 170 + 4
        sprite = Image.open(os.path.join(OUT, 'props', name + '.png')).convert('RGBA')
        tile = Image.new('RGBA', (W, H + 32), (0, 0, 0, 0))
        tile.alpha_composite(block, (OX - 132, OY - 66))
        tile.alpha_composite(sprite)
        sheet.alpha_composite(tile.resize((116, 157), Image.LANCZOS), (x, y))
        sheet.alpha_composite(card(sprite, 92), (x + 122, y + 4))
        sheet.alpha_composite(card(sprite, 64), (x + 220, y + 4))
        draw.text((x + 122, y + 100), name, fill=(29, 42, 51, 255))
    sheet.save(os.path.join(OUT, 'sheet-props.png'))


def install():
    pairs = [(os.path.join(OUT, 'block', 'grass.png'), os.path.join(ART, 'grass.png'))]
    pairs += [(os.path.join(OUT, 'clouds', n + '.png'), os.path.join(ART, 'clouds', n + '.png')) for n in CLOUDS]
    for source, target in pairs:
        quantize(Image.open(source).convert('RGBA')).save(target, optimize=True)
        print('installed', os.path.relpath(target))


command = sys.argv[1] if len(sys.argv) > 1 else ''
if command == 'fit':
    fit(sys.argv[2:])
elif command == 'check':
    check(sys.argv[2:])
elif command == 'sheet':
    sheet_icons()
    sheet_props()
    print('wrote', os.path.join(OUT, 'sheet-icons.png'), 'and sheet-props.png')
elif command == 'install':
    install()
else:
    sys.exit(__doc__)
======
````
