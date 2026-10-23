"""Write grass.png: the arctic land block, snow on top and ice-blue sides.

Usage: python -I tools/art/kenney-arctic-block.py <original-grass.png> [<out.png>]

<original-grass.png> is the green Tower Defense block as tools/art/kenney-assets.py copies
it (132 x 99: a 132 x 66 top diamond and two sides below it, the left side lit and the right
side in shade). The script always starts from that original, so running it again never
processes the block twice. Its copy in git: git show 8059cc2:apps/client/public/art/kenney/grass.png
<out.png> defaults to apps/client/public/art/kenney/grass.png (the client loads "grass").

Every pixel of the original is one face's flat colour or, on the anti-aliased edges, a blend
of two faces. A pixel's brightness says how far it is between the two faces that meet there
(top and its side, or the two sides below the top), and the same blend of the new colours is
written: snow on top (as on the approved sample, docs/art/2026-10-23-napanayte.jpg) and ice
blue on the sides, with the original's light/shade split between the left and right side.
"""
import os
import sys

from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
art = os.path.join(os.path.dirname(os.path.dirname(here)), 'apps', 'client', 'public', 'art', 'kenney')

SNOW_TOP = (235, 240, 244)  # the snow of the land, a shade under the props' snow #f1f6fa
ICE = (135, 202, 240)  # a side face of the block in full light, before the shading
TOP, LEFT, RIGHT = (91, 142, 80), (81, 127, 71), (61, 98, 53)  # the original's flat faces
DIAMOND_W, DIAMOND_H = 132, 66  # the top diamond, centred at (66, 33)


def lum(c):
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]


def mix(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def shaded(colour, face):
    """The original's light/shade on a side: each channel scaled like the green block's."""
    return tuple(min(255, round(c * f / t)) for c, f, t in zip(colour, face, TOP))


ICE_LEFT, ICE_RIGHT = shaded(ICE, LEFT), shaded(ICE, RIGHT)


def recolour(pixel, x, y):
    r, g, b, a = pixel
    if a == 0:
        return pixel
    # How far the pixel centre lies outside the top diamond, in rows (negative: inside).
    outside = (abs(x + 0.5 - DIAMOND_W / 2) / (DIAMOND_W / 2) + abs(y + 0.5 - DIAMOND_H / 2) / (DIAMOND_H / 2) - 1) * DIAMOND_H / 2
    lit = lum((r, g, b))
    if outside > 1.5 and y >= DIAMOND_H // 2:
        # On a side, clear of the top: between the two sides (the seam down the middle).
        t = (lit - lum(RIGHT)) / (lum(LEFT) - lum(RIGHT))
        colour = mix(ICE_RIGHT, ICE_LEFT, min(1, max(0, t)))
    else:
        # The top, or its edge with the side below it on this half of the block.
        side, ice = (LEFT, ICE_LEFT) if x < DIAMOND_W / 2 else (RIGHT, ICE_RIGHT)
        t = (lit - lum(side)) / (lum(TOP) - lum(side))
        colour = mix(ice, SNOW_TOP, min(1, max(0, t)))
    return (*colour, a)


source = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(art, 'grass.png')
image = Image.open(source).convert('RGBA')
assert image.size == (132, 99), image.size
assert image.getpixel((66, 20)) == (*TOP, 255), 'not the original green block: ' + str(image.getpixel((66, 20)))
px = image.load()
for y in range(image.height):
    for x in range(image.width):
        px[x, y] = recolour(px[x, y], x, y)
image.save(out, optimize=True)
print('arctic block', image.size, 'left', ICE_LEFT, 'right', ICE_RIGHT, '->', out)
