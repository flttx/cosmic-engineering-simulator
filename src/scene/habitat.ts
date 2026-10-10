import { Matrix4, Quaternion, Vector3 } from 'three';
import { seededRandom } from './orbits';

// Conceptual engineering scale: one render unit = 100 m, radius = 4 km.
export const HABITAT_RADIUS = 40;
export const HABITAT_LENGTH = 240;
export const HABITAT_RATE = 0.04952;
export const HABITAT_POINTS: Record<string, [number, number, number]> = {
  habitat: [0, 0, 0], shell: [36, 0, 0], interior: [-1.28, -39.38, -40], endcap: [0, 12, 120],
  mirrors: [64, 16, 52], thermal: [-55, 12, -20], life_support: surfacePoint(-2.6, -34),
  city: [-1.28, -39.38, -40], forest: surfacePoint(-4.3, -49), water: [0.06, -39.47, -40], agriculture: surfacePoint(3.4, 35), docking: [0, 0, 140],
};
export function riverCenter(z: number) { return .06 + .40 * Math.sin((z + 40) * .055) + .20 * Math.sin((z + 40) * .19) + .85 * Math.sin((z + 40) * .20) * Math.exp(-(((z + 40) / 22) ** 2)); }
export function riverWidth(z: number) { return .62 + .28 * (1 - Math.cos((z + 40) * .115)); }
// Identical to the editable environment's terrain_height(s,z), for grounded instances and camera limits.
export function terrainHeight(s: number, z: number) {
  const distance = Math.abs(s - riverCenter(z)), half = riverWidth(z) / 2;
  if (distance < half + .09) return -.22 + .25 * Math.min(1, Math.max(0, (distance - half + .02) / .11));
  if (Math.abs(s - promenadeCenter(z)) < .105) return .03;
  const hill = Math.max(0, Math.abs(s) - 2.2) / 16.8;
  const height = .05 + .025 * Math.sin(z * .11 + s * 1.7) + hill * (1.6 + .8 * Math.sin(z * .058 + s * .33)) + hill * .24 * Math.sin(s * 1.9 + z * .16) * Math.sin(z * .095);
  const plaza = Math.exp(-(((s + 1.28) / .84) ** 8) - ((z + 40) / 1) ** 8);
  const targetHeight = 39.48 - 39.41 / Math.cos(s / HABITAT_RADIUS);
  return height * (1 - plaza) + targetHeight * plaza;
}
export function surfaceMatrix(s: number, z: number, belt: number, scale: number, yaw = 0) {
  const theta = -Math.PI / 2 + belt * Math.PI * 2 / 3 + s / HABITAT_RADIUS;
  const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), theta + Math.PI / 2);
  rotation.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw));
  return new Matrix4().compose(new Vector3(...surfacePoint(s, z, belt)), rotation, new Vector3(scale, scale, scale));
}
function surfacePoint(s: number, z: number, belt = 0): [number, number, number] {
  const theta = -Math.PI / 2 + belt * Math.PI * 2 / 3 + s / HABITAT_RADIUS;
  const radius = 39.48 - terrainHeight(s, z);
  return [Math.cos(theta) * radius, Math.sin(theta) * radius, z];
}
export function terrainRadiusAt(point: Vector3) {
  const theta = Math.atan2(point.y, point.x);
  let offset = (theta + Math.PI / 2) % (Math.PI * 2 / 3);
  if (offset > Math.PI / 3) offset -= Math.PI * 2 / 3;
  if (offset < -Math.PI / 3) offset += Math.PI * 2 / 3;
  const s = offset * HABITAT_RADIUS;
  return Math.abs(s) < 19 ? 39.48 - terrainHeight(s, point.z) : 39.5;
}
export function habitatFrame(preset: 'overview' | 'flyby' | 'inspection', focusId: string) {
  const interior = (preset === 'inspection' && focusId === 'habitat') || ['interior', 'city', 'forest', 'water', 'agriculture', 'life_support'].includes(focusId);
  if (interior) {
    if (['habitat', 'interior', 'city'].includes(focusId)) {
      const z = -39.15, theta = -Math.PI / 2 + promenadeCenter(z) / HABITAT_RADIUS;
      return { interior, position: new Vector3(Math.cos(theta) * 39.405, Math.sin(theta) * 39.405, z), target: new Vector3(5, -34.2, -49), up: new Vector3(-Math.cos(theta), -Math.sin(theta), 0) };
    }
    const anchor = new Vector3(...(HABITAT_POINTS[focusId] ?? HABITAT_POINTS.city));
    const up = new Vector3(-anchor.x, -anchor.y, 0).normalize();
    return { interior, position: anchor.clone().addScaledVector(up, .15).add(new Vector3(-up.y * .6, up.x * .6, 1.1)), target: anchor.clone().addScaledVector(up, .09), up };
  }
  if (preset === 'flyby' || focusId === 'docking' || focusId === 'endcap') return { interior, position: new Vector3(22, 17, 169), target: new Vector3(0, 0, 111), up: new Vector3(0, 1, 0) };
  const point = new Vector3(...(HABITAT_POINTS[focusId] ?? HABITAT_POINTS.habitat));
  return { interior, position: focusId === 'habitat' ? new Vector3(194, 104, 287) : point.clone().add(new Vector3(56, 28, 68)), target: point, up: new Vector3(0, 1, 0) };
}
export function promenadeCenter(z: number) { return riverCenter(z) - riverWidth(z) / 2 - .27; }
export function habitatReserved(s: number, z: number, margin = 0) {
  return Math.abs(s - riverCenter(z)) < riverWidth(z) / 2 + .13 + margin || Math.abs(s - promenadeCenter(z)) < .08 + margin || (s > -2.2 - margin && s < -.35 + margin && z > -41.2 - margin && z < -38.9 + margin) || (Math.abs(s + 2.6) < .75 + margin && Math.abs(z + 34) < 1.2 + margin) || Math.abs(z + 43) < .10 + margin;
}
interface DistrictSite { s: number; z: number; belt: number; scale: number; yaw: number }
function districtSites() {
  const random = seededRandom(1542), sites: DistrictSite[] = [];
  // Roads follow the river; compact neighborhoods are separated by planted cross-corridors.
  for (let belt = 0; belt < 3; belt++) for (let centre = -106; centre < 110; centre += 17) for (const side of [-1, 1]) for (let row = -6; row <= 6; row++) for (const lane of [1.15, 2.05, 3.1, 4.05, 5.05, 6.25]) {
    const z = centre + row * 1.05 + (random() - .5) * .16;
    const s = riverCenter(z) + side * lane + (random() - .5) * .08;
    const scale = .055 + random() * .030;
    const roadAngle = Math.atan2(riverCenter(z + .05) - riverCenter(z - .05), .10);
    if (random() > (lane < 4.5 ? .95 : .70) || habitatReserved(s, z, .40)) continue;
    sites.push({ s, z, belt, scale, yaw: side * Math.PI / 2 + roadAngle });
  }
  return sites;
}
export function districtMatrices(low: boolean) { return districtSites().filter((_, index) => !low || index % 3 !== 0).map(site => surfaceMatrix(site.s, site.z, site.belt, site.scale, site.yaw)); }
function towerSites() {
  const sites: DistrictSite[] = [];
  for (let belt = 0; belt < 3; belt++) for (let centre = -106; centre < 110; centre += 17) for (const side of [-1, 1]) for (const offset of [-3.1, 3.8]) {
    const z = centre + offset, s = riverCenter(z) + side * (offset < 0 ? 2.62 : 4.58);
    if (!habitatReserved(s, z, .25)) sites.push({ s, z, belt, scale: offset < 0 ? .82 : 1.12, yaw: side * Math.PI / 2 });
  }
  return sites;
}
export function towerMatrices() { return towerSites().map(site => surfaceMatrix(site.s, site.z, site.belt, site.scale, site.yaw)); }
export function forestMatrices(low: boolean) {
  const random = seededRandom(1515), matrices: Matrix4[] = [];
  const footprints = new Map<string, { s: number; z: number; radius: number }[]>();
  const key = (belt: number, s: number, z: number) => `${belt}:${Math.floor(s)}:${Math.floor(z)}`;
  for (const site of [...districtSites(), ...towerSites()]) {
    const cell = key(site.belt, site.s, site.z), values = footprints.get(cell) ?? [];
    values.push({ s: site.s, z: site.z, radius: site.scale < .2 ? site.scale * 6 : .22 }); footprints.set(cell, values);
  }
  const plant = (s: number, z: number, belt: number, scale: number) => {
    if (Math.abs(s) > 18.9 || habitatReserved(s, z, .11)) return;
    for (let x = -1; x <= 1; x++) for (let depth = -1; depth <= 1; depth++) if (footprints.get(key(belt, s + x, z + depth))?.some(site => Math.hypot(s - site.s, z - site.z) < site.radius + scale * .8)) return;
    matrices.push(surfaceMatrix(s, z, belt, scale, random() * Math.PI * 2));
  };
  for (let belt = 0; belt < 3; belt++) for (let z = -115; z < 116; z += low ? .8 : .34) for (let s = -18.5; s < 19; s += low ? .8 : .32) {
    const x = s + (random() - .5) * .25, depth = z + (random() - .5) * .27;
    const riverDistance = Math.abs(x - riverCenter(depth));
    const crossCorridor = Math.abs(((depth + 106 + 8.5) % 17 + 17) % 17 - 8.5) > 6.6;
    const wooded = riverDistance > 6.7 || crossCorridor;
    if (random() < (wooded ? .92 : .45)) plant(x, depth, belt, .065 + random() * .065);
  }
  // Continuous riparian canopy is deliberately denser than the upland forest, rather than uniformly scattered trees.
  for (let belt = 0; belt < 3; belt++) for (let z = -112; z < 113; z += low ? .6 : .19) for (const side of [-1, 1]) {
    const width = riverWidth(z) / 2;
    plant(riverCenter(z) + side * (width + .29 + random() * .09), z + (random() - .5) * .07, belt, .08 + random() * .035);
  }
  return matrices;
}
