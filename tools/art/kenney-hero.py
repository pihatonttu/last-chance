"""Compose the home page's island picture from the map's own art: the arctic island.

Usage: python -I tools/art/kenney-hero.py

Reads apps/client/public/art/kenney/{grass.png, props/*.png} and writes
apps/client/public/art/kenney/hero.png: a small island laid out like the game map (the same
isometric grid, the shore ice with its bluish edge and an ice hole, the snow under the land,
the blocks and props). The village fire burns on the landing, next to the boat; round it are
igloos, a greenhouse, the hot spring, snowy pines and a glacier. The ice colours are read from
SHORE_LOOK in apps/client/src/map/sprites.ts, so the picture matches the map.
"""
import os
import re
import sys

from PIL import Image, ImageDraw

sys.dont_write_bytecode = True  # no __pycache__ in tools/art
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # python -I leaves this folder off the path
from palette import quantize  # noqa: E402

here = os.path.dirname(os.path.abspath(__file__))
repo = os.path.dirname(os.path.dirname(here))
art = os.path.join(repo, 'apps', 'client', 'public', 'art', 'kenney')


def shore_look():
    """SHORE_LOOK's colours from the client (0xrrggbb) as RGBA tuples."""
    with open(os.path.join(repo, 'apps', 'client', 'src', 'map', 'sprites.ts'), encoding='utf-8') as f:
        block = re.search(r'export const SHORE_LOOK = \{(.*?)\} as const', f.read(), re.S)
    assert block, 'SHORE_LOOK not found in sprites.ts'
    colours = {name: int(value, 16) for name, value in re.findall(r'(\w+): 0x([0-9a-fA-F]{6})', block.group(1))}
    return {name: ((c >> 16) & 255, (c >> 8) & 255, c & 255, 255) for name, c in colours.items()}


LOOK = shore_look()
SNOW, ICE_EDGE, SHORE_ICE, ICE_HOLE = LOOK['snow'], LOOK['iceEdge'], LOOK['shoreIce'], LOOK['iceHole']
WET = tuple(round((a + b) / 2) for a, b in zip(SNOW, SHORE_ICE))  # the snow melting into the ice (drawShore)

HALF_W, HALF_H = 132, 66  # a tile at the props' 2x size
SCALE = HALF_W / 48  # hero pixels per map world pixel (the map's tiles are 96 x 48)
WATER_DY = 50  # the sea's surface below the land's top (18 world px at 2x)

LAND = {
    (0, 0): 'forest-3a', (1, 0): 'forest-3b', (2, 0): 'rock-a',
    (0, 1): 'forest-2a', (1, 1): 'shelter-3', (2, 1): 'field-3',
    (0, 2): 'shelter-2', (1, 2): 'spring', (2, 2): 'fire',
}
BOAT = (2, 3)  # pulled up on the ice in front of the landing, where the fire burns
# Ice holes (avannot) cut into the shore ice: tile, offset from its centre and radius, in map
# world pixels like drawShallowWater (a hole sits on the north half of its tile).
HOLES = {(3, -1): (-4, -8, 9), (-1, 2): (-5, -8, 8)}

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


# Under the island, layer by layer like the map: the ice's bluish edge, the shore ice with its
# holes, then the snow under the land (first the band that melts into the ice).
coastal = {(x + dx, y + dy) for (x, y) in LAND for dx in (-1, 0, 1) for dy in (-1, 0, 1)} - set(LAND)
for x, y in coastal:
    cx, cy = centre(x, y)
    ellipse(cx, cy + WATER_DY, 2.0, ICE_EDGE)
for x, y in sorted(coastal, key=lambda c: (c[0] + c[1], c[0])):
    cx, cy = centre(x, y)
    ellipse(cx, cy + WATER_DY, 1.4, SHORE_ICE)
for (x, y), (dx, dy, r) in HOLES.items():
    cx, cy = centre(x, y)
    hx, hy, rx = cx + dx * SCALE, cy + WATER_DY + dy * SCALE, r * SCALE
    draw.ellipse((hx - rx, hy - rx / 2, hx + rx, hy + rx / 2), fill=ICE_HOLE, outline=ICE_EDGE, width=round(1.5 * SCALE))
for colour, k, lift in ((WET, 1.32, round(2 * SCALE)), (SNOW, 1.22, 0)):
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
quantize(canvas).save(os.path.join(art, 'hero.png'), optimize=True)
print('hero', canvas.size)
