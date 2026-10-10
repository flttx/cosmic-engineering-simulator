import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { districtMatrices, forestMatrices, habitatFrame, HABITAT_LENGTH, HABITAT_POINTS, HABITAT_RADIUS, promenadeCenter, terrainHeight, terrainRadiusAt, towerMatrices } from '../src/scene/habitat';

describe('habitat observation geometry', () => {
  it('keeps external parts outside even when shared UI uses an inspection preset', () => {
    for (const id of ['shell', 'mirrors', 'thermal', 'endcap', 'docking']) expect(habitatFrame('inspection', id).interior).toBe(false);
  });
  it('keeps interior presets inside the cylinder with up toward the axis', () => {
    for (const id of ['habitat', 'city', 'forest', 'water', 'agriculture', 'life_support']) {
      const frame = habitatFrame('inspection', id);
      expect(Math.hypot(frame.position.x, frame.position.y)).toBeLessThan(HABITAT_RADIUS);
      expect(Math.abs(frame.position.z)).toBeLessThan(HABITAT_LENGTH / 2);
      expect(frame.up.dot(new Vector3(frame.position.x, frame.position.y, 0))).toBeLessThan(0);
    }
  });
  it('orients settled buildings and trees toward the axis within the habitat', () => {
    for (const low of [true, false]) for (const matrix of [...districtMatrices(low), ...forestMatrices(low)].filter((_, index) => index % 97 === 0)) {
      const point = new Vector3().setFromMatrixPosition(matrix);
      const up = new Vector3(0, 1, 0).transformDirection(matrix);
      expect(up.dot(new Vector3(-point.x, -point.y, 0).normalize())).toBeCloseTo(1);
      expect(Math.abs(point.z)).toBeLessThan(HABITAT_LENGTH / 2);
      expect(Math.hypot(point.x, point.y)).toBeCloseTo(terrainRadiusAt(point), 8);
      const scale = new Vector3().setFromMatrixScale(matrix);
      expect(scale.x).toBeLessThan(.14);
    }
  });
  it('keeps the camera 2.5 m above the curved promenade and looks diagonally across the valley', () => {
    const frame = habitatFrame('inspection', 'habitat');
    expect(39.43 - Math.hypot(frame.position.x, frame.position.y)).toBeCloseTo(.025, 8);
    expect((Math.atan2(frame.position.y, frame.position.x) + Math.PI / 2) * HABITAT_RADIUS).toBeCloseTo(promenadeCenter(frame.position.z), 8);
    expect(frame.target.z).toBeLessThan(frame.position.z);
    const direction = frame.target.clone().sub(frame.position);
    expect(Math.atan2(direction.x, -direction.z)).toBeGreaterThan(.4);
    expect(direction.y).toBeGreaterThan(4);
    const right = frame.target.clone().sub(frame.position).cross(frame.up).normalize();
    expect(new Vector3(...HABITAT_POINTS.city).sub(frame.position).dot(right)).toBeLessThan(0);
    expect(HABITAT_POINTS.city).toEqual([-1.28, -39.38, -40]);
    expect(terrainHeight(-1.28, -40)).toBeCloseTo(39.48 - 39.41 / Math.cos(-1.28 / HABITAT_RADIUS), 8);
    expect(Math.hypot(frame.position.x, frame.position.y)).toBeLessThan(terrainRadiusAt(frame.position) - .01);
  });
  it('fills all three land belts at physical scale instead of sparse oversized models', () => {
    expect(districtMatrices(false).length).toBeGreaterThan(4000);
    expect(forestMatrices(false).length).toBeGreaterThan(60000);
  });
  it('keeps the equipment inspection space clear of all city and tower footprints', () => {
    const sector = Math.PI * 2 / 3;
    expect([...districtMatrices(false), ...towerMatrices()].every(matrix => {
      const point = new Vector3().setFromMatrixPosition(matrix);
      let localAngle = (Math.atan2(point.y, point.x) + Math.PI / 2) % sector;
      if (localAngle > Math.PI / 3) localAngle -= sector;
      if (localAngle < -Math.PI / 3) localAngle += sector;
      return Math.abs(localAngle * HABITAT_RADIUS + 2.6) >= .75 || Math.abs(point.z + 34) >= 1.2;
    })).toBe(true);
  });
});
