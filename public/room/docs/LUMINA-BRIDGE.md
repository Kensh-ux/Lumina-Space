# 把「窗畔」嵌进 Lumina-Space

> 窗畔版本：2026-10-30 · 桥协议 `1.0.0`
> 文档状态：接入说明 + 可用桥。**Lumina-Space 的任何文件都没有被改动**，包括 v1.3.3 与计划中的 v2.0 3D 模式。
> 相关代码：`src/bridge.js`（在 `index.html` 末尾加载）、`assets/style.css` 末尾的 `.is-embed-*` 规则。

---

## 1. 先说结论

不要让 Lumina 复制窗畔的 Three.js 代码，也不要让窗畔接管 Lumina 的任务与情绪记录。两边各自保持独立，用 **iframe + postMessage** 连接：

- Lumina 仍然是原来的 React 应用，任务、规划师、情绪记录、专注、设置都不变。
- 窗畔作为一个「房间视图」嵌在 Lumina 的某个页面或抽屉里，只负责渲染房间、场景和唱片。
- 父页面只做三件事：传初始参数、在用户操作时发命令、接收状态广播。
- 两边不共享 `localStorage`，不互相读写数据，不跨域操作 DOM。

这样做的好处：窗畔的 WebGL 崩溃不会拖垮 Lumina；Lumina 的版本升级不需要重新合并窗畔代码；以后不想要这个房间，删掉一个 `<iframe>` 即可。

---

## 2. 最小可用示例

```html
<iframe
  id="windowlight"
  src="https://<窗畔域名>/index.html?embed=1&ui=0&toast=0&mood=dusk&sound=off&intro=0&parentOrigin=https://lumina-space.cc.cd"
  title="窗畔 · 可互动的房间"
  allow="autoplay"
  loading="lazy"
  style="width: 100%; height: 100%; border: 0; border-radius: 18px"
></iframe>
```

要点：

- `parentOrigin` 必须写成 **Lumina 实际运行的 origin**（本地开发是 `http://localhost:5173`，线上是 `https://lumina-space.cc.cd`）。跨域时不写它，也能收到状态，但**命令会被拒绝**，这是故意的安全默认。
- `ui=0` 会隐藏窗畔自己的侧栏、面板按钮和右上角 HUD，只留下房间、提示条和唱片弹层。Lumina 用自己的按钮来控制场景与音乐。
- `allow="autoplay"` 只是增加浏览器放行概率，**不能替代用户手势**。真正的播放要等用户点过按钮或点过房间里的唱片机。
- 如果同一个页面只嵌入一次，`loading="lazy"` 足够；不要同时挂多个隐藏实例，WebGL 上下文会互相挤占。

---

## 3. 查询参数

所有参数都可选，按需组合。

| 参数 | 取值 | 作用 |
|---|---|---|
| `embed` | `1` | 加上 `is-embedded` 类，收窄暗角；iframe 内会自动识别，通常不必手写 |
| `ui` | `0` / `off` | 隐藏窗畔侧栏、面板开关、HUD；只留场景与唱片弹层 |
| `toast` | `0` / `off` | 隐藏右下角提示条，适合外面已有自己提示系统的页面 |
| `mood` | 18 个场景 id 之一 | 初始场景，如 `dusk`、`rain`、`sakura` |
| `objects` | `key:on,key:off` | 批量设置陈设，如 `screen:on,bunny:off` |
| `object` | `key` / `key:on` / `key:off` / `-key` / `+key` | 单个陈设，可重复写多次 |
| `sound` | `on` / `off` | 初始环境音开关；仍受浏览器自动播放限制 |
| `music` | `play` / `pause` | 初始唱片状态；`play` 在无手势时会被浏览器拒绝，不报错 |
| `intro` | `0` | 跳过 8.5 秒推镜，直接进入稳定机位 |
| `parentOrigin` | 一个或多个 origin，逗号分隔；或 `*` | 允许哪些父页面发命令；同时决定状态广播目标 |

`objects` 里可用的 31 个 key 与侧栏分组一致：

