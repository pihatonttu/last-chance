"""Crop the rendered HUD icons to squares and copy them into the client.

Usage: python -I tools/art/kenney-icons-post.py <render-dir>

<render-dir> is the out-dir of render-kenney.py run with kenney-icons.json. Each icon is
cropped to its picture, padded to a square, scaled to 96 px (sharp at 48 CSS px on 2x
screens; a sprite's own "size" overrides it), palette-reduced and written to apps/client/public/art/kenney/icons/.
"""
import json
import os
import sys

from PIL import Image

SIZE = 96
render_dir = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
repo = os.path.dirname(os.path.dirname(here))
spec = json.load(open(os.path.join(here, 'kenney-icons.json'), encoding='utf-8'))
out = os.path.join(repo, 'apps', 'client', 'public', 'art', 'kenney', 'icons')
os.makedirs(out, exist_ok=True)
for sprite in spec['sprites']:
    image = Image.open(os.path.join(render_dir, sprite['name'] + '.png')).convert('RGBA')
    image = image.crop(image.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())
    side = round(max(image.size) * 1.06)
    square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    square.alpha_composite(image, ((side - image.width) // 2, (side - image.height) // 2))
    size = sprite.get('size', SIZE)
    square = square.resize((size, size), Image.LANCZOS)
    square.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(
        os.path.join(out, sprite['name'] + '.png'), optimize=True
    )
print(f'wrote {len(spec["sprites"])} icons to {out}')
