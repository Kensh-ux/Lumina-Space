# Changelog

## v0.3.0 — 进行中

### 新增

- 待办任务 CRUD：添加 / 完成 / 删除，空状态、完成态与 `aria-live` 计数。
- 统一数据入口 `useAppData`：情绪与任务共用一份 localStorage 数据，避免两套 hook 互相覆盖。
- 任务纯函数：`createTask` / `addTask` / `toggleTask` / `deleteTask` / `sortTasks` / `isTask`。

### 质量

- 40 条单元测试（新增 task 16 条、storage 任务校验 3 条）。

## v0.2.0 — 2026-10-23

### 新增

- 全屏主界面：Stage 铺满视口，内容卡居中，标题/品牌居中 overlay。
- 情绪圆盘：左上角圆盘，hover / 点击 / Enter 展开积极、中性、消极三项。
- 触屏、键盘、hover 交互统一；`prefers-reduced-motion` 关闭展开动画。

### 质量

- 21 条单元测试（mood / storage / dialGeometry）。
- 首轮审查 BLOCK（触屏与 hover/click 冲突）已修复，复审 PASS WITH COMMENTS。

## v0.1.0 — 2026-10-22

### 新增

- Vite 8 + React 19 + TypeScript 6 框架。
- 积极 / 中性 / 消极三种情绪主题，切换后持久化。
- 左下侧边栏（今日 / 专注 / 设置占位）。
- Stage 情绪场景（暖阳 / 阴天 / 雨夜）。
- 本地 `localStorage` 存储；首帧主题同步。

### 质量

- 18 条测试；键盘可达、焦点可见、reduced motion。
- 上线 `https://lumina-space.cc.cd`。
