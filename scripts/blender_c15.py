"""C15 precise habitat shell and Tripo district repair; runtime coordinates Y-up, cylinder Z."""
import bpy
import json
import math
import random
import sys
from array import array
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/C15'
WORK = ROOT / 'assets/source/blender/C15'
OUT.mkdir(parents=True, exist_ok=True)
WORK.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
random.seed(15)
MACRO_ONLY = '--macro-only' in sys.argv or '--habitat-only' in sys.argv
TREE_ONLY = '--tree-only' in sys.argv

def material(name, color, metallic=0, roughness=.7):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if p is None:
        p = m.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
        output = m.node_tree.nodes.new('ShaderNodeOutputMaterial')
        m.node_tree.links.new(p.outputs['BSDF'], output.inputs['Surface'])
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metallic
    p.inputs['Roughness'].default_value = roughness
    m.use_backface_culling = False
    return m

steel = material('Brushed structural aluminum', (.43,.49,.53), .8,.45)
mirror_finish = material('Silvered optical mirror facets', (.78,.84,.88), .98,.12)
ceramic = material('White ceramic radiation shield', (.68,.72,.71), .15,.65)
glass = material('Blue spectral window panels', (.035,.12,.17), .5,.24)
grass = material('Mature ecological ground', (.14,.25,.085))
soil = material('Cultivated agricultural soil', (.21,.18,.095))
water = material('Freshwater channels', (.025,.14,.2), .25,.21)
shore = material('Riverbank sediment and gravel', (.25,.26,.17))
road = material('Urban pedestrian and service road', (.24,.27,.25))
thermal = material('Dark radiator ceramic', (.055,.075,.09), .1,.85)
crop = material('Seasonal planted terraced crops', (.22,.32,.105), 0,.92)
gravel = material('Pale compacted maintenance gravel', (.34,.35,.3), 0,.93)
rubber = material('Dark docking seals', (.024,.028,.033), 0,.88)
for mat in [steel,ceramic,thermal]:
    shader=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    for suffix,socket in [('normal','Normal'),('roughness','Roughness')]:
        source=ROOT/'assets/source/blender/C01/textures'/f'titanium_{suffix}.png'
        if source.exists():
            image=bpy.data.images.load(str(source),check_existing=True)
            image.colorspace_settings.name='Non-Color'
            image.pack()
            node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
            if suffix=='normal':
                normal=mat.node_tree.nodes.new('ShaderNodeNormalMap')
                normal.inputs['Strength'].default_value=.22
                mat.node_tree.links.new(node.outputs['Color'],normal.inputs['Color'])
                mat.node_tree.links.new(normal.outputs['Normal'],shader.inputs[socket])
            else: mat.node_tree.links.new(node.outputs['Color'],shader.inputs[socket])

# Tileable ground and engineered panel maps remain editable and embedded in GLB.
textures=WORK/'textures'
textures.mkdir(exist_ok=True)
for mat,kind in [(grass,'ecological_ground'),(ceramic,'ceramic_panels')]:
    pixels=array('f')
    for y in range(512):
        for x in range(512):
            u,v=x/512,y/512
            grain=((x*193+y*127+x*y*17)%997)/997-.5
            if kind=='ecological_ground':
                variation=.83+.13*math.sin(u*54+math.sin(v*39)*3)+.09*math.sin(v*91+u*43)+grain*.05
                c=(.14*variation,.25*variation,.085*variation)
            else:
                seam=(u*24)%1<.016 or (v*48)%1<.012
                c=(.2,.24,.26) if seam else (.68+grain*.018,.72+grain*.018,.71+grain*.018)
            pixels.extend((*c,1))
    image=bpy.data.images.new(kind,width=512,height=512)
    image.pixels.foreach_set(pixels)
    image.filepath_raw=str(textures/(kind+'.png'))
    image.file_format='PNG'
    image.save()
    image.pack()
    nodes=mat.node_tree.nodes
    node=nodes.new('ShaderNodeTexImage')
    node.image=image
    shader=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    mat.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color'])

