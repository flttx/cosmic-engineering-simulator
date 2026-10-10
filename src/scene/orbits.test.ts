import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { findHotspot } from '../content';
import { COLLECTOR_VARIANTS, FAMILIES, PARTS, collectorInstances, collectorSilhouette, collectorVariant, familyFor, heroDisplayScale, objectLocalPoint, objectPosition, objectQuaternion, orbitPoint, seededRandom } from './orbits';

describe('稳定轨道坐标与局部跟随', () => {
  it('每个动态实例身份唯一且不依赖画质人口数', () => {
    const ids = FAMILIES.flatMap(family => Array.from({ length: 450 }, (_, index) => `collector_${family.id.replace('orbit_family_', '')}_${String(index + 1).padStart(3, '0')}`));
    expect(new Set(ids).size).toBe(1350);
    for (const family of FAMILIES) {
      expect(ids).toContain(family.representative);
      const point = objectPosition(family.representative, 40);
      expect(point.length()).toBeCloseTo(family.radius - 1.9);
      expect(point.distanceTo(objectPosition(family.representative, 42))).toBeGreaterThan(0);
    }
  });
  it('四部件和代表资产保持相同的局部轨道原点', () => {
    expect(familyFor('collector_hero').id).toBe('orbit_family_mid');
    for (const id of PARTS) {
      expect(objectPosition(id, 0).equals(objectPosition('collector_hero', 0))).toBe(true);
      expect(objectPosition(id, 750).equals(objectPosition('collector_hero', 750))).toBe(true);
      const towardStar = objectPosition(id, 750).negate().normalize();
      expect(new Vector3(0, 1, 0).applyQuaternion(objectQuaternion(id, 750)).dot(towardStar)).toBeCloseTo(1);
      const localAnchor = new Vector3(2.4, 0.35, -2.4);
      const worldAnchor = objectLocalPoint(id, localAnchor, 750, 0.7);
      const recovered = worldAnchor.sub(objectPosition(id, 750)).applyQuaternion(objectQuaternion(id, 750).invert()).divideScalar(0.7);
      expect(recovered.distanceTo(localAnchor)).toBeLessThan(1e-12);
    }
    for (const family of FAMILIES) expect(new Vector3(0, 1, 0).applyQuaternion(objectQuaternion(family.representative, 20)).dot(objectPosition(family.representative, 20).negate().normalize())).toBeCloseTo(1);
    expect(objectPosition('sun', 750).length()).toBe(0);
  });
  it('倾角不改变轨道半径，分布种子可复现', () => {
    expect(orbitPoint(43, 1.4, 0.62).length()).toBeCloseTo(43);
    const first = seededRandom(817); const second = seededRandom(817);
    expect(Array.from({ length: 20 }, first)).toEqual(Array.from({ length: 20 }, second));
    const mid = Array.from({ length: 149 }, (_, index) => objectPosition(`collector_mid_${String(index + 2).padStart(3, '0')}`, 0));
    const radii = mid.map(point => point.length());
    const inclinations = mid.map(point => Math.atan(point.y / point.z));
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(9);
    expect(Math.max(...inclinations) - Math.min(...inclinations)).toBeGreaterThan(0.2);
    expect(mid[88].equals(objectPosition('collector_mid_090', 0))).toBe(true);
    expect(heroDisplayScale(150)).toBe(0.11);
    expect(heroDisplayScale(20)).toBe(1);
    expect(Math.abs(heroDisplayScale(52.5) - heroDisplayScale(52.51))).toBeLessThan(0.001);
    expect(heroDisplayScale(52.5)).toBeGreaterThan(heroDisplayScale(60));
  });
});

describe('量产配置与拾取映射', () => {
  it('分配置后每个实例ID仅出现一次且跨画质保持相同bucket/index', () => {
    for (const family of FAMILIES) {
      const low = collectorInstances(family, 150);
      const standard = collectorInstances(family, 450);
      const ids = Object.values(standard).flat();
      expect(ids.length).toBe(450);
      expect(new Set(ids).size).toBe(450);
      for (const variant of COLLECTOR_VARIANTS) {
        expect(standard[variant].slice(0, low[variant].length)).toEqual(low[variant]);
        low[variant].forEach(id => expect(collectorVariant(id)).toBe(variant));
      }
      expect(collectorVariant(family.representative)).toBe('twin');
      expect(findHotspot(family.representative).role).toContain('双翼标准配置');
      expect(findHotspot(family.representative).explanation).toContain('当前显示远景简化模型');
    }
    expect(collectorVariant('collector_hero')).toBe('twin');
    expect(findHotspot('collector_mid_090').role).toContain('量产采能卫星');
    expect(findHotspot('collector_hero').role).toBe('分件观察');
  });
  it('三种构造均有中轴/采能/散热材料组，三角面预算小于250', () => {
    const shapes = COLLECTOR_VARIANTS.map(variant => {
      const geometry = collectorSilhouette(variant);
      geometry.computeBoundingBox();
      const size = geometry.boundingBox?.getSize(new Vector3());
      expect((geometry.index?.count ?? 0) / 3).toBeLessThan(250);
      expect(geometry.groups.map(group => group.materialIndex)).toEqual([0, 1, 2]);
      geometry.dispose();
      return size;
    });
    expect(shapes[1]?.z).toBeGreaterThan(shapes[0]?.z ?? 0);
    expect(shapes[1]?.z).toBeGreaterThan((shapes[0]?.z ?? 0) * 1.8);
    expect(shapes[2]?.x).toBeGreaterThan(shapes[0]?.x ?? 0);
  });
});
