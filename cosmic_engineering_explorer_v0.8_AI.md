---
document_id: cosmic-engineering-explorer-v0.8
title: 宇宙工程探索馆 / Cosmic Engineering Explorer
version: "0.8"
date: "2026-10-09"
format: ai-friendly-markdown
language: zh-CN
product_type: interactive-3d-observation-atlas
implementation_status: specification-only
scope_policy: observation-only
visual_gate: cinematic-megastructure-scale-must-pass
canonical_concepts: 77
interactive_core_count: 12
first_wave_count: 3
backlog_count: 65
first_wave_scene_order: [C01, C15, C08]
active_implementation_scene: C01
active_modes: [explore]
hero_asset_pipeline: tripo-to-blender-to-runtime-glb
asset_quality_gate: high-fidelity-close-inspection-required
source_assets: preserve-unoptimized
disabled_until_explicit_approval: [build, challenge, sandbox, missions, economy, scoring, construction, progression]
supersedes: cosmic_engineering_explorer_v0.7_AI.md
concept_catalog: concept_catalog_v0.8.json
first_scene_config: C01_observation_v0.8.json
---

# 宇宙工程探索馆 · 可交互 3D 观察图鉴 v0.8

> **本版唯一执行指令**：先做真正可观察、可点击、可深入探索的 3D 场景与模型。**暂停游戏模式**：不写建造、任务、评分、资源、奖励、成就、科技树、自由施工沙盒和游戏存档。
>
> 本文是当前有效开发规格。保留 77 个原概念 ID、12 个未来优先完整 3D 场景（其中 3 个属于第一波，但**当前只实施 C01 戴森群**）；另 65 个作为不建模的资料候选。不得把“规划中的第一波”解释成必须立刻制作 3 个场景。
>
> **产品核心**：不是自动播放的 CG 或 360°视频。用户必须能操作真正的 3D 对象，连续或分层缩放、环绕相机、点选并聚焦实体、查看内部结构、播放教学原理动画，随时回到全景。
>
> **最高视觉目标（持续生效）**：强烈的宇宙巨物感、尺度冲击、可信的工业结构与沉浸式临场感。每个核心概念不仅要“看得到整个模型”，还要能通过 **远景尺度揭示 → 靠近结构 → 贴近部件 → 再拉远** 的可控制镜头体验感受到宏大，不能用泛光/体积雾/过度饱和代替体量。

## 0. 生效决策与优先顺序

| 项目 | v0.6 | v0.8 生效规定 |
| --- | --- | --- |
| 产品类型 | 探索 + 模拟建造 | **仅 3D 交互观察图鉴** |
| 默认页面 | Explore / Challenge / Sandbox | **唯一模式 Explore** |
| 已有概念 | 77 | **77 全部保留** |
| 3D 核心场景 | 12（3 第一波 + 9 后续） | 维持规划，**只实现 C01** |
| 可操作内容 | 观察 + 部署 + 参数 + 任务 | 旋转、缩放、点击、聚焦、剖切、图层、动画与解说 |
| 任务经济评分 | 可选 | **明确延期；不建目录、入口或假按钮** |
| 物理模拟 | 工程试验与代理指标 | **仅为可解释的教学动画与必要数值；不开发建造仿真引擎** |
| 用户进度 | 挑战存档与方案快照 | 不要求；可选保留本地相机偏好 |

### 0.1 用户体验闭环

1. **发现**：进入概念，马上看到可旋转缩放的 3D 巨构，而不是概念图卡片代替 3D。
2. **接近**：从宏观镜头飞向局部目标，建立空间尺度认知。
3. **选中**：点击特定卫星或模型部件，信息面板显示名称、功能、科学可信度与来源。
4. **拆解**：独立隐藏/透明显示/爆炸模型的有意义结构层；可继续绕当前部件旋转。
5. **理解**：播放或单步查看原理动画，切换轨道、能量流、磁场、废热等示意层。
6. **返回**：一键回到上一级聚焦目标/全景；保留相机与图层合理状态。

### 0.2 当前明确不做

- 卫星部署、建造预览、删建、材料消耗、回合/任务目标、游戏胜败判定。
- 资源、经济、评分、成就、科技树解锁、关卡菜单、建筑栏。
- 修改模型结构产生永久存档、自由放置工程设施、完整 N 体物理或实时气候仿真。
- 复杂的用户自定义参数优化器。未来可保留小规模**讲解用预设切换**，但不能反向扩大当前 C01 交付范围。
- 为所有 77 个概念提前创建完整 GLB、空页面或假的「即将推出」交互。

### 0.3 交付分层

| 类型 | 数量 | 本期承诺 |
| --- | ---: | --- |
| 当前施工 `C01` | 1 | **真正可玩转的 3D 观察原型** |
| 第一波后续 `C15, C08` | 2 | 保留细化观察规格，不在 C01 Gate 通过前开工 |
| 9 个长期核心 | 9 | 保留 3D 设计，不生成资产 |
| 65 个候选 | 65 | 保留科学档案与后续 3D 创意，不生成场景 |

### 0.4 核心美术目标：震撼、巨物感与科学可信度（MUST）

> **体验目标**：用户第一次进入场景有“这是一个不可思议的宇宙尺度工程”的震撼；继续靠近会发现细节并非贴图，而是具有可辨识构造的真实 3D 物体；越接近，越能感知工程的庞大和自身的渺小。

**视觉原则（按重要性排序）**：

1. **体量反差**：同一镜头或连续镜头里必须有清晰的尺度参照，如小型维护艇、舷窗/检修口/桁架单元、城市、行星、恒星。参照物大小要在同一层级自洽，禁止为了震撼而无提示地改变真实尺寸。
2. **层次和视差**：前景巨大遮挡结构、中景可辨的采能模块/空间站、远景恒星或漫长轨道同时存在；相机靠近时能看到真实几何与前后视差，不能只是缩放一张贴图。
3. **镜头尺度揭示**：先让玩家看清可辨部件，再逐渐拉远，发现它只是卫星群里的一个；或从全景通过一次可中断的长距离相机过渡迫近巨构。所有镜头转场都应允许用户中断与手动观察。
4. **工业复杂度**：高质量结构轮廓、重复但非完全相同的采能阵列、支撑桁架、散热翼、检修设施、对接装置和局部灯光。近距离观察必须有明确、合理的分层，不可仅由大量发光点、简单圆环和基础几何块充数。
5. **光照与材质**：强烈恒星逆光和巨大轮廓剪影、局部反射、材质粗糙度差异、恰当的结构自遮挡。Bloom、镜头眩光只做点缀；禁止太阳光把所有卫星细节冲成白斑。
6. **运动表现**：镜头缓慢、有惯性但不拖沓；卫星/环世界的运动体现庞大和稳定，避免玩具快速自转、视角突然跳变。减弱动画选项必须有效。
7. **空间真实感**：太空真空区域不应随意使用大气雾；可用背光、遮挡、距离、轨道分布和材料重复规律建立深度。需要非写实效果时标明“视觉示意”。
8. **克制 UI**：默认 3D 画面是主角，文本不铺满屏幕；标注与热点可隐藏，保证纯观赏视图仍然有压迫感。

**核心镜头范式**：`SYSTEM_REVEAL → STRUCTURE_APPROACH → MONUMENTAL_FLYBY → COMPONENT_INSPECTION → RETURN_TO_OVERVIEW`。
其中 `MONUMENTAL_FLYBY` 是可手动控制的近距离掠过/环绕观察，不是线性过场视频或强制载具玩法。

**多尺度真实性边界**：天文尺度与工程细节不可能在同一线性渲染坐标里直接保持精度。可采用可解释的分层尺度、LOD、独立局部坐标和相机焦点过渡；当同屏示意比例不真实时，提供“教学比例 / 非等比例”提示。**视觉震撼不能建立在伪造精确物理数据上。**

**反例 / 不通过**：远景只是稀疏发光颗粒；所谓环形巨构仅有无细节圆圈；太阳占满屏却遮住卫星；点击后相机只做机械贴脸；没有任何尺度参照；切换近景时模型突然变大变小；为制造电影感而禁用自由旋转；所有核心概念换皮共享一个相同造型。

**本期门槛**：只有 `C01` 需要落地并通过视觉与模型资产 Gate；其余 11 个仅记录未来的“巨物感标志镜头”，不得因此提前生产 3D 资产。

### 0.5 十二个核心概念的巨物感标志场景

| ID | 巨物感标志镜头（视觉规格，不等于立刻制作） | 可自由操作的观察深度 |
| --- | --- | --- |
| `C01` 戴森群 | 从一艘微小维护艇旁仰望铺展到视野边缘的巨大采能翼；拉远后发现它只是日面前密集但离散的群体之一 | 恒星系 → 卫星群 → 巨型单卫星 → 板面/散热模块 |
| `C15` 旋转太空殖民地 | 先从舱外看到庞大的旋转圆柱，再进入内壁，远方城市与河谷倒悬于“头顶” | 圆柱外壳 → 入口桁架 → 栖居内壁 → 城市细节 |
| `C08` 黑洞发电站 | 小型采集平台置于尺度压倒性的吸积盘前，黑洞引力透镜改变背景星光；防护结构形成巨大剪影 | 远观黑洞 → 设施网络 → 采集站与保护层 |
| `C02` 恒星发动机 | 半边恒星占据天空，巨型反射镜跨越视野，靠近镜面会发现成排支架/校准设施 | 恒星 → 反射镜 → 镜面分段 |
| `C06` 环世界 | 从环带内部看见地平线延伸并在天空中弯回，拉远才看出整片陆地只是恒星旁细环 | 完整环带 → 内壁大陆 → 人工结构 |
| `C05` 套娃脑 | 从恒星近旁穿过层层巨大的计算壳，每层都有微型计算节点与庞大散热结构 | 套层全局 → 某计算壳 → 节点/散热器 |
| `C09` Birch 世界 | 黑洞引力中心与多层栖居壳体的尺度对比，剖切后呈现纵深极深的层级 | 外壳 → 断面 → 某个居住层 |
| `E37` 巴萨德冲压飞船 | 飞船近景与跨越巨大空间的磁漏斗示意对照，小小船体悬于无形收集区域中央 | 飞船 → 磁漏斗 → 反应室；磁场仅为示意 |
| `E18` 冯·诺依曼探针 | 小探针抵达巨大无人的矿石天体，局部采矿系统延展为巨型自动工厂 | 小行星 → 工业区 → 单探针部件 |
| `E39` 曲速引擎 | 渺小飞船置于宏大的时空曲率可视化中，从船外看泡前后几何示意 | 外部时空泡 → 飞船 → 理论几何层 |
| `E43` 可穿越虫洞 | 一座微小空间站面对占满视野的虫洞入口，穿过后整个星空拓扑变化 | 入口 → 喉道示意 → 出口；均为理论演绎 |
| `C11` 银河工程 | 从单颗恒星的巨构拉远，逐渐揭示整片星区和银河系中的人工网络 | 单星 → 星团/星区 → 银河尺度 |

