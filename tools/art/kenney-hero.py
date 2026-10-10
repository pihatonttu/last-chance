"""Compose the home page's island picture from the map's own art.

Usage: python -I tools/art/kenney-hero.py

Reads apps/client/public/art/kenney/{grass.png, props/*.png} and writes
apps/client/public/art/kenney/hero.png: a small island laid out like the game map
(the same isometric grid, shallow-water ring, sandy shore, blocks and props).
"""
import os

from PIL import Image, ImageDraw

here = os.path.dirname(os.path.abspath(__file__))
art = os.path.join(os.path.dirname(os.path.dirname(here)), 'apps', 'client', 'public', 'art', 'kenney')

HALF_W, HALF_H = 132, 66  # a tile at the props' 2x size
WATER_DY = 50  # the sea's surface below the land's top (18 world px at 2x)
REEF, SHALLOW, WET, SAND = (78, 169, 210, 255), (143, 216, 238, 255), (216, 192, 138, 255), (240, 220, 166, 255)

LAND = {
    (0, 0): 'forest-3a', (1, 0): 'forest-2b', (2, 0): 'rock-a',
    (0, 1): 'forest-3b', (1, 1): 'shelter-1', (2, 1): 'field-3',
    (0, 2): 'meadow-b', (1, 2): 'gathering-1', (2, 2): 'spring',
}
BOAT = (2, 3)

grass = Image.open(os.path.join(art, 'grass.png')).convert('RGBA')
grass = grass.resize((grass.width * 2, grass.height * 2), Image.LANCZOS)
W, H = 1400, 1100
X0, Y0 = W // 2, 360
canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
draw = ImageDraw.Draw(canvas)


def centre(x, y):
    return X0 + (x - y) * HALF_W, Y0 + (x + y) * HALF_H


def ellipse(cx, cy, k, colour):
    draw.ellipse((cx - HALF_W * k, cy - HALF_H * k, cx + HALF_W * k, cy + HALF_H * k), fill=colour)


coastal = {(x + dx, y + dy) for (x, y) in LAND for dx in (-1, 0, 1) for dy in (-1, 0, 1)} - set(LAND)
for colour, k in ((REEF, 2.0), (SHALLOW, 1.4)):
    for x, y in coastal:
        cx, cy = centre(x, y)
        ellipse(cx, cy + WATER_DY, k, colour)
for colour, k, lift in ((WET, 1.32, 4), (SAND, 1.22, 0)):
    for x, y in LAND:
        cx, cy = centre(x, y)
        ellipse(cx, cy + WATER_DY + lift, k, colour)

order = sorted([*LAND, BOAT], key=lambda c: (c[0] + c[1], c[0]))
for x, y in order:
    cx, cy = centre(x, y)
    if (x, y) in LAND:
        canvas.alpha_composite(grass, (cx - HALF_W, cy - HALF_H))
        prop = Image.open(os.path.join(art, 'props', LAND[(x, y)] + '.png')).convert('RGBA')
        canvas.alpha_composite(prop, (cx - 160, cy - 330))
    else:
        prop = Image.open(os.path.join(art, 'props', 'boat.png')).convert('RGBA')
        canvas.alpha_composite(prop, (cx - 160, cy - 330 + WATER_DY))

canvas = canvas.crop(canvas.getchannel('A').getbbox())
canvas = canvas.resize((640, round(canvas.height * 640 / canvas.width)), Image.LANCZOS)
canvas.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(os.path.join(art, 'hero.png'), optimize=True)
print('hero', canvas.size)
