# 林间 3D 小屋 · Lumina-Space 接入说明

这是一个**零业务依赖**的包装：`CabinScene` 只认 props 和 ref，不读 Lumina 的 store、不引用 `MoodId`，因此可以直接放进 `src/app/` 或任意 feature 目录。场景包含四景天气、点击小人对话、程序化环境声和堆雪人。

## 一、复制文件

把交付目录里的文件放到 Lumina 项目：

| 交付文件 | Lumina 中的位置 |
| --- | --- |
| `integration/lumina/CabinScene.tsx` | `src/app/CabinScene.tsx` |
| `integration/lumina/CabinScene.module.css` | `src/app/CabinScene.module.css` |
| `engine/cabinScene.js` | `public/cabin/cabinScene.js` |

`public/cabin/cabinScene.js` 必须保留文件名与路径；如果想换位置，通过 `engineSrc` 传入新地址。

## 二、运行时依赖

场景需要 three.js **r149 UMD**。`CabinScene` 默认从 jsDelivr 加载：

```text
https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js
```

引擎脚本和 three 都只会加载一次（按地址做了缓存），组件卸载时会释放 WebGL 资源。**不需要给 Lumina 增加 npm 依赖**。

如果部署环境不能访问外网，把 three 的 `build/three.min.js` 下载到 `public/cabin/three.min.js`，然后：

```tsx
<CabinScene threeSrc="/cabin/three.min.js" />
```

（`public/cabin/three.min.js` 与 `public/cabin/cabinScene.js` 同级即可。）

## 三、最小用法（替换 Stage 里的 MoodScene）

```tsx
import CabinScene from './CabinScene';

// 在 <section className={styles.stage}> 的 .scene 层里：
<CabinScene weather="sunny" />
```

把它放在和原 `MoodScene` 相同的位置即可；canvas 默认 `position:absolute; inset:0; pointer-events:none;`，不会挡住 Lumina 的按钮与滚动。

### 带天气切换

```tsx
import { useState } from 'react';
import CabinScene, { type CabinWeather } from './CabinScene';

const WEATHERS: Array<{ id: CabinWeather; label: string }> = [
  { id: 'sunny', label: '晴天' },
  { id: 'rain', label: '落雨' },
  { id: 'snow', label: '下雪' },
  { id: 'dusk', label: '黄昏' },
];

function CabinBackground() {
  const [weather, setWeather] = useState<CabinWeather>('sunny');
  return (
    <>
      <CabinScene weather={weather} />
      <div className="weather-switch">
        {WEATHERS.map((item) => (
          <button key={item.id} type="button" onClick={() => setWeather(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
```

切换天气是**插值过渡**，不会重建场景；`weather` 改变只调用引擎的 `setWeather`。

### 与 Lumina 情绪联动（可选）

映射放在消费方，组件本身仍然不依赖 `MoodId`：

```tsx
const MOOD_WEATHER = {
  positive: 'sunny',
  neutral: 'dusk',
  negative: 'rain',
} as const;

<CabinScene weather={MOOD_WEATHER[mood]} />
```

如果 `Stage` 检测到自定义背景图，应继续走原来的图片分支，不渲染 `CabinScene`。

## 四、环境声

环境声全部由 Web Audio 实时合成，不加载音频文件。默认**关闭**，避免背景页突然出声：

```tsx
<CabinScene weather="snow" sound />        // 挂载即启用，首次点击 / 按键后真正出声
<CabinScene weather="snow" sound volume={0.4} />
```

四个场景各有独立混音：晴天有风、叶响和远处鸟鸣；雨天有雨幕、滴水与极低频闷雷；雪天是低通风声和落雪；黄昏有蟋蟀与极轻的篝火噼啪。切换天气时声场会平滑过渡。

- 浏览器自动播放策略要求用户手势；在第一次 `pointerdown` / `keydown` 之前，`running` 会是 `false`。
- 即使用户先静音、之后才开启，引擎也保留了手势监听，下一次交互会继续尝试解锁 AudioContext。
- 不支持 Web Audio 的浏览器会返回 `supported: false`，场景其余部分照常运行。
- 如果不想声音跟随场景（例如 Lumina 有自己的音频），保持默认 `sound={false}` 即可。

也可以用 ref 做独立的声音按钮：

```tsx
const sceneRef = useRef<CabinSceneHandle>(null);
const [soundOn, setSoundOn] = useState(false);

<button
  type="button"
  onClick={() => {
    const next = !soundOn;
    setSoundOn(next);
    sceneRef.current?.setSoundEnabled(next);
  }}
>
  {soundOn ? '静音' : '开启环境声'}
</button>
```

## 五、对话：点小人说话

```tsx
<CabinScene weather="sunny" interactive />
```

`interactive` 会把 canvas 的 `pointer-events` 打开。晴天、雨天、雪天、黄昏都可以点击小人，小人的头顶会弹出对话气泡（`role="status"`，`aria-live="polite"`），并按天气轮换台词；每第 10 次点击会插播一次彩蛋。

