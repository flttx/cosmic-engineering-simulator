"""Normalize official Tripo waterfront buildings, preserve PBR and produce measured LODs."""
import bpy
import json
import math
import struct
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/C15'
WORK = ROOT / 'assets/source/blender/C15/riverfront'
SOURCE = ROOT / 'assets/source/tripo/C15/riverfront/tripo-out'
OUT.mkdir(parents=True, exist_ok=True)
WORK.mkdir(parents=True, exist_ok=True)


def bounds(obj):
    values = [obj.matrix_world @ Vector(v) for v in obj.bound_box]
    return [min(v[k] for v in values) for k in range(3)], [max(v[k] for v in values) for k in range(3)]


def triangles(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def images(obj):
    return list({n.image.name: n.image for m in obj.data.materials if m and m.use_nodes
                 for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image}.values())


def select(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def glb_qa(path):
    data = path.read_bytes()
    assert data[:4] == b'glTF' and struct.unpack_from('<I', data, 8)[0] == len(data)
    json_length = struct.unpack_from('<I', data, 12)[0]
    document = json.loads(data[20:20 + json_length])
    binary_start = 28 + json_length
    count = 0
    for mesh in document['meshes']:
        for primitive in mesh['primitives']:
            assert 'TEXCOORD_0' in primitive['attributes']
            accessor = document['accessors'][primitive['attributes']['POSITION']]
            view = document['bufferViews'][accessor['bufferView']]
            start = binary_start + view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
            stride = view.get('byteStride', 12)
            assert all(all(math.isfinite(v) for v in struct.unpack_from('<3f', data, start + i * stride)) for i in range(accessor['count']))
            count += document['accessors'][primitive['indices']]['count'] // 3
    assert document.get('images') and document.get('materials')
    texture_sizes = []
    for image in document['images']:
        view = document['bufferViews'][image['bufferView']]
        pixel_data = data[binary_start + view.get('byteOffset',0):binary_start + view.get('byteOffset',0) + view['byteLength']]
        if image['mimeType'] == 'image/png':
            texture_sizes.append(list(struct.unpack_from('>2I',pixel_data,16)))
        else:
            assert pixel_data[:2] == b'\xff\xd8'
            offset = 2
            while offset < len(pixel_data):
                assert pixel_data[offset] == 255
                while pixel_data[offset] == 255:
                    offset += 1
                marker = pixel_data[offset]
                offset += 1
                length = struct.unpack_from('>H',pixel_data,offset)[0]
                if marker in [0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]:
                    height,width = struct.unpack_from('>2H',pixel_data,offset+3)
                    texture_sizes.append([width,height])
                    break
                offset += length
    return {'triangles':count,'nodes':[n['name'] for n in document['nodes'] if 'mesh' in n],
            'uv':True,'finite':True,'embedded_images':len(document['images']),'image_sizes':texture_sizes}


def decimate(obj, target):
    count = triangles(obj)
    if count > target:
        select(obj)
        modifier = obj.modifiers.new('Measured runtime triangle budget', 'DECIMATE')
        modifier.ratio = target / count
        bpy.ops.object.modifier_apply(modifier=modifier.name)


def pbr_images_for_lod(obj, limit, prefix, level):
    for i, mat in enumerate(obj.data.materials):
        if not mat:
            continue
        obj.data.materials[i] = mat.copy()
        for node in obj.data.materials[i].node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image:
                node.image = node.image.copy()
                image = node.image
                if max(image.size) > limit:
                    if image.packed_file:
                        image.unpack(method='REMOVE')
                    factor = limit / max(image.size)
                    image.scale(max(1, int(image.size[0] * factor)), max(1, int(image.size[1] * factor)))
                    # Retain the source JPEG format for Color/ORM; normal maps remain lossless PNG.
                    image.file_format = 'PNG' if 'Normal' in image.name else 'JPEG'
                    suffix = '.png' if image.file_format == 'PNG' else '.jpg'
                    image.filepath_raw = str(WORK / f'{prefix}_lod{level}_{image.name.split("_")[0]}{suffix}')
                    image.save(quality=92)
                image.pack()


def far_atlas(high, low, prefix):
    # ponytail: one 512px diffuse atlas for >1km silhouettes; near LODs retain full source PBR.
    select(low)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=.025)
    bpy.ops.object.mode_set(mode='OBJECT')
    low.data.materials.clear()
    material = bpy.data.materials.new(prefix + '_far_baked_source_albedo')
    material.use_nodes = True
    shader = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    shader.inputs['Roughness'].default_value = .64
    atlas = bpy.data.images.new(prefix + '_source_albedo_atlas', width=512, height=512, alpha=False)
    texture = material.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = atlas
    material.node_tree.nodes.active = texture
    material.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
    low.data.materials.append(material)
    for poly in low.data.polygons:
        poly.material_index = 0
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 8
    scene.render.bake.use_selected_to_active = True
    scene.render.bake.cage_extrusion = .025
    scene.render.bake.max_ray_distance = .15
    scene.render.bake.use_pass_direct = False
    scene.render.bake.use_pass_indirect = False
    scene.render.bake.use_pass_color = True
    select(low)
    high.hide_set(False)
    high.select_set(True)
    bpy.context.view_layer.objects.active = low
    bpy.ops.object.bake(type='DIFFUSE')
    atlas.filepath_raw = str(WORK / (prefix + '_far_source_albedo.png'))
    atlas.file_format = 'PNG'
    atlas.save()
    atlas.pack()
    high.hide_set(True)
    select(low)


def review(obj, prefix):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.world.color = (.16, .16, .16)
    lo, hi = bounds(obj)
    target = Vector((0, 0, hi[2] * .45))
    camera_data = bpy.data.cameras.new('Asset QA camera')
    camera = bpy.data.objects.new('Asset QA camera', camera_data)
    scene.collection.objects.link(camera)
    extent = max(hi[k] - lo[k] for k in range(3))
    camera.location = Vector((extent * 1.2, -extent * 1.6, max(extent * .5, hi[2] * 1.45)))
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = extent * 1.55
    camera_data.clip_start = .0001
    scene.camera = camera
    for name, location, energy, size in [('Key', (1, -1, 2), 150, 1.5), ('Fill', (-1, 1, 1), 75, 1)]:
        light_data = bpy.data.lights.new(name, 'AREA')
        light_data.energy = energy
        light_data.shape = 'DISK'
        light_data.size = size
        light = bpy.data.objects.new(name, light_data)
        scene.collection.objects.link(light)
        light.location = location
        light.rotation_euler = (target - light.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(WORK / (prefix + '_review.png'))
    bpy.ops.render.render(write_still=True)


def process(prefix, source_name, width, desired_height, budgets=None):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    paths = list(SOURCE.glob(source_name + '-*/model.glb'))
    assert len(paths) == 1, f'Expected one approved source for {prefix}, got {paths}'
    source = paths[0]
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    assert meshes
    bpy.ops.object.select_all(action='DESELECT')
    for mesh in meshes:
        mesh.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    high = meshes[0]
    high.name = prefix + '_source'
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    lo, hi = bounds(high)
    center = Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]))
    scale = width / max(hi[0] - lo[0], hi[1] - lo[1])
    # Dimension choices are concept architecture, not physical measurements of an existing building.
    height_scale = desired_height / ((hi[2] - lo[2]) * scale)
    for vertex in high.data.vertices:
        vertex.co = (vertex.co - center) * scale
        vertex.co.z *= height_scale
        if hi[1] - lo[1] > hi[0] - lo[0]:
            vertex.co.x, vertex.co.y = vertex.co.y, -vertex.co.x
    high.data.update()
    select(high)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=.000001)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    assert high.data.uv_layers, 'Official source must contain usable UVs'
    assert all(all(math.isfinite(c) for c in v.co) for v in high.data.vertices)
    source_textures = [{'name':i.name,'width':i.size[0],'height':i.size[1]} for i in images(high)]
    source_triangles = triangles(high)
    source_bounds = bounds(high)
    blend = WORK / (prefix + '_master.blend')
    for image in images(high):
        image.pack()
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    records = []
    for level, (budget, texture_limit) in enumerate(budgets or [(200000,4096),(20000,2048),(2000,1024),(350,512)]):
        low = high.copy()
        low.data = high.data.copy()
        low.name = prefix
        bpy.context.collection.objects.link(low)
        low.hide_render = False
        low.hide_set(False)
        high.hide_set(True)
        high.hide_render = True
        if level == 3:
            # ponytail: source convex envelope only at distant LOD3; full terraces survive LOD0..2.
            select(low)
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.mesh.convex_hull(use_existing_faces=False)
            bpy.ops.object.mode_set(mode='OBJECT')
        decimate(low, budget)
        low.data.validate(clean_customdata=False)
        low.data.update()
        bottom = bounds(low)[0][2]
        for vertex in low.data.vertices:
            vertex.co.z -= bottom
        low.data.update()
        if level == 3:
            high.hide_render = False
            far_atlas(high, low, prefix)
            high.hide_render = True
        else:
            pbr_images_for_lod(low, texture_limit, prefix, level)
        select(low)
        path = OUT / f'{prefix}_lod{level}.glb'
        bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_yup=True)
        qa = glb_qa(path)
        assert qa['triangles'] == triangles(low)
        assert max(max(size) for size in qa['image_sizes']) <= texture_limit
        records.append({'asset_id':f'{prefix}_lod{level}','file':path.relative_to(ROOT).as_posix(),
                        'url':'/assets/C15/'+path.name,'triangles':triangles(low),'bytes':path.stat().st_size,
                        'bounds_blender_z_up':bounds(low),'bounds_runtime_y_up':[[bounds(low)[0][0],0,-bounds(low)[1][1]],[bounds(low)[1][0],bounds(low)[1][2],-bounds(low)[0][1]]],
                        'node':prefix,'images':[{'name':i.name,'width':i.size[0],'height':i.size[1]} for i in images(low)],
                        'uv':bool(low.data.uv_layers),'finite':all(all(math.isfinite(c) for c in v.co) for v in low.data.vertices),
                        'materials':len(low.data.materials),'glb_qa':qa,'status':'ready'})
        if level == 0:
            review(low, prefix)
        bpy.data.objects.remove(low, do_unlink=True)
    task = json.loads((source.parent / 'task.json').read_text(encoding='utf-8'))
    return {'asset_id':prefix,'source_file':source.relative_to(ROOT).as_posix(),'source_project':blend.relative_to(ROOT).as_posix(),
            'source_triangles':source_triangles,'source_textures':source_textures,'bounds_blender_z_up':source_bounds,
            'concept_scale':{'render_units_per_meter':.01,'width_ru':width,'height_ru':desired_height},
            'task_record':(source.parent/'task.json').relative_to(ROOT).as_posix(),
            'generation_id':task.get('task_id'),'credits_consumed':task.get('credits_consumed'),
            'runtime_assets':records,'repairs':['Centered bottom pivot','Y-up glTF export','Height constrained to declared human-scale architecture','Welded coincident vertices','Recalculated consistent normals','Original Tripo PBR and native textures preserved; only downsampled','LOD3 diffuse atlas baked from formal source; no invented facade texture']}


if __name__ == '__main__':
    requested = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['pavilion','tower']
    manifest_path = ROOT / 'content/scenes/C15_riverfront_assets.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {'concept_id':'C15','coordinate_frame':'GLB +Y up, centered bottom origin','assets':[]}
    for kind in requested:
        assert kind in ['pavilion','tower']
        record = process('riverfront_'+kind,'c15-riverfront-'+kind,1.2 if kind=='pavilion' else .2,.17 if kind=='pavilion' else .8)
        manifest['assets'] = [r for r in manifest['assets'] if r['asset_id'] != record['asset_id']] + [record]
        manifest_path.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
        print('RIVERFRONT_ASSET_COMPLETE',json.dumps(record))
