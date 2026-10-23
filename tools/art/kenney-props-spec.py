"""Write kenney-props.json: every map sprite rendered from the Kenney 3D kits and our own models.

Usage: python -I tools/art/kenney-props-spec.py

Coordinates are tile units with the tile centre on the ground at 0, 0; a tile spans
-0.5..0.5. The camera looks from +x / -y, so the back corner of a tile is (-0.5, 0.5) and
the front corner (0.5, -0.5): tall things go to the back, small things to the front.
Scales are chosen so a pine is about two thirds of a tile tall and a building about as tall
as a tree, with room around it for a yard (P39: the buildings must look sensibly sized).

The world is the arctic island (docs/10-arktinen.md section 9): everything on land stands in
snow, so every sprite has "snow": true except the boat on the water. Parts with
"snow": false keep their colours (plants under glass, fire, steam, snow-block igloos).

Kits (CC0, kenney.nl): survival = Survival Kit 2.0, town = Fantasy Town Kit 2.0,
nature = Nature Kit, pirate = Pirate Kit. own = tools/art/own/*.glb, built from primitives
by tools/art/own-models.py (igloos, greenhouse, snow castle, ice block, steam, flames).
"""
import json
import math
import os

N, S, T, P, O = 'nature/', 'survival/', 'town/', 'pirate/', 'own/'
GROUND = 0.05  # Nature Kit models stand at z = -0.05
ICE = '#bfe3f2'  # Nature Kit stones recoloured to glacier ice


def part(model, at=(0, 0), scale=1.0, turn=0, z=None, **extra):
    p = {'model': model, 'at': [round(at[0], 3), round(at[1], 3)], 'scale': scale}
    if turn:
        p['turn'] = turn
    if z is None and model.startswith(N):
        z = GROUND * scale
    if z:
        p['z'] = round(z, 4)
    p.update(extra)
    return p


def house(scale, roof='roof-gable', storeys=1, chimney=False, at=(0, 0), door='wall-wood-door'):
    """Fantasy Town walls (1 unit tall, on the cell edges) with the door at the front left."""
    parts = []
    for floor in range(storeys):
        front_left = T + (door if floor == 0 else 'wall-wood-window-shutters')
        walls = [(T + 'wall-wood-window-shutters', 0), (T + 'wall-wood', 90), (T + 'wall-wood', 180), (front_left, 270)]
        parts += [part(m, at, scale, t, z=floor * scale) for m, t in walls]
    top = storeys * scale
    parts.append(part(T + roof, at, scale, z=top))
    if chimney:
        parts.append(part(T + 'chimney', at, scale, 180, z=top))
    return parts


def tree(kind, at, scale=1.0, turn=0):
    """Spruces (kuusi) and pines (mänty) from the Nature Kit, about 0.65 tiles tall at scale 1."""
    models = {
        'spruce': (N + 'tree_pineDefaultA', 0.42),
        'spruce-b': (N + 'tree_pineDefaultB', 0.42),
        'spruce-round': (N + 'tree_pineRoundC', 0.52),
        'spruce-round-b': (N + 'tree_pineRoundE', 0.52),
        'spruce-small': (N + 'tree_pineSmallA', 0.42),
        'pine': (N + 'tree_pineTallA', 0.43),
        'pine-b': (N + 'tree_pineTallC', 0.4),
    }
    model, base = models[kind]
    return part(model, at, round(base * scale, 3), turn)


# ---------------------------------------------------------------- terrain

FOREST_SPOTS = [(-0.27, 0.27), (0.02, 0.3), (-0.3, -0.02), (0.3, 0.04), (-0.02, 0.0), (0.02, -0.29), (-0.28, -0.3), (0.28, -0.26)]
FOREST_MIX = ['spruce', 'pine', 'spruce-round', 'spruce-b', 'pine-b', 'spruce-round-b', 'spruce', 'pine']


