"""Render Kenney 3D kit models as isometric map sprites that match the Kenney 2D tiles.

Run headless with Blender 4.2+:
  blender -b --factory-startup -P tools/art/render-kenney.py -- <spec.json> <kits-dir> <out-dir>

<kits-dir> holds the unzipped kits as subfolders named in the spec (e.g. survival/,
town/), each with "Models/GLB format/*.glb" (or "Models/GLTF format/*.glb"). The kit "own"
is not there: it is the repo's tools/art/own/*.glb, built by tools/art/own-models.py.

The spec lists sprites; each sprite is a group of models placed on one map tile (1 x 1
world units, origin at the tile centre on the ground). Every sprite is rendered on the same canvas with the tile centre at the
same pixel, so the client needs one anchor for all of them (apps/client/src/map/kenney.ts).

Camera and light are fixed to the look of the Kenney "Tower Defense" isometric tiles:
- 2:1 dimetric orthographic view (30 degrees down, 45 degrees around), a 1 x 1 tile is
  2 * 132 px wide (rendered at twice the 2D tiles' size for sharper zoom);
- flat albedo on top faces, left faces at 89 % and right faces at 68 % brightness
  (measured from the Tower Defense grass block), no cast shadows, no specular highlights.

A sprite with "snow": true gets snow on its upward faces (the arctic island). A part with
"snow": false keeps its colours: what is under glass, hot, or made of snow already.
"""
import json
import math
import os
import sys

import bpy
import numpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
spec_path, kits_dir, out_dir = argv[0], argv[1], argv[2]
only = set(argv[3:])  # optional: render just these sprite names
with open(spec_path, encoding='utf-8') as f:
    spec = json.load(f)

CANVAS_W, CANVAS_H = spec['canvas']
ORIGIN_X, ORIGIN_Y = spec['origin']
TILE_PX = spec['tilePx']  # width of a 1 x 1 tile's diamond on the canvas
PX_PER_UNIT = TILE_PX / math.sqrt(2)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    for engine in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    scene.render.resolution_x = CANVAS_W
    scene.render.resolution_y = CANVAS_H
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1

    # Ambient 0.3 + sun 0.855 along L gives top 1.0, left 0.774, right 0.428 (linear),
    # i.e. 100 / 89 / 68 % in sRGB like the 2D tiles. Blender divides sun strength by pi
    # for diffuse surfaces, so the lamp gets 0.855 * pi.
    world = bpy.data.worlds.new('World')
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.3, 0.3, 0.3, 1)
    bg.inputs['Strength'].default_value = 1
    sun_data = bpy.data.lights.new('Sun', 'SUN')
    sun_data.energy = 0.855 * math.pi
    sun_data.use_shadow = False
    sun = bpy.data.objects.new('Sun', sun_data)
    toward_light = Vector((0.150, -0.554, 0.819)).normalized()
    sun.rotation_euler = toward_light.to_track_quat('Z', 'Y').to_euler()
    scene.collection.objects.link(sun)

    cam_data = bpy.data.cameras.new('Camera')
    cam_data.type = 'ORTHO'
    cam_data.sensor_fit = 'HORIZONTAL'
    cam_data.ortho_scale = CANVAS_W / PX_PER_UNIT
    # Move the tile centre from the canvas centre to ORIGIN (shift is in canvas widths).
    cam_data.shift_x = (CANVAS_W / 2 - ORIGIN_X) / CANVAS_W
    cam_data.shift_y = (ORIGIN_Y - CANVAS_H / 2) / CANVAS_W
    cam_data.clip_start = 0.1
    cam_data.clip_end = 100
    cam = bpy.data.objects.new('Camera', cam_data)
    cam.rotation_euler = (math.radians(60), 0, math.radians(45))
    view = cam.rotation_euler.to_matrix() @ Vector((0, 0, -1))
    cam.location = -view * 20
    scene.collection.objects.link(cam)
    scene.camera = cam
    return scene


def matte(materials):
    """No specular highlights: the 2D tiles are flat-shaded."""
    for mat in materials:
        if not mat or not mat.use_nodes:
            continue
        for node in mat.node_tree.nodes:
            if node.type != 'BSDF_PRINCIPLED':
                continue
            for name, value in (('Specular IOR Level', 0.0), ('Specular', 0.0), ('Roughness', 1.0), ('Metallic', 0.0)):
                if name in node.inputs:
                    node.inputs[name].default_value = value


OWN_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'own')


def model_path(kit, model):
    if kit == 'own':  # our own models live in the repo, next to this script
        path = os.path.join(OWN_DIR, model + '.glb')
        if os.path.exists(path):
            return path
        raise FileNotFoundError(f'{kit}/{model}: run tools/art/own-models.py first')
    # Most kits ship "GLB format/"; the Nature Kit keeps its .glb files in "GLTF format/".
    for folder in ('GLB format', 'GLTF format'):
        path = os.path.join(kits_dir, kit, 'Models', folder, model + '.glb')
        if os.path.exists(path):
            return path
    raise FileNotFoundError(f'{kit}/{model}')


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_rgb(value):
    value = value.lstrip('#')
    return [int(value[k:k + 2], 16) / 255 for k in (0, 2, 4)]


def set_colours(objects, fix_srgb, overrides):
    """Material colours of one part.

    fix_srgb: the kit stored sRGB values in glTF's linear colour factors (Nature Kit), so
    convert them. overrides: {material name: "#rrggbb"} to match the map (e.g. the Nature
    Kit's teal grass to the Tower Defense green, its white wheat to gold). Materials are
    copied first so other parts keep theirs.
    """
    for o in objects:
        if o.type != 'MESH':
            continue
        for i, mat in enumerate(o.data.materials):
            if not mat or not mat.use_nodes:
                continue
            mat = mat.copy()
            o.data.materials[i] = mat
            name = mat.name.split('.')[0]
            for node in mat.node_tree.nodes:
                if node.type != 'BSDF_PRINCIPLED' or node.inputs['Base Color'].links:
                    continue
                base = node.inputs['Base Color']
                if name in overrides:
                    rgb = [srgb_to_linear(c) for c in hex_rgb(overrides[name])]
                elif fix_srgb:
                    rgb = [srgb_to_linear(c) for c in base.default_value[:3]]
                else:
                    continue
                base.default_value = (*rgb, 1)


