import { BoxGeometry, CylinderGeometry, Quaternion, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface OrbitFamily { id: string; name: string; radius: number; inclination: number; phase: number; color: string; representative: string }
export const FAMILIES: OrbitFamily[] = [
  { id: 'orbit_family_north', name: '北倾轨道族', radius: 34, inclination: 0.62, phase: 0.5, color: '#81adb8', representative: 'collector_north_001' },
  { id: 'orbit_family_mid', name: '赤道轨道族', radius: 43, inclination: 0.08, phase: 2.4, color: '#b6a685', representative: 'collector_mid_001' },
  { id: 'orbit_family_south', name: '南倾轨道族', radius: 54, inclination: -0.52, phase: 4.4, color: '#738cae', representative: 'collector_south_001' },
];
export const PARTS = ['collector_surface', 'support_truss', 'radiator', 'attitude_module'];
export const COLLECTOR_VARIANTS = ['twin', 'long', 'quad'] as const;
export type CollectorVariant = typeof COLLECTOR_VARIANTS[number];
export const VARIANT_NAMES: Record<CollectorVariant, string> = { twin: '双翼标准配置', long: '长翼分段配置', quad: '四翼模块配置' };
export function collectorVariant(id: string): CollectorVariant {
  if (id === 'collector_hero' || PARTS.includes(id) || id.endsWith('_001')) return 'twin';
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return COLLECTOR_VARIANTS[hash % COLLECTOR_VARIANTS.length];
}
export function collectorInstances(family: OrbitFamily, count: number): Record<CollectorVariant, string[]> {
  const buckets: Record<CollectorVariant, string[]> = { twin: [], long: [], quad: [] };
  for (let index = 1; index <= count; index++) {
    const id = `collector_${family.id.replace('orbit_family_', '')}_${String(index).padStart(3, '0')}`;
    buckets[collectorVariant(id)].push(id);
  }
  return buckets;
}
export function collectorSilhouette(variant: CollectorVariant = 'twin'): BufferGeometry {
  const body: BufferGeometry[] = [new CylinderGeometry(0.55, 0.55, 8.3, 6).rotateZ(Math.PI / 2)];
  const wings: BufferGeometry[] = [];
  const radiators: BufferGeometry[] = [];
  for (const sign of [-1, 1]) {
    body.push(new BoxGeometry(1.1, 1.4, 1.4).translate(sign * 4.7, 0, 0));
    body.push(new BoxGeometry(7.4, 0.13, 0.13).translate(0, -0.25, sign * 0.65));
    if (variant === 'twin') {
      for (const x of [-2.2, 0, 2.2]) wings.push(new BoxGeometry(2.14, 0.11, 3).translate(x, 0.3, sign * 2.5));
      radiators.push(new BoxGeometry(5.7, 0.08, 2.3).translate(0, -0.65, sign * 2.5));
    } else if (variant === 'long') {
      for (const segment of [0, 1, 2]) wings.push(new BoxGeometry(1.85, 0.11, 2.6).translate(0, 0.3, sign * (2.3 + segment * 2.8)));
      body.push(new BoxGeometry(.13, .13, 17).translate(0, -.25, 0));
      radiators.push(new BoxGeometry(1.7, 0.08, 2.5).translate(0, -0.65, sign * 2.3));
    } else {
      for (const x of [-5, 5]) {
        body.push(new BoxGeometry(.12, .12, 9.7).translate(x, -.25, 0));
        wings.push(new BoxGeometry(2.6, 0.11, 2.7).translate(x, 0.3, sign * 3.5));
        radiators.push(new BoxGeometry(2.45, 0.08, 2.55).translate(x, -0.65, sign * 3.5));
      }
    }
  }
  const groups = [body, wings, radiators].map(pieces => {
    const group = mergeGeometries(pieces);
    pieces.forEach(piece => piece.dispose());
    if (!group) throw new Error('Invalid collector module geometry');
    return group;
  });
  const geometry = mergeGeometries(groups, true);
  groups.forEach(group => group.dispose());
  if (!geometry) throw new Error('Invalid collector geometry');
  return geometry;
}
export function heroDisplayScale(distance: number): number {
  const approach = Math.max(0, Math.min(1, (70 - distance) / 35));
  return 0.11 + 0.89 * approach * approach * (3 - 2 * approach);
}
export function orbitPoint(radius: number, angle: number, inclination: number, target = new Vector3()): Vector3 {
  return target.set(Math.cos(angle) * radius, Math.sin(angle) * radius * Math.sin(inclination), Math.sin(angle) * radius * Math.cos(inclination));
}
export function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => { value = (1664525 * value + 1013904223) >>> 0; return value / 4294967296; };
}
export function familyFor(id: string): OrbitFamily {
  if (id === 'collector_hero' || PARTS.includes(id)) return FAMILIES[1];
  return FAMILIES.find(family => family.id === id || id.includes(family.id.replace('orbit_family_', ''))) ?? FAMILIES[0];
}
export function objectPosition(id: string, time: number, target = new Vector3()): Vector3 {
  if (id === 'system' || id === 'star' || id === 'sun' || id === 'C01' || id.startsWith('orbit_family')) return target.set(0, 0, 0);
  const family = familyFor(id);
  const index = Number(id.match(/_(\d+)$/)?.[1] ?? 1) - 1;
  const hero = id === 'collector_hero' || PARTS.includes(id);
  const radialNoise = ((index * 2654435761) >>> 0) / 4294967296;
  const angularNoise = ((index * 2246822519) >>> 0) / 4294967296;
  const phase = hero ? 0.6 : index * 2.399963 + (index === 0 ? 0 : (angularNoise - 0.5) * 0.7);
  // ponytail: a reproducible display distribution, not an N-body or collision-safe orbital solution.
  const radius = hero ? family.radius : index === 0 ? family.radius - 1.9 : family.radius * (0.87 + radialNoise * 0.26);
  const inclination = family.inclination + (hero || index === 0 ? 0 : (angularNoise - 0.5) * 0.28);
  return orbitPoint(radius, family.phase + phase + time * 0.022 * Math.pow(34 / family.radius, 1.5), inclination, target);
}
export function objectQuaternion(id: string, time: number, target = new Quaternion()): Quaternion {
  const towardStar = objectPosition(id, time).negate().normalize();
  return towardStar.lengthSq() === 0 ? target.identity() : target.setFromUnitVectors(new Vector3(0, 1, 0), towardStar);
}
export function objectLocalPoint(id: string, local: Vector3, time: number, scale = 1, target = new Vector3()): Vector3 {
  return target.copy(local).multiplyScalar(scale).applyQuaternion(objectQuaternion(id, time)).add(objectPosition(id, time));
}
