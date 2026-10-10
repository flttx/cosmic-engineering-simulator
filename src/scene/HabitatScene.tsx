import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Html, Line, MeshReflectorMaterial, OrbitControls, Stars } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ACESFilmicToneMapping, DoubleSide, FogExp2, Frustum, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera, Plane, PMREMGenerator, Quaternion, Vector2, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { SceneProps } from '../types';
import { districtMatrices, forestMatrices, HABITAT_POINTS, HABITAT_RATE, habitatFrame, riverCenter, riverWidth, terrainRadiusAt, towerMatrices } from './habitat';

function disposeModel(root: Object3D) {
  const textures = new Set<import('three').Texture>();
  root.traverse(node => {
    if (!(node instanceof Mesh)) return;
    node.geometry.dispose();
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (material instanceof MeshStandardMaterial) for (const texture of [material.map, material.normalMap, material.roughnessMap, material.metalnessMap, material.aoMap, material.emissiveMap]) if (texture) textures.add(texture);
      material.dispose();
    }
  });
  textures.forEach(texture => texture.dispose());
}
const EXTERIOR_FILES = ['habitat'];
const INTERIOR_FILES = ['riverfront_environment', 'life_support_lod0', 'riverfront_boat_lod0', 'riverfront_boat_lod1', 'riverfront_boat_lod2', 'riverfront_bench_lod0', ...['district', 'tree', 'riverfront_pavilion', 'riverfront_tower'].flatMap(name => [0, 1, 2, 3].map(level => `${name}_lod${level}`))];
function useHabitatModels(files: string[], active: boolean) {
  const [loaded, setLoaded] = useState<{ models: Record<string, Group>; status: 'loading' | 'ready' | 'fallback' }>({ models: {}, status: 'loading' });
  const resources = useRef<Group[]>([]);
  const completed = useRef(false);
  useEffect(() => {
    if (!active || completed.current) return;
    let cancelled = false;
    const loader = new GLTFLoader();
    Promise.allSettled(files.map(file => loader.loadAsync(`/assets/C15/${file}.glb`))).then(results => {
      const models: Record<string, Group> = {};
      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') return;
        const model = result.value.scene;
        if (cancelled) { disposeModel(model); return; }
        resources.current.push(model); models[files[index]] = model; model.updateMatrixWorld(true);
        model.traverse(node => {
          if (!(node instanceof Mesh)) return;
          if (files[index] === 'habitat' && node.name.includes('endcap')) node.material = Array.isArray(node.material) ? node.material.map(material => material.clone()) : node.material.clone();
          node.receiveShadow = true; node.castShadow = ['pavilion', 'boat', 'bench'].some(name => files[index].includes(name));
          for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material instanceof MeshStandardMaterial) {
            material.normalScale.setScalar(files[index] === 'riverfront_environment' ? .5 : .22);
            if (files[index].startsWith('tree')) { material.side = DoubleSide; material.metalness = 0; material.roughness = .85; }
            else if (files[index].startsWith('district')) { material.metalness *= .25; material.roughness = Math.max(.6, material.roughness); }
            else if (files[index].startsWith('life_support')) { material.metalness *= .5; material.roughness = Math.max(.55, material.roughness); node.castShadow = true; }
          }
        });
      });
      if (!cancelled) { completed.current = true; setLoaded({ models, status: results.every(result => result.status === 'fulfilled') ? 'ready' : 'fallback' }); }
    });
    return () => { cancelled = true; };
  }, [files, active]);
  useEffect(() => () => { resources.current.forEach(disposeModel); resources.current = []; }, []);
  return loaded;
}
function LandscapeInstances({ models, matrices, kind, props, interior, lodDistance = 30 }: { models: (Group | null)[]; matrices: Matrix4[]; kind: 'city' | 'forest'; props: SceneProps; interior: boolean; lodDistance?: number }) {
  const meshes = useMemo(() => {
    const result: { mesh: Mesh; level: number }[] = [];
    models.forEach((model, level) => model?.traverse(node => { if (node instanceof Mesh) result.push({ mesh: node, level }); }));
    return result;
  }, [models]);
  const instances = useRef<(InstancedMesh | null)[]>([]);
  const camera = useThree(state => state.camera);
  const centers = useMemo(() => matrices.map(matrix => ({ point: new Vector3().setFromMatrixPosition(matrix), scale: new Vector3().setFromMatrixScale(matrix).x })), [matrices]);
  const scratch = useMemo(() => ({ camera: new Vector3(), matrix: new Matrix4(), frustum: new Frustum(), projection: new Matrix4() }), []);
  const lodTimer = useRef(1);
  useFrame((_, delta) => {
    lodTimer.current += delta;
    if (lodTimer.current < .2) return;
    lodTimer.current = 0;
    const parent = instances.current.find(instance => instance)?.parent;
    if (!parent) return;
    parent.updateWorldMatrix(true, false); parent.worldToLocal(scratch.camera.copy(camera.position)); camera.updateMatrixWorld();
    scratch.frustum.setFromProjectionMatrix(scratch.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(parent.matrixWorld));
    const visible: { slot: number; distance: number; scale: number }[] = [];
    const slots: number[][] = [[], [], [], []];
    const available = models.map(Boolean);
    centers.forEach(({ point, scale }, slot) => {
      for (const plane of scratch.frustum.planes) if (plane.distanceToPoint(point) <= -(kind === 'city' ? scale * 6 : scale * 2)) return;
      const distance = point.distanceTo(scratch.camera);
      if (distance > lodDistance * scale) slots[available[3] ? 3 : available[2] ? 2 : available[1] ? 1 : 0].push(slot);
      else visible.push({ slot, distance, scale });
    });
    visible.sort((a, b) => a.distance - b.distance);
    visible.forEach(({ slot, distance, scale }, order) => {
      const desired = !interior || props.state.quality === 'low' ? (distance > lodDistance * scale ? 3 : 2) : order < 8 && distance < lodDistance / 3 * scale ? 0 : order < (kind === 'city' ? 32 : 48) && distance < lodDistance * 2 / 3 * scale ? 1 : distance > lodDistance * scale ? 3 : 2;
      const level = available[desired] ? desired : available[3] && distance > lodDistance * scale ? 3 : available[2] ? 2 : available[1] ? 1 : 0;
      slots[level].push(slot);
    });
    meshes.forEach(({ mesh, level }, index) => {
      const instance = instances.current[index]; if (!instance) return;
      instance.count = Math.min(slots[level].length, instance.instanceMatrix.count);
      for (let packed = 0; packed < instance.count; packed++) instance.setMatrixAt(packed, scratch.matrix.multiplyMatrices(matrices[slots[level][packed]], mesh.matrixWorld));
      instance.instanceMatrix.needsUpdate = true;
    });
  });
  return <>{meshes.map(({ mesh, level }, index) => <instancedMesh key={`${level}:${index}`} args={[mesh.geometry, mesh.material, level === 0 ? 8 : level === 1 ? 48 : matrices.length]} count={0} castShadow={interior && level < 2} receiveShadow frustumCulled={false} raycast={level === 3 ? () => undefined : undefined} ref={instance => { instances.current[index] = instance; }} onClick={event => { event.stopPropagation(); if (event.delta < 4) props.onSelect(kind); }} onDoubleClick={event => { event.stopPropagation(); if (event.delta < 4) props.onFocus(kind); }} />)}</>;
}
function RiverReflection({ model, props }: { model: Group; props: SceneProps }) {
  const water = useMemo(() => {
    const meshes: Mesh[] = [];
    model.traverse(node => { if (node instanceof Mesh && node.name.startsWith('river_0')) meshes.push(node); });
    const mesh = meshes[0]; if (!mesh) return null;
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!(material instanceof MeshStandardMaterial)) return null;
    // Drei reflects along local +Z; this parent rotates its plane normal to cylinder-bottom +Y.
    const inverse = new Matrix4().compose(new Vector3(0, -39.47, 0), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2), new Vector3(1, 1, 1)).invert();
    model.updateWorldMatrix(true, true);
    const local = new Matrix4().multiplyMatrices(model.matrixWorld.clone().invert(), mesh.matrixWorld);
    return { geometry: mesh.geometry.clone().applyMatrix4(inverse.multiply(local)), material };
  }, [model]);
  useEffect(() => () => { water?.geometry.dispose(); }, [water]);
  useFrame((_, delta) => {
    if (!water?.material.normalMap || props.state.reducedMotion || !props.state.playing) return;
    water.material.normalMap.offset.add(new Vector2(delta * .009, delta * .005));
  });
  if (!water) return null;
  return <mesh geometry={water.geometry} position={[0, -39.47, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={event => { event.stopPropagation(); if (event.delta < 4) props.onSelect('water'); }} onDoubleClick={event => { event.stopPropagation(); props.onFocus('water'); }}>
    <MeshReflectorMaterial color="#246c6c" normalMap={water.material.normalMap} normalScale={[.65, .65]} roughness={.27} metalness={0} resolution={props.state.quality === 'low' ? 256 : 512} mirror={.55} mixStrength={1.2} mixContrast={1.03} depthScale={0} distortionMap={water.material.normalMap} distortion={.025} />
  </mesh>;
}
function HabitatAssets({ props, interior, clipping }: { props: SceneProps; interior: boolean; clipping: Plane }) {
  const exterior = useHabitatModels(EXTERIOR_FILES, true);
  const visibleInterior = interior || props.state.overlays.cutaway;
  const inside = useHabitatModels(INTERIOR_FILES, visibleInterior);
  const models = inside.models, macro = exterior.models.habitat, environment = models.riverfront_environment;
  const { onAssetStatus } = props;
  useEffect(() => { onAssetStatus(exterior.status === 'fallback' || (visibleInterior && inside.status === 'fallback') ? 'fallback' : exterior.status === 'loading' || (visibleInterior && inside.status === 'loading') ? 'loading' : 'ready'); }, [onAssetStatus, exterior.status, inside.status, visibleInterior]);
  const matrices = useMemo(() => visibleInterior ? districtMatrices(props.state.quality === 'low') : [], [props.state.quality, visibleInterior]);
  const treeMatrices = useMemo(() => visibleInterior ? forestMatrices(props.state.quality === 'low') : [], [props.state.quality, visibleInterior]);
  const districts = useMemo(() => [0, 1, 2, 3].map(level => models[`district_lod${level}`] ?? null), [models]);
  const trees = useMemo(() => [0, 1, 2, 3].map(level => models[`tree_lod${level}`] ?? null), [models]);
  const towers = useMemo(() => [0, 1, 2, 3].map(level => models[`riverfront_tower_lod${level}`] ?? null), [models]);
  const towerPlacements = useMemo(() => towerMatrices(), []);
  const humanScaleAssets = useMemo(() => {
    const placements: { object: Group; position: Vector3; yaw: number; id: string }[] = [];
    const boat = models.riverfront_boat_lod0;
    if (boat) {
      const z = -41.1, s = riverCenter(z) - riverWidth(z) / 2 + .08, theta = -Math.PI / 2 + s / 40;
      const tangent = Math.atan2(riverCenter(z + .01) - riverCenter(z - .01), .02);
      placements.push({ object: boat.clone(true), position: new Vector3(Math.cos(theta) * 39.472, Math.sin(theta) * 39.472, z), yaw: Math.PI / 2 + tangent, id: 'water' });
    }
    const bench = models.riverfront_bench_lod0;
    if (bench) for (const z of [-39.4, -40.5, -42.1]) {
      const s = riverCenter(z) - riverWidth(z) / 2 - .315, theta = -Math.PI / 2 + s / 40;
      placements.push({ object: bench.clone(true), position: new Vector3(Math.cos(theta) * 39.4295, Math.sin(theta) * 39.4295, z), yaw: Math.PI / 2, id: 'city' });
    }
    return placements;
  }, [models]);
  const supportRotation = useMemo(() => new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -2.6 / 40), []);
  useEffect(() => {
    if (!macro) return;
    macro.traverse(node => {
      if (!(node instanceof Mesh)) return;
      const name = node.name.toLowerCase(), shell = name.includes('shell_land'), window = name.includes('shell_window'), cap = name.includes('endcap');
      // The external plate and axial port remain inspectable from outside; their coarse outer faces are not an interior backdrop.
      node.visible = !(interior && (shell || window || cap || name.includes('docking') || name.includes('shell_frames') || name.includes('shell_rings'))) && !name.includes('life_support') && !name.includes('equipment_platform') && !(environment && name.includes('ecology'));
      node.castShadow = !interior && !window; node.receiveShadow = true;
      node.raycast = function (this: Mesh, raycaster, intersections) {
        if (!this.visible) return;
        const hits: typeof intersections = [];
        Mesh.prototype.raycast.call(this, raycaster, hits);
        intersections.push(...hits.filter(hit => {
          const material = Array.isArray(this.material) ? this.material[hit.face?.materialIndex ?? 0] : this.material;
          return !material?.clippingPlanes?.some(plane => plane.distanceToPoint(hit.point) < 0);
        }));
      };
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        material.clippingPlanes = props.state.overlays.cutaway && (shell || window || cap) ? [clipping] : null;
        if (cap && material instanceof MeshStandardMaterial) { material.transparent = interior; material.opacity = interior ? .12 : 1; material.depthWrite = !interior; material.color.set(interior ? '#bbd0d5' : '#8b989e'); material.emissive.set(interior ? '#647b7f' : '#000000'); material.emissiveIntensity = interior ? .22 : 0; }
        material.needsUpdate = true;
      }
    });
  }, [macro, environment, interior, props.state.overlays.cutaway, clipping]);
  useEffect(() => {
    if (!environment) return;
    environment.traverse(node => {
      if (!(node instanceof Mesh)) return;
      const name = node.name.toLowerCase(); node.visible = !(interior && name.startsWith('river_0'));
      node.raycast = function (this: Mesh, raycaster, intersections) { if (this.visible) Mesh.prototype.raycast.call(this, raycaster, intersections); };
      node.castShadow = name.includes('bridge') || name.includes('rails') || name.includes('rocks');
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material instanceof MeshStandardMaterial && name.includes('glass')) { material.transparent = true; material.opacity = .1; material.depthWrite = false; material.color.set('#b7cdd2'); material.roughness = .25; }
    });
  }, [environment, interior]);
  function pick(event: ThreeEvent<MouseEvent>, focus: boolean) {
    event.stopPropagation(); if (event.delta > 4) return;
    let node: Object3D | null = event.object, id = 'interior';
    while (node) {
      const name = node.name.toLowerCase();
      if (name.includes('pavilion') || name.includes('tower')) { id = 'city'; break; }
      if (name.includes('shell') || name.includes('glass') || name.includes('window_frame')) { id = 'shell'; break; }
      if (name.includes('endcap')) { id = 'endcap'; break; }
      if (name.includes('docking')) { id = 'docking'; break; }
      if (name.includes('life_support')) { id = 'life_support'; break; }
      if (name.includes('mirror')) { id = 'mirrors'; break; }
      if (name.includes('radiator')) { id = 'thermal'; break; }
      if (name.includes('water') || name.includes('river')) { id = 'water'; break; }
      if (name.includes('forest') || name.includes('tree')) { id = 'forest'; break; }
      if (name.includes('agriculture') || name.includes('farm')) { id = 'agriculture'; break; }
      node = node.parent;
    }
    props.onSelect(id); if (focus) props.onFocus(id);
  }
  return <group dispose={null}>
    {macro && <primitive object={macro} onClick={(event: ThreeEvent<MouseEvent>) => pick(event, false)} onDoubleClick={(event: ThreeEvent<MouseEvent>) => pick(event, true)} />}
    {visibleInterior && <>
      {environment && <primitive object={environment} onClick={(event: ThreeEvent<MouseEvent>) => pick(event, false)} onDoubleClick={(event: ThreeEvent<MouseEvent>) => pick(event, true)} />}
      {interior && environment && <RiverReflection model={environment} props={props} />}
      {models.riverfront_pavilion_lod0 && <group name="riverfront_pavilion" position={HABITAT_POINTS.city}><primitive object={models.riverfront_pavilion_lod0} onClick={(event: ThreeEvent<MouseEvent>) => pick(event, false)} onDoubleClick={(event: ThreeEvent<MouseEvent>) => pick(event, true)} /></group>}
      {models.life_support_lod0 && <group name="life_support" position={HABITAT_POINTS.life_support} quaternion={supportRotation}>
        <mesh position={[0, -.0265, 0]} receiveShadow onClick={(event: ThreeEvent<MouseEvent>) => pick(event, false)}><boxGeometry args={[.45, .07, .59]} /><meshStandardMaterial color="#a9aaa0" roughness={.85} /></mesh>
        <primitive object={models.life_support_lod0} position={[0, .0096, 0]} scale={.10} onClick={(event: ThreeEvent<MouseEvent>) => pick(event, false)} onDoubleClick={(event: ThreeEvent<MouseEvent>) => pick(event, true)} />
      </group>}
      {humanScaleAssets.map((asset, index) => <primitive key={index} object={asset.object} position={asset.position} rotation={[0, asset.yaw, 0]} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); if (event.delta < 4) props.onSelect(asset.id); }} />)}
      <LandscapeInstances models={districts} matrices={matrices} kind="city" props={props} interior={interior} />
      <LandscapeInstances models={trees} matrices={treeMatrices} kind="forest" props={props} interior={interior} />
      <LandscapeInstances models={towers} matrices={towerPlacements} kind="city" props={props} interior={interior} lodDistance={6} />
    </>}
  </group>;
}

