"""Build the continuous C15 riverfront in physical-scale, Y-up runtime coordinates.

Blender exact terrain/engineering geometry, no generated buildings or foliage.
Run with Blender --background --python scripts/blender_c15_riverfront.py.
"""
import bpy
import json
import math
import random
import sys
from array import array
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'assets/source/blender/C15/riverfront_environment'
OUT = ROOT / 'public/assets/C15'
WORK.mkdir(parents=True, exist_ok=True)
(WORK / 'textures').mkdir(exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
random.seed(151540)

RADIUS = 40.0
WATER_RADIUS = 39.47
ZMIN, ZMAX = -120.0, 120.0


def river_center(z):
    t = z + 40
    return .06 + .40 * math.sin(t * .055) + .20 * math.sin(t * .19) + .85 * math.sin(t * .20) * math.exp(-(t / 22) ** 2)


def river_width(z):
    return .62 + .28 * (1 - math.cos((z + 40) * .115))


def terrain_height(s, z):
    """Height inward from radius 39.48; graded hero plaza at s=-1.28,z=-40."""
    d = abs(s - river_center(z))
    half = river_width(z) / 2
    if d < half + .09:
        return -.22 + .25 * min(1, max(0, (d - half + .02) / .11))
    if abs(s - (river_center(z) - half - .27)) < .105:
        return .03
    if abs(z + 43) < .10 and abs(s-river_center(z)) < half + 1.2:
        return .03
    # Immediate river land is gently graded, the outer zone rises into forested hills.
    h = .05 + .025 * math.sin(z * .11 + s * 1.7)
    hill = max(0, abs(s) - 2.2) / 16.8
    h += hill * (1.6 + .8 * math.sin(z * .058 + s * .33))
    h += hill * .24 * math.sin(s * 1.9 + z * .16) * math.sin(z * .095)
    hero = math.exp(-((z + 43) / 13) ** 2)
    h += hero * (.16 * math.exp(-((s - river_center(z) - 1.35) / .55) ** 2) + .11 * math.exp(-((s - river_center(z) + 2.1) / .6) ** 2))
    # Engineered public space graded to 10m above the ordinary land datum.
    plaza = math.exp(-((s + 1.28) / .84) ** 8 - ((z + 40) / 1.0) ** 8)
    # Pavilion has a horizontal footing: compensate the cylinder's curvature.
    plaza_height = 39.48 - 39.41 / math.cos(s / RADIUS)
    return h * (1 - plaza) + plaza_height * plaza


def surface(s, z, radius, belt=0):
    a = -math.pi / 2 + belt * math.tau / 3 + s / RADIUS
    return (math.cos(a) * radius, math.sin(a) * radius, z)


def terrain_point(s, z, belt=0):
    return surface(s, z, 39.48 - terrain_height(s, z), belt)


def mapped(p):
    return (p[0], -p[2], p[1])


def make_material(name, color, roughness, metal=0, texture=None, alpha=1):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, alpha)
    mat.use_nodes = True
    shader = next((node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'), None)
    if shader is None:
        shader = mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
        output = mat.node_tree.nodes.new('ShaderNodeOutputMaterial')
        mat.node_tree.links.new(shader.outputs['BSDF'], output.inputs['Surface'])
    shader.inputs['Base Color'].default_value = (*color, alpha)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Alpha'].default_value = alpha
    mat.use_backface_culling = False
    if alpha < 1:
        mat.surface_render_method = 'DITHERED'
        shader.inputs['IOR'].default_value = 1.46
    if texture:
        for suffix, socket in [('base', 'Base Color'), ('roughness', 'Roughness'), ('normal', 'Normal')]:
            photo = texture in ['aerial_grass_rock', 'concrete_floor']
            path = WORK / 'textures' / (f'ph_{texture}_{suffix}.jpg' if photo else f'{texture}_{suffix}.png')
            image = bpy.data.images.load(str(path), check_existing=True)
            if suffix != 'base':
                image.colorspace_settings.name = 'Non-Color'
            image.pack()
            node = mat.node_tree.nodes.new('ShaderNodeTexImage')
            node.image = image
            node.extension = 'REPEAT'
            if suffix == 'normal':
                normal = mat.node_tree.nodes.new('ShaderNodeNormalMap')
                normal.inputs['Strength'].default_value = .18 if texture == 'water' else .22 if photo else .05
                mat.node_tree.links.new(node.outputs['Color'], normal.inputs['Color'])
                mat.node_tree.links.new(normal.outputs['Normal'], shader.inputs[socket])
            else:
                mat.node_tree.links.new(node.outputs['Color'], shader.inputs[socket])
    return mat


def textures(kind, base, rough, size=512):
    # Tileable multi-frequency microtexture; images retained as editable PBR source.
    channels = {name: array('f') for name in ['base', 'roughness', 'normal']}
    for y in range(size):
        v = math.tau * y / size
        for x in range(size):
            u = math.tau * x / size
            grain = ((x * 149 + y * 227 + x * y * 31) % 991) / 991 - .5
            waves = math.sin(u * 11 + math.sin(v * 7)) * math.cos(v * 13 + math.sin(u * 5))
            broad = math.sin(u * 3 + math.sin(v * 2)) * math.cos(v * 4)
            value = 1 + .008 * waves + .012 * broad + grain * .09
            if kind == 'water':
                value = 1 + .07 * waves
                nx, ny = math.cos(u * 23 + v * 5) * .14, math.sin(v * 31 + u * 7) * .09
            else:
                # Irregular micrograin, not repeating concentric/spiral macro relief.
                nx = grain * .035 + math.cos(u * 11 + v * 7) * .005
                ny = grain * .025 - math.sin(v * 13 + u * 5) * .005
            normal = Vector((nx, ny, 1)).normalized()
            channels['base'].extend((*[max(0, min(1, c * value)) for c in base], 1))
            r = max(.05, min(.99, rough + waves * .055 + grain * .03))
            channels['roughness'].extend((r, r, r, 1))
            channels['normal'].extend(((normal.x + 1) / 2, (normal.y + 1) / 2, (normal.z + 1) / 2, 1))
    for suffix, pixels in channels.items():
        image = bpy.data.images.new(f'{kind}_{suffix}', width=size, height=size)
        if suffix != 'base':
            image.colorspace_settings.name = 'Non-Color'
        image.pixels.foreach_set(pixels)
        image.filepath_raw = str(WORK / 'textures' / f'{kind}_{suffix}.png')
        image.file_format = 'PNG'
        image.save()
        bpy.data.images.remove(image)


textures('water', (.018, .10, .14), .15)
ground = make_material('Photographic ecological grass and moss CC0 Poly Haven', (.88, 1, .85), .94, texture='aerial_grass_rock')
rock = make_material('Photographic weathered river rock CC0 Poly Haven', (.80, .82, .78), .89, texture='aerial_grass_rock')
concrete = make_material('Photographic worn aggregate concrete CC0 Poly Haven', (1, 1, .97), .82, texture='concrete_floor')
water = make_material('Freshwater rippled reflective surface', (1, 1, 1), .15, .12, texture='water')
steel = make_material('Satin titanium structural metal', (.38, .43, .46), .34, .78)
dark = make_material('Bridge expansion joint elastomer', (.024, .029, .026), .87)
glass = make_material('Clear laminated habitat glazing', (.42, .58, .65), .055, .05, alpha=.10)
light = make_material('Warm recessed walkway guide light', (.78, .41, .12), .45)
light_shader = next(node for node in light.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
light_shader.inputs['Emission Color'].default_value = (1, .48, .12, 1)
light_shader.inputs['Emission Strength'].default_value = 1.7


class Builder:
    """One mesh per functional group, shared materials limit runtime draw calls."""
    def __init__(self, name):
        self.name, self.vs, self.fs, self.uvs, self.indices, self.materials = name, [], [], [], [], []

    def add(self, vertices, faces, mat, uvs=None):
        offset = len(self.vs)
        self.vs.extend(vertices)
        self.uvs.extend(uvs or [(p[0], p[2]) for p in vertices])
        if mat not in self.materials:
            self.materials.append(mat)
        index = self.materials.index(mat)
        self.fs.extend(tuple(offset + k for k in face) for face in faces)
        self.indices.extend([index] * len(faces))

    def finish(self):
        data = bpy.data.meshes.new(self.name)
        data.from_pydata([mapped(p) for p in self.vs], [], self.fs)
        data.update()
        for material in self.materials:
            data.materials.append(material)
        uv = data.uv_layers.new(name='PhysicalSurfaceUV')
        for poly, index in zip(data.polygons, self.indices):
            poly.material_index = index
            poly.use_smooth = self.name.startswith(('terrain', 'river', 'rock'))
            for loop in poly.loop_indices:
                vertex_index = data.loops[loop].vertex_index
                if self.name.startswith(('bridge', 'rocks', 'public_', 'dock_')) or self.name == 'walkway_hero_plaza':
                    # Per-face physical projection avoids stretched vertical concrete.
                    p = data.vertices[vertex_index].co
                    axis = max(range(3), key=lambda k: abs(poly.normal[k]))
                    coordinates = [(p.y, p.z), (p.x, p.z), (p.x, p.y)][axis]
                    scale = 100 / 15 if self.name.startswith('rocks') else 100 / 2.1
                    uv.data[loop].uv = (coordinates[0] * scale, coordinates[1] * scale)
                else:
                    uv.data[loop].uv = self.uvs[vertex_index]
        obj = bpy.data.objects.new(self.name, data)
        bpy.context.collection.objects.link(obj)
        return obj


parts = {}


def part(name):
    if name not in parts:
        parts[name] = Builder(name)
    return parts[name]


def box(name, center, size, mat, belt=0):
    x, y, z = center
    a, b, c = [k / 2 for k in size]
    vertices = [(x + dx * a, y + dy * b, z + dz * c) for dx, dy, dz in [(-1,-1,-1), (1,-1,-1), (1,1,-1), (-1,1,-1), (-1,-1,1), (1,-1,1), (1,1,1), (-1,1,1)]]
    if belt:
        q = belt * math.tau / 3
        vertices = [(x * math.cos(q) - y * math.sin(q), x * math.sin(q) + y * math.cos(q), z) for x, y, z in vertices]
    part(name).add(vertices, [(0,3,2,1), (4,5,6,7), (0,1,5,4), (1,2,6,5), (2,3,7,6), (3,0,4,7)], mat)


def beam(name, start, end, radius, mat, sides=4):
    a, b = Vector(start), Vector(end)
    direction = (b - a).normalized()
    side = direction.cross(Vector((0, 0, 1)))
    if side.length < .01:
        side = direction.cross(Vector((0, 1, 0)))
    side.normalize()
    other = direction.cross(side).normalized()
    vertices = [tuple(p + radius * (side * math.cos(i * math.tau / sides) + other * math.sin(i * math.tau / sides))) for p in [a, b] for i in range(sides)]
    faces = [(i, (i + 1) % sides, (i + 1) % sides + sides, i + sides) for i in range(sides)]
    faces += [tuple(range(sides - 1, -1, -1)), tuple(range(sides, sides * 2))]
    part(name).add(vertices, faces, mat)


def ribbon(name, zs, left, right, radius, mat, belt=0, thickness=0):
    vertices, uvs = [], []
    for z in zs:
        for s in [left(z), right(z)]:
            r = radius(s, z) if callable(radius) else radius
            vertices.append(surface(s, z, r, belt))
            scale = 100 / 2.1 if mat == concrete else 100 / 15 if mat == rock else 10
            uvs.append((s * scale, z * scale))
    faces = [(i * 2 + 2, i * 2 + 3, i * 2 + 1, i * 2) for i in range(len(zs) - 1)]
    part(name).add(vertices, faces, mat, uvs)
    if thickness:
        under = [surface(s, z, (radius(s, z) if callable(radius) else radius) + thickness, belt) for z in zs for s in [left(z), right(z)]]
        edgefaces = []
        n = len(vertices)
        for i in range(len(zs) - 1):
            k = 2 * i
            edgefaces += [(k, k + 2, k + 2 + n, k + n), (k + 1, k + 1 + n, k + 3 + n, k + 3)]
        part(name).add(vertices + under, edgefaces, mat, uvs + uvs)


# Rows follow the river exactly. No grass polygons bridge across the wet channel;
# a fixed-grid narrow dip can disappear during triangle interpolation.
zs = [ZMIN + i * (ZMAX - ZMIN) / 128 for i in range(129)]
# Exact hero location and bridge rows are present in terrain, not merely inferred.
zs = sorted(set(zs + [-46, -43, -41, -40.8, -40.65, -40, -39.35, -39.2, -39, -38.35, -37, -35, -32] + [-55+i*.50 for i in range(45)]))


def terrain_row(z, side):
    c, half = river_center(z), river_width(z) / 2
    if side < 0:
        edge = c - half
        road = edge - .27
        return ([-19 + i * 16 / 23 for i in range(24)]
                + [-3 + (road - .125 + 3) * i / 18 for i in range(1,19)]
                + [road-.105,road-.06,road,road+.06,road+.105,edge-.09,edge-.025,edge])
    edge = c + half
    return ([edge, edge + .025, edge + .09]
            + [edge + .12 + (3 - edge - .12) * i / 18 for i in range(18)]
            + [3 + i * 16 / 23 for i in range(24)])


for belt in range(3):
    for side in [-1, 1]:
        rows = [terrain_row(z, side) for z in zs]
        vertices = [terrain_point(s, z, belt) for z, row in zip(zs, rows) for s in row]
        # Smaller physical tiles and weak irregular micrograin avoid visible sand ripples.
        uvs = [(s * (100/15), z * (100/15)) for z, row in zip(zs, rows) for s in row]
        n = len(rows[0])
        assert all(len(row) == n for row in rows)
        faces = []
        for j in range(len(zs) - 1):
            for i in range(n - 1):
                k = j * n + i
                faces.append((k + n, k + n + 1, k + 1, k))
        part(f'terrain_{belt}').add(vertices, faces, ground, uvs)
    riverzs = [ZMIN + i * (ZMAX - ZMIN) / 384 for i in range(385)]
    ribbon(f'river_{belt}', riverzs, lambda z: river_center(z) - river_width(z) / 2, lambda z: river_center(z) + river_width(z) / 2, WATER_RADIUS, water, belt)
    for side in [-1, 1]:
        bank = lambda z, side=side: river_center(z) + side * (river_width(z) / 2 + .075)
        ribbon(f'embankment_{belt}', riverzs, lambda z, bank=bank: bank(z) - .07, lambda z, bank=bank: bank(z) + .07, lambda s,z: 39.48 - terrain_height(s, z) - .004, rock, belt, .025)
    # Long continuous access road on the left bank: 12m wide, height follows graded land.
    roadcenter = lambda z: river_center(z) - river_width(z) / 2 - .27
    ribbon(f'walkway_{belt}', riverzs, lambda z: roadcenter(z) - .06, lambda z: roadcenter(z) + .06, 39.43, concrete, belt, .025)
    # Real streets link clustered neighborhoods, following actual inclined ground.
    for side in [-1,1]:
        for offset in [1.6,2.6,3.6,4.6]:
            centerline = lambda z, side=side,offset=offset: river_center(z)+side*offset
            ribbon(f'public_streets_{belt}', zs, lambda z,centerline=centerline: centerline(z)-.025, lambda z,centerline=centerline: centerline(z)+.025, lambda s,z:39.48-terrain_height(s,z)-.004, concrete, belt)
    # Close the exposed earth edge rather than showing infinitely thin black wedges.
    for side in [-1,1]:
        vertices=[];uvs=[]
        for z in zs:
            s=side*19
            vertices.extend([terrain_point(s,z,belt),surface(s,z,40,belt)])
            uvs.extend([(z/ .15,0),(z/.15,(terrain_height(s,z)+.52)/.15)])
        faces=[(k,k+1,k+3,k+2) for k in range(0,len(vertices)-2,2)]
        part(f'terrain_edge_cliff_{belt}').add(vertices,faces,rock,uvs)

    # Near bridge spans the banks; 10m usable deck, shallow structural arch and piers.
    for bridge_z in [-43, -12, 24, 69]:
        c = river_center(bridge_z)
        halfspan = river_width(bridge_z) / 2 + .27
        decky = -39.38
        box(f'bridge_{belt}', (c, decky, bridge_z), (halfspan * 2, .026, .10), concrete, belt)
        for x in [c - halfspan + .03, c + halfspan - .03]:
            box(f'bridge_{belt}', (x, -39.57, bridge_z), (.055, .38, .075), concrete, belt)
            box(f'bridge_{belt}', (x, decky + .015, bridge_z), (.025, .003, .102), dark, belt)
        q = belt * math.tau / 3
        transform = lambda p: (p[0] * math.cos(q) - p[1] * math.sin(q), p[0] * math.sin(q) + p[1] * math.cos(q), p[2])
        # Closed concrete approach wedges join the deck to graded dry ground.
        for side in [-1, 1]:
            nearx = c + side * halfspan
            farx = nearx + side * .9
            fary = surface(farx, bridge_z, 39.43)[1]
            for section in range(4):
                x0 = nearx + (farx - nearx) * section / 4
                x1 = nearx + (farx - nearx) * (section + 1) / 4
                y0 = decky + .013 + (fary - decky - .013) * section / 4
                y1 = decky + .013 + (fary - decky - .013) * (section + 1) / 4
                bottom0 = terrain_point(x0, bridge_z)[1] - .02
                bottom1 = terrain_point(x1, bridge_z)[1] - .02
                vs = [(x0,bottom0,bridge_z-.05),(x1,bottom1,bridge_z-.05),(x1,y1,bridge_z-.05),(x0,y0,bridge_z-.05),(x0,bottom0,bridge_z+.05),(x1,bottom1,bridge_z+.05),(x1,y1,bridge_z+.05),(x0,y0,bridge_z+.05)]
                part(f'bridge_{belt}').add([transform(p) for p in vs], [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)], concrete)
        for side in [-1, 1]:
            for j in range(20):
                x0, x1 = c - halfspan + 2 * halfspan * j / 20, c - halfspan + 2 * halfspan * (j + 1) / 20
                arch = lambda x: -39.46 + .06 * (1 - ((x - c) / halfspan) ** 2)
                beam(f'bridge_{belt}', transform((x0, arch(x0), bridge_z + side * .042)), transform((x1, arch(x1), bridge_z + side * .042)), .010, steel)
                beam(f'bridge_{belt}', transform((x0, decky + .012, bridge_z + side * .047)), transform((x0, decky + .023, bridge_z + side * .047)), .00025, steel)
            beam(f'bridge_{belt}', transform((c - halfspan, decky + .023, bridge_z + side * .047)), transform((c + halfspan, decky + .023, bridge_z + side * .047)), .0002, steel)

# A 120m formal pavilion needs a 130m foundation, clear of the 12m promenade.
box('walkway_hero_plaza', (-1.28, -39.405, -40), (1.3, .050, 1.45), concrete)
for step in range(28):
    top = -39.426 + (step + 1) * (.046 / 28)
    box('walkway_hero_plaza', (-.548 - step * .003, top - .006, -40), (.0032, .012, .20), concrete)
for z in [-40.62, -39.38]:
    box('walkway_hero_plaza', (-1.28, -39.375, z), (1.16, .010, .052), concrete)
    box('walkway_hero_plaza', (-1.28, -39.369, z), (1.14, .002, .045), rock)

# Actual 1.1m safety railing, 20cm curb and paving joints along the hero stretch.
for j in range(501):
    z = -47 + j * .02
    s = river_center(z) - river_width(z) / 2 - .218
    a = surface(s, z, 39.431)
    top = surface(s, z, 39.419)
    beam('walkway_hero_rails', a, top, .00025, steel)
    if j < 500:
        nextz = z + .02
        nexts = river_center(nextz) - river_width(nextz) / 2 - .218
        beam('walkway_hero_rails', top, surface(nexts, nextz, 39.419), .0002, steel)
        beam('walkway_hero_rails', surface(s, z, 39.424), surface(nexts, nextz, 39.424), .0002, steel)
        ribbon('walkway_hero_lights', [z, nextz], lambda t: river_center(t) - river_width(t)/2 - .214, lambda t: river_center(t) - river_width(t)/2 - .212, 39.428, light)
    if j % 5 == 0:
        ribbon('walkway_hero_joints', [z, z + .0015], lambda t: river_center(t)-river_width(t)/2-.33, lambda t: river_center(t)-river_width(t)/2-.21, 39.429, dark)

# Human-scale civic furniture and real planting soil alongside the winding walk.
planting_anchors=[]
for i in range(19):
    z=-47+i*.44
    road=river_center(z)-river_width(z)/2-.27
    if -40.8<z<-39.2: continue
    s=road-.09
    p=surface(s,z,39.43)
    box('public_planting_beds',(p[0],p[1]+.004,z),(.044,.008,.12),concrete)
    box('public_planting_beds',(p[0],p[1]+.008,z),(.038,.001,.114),ground)
    planting_anchors.append({'s':s,'z':z,'radius':39.421,'heightMeters':.8,'widthMeters':4.4,'lengthMeters':12})
    lamp=surface(road+.045,z+.10,39.43)
    foot=(lamp[0],lamp[1],lamp[2])
    top=(lamp[0],lamp[1]+.032,lamp[2])
    beam('public_lighting',foot,top,.0004,steel,8)
    box('public_lighting',(lamp[0],lamp[1]+.001,lamp[2]),(.002,.002,.002),steel)
    box('public_lighting',(lamp[0]+.002,lamp[1]+.032,lamp[2]),(.006,.0012,.002),steel)
    box('public_lighting',(lamp[0]+.002,lamp[1]+.0315,lamp[2]),(.005,.0003,.0015),light)

# Near quay: 8m into the water, 18m along-bank with a short shore connection.
dock_z=-41.1
dock_edge=river_center(dock_z)-river_width(dock_z)/2
box('dock_hero',(dock_edge-.04,-39.455,dock_z),(.24,.020,.18),concrete)
for x in [dock_edge-.14,dock_edge+.06]:
    for z in [dock_z-.075,dock_z+.075]:
        beam('dock_hero',(x,-39.72,z),(x,-39.445,z),.004,steel,8)
for z in [dock_z-.09,dock_z+.09]:
    beam('dock_hero',(dock_edge-.16,-39.434,z),(dock_edge+.08,-39.434,z),.001,steel,6)
    for x in [dock_edge-.14,dock_edge+.06]:
        beam('dock_hero',(x,-39.445,z),(x,-39.434,z),.0007,steel,6)
for z in [dock_z-.05,dock_z+.05]:
    beam('dock_hero',(dock_edge+.082,-39.462,z-.012),(dock_edge+.082,-39.462,z+.012),.0025,dark,8)

# A genuine inclined recirculation cascade, following the graded rock shore.
# Water meshes follow terrain heights; no camera-facing painted waterfall cards.
cascade_z=-46.0
center=river_center(cascade_z)
vertices=[];uvs=[];radii=[]
for i in range(41):
    t=i/40
    s=center+1.32-t*.98
    z=cascade_z-.04*t
    r=min(WATER_RADIUS-.003,39.48-terrain_height(s,z)-.009)
    radii.append(r)
    for width in [-.015,.015]:
        vertices.append(surface(s,z+width,r))
        uvs.append((t*8,0 if width<0 else 1))
faces=[(k,k+1,k+3,k+2) for k in range(0,80,2)]
part('cascade_water_0').add(vertices,faces,water,uvs)

# Concentrated hero shore outcrops: irregular topology physically embedded in the
# slopes, rather than the previous single smooth green trench wall.
for i in range(72):
    z=random.uniform(-53,-35)
    side=1 if i%4 else -1
    s=river_center(z)+side*(river_width(z)/2+random.uniform(.13,.37))
    if side<0 and -41.2<z<-38.8: continue
    center3=Vector(terrain_point(s,z))
    up=Vector((-center3.x,-center3.y,0)).normalized()
    tangent=Vector((-up.y,up.x,0))
    size=random.uniform(.018,.085)
    vs=[]
    for j in range(6):
        phi=math.pi*j/5
        for k in range(10):
            a=math.tau*k/10
            n=1+.25*math.sin(a*3+i*.73)*math.sin(phi*2)+.13*math.cos(a*5-i)
            vs.append(tuple(center3+up*(math.cos(phi)*size*.65-size*.20)+tangent*(math.sin(phi)*math.cos(a)*size*n)+Vector((0,0,math.sin(phi)*math.sin(a)*size*n))))
    fs=[(j*10+k,j*10+(k+1)%10,(j+1)*10+(k+1)%10,(j+1)*10+k) for j in range(5) for k in range(10)]
    part('rocks_hero').add(vs,fs,rock)

# Exposed rock outcrops: bounded rounded irregular topology, embedded in dry bank.
for belt in range(3):
    for i in range(65):
        z = random.uniform(-110, 110)
        side = -1 if i % 2 else 1
        s = river_center(z) + side * (river_width(z) / 2 + random.uniform(.09, .21))
        if belt == 0 and abs(z + 40) < 2.3 and side == -1:
            continue
        center = Vector(terrain_point(s, z, belt))
        up = Vector((-center.x, -center.y, 0)).normalized()
        tangent = Vector((-up.y, up.x, 0))
        scale = random.uniform(.018, .07)
        vertices = []
        for lat in range(5):
            phi = math.pi * lat / 4
            for k in range(8):
                az = math.tau * k / 8
                n = 1 + .16 * math.sin(az * 3 + i) * math.sin(phi * 2)
                p = center + up * (math.cos(phi) * scale * .5 - scale * .18) + tangent * (math.sin(phi) * math.cos(az) * scale * n) + Vector((0, 0, math.sin(phi) * math.sin(az) * scale * .8 * n))
                vertices.append(tuple(p))
        faces = [(j*8+k, j*8+(k+1)%8, (j+1)*8+(k+1)%8, (j+1)*8+k) for j in range(4) for k in range(8)]
        part(f'rocks_{belt}').add(vertices, faces, rock)

# Three transparent windows alternate with inhabited terrain. Structural grids carry
# load through curved longitudinal chords, transverse arches and diagonal bracing.
for belt in range(3):
    midpoint = -math.pi / 2 + (belt + .5) * math.tau / 3
    amin, amax = midpoint - .566, midpoint + .566
    angle = [amin + (amax - amin) * i / 12 for i in range(13)]
    windowzs = [ZMIN + (ZMAX - ZMIN) * i / 30 for i in range(31)]
    for j in range(30):
        for k in range(12):
            vs = [(39.97 * math.cos(a), 39.97 * math.sin(a), z) for z, a in [(windowzs[j],angle[k]), (windowzs[j],angle[k+1]), (windowzs[j+1],angle[k+1]), (windowzs[j+1],angle[k])]]
            part(f'glass_segments_{belt}').add(vs, [(0,1,2,3)], glass, [(0,0), (1,0), (1,1), (0,1)])
    for j, z in enumerate(windowzs):
        for k in range(12):
            p0 = (39.86 * math.cos(angle[k]), 39.86 * math.sin(angle[k]), z)
            p1 = (39.86 * math.cos(angle[k+1]), 39.86 * math.sin(angle[k+1]), z)
            beam(f'window_frame_{belt}', p0, p1, .045, steel)
            if j < 30:
                end = (p0[0], p0[1], windowzs[j+1])
                beam(f'window_frame_{belt}', p0, end, .035 if k % 3 else .065, concrete)
                if k % 3 == 0:
                    p2 = (39.94 * math.cos(angle[k+1]), 39.94 * math.sin(angle[k+1]), windowzs[j+1])
                    beam(f'window_frame_{belt}', p0, p2, .017, steel)
        # Secondary mullions subdivide the high-detail zone nearest the entry view.
        if -55 < z < -25:
            for subdiv in range(1, 8):
                localz = z + (windowzs[min(j+1,30)] - z) * subdiv / 8
                for k in range(12):
                    beam(f'window_frame_{belt}', (39.92*math.cos(angle[k]),39.92*math.sin(angle[k]),localz), (39.92*math.cos(angle[k+1]),39.92*math.sin(angle[k+1]),localz), .009, steel)

objects = [builder.finish() for builder in parts.values()]
triangles = sum(len(poly.vertices) - 2 for obj in objects for poly in obj.data.polygons)
assert triangles < 250000, f'Environment budget exceeded: {triangles}'
assert all(math.isfinite(c) for obj in objects for v in obj.data.vertices for c in v.co)
assert abs(river_center(-40) - .06) < 1e-9
assert abs(river_width(-40) - .62) < 1e-9
assert abs(terrain_point(-1.28, -40)[1] + 39.41) < 1e-9
# Ray checks test exported mesh topology, not just the analytic terrain formula.
terrain_mesh = next(obj for obj in objects if obj.name == 'terrain_0').data
terrain_bvh = BVHTree.FromPolygons([v.co for v in terrain_mesh.vertices], [list(p.vertices) for p in terrain_mesh.polygons])
for z in [-43, -42.2, -41, -40, -39.5, -38]:
    for fraction in [-.4, 0, .4]:
        s = river_center(z) + river_width(z) * fraction
        origin = Vector(mapped(surface(s, z, 39.2)))
        theta = -math.pi / 2 + s / RADIUS
        direction = Vector(mapped((math.cos(theta), math.sin(theta), 0)))
        hit, _, _, _ = terrain_bvh.ray_cast(origin, direction, .8)
        assert hit is None, f'Terrain occludes the actual river mesh at s={s}, z={z}'
walk_mesh = next(obj for obj in objects if obj.name == 'walkway_0').data
walk_bvh = BVHTree.FromPolygons([v.co for v in walk_mesh.vertices], [list(p.vertices) for p in walk_mesh.polygons])
for z in [-43,-41.1,-40,-39.4,-39.22,-39.15,-38]:
    s=river_center(z)-river_width(z)/2-.27
    theta=-math.pi/2+s/RADIUS
    origin=Vector(mapped(surface(s,z,39.2)))
    direction=Vector(mapped((math.cos(theta),math.sin(theta),0)))
    ground_hit,_,_,_=terrain_bvh.ray_cast(origin,direction,.8)
    walk_hit,_,_,_=walk_bvh.ray_cast(origin,direction,.8)
    assert ground_hit is not None and walk_hit is not None, f'Missing actual promenade foundation at z={z}'
    assert (walk_hit-origin).length<(ground_hit-origin).length, f'Promenade buried at z={z}'
bpy.ops.object.select_all(action='DESELECT')
for obj in objects:
    obj.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(WORK / 'riverfront_master.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT / 'riverfront_environment.glb'), export_format='GLB', use_selection=True, export_yup=True)
metadata = {
    'asset': 'C15 continuous riverfront environment',
    'sourceProject': 'assets/source/blender/C15/riverfront_environment/riverfront_master.blend',
    'script': 'scripts/blender_c15_riverfront.py',
    'runtimeFile': 'public/assets/C15/riverfront_environment.glb',
    'coordinates': {'runtime': 'Y-up, cylinder axis Z, bottom belt theta=-pi/2', 'renderUnitMeters':100, 'radiusRenderUnits':40, 'lengthRenderUnits':240, 'waterRadius':WATER_RADIUS, 'groundDatumRadius':39.48, 'scientificBoundary':'Physical scale is a conceptual engineering design assumption, not built-habitat evidence.'},
    'anchors': {'pavilion':[-1.28,-39.38,-40], 'promenade':surface(river_center(-40)-river_width(-40)/2-.27,-40,39.43), 'cameraStart':surface(river_center(-39.15)-river_width(-39.15)/2-.27,-39.15,39.405), 'cameraTarget':[5,-34.2,-49], 'cameraUp':[0,1,0], 'riverHeroCenter':[.06,-WATER_RADIUS,-40], 'nearBridge':[river_center(-43),-39.38,-43], 'dockCenter':[dock_edge-.04,-39.445,dock_z], 'boatMooring':[dock_edge+.105,-39.472,dock_z], 'boatYaw':math.pi/2, 'bench': {'s':river_center(-39.22)-river_width(-39.22)/2-.315,'z':-39.22,'radius':39.4295,'yaw':math.pi/2}, 'plantingBeds':planting_anchors},
    'dimensionsMeters': {'heroRiverWidth':62, 'walkwayWidth':12, 'bridgeDeckWidth':10, 'railingHeight':1.1, 'railingTubeDiameter':.04, 'railingPostSpacing':2,'cameraHeightAbovePromenade':2.5, 'promenadeHeightAboveWater':4, 'pavilionPlazaWidth':130, 'pavilionPlazaLength':145, 'accessStairRise':.046/28*100, 'accessStairTread':.30, 'planterHeight':1.0, 'dockLength':18,'dockReachIntoWater':8,'streetLightHeight':3.2,'cascadeDrop':(radii[-1]-radii[0])*100},
    'placementFormula': {'riverCenter':'.06+.40*sin((z+40)*.055)+.20*sin((z+40)*.19)+.85*sin((z+40)*.20)*exp(-((z+40)/22)^2)', 'riverWidth':'.62+.28*(1-cos((z+40)*.115))', 'promenadeCenter':'riverCenter(z)-riverWidth(z)/2-.27','terrainHeightFunction':'scripts/blender_c15_riverfront.py:terrain_height(s,z)', 'surface': 'theta=-pi/2+belt*2pi/3+s/40; radius=39.48-terrain_height(s,z); position=[cos(theta)*radius,sin(theta)*radius,z]'},
    'textureSources':[{'asset':'aerial_grass_rock','page':'https://polyhaven.com/a/aerial_grass_rock','license':'CC0','resolution':2048,'physicalWidthMeters':15,'maps':['Diffuse','nor_gl','Rough'],'checksums':'aerial_grass_rock_files.json API MD5 matched all downloaded source maps'}, {'asset':'concrete_floor','page':'https://polyhaven.com/a/concrete_floor','license':'CC0','resolution':2048,'physicalWidthMeters':2.1,'maps':['Diffuse','nor_gl','Rough'],'checksums':'concrete_floor_files.json API MD5 matched all downloaded source maps'}],
    'qa': {'triangles':triangles, 'meshCount':len(objects), 'materialCount':len({mat.name for obj in objects for mat in obj.data.materials}), 'drawCallPrimitives':sum(len(obj.data.materials) for obj in objects), 'missingUV':sum(not bool(obj.data.uv_layers) for obj in objects), 'nonFiniteVertices':0, 'bytes':(OUT/'riverfront_environment.glb').stat().st_size, 'checks':['river at z=-40 is 62m wide','horizontal pavilion footing Y=-39.38 with terrain datum Y=-39.41','18 actual terrain BVH rays confirm no grass polygons across water channel','7 actual mesh BVH rays confirm promenade is above ground including new 2.5m camera/bench/dock points','continuous three land belts and winding waterways','geometric near bridge piers/arch/deck/railing/graded approaches','6 photo PBR source maps verified against publisher MD5; maps packed into source and GLB'], 'previewStatus':'pending_render'},
    'nodeNames':[obj.name for obj in objects],
    'pipeline':['Blender exact curved terrain and engineering structure','editable packed PBR sources','Y-up GLB export'],
    'notes':['Formal Tripo trees and architecture are separate renderer assets, not environment placeholders.','Disable old ecology ground/water/bank/road/agriculture and broad interior shell window panels when mounting this environment.','Window frame and glass are separate semantic nodes for lighting and picking.','Freshwater surface follows cylindrical equipotential at fixed radial distance; reflections require renderer lighting/environment.']
}
(OUT / 'riverfront_environment_metadata.json').write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding='utf-8')
print('RIVERFRONT_COMPLETE', json.dumps(metadata['qa']))

if '--render-preview' in sys.argv:
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1440
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.world.use_nodes = True
    bg = next((node for node in scene.world.node_tree.nodes if node.type == 'BACKGROUND'), None)
    if bg is None:
        bg = scene.world.node_tree.nodes.new('ShaderNodeBackground')
        output = scene.world.node_tree.nodes.new('ShaderNodeOutputWorld')
        scene.world.node_tree.links.new(bg.outputs['Background'], output.inputs['Surface'])
    bg.inputs['Color'].default_value = (.43, .55, .70, 1)
    bg.inputs['Strength'].default_value = .65
    bpy.ops.object.light_add(type='SUN', location=mapped((20, -10, -60)))
    sun = bpy.context.object
    sun.data.energy = 3.5
    sun.data.angle = .025
    sun.data.color = (1, .87, .70)
    sun.rotation_euler = (Vector(mapped((0, -39, -40))) - sun.location).to_track_quat('-Z', 'Y').to_euler()
    # Inspection fill only; lighting is not baked or included in the runtime GLB.
    bpy.ops.object.light_add(type='AREA', location=mapped((-.5, -37.8, -42)))
    fill = bpy.context.object
    fill.data.energy = 1400
    fill.data.size = 3
    fill.data.color = (1, .9, .77)
    fill.rotation_euler = (Vector(mapped((-.4, -39.4, -42))) - fill.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.camera_add(location=mapped(metadata['anchors']['cameraStart']))
    camera = bpy.context.object
    camera.data.lens = 31
    camera.data.clip_start = .001
    camera.data.clip_end = 1000
    camera.rotation_euler = (Vector(mapped(metadata['anchors']['cameraTarget'])) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = camera
    scene.render.filepath = str(WORK / 'review_riverfront_walkway.png')
    bpy.ops.render.render(write_still=True)
    camera.location = mapped(surface(river_center(-42.4)-river_width(-42.4)/2-.27,-42.4,39.405))
    camera.rotation_euler = (Vector(mapped((river_center(-43), -39.38, -43))) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.lens = 24
    scene.render.filepath = str(WORK / 'review_riverfront_bridge.png')
    bpy.ops.render.render(write_still=True)
    metadata['qa']['previewStatus'] = 'two actual geometry/material Cycles renders generated; visual review required'
    metadata['qa']['previews'] = ['assets/source/blender/C15/riverfront_environment/review_riverfront_walkway.png', 'assets/source/blender/C15/riverfront_environment/review_riverfront_bridge.png']
    (OUT / 'riverfront_environment_metadata.json').write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding='utf-8')
