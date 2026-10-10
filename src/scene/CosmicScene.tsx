import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Html, Line, OrbitControls, Stars } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Box3, Color, DirectionalLight, Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, Quaternion, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import type { Line2 } from 'three/examples/jsm/lines/Line2.js';
import type { SceneProps } from '../types';
import { COLLECTOR_VARIANTS, FAMILIES, PARTS, collectorInstances, collectorSilhouette, familyFor, heroDisplayScale, objectLocalPoint, objectPosition, objectQuaternion, orbitPoint, seededRandom } from './orbits';
import type { CollectorVariant, OrbitFamily } from './orbits';
import StellarBody, { SOLAR_RADIUS } from './StellarBody';

RectAreaLightUniformsLib.init();

const PART_OFFSETS: Record<string, [number, number, number]> = {
  collector_surface: [0, 0, 0], support_truss: [0, -0.65, 0], radiator: [0, 0, 3.1], attitude_module: [5.2, 0, 0],
};
interface AssetGeometry { radius: number; parts: Map<string, { center: Vector3; radius: number; box: Box3 }> }
function scaleProofFrame(geometry: AssetGeometry) {
  const wing = geometry.parts.get('collector_surface')?.box;
  const edge = wing?.max.z ?? 4;
  const surfaceHeight = wing?.max.y ?? 0.35;
  const eyeHeight = Math.min(surfaceHeight - 0.6, -0.35);
  return {
    boat: new Vector3(2.4, eyeHeight + 0.2, edge + 0.6),
    eye: new Vector3(3, eyeHeight + 0.12, edge + 1.7),
    target: new Vector3(0.1, Math.max(0.6, surfaceHeight), -1.2),
  };
}
function DistantCollectorMaterials({ orbitColor }: { orbitColor?: string }) {
  return <>{[0, 1, 2].map(index => {
    const wing = index === 1;
    return <meshStandardMaterial key={index} attach={`material-${index}`} color={wing ? orbitColor ?? '#1b2835' : index === 2 ? '#30383b' : '#737c7c'} metalness={wing || index === 2 ? 0.03 : 0.65} roughness={wing || index === 2 ? 0.65 : 0.52} />;
  })}</>;
}
function disposeObject(root: Object3D) {
  root.traverse(node => {
    if (!(node instanceof Mesh)) return;
    node.geometry.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (material instanceof MeshStandardMaterial) {
        material.map?.dispose(); material.normalMap?.dispose(); material.roughnessMap?.dispose(); material.metalnessMap?.dispose(); material.emissiveMap?.dispose();
      }
      material.dispose();
    }
  });
}

class AssetBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Family({ family, count, clock, props }: { family: OrbitFamily; count: number; clock: React.RefObject<number>; props: SceneProps }) {
  const meshes = useRef<Record<CollectorVariant, InstancedMesh | null>>({ twin: null, long: null, quad: null });
  const dummy = useMemo(() => new Object3D(), []);
  const silhouettes = useMemo(() => COLLECTOR_VARIANTS.map(variant => collectorSilhouette(variant)), []);
  const buckets = useMemo(() => collectorInstances(family, count), [family, count]);
  const camera = useThree(state => state.camera);
  const points = useMemo(() => Array.from({ length: 193 }, (_, index) => orbitPoint(family.radius, index / 192 * Math.PI * 2, family.inclination)), [family]);
  useFrame(() => {
    const hero = objectPosition('collector_hero', clock.current);
    const nearbyHero = camera.position.distanceTo(hero) < 40;
    for (const variant of COLLECTOR_VARIANTS) {
      const mesh = meshes.current[variant];
      if (!mesh) continue;
      buckets[variant].forEach((id, index) => {
        objectPosition(id, clock.current, dummy.position);
        objectQuaternion(id, clock.current, dummy.quaternion);
        const hidden = nearbyHero && dummy.position.distanceTo(hero) < 12 && props.state.selection !== id;
        dummy.scale.setScalar(hidden ? 0 : id.endsWith('_001') ? 0.26 : 0.11);
        dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  });
  useEffect(() => () => silhouettes.forEach(geometry => geometry.dispose()), [silhouettes]);
  function pick(event: ThreeEvent<MouseEvent>, variant: CollectorVariant, focus: boolean) {
    event.stopPropagation();
    if (event.instanceId === undefined || event.delta > 4) return;
    const id = buckets[variant][event.instanceId];
    if (!id) return;
    props.onSelect(id); if (focus) props.onFocus(id);
  }
  const isolated = props.state.structure === 'isolated' && props.state.focus.level === 'group' && props.state.focus.id !== family.id;
  return <group visible={!isolated}>
    {COLLECTOR_VARIANTS.map((variant, index) => <instancedMesh key={`${variant}:${count}`} ref={mesh => { meshes.current[variant] = mesh; }} args={[undefined, undefined, buckets[variant].length]} onClick={event => pick(event, variant, false)} onDoubleClick={event => pick(event, variant, true)} frustumCulled={false}>
      <primitive object={silhouettes[index]} attach="geometry" /><DistantCollectorMaterials orbitColor={props.state.overlays.orbits ? family.color : undefined} />
    </instancedMesh>)}
    {props.state.overlays.orbits && <Line points={points} color={family.color} transparent opacity={0.34} lineWidth={1} onClick={event => { event.stopPropagation(); props.onSelect(family.id); }} onDoubleClick={event => { event.stopPropagation(); props.onFocus(family.id); }} />}
    {props.state.overlays.labels && (props.state.focus.level === 'system' || props.state.focus.level === 'group') && <Html position={orbitPoint(family.radius, family.phase + 1.2, family.inclination)} zIndexRange={[12, 0]}><button className="scene-label" onClick={() => props.onFocus(family.id)}>{family.name}</button></Html>}
  </group>;
}

function FlowPulses({ clock, endpoints, color }: { clock: RefObject<number>; endpoints: [Vector3, Vector3][]; color: string }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  useFrame(() => {
    if (!mesh.current) return;
    endpoints.forEach(([start, end], index) => {
      const progress = (clock.current * 0.16 + index / endpoints.length) % 1;
      dummy.position.copy(start).lerp(end, progress); dummy.scale.setScalar(0.1 + Math.sin(progress * Math.PI) * 0.08);
      dummy.updateMatrix(); mesh.current?.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, endpoints.length]} frustumCulled={false}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={color} toneMapped={false} /></instancedMesh>;
}

function HeroEnergyInput({ clock }: { clock: RefObject<number> }) {
  const ray = useRef<Line2>(null);
  const pulse = useRef<Mesh>(null);
  const camera = useThree(state => state.camera);
  useFrame(() => {
    const center = objectPosition('collector_hero', clock.current);
    const end = objectLocalPoint('collector_hero', new Vector3(0, 0.35, -2.4), clock.current, heroDisplayScale(camera.position.distanceTo(center)));
    const start = end.clone().normalize().multiplyScalar(SOLAR_RADIUS * 1.035);
    ray.current?.geometry.setPositions([start.x, start.y, start.z, end.x, end.y, end.z]);
    pulse.current?.position.copy(start).lerp(end, (clock.current * 0.16) % 1);
  });
  return <group>
    <Line ref={ray} points={[[0, 0, 0], [0, 0, 1]]} color="#f5c981" transparent opacity={0.65} lineWidth={1.5} />
    <mesh ref={pulse}><sphereGeometry args={[0.18, 10, 8]} /><meshBasicMaterial color="#ffe6a8" toneMapped={false} /></mesh>
  </group>;
}

function GreyCollector({ state, onSelect, onFocus }: Pick<SceneProps, 'state' | 'onSelect' | 'onFocus'>) {
  const selected = state.selection;
  const offsets = state.structure === 'exploded' ? 1.65 : 1;
  return <group>
    {PARTS.map(id => <group key={id} position={PART_OFFSETS[id].map(value => value * offsets) as [number, number, number]} visible={state.structure !== 'isolated' || !PARTS.includes(selected ?? '') || selected === id} onClick={event => { event.stopPropagation(); if (event.delta < 4) onSelect(id); }} onDoubleClick={event => { event.stopPropagation(); onFocus(id); }}>
      <mesh>
        <boxGeometry args={id === 'collector_surface' ? [10, 0.16, 4.8] : id === 'support_truss' ? [9, 0.22, 0.35] : id === 'radiator' ? [6, 0.1, 1.1] : [0.6, 0.8, 0.8]} />
        <meshStandardMaterial color={selected === id ? '#b9d9e1' : id === 'collector_surface' ? '#233e53' : '#858e94'} metalness={0.65} roughness={0.4} emissive={selected === id ? '#214252' : '#000000'} />
      </mesh>
    </group>)}
    <Html position={[0, 1.5, 0]} center zIndexRange={[10, 0]}><span className="scene-label">灰盒备用 · 正式资产未就绪</span></Html>
  </group>;
}

function CollectorAsset({ props, lod, geometry }: { props: SceneProps; lod: number; geometry: RefObject<AssetGeometry> }) {
  const [model, setModel] = useState<Group | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const { onAssetStatus } = props;
  useEffect(() => {
    let disposed = false;
    onAssetStatus('loading');
    const loader = new GLTFLoader();
    loader.load(`/assets/C01/collector_lod${lod}.glb`, result => {
      if (disposed) { disposeObject(result.scene); return; }
      const missing = PARTS.some(id => !result.scene.getObjectByName(id));
      if (missing) { disposeObject(result.scene); setFailed(true); onAssetStatus('fallback'); return; }
      result.scene.updateMatrixWorld(true);
      result.scene.traverse(node => {
        if (!(node instanceof Mesh)) return;
        node.castShadow = true; node.receiveShadow = true;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        const clones = materials.map(material => material.clone());
        node.material = Array.isArray(node.material) ? clones : clones[0];
      });
      geometry.current.radius = new Box3().setFromObject(result.scene).getSize(new Vector3()).length() / 2;
      for (const id of PARTS) {
        const node = result.scene.getObjectByName(id);
        if (!node) continue;
        const box = new Box3().setFromObject(node);
        geometry.current.parts.set(id, { center: box.getCenter(new Vector3()), radius: Math.max(0.7, box.getSize(new Vector3()).length() / 2), box });
      }
      setModel(result.scene); setFailed(false); onAssetStatus('ready');
    }, undefined, () => { if (!disposed) { setFailed(true); onAssetStatus('fallback'); } });
    return () => { disposed = true; };
  }, [lod, onAssetStatus, geometry, retry]);
  useEffect(() => {
    if (!model) return;
    for (const id of PARTS) {
      const node = model.getObjectByName(id);
      if (!node) continue;
      if (!node.userData.originalPosition) node.userData.originalPosition = node.position.clone();
      const original = node.userData.originalPosition as Vector3;
      node.position.copy(original);
      if (props.state.structure === 'exploded') node.position.add(new Vector3(...PART_OFFSETS[id]).multiplyScalar(0.7));
      node.visible = props.state.structure !== 'isolated' || !PARTS.includes(props.state.selection ?? '') || props.state.selection === id;
      node.traverse(child => {
        if (!(child instanceof Mesh)) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) if (material instanceof MeshStandardMaterial) {
          if (!material.userData.baseEmissive) material.userData.baseEmissive = material.emissive.clone();
          material.emissive.copy(material.userData.baseEmissive as Color);
          if (props.state.selection === id) material.emissive.set('#22434e');
        }
      });
    }
  }, [model, props.state.structure, props.state.selection]);
  useEffect(() => () => { if (model) disposeObject(model); }, [model]);
  function select(event: ThreeEvent<MouseEvent>, focus: boolean) {
    event.stopPropagation(); if (event.delta > 4) return;
    let node: Object3D | null = event.object;
    while (node && !PARTS.includes(node.name)) node = node.parent;
    const id = node?.name ?? 'collector_hero'; props.onSelect(id); if (focus) props.onFocus(id);
  }
  return model && !failed ? <primitive object={model} onClick={(event: ThreeEvent<MouseEvent>) => select(event, false)} onDoubleClick={(event: ThreeEvent<MouseEvent>) => select(event, true)} /> : <><GreyCollector {...props} />{failed && <Html position={[0, 2.5, 0]} center><button className="scene-label" onClick={() => { setFailed(false); setRetry(value => value + 1); }}>重试加载正式模型</button></Html>}</>;
}

function MaintenanceCraft() {
  const [model, setModel] = useState<Group | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    new GLTFLoader().load('/assets/C01/maintenance_craft.glb', result => {
      if (disposed) { disposeObject(result.scene); return; }
      const size = new Box3().setFromObject(result.scene).getSize(new Vector3());
      const extent = Math.max(size.x, size.y, size.z);
      if (extent > 0) result.scene.scale.setScalar(0.15 / extent);
      result.scene.traverse(node => { if (node instanceof Mesh) { node.castShadow = true; node.receiveShadow = true; } });
      setModel(result.scene);
    }, undefined, () => { if (!disposed) setFailed(true); });
    return () => { disposed = true; };
  }, []);
  useEffect(() => () => { if (model) disposeObject(model); }, [model]);
  return model ? <primitive object={model} /> : <group><mesh><boxGeometry args={[0.095, 0.0425, 0.0475]} /><meshStandardMaterial color="#c5bdb0" metalness={0.55} roughness={0.38} /></mesh>{failed && <Html position={[0, 0.2, 0]}><span className="scene-label">维护艇灰盒备用</span></Html>}</group>;
}

function Hero({ props, clock, geometry }: { props: SceneProps; clock: React.RefObject<number>; geometry: RefObject<AssetGeometry> }) {
  const group = useRef<Group>(null);
  const boat = useRef<Group>(null);
  const [lod, setLod] = useState<number | null>(null);
  const camera = useThree(state => state.camera);
  const elapsed = useRef(0);
  const silhouette = useMemo(() => collectorSilhouette(), []);
  useEffect(() => () => silhouette.dispose(), [silhouette]);
  const heatRays = useMemo(() => [-2, 0, 2].map(x => [new Vector3(x, -0.72, 2.6), new Vector3(x, -4, 7)] as [Vector3, Vector3]), []);
  useFrame((_, delta) => {
    if (!group.current) return;
    objectPosition('collector_hero', clock.current, group.current.position);
    objectQuaternion('collector_hero', clock.current, group.current.quaternion);
    group.current.scale.setScalar(heroDisplayScale(camera.position.distanceTo(group.current.position)));
    if (boat.current) boat.current.position.copy(scaleProofFrame(geometry.current).boat);
    elapsed.current += delta;
    if (elapsed.current > 0.5) {
      elapsed.current = 0;
      const distance = camera.position.distanceTo(group.current.position);
      const next = distance < 38 ? 0 : distance < 65 ? 1 : null;
      if (next !== lod && (next === null || lod === null || Math.abs(distance - 38) > 3)) setLod(next);
    }
  });
  return <group ref={group}>
    {lod !== null ? <AssetBoundary fallback={<GreyCollector {...props} />} onError={() => props.onAssetStatus('fallback')}><Suspense fallback={<GreyCollector {...props} />}><CollectorAsset props={props} lod={lod} geometry={geometry} /></Suspense></AssetBoundary> : <mesh onClick={event => { event.stopPropagation(); if (event.delta < 4) props.onSelect('collector_hero'); }} onDoubleClick={event => { event.stopPropagation(); props.onFocus('collector_hero'); }}><primitive object={silhouette} attach="geometry" /><DistantCollectorMaterials /></mesh>}
    {lod !== null && <group>
      <rectAreaLight position={[-3, 5, -4]} rotation={[-Math.PI / 2, 0, 0]} width={7} height={5} color="#eef0e7" intensity={4} />
      <rectAreaLight position={[-1, -3, -3]} rotation={[Math.PI / 2, 0, 0]} width={6} height={4} color="#e3e9e9" intensity={4} />
    </group>}
    <group ref={boat} position={[2.4, -0.15, 4.6]}>
      <MaintenanceCraft />
      <pointLight color="#edf0e8" intensity={3.2} distance={9} decay={2} />
      {props.state.overlays.labels && lod !== null && <Html position={[0, 0.2, 0]} zIndexRange={[12, 0]}><span className="scene-label">维护艇 · 教学尺度参照</span></Html>}
    </group>
    {props.state.overlays.heat && <group>{[-2, 0, 2].map(x => <Line key={x} points={[[x, -0.72, 2.6], [x, -2, 5], [x, -4, 7]]} color="#f59a6b" transparent opacity={0.6} dashed dashSize={0.4} gapSize={0.3} />)}<FlowPulses clock={clock} endpoints={heatRays} color="#ffd2a0" /></group>}
  </group>;
}

function SceneContents(props: SceneProps) {
  const controls = useRef<OrbitControlsImpl>(null);
  const clock = useRef(props.state.time);
  const sunlight = useRef<DirectionalLight>(null);
  const inspectionFill = useRef<DirectionalLight>(null);
  const lightTarget = useMemo(() => new Object3D(), []);
  const geometry = useRef<AssetGeometry>({ radius: 7, parts: new Map() });
  const { camera, gl } = useThree();
  const transition = useRef(true);
  const previousTarget = useRef(new Vector3());
  const previousOrientation = useRef(new Quaternion());
  const activeFocus = useRef('');
  const previousStep = useRef(props.state.stepToken);
  const previousReset = useRef(props.state.resetToken);
  const previousLocal = useRef(false);
  const snapshots = useRef(new Map<string, { position: Vector3; target: Vector3; up: Vector3; local: boolean }>());
  const timing = useRef({ total: 0, frames: [] as number[] });
  const particles = useMemo(() => {
    const random = seededRandom(817);
    return Array.from({ length: 18 }, () => orbitPoint(38 + random() * 20, random() * Math.PI * 2, (random() - 0.5) * 0.8));
  }, []);
  const focusKey = `${props.state.focus.id}:${props.state.preset}`;
  const energyRays = useMemo(() => particles.map(point => [point.clone().normalize().multiplyScalar(10), point] as [Vector3, Vector3]), [particles]);
  useEffect(() => { transition.current = true; }, [focusKey, props.state.resetToken]);
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    if (props.state.playing && !props.state.reducedMotion) clock.current += delta;
    if (previousStep.current !== props.state.stepToken) { clock.current += (props.state.stepToken - previousStep.current) * 2; previousStep.current = props.state.stepToken; }
    const resetting = previousReset.current !== props.state.resetToken;
    if (resetting) { clock.current = 0; previousReset.current = props.state.resetToken; snapshots.current.clear(); }
    if (sunlight.current) objectPosition('collector_hero', clock.current, sunlight.current.target.position);
    const orbit = controls.current; if (!orbit) return;
    const target = objectPosition(props.state.focus.id, clock.current);
    const isLocal = props.state.focus.level === 'entity' || props.state.focus.level === 'component';
    const orientation = isLocal ? objectQuaternion(props.state.focus.id, clock.current) : new Quaternion();
    if (props.state.focus.level === 'component') {
      const anchor = (geometry.current.parts.get(props.state.focus.id)?.center ?? new Vector3(...(PART_OFFSETS[props.state.focus.id] ?? [0, 0, 0]))).clone();
      if (props.state.structure === 'exploded') anchor.add(new Vector3(...(PART_OFFSETS[props.state.focus.id] ?? [0, 0, 0])).multiplyScalar(0.7));
      objectLocalPoint(props.state.focus.id, anchor, clock.current, heroDisplayScale(camera.position.distanceTo(target)), target);
    }
    if (inspectionFill.current) { inspectionFill.current.position.copy(camera.position); inspectionFill.current.intensity = isLocal ? 1.25 : 0.04; }
    if (activeFocus.current !== focusKey) {
      if (activeFocus.current && !resetting) {
        const anchor = previousLocal.current ? previousTarget.current : new Vector3();
        const inverse = previousLocal.current ? previousOrientation.current.clone().invert() : new Quaternion();
        snapshots.current.set(activeFocus.current, { position: camera.position.clone().sub(anchor).applyQuaternion(inverse), target: orbit.target.clone().sub(anchor).applyQuaternion(inverse), up: camera.up.clone().applyQuaternion(inverse), local: previousLocal.current });
      }
      activeFocus.current = focusKey;
      previousLocal.current = isLocal;
      previousTarget.current.copy(target);
      previousOrientation.current.copy(orientation);
    }
    if (isLocal) {
      const rotation = orientation.clone().multiply(previousOrientation.current.clone().invert());
      camera.position.sub(previousTarget.current).applyQuaternion(rotation).add(target);
      orbit.target.sub(previousTarget.current).applyQuaternion(rotation).add(target);
      camera.up.applyQuaternion(rotation).normalize();
    }
    previousTarget.current.copy(target);
    previousOrientation.current.copy(orientation);
    if (transition.current) {
      const saved = snapshots.current.get(focusKey);
      const inspection = props.state.preset === 'inspection' && isLocal;
      const distance = props.state.focus.level === 'component' ? Math.max(4, (geometry.current.parts.get(props.state.focus.id)?.radius ?? 3) * 2.6) : isLocal ? geometry.current.radius * (inspection ? 2.6 : props.state.preset === 'flyby' ? 1.42 : 3.1) : props.state.focus.level === 'group' ? familyFor(props.state.focus.id).radius * 1.8 : 94;
      const direction = props.state.preset === 'flyby' && isLocal ? new Vector3(0.55, 0.21, 0.85) : isLocal ? new Vector3(0.6, 0.65, 0.85) : new Vector3(0.55, 0.32, 0.82);
      const offset = direction.normalize().multiplyScalar(distance);
      const proof = scaleProofFrame(geometry.current);
      const flyby = props.state.preset === 'flyby' && isLocal;
      const destination = saved ? saved.position.clone().applyQuaternion(saved.local ? orientation : new Quaternion()).add(saved.local ? target : new Vector3()) : target.clone().add((flyby ? proof.eye : offset).clone().applyQuaternion(orientation));
      const focal = saved ? saved.target.clone().applyQuaternion(saved.local ? orientation : new Quaternion()).add(saved.local ? target : new Vector3()) : flyby ? target.clone().add(proof.target.clone().applyQuaternion(orientation)) : target;
      const blend = props.state.reducedMotion ? 1 : 1 - Math.exp(-delta * 3.3);
      const desiredUp = (saved?.up.clone() ?? new Vector3(0, 1, 0)).applyQuaternion(saved && !saved.local ? new Quaternion() : orientation).normalize();
      camera.up.applyQuaternion(new Quaternion().setFromUnitVectors(camera.up.clone().normalize(), desiredUp).slerp(new Quaternion(), 1 - blend)).normalize();
      camera.position.lerp(destination, blend); orbit.target.lerp(focal, blend);
      if (camera.position.distanceTo(destination) < 0.025 && orbit.target.distanceTo(focal) < 0.025 && camera.up.distanceTo(desiredUp) < 0.002) transition.current = false;
    }
    orbit.minDistance = props.state.focus.level === 'component' ? 1.4 : isLocal ? 4 : SOLAR_RADIUS * 2.1;
    orbit.maxDistance = 240;
    orbit.update();
    timing.current.total += rawDelta; timing.current.frames.push(rawDelta * 1000);
    if (timing.current.total >= 2) {
      const values = timing.current.frames.slice().sort((a, b) => a - b);
      const context = gl.getContext(); const info = context.getExtension('WEBGL_debug_renderer_info');
      props.onMetrics({ fps: values.length / timing.current.total, frameP95: values[Math.min(values.length - 1, Math.floor(values.length * 0.95))], calls: gl.info.render.calls, triangles: gl.info.render.triangles, textures: gl.info.memory.textures, renderer: info ? String(context.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'WebGL GPU（浏览器未公开型号）' });
      timing.current = { total: 0, frames: [] };
    }
  }, -1);
  const selected = props.state.selection;
  return <>
    <color attach="background" args={['#03080e']} />
    <ambientLight intensity={0.08} color="#bac4cd" />
    <pointLight position={[0, 0, 0]} color="#fff4e5" intensity={2400} decay={2} />
    <directionalLight ref={sunlight} target={lightTarget} position={[0, 0, 0]} intensity={2.2} color="#fff4e6" castShadow shadow-mapSize-width={props.state.quality === 'low' ? 512 : 1024} shadow-mapSize-height={props.state.quality === 'low' ? 512 : 1024} shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={11} shadow-camera-bottom={-11} shadow-camera-near={1} shadow-camera-far={85} shadow-bias={-0.0002} shadow-normalBias={0.025} />
    <primitive object={lightTarget} />
    <directionalLight ref={inspectionFill} target={lightTarget} position={[30, 45, -20]} intensity={0.04} color="#e3e8e6" />
    <Stars radius={250} depth={90} count={props.state.quality === 'low' ? 900 : 2800} factor={2.7} saturation={0.05} fade speed={0} />
    <StellarBody state={props.state} onSelect={props.onSelect} onFocus={props.onFocus} onSolarStatus={props.onSolarStatus} />
    {FAMILIES.map(family => <Family key={family.id} family={family} count={props.state.quality === 'low' ? 150 : 450} clock={clock} props={props} />)}
    <Hero props={props} clock={clock} geometry={geometry} />
    {props.state.overlays.energy && <group>{particles.map((point, index) => <Line key={index} points={[point.clone().normalize().multiplyScalar(10), point]} color="#d7b77b" transparent opacity={0.24} lineWidth={1} dashed dashSize={0.8} gapSize={1.4} />)}<FlowPulses clock={clock} endpoints={energyRays} color="#ffe7b2" /><HeroEnergyInput clock={clock} /></group>}
    {props.state.overlays.light && <group><Line points={Array.from({ length: 129 }, (_, index) => orbitPoint(69, index / 128 * Math.PI * 2, 0))} color="#67b3c6" transparent opacity={0.4} /><Line points={[[9, 0, 0], [69, 0, 0]]} color="#67b3c6" dashed dashSize={1} gapSize={0.8} /><mesh position={[69, 0, 0]}><sphereGeometry args={[0.85, 24, 16]} /><meshStandardMaterial color="#3985a1" roughness={0.8} /></mesh></group>}
    {selected && <SelectionMarker id={selected} clock={clock} />}
    <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} rotateSpeed={0.65} zoomSpeed={0.85} panSpeed={0.75} onStart={() => { transition.current = false; }} />
  </>;
}