**禁止一刀切**：不同概念的震撼应来自不同空间结构，而不是每张场景都堆“巨大蓝色能量圈 + 发光星空背景”。

### 0.6 高精度建模强制规范（MUST，v0.8）

> **制作路线锁定：Tripo 高精度资产生成 → Blender 精修、分件、优化 → glTF/GLB → Three.js/R3F。** 不要求 Tripo 生成整颗恒星或全部轨道卫星；需要可近距离观察的关键工业实体必须有真正高质量的几何与材质，不能让简单方块、发光平面或粗糙一体化 AI 网格充当正式近景模型。

- **源资产和运行时资产分离**：保存 Tripo 原始结果、Blender 主工程、材质源文件；另导出经检验的实时 LOD 模型。高精度源模型允许复杂，但**不能把未优化的百万面原件直接复制成成千个浏览器实体**。
- **焦点优先分配精度**：宏观用真实 3D 实例群建立空间尺度；用户选中卫星以后逐级切换中景结构和高质量单卫星 GLB，远景不强行使用高模。近景模型要有真实视差、自遮挡、独立构件和可信工业细节。
- **生成≠完成**：Tripo 只负责生成高精度候选形体；Blender 负责修复扭曲、穿插、错误拓扑、破面、UV、法线、材质与比例，必要时局部重建结构。**不满意可以重做，不能因生成成功直接通过模型质量验收。**
- **可交互分件**：采能面、承力桁架、散热模块、姿态组件、维护/对接位置等必须按观察需求拆为可识别对象与锚点；材质贴图不是替代结构几何的理由。
- **材质真实感**：PBR 金属/非金属、粗糙度、法线、必要的烘焙细节、背光轮廓与局部结构阴影应能经得起近景旋转；星际真空不默认添加浓雾。
- **性能以实测为准**：按设备与画质档位检测模型装载、帧时间、draw call、显存、贴图与视觉一致性，LOD、网格压缩与纹理压缩是保真手段而非牺牲整体观感的理由。三角面数不是“高精度”的单一验收标准。
- **全概念通用、分期执行**：这套资产管线适用于以后正式开发的 12 个核心场景，当前仅对 C01 实施；C15/C08/其余概念暂不生成资产。

**模型最终验收必须分别完成**：近景美术、部件可观察性、交互拾取、LODs 切换、浏览器性能五项检查。美术 Gate 与技术 Gate 均通过才算完成，不能用“已经导出 GLB”当作完成标准。

## 1. 科学边界和展示方式

- `S1`：核心规律有已知物理支持，不代表完整工程已经实现。
- `S2`：极端工程外推，关键技术可能远超现有能力。
- `S3`：关键物理实现前提未经证实，例如曲速、可穿越虫洞。
- `SF`：主要科幻设定或思想实验。
- 这些分类是内容标记，当前历史数据中还存在待核验条目；未经资料复核不得标记为学术结论。
- **视觉示意 ≠ 真实拍摄/实验结果**：夸张的光束、磁场、引力网格、轨道比例、物体尺寸都应标记为教学呈现。
- 黑洞电站要区分吸积/自旋取能，不能把大型天体黑洞的微弱霍金辐射当作主要能源。
- 光照遮挡是具体视线方向的几何问题，不能拿戴森群全局覆盖率直接代替地球获得的日照变化。
- 没有经过验证的实验数据不得以精确数值或百分比充当科学结论。

## 2. 开发名单与内容归属

| 稳定 ID | 场景 | 当前状态 | 主要观察路径 |
| --- | --- | --- | --- |
| `C01` | 戴森群 | **当前唯一实现** | 恒星系 → 轨道族 → 单卫星 → 部件 |
| `C15` | 旋转太空殖民地 | 第一波待启动 | 外部圆柱 → 入口 → 内壁与剖面 |
| `C08` | 黑洞发电站 | 第一波待启动 | 黑洞 → 吸积盘 → 采能站 |
| `C02` | 恒星发动机 | 长期核心 | 恒星 → 反射镜 → 镜面单元 |
| `C06` | 环世界 | 长期核心 | 恒星 → 环带 → 内部居住面 |
| `C05` | 套娃脑 | 长期核心 | 套叠壳层 → 计算节点 → 散热 |
| `C09` | Birch 世界 | 长期核心 | 壳世界 → 分层剖面 → 栖居层 |
| `E37` | 巴萨德冲压飞船 | 长期核心 | 飞船 → 磁漏斗 → 反应器 |
| `E18` | 冯·诺依曼探针 | 长期核心 | 母机 → 工厂 → 子机 |
| `E39` | 曲速引擎 | 长期核心 | 飞船 → 时空泡 → 解释层 |
| `E43` | 可穿越虫洞 | 长期核心 | 入口 → 喉道 → 出口 |
| `C11` | 银河工程 | 长期核心 | 银河 → 星区 → 单星 |

## 3. 统一 3D 观察契约（必须实现）

### 3.1 相机与操作

- 镜头切换要有两种入口：**用户自由驾驶镜头**与**一键构图镜头**。预设镜头是可中断的引导，不是不可打断的演出。
- 三种最小展示构图：`Establishing`（整体几何尺度）、`ScaleProof`（近处工程结构+尺寸参照物）、`Inspection`（可选部件材质/连接方式）。
- 临近巨大结构时默认避免从物体内部穿模；适配极近/极远裁剪平面，保持近景结构轮廓与清晰可操作性。

| 用户输入 | 期望结果 |
| --- | --- |
| 左键拖动 / 触控单指 | 围绕当前焦点旋转视角 |
| 鼠标滚轮 / 双指缩放 | 平滑拉近拉远，接近层级边界时可切换目标/LOD |
| 右键拖动或等效手势 | 平移视图（必须可恢复焦点） |
| 单击物体 | 选中对象、高亮/轮廓、显示简短信息 |
| 双击物体或点击「聚焦」 | 相机平滑转到该实体，更新焦点面包屑 |
| Esc / 返回上一层 | 从部件 → 单卫星 → 轨道族 → 全景按层级返回 |
| 重置镜头 | 回到场景默认全景，不丢模型和讲解 |
| 隐藏 UI | 关闭标签/解释层，纯观赏模型 |
| 动画暂停/继续/单步 | 不改变内容正确性，可保留当前选中对象 |

### 3.2 多尺度、模型与拾取

- 至少提供整体层、中尺度轨道族或功能区、单体/部件三层；如 C15 等需要内部层，另提供内景相机。
- 真实世界尺度与渲染坐标分离，用单位转换、分层参考系或浮动原点，不要将太阳和卫星等各层尺寸随意物理等比挤在一个线性坐标空间。
- 远景的卫星群可以是 **InstancedMesh**，近景按需替换为独立可观察的中/高精度 GLB。映射 `instanceId → stable_object_id` 必须稳定，不得随机漂移。
- 不可用单张星空贴图或渲染视频替代 3D 可选实体。简单占位物允许在底座验证阶段使用，但要明确替换为可读的部件模型。
- 相机聚焦动态卫星时可跟随其局部坐标系；动画每帧更新不得导致相机跳回世界原点。
- 与真实物理比例不一致的示意场景必须有“非等比/教学比例”提示。

### 3.3 结构、图层与讲解

- 结构工具：隔离对象、透明外壳、剖切、爆炸视图、恢复原样；至少选择与当前巨构有意义的一项。
- 示意图层：轨道线、运动方向、辐射/能量流、热排散、磁场等，每种都能独立显示和隐藏。
- 每个热点提供 `object_id / name / role / focus_target / explanation / science_level / links`。
- 解说最少包含「是什么 → 为什么如此设计 → 如何运行 → 现实困难/科学边界」；焦点切换时对应对象解释。
- 教学动画播放、暂停、速度档位（若有）、重置；必要时提供单步，**不需要可调工程参数和成绩**。
- 能关闭特效和注释，单纯看清楚模型的几何轮廓、材质与连接关系。

### 3.4 统一运行状态

```text
SceneRuntime
  ├─ concept_id
  ├─ camera: panorama / focused / interior
  ├─ selection: object_id | null
  ├─ focus_path: [system, group, entity, component]
  ├─ structure: normal / isolated / transparent / exploded
  ├─ overlays: orbital_lines / energy / labels / ...
  ├─ narration: active_step
  └─ animation: paused / playing / step
```

这不是模拟建造引擎。**不建立** `MissionState / BuildState / ResourceState / ScoreState`。

### 3.5 高精度模型观察契约

- 焦点实体拥有稳定 `object_id`，模型节点名与拾取数据通过 `node_mapping` 绑定。Tripo 原始网格可重命名，但逻辑对象 ID 不可随便修改。
- 模型至少保留整机、主承力结构、采能面、散热模块、姿态模块这些**可独立选择或隔离**的观察对象；是否需要细分检修平台由实际设计决定。
- 每个可检部件提供 Blender 局部枢轴及相机安全聚焦锚点。拆解动画不应破坏整体 LOD 的世界坐标与卫星轨道位置。
- 用户从远景实例靠近时，选择关系应映射到高精度模型，不能出现突然变成另一颗外形不同的卫星；必要时用统一外形轮廓的中间 LOD 平滑衔接。
- 当高精度模型正在加载，允许使用已就绪的中精度模型/明确加载指示；不得造成空白世界、长时间 UI 锁死或选中状态丢失。
- 如某概念没有可靠可验证的精确工程形体，必须注明「工程概念化设计」，同时遵循受力、模块化、散热等已知约束，避免纯装饰性机械堆料。

## 4. 十二个核心概念的可观察 3D 场景规格

> 本章每个场景都继承第 0.4、0.5 节的“巨物感标志镜头”。**镜头不是用户只能观看的自动动画**，它要能够通过自由相机暂停、接管、反向缩放、聚焦局部来真正观察。

以下保留 v0.6 的科学简介、场景树、可观察动作和机制演示；所有 `deferred_explanatory_experiment` **仅作为未来扩展思路，不是首版 UI 功能或开发要求**。原有 v0.6 的游戏玩法扩展段已从生效规范移出。


### 4.1 `C01` · 戴森群 / Dyson Swarm

