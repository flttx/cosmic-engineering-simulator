export type FocusLevel = 'system' | 'group' | 'entity' | 'component';
export type StructureMode = 'normal' | 'isolated' | 'exploded';
export type SceneId = 'C01' | 'C15';
export type OverlayId = 'orbits' | 'energy' | 'heat' | 'light' | 'labels' | 'cutaway' | 'gravity';
export interface FocusEntry { id: string; level: FocusLevel }
export interface SceneState {
  sceneId: SceneId;
  referenceFrame: 'inertial' | 'rotating';
  selection: string | null;
  focus: FocusEntry;
  structure: StructureMode;
  overlays: Record<OverlayId, boolean>;
  playing: boolean;
  time: number;
  stepToken: number;
  resetToken: number;
  reducedMotion: boolean;
  quality: 'standard' | 'low';
  preset: 'overview' | 'flyby' | 'inspection';
}
export interface SceneMetrics { fps: number; frameP95: number; calls: number; triangles: number; textures: number; renderer: string }
export interface SceneProps {
  state: SceneState;
  onSelect: (id: string) => void;
  onFocus: (id: string) => void;
  onMetrics: (metrics: SceneMetrics) => void;
  onAssetStatus: (status: 'loading' | 'ready' | 'fallback') => void;
  onSolarStatus: (status: 'loading' | 'ready' | 'fallback') => void;
}
export interface Hotspot {
  id: string; name: string; role: string; explanation: string;
  parent: string | null; level: FocusLevel; science: string;
  links: { title: string; url: string }[];
}
