# 宇宙工程探索馆 · C01 / C15

真实 3D 戴森群与旋转太空殖民地观察原型。React + TypeScript + Vite + Three.js/R3F，仅实现 Explore。

## 本地运行

需要 Node.js 22.13+（22.x）或 24.x；本项目使用 24.18.0 验证。完整测试工具不支持 Node.js 20。在项目根目录执行：

```sh
npm ci
npm run dev -- --port 5174
```

打开终端显示的本地地址。构建和预览：

```sh
npm run build
npm run preview
```

## 操作

- 工程选择器切换戴森群与旋转殖民地；`http://127.0.0.1:5174/?scene=C15` 直接打开殖民地，无参数打开戴森群。
- 殖民地三个构图为舱外全景、端盖入口、内壁城市。图层提供剖面、重力方向与旋转参考系；内部默认随舱体旋转。相机支持自由观察，没有第一人称行走。
- 左键拖动/单指：旋转；滚轮/双指：缩放；右键拖动：平移。
- 单击选择，双击或「聚焦此对象」靠近；鼠标操作可立即接管转场。
- 顶部「信息」「图层」「设置」按需展开且互斥，默认收起；选择或聚焦对象会打开信息面。
- 底部统一播放／暂停与三种构图：恒星系全景、巨构掠过、单体检查；局部观察时显示「上一层／全景」。
- Esc 先关闭当前展开面板，并将焦点恢复到顶部对应入口；没有展开面板时返回上一层：部件 → 代表卫星 → 轨道族 → 全景。
- 代表卫星四类部件可独立聚焦、隔离和爆炸观察，其他实例仅提供轨道观察。
- 顶部「图层」打开教学图层列表；单步与重置动画放在「设置」，其中也提供减弱动画、低负载画质与实际运行测量。
- 键盘 Tab/Enter 可操作对象列表和全部界面按钮，隐藏界面后保留恢复按钮。

## 资产与科学边界

Tripo 原始高模保存在 `assets/source/tripo/`；Blender 主工程和制作记录在 `assets/source/blender/C01/`；浏览器资产在 `public/assets/C01/`。

模型具体形体、维护设施比例、轨道分布和运动节奏均为工程概念化或教学示意，不代表已实现工程。全局采能份额不能代替具体行星遮挡率。未进行真实 N 体模拟，也没有建造、任务或评分。

三档 GLB 由同一工程导出，原高模不批量实例化。生成主形体仍需结合浏览器审查持续判断美术质量，当前 Gate 实际状态见 `PROGRESS.md`。

太阳使用本地保存的 NASA/SDO 2026-09-21 观测快照映射到 3D 教学球体：仅保留 AIA 171 Å 日冕伪彩。原始影像保持不变，来源、时间和校验值见 `assets/source/solar/SOURCES.md` 与 `public/assets/solar/sources.json`。这是固定单侧观测参考，不是实时数据或全表面测量；视角与曝光由教学渲染处理。

底部仅保留来源、171 Å 伪彩与非等比示意提示；快照日期可在「信息 → 观察对象 → 科学来源与边界」查看。

外围模型是量产采能卫星，使用双翼、长翼、四翼三种概念配置的简化实例，点击可查看用途和配置；单体检查对象使用正式 GLB。工程局部与系统远景连续转换展示比例。卫星硅片、金属和陶瓷分别使用 PBR，微观加工与互连纹理嵌入 GLB。维护艇采用固定概念比例，未声明真实米数。轨道线与其他教学图层默认关闭，可手动启用。

采能面姿态朝向恒星，照明以恒星主光为依据；背面近距离检查使用维护艇工作灯与弱辅助照明，保证观察结构。它们属于可观察性设计，不代表真实工程的照明功率。

复现资产加工使用 `scripts/blender_c01.py` 与本地 Blender，具体参数见 `assets/source/blender/C01/ASSET_RECORD.md`；资产校验命令见下。Barlow 字体本地托管，许可证位于 `public/fonts/OFL.txt`。

## 验证

```sh
npm run lint
npm run typecheck
npm test
npm run validate:content
node scripts/asset_check.mjs
npm run build
npx playwright install chromium
npm run test:e2e
```

浏览器检查使用 `http://127.0.0.1:5174`，Playwright 可自动启动该端口的开发服务。

启动开发服务后，可运行 `node scripts/capture.mjs` 保存桌面/手机与三种构图截图；`node scripts/benchmark.mjs` 在 1920×1080、标准画质下分别采样三个视图 60 秒，结果写入 `artifacts/performance/benchmark.json`。基准需要浏览器实际使用目标 GPU；不要将软件渲染结果冒充硬件验收。

C15 本轮优先 PC 画质与模型精度。`node scripts/capture_c15.mjs` 捕获 1440×900 内外构图及 1920×1080 城市／生命保障近景；追加 `--mobile` 可捕获手机画面。`node scripts/benchmark.mjs --scene=C15` 保存三视图性能证据至 `artifacts/performance/C15-benchmark.json`；`node scripts/asset_check.mjs --scene=C15` 校验两工程正式资产。殖民地宏观结构由 Blender 精确建模，近景街区、生命保障设备与枝叶树由 Tripo 生成后精修，源文件与记录分别保存在 `assets/source/blender/C15/` 与 `assets/source/tripo/C15/`，运行资产在 `public/assets/C15/`。尺寸、采光、生态与生命保障设施均为概念设计；景观不代表闭合生态系统已实现。

当前 C15 为可探索原型，技术验证与电影级美术验收分别记录；尚未通过电影级视觉目标。用户已确认 A 河岸近景作为 PC 三维重建目标，三版提示词、批准记录与参考文件位于 `.impeccable/mocks/`。近岸公共建筑、塔楼、渡船和长椅均使用正式 Tripo → Blender → GLB 资产，连续河岸采用可编辑三维环境。效果图不作为交互画面的背景替代品。

原始 v0.8 文件保留，运行内容使用 `content/`。正式源工程与制作记录随仓库保留；尚未部署。

仓库使用 Git LFS 保存模型、可编辑 Blender 工程、贴图与演示视频。克隆前安装 Git LFS；已有 checkout 可运行 `git lfs install` 和 `git lfs pull` 获取完整资产。Blender 自动备份及开发服务日志只保留在本地。
