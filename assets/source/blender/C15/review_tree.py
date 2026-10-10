import bpy, json, math
from pathlib import Path
from mathutils import Vector
root=Path(r'E:/Projects/Cosmic Engineering Simulator')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(root/'public/assets/C15/tree_lod0.glb'))
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
qa={'meshes':len(objects),'materials':sum(len(o.data.materials) for o in objects),'missingUV':[o.name for o in objects if not o.data.uv_layers],'nonFiniteVertices':sum(not all(math.isfinite(v) for v in p.co) for o in objects for p in o.data.vertices),'foliageSilhouette':'Tripo geometric leaf silhouettes, no source alpha cards'}
metadata_path=root/'public/assets/C15/asset_metadata.json'
m=json.loads(metadata_path.read_text());m['treeQA']=qa;metadata_path.write_text(json.dumps(m,indent=2))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.resolution_x=768;scene.render.resolution_y=768
scene.world.color=(.15,.15,.15)
for rotation,energy in [((.5,-.5,.4),2),((-.8,.4,-.7),1)]:
 bpy.ops.object.light_add(type='SUN');bpy.context.object.rotation_euler=rotation;bpy.context.object.data.energy=energy
bpy.ops.object.camera_add(location=(3,-4,2.4));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.95))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.25;scene.camera=cam
scene.render.filepath=str(root/'assets/source/blender/C15/review_tree_lod0.png');bpy.ops.render.render(write_still=True)
print('TREE_RUNTIME_QA',json.dumps(qa))
