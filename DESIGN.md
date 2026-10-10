---
name: 宇宙工程探索馆
description: 以真实三维结构与多尺度观察理解宇宙工程的克制硬科幻界面
colors:
  background: "#080c12"
  surface: "#10161e"
  text: "#e5e7e9"
  muted: "#a6b2bf"
  border: "#2d3540"
  accent: "#e9bc81"
  inspector: "#111820f7"
  explanation: "#c3cdd5"
  focus-surface: "#e9bc8109"
  toolbar-surface: "#10161ef2"
  tool-active: "#1a222d"
  view-active: "#272c31"
  field-surface: "#0b121b"
  structure-surface: "#080f16"
  structure-active: "#29333c"
typography:
  display:
    fontFamily: 'Barlow, "Microsoft YaHei", sans-serif'
    fontSize: "27px"
    fontWeight: 500
    lineHeight: 1.2
  brand:
    fontFamily: 'Barlow, "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    fontWeight: 500
    letterSpacing: "0.04em"
  title:
    fontFamily: 'Barlow, "Microsoft YaHei", sans-serif'
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.5
  body:
    fontFamily: 'Barlow, "Microsoft YaHei", sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.9
  label:
    fontFamily: 'Barlow, "Microsoft YaHei", sans-serif'
    fontSize: "11px"
    fontWeight: 400
rounded:
  structure-button: "3px"
  control: "4px"
  focus: "5px"
  icon: "6px"
  panel: "10px"
spacing:
  compact: "4px"
  icon-gap: "6px"
  label-gap: "7px"
  group-gap: "9px"
  control: "10px"
  regular: "12px"
  tool-panel: "20px"
  panel: "22px"
  edge: "32px"
components:
  button-focus:
    backgroundColor: "{colors.focus-surface}"
    textColor: "{colors.accent}"
    rounded: "{rounded.focus}"
    padding: "{spacing.control}"
    width: "100%"
    height: "40px"
  button-icon:
    rounded: "{rounded.icon}"
    height: "40px"
    width: "40px"
  layer-option:
    textColor: "{colors.text}"
    padding: "10px 0"
    height: "46px"
  layer-option-active:
    textColor: "{colors.accent}"
    padding: "10px 0"
    height: "46px"
  view:
    textColor: "#b9c5d0"
    rounded: "{rounded.icon}"
    padding: "9px 15px"
    height: "44px"
  view-active:
    backgroundColor: "{colors.view-active}"
    textColor: "{colors.accent}"
    rounded: "{rounded.icon}"
    padding: "9px 15px"
    height: "44px"
  inspector:
    backgroundColor: "{colors.inspector}"
    rounded: "{rounded.panel}"
    width: "336px"
  quality-select:
    backgroundColor: "{colors.field-surface}"
    rounded: "{rounded.control}"
    padding: "8px"
    height: "36px"
---

# Design System: 宇宙工程探索馆

## Overview

**Creative North Star: "宇宙工程观察窗"**

沿用用户批准的 v0.8 方向：偏写实、克制的硬科幻工业结构。宏大尺度、空间结构、工业细节和稳定尺度参照提供体验；界面以低亮度信息面和精简文字附着在观察区域边缘。

中文信息优先。深色背景延续宇宙环境，暖金色负责选中、聚焦和操作反馈。文档记录当前实现的视觉规范，不代表近景资产、美术、性能或完整视觉验收已通过。

**Key Characteristics:**

- 真实三维场景主导视野。
- 深色信息面、细边界和小圆角。
- 单一暖色表达选择与操作状态。
- 讲解、科学边界和教学比例明确可见。

## Colors

冷暗中性色形成观察背景，低饱和暖金色提供少量操作线索。具体值以 frontmatter 为准，来源为 `src/styles.css`。

`.impeccable/design.json` 保存扩展元数据、断点和独立组件预览；色带由实际颜色转换至 OKLCH 后派生，仅供预览，不新增主题令牌。CSS 没有动画时长或缓动令牌，sidecar 的 motion 保持为空。

### Primary

- **暖金操作色**（`accent`）：选中对象、当前层级、活动图层、聚焦按钮、链接和键盘焦点。

### Neutral

- **深空底色**（`background`）：页面与观察区域基础底色。
- **深蓝信息面**（`surface`、`inspector`）：恢复按钮与互斥工具面，工具面保留透明度。
- **正文与讲解色**（`text`、`explanation`）：全局文字与长段说明。
- **辅助文字与边界**（`muted`、`border`）：英文场景副标题、分隔和次级提示。
- **工具条与状态面**（`toolbar-surface`、`tool-active`、`view-active`、`focus-surface`、`structure-surface`、`structure-active`）：区分展开工具、当前构图与结构模式。
- **设置字段面**（`field-surface`）：原生画质选择框。

**The Selection Signal Rule.** 暖金色优先用于可操作和已选中的语义，同一状态在导航、图层和对象检查中保持一致。

## Typography

**Display / Body Font:** Barlow；中文回退为 Microsoft YaHei，最终回退为 sans-serif。自托管 Barlow 400、500、600 三种字重，设置 `font-display: swap`。

字符层级以紧凑的工程观察文字为主。场景标题简短，品牌保留少量字距，长篇讲解增加行高。

- **Display**：主标题使用 `display`；英文副标题为 12px、400 字重、0.05em 字距。
- **Title**：对象标题使用 `title`；小节标题 15px、工具面标题 16px，均为 500 字重。
- **Body**：讲解使用 `body`；手机正文 12px，仍为 1.9 行高。
- **Label**：来源提示 11px，工具入口与结构操作 12px，图层行与底部构图 13px。
- **品牌**：中文品牌名使用 `brand`，不显示英文品牌副标。
- **测量值**：使用 `font-variant-numeric: tabular-nums`。

