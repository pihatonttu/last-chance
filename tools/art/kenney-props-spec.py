"""Write kenney-props.json: every map sprite rendered from the Kenney 3D kits.

Usage: python -I tools/art/kenney-props-spec.py

Coordinates are tile units with the tile centre on the ground at 0, 0; a tile spans
-0.5..0.5. The camera looks from +x / -y, so the back corner of a tile is (-0.5, 0.5) and
the front corner (0.5, -0.5): tall things go to the back, small things to the front.
Scales are chosen so a palm is about two thirds of a tile tall and a house about as tall
as a tree, with room around it for a yard (Samu: the buildings must look sensibly sized).

Kits (CC0, kenney.nl): survival = Survival Kit 2.0, town = Fantasy Town Kit 2.0,
nature = Nature Kit, pirate = Pirate Kit.
"""
import json
import math
import os

N, S, T, P = 'nature/', 'survival/', 'town/', 'pirate/'
GROUND = 0.05  # Nature Kit models stand at z = -0.05


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


def house(scale, roof='roof-gable', storeys=1, chimney=False, at=(0, 0)):
    """Fantasy Town walls (1 unit tall, on the cell edges) with the door at the front left."""
    parts = []
    for floor in range(storeys):
        front_left = T + ('wall-wood-door' if floor == 0 else 'wall-wood-window-shutters')
        walls = [(T + 'wall-wood-window-shutters', 0), (T + 'wall-wood', 90), (T + 'wall-wood', 180), (front_left, 270)]
        parts += [part(m, at, scale, t, z=floor * scale) for m, t in walls]
    top = storeys * scale
    parts.append(part(T + roof, at, scale, z=top))
    if chimney:
        parts.append(part(T + 'chimney', at, scale, 180, z=top))
    return parts


def campfire(at, scale=1.0):
    return [part(N + 'campfire_stones', at, 0.9 * scale), part(N + 'campfire_logs', at, 0.9 * scale)]


def tree(kind, at, scale=1.0, turn=0):
    models = {
        'palm': (N + 'tree_palm', 0.42),
        'palm-tall': (N + 'tree_palmTall', 0.44),
        'palm-bend': (N + 'tree_palmBend', 0.42),
        'leafy': (N + 'tree_default', 0.34),
        'oak': (N + 'tree_oak', 0.42),
        'round': (N + 'tree_fat', 0.4),
    }
    model, base = models[kind]
    extra = {'materials': {'leafsGreen': '#62ad4b'}} if kind.startswith('palm') else {}
    return part(model, at, round(base * scale, 3), turn, **extra)


def bush(at, scale=1.0, turn=0):
    return part(N + 'plant_bushLarge', at, round(0.9 * scale, 3), turn)


# ---------------------------------------------------------------- terrain

FOREST_SPOTS = [(-0.27, 0.27), (0.02, 0.3), (-0.3, -0.02), (0.3, 0.04), (-0.02, 0.0), (0.02, -0.29), (-0.28, -0.3), (0.28, -0.26)]
FOREST_MIX = ['palm', 'leafy', 'oak', 'palm-tall', 'round', 'palm-bend', 'leafy', 'palm']


def forest(trees, variant):
    order = FOREST_SPOTS if variant == 0 else FOREST_SPOTS[1:] + FOREST_SPOTS[:1]
    mix = FOREST_MIX if variant == 0 else FOREST_MIX[3:] + FOREST_MIX[:3]
    parts = [tree(mix[i], order[i], 0.92 + 0.08 * ((i * 7 + variant) % 3), turn=(i * 53 + variant * 31) % 360) for i in range(trees)]
    parts += [bush(order[(trees + k) % len(order)], 0.8, turn=k * 70) for k in range(2 if trees > 2 else 1)]
    if trees <= 2:  # a thinned forest: what was cut shows as stumps
        parts.append(part(N + 'stump_round', (0.24, -0.22) if variant == 0 else (-0.22, -0.26), 0.8))
    return parts


