import data from '../content/scenes/C01.json';
import habitatData from '../content/scenes/C15.json';
import type { Hotspot, OverlayId, SceneId } from './types';
import { collectorVariant, VARIANT_NAMES } from './scene/orbits';

const parseHotspots = (source: typeof data.hotspots): Hotspot[] => source.map((spot) => {
  const level = spot.level;
  if (level !== 'system' && level !== 'group' && level !== 'entity' && level !== 'component') throw new Error('Invalid focus level');
  return { ...spot, level };
});
const parseNarration = (source: typeof data.narration) => source.map((topic) => ({
  ...topic,
  overlays: topic.overlays.map((overlay): OverlayId => {
    if (overlay !== 'orbits' && overlay !== 'energy' && overlay !== 'heat' && overlay !== 'light' && overlay !== 'labels' && overlay !== 'cutaway' && overlay !== 'gravity') throw new Error('Invalid overlay');
    return overlay;
  }),
}));

export const hotspots = parseHotspots(data.hotspots);
export const narrationTopics = parseNarration(data.narration);
export const scenes = {
  C01: { title: '戴森群', english: 'Dyson Swarm', root: 'sun', hotspots, narration: narrationTopics, layers: ['orbits', 'energy', 'heat', 'light', 'labels'] as OverlayId[], lightLabel: '行星视线', presets: ['恒星系全景', '巨构掠过', '单体检查'], flyby: 'collector_hero', inspection: 'collector_hero', notice: 'NASA/SDO · 171 Å 伪彩 · 非等比示意', boundary: '太阳影像：NASA/SDO · AIA 171 Å 伪彩，2026-09-21固定快照。群体分布和工程模型为教学示意。' },
  C15: { title: '旋转殖民地', english: 'Rotating Space Habitat', root: 'habitat', hotspots: parseHotspots(habitatData.hotspots), narration: parseNarration(habitatData.narration), layers: ['cutaway', 'gravity', 'light', 'heat', 'labels'] as OverlayId[], lightLabel: '采光路径', presets: ['舱外全景', '端盖入口', '内壁城市'], flyby: 'docking', inspection: 'city', notice: '旋转人工重力 · 概念工程设计 · 教学比例', boundary: '旋转人工重力有物理依据；结构、城市、景观与闭合生态为概念化设计。参考系切换仅改变观察方式。' },
};

export function findHotspot(id: string, sceneId: SceneId = 'C01'): Hotspot {
  const hotspots = scenes[sceneId].hotspots;
  const spot = hotspots.find((candidate) => candidate.id === id);
  const instance = /^collector_(north|south|mid)_(\d{3})$/.exec(id);
  if (instance) {
    const representative = hotspots.find((candidate) => candidate.id === `collector_${instance[1]}_001`);
    if (representative) {
      const variant = VARIANT_NAMES[collectorVariant(id)];
      return {
        ...representative, id, name: `${representative.name.split(' · ')[0]} · ${instance[2]} · ${variant}`,
        role: `量产采能卫星 · ${variant}`,
        explanation: `这是戴森群中的独立量产采能卫星，采用${variant}：中轴结构支撑分段采能面，并配有散热骨架。当前显示远景简化模型，配置差异为同系列工程形态示意，不代表不同设施功能；可环绕和聚焦。只有“代表采能卫星”提供正式 GLB 与四类独立部件检查。`,
      };
    }
  }
  if (spot) return spot;
  throw new Error(`Unknown object: ${id}`);
}