- **development_status**: `first_wave_planned`
- **science_status**: `S2`（开发前结合原始文献复核）
- **category**: 恒星能源
- **definition**: 利用数量庞大的独立绕日采能器截获恒星辐射。主角是彼此独立的轨道设施，不是实心戴森壳。
- **hero_3d**: 以太阳、多个轨道族和稀疏卫星阵列作为首屏；黄道行星轨道只是参照层。
- **scene_hierarchy**:
  - 太阳 / 恒星表面
  - 轨道族 / 卫星簇
  - 代表性采能卫星
  - 光伏或反射面 / 姿态模块 / 散热器
  - 地球与其他行星的照明评估点
- **interactive_actions**:
  - 旋转全景并跨尺度缩放至代表性卫星
  - 点选可拾取的卫星实例后平滑聚焦、持续环绕
  - 隔离轨道族、切换轨道线和太阳辐射方向
  - 单卫星部件隐藏 / 爆炸 / 透明
  - 切换能量采集、传输、红外废热及行星遮挡图层
- **deferred_explanatory_experiment**: （非当前观察 MVP；仅保留科学设计构想） 后续可演示调节名义覆盖率和轨道倾角/黄道避让策略；UI 比较总截获功率、指定行星方向的遮挡比例与示意能量账本。需区分全球覆盖率与特定观测方向遮挡。
- **limits_and_science**: 轨道管理、碰撞规避、行星光照、材料资源、散热；轨道线与能量射线为示意，默认没有“卫星连接成连续硬壳”。
- **assets_reuse**: 恒星 shader、轨道参数数据、卫星高/中/低精度 GLB、InstancedMesh + 单体细节版本、拾取映射、能量与热层。



### 4.2 `C02` · 恒星发动机 / Stellar Engine · Shkadov

- **development_status**: `core_later`
- **science_status**: `S2`（开发前结合原始文献复核）
- **category**: 恒星运动
- **definition**: 在恒星附近布置巨型反射镜，以不对称光子动量产生长期微弱推力。Caplan 发动机是关联但不同的主动质量喷流方案。
- **hero_3d**: 恒星与一侧弧形反射镜悬于深空；显示反射光方向和极慢的轨迹演化时间线。
- **scene_hierarchy**:
  - 恒星
  - 反射镜阵列
  - 光压矢量示意
  - 轨迹参考系与行星系统
  - 可跳转的 Caplan 变体（C03）
- **interactive_actions**:
  - 环绕恒星与反射镜；局部选中镜面单元
  - 显示/隐藏入射与反射光箭头
  - 切换短时间真实变化与百万年教学加速轨迹
  - 比较 Shkadov 与 Caplan 的原理卡，不混成同一个装置
- **deferred_explanatory_experiment**: （非当前观察 MVP；仅保留科学设计构想） 修改镜面积、反射率、恒星光度或教学时间跨度，观察估计推力和轨迹位移趋势。
- **limits_and_science**: 推力极小、长期姿态控制、反射镜所受辐射和热负荷；不要表现为恒星突然加速。
- **assets_reuse**: 共享恒星、反射镜曲面、光压箭头、长期轨迹绘制。


### 4.3 `C06` · 环世界 / Ringworld

- **development_status**: `core_later`
- **science_status**: `S2/SF`（开发前结合原始文献复核）
- **category**: 人工世界
- **definition**: 围绕恒星建设巨大的环形人工居住带。它与自由漂浮的 Banks Orbital 不同，结构和稳定性都是重大障碍。
- **hero_3d**: 镜头从恒星旁望向跨越天际的巨大环带，进入环带内壁才能发现大陆与海洋。
- **scene_hierarchy**:
  - 恒星
  - 完整环形结构
  - 内侧陆地/海洋区域
  - 光照与昼夜遮挡装置
  - 姿态与稳定性控制站
- **interactive_actions**:
  - 整体绕环飞行、局部内壁漫游
  - 点击居住区与支撑区域并切到剖面
  - 切换结构应力、光照和稳定性示意层
- **deferred_explanatory_experiment**: （非当前观察 MVP；仅保留科学设计构想） 切换环半径、旋转速度或主动稳定控制，观察等效重力与失稳风险的教学级趋势。
- **limits_and_science**: 不存在被动自定心的刚性环；材料强度、稳定控制、光照和大气约束难题。
- **assets_reuse**: 环带模块化几何、地表 LOD、星体与城市参照、内外相机状态。


### 4.4 `C15` · 旋转太空殖民地 / Rotating Space Habitat

- **development_status**: `first_wave_planned`
- **science_status**: `S1/S2`（开发前结合原始文献复核）
- **category**: 可居住巨构
- **definition**: 以旋转产生等效人工重力的太空居住结构。首版选 O’Neill 圆柱作为实例，麦肯德里圆柱（E03）保留为后续放大专题。
- **hero_3d**: 太空中可见完整圆柱、端盖和轴线；切到内壁城市、森林、水面并看见对侧地表悬在头顶。
- **scene_hierarchy**:
  - 圆柱外壳
  - 旋转轴和端盖
  - 内壁街区 / 生态区
  - 照明反射组件
  - 散热与空气水循环系统
- **interactive_actions**:
  - 外部环绕、放大至入口、进入内部探索
  - 选中一个生态区/端盖/镜面查看近景
  - 切换透明剖面与旋转参考系
  - 开启/关闭旋转重力解释层
- **deferred_explanatory_experiment**: （非当前观察 MVP；仅保留科学设计构想） 修改半径、角速度、光照方式，显示 a=ω²r 以及地表视野/光影变化；所有数值明确为教学示意。
- **limits_and_science**: 结构抗拉、封闭生态、姿态控制、科里奥利效应、维修成本；内部景观不等于已经解决生态设计。
- **assets_reuse**: O’Neill 圆柱外壳 GLB、内壁景观模块、地面尺度参照、照明镜面、双相机系统。



### 4.5 `C05` · 套娃脑 / Matrioshka Brain

- **development_status**: `core_later`
- **science_status**: `S2/SF`（开发前结合原始文献复核）
- **category**: 计算文明
- **definition**: 把恒星能量用于计算的多级结构构想；外层接收内层废热继续工作，但不可无限次无损回收。
- **hero_3d**: 多重套叠计算壳围绕太阳，镜头由外而内穿透不同温区与计算阵列。
- **scene_hierarchy**:
  - 中心恒星
  - 内层采能/高温计算区
  - 中层计算群
  - 外层低温散热区
  - 光通信链路
- **interactive_actions**:
  - 层级剖切、爆炸视图、选中计算节点
  - 显示层间能量流与温度热图
  - 切换低计算负载/高计算负载的散热变化
- **deferred_explanatory_experiment**: （非当前观察 MVP；仅保留科学设计构想） 调整层数、工作温度和利用效率；实时对比理论废热面积和层间能量预算的示意数值。
- **limits_and_science**: 热力学与低温散热约束、延迟、材料消耗；不预设虚构的无限算力。
- **assets_reuse**: 复用戴森群太阳与节点资产、层级结构 shader、温度视图。


### 4.6 `C08` · 黑洞发电站 / Black Hole Power Station

- **development_status**: `first_wave_planned`
- **science_status**: `S2/S3`（开发前结合原始文献复核）
- **category**: 黑洞能源
- **definition**: 在黑洞附近建设能源采集设施，利用吸积过程或旋转黑洞自旋能，而非主要依赖天体黑洞极弱的霍金辐射。
- **hero_3d**: 黑洞及弯曲的吸积盘被远处工业站群环绕；可独立关闭特效查看真实取能通道的示意。
- **scene_hierarchy**:
  - 事件视界（不可进入的边界）
  - 吸积盘与喷流
  - 外围磁场/能量抽取结构
  - 采集/转能站与辐射防护区
  - 远处观测站与尺度参照
- **interactive_actions**:
  - 自由环绕且设置安全缩放界限
  - 点击吸积盘、采集站、远方观测器聚焦
  - 切换引力透镜、等离子体流、磁场及能量通道示意
  - 播放吸积能转换 / Blandford–Znajek 机制分步动画
  - 关闭机制图层仅观察黑洞与设施
- **deferred_explanatory_experiment**: （非当前观察 MVP；仅保留科学设计构想） 切换黑洞质量、自旋的教学预设和吸积率，展示可提取功率趋势、辐射风险与能源利用路径；模型需显式声明近似。
- **limits_and_science**: 强辐射、高能喷流、潮汐/轨道限制、远距离传能与散热；不可把黑洞蒸发当成发电站的常规供能机制。
- **assets_reuse**: 黑洞透镜 shader、吸积盘、喷流粒子、环绕能源站 GLB、教学场线、能量账本。



### 4.7 `C09` · Birch 世界 / Birch World

- **development_status**: `core_later`
- **science_status**: `S2/SF`（开发前结合原始文献复核）
- **category**: 黑洞巨构
- **definition**: 围绕极大引力中心设想的巨型人造世界。经典 supramundane planets 与网络常见黑洞壳版本需明确区分。
- **hero_3d**: 黑洞与巨大分层栖居结构并置，外部缩放后进入剖切状态查看居住层。
- **scene_hierarchy**:
  - 中央引力中心
  - 外层人工栖居结构
  - 可居住表面
  - 支撑/轨道动力学系统
  - 交通和能源补给层
- **interactive_actions**:
  - 从外部到壳层俯视、局部聚焦
  - 多层透明剖切
  - 切换半径与局部有效重力示意
- **deferred_explanatory_experiment**: （非当前观察 MVP；仅保留科学设计构想） 选择中心质量和层半径预设，显示重力与结构负担的相对趋势。
- **limits_and_science**: 不暗示无支撑的静态刚性壳可以自然悬浮；具体构型依赖极端主动支撑。
- **assets_reuse**: 多层壳体、黑洞视觉模块、支撑结构解释层。


### 4.8 `E37` · 巴萨德冲压飞船 / Bussard Ramjet

- **development_status**: `core_later`
- **science_status**: `S2`（开发前结合原始文献复核）
- **category**: 星际推进
- **definition**: 用巨大磁场收集星际稀薄物质作为推进所需燃料的设想，采集阻力与聚变反应实现难度是关键问题。
- **hero_3d**: 长航程飞船前方展开磁场漏斗，镜头沿粒子运动方向进入反应区。
- **scene_hierarchy**:
  - 磁漏斗
  - 采集与减速区
  - 反应区
  - 喷口
  - 屏蔽和散热
- **interactive_actions**:
  - 转动飞船和观察磁场范围
  - 点击磁漏斗与反应器
  - 暂停粒子流查看速度和捕获路径
  - 显示推力与阻力的账本