# Embedded ground micro normals retain surface texture when the sunlight rakes the valley.
pixels=array('f')
for y in range(512):
    for x in range(512):
        dx=math.sin(x*.35+y*.17)*.16+math.sin(x*1.27-y*.67)*.07
        dy=math.cos(y*.31-x*.13)*.16+math.cos(y*1.33+x*.73)*.07
        normal=Vector((dx,dy,1)).normalized()
        pixels.extend(((normal.x+1)/2,(normal.y+1)/2,(normal.z+1)/2,1))
image=bpy.data.images.new('ecological_soil_normal',width=512,height=512)
image.pixels.foreach_set(pixels);image.colorspace_settings.name='Non-Color'
image.filepath_raw=str(textures/'ecological_soil_normal.png');image.file_format='PNG';image.save();image.pack()
for mat in [grass,soil,crop,shore,gravel]:
    nodes=mat.node_tree.nodes
    node=nodes.new('ShaderNodeTexImage');node.image=image
    normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.35
    shader=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    mat.node_tree.links.new(node.outputs['Color'],normal.inputs['Color'])
    mat.node_tree.links.new(normal.outputs['Normal'],shader.inputs['Normal'])

def mapped(p):
    return (p[0], -p[2], p[1])

def mesh(name, vertices, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata([mapped(p) for p in vertices], [], faces)
    data.materials.append(mat)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    # UVs retained for future texture editing; simple cylindrical local tile mapping.
    uv = data.uv_layers.new(name='SurfaceUV')
    for polygon in data.polygons:
        for loop in polygon.loop_indices:
            p = vertices[data.loops[loop].vertex_index]
            uv.data[loop].uv = (math.atan2(p[1],p[0]) / (2*math.pi), p[2]/240)
    return obj

def band(name, radius, a0, a1, z0, z1, mat, az=30, zz=12, wave=0):
    vertices=[]
    for j in range(zz+1):
        z=z0+(z1-z0)*j/zz
        for i in range(az+1):
            a=a0+(a1-a0)*i/az
            r=radius + wave*(math.sin(z*.075+a*13)*.5+math.sin(z*.021-a*19)*.5)
            vertices.append((r*math.cos(a),r*math.sin(a),z))
    faces=[]
    for j in range(zz):
        for i in range(az):
            k=j*(az+1)+i
            faces.append((k,k+1,k+az+2,k+az+1))
    return mesh(name,vertices,faces,mat)

def box(name, center, size, mat):
    x,y,z=center
    a,b,c=(v/2 for v in size)
    vs=[(x+dx*a,y+dy*b,z+dz*c) for dx,dy,dz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    return mesh(name,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)

def beam(name,start,end,width,mat):
    a,b=Vector(start),Vector(end)
    direction=(b-a).normalized()
    side=direction.cross(Vector((0,0,1)))
    if side.length<.01: side=direction.cross(Vector((0,1,0)))
    side.normalize()
    other=direction.cross(side).normalized()
    vertices=[tuple(p+side*(math.cos(i*math.pi/4)*width)+other*(math.sin(i*math.pi/4)*width)) for p in [a,b] for i in range(8)]
    return mesh(name,vertices,[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)]+[tuple(range(7,-1,-1)),tuple(range(8,16))],mat)

def join_named(prefix, name):
    objs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(prefix)]
    if not objs:
        return
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]
    bpy.ops.object.join()
    objs[0].name=name

def solid_ring(name, inner, outer, z0, z1, mat, segments=96):
    vertices=[(r*math.cos(k*2*math.pi/segments),r*math.sin(k*2*math.pi/segments),z) for z in [z0,z1] for r in [inner,outer] for k in range(segments)]
    faces=[]
    for k in range(segments):
        q=(k+1)%segments
        faces.extend([(k,q,q+segments,k+segments),(k+2*segments,k+3*segments,q+3*segments,q+2*segments),(k,k+2*segments,q+2*segments,q),(k+segments,q+segments,q+3*segments,k+3*segments)])
    return mesh(name,vertices,faces,mat)

