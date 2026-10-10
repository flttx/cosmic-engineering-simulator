"""Native far LODs derived from the existing formal C15 assets; never overwrite masters."""
import bpy
import hashlib
import json
import math
import sys
from array import array
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'assets/source/blender/C15/distant'
OUT = ROOT / 'public/assets/C15'
WORK.mkdir(parents=True, exist_ok=True)


def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def imported(path):
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def export(obj, prefix, source, technique):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    obj['provenance'] = 'Native Blender derivative of formal Tripo > Blender asset; not a new AI generation'
    obj['source'] = source.relative_to(ROOT).as_posix()
    obj['technique'] = technique
    obj['usage'] = 'Far only, distance > 30 render units; use formal geometry for close views'
    obj.data.calc_loop_triangles()
    points = [obj.matrix_world @ v.co for v in obj.data.vertices]
    low = [min(p[i] for p in points) for i in range(3)]
    high = [max(p[i] for p in points) for i in range(3)]
    assert obj.data.uv_layers and all(math.isfinite(c) for p in points for c in p)
    path = OUT / f'{prefix}_lod3.glb'
    bpy.ops.wm.save_as_mainfile(filepath=str(WORK / f'{prefix}_lod3.blend'))
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_yup=True, export_extras=True)
    textures = {n.image.name: n.image for m in obj.data.materials for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image}
    return {'file': path.name, 'bytes': path.stat().st_size, 'triangles': len(obj.data.loop_triangles),
            'vertices': len(obj.data.vertices), 'materials': len(obj.data.materials), 'missingUV': False, 'nonFiniteVertices': 0,
            'runtimeBounds': {'min': [low[0], low[2], -high[1]], 'max': [high[0], high[2], -low[1]]},
            'textures': [{'name': image.name, 'width': image.size[0], 'height': image.size[1]} for image in textures.values()],
            'source': source.relative_to(ROOT).as_posix(), 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'editableProject': (WORK / f'{prefix}_lod3.blend').relative_to(ROOT).as_posix(), 'technique': technique, 'minimumDistance': 30}


clear()
district_source = OUT / 'district_lod0.glb'
source_district = imported(district_source)
district = source_district.copy()
district.data = source_district.data.copy()
bpy.context.collection.objects.link(district)
bpy.ops.object.select_all(action='DESELECT')
district.select_set(True)
bpy.context.view_layer.objects.active = district
district.name = 'district_far_formal_derivative'
# Original AI mesh contains disconnected detail faces: collapse alone destroys buildings.
# Native voxel consolidation preserves the massing before the far-only UV bake.
modifier = district.modifiers.new('Consolidate formal building massing', 'REMESH')
modifier.mode = 'VOXEL'
modifier.voxel_size = .16
modifier.use_smooth_shade = False
bpy.ops.object.modifier_apply(modifier=modifier.name)
district.data.calc_loop_triangles()
original_triangles = len(district.data.loop_triangles)
modifier = district.modifiers.new('Far collapse, preserve UV material atlas', 'DECIMATE')
modifier.ratio = 350 / original_triangles
bpy.ops.object.modifier_apply(modifier=modifier.name)
# Preserve official center-bottom normalization, including the extreme silhouette bounds.
coords = [v.co for v in district.data.vertices]
mins = Vector(tuple(min(v[i] for v in coords) for i in range(3)))
maxs = Vector(tuple(max(v[i] for v in coords) for i in range(3)))
center = Vector(((mins.x + maxs.x) / 2, (mins.y + maxs.y) / 2, mins.z))
scale = Vector((10 / (maxs.x - mins.x), 5.49151537872 / (maxs.y - mins.y), 3.39714239432 / (maxs.z - mins.z)))
for vertex in district.data.vertices:
    p = vertex.co - center
    vertex.co = (p.x * scale.x, p.y * scale.y, p.z * scale.z)
district.data.materials.clear()
material = bpy.data.materials.new('Formal district native projected facade atlas')
material.use_nodes = True
material.node_tree.nodes.clear()
shader = material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
output = material.node_tree.nodes.new('ShaderNodeOutputMaterial')
material.node_tree.links.new(shader.outputs['BSDF'], output.inputs['Surface'])
shader.inputs['Roughness'].default_value = .7
atlas = bpy.data.images.new('district_far_native_facade_atlas', width=1024, height=1024)
texture = material.node_tree.nodes.new('ShaderNodeTexImage')
texture.image = atlas
material.node_tree.nodes.active = texture
district.data.materials.append(material)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(island_margin=.02)
bpy.ops.object.mode_set(mode='OBJECT')
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.render.bake.use_selected_to_active = True
scene.render.bake.use_pass_direct = False
scene.render.bake.use_pass_indirect = False
scene.render.bake.use_pass_color = True
scene.render.bake.cage_extrusion = .35
scene.render.bake.max_ray_distance = .8
scene.render.bake.margin = 8
source_district.select_set(True)
bpy.context.view_layer.objects.active = district
bpy.ops.object.bake(type='DIFFUSE')
material.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
atlas.filepath_raw = str(WORK / 'district_facade_atlas.png')
atlas.file_format = 'PNG'
atlas.save()
atlas.pack()
source_district.hide_render = True
metadata = {'coordinateFrame': 'GLB +Y up, centered-bottom origin', 'district': export(district, 'district', district_source, 'Native voxel-consolidated formal building massing reduced to 350 triangles; projected original facade colors and windows baked at 1024px')}
assert 200 <= metadata['district']['triangles'] <= 400
if '--district-only' in sys.argv:
    previous = json.loads((OUT / 'distant_metadata.json').read_text(encoding='utf-8')) if (OUT / 'distant_metadata.json').exists() else {}
    previous.update(metadata)
    (OUT / 'distant_metadata.json').write_text(json.dumps(previous, indent=2), encoding='utf-8')
    print('C15_DISTRICT_DISTANT_COMPLETE', json.dumps(metadata))
    raise SystemExit(0)