- **deferred_explanatory_experiment**: （非当前观察 MVP；仅保留科学设计构想） 修改速度、粒子密度和采集半径，观察净推力的教学趋势。
- **limits_and_science**: 星际介质稀薄、阻力、高速辐射、经典氢聚变路径困难；不能宣称无限加速。
- **assets_reuse**: 模块化飞船、GPU 粒子流、磁场线示意、参数曲线。


### 4.9 `E18` · 冯·诺依曼探针 / Von Neumann Probe

- **development_status**: `core_later`
- **science_status**: `S1/S2`（开发前结合原始文献复核）
- **category**: 自复制工业
- **definition**: 能利用外部资源建立生产链并复制自身的自动探针设想，工业依赖和故障率决定扩张速度。
- **hero_3d**: 探针抵达小行星，采矿建厂复制子机，镜头进一步拉远到多个恒星系统。
- **scene_hierarchy**:
  - 母探针
  - 采矿与分选模块
  - 自动化工厂
  - 子探针
  - 星际节点与通信
- **interactive_actions**:
  - 局部观察与部件选择
  - 暂停建造时间线单步看复制
  - 切换星系视图观察扩张波前
  - 点击故障节点排查短板
- **deferred_explanatory_experiment**: （非当前观察 MVP；仅保留科学设计构想） 修改复制周期、资源丰度、故障率和航行速度，观察群体增长和扩张边界。
- **limits_and_science**: 自复制需要完整工业生态，不是无成本纳米魔法；通信与资源受限。
- **assets_reuse**: 探针 GLB、矿区地形、自动工厂组件、银河节点图与同步模拟。


### 4.10 `E39` · 曲速引擎 / Alcubierre Warp Drive

- **development_status**: `core_later`
- **science_status**: `S3`（开发前结合原始文献复核）
- **category**: 时空理论
- **definition**: 一种广义相对论中的特定时空度规构想，是否存在可制造、稳定且物理允许的装置尚无结论。
- **hero_3d**: 船体位于示意时空泡中央，星光光路被可视化网格扭曲。
- **scene_hierarchy**:
  - 飞船
  - 泡前缘/后缘的曲率示意
  - 度规网格
  - 光锥/光路解释层
  - 能源要求说明卡
- **interactive_actions**:
  - 外部与泡内观察
  - 切换理论示意与无特效模式
  - 点击几何区域看曲率解释
  - 对比亚光速正常飞行
- **deferred_explanatory_experiment**: （非当前观察 MVP；仅保留科学设计构想） 改变几何形态的教学参数以观察示意空间变化；禁止直接承诺可用超光速推进。
- **limits_and_science**: 负能量、能量条件、因果关系、泡形成和控制都存在未解问题。
- **assets_reuse**: 飞船主体、时空网格与光线路径 shader、标注层。


### 4.11 `E43` · 可穿越虫洞 / Traversable Wormhole

- **development_status**: `core_later`
- **science_status**: `S3`（开发前结合原始文献复核）
- **category**: 时空理论
- **definition**: 数学时空模型中允许的特殊捷径构想，但宏观稳定可穿越虫洞尚无实证，通常涉及违反经典能量条件的物质。
- **hero_3d**: 入口侧远方星域与出口侧陌生星域的可见联系，切换外部结构和贯穿观察。
- **scene_hierarchy**:
  - 入口嘴
  - 喉道示意
  - 出口嘴
  - 光路扭曲层
  - 稳定性与潮汐风险层
- **interactive_actions**:
  - 自由围绕入口转动相机
  - 点击喉道剖切结构并聚焦
  - 以教学镜头模拟沿通道穿越
  - 开关因果与时空图层
- **deferred_explanatory_experiment**: （非当前观察 MVP；仅保留科学设计构想） 调节口径/喉长等示意参数，显示通行约束与物理未解条件；不将它当作可工程化交通门。
- **limits_and_science**: 能量条件、拓扑/因果、宏观稳定性和可制造性；显著标示理论模型。
- **assets_reuse**: 双端环境、时空隧道 shader、光路扭曲及风险图层。


### 4.12 `C11` · 银河工程 / Galactic Engineering

- **development_status**: `core_later`
- **science_status**: `S2/SF`（开发前结合原始文献复核）
- **category**: 星系尺度
- **definition**: 以极长时间尺度调整众多恒星轨道或工业网络分布的综合未来设想；没有单一公认工程设计。
- **hero_3d**: 银河盘与多个关键星团，镜头跨越数十万光年的尺度变化展示部署网络。
- **scene_hierarchy**:
  - 银河系整体
  - 星区/旋臂
  - 星团
  - 代表性恒星推进设施
  - 导航与能源网络
- **interactive_actions**:
  - 从银河视图缩放到星团，再到单颗恒星
  - 选中节点查看轨迹与演化历程
  - 启用长时间尺度轨道预测示意
  - 切换自然银河与人工重排假想对照
- **deferred_explanatory_experiment**: （非当前观察 MVP；仅保留科学设计构想） 修改示意推进覆盖率和演化时间窗，观察轨道结构趋势，不将画面视为精确 N 体结果。
- **limits_and_science**: 星系质量规模、极长施工周期、动力学不稳定、计算复杂度；避免声称银河整体可随意驾驶。
- **assets_reuse**: 星系多级渲染、点云、节点选择、轨迹与时间轴。

## 5. 当前唯一纵向切片：C01 戴森群观察模式

### 5.1 目标体验

**艺术与镜头方向**：偏写实、克制的硬科幻工业设计，强调巨型阵列在强烈逆光中的尺度压迫，局部维护设施/细小交通工具作为稳定尺寸参照。整体不应看起来像简单粒子特效或金色玩具模型。支持 16:9 主视图，也兼容不同宽高比。

**C01 四段自由观察路径**：

1. **远景惊叹**：巨大太阳居中或偏心，卫星群延伸到画面边缘，轨道族层次清楚且是离散个体；允许直接拖动旋转。
2. **掠过巨构**：通过可中断的焦点/镜头移动，来到一组比旁边维修小艇更庞大的采能翼附近，看到桁架遮挡、面板阵列、极远的恒星背景；不要求载具驾驶。
3. **单体检查**：锁定某颗代表卫星，围绕其外缘、散热翼、支撑结构观察；点击三个部件能够精确聚焦，必要时切换半透明/爆炸视图。
4. **规模揭示**：逐层拉远，从一颗卫星 → 轨道群 → 恒星系统，显示“刚才的庞然大物不过是数不清的个体之一”。任何阶段都能退回之前的焦点。

**规模表现约束**：必须提供可见尺寸参照（例如维护飞船/舱口/检修桁架），但不允许凭空编造其“真实米数”；卫星群远景通过重复结构和遮挡建立密度，绝不能渲染成实心壳。相机过渡不得强制自动转场或遮挡选中部件。

首屏在太阳周围看到由**独立轨道卫星**构成的戴森群（不是连续的实体壳）。用户可以旋转星系全景，选择一个有稳定 ID 的轨道族，继续缩放聚焦到一个可点击的代表性采能卫星，环绕它观察并点击板面/散热器/姿态部件，再逐级返回太阳系全景。卫星公转可以暂停；轨道/能量/热/光照示意层可分别开关。

### 5.2 场景树与资源

```text
C01DysonScene
 ├─ Star (sun shader, non-collidable)
 ├─ PlanetReference (Earth orbit visual reference; scale disclosed)
 ├─ OrbitFamilies (3 representative groups)
 │   ├─ OrbitalLines
 │   └─ SatelliteSwarm (instanced at distant scales)
 ├─ RepresentativeCollector (detail model, focusable)
 │   ├─ CollectorSurface
 │   ├─ SupportTruss
 │   ├─ Radiator
 │   └─ AttitudeModule
 ├─ ExplanationLayers (sunlight / capture / waste heat / orbit)
 └─ FocusAnchors (system / orbit family / collector / component)
```

> 这里只规定可识别的教学结构，不规定必须有几千颗逐个真实轨道积分的卫星。远景采用可重复生成的分布示意，近景加载单体模型。

### 5.3 C01 原理教学小节（非游戏）

1. **戴森群是什么**：离散的绕日采能卫星，不是实心球壳；对比二者结构差异。
2. **单颗卫星怎样采能**：太阳光射向采能面，转换设备输出电能，散热器向太空排放废热；能量流属于示意。
3. **卫星为什么分布在轨道上**：解释轨道族、公转、倾角、数量级，以及远景实例化的表现约束。
4. **会影响行星日照吗**：可打开地球轨道及视线方向示意；明确“总采集份额 ≠ 任一行星的具体遮挡率”。
5. **工程有什么难点**：轨道管理、建造材料、维修、散热、供能链路等。

每小节允许「播放 → 暂停 → 单步（如适用） → 重置」，不需要成功失败结果。

### 5.4 C01 Gate 验收顺序

| Gate | 范围 | 验收标准 |
| --- | --- | --- |
| G0 | 渲染基础 + 交互空壳 | 全屏 Canvas，基本光照，鼠标/触控旋转缩放，点击选中，重置视图 |
| G1 | 多尺度戴森群与震撼构图 | 太阳、3 组代表轨道、卫星群；全景/轨道/单体层级流畅聚焦；实例 ID 稳定；远景轮廓形成鲜明巨构尺度感 |
| G2 | 高精度卫星近景 | 必须完成 Tripo 原始高模 → Blender 结构精修与分件 → 运行时多级 GLB；采能板/桁架/散热器/姿态模块可辨识且可聚焦；近景有强烈巨物感，源资产与运行时资产齐备且可复现 |
| G3 | 机制讲解 | 轨道公转播放暂停；能量/废热/光照图层可开关，讲解和热点同步 |
| G4 | 内容、稳定性与双重质量 Gate | 回退/刷新/改尺寸/缩放边界正确、无明显穿模、有实际性能测量；提供全景、掠过、单体 3 张审查视图及一段可中断的镜头尺度揭示演示；美术保真与实时性能分别验收 |

只有 **C01 的 G4 完成后**，才评估是否启动 C15。C08 等待 C15 的实际完成情况复核。

### 5.5 C01 的最低完成定义