def terrace(name,a,z0,z1,halfwidth,offset,mat):
    # Curving field borders follow the inner wall and service contours.
    vertices=[]
    for j in range(25):
        z=z0+(z1-z0)*j/24
        angle=a+offset+.028*math.sin(z*.075)+.012*math.sin(z*.18)
        width=halfwidth*(.82+.18*math.sin(j*math.pi/24))
        for edge in [-1,1]:
            q=angle+edge*width
            r=39.27+.04*math.sin(z*.061+q*7)
            vertices.append((r*math.cos(q),r*math.sin(q),z))
    return mesh(name,vertices,[(2*j,2*j+1,2*j+3,2*j+2) for j in range(24)],mat)

centers=[-math.pi/2,math.pi/6,5*math.pi/6]
for n,a in enumerate(centers):
    band(f'shell_land_{n}',40,a-math.pi/6,a+math.pi/6,-120,120,ceramic)
    for row in range(20):
        for col in range(5):
            angle=a-math.pi/6+(col+.5)*math.pi/15
            z=-114+row*12
            corners=[]
            for radius in [40.02,40.18]:
                for da,dz in [(-.1,-5.8),(.1,-5.8),(.1,5.8),(-.1,5.8)]:
                    q=angle+da
                    corners.append((radius*math.cos(q),radius*math.sin(q),z+dz))
            mesh(f'shell_land_{n}_panel_{row}_{col}',corners,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],ceramic)
    join_named(f'shell_land_{n}',f'shell_land_{n}')
    band(f'shell_window_{n}',40,a+math.pi/6,a+math.pi/2,-120,120,glass)
    ground=band(f'ecology_ground_{n}',39.5,a-math.pi/6,a+math.pi/6,-115,115,grass,64,112,.15)
    for polygon in ground.data.polygons: polygon.use_smooth=True
    # Meandering water is integrated into the curved inner wall.
    for label,halfwidth,radius,mat in [('bank',.052,39.26,shore),('water',.033,39.23,water),('road',.009,39.24,road)]:
        vs=[]
        for j in range(161):
            z=-110+j*220/160
            angle=a+.16+.11*math.sin(z*.05+n)+.025*math.sin(z*.12-n)
            if label=='road': angle-=.125
            width=halfwidth*(1+.3*math.sin(z*.077+n))
            for offset in [-width,width]:
                q=angle+offset
                vs.append((radius*math.cos(q),radius*math.sin(q),z))
        mesh(f'ecology_{label}_{n}',vs,[(2*j,2*j+1,2*j+3,2*j+2) for j in range(160)],mat)
    for row in range(10):
        z=-106+row*21
        for field in range(4):
            offset=-.43+field*.035
            terrace(f'ecology_agriculture_{n}_{row}_{field}',a,z,z+random.uniform(15,19),.014,offset,crop if (field+row)%3 else soil)
        terrace(f'ecology_road_field_{n}_{row}',a,z,z+20,.006,-.28,gravel)
    # Formal broadleaf tree LODs are instanced in the renderer, no ellipsoid proxy crowns.
    for path_offset in [-.22,.4]:
        terrace(f'ecology_road_contour_{n}_{path_offset}',a,-110,110,.006,path_offset,road)
    for z in range(-96,100,32):
        band(f'ecology_road_cross_{n}_{z}',39.2,a-.27,a+.02,z-.22,z+.22,gravel,16,1)
    # Longitudinal window frames establish engineering scale.
    for offset in [-math.pi/6,math.pi/6,math.pi/2]:
        band(f'shell_frame_{n}_{offset}',40.25,a+offset-.008,a+offset+.008,-120,120,steel,1,1)
    for sign in [-1,1]:
        # Mirror segments sit outside the cylinder on articulated support arms.
        theta=a+math.pi/3
        x,y=math.cos(theta),math.sin(theta)
        tangent=Vector((-y,x,0))
        normal=Vector((x,y,0))
        for col in range(3):
            for row in range(8):
                c=normal*65+tangent*((col-1)*8)+Vector((0,0,sign*100+(row-3.5)*6.8))
                vs=[tuple(c+tangent*dx+Vector((0,0,dz))) for dx,dz in [(-3.9,-3.25),(3.9,-3.25),(3.9,3.25),(-3.9,3.25)]]
                # Closed segmented optical substrate, rather than a zero-thickness gray card.
                back=[tuple(Vector(p)+normal*.14) for p in vs]
                mesh(f'mirror_facet_{n}_{sign}_{col}_{row}',vs+back,[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],mirror_finish)
                for edge in range(4):
                    beam(f'mirror_facet_frame_{n}_{sign}_{col}_{row}_{edge}',Vector(vs[edge])-normal*.02,Vector(vs[(edge+1)%4])-normal*.02,.065,ceramic)
                beam(f'mirror_rear_diagonal_{n}_{sign}_{col}_{row}',Vector(back[0])+normal*.3,Vector(back[2])+normal*.3,.07,steel)
                beam(f'mirror_rear_cross_{n}_{sign}_{col}_{row}',Vector(back[1])+normal*.3,Vector(back[3])+normal*.3,.07,steel)
        for side in [-1,1]:
            t=tangent*(side*12)
            beam(f'mirror_frame_{n}_{sign}_{side}',normal*65+t+Vector((0,0,sign*100-28)),normal*65+t+Vector((0,0,sign*100+28)),.25,steel)
        for row in range(9):
            z=sign*100+(row-4)*6.8
            beam(f'mirror_backbone_{n}_{sign}_{row}',normal*65-tangent*12+Vector((0,0,z)),normal*65+tangent*12+Vector((0,0,z)),.2,steel)
        band(f'mirror_support_{n}_{sign}',52,theta-.012,theta+.012,sign*75,sign*120,steel,1,1)
        for attachment in [75,115]:
            beam(f'mirror_arm_{n}_{sign}_{attachment}',(x*40,y*40,sign*attachment),(x*65,y*65,sign*100),.35,steel)
    band(f'radiator_{n}',48,a-.16,a+.16,-75,75,thermal,8,15)
    for fin in range(15):
        band(f'radiator_fin_{n}_{fin}',49,a-.17,a+.17,-74+fin*10,-73+fin*10,steel,8,1)

