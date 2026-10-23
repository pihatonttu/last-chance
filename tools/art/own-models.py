"""Build Last Chance's own low-poly models from primitives and export them as .glb.

Run headless with Blender 4.2+:
  blender -b --factory-startup -P tools/art/own-models.py [-- <out-dir> [name ...]]

Writes tools/art/own/<name>.glb (or <out-dir>/<name>.glb). render-kenney.py reads them as
the kit "own", so a spec part like part('own/igloo') works like a Kenney model.

Every model is built in tile units (1 = one map tile) standing on z = 0 with its footprint
centred on the origin, so scale 1 is its size on the map. The style follows the Kenney kits:
flat-shaded low-poly shapes and plain colour materials, no textures. Material names matter
to render-kenney.py: `water` and `glass` never get snow.

Models (docs/10-arktinen.md section 9):
- igloo-small, igloo, igloo-large: a dome of snow blocks with visible seams and an entrance
  tunnel; the dome is 0.45 / 0.6 / 0.75 tiles wide, the largest one has an ice window;
- greenhouse: a wooden frame with light blue see-through glass; the spec puts the beds and
  the plants inside;
- snow-castle: ice-blue walls and two towers (the village hall's last level);
- icebreaker: red hull, white bridge and a funnel (the ship icon);
- ice-block: a cut block of ice (the ice icon, the ice quarry);
- steam: low white puffs over the hot spring;
- flames: the flames of the village bonfire.
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT_DIR = argv[0] if argv else os.path.join(HERE, 'own')
ONLY = set(argv[1:])

# ---------------------------------------------------------------- palette (sRGB)

SNOW_BLOCK = '#f4f8fb'
SNOW_SEAM = '#a9c6da'
DOORWAY = '#2c4660'
ICE_WINDOW = '#7fd0ee'
ICE = '#a6daf0'
ICE_EDGE = '#dcf3fc'
ICE_DARK = '#6fb7dc'
WOOD = '#a0663f'
WOOD_DARK = '#7a4b2e'
GLASS = '#cfeefb'
RED = '#d6403a'
WHITE = '#f4f6f8'
DARK = '#2b3139'
DECK = '#7d8b94'
YELLOW = '#f2c230'
FLAME = '#f28a2a'
FLAME_CORE = '#ffd54a'
STEAM = '#ffffff'


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def linear(hex_colour):
    h = hex_colour.lstrip('#')
    return [srgb_to_linear(int(h[k:k + 2], 16) / 255) for k in (0, 2, 4)]


class Model:
    """One mesh object built with bmesh; materials are added by name on first use."""

    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.materials = []  # (name, colour, alpha, glow)

    def mat(self, name, colour, alpha=1.0, glow=0.0):
        """alpha < 1: see-through (glass, steam); glow: emission strength (fire)."""
        for i, (n, *_rest) in enumerate(self.materials):
            if n == name:
                return i
        self.materials.append((name, colour, alpha, glow))
        return len(self.materials) - 1

    # -------- primitives

    def poly_prism(self, bottom, top, material, cap_bottom=False):
        """Faces between two loops of points (same count, counter-clockwise seen from
        outside the top face): the top face and the sides; the bottom face only if asked."""
        bv = [self.bm.verts.new(p) for p in bottom]
        tv = [self.bm.verts.new(p) for p in top]
        faces = [self.bm.faces.new(tv)]
        n = len(bv)
        for i in range(n):
            j = (i + 1) % n
            faces.append(self.bm.faces.new((bv[i], bv[j], tv[j], tv[i])))
        if cap_bottom:
            faces.append(self.bm.faces.new(list(reversed(bv))))
        for f in faces:
            f.material_index = material
        return faces

    def box(self, material, centre, size, turn=0.0):
        """An axis-aligned box (turned about z by `turn` degrees)."""
        m = Matrix.LocRotScale(Vector(centre), Matrix.Rotation(math.radians(turn), 3, 'Z').to_quaternion(), Vector(size))
        out = bmesh.ops.create_cube(self.bm, size=1.0, matrix=m)
        faces = {f for v in out['verts'] for f in v.link_faces}
        for f in faces:
            f.material_index = material
        return faces

    def beam(self, material, a, b, thickness):
        """A square beam from point a to point b."""
        a, b = Vector(a), Vector(b)
        d = b - a
        quat = d.normalized().to_track_quat('Z', 'Y')
        m = Matrix.LocRotScale((a + b) / 2, quat, Vector((thickness, thickness, d.length)))
        out = bmesh.ops.create_cube(self.bm, size=1.0, matrix=m)
        for f in {f for v in out['verts'] for f in v.link_faces}:
            f.material_index = material

    def cylinder(self, material, centre, radius, height, segments=8, radius_top=None, turn=0.0):
        """A prism (or a cone frustum) standing on centre."""
        r2 = radius if radius_top is None else radius_top
        m = Matrix.Translation(Vector(centre) + Vector((0, 0, height / 2))) @ Matrix.Rotation(math.radians(turn), 4, 'Z')
        out = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=segments,
                                    radius1=radius, radius2=r2, depth=height, matrix=m)
        faces = {f for v in out['verts'] for f in v.link_faces}
        for f in faces:
            f.material_index = material
        return faces

    def quad(self, material, corners):
        f = self.bm.faces.new([self.bm.verts.new(c) for c in corners])
        f.material_index = material
        return f

    # -------- output

    def export(self):
        mesh = bpy.data.meshes.new(self.name)
        self.bm.normal_update()
        self.bm.to_mesh(mesh)
        self.bm.free()
        for name, colour, alpha, glow in self.materials:
            mat = bpy.data.materials.new(name)
            try:
                mat.use_nodes = True
            except AttributeError:
                pass
            bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
            bsdf.inputs['Base Color'].default_value = (*linear(colour), 1)
            bsdf.inputs['Roughness'].default_value = 1.0
            bsdf.inputs['Metallic'].default_value = 0.0
            if alpha < 1:
                bsdf.inputs['Alpha'].default_value = alpha
                mat.surface_render_method = 'BLENDED'
            if glow:
                bsdf.inputs['Emission Color'].default_value = (*linear(colour), 1)
                bsdf.inputs['Emission Strength'].default_value = glow
            mesh.materials.append(mat)
        obj = bpy.data.objects.new(self.name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        for o in bpy.context.scene.objects:
            o.select_set(o == obj)
        bpy.context.view_layer.objects.active = obj
        os.makedirs(OUT_DIR, exist_ok=True)
        path = os.path.join(OUT_DIR, self.name + '.glb')
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True)
        print('exported', path, len(mesh.polygons), 'faces', flush=True)


# ---------------------------------------------------------------- igloos

def sphere_point(phi, theta, r=1.0):
    return Vector((r * math.cos(phi) * math.cos(theta), r * math.cos(phi) * math.sin(theta), r * math.sin(phi)))


def igloo(name, width, window=False):
    """A dome of snow blocks laid in staggered rows, with a vaulted entrance tunnel to -y
    (the camera's front left, where houses have their door)."""
    m = Model(name)
    block = m.mat('snowBlock', SNOW_BLOCK)
    seam = m.mat('snowSeam', SNOW_SEAM)
    radius = width / 2
    height = radius * 1.02
    scale = Matrix.Diagonal((radius, radius, height, 1))
    rows = max(4, round(radius * math.pi / 2 * 0.86 / 0.072))  # blocks about 0.07 tiles high
    phi_top = math.radians(78)
    d_phi = phi_top / rows
    gap = 0.07 * d_phi  # half the seam width, as an angle
    lift = 0.07  # block thickness above the seam floor (unit sphere)
    window_at = (2, math.radians(-25)) if window else None

    def block_prism(phi0, phi1, th0, th1, material):
        g_th = gap / math.cos((phi0 + phi1) / 2)
        a0, a1, b0, b1 = phi0 + gap, phi1 - gap, th0 + g_th, th1 - g_th
        bottom = [sphere_point(a0, b0), sphere_point(a0, b1), sphere_point(a1, b1), sphere_point(a1, b0)]
        inset_p, inset_t = 0.6 * gap, 0.6 * g_th
        top = [sphere_point(a0 + inset_p, b0 + inset_t, 1 + lift), sphere_point(a0 + inset_p, b1 - inset_t, 1 + lift),
               sphere_point(a1 - inset_p, b1 - inset_t, 1 + lift), sphere_point(a1 - inset_p, b0 + inset_t, 1 + lift)]
        return m.poly_prism([scale @ p for p in bottom], [scale @ p for p in top], material)

    for row in range(rows):
        phi0, phi1 = row * d_phi, (row + 1) * d_phi
        ring = math.cos((phi0 + phi1) / 2)
        count = max(5, round(2 * math.pi * ring / (1.7 * d_phi)))
        step = 2 * math.pi / count
        offset = (row % 2) * step / 2 + math.radians(-90)
        for k in range(count):
            th0 = offset + k * step
            material = block
            if window_at and row == window_at[0]:
                mid = (th0 + step / 2 + math.pi) % (2 * math.pi) - math.pi
                if abs(mid - window_at[1]) < step / 2:
                    material = m.mat('iceWindow', ICE_WINDOW)
            block_prism(phi0, phi1, th0, th0 + step, material)
    # Key block on top.
    cap_n = 7
    cap_bottom = [scale @ sphere_point(phi_top + gap, 2 * math.pi * k / cap_n) for k in range(cap_n)]
    cap_top = [scale @ sphere_point(phi_top + 2.5 * gap, 2 * math.pi * k / cap_n, 1 + lift) for k in range(cap_n)]
    m.poly_prism(cap_bottom, cap_top, block)
    # Seam floor: a smooth shell just under the blocks, seen through the gaps.
    shell_r = 0.975
    seg, rings = 28, 8
    pts = [[scale @ sphere_point(math.pi / 2 * j / rings, 2 * math.pi * k / seg, shell_r) for k in range(seg)] for j in range(rings)]
    verts = [[m.bm.verts.new(p) for p in ring] for ring in pts]
    top_v = m.bm.verts.new(scale @ Vector((0, 0, shell_r)))
    for j in range(rings):
        for k in range(seg):
            k2 = (k + 1) % seg
            if j + 1 < rings:
                f = m.bm.faces.new((verts[j][k], verts[j][k2], verts[j + 1][k2], verts[j + 1][k]))
            else:
                f = m.bm.faces.new((verts[j][k], verts[j][k2], top_v))
            f.material_index = seam

    # Entrance tunnel: a half-cylinder vault of blocks along -y with a dark doorway.
    t_r = 0.21 * width
    t_h = t_r * 1.05
    y_in = -radius * 0.55
    y_mouth = -radius - 0.2 * width
    segments = 2 if width < 0.7 else 3
    around = 4 if width < 0.55 else 5
    d_s = (y_in - y_mouth) / segments
    d_psi = math.pi / around
    g_s = 0.07 * d_s
    g_psi = 0.07 * d_psi

    def arch(psi, y, r=1.0):
        return Vector((t_r * r * math.cos(psi), y, t_h * r * math.sin(psi)))

    for s in range(segments):
        y0, y1 = y_mouth + s * d_s, y_mouth + (s + 1) * d_s
        off = (s % 2) * d_psi / 2  # every other ring is staggered by half a block
        inner = [off + k * d_psi for k in range(around + 1) if 1e-6 < off + k * d_psi < math.pi - 1e-6]
        edges = [0.0, *inner, math.pi]
        for k in range(len(edges) - 1):
            p0, p1 = edges[k], edges[k + 1]
            a0 = p0 + (g_psi if p0 > 0 else 0)
            a1 = p1 - (g_psi if p1 < math.pi else 0)
            b0, b1 = y0 + g_s, y1 - g_s
            # Counter-clockwise seen from outside: psi grows from +x over the top to -x.
            bottom = [arch(a0, b1), arch(a1, b1), arch(a1, b0), arch(a0, b0)]
            ip, iy = 0.6 * g_psi, 0.6 * g_s
            top = [arch(a0 + ip, b1 - iy, 1 + lift), arch(a1 - ip, b1 - iy, 1 + lift),
                   arch(a1 - ip, b0 + iy, 1 + lift), arch(a0 + ip, b0 + iy, 1 + lift)]
            m.poly_prism(bottom, top, block)
    # Tunnel seam floor and the doorway.
    n = 12
    for k in range(n):
        p0, p1 = math.pi * k / n, math.pi * (k + 1) / n
        m.quad(seam, [arch(p0, y_in, 0.975), arch(p1, y_in, 0.975), arch(p1, y_mouth, 0.975), arch(p0, y_mouth, 0.975)])
    door = m.mat('doorway', DOORWAY)
    rim = [arch(math.pi * k / n, y_mouth + 0.012, 0.975) for k in range(n + 1)]
    m.bm.faces.new([m.bm.verts.new(p) for p in rim]).material_index = door
    m.export()


# ---------------------------------------------------------------- greenhouse

def greenhouse():
    """A glass house 0.7 x 0.56 tiles and 0.5 high, ridge along x, door in the +x gable (front right)."""
    m = Model('greenhouse')
    wood = m.mat('wood', WOOD)
    dark = m.mat('woodDark', WOOD_DARK)
    glass = m.mat('glass', GLASS, alpha=0.24)
    lx, ly = 0.35, 0.28  # half sizes
    wall, ridge = 0.3, 0.5
    base = 0.05
    b = 0.022
    # Wooden base boards.
    m.box(dark, (0, -ly, base / 2), (2 * lx + b, b, base))
    m.box(dark, (0, ly, base / 2), (2 * lx + b, b, base))
    m.box(dark, (-lx, 0, base / 2), (b, 2 * ly, base))
    m.box(dark, (lx, -ly / 2 - 0.05, base / 2), (b, ly - 0.1, base))
    m.box(dark, (lx, ly / 2 + 0.05, base / 2), (b, ly - 0.1, base))
    xs = [-lx, -lx / 3, lx / 3, lx]
    for x in xs:  # posts and rafters on both long sides
        for y in (-ly, ly):
            m.beam(wood, (x, y, 0), (x, y, wall), b)
        m.beam(wood, (x, -ly, wall), (x, 0, ridge), b)
        m.beam(wood, (x, ly, wall), (x, 0, ridge), b)
    for y in (-ly, ly):  # top plates
        m.beam(wood, (-lx - b / 2, y, wall), (lx + b / 2, y, wall), b)
    m.beam(wood, (-lx - b / 2, 0, ridge), (lx + b / 2, 0, ridge), b * 1.2)
    m.beam(wood, (-lx, 0, 0), (-lx, 0, ridge), b)  # back gable post
    # Door in the +x gable.
    dw, dh = 0.07, 0.22
    for y in (-dw, dw):
        m.beam(wood, (lx, y, 0), (lx, y, dh), b)
    m.beam(wood, (lx, -dw - b / 2, dh), (lx, dw + b / 2, dh), b)
    m.beam(wood, (lx, 0, dh), (lx, 0, ridge), b)
    m.box(wood, (lx + 0.012, dw - 0.03, 0.11), (0.012, 0.012, 0.012))  # handle
    # Glass: long walls, gables, roof. Panes sit just inside the frame line.
    e = 0.004
    for y, sign in ((-ly + e, -1), (ly - e, 1)):
        c = [(-lx, y, base), (lx, y, base), (lx, y, wall), (-lx, y, wall)]
        m.quad(glass, c if sign < 0 else list(reversed(c)))
        roof = [(-lx, y, wall), (lx, y, wall), (lx, 0, ridge), (-lx, 0, ridge)]
        m.quad(glass, roof if sign < 0 else list(reversed(roof)))
    for x, sign in ((-lx + e, -1), (lx - e, 1)):
        side = [(x, ly, base), (x, -ly, base), (x, -ly, wall), (x, 0, ridge), (x, ly, wall)]
        m.bm.faces.new([m.bm.verts.new(p) for p in (side if sign < 0 else list(reversed(side)))]).material_index = glass
    m.export()


# ---------------------------------------------------------------- snow castle

def crenellate(m, material, a, b, z, size, gap):
    """Merlons along the wall top from a to b (2D points)."""
    a, b = Vector(a), Vector(b)
    d = b - a
    count = max(2, int((d.length + gap) // (size + gap)))
    spare = d.length - count * size - (count - 1) * gap
    turn = math.degrees(math.atan2(d.y, d.x))
    for k in range(count):
        t = (spare / 2 + size / 2 + k * (size + gap)) / d.length
        p = a + d * t
        m.box(material, (p.x, p.y, z + size * 0.45), (size, size * 0.9, size * 0.9), turn)


def snow_castle():
    """Ice walls round a small yard, a gate in the -y wall, towers at the left and right corners."""
    m = Model('snow-castle')
    ice = m.mat('ice', ICE)
    edge = m.mat('iceEdge', ICE_EDGE)
    roof = m.mat('iceDark', ICE_DARK)
    door = m.mat('doorway', DOORWAY)
    red = m.mat('flag', RED)
    s, t, h = 0.29, 0.07, 0.22  # half size, wall thickness, wall height
    walls = [((-s, s), (s, s)), ((-s, -s), (-s, s)), ((s, -s), (s, s))]
    for (ax, ay), (bx, by) in walls:
        m.box(ice, ((ax + bx) / 2, (ay + by) / 2, h / 2), (abs(bx - ax) + t, abs(by - ay) + t, h))
        crenellate(m, edge, (ax, ay), (bx, by), h, 0.05, 0.035)
    gate = 0.085
    gate_h = 0.15
    for x0, x1 in ((-s - t / 2, -gate), (gate, s + t / 2)):  # front-left wall with the gate
        m.box(ice, ((x0 + x1) / 2, -s, h / 2), (x1 - x0, t, h))
    m.box(ice, (0, -s, (h + gate_h) / 2), (2 * gate, t, h - gate_h))
    crenellate(m, edge, (-s, -s), (s, -s), h, 0.05, 0.035)
    m.quad(door, [(-gate, -s + 0.01, 0), (gate, -s + 0.01, 0), (gate, -s + 0.01, gate_h), (-gate, -s + 0.01, gate_h)])
    for cx, cy in ((-s, -s), (s, s)):
        tower_h = 0.4
        m.cylinder(ice, (cx, cy, 0), 0.085, tower_h, segments=8, turn=22.5)
        m.cylinder(edge, (cx, cy, tower_h), 0.1, 0.035, segments=8, turn=22.5)
        for k in range(8):
            a = math.radians(22.5 + 45 * k)
            m.box(edge, (cx + 0.085 * math.cos(a), cy + 0.085 * math.sin(a), tower_h + 0.055), (0.035, 0.035, 0.04), 22.5 + 45 * k)
        m.cylinder(roof, (cx, cy, tower_h + 0.035), 0.07, 0.16, segments=8, radius_top=0.0, turn=22.5)
        top = tower_h + 0.035 + 0.16
        m.beam(m.mat('woodDark', WOOD_DARK), (cx, cy, top - 0.02), (cx, cy, top + 0.1), 0.012)
        # A pennant flying toward the screen's right, so it faces the camera.
        tip = (cx + 0.075 * math.sqrt(0.5), cy + 0.075 * math.sqrt(0.5), top + 0.075)
        flag = m.bm.faces.new([m.bm.verts.new(p) for p in ((cx, cy, top + 0.05), tip, (cx, cy, top + 0.1))])
        flag.material_index = red
    m.export()


# ---------------------------------------------------------------- icebreaker

def icebreaker():
    """A red-hulled icebreaker, bow to +x, about 1 tile long (the ship icon)."""
    m = Model('icebreaker')
    red = m.mat('hull', RED)
    dark = m.mat('boot', DARK)
    deck = m.mat('deck', DECK)
    white = m.mat('cabin', WHITE)
    window = m.mat('window', DARK)
    yellow = m.mat('funnel', YELLOW)

    def outline(length, beam, bow, z):
        """Deck outline: square stern at -x, straight sides, a blunt pointed bow at +x."""
        half = length / 2
        pts = [(-half, -beam), (bow, -beam), (half - 0.02, -beam * 0.35), (half, 0), (half - 0.02, beam * 0.35), (bow, beam), (-half, beam)]
        return [Vector((x, y, z)) for x, y in pts]

    keel = outline(0.86, 0.12, 0.12, 0.0)
    for v in keel:
        v.x -= 0.04
    boot = outline(0.92, 0.135, 0.15, 0.05)
    for v in boot:
        v.x -= 0.02
    top = outline(1.0, 0.15, 0.18, 0.17)
    m.poly_prism(keel, boot, dark, cap_bottom=True)
    faces = m.poly_prism(boot, top, red)
    faces[0].material_index = deck
    # Superstructure, bridge with windows, funnel and mast.
    m.box(white, (-0.12, 0, 0.17 + 0.06), (0.36, 0.22, 0.12))
    m.box(white, (0.0, 0, 0.29 + 0.05), (0.14, 0.26, 0.1))
    m.box(window, (0.072, 0, 0.35), (0.006, 0.22, 0.035))
    m.box(window, (0.0, -0.131, 0.35), (0.1, 0.006, 0.035))
    m.box(window, (0.0, 0.131, 0.35), (0.1, 0.006, 0.035))
    m.cylinder(yellow, (-0.2, 0, 0.29), 0.05, 0.14, segments=8)
    m.cylinder(dark, (-0.2, 0, 0.43), 0.052, 0.035, segments=8)
    m.beam(dark, (0.0, 0, 0.39), (0.0, 0, 0.5), 0.012)
    m.beam(dark, (0.0, -0.06, 0.47), (0.0, 0.06, 0.47), 0.01)
    m.export()


# ---------------------------------------------------------------- small things

def ice_block():
    """A cut block of ice with light bevelled edges, 0.2 x 0.14 x 0.12 tiles."""
    m = Model('ice-block')
    ice = m.mat('ice', ICE)
    edge = m.mat('iceEdge', ICE_EDGE)
    faces = m.box(ice, (0, 0, 0.06), (0.2, 0.14, 0.12))
    edges = list({e for f in faces for e in f.edges})
    out = bmesh.ops.bevel(m.bm, geom=edges, offset=0.016, segments=1, profile=0.5, affect='EDGES', clamp_overlap=True)
    for f in out['faces']:
        f.material_index = edge
    m.export()


def steam():
    """See-through white puffs: low ones on the water and two small ones rising, about 0.25
    tiles across and 0.25 high."""
    m = Model('steam')
    white = m.mat('steam', STEAM, alpha=0.6)
    for x, y, z, r in ((0.0, 0.0, 0.04, 0.06), (0.075, -0.035, 0.03, 0.042), (-0.07, 0.035, 0.035, 0.046),
                       (0.02, 0.01, 0.13, 0.038), (-0.01, 0.03, 0.21, 0.027)):
        out = bmesh.ops.create_icosphere(m.bm, subdivisions=2, radius=r, matrix=Matrix.LocRotScale(Vector((x, y, z)), None, Vector((1.25, 1.25, 0.7))))
        for f in {f for v in out['verts'] for f in v.link_faces}:
            f.material_index = white
    m.export()


def flames():
    """Tongues of fire: tall orange ones at the back, yellow ones in front (toward the camera)."""
    m = Model('flames')
    orange = m.mat('flame', FLAME, glow=0.6)
    yellow = m.mat('flameCore', FLAME_CORE, glow=0.8)
    for x, y, r, h, turn, mat in ((0.0, 0.02, 0.105, 0.34, 0, orange), (-0.065, 0.065, 0.075, 0.25, 20, orange),
                                  (0.065, 0.065, 0.075, 0.27, 40, orange), (-0.08, -0.03, 0.07, 0.21, 10, orange),
                                  (0.08, -0.04, 0.065, 0.19, 30, orange), (0.025, -0.05, 0.07, 0.23, 15, yellow),
                                  (-0.035, -0.07, 0.05, 0.16, 35, yellow), (0.07, -0.09, 0.045, 0.13, 5, yellow)):
        m.cylinder(mat, (x, y, 0), r, h, segments=5, radius_top=0.0, turn=turn)
    m.export()


MODELS = {
    'igloo-small': lambda: igloo('igloo-small', 0.45),
    'igloo': lambda: igloo('igloo', 0.6),
    'igloo-large': lambda: igloo('igloo-large', 0.75, window=True),
    'greenhouse': greenhouse,
    'snow-castle': snow_castle,
    'icebreaker': icebreaker,
    'ice-block': ice_block,
    'steam': steam,
    'flames': flames,
}

for model_name, build in MODELS.items():
    if ONLY and model_name not in ONLY:
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build()