- [ ] 浏览器里是真 3D，可自由旋转、缩放、平移，不是录屏/全景静态图。
- [ ] 远景能理解“离散卫星群围绕太阳”的空间结构；不把卫星画成实体球壳。
- [ ] 一眼能看出巨大工业构造；近景有维护小艇/检修模块等合理尺度参照、遮挡与几何细节，带有明显纵深。
- [ ] 代表性高精度卫星具备 Tripo 原件、Blender 可编辑工程、结构分件和正式 GLB LOD 交付，支持近距离旋转检查；关键部件不是无法拾取的一体化模型。
- [ ] 各 LOD 的外形、材质色调、结构位置连续，切换时不会弹跳或露出破面；原始高模不直接实例化到整片戴森群。
- [ ] 有至少三处标志构图：太阳系全景、巨大采能翼近距离掠过、单卫星部件检查；每处能手动转相机和自由缩放。
- [ ] 强烈阳光/辉光不淹没卫星，关闭 Bloom 等效果后仍保有巨构轮廓。
- [ ] 至少 3 个可选卫星实例拥有稳定 ID；其中 1 个能加载近景部件模型。
- [ ] 从全景到单体、到 3 个部件均可聚焦、继续环绕、逐层返回。
- [ ] 轨道运动可暂停继续，当前选中的动态卫星不跳镜头。
- [ ] 轨道/能量/废热/光照图层与解说独立开关，关闭后场景依然清晰。
- [ ] 科学状态、示意比例与不确定性有明确标签，不声称真实百万体模拟。
- [ ] 基础键盘可达、减弱动画、窗口 resize、 WebGL 失败提示具备合理降级。
- [ ] **没有**任务、资源条、建造栏、评分或无法使用的占位游戏按钮。

## 6. 面向 Three.js / R3F 的精简实施规范

### 6.1 技术选择

**视觉与性能优先级**：G0 允许纯几何打底，但 G1/G2 必须以体量参照、镜头、光照、模型细节为质量门槛。远景靠实例化撑规模、近景靠高细节 LOD 和可拾取子模型撑观察；避免全场景海量高模造成卡顿。预设镜头应使用物体包围体、局部锚点与保护距离，而非硬编码单一巨大拉近值。

首选 React + TypeScript + Vite + Three.js/R3F。模型用 GLB/glTF，Three.js primitives 可支撑 G0/G1，G2 要有真正可理解的卫星部件结构。正式近景工业模型必须经过 Tripo → Blender 精修、拆件、优化 → GLB 的可追溯资产流程。恒星着色器、轨道线、远景实例等仍适合程序化生成，不能盲目将所有图层做成 Tripo 模型。

- **场景运行与知识内容分离**：Renderer / CameraFocus / Selection / SceneLayers / Narration 数据驱动。
- **多尺度**：分层局部坐标系 + 距离映射 + LOD，避免巨构天文尺度单一浮点坐标带来的精度问题。
- **点击拾取**：Raycaster 或等价方案；实例化卫星必须维护真实可定位 `object_id` 映射。
- **材质**：恒星表现与卫星轮廓都要清晰；不能为了辉光把卫星吞没。
- **性能**：按实际设备测帧耗、实例数、draw calls，不以未经测试的帧率作为承诺。
- **物理**：可使用轨道参数驱动的展示动画；无真实 N 体/精确遮挡气候计算承诺。

### 6.2 Tripo + Blender 高精度建模与浏览器资产管线（MUST）

**资产先于最终特效验收，但不先于交互灰盒**：G0/G1 可先验证相机与卫星群；G2 必须完成有质量的真实近景模型，不能用临时资产长期冒充正式成果。

| 阶段 | 执行软件 | 输入 → 输出 | 质量检查点 |
| --- | --- | --- | --- |
| A0 视觉与结构设计 | 参考图/结构草案 | 造型轮廓、构件逻辑、尺寸关系、分件方案 | 巨物感、工业可信度、与可点击热点一致；概念图不等于结构真相 |
| A1 高精度初模 | **Tripo** | 每类关键模型生成高精度候选，保存原始 GLB/贴图及任务来源 | 结构完整；无明显畸形/粘连/污染，不合格重生 |
| A2 精修与模块化 | **Blender** | 调整比例/法线/材质，重建不合理部位，拆分采能面、桁架、散热、姿态、维护模块 | 近距环绕、三视角审查；可独立选取；主工程可编辑 |
| A3 游戏资产优化 | **Blender + 导出工具** | 重拓扑或减面、UV/烘焙、LOD0/1/2、远景实例化轮廓、GLB 与 PBR 贴图 | 结构不消失、法线/切线/UV 正确；压缩前后比对 |
| A4 集成与回归 | **Three.js/R3F** | 装载 GLB、拾取节点、局部镜头、剖面/爆炸、LOD/资源加载 | 三视角保真、旋转/选中稳定、性能实测、无明显穿模或闪烁 |

#### 6.2.1 模型精度四级管理

| 级别 | 资产 | 角色 | 规则 |
| --- | --- | --- | --- |
| SOURCE_MASTER | 未优化高精度 Tripo 原始资产 + Blender 精修源 | 生成/重加工、材质烘焙依据 | **保留，不在浏览器中批量实例化** |
| RUNTIME_LOD0 | 精修后的最高质量实时 GLB | 单颗选中卫星、组件特写 | 保留可见桁架、厚度、分层、检修细节；按设备实测使用 |
| RUNTIME_LOD1 | 保轮廓与主体的中精度 GLB | 中景及过渡、低配置设备 | 不可改变整体结构、姿态与部件布局 |
| RUNTIME_LOD2 / INSTANCED | 低精度卫星与批量实例 | 宏观轨道群、大规模远景 | 优先轮廓、实例拾取和稳定 ID，不加载无意义微结构 |

LOD 阈值应依据**屏幕投影尺寸 / 相机距离 / GPU 负荷**选择并设置切换缓冲，不使用“所有 GLB 必须少于 X 三角形”的盲目统一阈值。MVP 以 PC 浏览器为首要目标；移动端可降级，仍保留核心观察能力。

#### 6.2.2 C01 正式建模分工

- **太阳**：程序化球面/着色器 + 合理光照与日冕表现，不送 Tripo。
- **轨道分布与能量示意**：Three.js 几何、实例、线和教学特效，不送 Tripo。
- **采能卫星主模型**：Tripo 产出高精度造型候选；Blender 保留/重制承力主桁架、分块采能面（不是无厚度发光贴片）、背面散热结构、姿态调节/推进单元、可维护锚点。
- **维护小艇/接口**：如需要尺度参照，可以 Tripo 制作并由 Blender 精修；它必须成为有合理尺度关系的参照物，而不是随意变大的装饰品。
- **远景卫星**：从同一设计提取/重构低精度版本，用实例化渲染；与主模型保持对应的外轮廓和朝向。
- **科学定位**：整颗采能卫星的具体尺寸与机械方案为推测性设计；如果无可靠工程数据，UI 标明「概念化工业设计」，避免假装未来技术有唯一真实外观。

#### 6.2.3 Blender 必须处理

1. 保留原始 Tripo 导入件；另建可编辑精修集合。校正轴向、缩放、根节点/原点和局部可聚焦枢轴，统一单位声明。
2. 排查浮空碎片、交叠壳面、错误法线、穿插、自相交、薄片闪烁、不必要的背景/地面污染与材质丢失。
3. 关键可点击结构独立 Mesh/Node，绑定稳定 `object_id`；对可展开部件分别设轴心、收拢与爆炸预设。
4. 按实际画面需求进行减面、手工重建或重拓扑，使用法线贴图/贴图烘焙保留局部纹理；避免靠低质量自动减面导致面板破裂。
5. 整理 PBR 材质、UV、纹理大小与贴图压缩；如目标运行环境支持可使用 Meshopt、KTX2/Basis 等优化，记得验证加载器兼容性。
6. 导出按层命名的 GLB，保留 source `.blend` 与导出脚本/记录；检查在浏览器里能单击、选中、聚焦、拆解。

#### 6.2.4 美术验收与回退规则

- **近景美术 Gate**：正面、侧后方、掠过三个视角检查，关闭 Bloom 仍能读出结构。巨大采能翼有真实厚度与层次，桁架结构不应只有贴图或严重 AI 变形。
- **资产可用 Gate**：打开独立 GLB 预览，确认尺寸方向、Mesh 节点、UV、材质、枢轴、部件碰撞/拾取目标、分件与可见轮廓。
- **切换 Gate**：从实例组进入单颗卫星，LOD 与实体选择连续，不得出现突然缩放、镜头跳跃、部件布局换样。
- **性能 Gate**：以实际目标设备给出 draw calls、帧时间、加载时长、显存/纹理用量；未经实测只称“待测”，不能凭空宣称 60 FPS。
- **否决条款**：仅凭 Tripo 出图成功或 Blender 导出成功不能验收；若结构错乱、模型玩具感严重、近景无深度，则进入 A1/A2 迭代，不能靠增加粒子/镜头特效掩盖。
- **步骤记录**：每次模型迭代记录来源版本、文件名、审核截图、资产体积、渲染时长、面数和仍待修问题到 `PROGRESS.md`。Git 适合记录配置、脚本与小文件，大体积二进制需按项目现有素材存储方案管理。

**关联文件**：`C01_asset_manifest_v0.8.json` 列出本场景可选源模型、节点/LOD/点击目标和资产审核要求；实际文件不存在时 `status` 必须保持 `planned`，绝不虚构已经生成成功的 GLB。

### 6.3 最小项目目录

```text
docs/COSMIC_ENGINEERING_EXPLORER.md     # 本文
content/concept_catalog.json             # 77 概念唯一索引
content/scenes/C01/scene.json            # 场景树、尺度、展示层
content/scenes/C01/hotspots.json         # 可拾取对象和解释文本
content/scenes/C01/camera-presets.json   # 全景、轨道族、单体、部件
content/scenes/C01/mechanism.json        # 机制图层与分步说明
content/scenes/C01/narration.json        # 解说文本
src/scene/                               # 场景渲染、LOD、相机、拾取
src/features/explore/                    # 交互 UI、聚焦层级、图鉴面板
assets/source/tripo/                      # 原始高精度模型与生成元信息
assets/source/blender/                    # 可编辑的 Blender 精修主工程
assets/runtime/C01/                      # LOD0/1/2 GLB 与运行时贴图
content/scenes/C01/asset-manifest.json   # 资产状态、LOD、子部件映射
assets/audio/                            # 可选解说音频（逐门槛加入）
PROGRESS.md                               # 进度与验收记录
```

当前**不要**创建 `src/features/challenge`、`src/features/sandbox`、`src/gameplay`、`src/economy`，不要把已有 v0.6 游戏相关 JSON 链接成生效配置。

### 6.4 数据契约

- `concept_id`：稳定使用 Cxx / Exx，原 ID 不改变。
- `development_status`：当前项目阶段 `first_wave_planned / core_later / backlog`；全局 `active_implementation_scene=C01`。
- `object_id`：独立于模型文件节点名；`instanceId` 不可直接作为业务 ID 保存。
- `focus_target`：局部锚点与安全半径；需要相机过渡和返回栈。
- `science_level`：S1/S2/S3/SF，可注明待核验。
- `visual_scale` 与 `physical_scale`：明确分开，必要时给出数量级说明。
- `narration_step`：与对象焦点、图层、动画片段关联。
- `view_state`：仅包含相机/聚焦/选中/图层/讲解进度；不包含施工方案。

