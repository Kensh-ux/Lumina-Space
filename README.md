# Lumina-Space

面向大学生与零门槛用户的「情绪 + 待办 + 专注」Web 工作台。
当前这一版先跑通最小闭环：**选一个情绪 → 整站换主题 → 刷新后保持**。

## 环境

- Node.js ≥ 20.19
- npm

## 开发

```bash
npm install
npm run dev
```

打开终端提示的地址（默认 `http://localhost:5173`）。

## 常用命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run preview` | 预览生产构建 |
| `npm run check` | TypeScript 类型检查 |
| `npm test` | 跑一次单元测试 |
| `npm run test:watch` | 监听模式跑测试 |

## 目录

```
public/              favicon、robots.txt
src/
  app/              页面壳：App、Sidebar、Stage
  features/mood/    情绪常量、选择器、useMood
  lib/              类型与 localStorage adapter
  styles/           主题令牌与全局样式
tests/              与 src 对应的纯逻辑测试
```

## 交互

- 左上角三个情绪按钮：积极 / 中性 / 消极，点击切换整站主题。
- 左下角侧边栏：今日 / 专注 / 设置，点击展开占位面板，Esc 收起；窗口宽度 < 1120px 时折叠成底部图标栏 + 抽屉。
- 主题与选择保存在浏览器 localStorage（键 `lumina:data`），刷新后保持。
- 遵循系统 `prefers-reduced-motion`，开启后不做过渡动画。

## 开发辅助参数

仅在 `npm run dev` 下生效，生产构建不生效：

- `?theme=positive|neutral|negative`：只改主题，不写存储。
- `?panel=today|focus|settings`：打开对应侧边栏面板。

## 部署

纯静态站点：构建产物在 `dist/`，数据只存在用户浏览器的 localStorage，没有后端。

```bash
npm install
npm run build     # tsc -b && vite build，输出 dist/
npm run preview   # 本地预览构建产物（默认 http://localhost:4173）
```

### Cloudflare Pages（GitHub 集成）

1. 仓库推到 GitHub（`Kensh-ux/Lumina-Space`，分支 `main`）。
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git，选择该仓库与 `main` 分支。
3. 构建配置：
   - Framework preset：`Vite`
   - Build command：`npm run build`
   - Build output directory：`dist`
   - Node version：`22`（如需要，设置环境变量 `NODE_VERSION=22`）
4. Save and Deploy，得到 `https://<project>.pages.dev`。
5. 之后每次 `git push` 到 `main`，Cloudflare Pages 会自动重新构建并发布，不需要手动上传 `dist/`。

不需要 `wrangler`、后端或数据库；`dist/` 已在 `.gitignore` 中，不提交。

## 规则

工程约定见 `AGENTS.md`。