function SelectionMarker({ id, clock }: { id: string; clock: React.RefObject<number> }) {
  const group = useRef<Group>(null);
  const camera = useThree(state => state.camera);
  useFrame(() => {
    if (!group.current) return;
    objectPosition(id, clock.current, group.current.position);
    if (id.startsWith('collector_') || PARTS.includes(id)) objectQuaternion(id, clock.current, group.current.quaternion);
    group.current.scale.setScalar(id === 'collector_hero' || PARTS.includes(id) ? heroDisplayScale(camera.position.distanceTo(group.current.position)) : 1);
  });
  const size = id.startsWith('orbit_family') || id === 'sun' ? 10 : 6.5;
  return <group ref={group}><mesh rotation={[Math.PI / 2, 0, 0]}><ringGeometry args={[size, size + 0.025, 64]} /><meshBasicMaterial color="#86c9d8" transparent opacity={0.55} side={2} depthWrite={false} /></mesh></group>;
}

export default function CosmicScene(props: SceneProps) {
  return <Canvas shadows camera={{ position: [57, 51, 91], fov: 48, near: 0.05, far: 1200 }} dpr={props.state.quality === 'low' ? 1 : [1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance' }} fallback={<div className="webgl-error" role="alert">浏览器无法启动 3D。请启用硬件加速后刷新。</div>} onCreated={({ gl }) => { gl.setClearColor('#03080e'); }}><SceneContents {...props} /></Canvas>;
}
