# 01 项目宪法（仓库 `AGENTS.md` 源稿）

> 版本：2026-10-21（准备稿，未开工）
> 适用：Lumina-Space 的所有会话、子 agent、审查者。
> 落地：仓库根目录 `AGENTS.md`。**冲突时以仓库版本为准；本文件是源稿。**
> 变更：改这里必须用户确认，并在 `03_决策日志.md` 追加一条。

---

## 1. 项目一句话

面向大学生与零门槛用户的「情绪感知 + 待办 + 专注」沉浸式 Web 工作台。
**第一版只做最小闭环：选情绪 → 换主题 → 增删改任务 → 刷新不丢。3D 小屋是以后的方向，现在不做。**

## 2. 技术栈（不可擅自更换）

| 项 | 选择 | 备注 |
|---|---|---|
| 构建 | Vite 8+ | `npm run dev` / `npm run build` |
| 框架 | React 19 + TypeScript 6 | 函数组件 + Hooks |
| 样式 | 原生 CSS + CSS 变量 + CSS Modules | **不引 Tailwind、不引 UI 组件库** |
| 状态 | `useState` / `useReducer` / `Context` | **不引 Redux / Zustand / MobX** |
| 存储 | `localStorage` + 自封装 adapter | 以后再评估 IndexedDB |
| 3D（以后） | `three` + `@react-three/fiber` + `@react-three/drei` | 代码生成 low-poly；现在不做，草稿在 `_参考_未开工/12_3D小屋专项.md` |
| 测试 | Vitest + jsdom（组件测试按需加 Testing Library） | 纯逻辑优先，组件测试少量 |
| 包管理 | npm | Node ≥ 20.19 |
| 后端 | 第一版没有 | 不做账号、不做云同步 |

**依赖上限**：运行时依赖 ≤ 5 个（第一版：`react`、`react-dom`；以后加 3D 时再引入 `three`、`@react-three/fiber`、`@react-three/drei`，正好 5 个）。devDependency 限构建/测试工具链（Vite 及其官方插件、TypeScript、Vitest、jsdom、Testing Library、类型包）。新增任何依赖（含 devDependency）必须先问，并记决策日志。能用浏览器原生 API 解决的，不加包。

## 3. 目录结构（第一版）

```
Lumina-Space/
  AGENTS.md
  README.md
  docs/
    specs/  decisions.md  tasks/
  public/
  src/
    app/            App.tsx、App.module.css
    features/
      mood/         MoodPicker、mood.ts、useMood.ts
      tasks/        任务模块（002 起）
      scene/        3D 场景（以后，只接 props）
      focus/        番茄钟/专注状态（以后）
    lib/            storage.ts、纯函数
    styles/         tokens.css、global.css
    main.tsx
  tests/            与 src 镜像
```

规则：

- `src/features/<领域>/` 一个领域一个目录，领域之间不互相 import 内部文件。
- 纯逻辑放 `*.ts`，React 组件只做渲染和事件绑定。
- 所有可测逻辑（主题映射、存储、reducer）不得写在组件文件里。
- 3D 场景（`features/scene/`）只接 props，不 import `tasks` / `storage`；所有几何体代码生成，不下载 GLTF/OBJ。
- 新增顶层目录要先问。

## 4. 编码规范

- UTF-8 无 BOM、LF、2 空格缩进、文件末尾一个换行。
- ESM（`import` / `export`），不写 `require`。
- 标识符英文；注释中文或英文都行，**同一文件保持一致**；UI 文案中文。
- 不用 `any`；确实需要时写一行注释说明原因。
- 不留 `console.log`（调试用 `console.debug`，提交前删）。
- 组件文件 ≤ 200 行；超过就拆。

## 5. 验证门槛（Definition of Done）

一个任务只有全部满足才算「完成」：

1. `npm run check` 通过（`tsc -b`，零类型错误；具体命令以 `package.json` 为准）。
2. `npm test` 全绿；新增纯逻辑必须有测试。
3. `npm run dev` 能起，控制台无报错。
4. **UI / 3D 改动必须截图**，主控（或用户）亲眼看过；只看测试不算。
5. `git status` 只包含本任务范围内的文件。
6. 提交信息符合前缀规范，并回报 commit hash。
7. 按回执模板写清「做了什么 / 怎么验 / 风险」。
8. 版本更新时，同步更新仓库 `README.md` 的「更新记录」。