for z in [-120,120]:
    sign=1 if z>0 else -1
    # Ring-shaped end caps preserve a genuinely open axial entrance.
    vertices=[];faces=[]
    for r in [6,40]:
        for k in range(97):
            a=k*2*math.pi/96
            vertices.append((r*math.cos(a),r*math.sin(a),z))
    for k in range(96): faces.append((k,k+1,k+98,k+97))
    solid_ring(f'endcap_{z}',6,40,z-.45,z+.45,steel)
    band(f'docking_{z}',6,0,2*math.pi,z-8,z+8,ceramic,48,1)
    solid_ring(f'docking_bearing_housing_{z}',5.8,8.5,z+sign*6-.55,z+sign*6+.55,steel,96)
    solid_ring(f'docking_bearing_seal_{z}',5.75,6.15,z+sign*6-.65,z+sign*6+.65,rubber,96)
    solid_ring(f'docking_flange_{z}',5.85,7,z+sign*8-.16,z+sign*8+.16,ceramic,96)
    solid_ring(f'docking_inner_bearing_{z}',5.6,6.4,z-sign*7-.25,z-sign*7+.25,steel,64)
    # Concentric service gallery, radial columns, and eight inspection pods around the axial passage.
    for k in range(32):
        q=k*math.pi/16
        pos=Vector((7.9*math.cos(q),7.9*math.sin(q),z+sign*6))
        beam(f'docking_bearing_fastener_{z}_{k}',pos-Vector((0,0,.65)),pos+Vector((0,0,.65)),.12,ceramic)
    for k in range(8):
        q=k*math.pi/4
        unit=Vector((math.cos(q),math.sin(q),0))
        tangent=Vector((-math.sin(q),math.cos(q),0))
        c=unit*10+Vector((0,0,z+sign*3.5))
        pod=box(f'docking_inspection_pod_{z}_{k}',tuple(c),(2.3,2.3,3.6),ceramic)
        beam(f'docking_pod_support_{z}_{k}',unit*7.5+Vector((0,0,z+sign*3.5)),c,.28,steel)
        for dz in [-1.1,0,1.1]:
            beam(f'docking_service_handle_{z}_{k}_{dz}',c+tangent*.75+Vector((0,0,dz)),c-tangent*.75+Vector((0,0,dz)),.055,steel)
    for k in range(24):
        q=k*math.pi/12
        unit=Vector((math.cos(q),math.sin(q),0))
        for dz in [-5,0,5]:
            band(f'docking_corridor_panel_{z}_{k}_{dz}',5.92,q+.015,q+math.pi/12-.015,z+dz-2.35,z+dz+2.35,steel if k%3==0 else ceramic,2,1)
    for spoke in range(12):
        a=spoke*math.pi/6
        beam(f'endcap_spoke_{z}_{spoke}',(6*math.cos(a),6*math.sin(a),z+.35),(39*math.cos(a),39*math.sin(a),z+.35),.3,ceramic)
        band(f'endcap_rim_{z}_{spoke}',40.7,a-.25,a+.25,z-.8,z+.8,ceramic,12,1)
        band(f'docking_service_{z}_{spoke}',7,a-.12,a+.12,z-7,z+7,steel,5,1)
    solid_ring(f'endcap_ring_{z}',17.5,18.5,z-.3,z+.5,ceramic)
    solid_ring(f'endcap_outer_ring_{z}',35.6,36.4,z-.3,z+.5,ceramic)