def forest(trees, variant):
    """Snowy spruce and pine forest; thinned forests show stumps where trees were cut."""
    order = FOREST_SPOTS if variant == 0 else FOREST_SPOTS[1:] + FOREST_SPOTS[:1]
    mix = FOREST_MIX if variant == 0 else FOREST_MIX[3:] + FOREST_MIX[:3]
    parts = [tree(mix[i], order[i], 0.92 + 0.08 * ((i * 7 + variant) % 3), turn=(i * 53 + variant * 31) % 360) for i in range(trees)]
    parts += [tree('spruce-small', order[(trees + k) % len(order)], 0.55, turn=k * 70) for k in range(2 if trees > 2 else 1)]
    if trees <= 2:
        parts.append(part(N + 'stump_round', (0.24, -0.22) if variant == 0 else (-0.22, -0.26), 0.8))
    return parts


def glacier(variant):
    """Jäätikkö: boulders of blue ice, something to quarry later."""
    ice = {'materials': {'stone': ICE, '_defaultMat': ICE}}
    if variant == 0:
        return [part(N + 'stone_largeD', (-0.12, 0.14), 0.62, **ice), part(N + 'stone_largeF', (0.2, -0.02), 0.5, 40, **ice),
                part(N + 'stone_smallG', (-0.1, -0.24), 0.9, **ice), part(N + 'stone_smallA', (0.28, -0.3), 0.4, **ice)]
    return [part(N + 'stone_largeF', (-0.14, 0.1), 0.6, 120, **ice), part(N + 'stone_largeB', (0.2, 0.18), 0.5, 20, **ice),
            part(N + 'stone_smallG', (0.16, -0.22), 0.9, 60, **ice), part(N + 'stone_smallA', (-0.28, -0.22), 0.4, **ice)]


TWIG = S + 'resource-wood'


def snowfield(variant):
    """Lumikenttä: open snow with a few twigs and small stones (buildable land)."""
    twigs = [[(-0.22, 0.16, 20), (0.2, -0.2, 110)], [(0.18, 0.2, 70), (-0.16, -0.22, 150)], [(-0.05, 0.24, 130), (0.24, -0.05, 40)]][variant]
    stones = [[(0.16, 0.12, 'stone_smallA'), (-0.12, -0.08, 'stone_smallC')],
              [(-0.2, 0.08, 'stone_smallB'), (0.1, -0.06, 'stone_smallA'), (0.26, 0.04, 'stone_smallE')],
              [(-0.2, -0.12, 'stone_smallC'), (0.1, 0.05, 'stone_smallB')]][variant]
    return ([part(TWIG, (x, y), 1.4, t) for x, y, t in twigs] +
            [part(N + model, (x, y), 0.38, (k * 70) % 360) for k, (x, y, model) in enumerate(stones)])


DIRT = {'dirt': '#b98a5a', 'dirtDark': '#8f6540'}


def greenhouse(stage):
    """Kasvihuone: our glass house over two beds; the plants grow inside in four stages
    (empty, sprouts, green, ripe) like the old field. What is under the glass gets no snow."""
    parts = [part(O + 'greenhouse'), part(N + 'crops_dirtDoubleRow', scale=0.6, materials=DIRT, snow=False)]
    crop = {
        1: ('crops_leafsStageA', 0.5, {'grass': '#7cbf4a'}),
        2: ('crops_wheatStageA', 0.72, {'grass': '#b5c94f'}),
        3: ('crops_wheatStageB', 0.7, {'_defaultMat': '#e8c04e', 'woodInner': '#c99a3c'}),
    }.get(stage)
    if crop:
        model, scale, mats = crop
        parts += [part(N + model, (x, y), scale, materials=mats, z=0.03, snow=False) for x in (-0.21, 0, 0.21) for y in (-0.12, 0.12)]
    return parts


# ---------------------------------------------------------------- buildings

def shelter(level):
    """Koti: small igloo, igloo, large igloo with an ice window (tunnels open to the front left)."""
    model, at = {1: ('igloo-small', (-0.04, 0.08)), 2: ('igloo', (-0.04, 0.08)), 3: ('igloo-large', (-0.02, 0.06))}[level]
    return [part(O + model, at, snow=False)]