### 6.5 验证项

1. 点击任意远景卫星实例，不会选错实体或切换到其他卫星。
2. 缩放到高精度 GLB 再返回 InstancedMesh，焦点与选择 ID 不变。
3. 动态卫星公转期间聚焦，其镜头平稳且可自行旋转、缩放、重置。
4. 通过相机返回栈依次回到卫星、轨道群、全景。
5. 用单步动画查看能量流时，无虚假的“能量凭空产生”效果。
6. 教学比例与真实尺度区别、科学状态和未证实部分被明确显示。
7. G0-G4 每次验收结果写入 `PROGRESS.md`，未通过不自动扩展新场景。


## 7. 65 个候选概念（资料保留、暂不生成 3D）

> **这里的 `interactive_3d_idea` 只是未来构想或轻量预览，不属于当前观察 MVP 交付要求。** 候选可以只有图文卡片、科学来源、关联导航；暂不要求 GLB、自由相机、热点、机制动画或参数实验。
### 原 C 系列降级候选（7 个）

#### `C03` · Caplan 恒星发动机

- **development_status**: `backlog`
- **science_status_legacy**: `S2`（待逐条复核）
- **core_concept**: 把恒星自身的物质抽出来做燃料，通过聚变与高速喷流把恒星系统当成一艘超巨型火箭。
- **interactive_3d_idea_if_promoted**: 从恒星系统全景观察采料平台与两股喷流，再点击进入采料器、聚变区和喷管局部。用户可绕单个模块旋转、剖切内部，并沿等离子体流追踪“恒星物质→处理→聚变→高速喷流”的全过程。时间加速展示恒星与整套推进系统在银河中的缓慢迁移。
- **limits_reference**: 它不是凭空“喷太阳”，而依赖一个完整的能源、采料、聚变、喷流与轨道控制基础设施。

#### `C04` · 恒星采矿

- **development_status**: `backlog`
- **science_status_legacy**: `S2`（待逐条复核）
- **core_concept**: 主动增强恒星的物质外流，再捕获氢、氦和重元素，把恒星本身变成资源矿山。
- **interactive_3d_idea_if_promoted**: 围绕恒星自由飞行，点击不同采矿弧、磁场收集器和元素处理站。近景可观察等离子体沿磁力线被引导，远景可观察恒星整体质量流失。用户可切换自然恒星风/主动采矿，调节抽取率并时间加速，看恒星亮度、质量和下游工业供料如何变化。
- **limits_reference**: “从恒星取物质”与“从行星采矿”完全不同，核心难点在高温等离子体、巨大引力井和长期恒星演化反馈。

#### `C07` · Nicoll-Dyson 光束

- **development_status**: `backlog`
- **science_status_legacy**: `S2/SF`（待逐条复核）
- **core_concept**: 利用分布式恒星能源收集与定向发射设备，设想形成星际尺度的高功率相干光束；能源采集不意味着可实现无损集中与无限精确指向。
- **limits_reference**: 这是极端外推而不是成熟工程方案；“把整颗恒星的功率变成一条完美激光”并非免费或无损。

#### `C10` · 人工黑洞飞船

- **development_status**: `backlog`
- **science_status_legacy**: `S3`（待逐条复核）
- **core_concept**: 通过人工微型黑洞的假设性霍金辐射供能和推进；其制造、喂养、动量约束、辐射准直和最终蒸发均尚未解决。
- **limits_reference**: 黑洞并非永恒。该方案正是利用蒸发；难点是把“会蒸发”控制成稳定、可喂养、可定向的发动机。

#### `C12` · 人工宇宙

- **development_status**: `backlog`
- **science_status_legacy**: `S3`（待逐条复核）
- **core_concept**: 在极端量子宇宙学模型中尝试产生与原有时空不同的扩张区域；属于高度推测的理论构想而非已掌握的制造工艺。
- **limits_reference**: 这是理论宇宙学问题，不应表述成“已经知道如何在实验室制造宇宙”。关键物理与可操作性远未解决。

#### `C13` · 行星发动机

- **development_status**: `backlog`
- **science_status_legacy**: `SF`（待逐条复核）
- **core_concept**: 使用行星表面或内部的假想巨型推进设施改变天体轨道，属于以科幻为主的天体迁移情境，必须单独评估推力与结构负荷。
- **limits_reference**: 这是很适合图鉴的“科幻案例”，但不宜把表面巨型发动机描述成已经有成熟物理工程方案。

#### `C14` · 恒星能量武器（Starkiller 类）

- **development_status**: `backlog`
- **science_status_legacy**: `SF`（待逐条复核）
- **core_concept**: 以恒星能源为背景构造超尺度定向武器的科幻设定；不等于现实中的戴森群或恒星采矿工程，也不应宣称物理可实现。
- **limits_reference**: 不要把 Starkiller Base 当成真实的 Star Lifting 或戴森工程。它的价值更适合放在“科幻设定审查”栏目。

### 原 E 系列候选（58 个）

#### `E01` · 奥尔德森盘 / Alderson Disk

- **development_status**: `backlog`
- **science_status_legacy**: `S2/SF`（待逐条复核）
- **core_concept**: 围绕恒星建造巨型盘状世界，恒星位于中央开孔附近。
- **interactive_3d_idea_if_promoted**: 从地表城市一路拉远到整张圆盘；拆解光照带、热区、结构支撑与昼夜机制。

#### `E02` · 班克斯轨道环 / Banks Orbital

- **development_status**: `backlog`
- **science_status_legacy**: `S2`（待逐条复核）
- **core_concept**: 超大尺度旋转环形栖居地，以自转产生人工重力。
- **interactive_3d_idea_if_promoted**: 从居民视角抬头看到世界在天空弯回；调节半径、转速与表面重力。

#### `E03` · 麦肯德里圆柱 / McKendree Cylinder

- **development_status**: `backlog`
- **science_status_legacy**: `S2`（待逐条复核）
- **core_concept**: 把 O’Neill 圆柱放大到数千公里量级的旋转世界。
- **interactive_3d_idea_if_promoted**: 外部巨构→透明剖切→内部海陆；显示转速、气候分区与结构应力。

#### `E04` · 拓扑城 / Topopolis

- **development_status**: `backlog`
- **science_status_legacy**: `S2/SF`（待逐条复核）
- **core_concept**: 一根极长的旋转居住管道，可沿恒星轨道缠绕多圈。
- **interactive_3d_idea_if_promoted**: 第一人称沿管内城市飞行，再缩放到恒星尺度揭示其真实几何。

#### `E05` · 壳世界 / Shellworld

- **development_status**: `backlog`
- **science_status_legacy**: `S2`（待逐条复核）
- **core_concept**: 在行星外增加一层或多层人工壳，把可居住面积叠加起来。
- **interactive_3d_idea_if_promoted**: 行星剖切；逐层打开壳层，解释支撑、交通、光照和热管理。

#### `E06` · 人工行星 / Artificial Planet

- **development_status**: `backlog`
- **science_status_legacy**: `S2/SF`（待逐条复核）
- **core_concept**: 从零组装行星级质量与生态环境，而非改造既有行星。
- **interactive_3d_idea_if_promoted**: 核心→地幔→磁场→大气→海洋逐层组装；参数实验验证重力与热演化。

#### `E07` · 机械行星 / Machine Planet

- **development_status**: `backlog`
- **science_status_legacy**: `S2/SF`（待逐条复核）
- **core_concept**: 把天然卫星、小行星或行星逐步机械化，内部改造成工业与计算结构。
- **interactive_3d_idea_if_promoted**: 天然天体/人工层双视图；剖开地壳显示工厂、能源网与散热结构。

#### `E08` · 世界飞船 / World Ship

- **development_status**: `backlog`
- **science_status_legacy**: `S1/S2`（待逐条复核）
- **core_concept**: 让一座完整城市乃至文明长期生活在一艘巨型星际飞船中。
- **interactive_3d_idea_if_promoted**: 舰体外部→生态舱→城市→推进器；显示航程、人口、生态闭环与辐射防护。

#### `E09` · 世代飞船 / Generation Ship

- **development_status**: `backlog`
- **science_status_legacy**: `S1/S2`（待逐条复核）
- **core_concept**: 用数代人的时间完成星际航行，飞船本身成为社会与生态系统。
- **interactive_3d_idea_if_promoted**: 时间轴驱动船内世代更替；对比推进速度、航程和人口结构。

#### `E10` · 行星玫瑰阵列 / Klemperer Rosette

- **development_status**: `backlog`
- **science_status_legacy**: `S1/S2`（待逐条复核）
- **core_concept**: 多颗天体按对称几何共同运动，形成极具秩序感的人工轨道构型。
- **interactive_3d_idea_if_promoted**: 上帝视角拖拽行星；实时显示轨道稳定性和微小扰动后的演化。

#### `E11` · 黑洞太阳系 / Black Hole Solar System

- **development_status**: `backlog`
- **science_status_legacy**: `S2/SF`（待逐条复核）
- **core_concept**: 以黑洞作为中央引力源，让人工世界在安全轨道上运行，并另行解决照明与能源。
- **interactive_3d_idea_if_promoted**: 黑洞透镜+轨道世界；拆解照明、潮汐、吸积盘风险与轨道安全区。

#### `E12` · 人工太阳系 / Artificial Solar System

- **development_status**: `backlog`
- **science_status_legacy**: `S2/SF`（待逐条复核）
- **core_concept**: 人工制造或搬运恒星、行星，设计一个从轨道开始就“人为规划”的恒星系统。
- **interactive_3d_idea_if_promoted**: 从空旷星际空间逐步加入恒星和行星；实时验证共振、宜居带与长期稳定性。

#### `E13` · 木星脑 / Jupiter Brain

- **development_status**: `backlog`
- **science_status_legacy**: `S2/SF`（待逐条复核）
- **core_concept**: 把木星质量级物质重构为超级计算与散热系统。
- **interactive_3d_idea_if_promoted**: 木星拆解→计算节点→能量层→散热层；显示计算量与散热上限。

#### `E14` · 计算质 / Computronium

- **development_status**: `backlog`
- **science_status_legacy**: `S2/SF`（待逐条复核）
- **core_concept**: 将普通物质优化为单位质量/能量计算效率极高的“计算材料”。
- **interactive_3d_idea_if_promoted**: 原子/材料尺度切换；展示物质被重新排列成计算节点与热管理结构。

#### `E15` · 银河脑 / Galactic Brain