join_named('endcap_spoke','endcap_spokes')
join_named('endcap_rim','endcap_rim')
join_named('endcap_ring','endcap_ring')
join_named('endcap_outer_ring','endcap_outer_ring')
join_named('docking_service','docking_service')
join_named('docking_bearing_fastener','docking_bearing_fasteners')
join_named('docking_inspection_pod','docking_inspection_pods')
join_named('docking_pod_support','docking_pod_supports')
join_named('docking_corridor_panel','docking_corridor_panels')
for z in range(-120,121,20):
    band(f'shell_ring_{z}',40.4,0,2*math.pi,z-.3,z+.3,steel,96,1)
join_named('mirror','mirror')
join_named('radiator','radiator')
join_named('ecology_ground','ecology_ground')
join_named('ecology_water','ecology_water')
join_named('ecology_forest','ecology_forest')
join_named('ecology_agriculture','ecology_agriculture')
join_named('ecology_bank','ecology_bank')
join_named('ecology_road','ecology_road')
join_named('ecology_trunk','ecology_trunk')
join_named('shell_ring','shell_rings')
join_named('shell_frame','shell_frames')

# The independent Tripo plant lands on this dry, load-bearing service platform.
# Keep platform outside life_support naming, whose old placeholder is hidden by renderer.
box('equipment_platform',(0,-39.35,78),(6,.6,7),steel)
for x in [-2.85,2.85]:
    beam(f'equipment_platform_rail_{x}',(x,-38.65,74.65),(x,-38.65,81.35),.065,steel)
    for z in [74.7,78,81.3]:
        beam(f'equipment_platform_post_{x}_{z}',(x,-39.05,z),(x,-38.65,z),.05,steel)
