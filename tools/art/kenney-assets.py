"""Copy the Kenney CC0 2D art the map uses into apps/client/public/art/kenney/ under stable names.

Usage: python -I tools/art/kenney-assets.py <extracted-packs-dir>

<extracted-packs-dir> holds the unzipped packs as subfolders:
  towerdefense/  kenney.nl/assets/tower-defense                  (the land block)
  background/    kenney.nl/assets/background-elements-remastered (fog clouds)
The block is 132 px wide with a 132 x 66 top diamond; the renderer scales it to the map's
96 x 48 tiles (apps/client/src/map/kenney.ts). Everything standing on the land is rendered
from Kenney 3D kits instead (kenney-props-spec.py, render-kenney.py).
"""
import os
import shutil
import sys

src = sys.argv[1]
repo = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
out = os.path.join(repo, 'apps', 'client', 'public', 'art', 'kenney')

TD_LAND = os.path.join(src, 'towerdefense', 'PNG', 'Landscape')
CLOUDS = os.path.join(src, 'background', 'PNG', 'Default')

FILES = {
    # Tower Defense: the land block.
    'grass.png': os.path.join(TD_LAND, 'landscape_13.png'),
}
# Background Elements: plain clouds for the fog (5-8 are the same with speed lines).
for i in range(1, 5):
    FILES[f'clouds/cloud-{i}.png'] = os.path.join(CLOUDS, f'cloud{i}.png')

os.makedirs(os.path.join(out, 'clouds'), exist_ok=True)
for name, path in FILES.items():
    shutil.copyfile(path, os.path.join(out, name))
shutil.copyfile(os.path.join(src, 'towerdefense', 'License.txt'), os.path.join(out, 'LICENSE-kenney.txt'))
print(f'copied {len(FILES)} files to {out}')
