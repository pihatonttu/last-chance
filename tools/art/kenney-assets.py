"""Copy the Kenney CC0 tiles the map uses into apps/client/public/art/kenney/ under stable names.

Usage: python -I tools/art/kenney-assets.py <extracted-packs-dir>

<extracted-packs-dir> holds the unzipped packs as subfolders:
  landscape/     kenney.nl/assets/isometric-tiles-landscape  (kenney_isometric-landscape.zip)
  towerdefense/  kenney.nl/assets/tower-defense              (kenney_tower-defense.zip)
All tiles are 132-133 px wide with a 132 x 66 top diamond; the renderer scales them to the
map's 96 x 48 tiles (apps/client/src/map/kenney.ts).
"""
import os
import shutil
import sys

src = sys.argv[1]
repo = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
out = os.path.join(repo, 'apps', 'client', 'public', 'art', 'kenney')

TD_LAND = os.path.join(src, 'towerdefense', 'PNG', 'Landscape')
TD_DETAILS = os.path.join(src, 'towerdefense', 'PNG', 'Details')
LANDSCAPE = os.path.join(src, 'landscape', 'PNG')

FILES = {
    # Tower Defense: land blocks (darker grass, matches the trees and rocks below).
    'grass.png': os.path.join(TD_LAND, 'landscape_13.png'),
    'dirt.png': os.path.join(TD_LAND, 'landscape_17.png'),
    # Isometric Landscape: water and beaches.
    'water.png': os.path.join(LANDSCAPE, 'landscapeTiles_066.png'),
    'beach-ne.png': os.path.join(LANDSCAPE, 'landscapeTiles_027.png'),
    'beach-nw.png': os.path.join(LANDSCAPE, 'landscapeTiles_034.png'),
    'beach-se.png': os.path.join(LANDSCAPE, 'landscapeTiles_035.png'),
}
for i in range(1, 13):
    FILES[f'trees-{i}.png'] = os.path.join(TD_DETAILS, f'trees_{i}.png')
for i in range(1, 9):
    FILES[f'rocks-{i}.png'] = os.path.join(TD_DETAILS, f'rocks_{i}.png')

os.makedirs(out, exist_ok=True)
for name, path in FILES.items():
    shutil.copyfile(path, os.path.join(out, name))
shutil.copyfile(os.path.join(src, 'towerdefense', 'License.txt'), os.path.join(out, 'LICENSE-kenney.txt'))
print(f'copied {len(FILES)} tiles to {out}')
