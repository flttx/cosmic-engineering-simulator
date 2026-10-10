import { describe, expect, it } from 'vitest';
import { findHotspot, hotspots, narrationTopics, scenes } from '../src/content';
import { focusFor, initialState, parentFocus, stateFor } from '../src/state';

describe('C01 focus contract', () => {
  it('returns from a component through its satellite and orbit family to the system', () => {
    let focus = focusFor('radiator');
    expect(focus.level).toBe('component');
    focus = parentFocus(focus.id);
    expect(focus).toEqual({ id: 'collector_hero', level: 'entity' });
    focus = parentFocus(focus.id);
    expect(focus).toEqual({ id: 'orbit_family_mid', level: 'group' });
    expect(parentFocus(focus.id)).toEqual(initialState.focus);
    expect(parentFocus('sun')).toEqual(initialState.focus);
  });

  it('preserves distinct dynamic instance identities and family affiliation', () => {
    expect(focusFor('collector_north_037')).toEqual({ id: 'collector_north_037', level: 'entity' });
    expect(parentFocus('collector_north_037').id).toBe('orbit_family_north');
    expect(parentFocus('collector_south_099').id).toBe('orbit_family_south');
    expect(findHotspot('collector_mid_003').name).toContain('003');
    expect(() => focusFor('collector_wrong_001')).toThrow('Unknown object');
    expect(() => focusFor('collector_north_1')).toThrow('Unknown object');
  });

  it('has no cycles or unresolved teaching focus targets', () => {
    for (const spot of hotspots) {
      const visited = new Set<string>();
      let current = spot;
      while (current.parent) {
        expect(visited.has(current.id)).toBe(false);
        visited.add(current.id);
        current = findHotspot(current.parent);
      }
      expect(current.id).toBe('sun');
    }
    expect(narrationTopics).toHaveLength(5);
    for (const topic of narrationTopics) expect(focusFor(topic.focusId)).toBeDefined();
  });
});

describe('C15 scene isolation', () => {
  it('resets to the habitat and resolves its complete hierarchy without C01 objects', () => {
    const state = stateFor('C15');
    expect(state.focus).toEqual({ id: 'habitat', level: 'system' });
    expect(state.sceneId).toBe('C15');
    expect(state.referenceFrame).toBe('inertial');
    expect(Object.values(state.overlays).every(value => !value)).toBe(true);
    expect(parentFocus('city', 'C15')).toEqual({ id: 'interior', level: 'group' });
    expect(parentFocus('interior', 'C15')).toEqual(state.focus);
    expect(parentFocus('habitat', 'C15')).toEqual(state.focus);
    expect(() => findHotspot('sun', 'C15')).toThrow('Unknown object');
    expect(() => findHotspot('city')).toThrow('Unknown object');
    for (const topic of scenes.C15.narration) expect(focusFor(topic.focusId, 'C15')).toBeDefined();
    state.overlays.gravity = true;
    expect(stateFor('C15').overlays.gravity).toBe(false);
  });
});