function BeltLight() {
  const target = useMemo(() => new Object3D(), []);
  return <><primitive object={target} position={[0, -38.5, -44]} /><directionalLight position={[-6, 6, -58]} target={target} intensity={2.5} color="#ffefd5" /></>;
}
function InteriorGravityMarker() {
  const marker = useRef<Group>(null);
  const camera = useThree(state => state.camera);
  const scratch = useMemo(() => ({ direction: new Vector3(), right: new Vector3(), position: new Vector3(), outward: new Vector3(), axis: new Vector3(0, 1, 0) }), []);
  useFrame(() => {
    const node = marker.current; if (!node?.parent) return;
    camera.getWorldDirection(scratch.direction);
    scratch.right.copy(scratch.direction).cross(camera.up).normalize();
    scratch.position.copy(camera.position).addScaledVector(scratch.direction, .6).addScaledVector(scratch.right, .18).addScaledVector(camera.up, .22);
    node.parent.updateWorldMatrix(true, false); node.parent.worldToLocal(scratch.position);
    node.position.copy(scratch.position);
    scratch.outward.set(scratch.position.x, scratch.position.y, 0).normalize();
    node.quaternion.setFromUnitVectors(scratch.axis, scratch.outward);
  });
  return <group ref={marker}>
    <mesh position={[0, .12, 0]}><cylinderGeometry args={[.003, .003, .24, 8]} /><meshBasicMaterial color="#83dce4" /></mesh>
    <mesh position={[0, .27, 0]}><coneGeometry args={[.018, .06, 12]} /><meshBasicMaterial color="#83dce4" /></mesh>
    <Html position={[0, -.04, 0]} center zIndexRange={[10, 0]}><span className="scene-label">重力朝向舱壁 · 方向箭头为教学示意</span></Html>
  </group>;
}
function HabitatContents(props: SceneProps) {
  const { camera, gl, scene } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const habitat = useRef<Group>(null);
  const angle = useRef(props.state.time * HABITAT_RATE);
  const lastStep = useRef(props.state.stepToken);
  const lastReset = useRef(props.state.resetToken);
  const transition = useRef(true);
  const flight = useRef<{ elapsed: number; positions: Vector3[]; targets: Vector3[]; up: Vector3 } | null>(null);
  const timer = useRef({ total: 0, frames: [] as number[] });
  const frame = useMemo(() => habitatFrame(props.state.preset, props.state.focus.id), [props.state.preset, props.state.focus.id]);
  const clipping = useMemo(() => new Plane(new Vector3(0, -1, 0), 0), []);
  const axis = useMemo(() => new Vector3(0, 0, 1), []);
  const lightTarget = useMemo(() => new Object3D(), []);
  useEffect(() => {
    const room = new RoomEnvironment();
    const generator = new PMREMGenerator(gl);
    const environment = generator.fromScene(room, 0.04);
    Object.assign(scene, { environment: environment.texture });
    room.dispose(); generator.dispose();
    return () => { Object.assign(scene, { environment: null }); environment.dispose(); };
  }, [gl, scene]);
  useEffect(() => {
    Object.assign(scene, { environmentIntensity: frame.interior ? .32 : .45, fog: frame.interior ? new FogExp2('#c2d3d7', .007) : null });
    return () => { Object.assign(scene, { fog: null }); };
  }, [scene, frame.interior]);
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    Object.assign(camera, { fov: frame.interior ? 72 : 54, near: frame.interior ? .003 : .08, far: frame.interior ? 650 : 2200 }); camera.updateProjectionMatrix();
  }, [camera, frame.interior]);
  const gravity = useMemo(() => [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6].map(theta => ({ position: new Vector3(Math.cos(theta) * 28, Math.sin(theta) * 28, -12), quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(Math.cos(theta), Math.sin(theta), 0)) })), []);
  useEffect(() => { transition.current = true; flight.current = null; }, [frame, props.state.resetToken]);
  const { onSolarStatus } = props;
  useEffect(() => { onSolarStatus('ready'); }, [onSolarStatus]);
  useFrame((_, rawDelta) => {
    const orbit = controls.current; if (!orbit) return;
    const delta = Math.min(rawDelta, 0.1);
    let rotation = props.state.playing && !props.state.reducedMotion ? delta * HABITAT_RATE : 0;
    if (lastStep.current !== props.state.stepToken) { rotation += (props.state.stepToken - lastStep.current) * HABITAT_RATE * 2; lastStep.current = props.state.stepToken; }
    if (lastReset.current !== props.state.resetToken) { angle.current = 0; lastReset.current = props.state.resetToken; }
    angle.current += rotation;
    if (habitat.current) habitat.current.rotation.z = angle.current;
    if (props.state.referenceFrame === 'rotating' && !transition.current) {
      camera.position.applyAxisAngle(axis, rotation); orbit.target.applyAxisAngle(axis, rotation); camera.up.applyAxisAngle(axis, rotation);
    }
    const orientation = new Quaternion().setFromAxisAngle(axis, angle.current);
    if (transition.current) {
      const rotate = frame.interior;
      if (!flight.current) {
        const inverse = rotate ? orientation.clone().invert() : new Quaternion();
        const positions = [camera.position.clone().applyQuaternion(inverse)];
        const targets = [orbit.target.clone().applyQuaternion(inverse)];
        if (rotate && Math.abs(camera.position.z) > 120) {
          positions.push(new Vector3(0, 0, 156), new Vector3(0, 0, 105));
          targets.push(new Vector3(0, 0, 110), new Vector3(0, -15, 40));
        }
        positions.push(frame.position); targets.push(frame.target);
        flight.current = { elapsed: 0, positions, targets, up: camera.up.clone().applyQuaternion(inverse) };
      }
      const path = flight.current;
      path.elapsed += delta;
      const progress = props.state.reducedMotion ? 1 : Math.min(1, path.elapsed / 3.6);
      const scaled = progress * (path.positions.length - 1);
      const segment = Math.min(path.positions.length - 2, Math.floor(scaled));
      const fraction = Math.min(1, scaled - segment);
      const smooth = fraction * fraction * (3 - 2 * fraction);
      const position = path.positions[segment].clone().lerp(path.positions[segment + 1], smooth);
      const target = path.targets[segment].clone().lerp(path.targets[segment + 1], smooth);
      const up = path.up.clone().lerp(frame.up, progress).normalize();
      if (rotate) { position.applyQuaternion(orientation); target.applyQuaternion(orientation); up.applyQuaternion(orientation); }
      camera.position.copy(position); orbit.target.copy(target); camera.up.copy(up);
      if (progress === 1) { transition.current = false; flight.current = null; }
    }
    orbit.minDistance = frame.interior ? .02 : 8; orbit.maxDistance = frame.interior && !transition.current ? 95 : 620;
    orbit.update();
    if (frame.interior && !transition.current) {
      const localPosition = camera.position.clone().applyQuaternion(orientation.clone().invert());
      const radius = Math.hypot(localPosition.x, localPosition.y);
      const limit = Math.min(39.46, terrainRadiusAt(localPosition) - .01);
      if (radius > limit) { localPosition.x *= limit / radius; localPosition.y *= limit / radius; }
      localPosition.z = Math.max(-115, Math.min(115, localPosition.z));
      camera.position.copy(localPosition.applyQuaternion(orientation));
      const localTarget = orbit.target.clone().applyQuaternion(orientation.clone().invert());
      const targetRadius = Math.hypot(localTarget.x, localTarget.y), targetLimit = Math.min(39.47, terrainRadiusAt(localTarget));
      if (targetRadius > targetLimit) { localTarget.x *= targetLimit / targetRadius; localTarget.y *= targetLimit / targetRadius; }
      localTarget.z = Math.max(-112, Math.min(112, localTarget.z));
      orbit.target.copy(localTarget.applyQuaternion(orientation));
      camera.lookAt(orbit.target);
    }
    clipping.normal.set(-camera.position.x, -camera.position.y, 0).normalize();
    timer.current.total += rawDelta; timer.current.frames.push(rawDelta * 1000);
    if (timer.current.total >= 2) {
      const frames = timer.current.frames.slice().sort((a, b) => a - b);
      const context = gl.getContext(); const info = context.getExtension('WEBGL_debug_renderer_info');
      props.onMetrics({ fps: frames.length / timer.current.total, frameP95: frames[Math.min(frames.length - 1, Math.floor(frames.length * 0.95))], calls: gl.info.render.calls, triangles: gl.info.render.triangles, textures: gl.info.memory.textures, renderer: info ? String(context.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'WebGL GPU（浏览器未公开型号）' });
      timer.current = { total: 0, frames: [] };
    }
  }, -1);
  return <>
    <color attach="background" args={[frame.interior ? '#c2d3d7' : '#03080c']} />
    <ambientLight intensity={frame.interior ? .035 : .025} color="#d7e6eb" />
    <hemisphereLight intensity={frame.interior ? .22 : .09} color="#cbdce0" groundColor="#33423a" />
    <directionalLight position={[130, 85, 160]} intensity={frame.interior ? 0 : 3.8} color="#fff2dc" castShadow={!frame.interior} shadow-mapSize={[2048, 2048]} shadow-camera-left={-150} shadow-camera-right={150} shadow-camera-top={150} shadow-camera-bottom={-150} shadow-camera-near={10} shadow-camera-far={650} shadow-bias={-0.00015} shadow-normalBias={0.035} />
    <directionalLight position={[-70, -35, -100]} intensity={0.3} color="#bddbe7" />
    {!frame.interior && <Stars radius={650} depth={150} count={props.state.quality === 'low' ? 800 : 2400} factor={2.3} fade speed={0} />}
    <group ref={habitat}>
      {frame.interior && <>
        <primitive object={lightTarget} position={props.state.focus.id === 'life_support' ? HABITAT_POINTS.life_support : HABITAT_POINTS.city} />
        <directionalLight position={[-5, -30, -46]} target={lightTarget} intensity={3.0} color="#ffedcb" castShadow shadow-mapSize={[4096, 4096]} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-camera-near={.01} shadow-camera-far={24} shadow-bias={-.00002} shadow-normalBias={.003} />
        {[1, 2].map(belt => <group key={belt} rotation={[0, 0, belt * Math.PI * 2 / 3]}>
          <BeltLight />
        </group>)}
        <directionalLight position={[-18, -15, -34]} intensity={.28} color="#b7d6e8" />
      </>}
      <HabitatAssets props={props} interior={frame.interior} clipping={clipping} />
      {props.state.overlays.gravity && frame.interior && <InteriorGravityMarker />}
      {props.state.overlays.gravity && !frame.interior && gravity.map((arrow, index) => <group key={index} position={arrow.position} quaternion={arrow.quaternion}>
        <mesh position={[0, 4, 0]}><cylinderGeometry args={[0.14, 0.14, 8, 8]} /><meshBasicMaterial color="#83cbd0" /></mesh>
        <mesh position={[0, 9, 0]}><coneGeometry args={[0.7, 2, 12]} /><meshBasicMaterial color="#83cbd0" /></mesh>
        {index === 0 && <Html position={[0, 10.5, 0]} center zIndexRange={[10, 0]}><span className="scene-label">等效重力指向舱壁</span></Html>}
      </group>)}
      {props.state.overlays.light && [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6].map(theta => <Line key={theta} points={[[Math.cos(theta) * 65, Math.sin(theta) * 65, 95], [Math.cos(theta) * 15, Math.sin(theta) * 15, 12], [Math.cos(theta) * 39, Math.sin(theta) * 39, -55]]} color="#e7d6a2" transparent opacity={0.6} dashed dashSize={2} gapSize={2} />)}
      {props.state.overlays.heat && [-1, 1].map(side => <Line key={side} points={[[side * 42, 0, -55], [side * 60, 6, -30], [side * 95, 12, -15]]} color="#d8a080" transparent opacity={0.7} dashed dashSize={2} gapSize={1.5} />)}
      {props.state.overlays.labels && Object.entries(HABITAT_POINTS).filter(([id]) => frame.interior ? ['city', 'forest', 'water', 'agriculture', 'life_support'].includes(id) : ['endcap', 'mirrors', 'thermal', 'docking'].includes(id)).map(([id, point]) => <Html key={id} position={point} zIndexRange={[12, 0]}><button className="scene-label" onClick={() => props.onFocus(id)}>{{ endcap: '端盖与轴承', mirrors: '采光镜', thermal: '散热翼', docking: '轴向对接港', city: '内壁城市', forest: '生态林带', water: '水循环', agriculture: '农业区', life_support: '生命保障' }[id]}</button></Html>)}
      {props.state.selection && props.state.overlays.labels && HABITAT_POINTS[props.state.selection] && <mesh position={HABITAT_POINTS[props.state.selection]}><sphereGeometry args={[0.4, 12, 8]} /><meshBasicMaterial color="#e9bc81" transparent opacity={0.3} depthWrite={false} wireframe /></mesh>}
    </group>
    <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.07} rotateSpeed={frame.interior ? 0.35 : 0.65} zoomSpeed={0.7} panSpeed={0.55} onStart={() => { transition.current = false; }} />
  </>;
}

export default function HabitatScene(props: SceneProps) {
  return <Canvas shadows camera={{ position: [194, 104, 287], fov: 54, near: 0.08, far: 2200 }} dpr={props.state.quality === 'low' ? 1 : [1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance', localClippingEnabled: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }} fallback={<div className="webgl-error" role="alert">浏览器无法启动 3D。请启用硬件加速后刷新。</div>}><HabitatContents {...props} /></Canvas>;
}