| 分组 | key |
|---|---|
| 声音 | `piano` 钢琴、`record` 黑胶、`guitar` 吉他、`musicBox` 八音盒 |
| 灯火 | `pendant` 吊灯、`floorLamp` 落地灯、`candles` 烛台、`stringLights` 串灯、`sconce` 壁灯 |
| 起居 | `rug` 地毯、`armchair` 扶手椅、`table` 茶几、`shelves` 壁架、`wallArt` 挂画、`vase` 花瓶、`letters` 信笺、`rockingChair` 摇椅、`sideTable` 边几、`screen` 屏风、`windChime` 风铃、`toyTrain` 玩具小火车 |
| 生机 | `cat` 猫、`plant` 绿植、`knitting` 织物、`aquarium` 水族箱 |
| 玩偶 | `penguin` 企鹅、`seal` 海豹、`bear` 小熊、`bunny` 兔子 |
| 远方 | `telescope` 望远镜、`globe` 地球仪 |

默认关闭的只有 `stringLights`（串灯）；其余默认打开。`?objects=stringLights:on` 可以让串灯在进入时就亮着。

---

## 4. 消息协议

### 4.1 父页面 → 窗畔

```js
const WINDOWLIGHT_ORIGIN = 'https://<窗畔域名>';

iframe.contentWindow.postMessage(
  {
    type: 'windowlight:command',
    command: 'setMood',
    payload: 'rain',
    id: 'm-1' // 可选；带上才会收到 result
  },
  WINDOWLIGHT_ORIGIN // 必须是窗畔的 origin，不要写 '*'
);
```

### 4.2 窗畔 → 父页面

| 消息 | 时机 | 形状 |
|---|---|---|
| `windowlight:ready` | 房间加载完成、初始参数应用后 | `{ type, state }` |
| `windowlight:state` | 场景 / 陈设 / 声音 / 沉浸 / 唱片变化，110ms 去抖 | `{ type, reason, state }` |
| `windowlight:result` | 命令带 `id` 时的回执 | `{ type, id, result: { ok, state, error? } }` |

`state` 的字段：

```json
{
  "ready": true,
  "version": "1.0.0",
  "embedded": true,
  "mood": "dusk",
  "label": "黄昏",
  "en": "DUSK",
  "no": "01",
  "kind": "street",
  "quote": "把街灯一盏盏点亮，等一壶水慢慢烧开。",
  "sound": false,
  "immersion": false,
  "objects": { "piano": true, "record": true, "screen": false, "bunny": true },
  "music": {
    "count": 1,
    "playing": false,
    "title": "Sea of Cloud",
    "artist": "Nujabes",
    "builtin": true,
    "duration": 181.77,
    "currentTime": 0,
    "modalOpen": false
  }
}
```

- `kind` 为 `street`（六种街景）或 `dream`（十二重幻境），可用于在 Lumina 里显示不同的文案。
- `objects` 只反映可见性，不暴露位置、网格或材质。
- `music.currentTime` 是**事件发生时的快照**。要画播放进度条，请每秒发一次 `state` 命令，而不是等广播。
- `embedded` 表示是否处在 iframe 中或带了 `embed=1`。

### 4.3 命令表

| command | payload | 说明 |
|---|---|---|
| `state` / `getState` | 无 | 取当前完整状态，用于首次同步与进度轮询 |
| `setMood` / `mood.set` | `'rain'` 或 `{ mood: 'rain' }` | 切到指定场景 |
| `mood.next` | 无 | 按 01→18 顺序切下一个 |
| `mood.prev` | 无 | 上一个 |
| `setObject` | `{ key: 'screen', on: true }` | 单个陈设开关 |
| `setObjects` | `{ screen: true, bunny: false }` | 批量陈设开关 |
| `setSound` | `true` / `false` / `'on'` / `'off'` | 环境音 |
| `setImmersion` | `true` / `false` | 沉浸模式（隐藏窗畔自己的 UI） |
| `music.play` | 无 | 播放当前唱片；无用户手势时可能被浏览器拒绝 |
| `music.pause` | 无 | 暂停 |
| `music.toggle` | 无 | 播放 / 暂停 |
| `music.next` | 无 | 下一张 |
| `music.restore` | 无 | 把内置唱片放回唱片柜 |
| `music.open` | 无 | 打开唱片柜弹层 |
| `music.close` | 无 | 关闭弹层 |