def school(level):
    if level == 1:  # an outdoor class under a canvas roof
        return [part(S + 'structure-canvas', (-0.05, 0.08), 1.05), part(T + 'stall-bench', (0.03, 0.08), 0.4),
                part(T + 'stall-bench', (-0.13, 0.08), 0.4), part(N + 'sign', (0.27, -0.2), 0.8, 45)]
    if level == 2:
        return [*house(0.4, at=(-0.08, 0.08)), part(N + 'sign', (0.27, -0.22), 0.8, 45),
                part(T + 'stall-bench', (0.28, 0.12), 0.4)]
    return [*house(0.38, storeys=2, at=(-0.08, 0.08)), part(N + 'sign', (0.28, -0.24), 0.8, 45),
            part(T + 'stall-bench', (0.28, 0.14), 0.4), tree('spruce-small', (0.05, -0.32), 0.6)]


def workshop(level):
    if level == 1:  # a workbench in the open with timber
        return [part(S + 'workbench', (-0.05, 0.08), 1.0), part(N + 'log_stack', (-0.25, -0.15), 0.34),
                part(S + 'resource-planks', (0.22, -0.18), 1.1, 30)]
    if level == 2:  # an open shed with an anvil
        return [part(S + 'structure-roof', (-0.06, 0.08), 1.1), part(S + 'workbench-anvil', (-0.04, 0.1), 1.1),
                part(N + 'log_stack', (0.25, -0.2), 0.32, 90)]
    return [*house(0.42, chimney=True, at=(-0.08, 0.08)), part(S + 'workbench-anvil', (0.3, -0.06), 1.0),
            part(N + 'log_stack', (0.0, -0.32), 0.32, 90)]


def gathering(level):
    if level == 1:  # Laavu: a lean-to with logs to sit on; the village fire burns elsewhere.
        # The sloping canvas sheds its snow: white, it would read as a bare frame on the snow.
        return [part(S + 'tent-canvas-half', (-0.14, 0.16), 0.85, 45, snow=False),
                part(N + 'log_large', (0.32, 0.04), 0.22, 0), part(N + 'log_large', (-0.04, -0.34), 0.22, 90)]
    if level == 2:  # Kylätalo: a wooden village hall with a wide door and benches outside
        return [*house(0.42, 'roof-gable', door='wall-wood-doorway-square-wide', at=(-0.08, 0.08)),
                part(T + 'stall-bench', (0.3, -0.04), 0.4, -45), part(T + 'stall-bench', (0.06, -0.3), 0.4, -45),
                part(T + 'lantern', (0.33, -0.3), 0.3)]
    # Lumilinna: our snow castle (ice walls, two towers with flags, a gate to the front left)
    return [part(O + 'snow-castle', (-0.03, 0.05), 0.85)]


def bonfire():
    """Kylän nuotio: a big bonfire (kokko) on the landing tile. The Nature Kit campfire scaled
    up, a ring of logs leaning together over it, and our flames rising through them."""
    hot = {'snow': False}  # the fire has melted the snow on it
    parts = [part(N + 'campfire_stones', scale=1.3, **hot), part(N + 'campfire_logs', scale=1.8, **hot)]
    length, scale, lean = 0.71, 0.5, 50  # Nature Kit log: 0.71 long along y
    half = length * scale / 2
    for k in range(6):
        azimuth = 360 * k / 6 + 15
        r = 0.05 + half * math.cos(math.radians(lean))
        at = (r * math.cos(math.radians(azimuth)), r * math.sin(math.radians(azimuth)))
        parts.append(part(N + 'log', at, scale, azimuth + 90, z=half * math.sin(math.radians(lean)) + 0.01, tilt=[lean, 0], **hot))
    parts.append(part(O + 'flames', (0.0, 0.0), 1.5, z=0.03, **hot))
    return parts


sprites = []
for kind, make in (('shelter', shelter), ('school', school), ('workshop', workshop), ('gathering', gathering)):
    for level in (1, 2, 3):
        sprite = {'name': f'{kind}-{level}', 'parts': make(level)}
        recolor = {'school': ['town-roof-blue', 'survival-canvas-blue'], 'shelter': [],
                   'workshop': ['town-roof-grey'], 'gathering': ['town-red-purple']}[kind]
        if recolor:
            sprite['recolor'] = recolor
        sprites.append(sprite)
