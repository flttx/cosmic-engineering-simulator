# C15 连续河岸环境制作记录

日期：2026-10-09。根据已选 A 河岸构图重建真实连续曲面环境，使用 ponytail full；复用 Blender 与现有 glTF 管线，无新依赖或新增 Tripo 任务。

- 运行：`Blender 5.2 --background --python scripts/blender_c15_riverfront.py -- --render-preview`。
- 坐标：runtime Y-up、Z 为圆柱轴；1 RU=100m 为概念设计尺度；圆柱半径40RU，长度240RU。
- 结构：三条连续起伏陆地/曲线河道，62m近景水宽，12m连续步道；几何桥面、桥墩、承重拱、坡道、护栏；公共平台、台阶、嵌入式导光带；三组独立透明玻璃和采光承重框。
- 地面高程公式及植物/建筑落地方式见源脚本 `terrain_height` 和 runtime metadata 的 `placementFormula`。原有 ecology 地形和宽实心内部窗体应由 renderer 隐藏，避免重叠。
- 精确 hero 地基 `[-1.28,-39.38,-40]`；130m×145m水平平台，实际地形坡脚Y=-39.41、平台topY=-39.38；镜头 `[-0.50,-39.35,-39.15]` 看向 `[0.12,-38.65,-46]`，朝-Z使河在画面右、建筑在左。
- 水面半径39.47，步道半径39.43，步道高水面4m；眼高8m。相较首版39.55水面抬高8m，避免深渠感。
- 源文件：`riverfront_master.blend` 和12张 base/roughness/normal PBR地图；所有纹理 packed 入 `.blend` 与 GLB。
- 当前实测：194,412三角、28 mesh、38材质primitive、8材质、12 embedded texture、0缺UV、0非有限顶点。GLB 10,490,104字节。导出GLB解析确认 glTF v2、所有图像为bufferView内嵌；透明窗 alphaMode=BLEND、alpha=.10。
- QA：两张1440×900真实Cycles几何/材质预览已经查看。桥头坡道、河岸水位与公共平台接地确认；混凝土立面修正为每面物理UV，避免纵向拉伸。预览使用未烘焙 inspection fill，仅用于资产检查。
- 验证：Blender内置有限坐标、三角预算、河宽与公共平台高程断言通过；`npm run lint` 通过。
- 限制：环境自身不包含占位楼或树；正式 Tripo 建筑、林木实例、摄影构图、大气及电影级光照由 renderer 集成后验收。空环境预览不是电影级完成证据。

## 首轮实际浏览器缺陷修正

实际画面发现窄河被土地遮挡、120m正式 pavilion 与68m旧平台不匹配、5.5m花池挡住左侧建筑以及大规则法线纹理。局部修正如下，不重新生成Tripo资产：

- 用逐行河中心/河宽的自适应左右岸格网替代固定横向格网；左右岸独立，湿槽上没有任何跨接草地三角。沿实际 mesh 的18条BVH射线检查，无水道上方草面命中；新两张Cycles QA中水面持续可见。
- Hero地基移至x=-1.28，平台扩大130m并让地形按照水平实际底面渐变接地；避免圆柱半径高程与水平建筑底面之间几米误差。28级台阶高16.4cm、踏步30cm，连接步道与平台；花池降低到1m。
- 草地/岩岸/混凝土大规则法线振幅降低约90%，替换为低振幅细随机颗粒；草地按更细实际UV重复，避免巨型沙纹与螺旋。
- 与 renderer 同步新pavilion anchor及 `terrain_height` 中plaza表达式；`manifest` 和全局 `asset_metadata` 的environment三角/字节由主Agent更新。