未知场景、未知陈设会返回 `{ ok: false, error: 'unknown-mood' | 'unknown-object' }`，不会改房间。

### 4.4 安全与来源

- 父页面发来的命令必须同时满足：`event.source === iframe.contentWindow` 且 origin 在白名单里。
- 未写 `parentOrigin` 时，默认只信任**与窗畔同源**的父页面。跨域嵌入请明确写 Lumina 的 origin。
- 状态广播不带任何私人数据，只有场景名与唱片名；未声明 `parentOrigin` 时广播目标为 `*`，声明后只发给白名单。
- 需要临时联调多个端口时，可以写 `parentOrigin=http://localhost:5173,http://127.0.0.1:5173`，不要长期使用 `*`。

### 4.5 同源直连

如果父页面与窗畔同源，可以不走 postMessage：

```js
const WP = iframe.contentWindow.WP;
WP.Bridge.getState();
WP.Bridge.command('setMood', 'snow');
iframe.contentWindow.addEventListener('windowlight:state', (e) => {
  console.log(e.detail.mood);
});
```

窗畔内部也会派发同名 `CustomEvent`，方便本机调试和自动化测试。

---

## 5. 18 个场景怎么对上 Lumina 的三种情绪

Lumina 现在只有积极 / 中性 / 消极三套主题。窗畔有 18 个场景，建议先按情绪分组，再允许用户单独换：

| Lumina 主题 | 推荐默认 | 同组可选 |
|---|---|---|
| 积极 | `meadow` 花野 | `dawn` 清晨、`day` 晴昼、`aurora` 极光、`sakura` 樱夜、`hanabi` 花火、`cloudsea` 云海、`firefly` 萤森 |
| 中性 | `dusk` 黄昏 | `snow` 初雪、`cosmos` 星潮、`isles` 浮岛、`booksea` 书海、`moon` 月面 |
| 消极 | `rain` 雨夜 | `abyss` 深海、`dunes` 沙海、`ice` 冰原 |

切换规则建议：

1. 用户切换主题时，只有在**用户没有手动选过场景**的情况下才自动换默认场景；手动选过就尊重手动选择。
2. 两次切换间隔至少 1.5 秒，避免场景状态机被打断。
3. 不要把「消极主题」自动理解成「用户心情不好」。场景只是背景，不写进情绪记录，也不弹询问。

### 可选：22 个情绪词更细的落点

如果以后想做「选完情绪词，房间也跟着变」，可以用下面这张建议表。它只是映射建议，不替用户做判断，也不影响 Lumina 现有三套主题。

| 情绪词 | 场景 | 情绪词 | 场景 |
|---|---|---|---|
| 期待 | `dawn` 清晨 | 焦虑 | `rain` 雨夜 |
| 喜悦 | `hanabi` 花火 | 害怕 | `abyss` 深海 |
| 自豪 | `day` 晴昼 | 生气 | `dunes` 沙海 |
| 感动 | `firefly` 萤森 | 羡慕 | `cosmos` 星潮 |
| 满足 | `dusk` 黄昏 | 失落 | `snow` 初雪 |
| 安心 | `dusk` 黄昏 | 委屈 | `rain` 雨夜 |
| 怀念 | `sakura` 樱夜 | 孤独 | `moon` 月面 |
| 疲惫 | `booksea` 书海 | 愧疚 | `rain` 雨夜 |
| 自卑 | `ice` 冰原 | 迷茫 | `isles` 浮岛 |
| 压抑 | `abyss` 深海 | 无聊 | `cloudsea` 云海 |
| 纠结 | `cloudsea` 云海 | 尴尬 | `snow` 初雪 |

---

## 6. 功能怎么融（只写说明，不真改）

### 6.1 情绪主题

