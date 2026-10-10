"""Render the actual PC LOD0 GLBs for mesh/material production QA."""
import bpy
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[4]
WORK = ROOT / 'assets/source/blender/C15'
for asset in ['district', 'life_support']:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / f'public/assets/C15/{asset}_lod0.glb'))
    vertices = [o.matrix_world @ Vector(v) for o in bpy.context.scene.objects if o.type == 'MESH' for v in o.bound_box]
    low = Vector([min(v[i] for v in vertices) for i in range(3)])
    high = Vector([max(v[i] for v in vertices) for i in range(3)])
    center = (low + high) / 2
    size = max(high - low)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1440
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get('Background')
    background.inputs['Color'].default_value = (.2, .25, .3, 1)
    background.inputs['Strength'].default_value = .45
    for position, power in [((.5, -.7, 1.8), 1500), ((-1, .3, 1), 750)]:
        bpy.ops.object.light_add(type='AREA', location=center + Vector(position) * size)
        light = bpy.context.object
        light.data.energy = power * (size / 10) ** 2
        light.data.shape = 'DISK'
        light.data.size = size
        light.rotation_euler = (center - light.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.camera_add(location=center + Vector((1.3, -1.6, 1.2)) * size)
    camera = bpy.context.object
    camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = size * 1.7
    scene.camera = camera
    scene.render.filepath = str(WORK / f'review_{asset}_lod0.png')
    bpy.ops.render.render(write_still=True)