clear()
tree_source = OUT / 'tree_lod0.glb'
tree = imported(tree_source)
tree.name = 'tree_formal_render_source'
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 768
scene.render.resolution_y = 1024
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'Standard'
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.7, .8, 1, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .6
bpy.ops.object.light_add(type='AREA', location=(3, -4, 5))
light = bpy.context.object
light.data.energy = 300
light.data.shape = 'DISK'
light.data.size = 5
light.rotation_euler = (Vector((0, 0, .9)) - light.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 1.94
scene.camera = camera
rendered = []
for i in range(3):
    angle = i * math.pi / 3
    camera.location = (4 * math.sin(angle), -4 * math.cos(angle), .9)
    camera.rotation_euler = (Vector((0, 0, .9)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    path = WORK / f'tree_view_{i}.png'
    scene.render.filepath = str(path)
    if '--reuse-tree-renders' not in sys.argv or not path.exists():
        bpy.ops.render.render(write_still=True)
    image = bpy.data.images.load(str(path), check_existing=False)
    pixels = array('f', [0]) * (768 * 1024 * 4)
    image.pixels.foreach_get(pixels)
    occupied = [(p % 768, p // 768) for p in range(768 * 1024) if pixels[p * 4 + 3] > .015]
    xmin, xmax = min(x for x, y in occupied), max(x for x, y in occupied)
    ymin, ymax = min(y for x, y in occupied), max(y for x, y in occupied)
    width, height = xmax - xmin + 1, ymax - ymin + 1
    cropped = array('f')
    for row in range(ymin, ymax + 1):
        cropped.extend(pixels[(row * 768 + xmin) * 4:(row * 768 + xmax + 1) * 4])
    texture = bpy.data.images.new(f'tree_far_direction_{i}', width=width, height=height, alpha=True)
    texture.pixels.foreach_set(cropped)
    texture.filepath_raw = str(WORK / f'tree_view_{i}_cropped.png')
    texture.file_format = 'PNG'
    texture.save()
    texture.pack()
    rendered.append((texture, min(1.4, 1.8 * width / height), angle))
bpy.ops.wm.save_as_mainfile(filepath=str(WORK / 'tree_render_source.blend'))
for obj in list(scene.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
vertices, faces = [], []
for image, width, angle in rendered:
    dx, dy = math.cos(angle) * width / 2, math.sin(angle) * width / 2
    base = len(vertices)
    quad = [(-dx, -dy, 0), (dx, dy, 0), (dx, dy, 1.8), (-dx, -dy, 1.8)]
    vertices.extend(quad + list(reversed(quad)))
    faces.extend([(base, base + 1, base + 2, base + 3), (base + 4, base + 5, base + 6, base + 7)])
data = bpy.data.meshes.new('TreeFarThreeDirectionalPlanes')
data.from_pydata(vertices, [], faces)
data.update()
uv = data.uv_layers.new(name='NativeRenderedUV')
for i, (image, width, angle) in enumerate(rendered):
    mat = bpy.data.materials.new(f'Native tree alpha direction {i}')
    mat.use_nodes = True
    mat.node_tree.nodes.clear()
    mat.use_backface_culling = True
    mat.surface_render_method = 'DITHERED'
    mat.alpha_threshold = .35
    node = mat.node_tree.nodes.new('ShaderNodeTexImage')
    node.image = image
    shader = mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    output = mat.node_tree.nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(shader.outputs['BSDF'], output.inputs['Surface'])
    shader.inputs['Roughness'].default_value = .9
    mat.node_tree.links.new(node.outputs['Color'], shader.inputs['Base Color'])
    clip = mat.node_tree.nodes.new('ShaderNodeMath')
    clip.operation = 'GREATER_THAN'
    clip.inputs[1].default_value = .35
    mat.node_tree.links.new(node.outputs['Alpha'], clip.inputs[0])
    mat.node_tree.links.new(clip.outputs[0], shader.inputs['Alpha'])
    data.materials.append(mat)
    for side in range(2):
        polygon = data.polygons[i * 2 + side]
        polygon.material_index = i
        coords = [(0, 0), (1, 0), (1, 1), (0, 1)]
        for loop, coord in zip(polygon.loop_indices, coords if side == 0 else list(reversed(coords))):
            uv.data[loop].uv = coord
tree_far = bpy.data.objects.new('tree_far_native_render_impostor', data)
scene.collection.objects.link(tree_far)
metadata['tree'] = export(tree_far, 'tree', tree_source, 'Three 60-degree crossed alpha planes, native Cycles renders of formal 20000-triangle tree LOD0; far only')
assert metadata['tree']['triangles'] == 12
metadata['tree']['renderProject'] = (WORK / 'tree_render_source.blend').relative_to(ROOT).as_posix()
metadata['tree']['closeGeometryRequired'] = True
official = json.loads((OUT / 'asset_metadata.json').read_text(encoding='utf-8'))
for name in ['district', 'tree']:
    metadata[name]['originalSource'] = official[name + 'Source']
    metadata[name]['originalProject'] = official[name + 'SourceProject']
(OUT / 'distant_metadata.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
print('C15_DISTANT_COMPLETE', json.dumps(metadata))