Lumina 现在的主题切换已经会改 CSS 变量与 Canvas 场景。加窗畔时，只多一步：在主题变化后给 iframe 发 `setMood`。窗畔自己的侧栏在 `ui=0` 下是隐藏的，Lumina 可以用三个按钮或一个下拉来换具体场景。

### 6.2 专注（番茄钟）

这是最自然的结合点，但要注意别抢音频：

- 开始专注：`setImmersion(true)`，让窗畔收起自己的 UI；如果用户已经开过音乐，保持播放，不要重新 `play`。
- 专注结束：`setImmersion(false)`，可以发一次 `music.pause`，也可以让音乐继续，取决于 Lumina 的声音设置。
- 不要在页面加载时自动 `music.play`。浏览器会拒绝，而且突然出声会吓到人。
- 不要把番茄钟剩余时间塞进窗畔。窗畔没有计时显示，硬加会破坏房间的安静感；时间留在 Lumina 自己的面板里。

### 6.3 今日任务、规划师、情绪记录

这三块建议**完全不进 iframe**：

- 窗畔没有任务数据接口，也不应该为了嵌入去读 Lumina 的 `lumina:data`。
- 情绪记录是私人的，窗畔只需要知道「当前主题 / 场景」，不需要知道记录内容。
- 如果以后想让房间对任务完成有反馈，优先在 Lumina 侧做一个小动效或提示，而不是把任务列表塞进 3D 房间。

### 6.4 声音只能有一个主人

Lumina 已经有 20 分钟的环境循环（鸟鸣 / Lofi / 雨声），窗畔也有环境音与唱片。两套同时开一定打架。建议二选一：

- **方案 A（推荐）**：Lumina 管环境音，窗畔用 `sound=off`，只保留用户主动点的唱片。
- **方案 B**：窗畔管声音，Lumina 在进入房间视图时暂停自己的 `noise`，离开时恢复。

无论选哪个，都要在 UI 上让用户看得见「现在是谁在响」，不要出现两个音量按钮控制同一段声音的错觉。

### 6.5 和 v2.0 3D 小屋的关系

Lumina README 里计划用 `three` 搭一间低多边形小屋。窗畔可以当成：

- v2.0 之前的**房间视图预览 / 彩蛋**，用 feature flag 控制，默认关闭；
- 或者 v2.0 的**备选房间风格**，由用户选「代码小屋」还是「窗畔」。

但不要把窗畔直接当成 v2.0 的成品：窗畔的定位是「窗边的房间」，交互与镜头是围绕这个场景写的；Lumina 的 3D 小屋如果要接任务、专注、情绪，仍然应该由 Lumina 自己实现数据层。两者共享的只有「情绪 → 场景」的映射思路。

### 6.6 明确不要做的事

- 不要把窗畔的 `vendor/three.min.js` 或 `src/*.js` 复制进 Lumina 的构建。
- 不要让两个项目共享 `localStorage` 键，也不要互相删除对方的数据。
- 不要跨域读取 iframe 内部 DOM；全部走 postMessage。
- 不要因为嵌入了窗畔就删掉 Lumina 原有的 Canvas 2D 场景。窗畔是可选视图，不是替代品。
- 不要在用户没有操作时自动播放音乐或自动切场景。

---

## 7. 音频与自动播放

窗畔的唱片是真实的 `HTMLAudioElement`，内置曲目是 `assets/music/Nujabes - Sea of Cloud.mp3`，导入的曲目存在 IndexedDB。

- 浏览器要求播放前有用户手势。父页面发 `music.play` 时，如果用户刚刚点过 Lumina 的按钮，通常算手势；页面刚加载就发，会被拒绝，窗畔会静默保持暂停。
- 最稳的路径是让用户直接点房间里的唱片机：那一次点击发生在 iframe 内，一定是手势。
- iframe 需要 `allow="autoplay"`；缺少它时，部分浏览器会更严格。
- 如果 Lumina 自己在放环境音，进入房间前先暂停，避免两条音轨叠在一起。
- **版权提醒**：内置的 Nujabes 曲目来自本机音乐库，适合本地与个人使用。若要公开部署 Lumina + 窗畔，请换成有授权的音乐，或让用户自己导入；不要把一个受版权保护的 mp3 直接放进公开站点。

