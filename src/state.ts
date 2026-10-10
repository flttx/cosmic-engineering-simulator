import { findHotspot, scenes } from './content';
import type { FocusEntry, SceneId, SceneState } from './types';

export const initialState: SceneState = {
  sceneId: 'C01',
  referenceFrame: 'inertial',
  selection: null,
  focus: { id: 'sun', level: 'system' },
  structure: 'normal',
  overlays: { orbits: false, energy: false, heat: false, light: false, labels: false, cutaway: false, gravity: false },
  playing: true,
  time: 0,
  stepToken: 0,
  resetToken: 0,
  reducedMotion: false,
  quality: 'standard',
  preset: 'overview',
};

export function stateFor(sceneId: SceneId): SceneState {
  return { ...initialState, sceneId, focus: { id: scenes[sceneId].root, level: 'system' }, overlays: { ...initialState.overlays } };
}

export function focusFor(id: string, sceneId: SceneId = 'C01'): FocusEntry {
  const spot = findHotspot(id, sceneId);
  return { id: spot.id, level: spot.level };
}

export function parentFocus(id: string, sceneId: SceneId = 'C01'): FocusEntry {
  return focusFor(findHotspot(id, sceneId).parent ?? scenes[sceneId].root, sceneId);
}
