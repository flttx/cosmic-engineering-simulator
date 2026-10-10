# C15 远景 LOD3 制作记录

仅用于距离超过 30 渲染单位的街区和森林；近景必须继续使用正式几何 LOD0–2。本目录不包含新的 AI 生成，全部来自已有正式 Tripo → Blender → GLB 原件。

- 街区：正式 `district_lod0.glb` → Blender voxel 连续化 → 345 三角体量 → 原件立面颜色/窗格投射烘焙至 1024px atlas。直接减面会留下碎片，已通过原生预览发现并替换。尺寸保持宽 10、深 5.4915、高 3.3971，中心底部原点。
- 树木：正式 `tree_lod0.glb` 的 20000 三角几何 → Cycles 三个 60° 方向原生 RGBA 渲染 → 三组交叉、独立正背面，共 12 三角。纹理保留原件枝叶真实轮廓，不是球冠或锥体。高度 1.8，GLB +Y 向上，底部原点。
- `district_review.png` 为原生质量检查图；`tree_view_*.png` 是原始相机渲染，`*_cropped.png` 是同次渲染的原生 alpha 范围裁切。非图片生成服务，未使用图片生成模型。
- 源文件、近景模型和主资产清单未修改。两个衍生 GLB 写入 provenance extras，详细尺寸、字节、三角数、UV、finite 和 source SHA256 见 `public/assets/C15/distant_metadata.json`。

再生产：`blender --background --python scripts/blender_c15_distant.py`。已有相同源渲染可加 `-- --reuse-tree-renders`；仅重建街区加 `-- --district-only`。