> `interactive` 会让画布捕获整个容器的指针事件。作为 Lumina 的全屏背景时应保持 `false`，否则会挡住页面滚动和按钮；如果确实要在背景里触发对话，建议用页面上的独立按钮调用 `ref.talk()`，而不是打开 `interactive`。

对话的其他行为：

- 气泡自动消失，停留时间按文本长度约为 5.2–9 秒。
- 切换天气会立即收起当前气泡。
- 点击小人不会误放雪人；下雪时只有点击空旷地面才会放置雪人。
- 引擎会把气泡节点追加到 `document.body`，带 `.cabin-speech` 类和 `[data-weather]` 属性，层级较高；需要定制外观时可以直接写全局样式，不必改组件。
- 不需要气泡时传 `speechBubble={false}`；气泡由 `ref.hideSpeech()` 也能立即收起。

## 六、堆雪人

```tsx
<CabinScene weather="snow" interactive />
```

下雪时按点击位置放置雪人（空地不足会通过 `onNotice` 提示），最多 12 个。晴天、雨天、黄昏点击空地无效。`interactive` 的注意事项同上。

## 七、Props

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `weather` | `'sunny' \| 'rain' \| 'snow' \| 'dusk'` | `'sunny'` | 当前天气 |
| `quality` | `'auto' \| 'low'` | `'auto'` | `low` 关闭阴影、DPR=1 |
| `interactive` | `boolean` | `false` | 是否接收指针（点小人对话、点空地堆雪人） |
| `sound` | `boolean` | `false` | 是否启用程序化环境声 |
| `volume` | `number` | `0.62` | 环境声总音量，0–1 |
| `speechBubble` | `boolean` | `true` | 点小人时是否显示头顶气泡 |
| `reducedMotion` | `boolean?` | 跟随系统 | 关掉雨雪飘动等动态 |
| `preserveDrawingBuffer` | `boolean` | `false` | 需要 `captureFrame` 时设 true |
| `className` / `style` | 常规 | – | 外层 canvas 样式 |
| `threeSrc` / `engineSrc` | `string` | CDN / BASE_URL | 离线部署时替换 |
| `onReady` | `(stats) => void` | – | 第一帧渲染完成 |
| `onError` | `(error) => void` | – | 启动失败 |
| `onNotice` | `(message) => void` | – | 雪人放不下等提示 |
| `onSnowmanCountChange` | `(count) => void` | – | 雪人数量变化 |
| `onPersonTalk` | `(event) => void` | – | 小人说话；事件含 `text`、`weather`、`clicks`、`easterEgg`、`lines` |
| `onAudioStateChange` | `(state) => void` | – | 环境声启用 / 解锁状态变化 |

## 八、ref API

```tsx
const sceneRef = useRef<CabinSceneHandle>(null);

sceneRef.current?.setWeather('rain');
sceneRef.current?.getWeather();
sceneRef.current?.placeSnowman(2.4, 3.1); // 世界坐标 x, z
sceneRef.current?.clearSnowmen();
sceneRef.current?.getSnowmanCount();
sceneRef.current?.getStats();
sceneRef.current?.talk();                 // 让小人说下一句；第 10 次是彩蛋
sceneRef.current?.getTalkCount();
sceneRef.current?.hideSpeech();
sceneRef.current?.setSoundEnabled(true);
sceneRef.current?.toggleSound();
sceneRef.current?.isSoundEnabled();
sceneRef.current?.getAudioState();
const png = sceneRef.current?.captureFrame('png');
```

`getStats()` 返回：

```js
{
  weather, ready, fps, width, height, dpr, drawCalls, triangles,
  snowCover, snowmen, maxSnowmen, quality, reducedMotion
}
```

`getAudioState()` 返回：

```js
{ supported, enabled, running, weather, volume }
```

`talk()` 直接返回本次对话事件；气泡没能创建（例如 `speechBubble: false`）时仍会返回台词和计数。

## 九、性能与兼容

- 场景约 9.1–9.3 万三角形；1280×800、DPR 1 时约 164–211 draw call（`low` 无阴影约 164，四景自动模式约 180–211）。
- 真实设备上的帧率未在自动化环境里取信；桌面集显目标 60fps，引擎 DPR 上限 1.5。
- 引擎内部已处理 DPR、ResizeObserver 级别的 resize、页面隐藏时的 rAF 暂停和 WebGL 上下文恢复。
- 不支持 WebGL2 时会退回 WebGL1；后处理会自动降级亮度阈值路径。
- 如果 Lumina 后续允许加 npm 依赖，也可以把 three 改成 `import * as THREE from 'three'` 并直接 import 引擎，减少一次网络请求；当前版本为了避免改 `package.json` 才走 UMD。
- 该组件**不会**修改 Lumina 的任何全局样式；canvas 的 `aria-hidden="true"` 保持背景语义。主题注入的 `<style>` 只用于 `.cabin-speech` 气泡。
- 背景场景 + `sound` 需要在用户第一次点击后才会真正出声，这是浏览器策略，不是组件延迟。