- **development_status**: `backlog`
- **science_status_legacy**: `S2/SF`（待逐条复核）
- **core_concept**: 把大量恒星系统连接成银河尺度分布式计算网络。
- **interactive_3d_idea_if_promoted**: 从单节点缩放到银河；显示光速延迟、同步边界与局部自治。

#### `E16` · 黑洞计算机 / Black Hole Computer

- **development_status**: `backlog`
- **science_status_legacy**: `S3`（待逐条复核）
- **core_concept**: 利用黑洞热力学、极高信息密度与极端时空条件讨论终极计算。
- **interactive_3d_idea_if_promoted**: 事件视界附近的信息/热流示意；强调“理论极限”而非现成设备。

#### `E17` · 时间膨胀文明 / Time-Dilation Civilization

- **development_status**: `backlog`
- **science_status_legacy**: `S2/SF`（待逐条复核）
- **core_concept**: 在强引力附近生活或计算，让本地时间与远方宇宙产生巨大差异。
- **interactive_3d_idea_if_promoted**: 双时钟实时对比；拖动轨道半径观察时间膨胀与潮汐风险。

#### `E19` · 自复制工业 / Self-Replicating Factory

- **development_status**: `backlog`
- **science_status_legacy**: `S1/S2`（待逐条复核）
- **core_concept**: 自动采矿、制造设备并扩建产能，使巨构建设从线性变成指数扩张。
- **interactive_3d_idea_if_promoted**: 月面小工厂逐步变成工业带；显示复制周期、资源消耗与增长曲线。

#### `E20` · 银河互联网 / Galaxy Internet

- **development_status**: `backlog`
- **science_status_legacy**: `S2`（待逐条复核）
- **core_concept**: 用激光、中继站和自治缓存构建跨恒星的信息网络。
- **interactive_3d_idea_if_promoted**: 星图上的光束与中继；切换实时/延迟视图，直观看到光速限制。

#### `E21` · 恒星引力透镜网络 / Stellar Gravitational Lens Network

- **development_status**: `backlog`
- **science_status_legacy**: `S1/S2`（待逐条复核）
- **core_concept**: 利用恒星引力透镜焦线做超远距观测或通信中继。
- **interactive_3d_idea_if_promoted**: 追踪光线绕恒星弯曲并汇聚；移动接收器寻找焦区。

#### `E22` · 脉冲星导航网 / Pulsar Navigation Grid

- **development_status**: `backlog`
- **science_status_legacy**: `S1/S2`（待逐条复核）
- **core_concept**: 利用脉冲星稳定周期作为天然银河 GPS，也可设想主动维护信标。
- **interactive_3d_idea_if_promoted**: 银河地图叠加脉冲到达时间；飞船用多源计时反算位置。

#### `E23` · 恒星返老还童 / Stellar Rejuvenation

- **development_status**: `backlog`
- **science_status_legacy**: `S2/S3`（待逐条复核）
- **core_concept**: 通过补充燃料、混合内部物质或调节质量，延长恒星可用寿命。
- **interactive_3d_idea_if_promoted**: 恒星剖切；调节氢供给与质量，观察亮度、寿命和演化路径变化。

#### `E24` · 人工点燃木星 / Artificially Ignited Jupiter

- **development_status**: `backlog`
- **science_status_legacy**: `SF`（待逐条复核）
- **core_concept**: 设想把气态巨行星变成第二颗“太阳”；单靠现有木星质量并不足以持续氢聚变。
- **interactive_3d_idea_if_promoted**: 压缩/加热演示与“为何失败”模式；突出质量门槛而不是只做爆炸。

#### `E25` · 恒星融合工程 / Stellar Merger Engineering

- **development_status**: `backlog`
- **science_status_legacy**: `S2/SF`（待逐条复核）
- **core_concept**: 长期改变双星轨道，主动促成两颗恒星合并并利用其结果。
- **interactive_3d_idea_if_promoted**: 双星螺旋靠近；显示角动量、质量转移、潮汐与并合后状态。

#### `E26` · 人工脉冲星 / Artificial Pulsar

- **development_status**: `backlog`
- **science_status_legacy**: `S2/S3`（待逐条复核）
- **core_concept**: 干预中子星自转、磁场或辐射束，使其成为可控灯塔或能源节点。
- **interactive_3d_idea_if_promoted**: 磁轴/自转轴分离；观察射束扫过银河并调整周期。

#### `E27` · 恒星隐身工程 / Stellar Cloaking

- **development_status**: `backlog`
- **science_status_legacy**: `S2`（待逐条复核）
- **core_concept**: 用遮光与废热管理结构降低恒星在特定方向上的可见特征。
- **interactive_3d_idea_if_promoted**: 远方观测视角切换；比较可见光、红外与遮挡几何。

#### `E28` · 人工凌日信标 / Artificial Transit Beacon

- **development_status**: `backlog`
- **science_status_legacy**: `S1/S2`（待逐条复核）
- **core_concept**: 让规则几何体周期性凌日，用不自然的光变曲线向外星文明“打招呼”。
- **interactive_3d_idea_if_promoted**: 望远镜光变曲线与实际结构同步；用户设计不同信号码型。

#### `E29` · 银河信标 / Galaxy Beacon

- **development_status**: `backlog`
- **science_status_legacy**: `S2`（待逐条复核）
- **core_concept**: 用恒星级激光或高能天体作为跨银河可识别的人工信号源。
- **interactive_3d_idea_if_promoted**: 从发射器到跨光年传播；显示束散、能量预算与接收阈值。

#### `E30` · 恒星雕刻 / Star Sculpting

- **development_status**: `backlog`
- **science_status_legacy**: `S2/SF`（待逐条复核）
- **core_concept**: 主动改变恒星表面能量输出、光谱或质量流，用于工程、艺术或通信。
- **interactive_3d_idea_if_promoted**: 恒星表面热图；控制热点、喷流或遮挡阵列并观察远方光谱。

#### `E31` · 行星拆解 / Planetary Disassembly

- **development_status**: `backlog`
- **science_status_legacy**: `S1/S2`（待逐条复核）
- **core_concept**: 把水星、月球等天体逐步拆成巨构原料与轨道工业资源。
- **interactive_3d_idea_if_promoted**: 质量驱动器持续抛料；行星半径递减，轨道工厂数量递增。

#### `E32` · 太阳系重构 / Solar System Rebuild

- **development_status**: `backlog`
- **science_status_legacy**: `S2`（待逐条复核）
- **core_concept**: 长期改变行星轨道、卫星关系和资源分布，把天然太阳系重新规划。
- **interactive_3d_idea_if_promoted**: 可拖拽行星的“太阳系沙盘”；实时显示宜居性、共振和扰动风险。

#### `E33` · 人工造星场 / Stellar Nursery Engineering

- **development_status**: `backlog`
- **science_status_legacy**: `S2/SF`（待逐条复核）
- **core_concept**: 主动压缩分子云、诱导坍缩，尝试批量触发恒星形成。
- **interactive_3d_idea_if_promoted**: 星云密度场→原恒星→点火；观察反馈如何阻止/促进下一代恒星。

#### `E34` · 中子星工业设施 / Neutron-Star Industry

- **development_status**: `backlog`
- **science_status_legacy**: `S2/S3`（待逐条复核）
- **core_concept**: 围绕中子星/脉冲星建立能源、材料与观测设施，利用极端磁场与辐射环境。
- **interactive_3d_idea_if_promoted**: 中子星、磁场线、喷流与工业环；加入致命辐射区和安全轨道。

#### `E35` · 恒星搬运 / Star Tug

- **development_status**: `backlog`
- **science_status_legacy**: `S2`（待逐条复核）
- **core_concept**: 通过恒星发动机或外部质量交换，让单颗恒星长期改变银河轨道。
- **interactive_3d_idea_if_promoted**: 可视化百万年轨迹；对比 Shkadov、Caplan 与引力辅助式搬运。

#### `E36` · 星团重排 / Star-Cluster Rearrangement

- **development_status**: `backlog`
- **science_status_legacy**: `S2/SF`（待逐条复核）
- **core_concept**: 在单星搬运基础上，调整星团内部结构，优化资源、碰撞风险和交通。
- **interactive_3d_idea_if_promoted**: 时间加速的星团轨道；从局部牵引累积到整体形态变化。

#### `E38` · 反物质飞船 / Antimatter Starship

- **development_status**: `backlog`
- **science_status_legacy**: `S2`（待逐条复核）
- **core_concept**: 利用物质-反物质湮灭的高能量密度推进星际飞船。
- **interactive_3d_idea_if_promoted**: 磁约束燃料舱→湮灭区→喷流；把“能量密度”和“储存危险”同时可视化。

#### `E40` · 克拉斯尼科夫管 / Krasnikov Tube

- **development_status**: `backlog`
- **science_status_legacy**: `S3`（待逐条复核）
- **core_concept**: 设想在已航行过的路径上形成特殊时空结构，使往返旅程大幅缩短。
- **interactive_3d_idea_if_promoted**: 第一次慢速铺路→返程进入时空通道；用双时钟解释因果结构。

#### `E41` · 蒂普勒圆柱 / Tipler Cylinder

- **development_status**: `backlog`
- **science_status_legacy**: `S3/SF`（待逐条复核）
- **core_concept**: 极长高速旋转圆柱产生极端时空拖拽，并被讨论为闭合类时曲线的思想实验。
- **interactive_3d_idea_if_promoted**: 旋转圆柱+光锥可视化；逐步展示为什么需要极端甚至非现实条件。

#### `E42` · 宇宙弦高速路 / Cosmic String Highway

- **development_status**: `backlog`
- **science_status_legacy**: `S3`（待逐条复核）
- **core_concept**: 若宇宙弦存在，可利用其极端时空几何设想特殊航行与引力效应。
- **interactive_3d_idea_if_promoted**: 两条宇宙弦之间的光路/时空网格；强调宇宙弦尚未被证实。

#### `E44` · 虫洞地铁 / Wormhole Metro

- **development_status**: `backlog`
- **science_status_legacy**: `S3/SF`（待逐条复核）
- **core_concept**: 把大量稳定虫洞组织成银河交通网，让“距离”变成网络拓扑问题。
- **interactive_3d_idea_if_promoted**: 银河地图切换普通航线/虫洞网络；节点失效时观察网络重路由。

#### `E45` · 星际方舟舰队 / Interstellar Ark Fleet

- **development_status**: `backlog`
- **science_status_legacy**: `S1/S2`（待逐条复核）
- **core_concept**: 文明不绑定单一母星，而以大量长期自治的世界舰共同迁徙。
- **interactive_3d_idea_if_promoted**: 舰队群体视角→单舰生态；展示能源、补给、分布式治理与编队。