for z in [74.6,81.4]:
    box(f'equipment_platform_tread_{z}',(0,-39.01,z),(5.6,.08,.24),gravel)
join_named('equipment_platform','equipment_platform')

habitat=[o for o in bpy.context.scene.objects if o.type=='MESH']
habitat_triangles=sum(len(p.vertices)-2 for o in habitat for p in o.data.polygons)
assert habitat_triangles < 180000, 'Macro habitat must stay below the 180k triangle budget'
bpy.ops.object.select_all(action='DESELECT')
for obj in habitat: obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'habitat.glb'),export_format='GLB',use_selection=True,export_yup=True)
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=16
scene.render.resolution_x=960
scene.render.resolution_y=600
scene.render.resolution_percentage=100
scene.world.color=(.015,.02,.03)
for rotation,energy in [((.5,-.5,.4),3),((-.8,.4,-.7),1.5)]:
    bpy.ops.object.light_add(type='SUN')
    bpy.context.object.rotation_euler=rotation
    bpy.context.object.data.energy=energy
bpy.ops.object.camera_add(location=mapped((190,110,230)))
camera=bpy.context.object
camera.rotation_euler=(-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'
camera.data.ortho_scale=360
scene.camera=camera
scene.render.filepath=str(WORK/'review_exterior.png')
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(WORK/'habitat_master.blend'))
metadata={'coordinateFrame':'Runtime +Y up, cylinder +Z; radius40 length240 illustrative units', 'sourceProject':'assets/source/blender/C15/habitat_master.blend', 'habitat':{'file':'habitat.glb','triangles':habitat_triangles,'bytes':(OUT/'habitat.glb').stat().st_size,'nodes':[o.name for o in habitat]}, 'district':[], 'qa':{'missingUV':[o.name for o in habitat if not o.data.uv_layers],'nonFiniteVertices':sum(not all(math.isfinite(v) for v in vertex.co) for o in habitat for vertex in o.data.vertices)}, 'scientificBoundary':'Conceptual ONeill cylinder engineering illustration; radius40 length240 are rendering units, not measured or validated physical dimensions.'}

sources=list((ROOT/'assets/source/tripo/C15').glob('tripo-out/*ecology*/model.glb'))
support_sources=list((ROOT/'assets/source/tripo/C15').glob('tripo-out/*life-support*/model.glb'))
tree_sources=list((ROOT/'assets/source/tripo/C15').glob('tripo-out/*broadleaf-tree*/model.glb'))
if (OUT/'asset_metadata.json').exists():
    previous=json.loads((OUT/'asset_metadata.json').read_text(encoding='utf-8'))
    metadata.update({key:value for key,value in previous.items() if key.startswith(('district','life_support','tree')) or key=='repairs'})