## Layout

观察区域铺满视口（100dvh），最小高度 500px。所有视口默认收起信息、图层与设置；顶部品牌与四个工具入口、短场景标题、底部播放与三种构图构成常驻骨架。口号、概念 ID 标签和独立太阳模式卡片不再常驻。

- **桌面**：顶部条高 76px、左右内边距 32px，标题距顶 94px。信息、图层、设置共享右上区域（距顶 92px、右边 28px、宽 336px），互斥展开。检查面正文内边距 22px，内容区独立滚动。
- **底部工具条**：居中停靠，距底 44px，圆角 10px，内边距 5px；播放位于左侧，三种构图采用分段栏。局部层级时才显示「上一层／全景」；来源提示位于工具条下方。
- **窄桌面 ≤1000px**：工具面宽 320px；存在返回操作时工具条采用两行布局。
- **手机 ≤700px**：顶部条高 68px、边距 18px；品牌 12px、标题 24px、正文 12px。工具面右上停靠，宽度为视口减 36px、最大 340px，正文内边距 18px。工具面展开时隐藏场景标题，信息面展开时隐藏面包屑，避免重叠。底部构图字号 12px；图标按钮宽 36px、高 40px。
- **极窄屏 ≤360px**：工具入口隐藏文字，保留有可访问名称的图标；构图字号 11px并隐藏图标，品牌缩为 11px。

组件令牌中的 `height` 表示目标高度或最小高度；可扩展文字按钮仍以 CSS 的 `min-height` 为准，不限制文字换行。新增叠层先检查是否遮挡关键结构与已有操作。

## Elevation & Depth

暗色半透明层与细边框形成界面深度，工具面和底部工具条不使用面板阴影。场景叠层上下暗色渐变帮助文字读取；场景标题、品牌及面包屑使用轻微轮廓阴影（`filter: drop-shadow(0 2px 3px #000)`）。没有玻璃模糊或界面装饰性发光。

**The Scene Leads Rule.** 空间深度由三维结构、光照和视差承担；界面层次只帮助阅读与操作，不替代场景的尺度感。

## Shapes

小圆角矩形与细边界延续工业观察工具的克制感。结构模式、选择框、聚焦按钮、图标按钮、工具面和底部工具条使用 frontmatter 对应半径；图层开启提示点采用圆形。

## Components

### Buttons

聚焦按钮铺满面板宽度，暖金文字、低透明暖金底和细暖色边框，最小高 40px。图标按钮桌面为 40px 方形。悬停反馈为暖金文字，图标按钮增加微弱浅色底；禁用按钮保留真实禁用语义及暗淡外观。

交互元素提供可访问名称。`:focus-visible` 使用 2px 暖金描边与 4px 偏移。顶部工具按钮通过 `aria-expanded` 表达展开状态。

### Layer List / Structure Controls

图层收纳在顶部入口，展开为纵向列表，每行左侧名称、右侧开启／关闭状态，最小高 46px。`aria-pressed` 驱动暖金文字，不再使用常驻图层 chips；顶部提示点说明已有图层开启。结构模式在暗底分段控件中切换整体、隔离和爆炸视图，最小高 36px。

### Cards / Containers

检查面包含对象／讲解切换、聚焦操作、层级列表和科学边界，正文独立滚动。信息、图层和设置互斥展开；选择或聚焦对象打开信息面。设置收纳操作提示、画质、单步／重置动画、减弱动画及实际测量。

### Inputs / Fields

画质使用原生 `select`，减弱动画使用原生 checkbox；保留标签、键盘行为和焦点。选择框为暗底、细边界、小圆角，内边距 8px、最小高 36px。

### Navigation

底部构图为三段横向按钮，当前项暖金文字与暗色选中底，最小高 44px。播放与构图共享工具条。面包屑与返回操作只在局部层级显示。讲解章节保留两位序号、细分隔与当前步骤状态。

### Scene States

隐藏界面后保留恢复按钮，并隐藏选择与教学图层以便纯场景观察。Esc 先关闭当前工具面或信息面并恢复对应触发按钮焦点；没有展开面板时才返回上一层。加载中、资产失败与场景错误明确表达，就绪后收起暂态提示。相机聚焦可中断，减弱动画适用于镜头与动画；此处不编造运动令牌。

太阳使用 NASA/SDO 2026-09-21 固定快照，仅保留 AIA 171 Å 日冕伪彩。底部常驻来源、谱段与非等比提示；日期放在信息面的「科学来源与边界」。单侧影像朝向观察者投影到教学球体，不声明实时、真实背面或全表面测量。外围卫星为双翼、长翼、四翼三种概念配置的简化实例，正式英雄单体使用 GLB，保留四类可观察部件。教学图层默认关闭。卫星采能面朝向恒星，金属、硅片、陶瓷与隔热毯各有 PBR 响应；局部检修照明帮助背面读取。维护艇使用固定概念比例，连续分层尺度不标虚构物理米数。

## Do's and Don'ts

### Do:

- **Do** 让真实三维结构、视差和尺度参照主导体验。
- **Do** 复用现有字体、暖金状态色、暗色信息面和细边界。
- **Do** 为按钮和字段提供名称、键盘操作与可见焦点。
- **Do** 保留中文科学边界、教学比例和真实加载状态。

### Don't:

- **Don't** 用真空浓雾、装饰性发光或大型界面装饰替代结构与尺度感。
- **Don't** 将未验收的模型、美术或运行测量描述成已通过。
- **Don't** 添加建造、资源、经济、评分、解锁或任务入口。
- **Don't** 隐藏失败状态、键盘焦点或界面恢复入口。
