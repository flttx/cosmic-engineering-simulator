"""C01: preserve Tripo original; repair editable parts; export measured GLB LODs."""
import bpy
import json
import math
import bmesh
from pathlib import Path
from mathutils import Vector, Matrix
from array import array

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/source/tripo/tripo-out/c01-collector-master-80e211fb/model.glb'
OUT = ROOT / 'public/assets/C01'
WORK = ROOT / 'assets/source/blender/C01'
OUT.mkdir(parents=True, exist_ok=True)
WORK.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
originals = [o for o in bpy.context.scene.objects if o.type == 'MESH']
raw = bpy.data.collections.new('TRIPO_ORIGINAL_UNMODIFIED')
bpy.context.scene.collection.children.link(raw)
for obj in originals:
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    raw.objects.link(obj)
raw.hide_render = True
raw.hide_viewport = True
editable = bpy.data.collections.new('C01_EDITABLE_REPAIRED')
bpy.context.scene.collection.children.link(editable)

def material(name, color, metallic, roughness):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value = (*color, 1)
    node.inputs['Metallic'].default_value = metallic
    node.inputs['Roughness'].default_value = roughness
    return mat

mats = {
    'graphite': material('Silicon photovoltaic laminate', (0.012, 0.027, 0.062), 0.02, 0.28),
    'titanium': material('Brushed titanium structure', (0.34, 0.39, 0.42), 0.92, 0.42),
    'copper': material('Copper thermal manifolds', (0.42, 0.17, 0.065), 0.95, 0.47),
    'ceramic': material('Dark radiator ceramic', (0.045, 0.052, 0.055), 0, 0.82),
    'blanket': material('Amber multilayer insulation', (0.32, 0.19, 0.06), 0.9, 0.43),
}

# Deterministic physically scaled surface patterns, PNG masters retained and embedded in GLB.
# UV repetition is intentional per panel/part; these are tileable materials, not a unique paint atlas.
texture_dir = WORK / 'textures'
texture_dir.mkdir(exist_ok=True)
def textured_material(key):
    mat = mats[key]
    maps = {name: array('f') for name in ('base', 'roughness', 'normal')}
    size = 512
    for y in range(size):
        for x in range(size):
            u, v = x / size, y / size
            grain = ((x * 127 + y * 193 + x * y * 17) % 997) / 997 - 0.5
            if key == 'graphite':
                cell_x, cell_y = (u * 6) % 1, (v * 10) % 1
                gap = cell_x < 0.018 or cell_y < 0.022
                conductor = any(abs(cell_x - n / 4) < 0.005 for n in (1, 2, 3))
                fingers = (cell_y * 14) % 1 < 0.07
                tint = 0.88 + 0.18 * math.sin(math.floor(u * 6) * 3 + math.floor(v * 10) * 1.3)
                color = (0.008, 0.011, 0.015) if gap else ((0.29, 0.31, 0.32) if conductor else
                         ((0.09, 0.115, 0.14) if fingers else (0.017 * tint, 0.03 * tint, 0.075 * tint)))
                rough = 0.33 if gap else (0.22 if conductor else 0.275 + grain * 0.025)
                nx, ny = grain * 0.007, grain * 0.009
            elif key == 'titanium':
                brush = math.sin(v * math.pi * 520) * 0.012 + grain * 0.014
                color = (0.35 + brush, 0.39 + brush, 0.42 + brush)
                rough = 0.42 + brush * 1.2
                nx, ny = grain * 0.006, math.sin(v * math.pi * 520) * 0.018
            else:
                fold = math.sin(u * 42 + math.sin(v * 31) * 2) * math.sin(v * 57 + u * 11)
                seam = ((u * 8) % 1 < 0.018) or ((v * 5) % 1 < 0.018)
                color = (0.29 + fold * 0.035, 0.18 + fold * 0.022, 0.067 + fold * 0.009)
                if seam:
                    color = (0.10, 0.065, 0.025)
                rough = 0.44 + fold * 0.045
                nx, ny = math.cos(u * 42 + math.sin(v * 31) * 2) * 0.07, math.cos(v * 57 + u * 11) * 0.06
            maps['base'].extend((*color, 1))
            maps['roughness'].extend((rough, rough, rough, 1))
            maps['normal'].extend((0.5 + nx, 0.5 + ny, 1, 1))
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    principled = nodes.get('Principled BSDF')
    for kind, pixels in maps.items():
        image = bpy.data.images.new(key + '_' + kind, width=size, height=size)
        image.colorspace_settings.name = 'sRGB' if kind == 'base' else 'Non-Color'
        image.pixels.foreach_set(pixels)
        image.filepath_raw = str(texture_dir / (key + '_' + kind + '.png'))
        image.file_format = 'PNG'
        image.save()
        image.pack()
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = image
        if kind == 'normal':
            normal = nodes.new('ShaderNodeNormalMap')
            normal.inputs['Strength'].default_value = 0.45
            links.new(tex.outputs['Color'], normal.inputs['Color'])
            links.new(normal.outputs['Normal'], principled.inputs['Normal'])
        else:
            links.new(tex.outputs['Color'], principled.inputs['Base Color' if kind == 'base' else 'Roughness'])