---

## 8. 存储命名空间

| 项目 | 键 / 库 | 内容 |
|---|---|---|
| 窗畔 | `windowlight.music.v1` | 唱片列表元数据（不含音频本体） |
| 窗畔 | `windowlight.music.current` | 当前唱片 id |
| 窗畔 | IndexedDB `windowlight-music` / `blobs` | 用户导入的音频 Blob，单曲 ≤ 60 MB |
| Lumina | `lumina:data`、`lumina:theme`、`lumina:sound`、`lumina:noise`、`lumina:sidebar-width` | 任务、情绪记录、专注、主题与设置 |

两边没有任何交叉读写。同源嵌入时，窗畔的唱片会在独立页面与 iframe 之间共享；跨域嵌入则是两套独立存储，这是浏览器的同源策略，不是 bug。

---

## 9. 性能、响应式与可访问性

- **按需挂载**：只有用户点开「房间」时才创建 iframe；关闭后可以保留（保留播放状态）或销毁（省显存）。不要一进 Lumina 就加载 WebGL。
- **只挂一个**：同一时间最多一个窗畔实例。多个隐藏 iframe 会各自占用 WebGL 上下文与音频解码。
- **窄屏**：手机建议先显示一张静态海报 + 「打开房间」按钮，或直接不提供；窗畔在移动端会降分辨率，但仍然吃 GPU。
- **减弱动效**：加 `intro=0` 跳过推镜；窗畔自身会读取 `prefers-reduced-motion` 调整部分动效，但 3D 场景本身不会完全静止。对动效敏感的用户，提供「只看截图」的选项更稳妥。
- **键盘与读屏**：`ui=0` 时窗畔自己的控件被隐藏，Lumina 需要提供等价的场景切换、音乐开关按钮，并通过命令控制；iframe 要有 `title`。
- **错误兜底**：WebGL 不可用时窗畔会停在加载页。父页面应监听到 `windowlight:ready` 超时（例如 15 秒）后显示静态图与「重试」，不要把用户卡在空白 iframe 里。

---

## 10. 以后真正落地时的步骤（现在不要改 Lumina）

1. 在 Lumina 加一个默认关闭的 feature flag，例如 `windowlight`，不改变现有路由。
2. 新建一个独立组件（示意，不是现有代码）：

```tsx
const WINDOWLIGHT_ORIGIN = import.meta.env.VITE_WINDOWLIGHT_ORIGIN;
const MOOD_FOR_THEME = {
  positive: 'meadow',
  neutral: 'dusk',
  negative: 'rain'
} as const;

export function WindowlightFrame({ theme }: { theme: 'positive' | 'neutral' | 'negative' }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== WINDOWLIGHT_ORIGIN) return;
      if (event.data?.type === 'windowlight:ready') setReady(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    ref.current?.contentWindow?.postMessage(
      { type: 'windowlight:command', command: 'setMood', payload: MOOD_FOR_THEME[theme] },
      WINDOWLIGHT_ORIGIN
    );
  }, [ready, theme]);

  return (
    <iframe
      ref={ref}
      title="窗畔 · 可互动的房间"
      allow="autoplay"
      loading="lazy"
      src={`${WINDOWLIGHT_ORIGIN}/index.html?embed=1&ui=0&sound=off&intro=0&parentOrigin=${encodeURIComponent(location.origin)}`}
    />
  );
}
```

3. 在设置里加「房间」开关，默认关闭；关闭时完全不创建 iframe。
4. 用一个小的消息 hook 统一处理 `ready / state / result`，并在组件卸载时移除监听。
5. 处理音频归属（见 6.4）与自动播放失败的情况。
6. 加一条超时兜底与「打开原页面」链接。
7. 只有以上都完成，才考虑把入口放进主界面；不要动 Lumina 的存储结构。

---

## 11. 自测清单