def repair(source,prefix,width,budgets):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0]
    if len(meshes)>1: bpy.ops.object.join()
    obj=meshes[0]
    obj.name=prefix
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    bounds=[obj.matrix_world@Vector(v) for v in obj.bound_box]
    low=Vector([min(v[k] for v in bounds) for k in range(3)])
    high=Vector([max(v[k] for v in bounds) for k in range(3)])
    # Blender source is Z-up; normalized district keeps bottom at zero and exports Y-up.
    scale=(1.8/(high.z-low.z) if prefix=='tree' else width/max(high.x-low.x,high.y-low.y))
    for v in obj.data.vertices:
        v.co=(v.co-Vector(((low.x+high.x)/2,(low.y+high.y)/2,low.z)))*scale
    if prefix=='tree':
        horizontal_scale=min(1.0,1.4/(max(high.x-low.x,high.y-low.y)*scale))
        for vertex in obj.data.vertices:
            vertex.co.x*=horizontal_scale
            vertex.co.y*=horizontal_scale
    sourcefaces=sum(len(p.vertices)-2 for p in obj.data.polygons)
    metadata[prefix+'QA']={'meshes':1,'materials':len(obj.data.materials),'missingUV':not bool(obj.data.uv_layers),'nonFiniteVertices':sum(not all(math.isfinite(v) for v in vertex.co) for vertex in obj.data.vertices),'foliageSilhouette':'separate geometric leaf silhouettes; source does not contain alpha cards' if prefix=='tree' else None}
    source_images={node.image.name:node.image for mat in obj.data.materials for node in mat.node_tree.nodes if node.type=='TEX_IMAGE' and node.image}
    metadata[prefix+'SourceTextures']=[{'name':image.name,'width':image.size[0],'height':image.size[1]} for image in source_images.values()]
    bpy.ops.wm.save_as_mainfile(filepath=str(WORK/f'{prefix}_master.blend'))
    master=obj.data.copy()
    metadata[prefix]=[]
    for i,target in enumerate(budgets):
        obj.data=master.copy()
        texture_limit=([4096,2048,1024] if prefix=='district' else [2048,1024,512])[i]
        for image in bpy.data.images:
            if image.type=='IMAGE' and max(image.size)>texture_limit:
                factor=texture_limit/max(image.size)
                image.scale(max(1,int(image.size[0]*factor)),max(1,int(image.size[1]*factor)))
                image.pack()
        if sourcefaces>target:
            modifier=obj.modifiers.new('Runtime topology budget','DECIMATE')
            modifier.ratio=target/sourcefaces
            bpy.context.view_layer.objects.active=obj
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        triangles=sum(len(p.vertices)-2 for p in obj.data.polygons)
        path=OUT/f'{prefix}_lod{i}.glb'
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True)
        metadata[prefix].append({'file':path.name,'triangles':triangles,'bytes':path.stat().st_size,'textureLimit':texture_limit})
    metadata[prefix+'Source']=source.relative_to(ROOT).as_posix()
    metadata[prefix+'SourceTriangles']=sourcefaces
    metadata[prefix+'SourceProject']=f'assets/source/blender/C15/{prefix}_master.blend'
    metadata['repairs']=['Normalized centered-bottom pivot and Y-up export','Tripo source preserved untouched on disk','Runtime LOD copies decimated locally; embedded PBR textures preserved','District retained as one mesh with material primitives to limit draw calls']
    metadata[prefix+'Bounds']={'width':(high.x-low.x)*scale*(horizontal_scale if prefix=='tree' else 1),'depth':(high.y-low.y)*scale*(horizontal_scale if prefix=='tree' else 1),'height':(high.z-low.z)*scale}

if sources and not MACRO_ONLY and not TREE_ONLY and '--life-support-only' not in sys.argv:
    repair(sources[0],'district',10,[160000,20000,3500])
if support_sources and not MACRO_ONLY and not TREE_ONLY:
    repair(support_sources[0],'life_support',5,[80000,8000,2000])
if tree_sources and not MACRO_ONLY:
    repair(tree_sources[0],'tree',1.4,[20000,5000,1000])