def rocks(variant):
    """A pile of grey boulders: something to quarry later."""
    if variant == 0:
        return [part(N + 'stone_largeD', (-0.12, 0.14), 0.62), part(N + 'stone_largeF', (0.2, -0.02), 0.5, 40),
                part(N + 'stone_smallG', (-0.1, -0.24), 0.9), part(N + 'grass', (0.28, -0.3), 0.6)]
    return [part(N + 'stone_largeF', (-0.14, 0.1), 0.6, 120), part(N + 'stone_largeB', (0.2, 0.18), 0.5, 20),
            part(N + 'stone_smallG', (0.16, -0.22), 0.9, 60), part(N + 'grass', (-0.28, -0.22), 0.6)]


def meadow(variant):
    tufts = [(-0.25, 0.2), (0.22, 0.12), (-0.05, -0.22), (0.18, -0.3)]
    parts = [part(N + 'grass', tufts[i], 0.55, i * 80) for i in range(3)]
    if variant == 1:
        parts += [part(N + 'flower_yellowA', (0.08, 0.05), 0.9), part(N + 'flower_yellowB', (-0.2, -0.05), 0.8)]
    if variant == 2:
        parts += [part(N + 'flower_purpleA', (0.1, 0.18), 0.9), part(N + 'flower_redA', (-0.12, -0.1), 0.8)]
    return parts


DIRT = {'dirt': '#b98a5a', 'dirtDark': '#8f6540'}


def field(stage):
    parts = [part(N + 'crops_dirtDoubleRow', scale=0.8, materials=DIRT, z=0.04)]
    parts += [part(N + 'fence_simpleLow', scale=0.82, turn=t, z=0.04) for t in (0, 90, 180, 270)]
    crop = {
        1: ('crops_leafsStageA', 0.5, {'grass': '#7cbf4a'}),
        2: ('crops_wheatStageA', 0.75, {'grass': '#b5c94f'}),
        3: ('crops_wheatStageB', 0.78, {'_defaultMat': '#e8c04e', 'woodInner': '#c99a3c'}),
    }.get(stage)
    if crop:
        model, scale, mats = crop
        parts += [part(N + model, (x, y), scale, materials=mats, z=0.04) for x in (-0.22, 0, 0.22) for y in (-0.22, 0, 0.22)]
    return parts


# ---------------------------------------------------------------- buildings

def shelter(level):
    if level == 1:  # a camp: tent, fire, log to sit on
        return [part(N + 'tent_detailedOpen', (-0.12, 0.14), 0.55, 0), *campfire((0.2, -0.18), 0.8),
                part(N + 'log_large', (0.3, 0.1), 0.22, 0)]
    if level == 2:  # a hut with a barrel and firewood
        return [*house(0.36, 'roof-point', at=(-0.1, 0.1)), part(P + 'barrel', (0.24, -0.04), 0.1),
                part(N + 'log_stack', (0.0, -0.3), 0.32, 90), *campfire((0.28, -0.3), 0.6)]
    return [*house(0.44, 'roof-gable', chimney=True, at=(-0.08, 0.08)),  # a house with a yard
            *[part(N + 'fence_simpleLow', scale=0.94, turn=t, z=0.04) for t in (0, 270)],
            part(N + 'flower_redA', (0.3, -0.05), 0.8), part(N + 'plant_bushLarge', (0.05, -0.3), 0.7)]


def school(level):
    if level == 1:  # an outdoor class under a canvas roof
        return [part(S + 'structure-canvas', (-0.05, 0.08), 1.05), part(T + 'stall-bench', (0.03, 0.08), 0.4),
                part(T + 'stall-bench', (-0.13, 0.08), 0.4), part(N + 'sign', (0.27, -0.2), 0.8, 45)]
    if level == 2:
        return [*house(0.4, at=(-0.08, 0.08)), part(N + 'sign', (0.27, -0.22), 0.8, 45),
                part(T + 'stall-bench', (0.28, 0.12), 0.4)]
    return [*house(0.38, storeys=2, at=(-0.08, 0.08)), part(N + 'sign', (0.28, -0.24), 0.8, 45),
            part(T + 'stall-bench', (0.28, 0.14), 0.4), tree('round', (0.05, -0.32), 0.6)]


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
    if level == 1:  # Nuotio: a campfire with logs to sit on
        return [*campfire((0, 0), 1.2), part(N + 'log_large', (-0.27, 0.0), 0.28, 90), part(N + 'log_large', (0.0, 0.27), 0.28, 0)]
    if level == 2:  # Teatteri: a puppet-theatre booth with benches in front
        return [part(T + 'stall-red', (-0.17, 0.17), 0.46, 45), part(T + 'stall-bench', (0.1, -0.1), 0.45, -45),
                part(T + 'stall-bench', (0.27, -0.27), 0.45, -45), part(T + 'lantern', (-0.36, -0.2), 0.3)]
    # Amfiteatteri: a paved ring with benches round it and a stage at the back
    ring = []
    for deg in (-60, -20, 20, 60, 100):
        r = 0.34
        ring.append(part(T + 'stall-bench', (0.06 + r * math.cos(math.radians(deg - 45)), -0.06 + r * math.sin(math.radians(deg - 45))), 0.38, deg - 45))
    return [part(N + 'path_stoneCircle', (0.06, -0.06), 0.62), *ring, part(T + 'stall-red', (-0.3, 0.3), 0.36, 45),
            part(T + 'lantern', (-0.4, -0.1), 0.3), part(T + 'lantern', (0.1, 0.4), 0.3)]


