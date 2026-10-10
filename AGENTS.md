# 项目 Agent 规范

## 产品与资产

- 依据 `cosmic_engineering_explorer_v0.8_AI.md` 及概念、场景、资产 JSON，仅实施 C01 戴森群和已授权的 C15 旋转太空殖民地，保留 C01 回归及全部 77 个稳定概念 ID；不自动扩展其他场景。
- 仅实现 Explore：真实 3D、多尺度观察、稳定选择、自由相机、部件检查和教学讲解；不创建建造、任务、资源、经济、评分、解锁、沙盒系统或占位入口。
- 正式近景资产走 Tripo → Blender 精修/分件/LOD → GLB，保留原件、可编辑源工程和制作记录；占位模型不能作为 G2 完成证据。
- C01/C15 所需 Tripo 资产已获生成授权，不设积分上限，不重复确认费用；按质量迭代、记录调用并避免重复提交。
- 在 `PROGRESS.md` 记录 G0–G4、A0–A4 的实际结果、证据和阻塞；未通过不标记完成。
- 分别标注科学事实、工程概念化设计和教学比例，不伪造精确尺寸或性能结果。

## 项目验证

- 代码修改必跑 `npm run lint`；按影响范围运行 `npm run typecheck`、`npm test`、`npm run build`。
- 内容变更运行 `npm run validate:content`；交互变更运行相关 `npm run test:e2e` 并检查实际浏览器画面。