sprites += [{'name': f'field-{n}', 'parts': greenhouse(n)} for n in range(4)]
sprites += [{'name': f'forest-{n}{v}', 'parts': forest({1: 2, 2: 4, 3: 7}[n], i)} for n in (1, 2, 3) for i, v in enumerate('ab')]
sprites += [{'name': f'rock-{v}', 'parts': glacier(i)} for i, v in enumerate('ab')]
sprites += [{'name': f'meadow-{v}', 'parts': snowfield(i)} for i, v in enumerate('abc')]
sprites += [
    {'name': 'quarry', 'parts': [  # Jäälouhos: a cut ice face, stacked blocks, a pickaxe
        part(N + 'cliff_blockHalf_stone', (-0.17, 0.17), 0.5, materials={'grass': ICE, 'stone': ICE}),
        part(O + 'ice-block', (0.2, 0.02), 0.9, 90), part(O + 'ice-block', (0.2, 0.2), 0.9, 90),
        part(O + 'ice-block', (0.2, 0.11), 0.9, 90, z=0.108), part(O + 'ice-block', (0.02, -0.22), 0.9, 25),
        part(O + 'ice-block', (0.26, -0.26), 0.8, -20), part(S + 'tool-pickaxe', (-0.3, -0.2), 1.6, 20)]},
    {'name': 'spring', 'parts': [  # Kuuma lähde: the pond with its jetty, steaming
        part(N + 'ground_riverTile', scale=0.9, z=0.09, materials={'grass': '#5b8e50', 'water': '#62c0ea'}),
        part(P + 'structure-platform-dock-small', (0.3, -0.3), 0.08, 45, z=0.09),
        part(N + 'stone_smallA', (0.3, 0.28), 0.6), part(N + 'stone_smallB', (-0.32, 0.26), 0.5, 50),
        part(O + 'steam', (-0.14, -0.02), 0.9, z=0.09, snow=False), part(O + 'steam', (0.06, 0.12), 0.65, 120, z=0.09, snow=False)]},
    {'name': 'fire', 'parts': bonfire()},
    # The boat the class came ashore in, pulled up at the landing.
    {'name': 'boat', 'parts': [part(P + 'boat-row-large', (0, 0), 0.3, 35, tilt=[4, -6]),
                               part(P + 'crate', (0.26, -0.26), 0.12, 10)]},
]
for sprite in sprites:  # everything on land is in snow; the boat is on the water
    if sprite['name'] != 'boat':
        sprite['snow'] = True

spec = {
    '//': 'Generated by kenney-props-spec.py; edit that file, not this one. Rendered by render-kenney.py.',
    'canvas': [320, 400],
    'origin': [160, 330],
    'tilePx': 264,
    'srgbFactorKits': ['nature'],
    'kitMaterials': {
        'nature': {
            'grass': '#77b255', 'leafsGreen': '#4f9a45', 'leafsDark': '#3f7f39', 'woodBark': '#8b6142',
            'woodInner': '#d9b98c', 'wood': '#a0663f', 'woodDark': '#7a4b2e', 'stone': '#b4bcc4',
            '_defaultMat': '#c8ced4', 'colorRed': '#d9534f', 'colorYellow': '#f2c94c', 'colorPurple': '#a78bfa',
        },
    },
    'swatches': {
        'town-roof-blue': {'kit': 'town', 'from': [192, 128], 'into': [64, 384], 'size': [64, 128]},
        'town-roof-grey': {'kit': 'town', 'from': [448, 384], 'into': [64, 384], 'size': [64, 128]},
        'town-red-purple': {'kit': 'town', 'from': [320, 128], 'into': [0, 384], 'size': [64, 128]},
        'survival-canvas-blue': {'kit': 'survival', 'from': [256, 256], 'into': [64, 256], 'size': [64, 128]},
    },
    'sprites': sprites,
}
here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, 'kenney-props.json'), 'w', encoding='utf-8', newline='\n') as f:
    json.dump(spec, f, indent=1)
    f.write('\n')
print(f'{len(sprites)} sprites')
