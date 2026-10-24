<p align="center">
  <img src="docs/screenshots/hero-positive.png" alt="Lumina-Space v1.0 主界面" width="900">
</p>

<h1 align="center">Lumina-Space</h1>

<p align="center">
  <strong>把情绪和待办放在同一张书桌上的沉浸式学习工作台。</strong><br>
  选一个情绪，界面和场景跟着变；先感受，再开始。
</p>

<p align="center">
  <a href="https://lumina-space.cc.cd"><strong>在线使用 → lumina-space.cc.cd</strong></a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-2ea44f"></a>
  <img alt="Version" src="https://img.shields.io/badge/version-v1.0-5b7c99">
  <img alt="Status" src="https://img.shields.io/badge/status-alpha-d97706">
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white">
</p>

<p align="center">
  <a href="#为什么是-lumina-space">为什么</a> ·
  <a href="#现在能做什么">功能</a> ·
  <a href="#截图">截图</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#版本记录">版本</a> ·
  <a href="CHANGELOG.md">更新日志</a>
</p>

---

## 为什么是 Lumina-Space

大多数待办工具只问「做完了吗」。但大学生一天里真正难的那部分，往往发生在打开待办之前：不想开始、不知道自己怎么了、坐下来又静不下来。

Lumina-Space 想把「情绪」放回工作台的第一屏。不是加一个心情打卡，而是让整个界面先接住你：暖一点、冷一点、亮一点、安静一点。然后再问，今天想做什么。

> 这是一张干净的书桌，不是一张 KPI 看板。

## 现在能做什么

- **情绪圆盘**：左上角圆形情绪盘，鼠标移入 / 点击 / Enter 展开积极 / 中性 / 消极三个选项；选中后整站切换主题，刷新后保持。
- **主界面**：全屏 Canvas 2D 粒子 / 光晕随三种情绪变化；中心显示问候、日期与今日概况；右侧「今日」光球打开任务玻璃面板（新建 / 编辑 / 筛选 / 搜索），点外部或 Esc 回到主界面。
- **规划师**：侧栏「规划师」把主界面切成从今天开始连续 7 天的待办视图；180–220px 可读列宽，按截止日期分列，每列可添加 / 编辑 / 完成 / 删除；任务行显示优先级 / 时间，未排期计数；窄屏横向滚动。
- **待办任务**：大编辑器新建 / 编辑（标题、描述、截止日期 + 时间、优先级）；完成 / 删除、全部/未完成/已完成筛选 + 标题搜索、清除已完成；刷新后保持。
- **左侧栏**：全高可折叠、可拖拽调宽（默认 300px，240–420，刷新保持）；今日 / 规划师 / 专注（番茄钟 + 今日/本周统计）/ 设置（数据概况 + 导出 JSON）模块；窄屏变底部导航 + sheet。
- **轻音效**：hover / 点击 / 面板开合轻提示音，可一键静音；专注面板可开关低音量白噪音（默认关，切面板停止）。
- **本地优先**：数据只存在浏览器 `localStorage`，没有账号、没有后端。
- **基础质量**：键盘可达、焦点可见、`prefers-reduced-motion` 关闭动效；125 条单元测试。

> v1.0 已完成（2026-10-24）：声音系统、粒子主界面、今日光球与规划师。v2.0 再做 3D 小屋。

## 截图

| 积极 | 中性 | 消极 |
|---|---|---|
| ![积极](docs/screenshots/hero-positive.png) | ![中性](docs/screenshots/hero-neutral.png) | ![消极](docs/screenshots/hero-negative.png) |

**今日光球**

![光球任务面板](docs/screenshots/orb-panel.png)

**规划师（从今天起 7 天）**

![规划师 1280](docs/screenshots/planner-1280.png)

![规划师 900](docs/screenshots/planner-900.png)

**专注 / 声音**

![番茄钟](docs/screenshots/focus-centered.png)

![声音设置](docs/screenshots/sound-settings.png)

## 快速开始

```bash
git clone https://github.com/Kensh-ux/Lumina-Space.git
cd Lumina-Space
npm install
npm run dev
```

打开终端提示的地址（默认 `http://localhost:5173`）。

## 版本记录

| 版本 | 日期 | 内容 |
|---|---|---|
| v0.1.0 | 2026-10-22 | 框架、三种情绪主题、左下侧边栏、Stage 场景、本地持久化 |
| v0.2.0 | 2026-10-23 | 全屏主界面、情绪圆盘、触屏/键盘交互 |
| v0.3.0 | 2026-10-24 | 任务 CRUD、侧边栏抽屉、番茄钟 |
| v0.4.0 | 2026-10-24 | 全高可调左侧栏、大任务编辑器、任务增强、专注统计 |
| v1.0.0 | 2026-10-24 | 声音系统、粒子主界面、今日光球、规划师 |
| v2.0.0 | 计划 | 3D 小屋 |

完整记录见 [CHANGELOG.md](CHANGELOG.md)。

## License

MIT © 四弦六狸。见 [`LICENSE`](LICENSE)。