for key in ('graphite', 'titanium', 'blanket'):
    textured_material(key)
anchors = {'collector_surface': (0, 2.4, 0), 'support_truss': (0, 0, 0),
           'radiator': (0, -2.4, 0.5), 'attitude_module': (4.6, 0, 0)}
parts = {}
for name, position in anchors.items():
    obj = bpy.data.objects.new(name, None)
    editable.objects.link(obj)
    obj.location = position
    parts[name] = obj

def attach(obj, part, mat):
    world = obj.matrix_world.copy()
    obj.parent = parts[part]
    obj.matrix_world = world
    obj.data.materials.clear()
    obj.data.materials.append(mats[mat])
    obj['part_id'] = part
    return obj

transform = Matrix.Rotation(math.pi / 2, 4, 'Z') @ Matrix.Scale(11.0, 4)
source_faces = sum(len(o.data.polygons) for o in originals)
for original in originals:
    index = int(original.name.rsplit('_', 1)[-1])
    # Review P1: source wing folds and fused endcaps are rejected; retain the central candidate only.
    if index != 0:
        continue
    obj = original.copy()
    obj.data = original.data.copy()
    editable.objects.link(obj)
    obj.matrix_world = transform @ original.matrix_world
    part = 'support_truss'
    obj.name = part + '_tripo_' + str(index)
    attach(obj, part, 'ceramic')
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    rejected = [v for v in bm.verts if abs((obj.matrix_world @ v.co).x) > 1.6
                or abs((obj.matrix_world @ v.co).y) > 0.43 or (obj.matrix_world @ v.co).z > 0.83]
    bmesh.ops.delete(bm, geom=rejected, context='VERTS')
    bm.to_mesh(obj.data)
    bm.free()
    # Native decimation preserves the generated silhouette; raw geometry remains in its collection.
    modifier = obj.modifiers.new('Runtime topology repair', 'DECIMATE')
    modifier.ratio = 0.07
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.0001)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    for poly in obj.data.polygons:
        poly.use_smooth = True
    obj.select_set(False)