assert metadata['habitat']['bytes']>10000
assert all(math.isfinite(v) for o in bpy.context.scene.objects if o.type=='MESH' for vertex in o.data.vertices for v in vertex.co)
(OUT/'asset_metadata.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
runtime=[{'asset_id':'habitat','file':'public/assets/C15/habitat.glb','url':'/assets/C15/habitat.glb','usage':'precise exterior and inner ecology','status':'ready',**{k:metadata['habitat'][k] for k in ['triangles','bytes']}}]
runtime.extend({'asset_id':f'district_lod{i}','file':f'public/assets/C15/{lod["file"]}','url':f'/assets/C15/{lod["file"]}','usage':['close city inspection','intermediate city approach','distant city layout'][i],'status':'ready','triangles':lod['triangles'],'bytes':lod['bytes']} for i,lod in enumerate(metadata['district']))
manifest={'schema_version':'0.8','concept_id':'C15','implementation_status':'assets_prepared_browser_review_pending','source_pipeline':['Tripo','Blender','glTF/GLB','Three.js/R3F'],'units':{'physical_units':'not_fixed_for_concept_asset','render_units':'radius40 length240','note':metadata['scientificBoundary']},'source_assets':[{'asset_id':'habitat_blender_master','file':metadata['sourceProject'],'role':'editable precise shell and ecology','status':'ready'}], 'runtime_assets':runtime,'interactive_hierarchy':[{'object_id':name,'display_name':name,'part_of':parent,'required':True} for name,parent in [('habitat',None),('shell','habitat'),('interior','habitat'),('endcap','habitat'),('mirrors','habitat'),('thermal','habitat'),('life_support','habitat'),('city','interior'),('forest','interior'),('water','interior'),('agriculture','interior'),('docking','endcap')]],'production_records':{'script':'scripts/blender_c15.py','metadata':'public/assets/C15/asset_metadata.json','scientific_boundary':metadata['scientificBoundary']}}
if sources:
    manifest['source_assets'].extend([{'asset_id':'district_tripo_original','file':metadata['districtSource'],'role':'untouched textured detailed generation','status':'ready'},{'asset_id':'district_blender_master','file':metadata['districtSourceProject'],'role':'normalized city source with PBR and LOD production','status':'ready'}])
    manifest['tripo_tasks']=[{'task_id':'c30d811b-06f1-48bf-8157-523f3cbce4b9','type':'text_to_model','model':'v3.1-20260211','credits_consumed':50,'review_status':'preview_checked'}]
if metadata.get('life_support'):
    manifest['runtime_assets'].extend({'asset_id':f'life_support_lod{i}','file':f'public/assets/C15/{lod["file"]}','url':f'/assets/C15/{lod["file"]}','usage':'independent environmental plant near inspection','status':'ready','triangles':lod['triangles'],'bytes':lod['bytes']} for i,lod in enumerate(metadata['life_support']))
    manifest['source_assets'].extend([{'asset_id':'life_support_tripo_original','file':metadata['life_supportSource'],'role':'untouched industrial plant source','status':'ready'},{'asset_id':'life_support_blender_master','file':metadata['life_supportSourceProject'],'role':'normalized environmental plant and PBR LOD production','status':'ready'}])
    manifest['tripo_tasks'].append({'task_id':'9f6f6a37-849c-4110-85aa-6ae4373c326e','type':'text_to_model','model':'v3.1-20260211','credits_consumed':50,'review_status':'preview_checked'})
if metadata.get('tree'):
    manifest['runtime_assets'].extend({'asset_id':f'tree_lod{i}','file':f'public/assets/C15/{lod["file"]}','url':f'/assets/C15/{lod["file"]}','usage':'distance-selected mature broadleaf botanical foliage','status':'ready','triangles':lod['triangles'],'bytes':lod['bytes']} for i,lod in enumerate(metadata['tree']))
    manifest['source_assets'].extend([{'asset_id':'tree_tripo_original','file':metadata['treeSource'],'role':'untouched textured mature broadleaf tree','status':'ready'},{'asset_id':'tree_blender_master','file':metadata['treeSourceProject'],'role':'normalized bottom-origin tree, retained PBR and local LODs','status':'ready'}])
    task_path=ROOT/metadata['treeSource'];task_path=task_path.parent/'task.json'
    task=json.loads(task_path.read_text(encoding='utf-8'))
    manifest['tripo_tasks'].append({'task_id':task['task_id'],'type':task['type'],'model':'v3.1-20260211','credits_consumed':task['credits_consumed'],'review_status':'preview_checked'})
(ROOT/'content/scenes/C15_asset_manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding='utf-8')
print('C15_ASSET_COMPLETE',json.dumps({'habitatTriangles':metadata['habitat']['triangles'],'runtimeAssets':[asset['asset_id'] for asset in manifest['runtime_assets']],'metadata':'public/assets/C15/asset_metadata.json'}))