在窗畔项目根目录起一个静态服务器（任何静态服务器都行）：

```bash
cd D:/记事本/workplace/05_暂存/窗畔_2026-10-30
python -m http.server 8766
```

打开：

```text
http://127.0.0.1:8766/index.html?embed=1&ui=0&mood=sakura&sound=off&intro=0&objects=screen:on,bunny:off
```

在控制台检查：

```js
document.body.className;      // 期望包含 is-embedded、is-embed-bare
WP.Bridge.getState();         // mood 应为 sakura，screen 为 true，bunny 为 false
```

父页面同源测试：

```js
const f = document.querySelector('iframe');
window.addEventListener('message', (e) => console.log(e.data));
f.contentWindow.postMessage(
  { type: 'windowlight:command', command: 'setMood', payload: 'rain', id: 't1' },
  location.origin
);
// 期望收到 windowlight:result，result.ok 为 true
```

跨域拒绝测试：让 iframe 带 `?parentOrigin=https://example.com`，再从本地父页面发命令，应当**收不到 result**，房间也不变。这证明白名单生效。

自动化截图与 CDP 脚本放在：

```text
D:/记事本/workplace/03_测试地点/02_Lumina-Space_2026-10-24/03_窗畔_2026-10-30/test
```

它们只用于验收，不属于窗畔产品代码，也不会被部署。

---

## 12. 维护者备注

- **加陈设**：在 `WP.APP.furniture` 里新增 key 后，桥会自动把它放进 `state.objects`，`?objects=` 与 `setObject` 也自动支持，不需要改 `bridge.js`。
- **加场景**：只要加进 `WP.MOOD_ORDER` 和 `WP.MOODS`，`mood` 参数与 `mood.next/prev` 就自动可用；记得同步第 5 节的映射表。
- **加载顺序**：`bridge.js` 必须在 `main.js` 之后、`</body>` 之前；`main.js` 的 `boot()` 完成时会调用 `WP.Bridge.onAppReady()`。若调整脚本顺序，请确认这一点。
- **协议变更**：改命令名、状态字段或消息类型时，请提升 `VERSION` 并更新本文；不要让父页面悄悄失效。
- **已知限制**：初始陈设参数要等房间启动后才应用；无手势时 `music=play` 会被浏览器拒绝；`currentTime` 需要父页面轮询；跨域必须声明 `parentOrigin`。
- **文件边界**：本项目的改动只在 `窗畔_2026-10-30/` 内；Lumina-Space 保持只读。

---

## 13. 验收记录

| 日期 | 环境 | 内容 | 结果 |
|---|---|---|---|
| 2026-10-30 | 本机 / Edge 156 headless / 127.0.0.1:8766 | `embed=1&ui=0&toast=0&intro=0&mood=sakura&sound=off&objects=screen:on,bunny:off` 的类名与初始状态 | 通过：`is-embedded is-embed-bare is-embed-quiet`，樱夜，屏风开、兔子关、环境声关 |
| 2026-10-30 | 同上 | `ready / state / result`、`setMood / setObject / setObjects / state`、非法场景与陈设的报错 | 通过：命令回执 id 正确，未知值返回 `unknown-mood` / `unknown-object`，状态不变 |
| 2026-10-30 | 同上 | `music.play / music.pause / setImmersion` 与页面内 `WP.setMood` 触发的主动广播 | 通过：唱片播放 1.28 秒后暂停，沉浸状态切换，父页收到 `reason: mood` 广播 |
| 2026-10-30 | 同上 | 白名单写成 `https://example.com` 时的跨域拒绝 | 通过：父页收不到 ready/state/result，房间状态保持不变 |
| 2026-10-30 | 同上 | 不写 `parentOrigin` 的同源父页（默认信任） | 通过：ready 与 result 均正常 |
| 2026-10-30 | 同上 | 控制台错误 | 0 条 |

自动化脚本：`test/bridge-test.mjs`；报告：`test/bridge-report.json`；截图：`77_embed_bare.png`、`78_embed_parent_allowed.png`、`79_embed_parent_rejected.png`。