> 证据优先：不要用「应该没问题」交活。跑过、看过、截过图，再说话。

## 6. 提交规则

### 小环节：直接提交

适用：单文件或局部改动、一个小功能、一个 bug、文档更新。

1. `git status` 看清改动；**只 `git add` 你改的文件**，禁止 `git add -A`。
2. 先跑 `npm run check`、`npm test`。
3. 提交信息前缀：

   ```
   feat: add mood theme switching
   fix: keep focus ring visible
   docs: explain storage adapter
   test: cover invalid json fallback
   chore: scaffold vite react ts
   refactor: extract mood mapping
   ```

4. 提交后回报 hash。

### 大环节：先建分支，合并等确认

适用：跨模块重构、换技术栈、批量改文件、动目录结构、多个 commit 的大功能。

1. 从 `main` 建 `feat/<短名>` 或 `refactor/<短名>`。
2. 在分支上做，做完**只报告，不合并**。
3. 用户明确说「合并」后，才 `git checkout main && git merge --no-ff <branch>`。
4. 推送、删分支、force push、rebase、重置远端：**一律先问**。

### 绝对不要

- 不 `git add -A` 卷走用户未提交的改动。
- 不 `git commit --amend`、`git reset --hard`、`git push -f`。
- 不提交密钥、token、本机绝对路径。
- 不动 `.git/`、`LICENSE`、用户自己写的文件（除非任务就是改它）。
- 不「顺手」整理任务范围外的代码。

## 7. 参考仓库使用协议（重要）

`01_输入项目` 里的两个仓库是**只读参考**，不是代码来源。

- **白名单**：只读当前任务卡点名的文件；没点名的不许自己扩大。
- **先清单，后动手**：调研产出「借鉴清单」，格式：

  | 来源文件 | 提取什么 | 怎么改造成我们的 | 明确不采用什么 |
  |---|---|---|---|

  清单经主控（或用户）确认后，才写正式代码。
- **上限**：单次调研 ≤ 10 个文件；接近上限就停下来汇报。禁止整仓通读。
- **只取模型/规则/算法，不取 UI**：禁止直接复制带框架耦合的组件、样式、模板。
- **GitHub 搜索**：给 3 个候选 + 取舍理由，由用户拍板；不要自己下载一堆依赖。

## 8. 禁止事项（红线）

1. 没有任务卡就开工。
2. 擅自加依赖、换技术栈、改目录结构。
3. 删除或覆盖用户未提交的改动。
4. 提交密钥、token、本机绝对路径。
5. 修改 `LICENSE`。
6. 整仓通读参考项目。
7. 直接搬运参考项目的 UI 代码。
8. 在任务范围外做重构、格式化、改名。
9. 用「差不多」「应该可以」代替验证。
10. 遇到阻塞超过 20 分钟不汇报。
11. 用外部 3D 模型 / AIGC 底图冒充代码生成的场景。

## 9. 上下文与交接

- 开工前读：本文件 + 当前任务卡 + 任务卡点名的源码。
- 不读：历史聊天记录、其他任务卡、整个参考仓库。
- 超过 3 个文件需要改、但任务卡没写：**停下来问**。
- 预计超过 30 分钟的任务：先写 3–5 行计划，再动手。
- 工具：见 `09_工具清单.md`；缺工具先问，不擅自装。
- 外包：见 `10_外包与模型分工.md`；调研/原型/测试可外包，范围/架构/合并/验收不外包。
- 结束时必须写回执（模板见 `08_提示词模板.md`）。

## 10. 变更宪法

- 任何一条要改：先说明「改什么、为什么、影响哪些文件」，等用户确认。
- 确认后：改仓库 `AGENTS.md` → 在 `03_决策日志.md` 追加一条 → 更新 `README.md` 的说明。
- 不要在两处各写一套规则。

---

> 记住一句话：**先读任务卡，只改范围内，跑过看过再提交，做完写回执。**
