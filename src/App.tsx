import { Component, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, ChevronRight, Eye, EyeOff, Focus, Info, Layers, Maximize2, Orbit, Pause, Play, RotateCcw, Settings2, SkipForward, Sun, X } from 'lucide-react';
import CosmicScene from './scene/CosmicScene';
import HabitatScene from './scene/HabitatScene';
import { findHotspot, scenes } from './content';
import { focusFor, initialState, parentFocus, stateFor } from './state';
import type { OverlayId, SceneId, SceneMetrics, SceneState } from './types';

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="scene-error" role="alert"><Sun size={36} /><h2>暂时无法打开 3D 场景</h2><p>请检查浏览器硬件加速，或使用支持 WebGL 的新版浏览器。</p><button onClick={() => window.location.reload()}>重新加载</button></div> : this.props.children;
  }
}

const overlayNames: Record<OverlayId, string> = { orbits: '轨道路径', energy: '能量采集', heat: '废热排散', light: '行星视线', labels: '对象标注', cutaway: '剖面显示', gravity: '重力方向' };
const partIds = ['collector_surface', 'support_truss', 'radiator', 'attitude_module'];
const interiorIds = ['city', 'forest', 'water', 'agriculture', 'interior', 'life_support'];

export default function App() {
  const [state, setState] = useState<SceneState>(() => ({ ...stateFor(new URLSearchParams(window.location.search).get('scene') === 'C15' ? 'C15' : 'C01'), reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches }));
  const scene = scenes[state.sceneId];
  const { hotspots, narration: narrationTopics } = scene;
  const [uiVisible, setUiVisible] = useState(true);
  const [panel, setPanel] = useState<'object' | 'narration'>('object');
  const [panelOpen, setPanelOpen] = useState(false);
  const [topicIndex, setTopicIndex] = useState(0);
  const [toolsPanel, setToolsPanel] = useState<'layers' | 'settings' | null>(null);
  const settingsOpen = toolsPanel === 'settings';
  const [metrics, setMetrics] = useState<SceneMetrics | null>(null);
  const [assetStatus, setAssetStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [solarStatus, setSolarStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const dismissInfo = useCallback(() => { setPanelOpen(false); document.getElementById('info-toggle')?.focus(); }, []);
  const select = useCallback((id: string) => { setState(previous => ({ ...previous, selection: id })); setPanel('object'); setPanelOpen(true); setToolsPanel(null); }, []);
  const focus = useCallback((id: string) => {
    setPanel('object');
    setPanelOpen(true);
    setToolsPanel(null);
    setState(previous => ({ ...previous, selection: id === scenes[previous.sceneId].root ? null : id, focus: focusFor(id, previous.sceneId), preset: id === scenes[previous.sceneId].root ? 'overview' : 'inspection', structure: 'normal', referenceFrame: previous.sceneId === 'C15' && interiorIds.includes(id) ? 'rotating' : 'inertial' }));
  }, []);
  const back = useCallback(() => setState(previous => {
    const target = parentFocus(previous.focus.id, previous.sceneId);
    return { ...previous, focus: target, selection: target.id === scenes[previous.sceneId].root ? null : target.id, structure: 'normal', preset: target.level === 'system' ? 'overview' : 'inspection', referenceFrame: previous.sceneId === 'C15' && interiorIds.includes(target.id) ? 'rotating' : 'inertial' };
  }), []);
  const reset = useCallback(() => { setPanelOpen(false); setToolsPanel(null); setState(previous => ({ ...previous, focus: stateFor(previous.sceneId).focus, selection: null, structure: 'normal', preset: 'overview', referenceFrame: 'inertial', resetToken: previous.resetToken + 1 })); }, []);
  const changeScene = (sceneId: SceneId) => {
    setState(previous => ({ ...stateFor(sceneId), quality: previous.quality, reducedMotion: previous.reducedMotion }));
    setPanelOpen(false); setToolsPanel(null); setPanel('object'); setTopicIndex(0); setMetrics(null); setAssetStatus('loading');
    const url = new URL(window.location.href);
    url.searchParams.set('scene', sceneId);
    window.history.replaceState(null, '', url);
  };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (toolsPanel) { setToolsPanel(null); document.getElementById(`${toolsPanel}-toggle`)?.focus(); }
      else if (panelOpen) dismissInfo();
      else back();
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [back, toolsPanel, panelOpen, dismissInfo]);
  const toggleLayer = (id: OverlayId) => setState(previous => ({ ...previous, overlays: { ...previous.overlays, [id]: !previous.overlays[id] } }));
  const chooseTopic = (index: number) => {
    const topic = narrationTopics[index];
    setTopicIndex(index);
    setPanel('narration');
    setPanelOpen(true);
    setState(previous => ({ ...previous, focus: focusFor(topic.focusId, previous.sceneId), selection: topic.focusId === scene.root ? null : topic.focusId, preset: topic.focusId === scene.root ? 'overview' : 'inspection', structure: 'normal', referenceFrame: previous.sceneId === 'C15' && interiorIds.includes(topic.focusId) ? 'rotating' : 'inertial', overlays: { ...previous.overlays, ...Object.fromEntries(topic.overlays.map(id => [id, true])) } }));
  };
  const selected = findHotspot(state.selection ?? state.focus.id, state.sceneId);
  const focused = findHotspot(state.focus.id, state.sceneId);
  const focusPath = [focused];
  while (focusPath[0].parent) focusPath.unshift(findHotspot(focusPath[0].parent, state.sceneId));
  const isDetail = state.focus.level === 'entity' || state.focus.level === 'component';
  const isHeroDetail = state.sceneId === 'C01' && (state.focus.id === 'collector_hero' || state.focus.level === 'component');
  const visibleObjects = isHeroDetail ? hotspots.filter(spot => partIds.includes(spot.id)) : state.focus.level === 'group' ? hotspots.filter(spot => spot.parent === state.focus.id) : hotspots.filter(spot => spot.level === 'group' || spot.id === 'collector_hero');
  const visibleState = uiVisible ? state : { ...state, selection: null, overlays: initialState.overlays };

  return <main className="explorer" data-scene={state.sceneId} data-reference-frame={state.referenceFrame} data-focus={state.focus.id} data-selection={state.selection ?? ''} data-asset-status={assetStatus} data-solar-view="euv" data-solar-status={solarStatus} data-renderer={metrics?.renderer} data-fps={metrics?.fps} data-calls={metrics?.calls} data-triangles={metrics?.triangles} data-textures={metrics?.textures}>
    <div className="scene-host" aria-label={`${scene.title}三维观察场景`}>
      <SceneBoundary key={state.sceneId}>{state.sceneId === 'C01' ? <CosmicScene state={visibleState} onSelect={select} onFocus={focus} onMetrics={setMetrics} onAssetStatus={setAssetStatus} onSolarStatus={setSolarStatus} /> : <HabitatScene state={visibleState} onSelect={select} onFocus={focus} onMetrics={setMetrics} onAssetStatus={setAssetStatus} onSolarStatus={setSolarStatus} />}</SceneBoundary>
    </div>
    {uiVisible ? <>
      <header className="topbar">
        <div className="brand"><Orbit size={24} strokeWidth={1.4} /><span className="brand-name">宇宙工程探索馆</span></div>
        <div className="top-actions">
          <button id="info-toggle" className="top-tool" aria-label="对象与讲解" aria-expanded={panelOpen} aria-controls="inspector" onClick={() => { setPanelOpen(value => !value); setToolsPanel(null); }}><Info size={18} /><span>信息</span></button>
          <button id="layers-toggle" className="top-tool" aria-label="教学图层" aria-expanded={toolsPanel === 'layers'} aria-controls="layers-panel" onClick={() => { setToolsPanel(value => value === 'layers' ? null : 'layers'); setPanelOpen(false); }}><Layers size={18} /><span>图层</span>{Object.values(state.overlays).some(Boolean) && <span className="layer-dot" aria-label="有图层已开启" />}</button>
          <button id="settings-toggle" className="icon-button" aria-label="画质与显示设置" aria-expanded={settingsOpen} aria-controls="settings-panel" onClick={() => { setToolsPanel(value => value === 'settings' ? null : 'settings'); setPanelOpen(false); }}><Settings2 size={19} /></button>
          <button className="icon-button" aria-label="隐藏界面" onClick={() => setUiVisible(false)}><EyeOff size={19} /></button>
        </div>
      </header>

      <section className="scene-heading"><h1><select className="scene-selector" aria-label="工程" value={state.sceneId} onChange={event => changeScene(event.target.value === 'C15' ? 'C15' : 'C01')}><option value="C01">戴森群</option><option value="C15">旋转殖民地</option></select><span>{scene.english}</span></h1></section>

      {focusPath.length > 1 && <nav className="breadcrumbs" aria-label="聚焦层级">
        {focusPath.map((entry, index) => <span key={entry.id}>{index > 0 && <ChevronRight size={13} />}<button onClick={() => focus(entry.id)} aria-current={entry.id === state.focus.id ? 'location' : undefined}>{entry.name}</button></span>)}
      </nav>}



      <aside id="inspector" className={`inspector ${panelOpen ? 'open' : 'closed'}`} aria-label="对象与讲解">
        <div className="panel-tabs"><button aria-pressed={panel === 'object'} onClick={() => { setPanel('object'); setPanelOpen(true); }}>观察对象</button><button aria-pressed={panel === 'narration'} onClick={() => { setPanel('narration'); setPanelOpen(true); }}>原理讲解</button><button className="icon-button panel-close" aria-label="收起信息面板" onClick={dismissInfo}><X size={17} /></button></div>
        <div className="panel-body">
          {panel === 'object' ? <>
            <div className="object-heading"><span className="object-symbol"><Sun size={25} strokeWidth={1.2} /></span><h2>{selected.name}</h2></div>
            <p className="role">{selected.role}</p><p className="explanation">{selected.explanation}</p>
            <button className="focus-button" disabled={selected.id === state.focus.id} onClick={() => focus(selected.id)}><Focus size={16} />{selected.id === state.focus.id ? '正在观察' : '聚焦此对象'}<ArrowUpRight size={16} /></button>
            <div className="section-label">{isHeroDetail ? '卫星结构' : '探索层级'}</div>
            <div className="object-list">
              {visibleObjects.map(spot => <button key={spot.id} aria-pressed={state.selection === spot.id} onClick={() => { select(spot.id); focus(spot.id); }}><span>{spot.name}</span><ChevronRight size={15} /></button>)}
            </div>
            {state.sceneId === 'C01' && (isHeroDetail || state.focus.level === 'group') && <div className="structure-tools" aria-label="结构观察"><button aria-pressed={state.structure === 'normal'} onClick={() => setState(previous => ({ ...previous, structure: 'normal' }))}>整体</button><button aria-pressed={state.structure === 'isolated'} onClick={() => setState(previous => ({ ...previous, structure: 'isolated' }))}>隔离</button>{isHeroDetail && <button aria-pressed={state.structure === 'exploded'} onClick={() => setState(previous => ({ ...previous, structure: 'exploded' }))}>爆炸视图</button>}</div>}
            <div className="science-note"><Info size={15} /><span>{selected.science}。工程结构与尺寸为概念化设计。</span></div>
            <details className="sources"><summary>科学来源与边界</summary>{selected.links.map(link => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.title}<ArrowUpRight size={12} /></a>)}<p>{scene.boundary}</p></details>
          </> : <>
            <h2 className="narration-title">{`理解${scene.title}`}</h2><p className="role">{scene.boundary}</p>
            <div className="topic-list">{narrationTopics.map((topic, index) => <button key={topic.id} aria-current={index === topicIndex ? 'step' : undefined} onClick={() => chooseTopic(index)}><span>{String(index + 1).padStart(2, '0')}</span>{topic.title}<ChevronRight size={14} /></button>)}</div>
            <h3>{narrationTopics[topicIndex].title}</h3><p className="explanation">{narrationTopics[topicIndex].text}</p><button className="focus-button" onClick={() => chooseTopic((topicIndex + 1) % narrationTopics.length)}>下一小节<ArrowUpRight size={16} /></button>
            <div className="science-note"><Info size={15} /><span>{state.sceneId === 'C01' ? '能量流、废热与行星视线均为示意。总采集份额不等于具体行星遮挡率。' : scene.boundary}</span></div>
          </>}
        </div>
      </aside>

      {toolsPanel === 'layers' && <section id="layers-panel" className="layer-control" aria-label="教学图层"><div className="tool-heading"><h2>教学图层</h2><button className="icon-button" aria-label="收起教学图层" onClick={() => { setToolsPanel(null); document.getElementById('layers-toggle')?.focus(); }}><X size={17} /></button></div><p>按需显示示意，保留自由观察。</p><div className="layer-options">{scene.layers.map(id => <button key={id} aria-pressed={state.overlays[id]} onClick={() => toggleLayer(id)}><span>{id === 'light' ? scene.lightLabel : overlayNames[id]}</span><span className="layer-state" aria-hidden="true">{state.overlays[id] ? '开启' : '关闭'}</span></button>)}</div>{state.sceneId === 'C15' && <label className="reference-control">旋转参考系<select aria-label="旋转参考系" value={state.referenceFrame} onChange={event => setState(previous => ({ ...previous, referenceFrame: event.target.value === 'rotating' ? 'rotating' : 'inertial' }))}><option value="inertial">静止参考系</option><option value="rotating">随舱体旋转</option></select></label>}</section>}

      <footer className="bottom-bar">
        <div className="transport"><button className="icon-button" aria-label={state.playing ? '暂停动画' : '继续动画'} onClick={() => setState(previous => ({ ...previous, playing: !previous.playing }))}>{state.playing ? <Pause size={18} /> : <Play size={18} />}</button></div>
        <nav className="view-nav" aria-label="观察构图">
          <button className={state.preset === 'overview' ? 'view active' : 'view'} aria-pressed={state.preset === 'overview'} onClick={reset}><Orbit size={17} /><span>{scene.presets[0]}</span></button>
          <button className={state.preset === 'flyby' ? 'view active' : 'view'} aria-pressed={state.preset === 'flyby'} onClick={() => { setPanelOpen(false); setToolsPanel(null); setPanel('object'); setState(previous => ({ ...previous, focus: focusFor(scene.flyby, previous.sceneId), selection: scene.flyby, preset: 'flyby', referenceFrame: 'inertial', structure: 'normal', overlays: { ...previous.overlays, labels: previous.sceneId === 'C01' || previous.overlays.labels } })); }}><Maximize2 size={17} /><span>{scene.presets[1]}</span></button>
          <button className={state.preset === 'inspection' && isDetail ? 'view active' : 'view'} aria-pressed={state.preset === 'inspection' && isDetail} onClick={() => { focus(scene.inspection); if (state.sceneId === 'C15') setPanelOpen(false); }}><Focus size={17} /><span>{scene.presets[2]}</span></button>
        </nav>
        <div className="return-controls">{state.focus.level !== 'system' && <><button onClick={back}><ArrowLeft size={15} />上一层</button><button onClick={reset}><RotateCcw size={15} />全景</button></>}</div>
      </footer>
      {state.sceneId === 'C01' && solarStatus !== 'ready' && <div className="solar-status" role="status">{solarStatus === 'loading' ? '正在载入观测影像…' : '观测影像未载入 · 显示简化表面'}</div>}
      <div className="scale-notice">{scene.notice}</div>
      {(isHeroDetail || state.sceneId === 'C15') && assetStatus !== 'ready' && <div className="asset-indicator" role="status">{assetStatus === 'loading' ? '正在加载近景模型…' : state.sceneId === 'C15' ? '正式资产加载失败，请重新加载' : '暂用结构示意 · 正式资产加载失败'}</div>}
      {settingsOpen && <section id="settings-panel" className="settings-panel" aria-label="画质与显示设置"><h2>画质与显示</h2><p className="settings-hint">拖动旋转 · 滚轮缩放<br />单击选择 · 双击聚焦</p><label>画质<select aria-label="画质" value={state.quality} onChange={event => setState(previous => ({ ...previous, quality: event.target.value === 'low' ? 'low' : 'standard' }))}><option value="standard">标准</option><option value="low">低负载</option></select></label><div className="animation-tools"><button className="icon-button" aria-label="单步动画" onClick={() => setState(previous => ({ ...previous, playing: false, stepToken: previous.stepToken + 1 }))}><SkipForward size={18} /></button><button className="icon-button" aria-label="重置动画" onClick={() => setState(previous => ({ ...previous, time: 0, resetToken: previous.resetToken + 1 }))}><RotateCcw size={17} /></button><span>单步 / 重置动画</span></div><label className="check-label"><input type="checkbox" checked={state.reducedMotion} onChange={event => setState(previous => ({ ...previous, reducedMotion: event.target.checked }))} />减弱镜头与动画</label><details><summary>运行测量</summary>{metrics ? <dl><dt>帧率</dt><dd>{metrics.fps.toFixed(1)} FPS</dd><dt>P95 帧时间</dt><dd>{metrics.frameP95.toFixed(1)} ms</dd><dt>Draw calls</dt><dd>{metrics.calls}</dd><dt>三角面</dt><dd>{metrics.triangles.toLocaleString()}</dd><dt>纹理数量</dt><dd>{metrics.textures}</dd></dl> : <p>等待实际采样。</p>}<p className="renderer-info">{metrics?.renderer}</p></details></section>}
    </> : <button className="show-interface icon-button" aria-label="显示界面" onClick={() => setUiVisible(true)}><Eye size={20} /></button>}
  </main>;
}