def box(name, location, dimensions, part, mat, bevel=0.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = part + '_' + name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    editable.objects.link(obj)
    attach(obj, part, mat)
    if bevel:
        mod = obj.modifiers.new('Machined edge radius', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    uv = obj.data.uv_layers.active or obj.data.uv_layers.new(name='Material tile UV')
    lower = [min(v.co[axis] for v in obj.data.vertices) for axis in range(3)]
    upper = [max(v.co[axis] for v in obj.data.vertices) for axis in range(3)]
    for poly in obj.data.polygons:
        normal_axis = max(range(3), key=lambda axis: abs(poly.normal[axis]))
        axes = [axis for axis in range(3) if axis != normal_axis]
        for loop_index in poly.loop_indices:
            vertex = obj.data.vertices[obj.data.loops[loop_index].vertex_index].co
            uv.data[loop_index].uv = [(vertex[axis] - lower[axis]) / max(upper[axis] - lower[axis], 0.000001) for axis in axes]
    return obj

def beam(name, start, end, thickness, part='support_truss', mat='titanium'):
    direction = Vector(end) - Vector(start)
    obj = box(name, (Vector(start) + Vector(end)) / 2, (thickness, thickness, direction.length), part, mat, 0.015)
    obj.rotation_euler = direction.to_track_quat('Z', 'Y').to_euler()
    return obj

def cylinder(name, location, radius, depth, part, mat, axis='X'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = part + '_' + name
    if axis == 'X':
        obj.rotation_euler[1] = math.pi / 2
    elif axis == 'Y':
        obj.rotation_euler[0] = math.pi / 2
    bpy.context.view_layer.update()
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    editable.objects.link(obj)
    attach(obj, part, mat)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bevel = obj.modifiers.new('Machined collar', 'BEVEL')
    bevel.width = 0.025
    bevel.segments = 2
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
    return obj

# Central Tripo details are retained inside an explicit clean load-bearing cage.
box('equipment_deck', (0, 0, 0.85), (4.8, 0.82, 0.12), 'support_truss', 'ceramic')
for y in (-0.48, 0.48):
    for z in (0.05, 0.9):
        beam('longeron', (-2.5, y, z), (2.5, y, z), 0.12)
    for x in (-2.4, -1.6, -0.8, 0, 0.8, 1.6):
        beam('side_diagonal', (x, y, 0.05), (x + 0.8, y, 0.9), 0.07)
for x in (-2.5, -1.6, -0.8, 0, 0.8, 1.6, 2.5):
    for z in (0.05, 0.9):
        beam('cross_member', (x, -0.48, z), (x, 0.48, z), 0.07)
    box('service_access_plate', (x, 0, 0.95), (0.6, 0.74, 0.035), 'support_truss', 'titanium', 0.01)
for sign in (-1, 1):
    # Two explicit thin, thickened panels above the Tripo wings make the collecting face readable.
    box('wing_substrate', (0, sign * 2.5, 0.25), (6.6, 3.0, 0.10), 'collector_surface', 'titanium')
    for row in range(3):
        for column in range(8):
            box('photovoltaic_cell', (-2.88 + column * 0.82, sign * 2.5 - 0.96 + row * 0.96, 0.32),
                (0.77, 0.88, 0.025), 'collector_surface', 'graphite', 0.006)
    box('thermal_manifold', (0, sign * 1.25, -0.45), (6.4, 0.1, 0.1), 'radiator', 'copper')
    for x in (-2.5, 2.5):
        beam('thermal_connection', (x, sign * 1.25, -0.45), (x, sign * 2.4, -0.7), 0.065, 'radiator', 'copper')
        beam('wing_mount', (x, sign * 0.48, 0.05), (x, sign * 1.2, 0.22), 0.12)
        beam('radiator_mount', (x, sign * 0.48, 0.05), (x, sign * 1.4, -0.7), 0.08)
    box('radiator_frame', (0, sign * 2.65, -0.72), (5.5, 2.5, 0.08), 'radiator', 'titanium')
    for n in range(18):
        box('radiator_fin', (-2.55 + n * 0.3, sign * 2.65, -0.78), (0.24, 2.32, 0.035), 'radiator', 'ceramic', 0.005)
for sign in (-1, 1):
    cylinder('avionics_pressure_shell', (sign * 3.45, 0, 0.45), 0.52, 1.65, 'attitude_module', 'titanium')
    for x in (2.65, 3.0, 3.95, 4.25):
        cylinder('structural_collar', (sign * x, 0, 0.45), 0.57, 0.1, 'attitude_module', 'ceramic')
    cylinder('docking_face', (sign * 4.4, 0, 0.45), 0.38, 0.22, 'attitude_module', 'titanium')
    cylinder('docking_socket', (sign * 4.54, 0, 0.45), 0.25, 0.025, 'attitude_module', 'ceramic')
    box('service_panel', (sign * 3.42, 0, 0.99), (0.9, 0.53, 0.06), 'attitude_module', 'graphite')
    for y in (-0.59, 0.59):
        box('control_bus', (sign * 3.95, y, 0.45), (0.4, 0.25, 0.35), 'attitude_module', 'titanium')
        cylinder('cold_gas_nozzle', (sign * 3.95, y * 1.3, 0.45), 0.11, 0.12, 'attitude_module', 'ceramic', 'Y')
    for y in (-0.32, 0.32):
        beam('shell_attachment', (sign * 2.4, y, 0.2), (sign * 2.8, y, 0.2), 0.1)
    for angle in range(0, 360, 60):
        theta = math.radians(angle)
        cylinder('dock_bolt', (sign * 4.54, math.cos(theta) * 0.32, 0.45 + math.sin(theta) * 0.32),
                 0.035, 0.035, 'attitude_module', 'copper')

# Human-serviceable details provide scale through interfaces, not invented physical dimensions.
for sign in (-1, 1):
    box('thermal_blanket_patch', (sign * 3.35, -0.48, 0.47), (0.95, 0.055, 0.52), 'attitude_module', 'blanket', 0.025)
    box('inspection_hatch', (sign * 3.35, 0, 1.045), (0.52, 0.45, 0.025), 'attitude_module', 'titanium', 0.012)
    for offset in (-0.19, 0.19):
        box('hatch_hinge', (sign * 3.35 + offset, -0.22, 1.07), (0.09, 0.06, 0.04), 'attitude_module', 'ceramic', 0.008)
        for y in (-0.17, 0.17):
            cylinder('hatch_fastener', (sign * 3.35 + offset, y, 1.065), 0.018, 0.018, 'attitude_module', 'titanium', 'Z')
    for x in (-2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4):
        box('walkway_tread', (x, sign * 0.32, 0.985), (0.38, 0.055, 0.018), 'support_truss', 'ceramic', 0.002)
        cylinder('deck_fastener', (x, sign * 0.3, 0.99), 0.016, 0.018, 'support_truss', 'titanium', 'Z')
    for line in range(3):
        beam('power_cable_bundle', (-2.55, sign * (0.39 + line * 0.035), 0.2),
             (2.55, sign * (0.39 + line * 0.035), 0.2), 0.023, 'support_truss', 'ceramic')
    for x in (-2.2, -1.1, 0, 1.1, 2.2):
        box('cable_clamp', (x, sign * 0.44, 0.2), (0.055, 0.17, 0.07), 'support_truss', 'titanium', 0.008)
    for column in range(8):
        x = -2.88 + column * 0.82
        for y in (sign * 1.05, sign * 3.95):
            cylinder('panel_frame_fastener', (x, y, 0.33), 0.016, 0.016, 'collector_surface', 'titanium', 'Z')

# Blender Z-up exports as glTF Y-up. Anchors below use the exported coordinate frame.
mesh_objects = [o for o in editable.objects if o.type == 'MESH']
for obj in mesh_objects:
    if not obj.data.uv_layers:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(island_margin=0.01)
        bpy.ops.object.mode_set(mode='OBJECT')
        obj.select_set(False)
bpy.ops.wm.save_as_mainfile(filepath=str(WORK / 'collector_master.blend'))

# Merge export copies by logical part and material; editable source keeps individual fasteners and beams.
runtime = bpy.data.collections.new('TEMP_RUNTIME_MERGED')
bpy.context.scene.collection.children.link(runtime)
runtime_meshes = []
for part in parts:
    for mat in mats.values():
        group = [o for o in mesh_objects if o.parent == parts[part] and o.data.materials[0] == mat]
        if not group:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        copies = []
        for original in group:
            obj = original.copy()
            obj.data = original.data.copy()
            runtime.objects.link(obj)
            obj.select_set(True)
            copies.append(obj)
        bpy.context.view_layer.objects.active = copies[0]
        bpy.ops.object.join()
        merged = bpy.context.object
        merged.name = part + '_' + mat.name.split(' ')[0].lower()
        runtime_meshes.append(merged)
lods = []
for level, ratio in enumerate((1, 0.4, 0.12)):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in list(parts.values()) + runtime_meshes:
        obj.select_set(True)
        if obj.type == 'MESH' and ratio < 1:
            mod = obj.modifiers.new('Export LOD', 'DECIMATE')
            mod.ratio = ratio
    path = OUT / f'collector_lod{level}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True, export_materials='EXPORT')
    triangles = sum(len(o.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.loop_triangles)
                    for o in runtime_meshes)
    # loop_triangles is lazy until calc_loop_triangles; report evaluated triangulation exactly.
    triangles = 0
    for obj in runtime_meshes:
        mesh = obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
        mesh.calc_loop_triangles()
        triangles += len(mesh.loop_triangles)
        obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh_clear()
    lods.append({'level': level, 'path': '/assets/C01/' + path.name, 'triangles': triangles, 'bytes': path.stat().st_size})
    for obj in runtime_meshes:
        for mod in list(obj.modifiers):
            if mod.name == 'Export LOD':
                obj.modifiers.remove(mod)
for obj in runtime_meshes:
    bpy.data.objects.remove(obj, do_unlink=True)
bpy.data.collections.remove(runtime)

# Independent scale reference, conceptual proportions only (no asserted physical dimensions).
bpy.ops.object.select_all(action='DESELECT')
craft = []
mats['glass'] = material('Service craft optical glazing', (0.018, 0.042, 0.055), 0, 0.15)
mats['navigation'] = material('Service craft navigation marker', (0.34, 0.075, 0.024), 0, 0.4)
mats['navigation'].node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value = (0.34, 0.075, 0.024, 1)
mats['navigation'].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value = 0.5
craft.append(box('service_hull', (0, 0, 0), (0.8, 0.4, 0.3), 'attitude_module', 'titanium'))
craft.append(box('service_canopy', (-0.15, 0, 0.19), (0.3, 0.28, 0.13), 'attitude_module', 'glass'))
craft.append(box('canopy_mullion', (-0.15, 0, 0.26), (0.018, 0.3, 0.025), 'attitude_module', 'titanium', 0.002))
craft.append(box('service_hatch', (0.22, 0, 0.16), (0.2, 0.22, 0.025), 'attitude_module', 'ceramic', 0.01))
for sign in (-1, 1):
    craft.append(box('service_arm', (0.25, sign * 0.35, 0), (0.08, 0.4, 0.08), 'attitude_module', 'copper'))
    craft.append(box('navigation_marker', (0.25, sign * 0.5, 0.06), (0.05, 0.045, 0.03), 'attitude_module', 'navigation', 0.005))
craft_collection = bpy.data.collections.new('MAINTENANCE_EDITABLE_FIXED_CONCEPT_SCALE')
bpy.context.scene.collection.children.link(craft_collection)
for obj in craft:
    bpy.context.view_layer.update()
    world = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = Matrix.Scale(1 / 6, 4) @ world
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    craft_collection.objects.link(obj)
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT / 'maintenance_craft.glb'), export_format='GLB', use_selection=True, export_yup=True)
craft_collection.hide_render = True
craft_collection.hide_viewport = True

# Three neutral studio views expose geometry without relying on bloom or emissive materials.
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.render.resolution_x = 1200
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.world.color = (0.12, 0.12, 0.12)
scene.view_settings.view_transform = 'AgX'
for position, energy, size in (((0, 0, 12), 2200, 10), ((5, -8, 7), 1600, 7), ((-6, 6, 5), 1900, 6)):
    bpy.ops.object.light_add(type='AREA', location=position)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = 'DISK'
    light.data.size = size
    light.rotation_euler = (-light.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add()
camera = bpy.context.object
scene.camera = camera
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 14
for name, position in [('perspective', (10, -13, 12)), ('collecting_face', (0, 0, 18)),
                       ('structure', (11, -14, -7)), ('side_front', (0, -16, 5)), ('side_back', (0, 16, 5))]:
    camera.location = position
    camera.rotation_euler = (-camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(WORK / ('review_' + name + '.png'))
    bpy.ops.render.render(write_still=True)
for part in parts:
    for obj in mesh_objects:
        obj.hide_render = obj.parent != parts[part]
    camera.location = (10, -13, 10)
    camera.rotation_euler = (-camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(WORK / ('review_isolated_' + part + '.png'))
    bpy.ops.render.render(write_still=True)
for obj in mesh_objects:
    obj.hide_render = False
for name, target, position, scale in [('solar_material_close', (0, 2.5, 0.3), (1.5, 4.5, 4), 3.1),
                                      ('mechanical_material_close', (3.4, 0, 0.5), (6, -4, 3), 3.2)]:
    camera.location = position
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.ortho_scale = scale
    scene.render.filepath = str(WORK / ('review_' + name + '.png'))
    bpy.ops.render.render(write_still=True)
camera.data.ortho_scale = 14
bpy.ops.wm.save_as_mainfile(filepath=str(WORK / 'collector_master.blend'))
metadata = {
    'asset': 'C01 collector', 'coordinateFrame': '+Y up, collecting face +Y; conceptual nonmetric display units',
    'provenance': {'provider': 'Tripo', 'taskId': '80e211fb-e27e-42d3-9314-21f2c314455c', 'credits': 50,
                   'source': str(SOURCE.relative_to(ROOT)), 'sourceFaces': source_faces, 'blender': bpy.app.version_string},
    'sourceProject': 'assets/source/blender/C01/collector_master.blend',
    'nodes': list(parts), 'anchors': {name: [p[0], p[2], -p[1]] for name, p in anchors.items()},
    'materials': list(mats), 'lods': lods,
    'textures': {'source': 'assets/source/blender/C01/textures', 'size': [512, 512],
                 'sets': ['silicon base/roughness/normal', 'titanium base/roughness/normal', 'blanket base/roughness/normal'],
                 'mapping': 'Explicit per-face material tile UV; intentional repeat, no unique atlas overlap', 'runtime': 'embedded PNG in GLB'},
    'maintenanceScale': {'factorFromPrevious': 1 / 6, 'approxMaxExtent': 0.1833,
                         'meaning': 'Fixed conceptual visual scale; collecting wing span about 36 times craft maximum span, no physical meters asserted'},
    'repairs': ['Retained untouched Tripo original collection; runtime keeps cropped central generated frame only',
                'Review P1 repair: rejected all folded source panels and fused endcaps; reconstructed independent machined industrial shells and docking interfaces',
                'Normalized orientation; welded near-duplicate vertices; recalculated outward normals; decimated runtime topology',
                'Replaced neutral generated appearance with graphite/titanium/copper PBR',
                'Added thickened collecting substrates, cell segmentation, independent radiator fins with connected thermal pipes, explicit cage diagonals, service plates and thruster buses',
                'Raised metallic material roughness to suppress liquid-like highlights',
                'Runtime-only copies merged by part and material; source retains separate editable components',
                'Silicon and ceramic nonmetallic; tileable PBR cell interconnect, brushed metal and insulation maps embedded',
                'Added hatch hinges/fasteners, panel fasteners, service treads and clamped power cable bundles',
                'Independent part parents preserve exploded-view pivots and picking IDs'],
    'scientificBoundary': 'Illustrative engineering design; no physical dimensions, performance or mass asserted.',
    'qa': {'meshCount': len(mesh_objects), 'runtimeMeshCount': len(runtime_meshes),
           'missingUV': [o.name for o in mesh_objects if not o.data.uv_layers],
           'nonFiniteVertices': sum(not all(math.isfinite(x) for x in v.co) for o in mesh_objects for v in o.data.vertices),
           'artReview': 'Eleven revised Blender studio PNGs generated (two material closeups, two sides and four isolated parts); browser independent review remains required'},
}
(OUT / 'asset_metadata.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
print('C01_ASSET_COMPLETE', json.dumps(lods))