sprites = []
for kind, make in (('shelter', shelter), ('school', school), ('workshop', workshop), ('gathering', gathering)):
    for level in (1, 2, 3):
        sprite = {'name': f'{kind}-{level}', 'parts': make(level)}
        recolor = {'school': ['town-roof-blue', 'survival-canvas-blue'], 'shelter': ['town-roof-red'],
                   'workshop': ['town-roof-grey'], 'gathering': ['town-red-purple']}[kind]
        sprite['recolor'] = recolor
        sprites.append(sprite)
sprites += [{'name': f'field-{n}', 'parts': field(n)} for n in range(4)]
sprites += [{'name': f'forest-{n}{v}', 'parts': forest({1: 2, 2: 4, 3: 7}[n], i)} for n in (1, 2, 3) for i, v in enumerate('ab')]
sprites += [{'name': f'rock-{v}', 'parts': rocks(i)} for i, v in enumerate('ab')]
sprites += [{'name': f'meadow-{v}', 'parts': meadow(i)} for i, v in enumerate('abc')]
sprites += [
    {'name': 'quarry', 'parts': [
        part(N + 'cliff_blockHalf_stone', (-0.17, 0.17), 0.5, materials={'grass': '#5b8e50'}),
        part(N + 'stone_smallA', (0.24, -0.1), 0.7), part(N + 'stone_smallB', (0.0, -0.28), 0.6, 60),
        part(S + 'tool-pickaxe', (-0.3, -0.24), 1.6, 20), part(P + 'crate', (0.25, 0.22), 0.12, 20)]},
    {'name': 'spring', 'parts': [
        part(N + 'ground_riverTile', scale=0.9, z=0.09, materials={'grass': '#5b8e50', 'water': '#62c0ea'}),
        part(N + 'lily_large', (0.05, -0.05), 0.8, z=0.0), part(N + 'stone_smallA', (0.3, 0.28), 0.6),
        tree('palm-bend', (-0.32, 0.3), 0.8)]},
    # The boat the class came ashore in, pulled up at the landing.
    {'name': 'boat', 'parts': [part(P + 'boat-row-large', (0, 0), 0.3, 35, tilt=[4, -6]),
                               part(P + 'crate', (0.26, -0.26), 0.12, 10)]},
]

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
        'town-roof-red': {'kit': 'town', 'from': [0, 384], 'into': [64, 384], 'size': [64, 128]},
        'town-roof-blue': {'kit': 'town', 'from': [192, 128], 'into': [64, 384], 'size': [64, 128]},
        'town-roof-grey': {'kit': 'town', 'from': [448, 384], 'into': [64, 384], 'size': [64, 128]},
        'town-red-purple': {'kit': 'town', 'from': [320, 128], 'into': [0, 384], 'size': [64, 128]},
        'survival-canvas-red': {'kit': 'survival', 'from': [192, 256], 'into': [64, 256], 'size': [64, 128]},
        'survival-canvas-blue': {'kit': 'survival', 'from': [256, 256], 'into': [64, 256], 'size': [64, 128]},
    },
    'sprites': sprites,
}
here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, 'kenney-props.json'), 'w', encoding='utf-8', newline='\n') as f:
    json.dump(spec, f, indent=1)
    f.write('\n')
print(f'{len(sprites)} sprites')
