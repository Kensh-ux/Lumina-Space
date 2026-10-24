# Changelog

## v0.4.0 — 进行中

### 新增

- 全高左侧栏：展开默认 300px（240–420，可拖拽或键盘调整），收起 56px；宽度写入 `lumina:sidebar-width`，刷新保持。
- 侧栏模块：今日、专注、情绪（009 占位）、设置；主 Stage 按 `--sidebar-width` 偏移，情绪圆盘移入 Stage 左上。
- 移动端底部导航 + sheet；拖拽时关闭过渡，`prefers-reduced-motion` 关闭动画。
- 任务增强：行内编辑标题（Enter 保存 / Esc 取消 / 失焦保存 / 空回退），优先级 1–3、截止日期与过期高亮。
- 任务筛选栏：全部 / 未完成 / 已完成、标题搜索、清除已完成；旧任务缺新字段兼容，坏 priority / dueDate 备份后回退。

### 质量

- 89 条单元测试（task 43、storage 21、mood 7、dialGeometry 3、timer 11、sidebar 4）。

## v0.3.0 — 2026-10-24

### 新增

- 待办任务 CRUD：添加 / 完成 / 删除，空状态、完成态与 `aria-live` 计数。
- 统一数据入口 `useAppData`：情绪与任务共用一份 localStorage 数据，避免两套 hook 互相覆盖。
- 任务纯函数：`createTask` / `addTask` / `toggleTask` / `deleteTask` / `sortTasks` / `isTask` / `countTasks`。
- 侧边栏抽屉：今日任务（快速添加）、专注番茄钟、设置（主题、清空数据二次确认）；桌面 320px 抽屉与窄屏底部 sheet。
- 番茄钟：1–180 分钟自定义、15/25/45/60 推荐、开始/暂停/继续/完成/重置；按 `endAt` 计算，不靠 interval 累加。

### 质量

- 58 条单元测试（task 20、storage 17、mood 7、dialGeometry 3、timer 11）。
- 004 首轮 BLOCK（旧数据缺 tasks 会重置 mood）已修复；005 首轮 BLOCK（Stage/抽屉重复 DOM id）已修复；006 pause-at-zero 已修复；均复审 PASS WITH COMMENTS。

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
