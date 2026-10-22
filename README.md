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
src/
  app/              页面壳：App、Sidebar、Stage
  features/mood/    情绪常量、选择器、useMood
  lib/              类型与 localStorage adapter
  styles/           主题令牌与全局样式
tests/              与 src 对应的纯逻辑测试
```

## 交互

- 左上角三个情绪按钮：积极 / 中性 / 消极，点击切换整站主题。
- 左下角侧边栏：今日 / 专注 / 设置，点击展开占位面板，Esc 收起。
- 主题与选择保存在浏览器 localStorage（键 `lumina:data`），刷新后保持。
- 遵循系统 `prefers-reduced-motion`，开启后不做过渡动画。

## 开发辅助参数

仅在 `npm run dev` 下生效，生产构建不生效：

- `?theme=positive|neutral|negative`：只改主题，不写存储。
- `?panel=today|focus|settings`：打开对应侧边栏面板。

## 规则

工程约定见 `AGENTS.md`。
