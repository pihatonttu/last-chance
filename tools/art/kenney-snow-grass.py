"""Write grass-snow.png: the land block with snow on its top, for winter months.

Usage: python -I tools/art/kenney-snow-grass.py

Reads apps/client/public/art/kenney/grass.png (the Tower Defense block, 132 x 99 with a
132 x 66 top diamond) and writes grass-snow.png next to it: the top diamond turns snow
white with a hint of the grass texture left in it; the dirt sides stay as they are.
"""
import os

from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
art = os.path.join(os.path.dirname(os.path.dirname(here)), 'apps', 'client', 'public', 'art', 'kenney')
SNOW = (241, 246, 250)

image = Image.open(os.path.join(art, 'grass.png')).convert('RGBA')
px = image.load()
width = image.width
for y in range(66):
    for x in range(width):
        r, g, b, a = px[x, y]
        if a == 0 or abs(x - 65.5) / 66 + abs(y - 32.5) / 33 > 1.0:
            continue
        shade = 0.9 + 0.1 * (0.3 * r + 0.59 * g + 0.11 * b) / 160
        px[x, y] = (*(min(255, round(c * shade)) for c in SNOW), a)
image.save(os.path.join(art, 'grass-snow.png'), optimize=True)
print('grass-snow', image.size)