def place(part, kit_images):
    kit, model = part['model'].split('/')
    path = model_path(kit, model)
    before = set(bpy.data.objects)
    images_before = set(bpy.data.images)
    bpy.ops.import_scene.gltf(filepath=path)
    kit_images.setdefault(kit, set()).update(i for i in bpy.data.images if i not in images_before)
    added = [o for o in bpy.data.objects if o not in before]
    roots = [o for o in added if o.parent is None]
    holder = bpy.data.objects.new(model, None)
    bpy.context.scene.collection.objects.link(holder)
    for o in roots:
        o.parent = holder
    x, y = part.get('at', [0, 0])
    holder.location = (x, y, part.get('z', 0))
    tilt_x, tilt_y = part.get('tilt', [0, 0])
    holder.rotation_euler = (math.radians(tilt_x), math.radians(tilt_y), math.radians(part.get('turn', 0)))
    s = part.get('scale', 1)
    holder.scale = (s, s, s)
    fix_srgb = kit in spec.get('srgbFactorKits', [])
    # Kit-wide palette first (e.g. the Nature Kit's teal greens to the map's green), then the part's own.
    overrides = {**spec.get('kitMaterials', {}).get(kit, {}), **part.get('materials', {})}
    if fix_srgb or overrides:
        set_colours(added, fix_srgb, overrides)
    for o in added:
        if o.type == 'MESH':
            matte(o.data.materials)
    return added


def recolor(kit_images, swaps):
    """Copy palette swatches inside a kit's colormap, e.g. the town roof swatch to red.

    Each swap is {"kit", "from": [x, y], "into": [x, y], "size": [w, h]} in colormap
    pixels, y down. Every model of a kit shares the colormap, so a swap recolours
    everything in the sprite that uses the target swatch (in practice: roofs, canvas).
    """
    for swap in swaps:
        for image in kit_images.get(swap['kit'], ()):
            w, h = image.size
            px = numpy.array(image.pixels[:], dtype=numpy.float32).reshape(h, w, 4)
            (fx, fy), (ix, iy), (sw, sh) = swap['from'], swap['into'], swap['size']
            # Blender rows start at the bottom.
            src = px[h - fy - sh:h - fy, fx:fx + sw].copy()
            px[h - iy - sh:h - iy, ix:ix + sw] = src
            image.pixels[:] = px.ravel()
            image.update()


SNOW = spec.get('snowColor', '#f1f6fa')
# Open water stays blue in winter (the pond reads as a hole in the ice, an avanto), and the
# glass of a heated greenhouse stays clear so the plants show (tools/art/own-models.py).
SNOWLESS_MATERIALS = {'water', 'glass'}


def socket(sockets, identifier):
    return next(s for s in sockets if s.identifier == identifier)


def add_snow(objects):
    """Snow on every face that points up: each material's colour is mixed toward white by
    how much the surface normal points up (world space), so roofs, tree tops and the ground
    turn white and walls keep their colour (docs/09-uudisasukkaat.md §3.3)."""
    snow = [srgb_to_linear(c) for c in hex_rgb(SNOW)]
    done = set()
    for o in objects:
        if o.type != 'MESH':
            continue
        for mat in o.data.materials:
            if not mat or not mat.use_nodes or mat.name in done:
                continue
            done.add(mat.name)
            if mat.name.split('.')[0] in SNOWLESS_MATERIALS:
                continue
            nodes, links = mat.node_tree.nodes, mat.node_tree.links
            for bsdf in [n for n in nodes if n.type == 'BSDF_PRINCIPLED']:
                base = bsdf.inputs['Base Color']
                geometry = nodes.new('ShaderNodeNewGeometry')
                split = nodes.new('ShaderNodeSeparateXYZ')
                links.new(geometry.outputs['Normal'], split.inputs['Vector'])
                ramp = nodes.new('ShaderNodeMapRange')
                ramp.inputs['From Min'].default_value = 0.3
                ramp.inputs['From Max'].default_value = 0.5
                links.new(split.outputs['Z'], ramp.inputs['Value'])
                mix = nodes.new('ShaderNodeMix')
                mix.data_type = 'RGBA'
                links.new(ramp.outputs['Result'], socket(mix.inputs, 'Factor_Float'))
                colour_a = socket(mix.inputs, 'A_Color')
                if base.links:
                    links.new(base.links[0].from_socket, colour_a)
                else:
                    colour_a.default_value = base.default_value
                socket(mix.inputs, 'B_Color').default_value = (*snow, 1)
                links.new(socket(mix.outputs, 'Result_Color'), base)


os.makedirs(out_dir, exist_ok=True)
for sprite in spec['sprites']:
    if only and sprite['name'] not in only:
        continue
    scene = reset_scene()
    kit_images = {}
    snowy = []
    for part in sprite['parts']:
        added = place(part, kit_images)
        if part.get('snow', True):
            snowy += added
    recolor(kit_images, [spec['swatches'][name] for name in sprite.get('recolor', [])])
    if sprite.get('snow'):
        add_snow(snowy)
    scene.render.filepath = os.path.join(out_dir, sprite['name'] + '.png')
    bpy.ops.render.render(write_still=True)
    print('rendered', sprite['name'], flush=True)