#### `E46` · 星系际高速路 / Intergalactic Highway

- **development_status**: `backlog`
- **science_status_legacy**: `S2/SF`（待逐条复核）
- **core_concept**: 在星系之间预先部署激光推进器、补给站和通信中继，构成跨百万光年的基础设施链。
- **interactive_3d_idea_if_promoted**: 两座银河之间逐节点点亮；显示光程、补给间距与建设波前。

#### `E47` · 黑洞炸弹 / Black Hole Bomb

- **development_status**: `backlog`
- **science_status_legacy**: `S2/S3`（待逐条复核）
- **core_concept**: 利用旋转黑洞超辐射与反射边界，让某些波模不断获得能量的理论装置。
- **interactive_3d_idea_if_promoted**: 黑洞旋转→波进入→增益→反射→再次增益；明确这是理论不稳定性示意。

#### `E48` · 光造黑洞 / Kugelblitz

- **development_status**: `backlog`
- **science_status_legacy**: `S3`（待逐条复核）
- **core_concept**: 把极端高能辐射集中到足够小的区域，使其自身引力导致黑洞形成。
- **interactive_3d_idea_if_promoted**: 环形激光阵列同步聚焦；显示能量密度与 Schwarzschild 尺度。

#### `E49` · 人工引力井 / Artificial Gravity Well

- **development_status**: `backlog`
- **science_status_legacy**: `S3`（待逐条复核）
- **core_concept**: 设想在没有大型天体质量的情况下主动塑造可控引力场。
- **interactive_3d_idea_if_promoted**: 空间网格被压弯；测试轨道、时间膨胀和能量条件，并明确未知机制。

#### `E50` · 引力波通信器 / Gravity-Wave Transmitter

- **development_status**: `backlog`
- **science_status_legacy**: `S2/S3`（待逐条复核）
- **core_concept**: 人工驱动巨大质量分布产生可检测的引力波信号。
- **interactive_3d_idea_if_promoted**: 质量阵列运动→时空波纹→远端探测器；显示极端低效率与能量需求。

#### `E51` · 真空能反应堆 / Vacuum Energy Reactor

- **development_status**: `backlog`
- **science_status_legacy**: `SF`（待逐条复核）
- **core_concept**: 设想直接从量子真空获得可持续净能量，目前没有已知可行机制。
- **interactive_3d_idea_if_promoted**: 用“能量账本”互动拆穿免费能源直觉；视觉上区分真空涨落与可提取功。

#### `E52` · 假真空工程 / False Vacuum Engineering

- **development_status**: `backlog`
- **science_status_legacy**: `S3/SF`（待逐条复核）
- **core_concept**: 操纵量子场真空态，制造不同能量状态的真空区域。
- **interactive_3d_idea_if_promoted**: 势能曲线+泡壁三维化；模拟成核、扩张与可能的灾难性边界。

#### `E53` · 口袋宇宙 / Pocket Universe

- **development_status**: `backlog`
- **science_status_legacy**: `S3/SF`（待逐条复核）
- **core_concept**: 外部体积很小，但内部拥有巨大甚至独立空间的时空结构设想。
- **interactive_3d_idea_if_promoted**: 外部小入口→内部巨大世界的连续过渡；展示几何而不是“魔法门”。

#### `E54` · 暗物质工程 / Dark Matter Engineering

- **development_status**: `backlog`
- **science_status_legacy**: `S3/SF`（待逐条复核）
- **core_concept**: 假设未来能够捕获、操纵并利用暗物质的引力或其他未知性质。
- **interactive_3d_idea_if_promoted**: 可见物质/引力场双层视图；所有未知相互作用显式标为假设。

#### `E55` · 暗能量工程 / Dark Energy Engineering

- **development_status**: `backlog`
- **science_status_legacy**: `SF`（待逐条复核）
- **core_concept**: 设想局部控制与宇宙加速膨胀相关的物理机制。
- **interactive_3d_idea_if_promoted**: 局部空间尺度因子变化；把“膨胀空间”与“物体在空间中飞开”分开表现。

#### `E56` · 物理常数工程 / Constants Engineering

- **development_status**: `backlog`
- **science_status_legacy**: `SF`（待逐条复核）
- **core_concept**: 设想改变局部基本常数或相互作用强度，让同一宇宙出现不同物理规则区。
- **interactive_3d_idea_if_promoted**: 穿越边界前后原子、光速或化学行为改变；突出纯思想实验属性。

#### `E57` · 移动银河系 / Move a Galaxy

- **development_status**: `backlog`
- **science_status_legacy**: `S2/SF`（待逐条复核）
- **core_concept**: 给大量恒星长期施加协同推力，使整个星系质心和结构在超长时间尺度上改变。
- **interactive_3d_idea_if_promoted**: 亿年时间加速；从单星推进器一直缩放到整座银河的运动矢量。

#### `E58` · 主动合并星系 / Engineered Galaxy Merger

- **development_status**: `backlog`
- **science_status_legacy**: `SF`（待逐条复核）
- **core_concept**: 人为调整两个星系的相对运动，主动触发或塑造星系并合。
- **interactive_3d_idea_if_promoted**: 双银河引力舞蹈；展示恒星基本不会“互撞”，真正重构的是轨道与气体。

#### `E59` · 宇宙计算机 / Universe Computer

- **development_status**: `backlog`
- **science_status_legacy**: `S3/SF`（待逐条复核）
- **core_concept**: 把越来越多可用物质和自由能转化为计算资源，直到文明本身成为宇宙尺度计算过程。
- **interactive_3d_idea_if_promoted**: 文明扩张热图覆盖星系团；能量品质下降与废热成为主界面指标。

#### `E60` · 欧米伽点计算 / Omega Point Computing

- **development_status**: `backlog`
- **science_status_legacy**: `SF`（待逐条复核）
- **core_concept**: 在特定宇宙学终局假设下，让计算能力随宇宙演化趋向极端的思想模型。
- **interactive_3d_idea_if_promoted**: 宇宙尺度时间轴+计算预算；必须同时展示其所依赖的宇宙学假设。

#### `E61` · 宇宙防火墙 / Reality Firewall

- **development_status**: `backlog`
- **science_status_legacy**: `SF`（待逐条复核）
- **core_concept**: 用人工时空结构把文明区域与外部灾难、真空衰变或其他宇宙级威胁隔离。
- **interactive_3d_idea_if_promoted**: 星系外出现可视化时空边界；展示隔离、能量需求和信息能否穿越。

#### `E62` · 宇宙逃逸工程 / Universe Escape

- **development_status**: `backlog`
- **science_status_legacy**: `SF`（待逐条复核）
- **core_concept**: 在热寂或其他终局前，尝试通过人工宇宙、虫洞或时空拓扑迁移到新的可生存区域。
- **interactive_3d_idea_if_promoted**: “老宇宙→通道→新时空”三段式终章；将不同理论路线并列，不宣称已有可行方案。

## 8. 概念关系：用于导航而非科技树

- 恒星能源：`C01` 戴森群 → `C05` 套娃脑；`C03`、`C04` 可作为知识卡跳转，均为 backlog。
- 巨型栖居：`C15` 栖居地 → `E03` 麦肯德里圆柱、`E02` 班克斯轨道环（backlog）→ `C06` 环世界 → `C09` Birch 世界。
- 黑洞：`C08` 吸积/旋转能源站 ↔ `C09` 巨构；`C10` 微型黑洞霍金发动机有不同机制，保持候选。
- 自动化：`E18` 自复制工业网络 → `C01` 能源设施长期建设 → `C11` 星系尺度设想，仅代表概念关联不表示可直接科学实现。
- 星际航行：`E37` 巴萨德冲压 → `E39` 曲速 → `E43` 虫洞，科学证据层级显著不同。

**禁止**：将上述箭头转成通关解锁或建设顺序要求；用户始终能直接打开任何已经实现的 3D 图鉴场景。

## 9. 科学资料与范围治理

- 仍只有 77 个稳定 `concept_id`；12 个长期核心、3 个首发、65 个候选。后续扩容必须用户确认，不因 Agent 看到历史 P1 自动启动。
- Backlog 以原来的科学介绍与 3D 构想为知识档案；每个概念有 title、science_status、brief、reference 和 cross_links 即可。
- 科学事实、工程猜想与影视艺术处理分别标注；解释内容尽量附作者、出版年代和出处，文献真实性单独核对。
- 旧 v0.4/v0.5/v0.6/v0.7 只作为历史参考，不可以覆盖本版冻结的“观察优先”开发范围。
- 概念晋升需回答：有什么独特的探索体验？是否存在有意义的可点击/可观察对象？何种科学限制？现有场景可复用什么？用户是否明确授权？
- 凡来源待核查或缺少可信建模依据，必须写“待验证”，不能用展示界面数字伪装学术结论。

## 10. 给开发 Agent 的生效指令

1. **唯一生效规格**：`cosmic_engineering_explorer_v0.8_AI.md` + `concept_catalog_v0.8.json`。v0.6 的建造与任务仅作历史参考。
2. **只启动 C01 的 G0 → G4**，不要同时制作 C15、C08、9 个长期核心或 65 个候选场景。
3. **先有震撼的可观察体验，再逐层讲清科学**：优先验证强烈巨物感、尺度揭示、标志性构图、从宏观到单颗卫星和部件的可操作观察；其后加入机制分步演示。
4. **高精度资产强制管线**：G0 可程序化灰盒、G1 用实例与镜头建立巨物感；**G2 必须使用 Tripo 生成高精度候选，并在 Blender 完成精修/拆件/LOD/导出**，保留源模型和可复现记录。高模近景、低模远景，各自通过质量 Gate。
5. **不做游戏化**：禁止提前生成 `challenge`、`sandbox`、`buildables`、`missions`、`economy`、评分/解锁/通关等代码或 UI。
6. **科学可追溯**：所有示意图层、远景非真实比例、黑洞取能机制、遮挡模型应说明其依据及适用范围。
7. 每个 Gate 及资产 A0-A4 更新 `PROGRESS.md`，输出可检验的运行证据、问题与下一步，避免一次性铺开巨型项目。
8. 现有 v0.5/v0.6 科学资料与构想不能直接删除，作为历史归档；**但不得优先于本版范围决策**。

**v0.8 生效结论：使用 Tripo + Blender 高精度建模保障近景真实工业细节，先把 C01 做成视觉震撼、有强烈巨物感、能从太阳系飞到巨型单颗卫星、自由旋转点击并深入观察结构的真正 3D 场景。以后是否重新加入游戏模式，由用户另行决定。**
