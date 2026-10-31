import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from 'react';
import styles from './CabinScene.module.css';

export type CabinWeather = 'sunny' | 'rain' | 'snow' | 'dusk';

export interface CabinSceneStats {
  weather: CabinWeather;
  ready: boolean;
  fps: number;
  width: number;
  height: number;
  dpr: number;
  drawCalls: number;
  triangles: number;
  snowCover: number;
  snowmen: number;
  maxSnowmen: number;
  quality: string;
  reducedMotion: boolean;
}

export interface CabinAudioState {
  supported: boolean;
  enabled: boolean;
  running: boolean;
  weather: CabinWeather;
  volume: number;
}

export interface CabinTalkEvent {
  text: string;
  weather: CabinWeather;
  clicks: number;
  easterEgg: boolean;
  lines: string[] | null;
}

export interface CabinSceneHandle {
  setWeather: (weather: CabinWeather) => void;
  getWeather: () => CabinWeather;
  placeSnowman: (x: number, z: number) => boolean;
  clearSnowmen: () => void;
  getSnowmanCount: () => number;
  getStats: () => CabinSceneStats;
  captureFrame: (type?: 'png' | 'jpeg') => string | null;
  /** 让小人说下一句台词；第十次点击会返回彩蛋。 */
  talk: () => CabinTalkEvent | null;
  getTalkCount: () => number;
  hideSpeech: () => void;
  setSoundEnabled: (enabled: boolean) => boolean;
  toggleSound: () => boolean;
  isSoundEnabled: () => boolean;
  getAudioState: () => CabinAudioState;
}

export interface CabinSceneProps {
  /** 天气场景，默认晴天。 */
  weather?: CabinWeather;
  /** low 会关闭阴影并把 DPR 压到 1。 */
  quality?: 'auto' | 'low';
  /** 是否接收指针事件；作为背景时应保持 false。 */
  interactive?: boolean;
  /** 传 true 后才能用 captureFrame 截图，会增加一点显存开销。 */
  preserveDrawingBuffer?: boolean;
  /** 不传则跟随系统 prefers-reduced-motion。 */
  reducedMotion?: boolean;
  /** 环境声默认关闭；作为背景氛围时再显式开启。 */
  sound?: boolean;
  /** 环境声总音量 0～1，默认 0.62。 */
  volume?: number;
  /** 是否显示点小人时的对话气泡，默认 true。 */
  speechBubble?: boolean;
  className?: string;
  style?: CSSProperties;
  /** three.js r149 UMD 地址；默认走 CDN。离线时换成 public 下的本地文件。 */
  threeSrc?: string;
  /** 场景引擎地址；默认取 Vite BASE_URL 下的 cabin/cabinScene.js。 */
  engineSrc?: string;
  onReady?: (stats: CabinSceneStats) => void;
  onError?: (error: unknown) => void;
  onNotice?: (message: string) => void;
  onSnowmanCountChange?: (count: number) => void;
  onPersonTalk?: (event: CabinTalkEvent) => void;
  onAudioStateChange?: (state: CabinAudioState) => void;
}

interface EngineController {
  setWeather: (weather: string) => void;
  getWeather: () => string;
  placeSnowman: (x: number, z: number) => boolean;
  clearSnowmen: () => void;
  getSnowmanCount: () => number;
  getStats: () => CabinSceneStats;
  captureFrame: (type?: string) => string | null;
  talk: () => CabinTalkEvent;
  getTalkCount: () => number;
  hideSpeech: () => void;
  setSoundEnabled: (enabled: boolean) => boolean;
  toggleSound: () => boolean;
  isSoundEnabled: () => boolean;
  setVolume: (volume: number) => number;
  getAudioState: () => CabinAudioState;
  dispose: () => void;
}

interface EngineOptions {
  THREE: unknown;
  weather: CabinWeather;
  quality: 'auto' | 'low';
  reducedMotion?: boolean;
  preserveDrawingBuffer: boolean;
  sound: boolean;
  volume: number;
  speechBubble: boolean;
  onReady?: (stats: CabinSceneStats) => void;
  onError?: (error: unknown) => void;
  onNotice?: (message: string) => void;
  onSnowmanCountChange?: (count: number) => void;
  onPersonTalk?: (event: CabinTalkEvent) => void;
  onAudioStateChange?: (state: CabinAudioState) => void;
}

interface EngineGlobal {
  createCabinScene: (canvas: HTMLCanvasElement, options: EngineOptions) => EngineController;
}

declare global {
  interface Window {
    THREE?: unknown;
    CabinSceneEngine?: EngineGlobal;
  }
}

const DEFAULT_THREE_SRC = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js';
const DEFAULT_ENGINE_SRC = `${import.meta.env.BASE_URL}cabin/cabinScene.js`;

const scriptCache = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const cached = scriptCache.get(src);
  if (cached) {
    return cached;
  }
  const pending = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptCache.delete(src);
      reject(new Error(`脚本加载失败：${src}`));
    };
    document.head.appendChild(script);
  });
  scriptCache.set(src, pending);
  return pending;
}

async function ensureRuntime(threeSrc: string, engineSrc: string): Promise<EngineGlobal> {
  if (!window.THREE) {
    await loadScript(threeSrc);
  }
  if (!window.THREE) {
    throw new Error('three.js 没有正确挂到 window.THREE');
  }
  if (!window.CabinSceneEngine) {
    await loadScript(engineSrc);
  }
  if (!window.CabinSceneEngine) {
    throw new Error('CabinScene 引擎没有正确挂到 window.CabinSceneEngine');
  }
  return window.CabinSceneEngine;
}

/**
 * Lumina-Space 兼容包装：只接收 props / ref，不读取任何业务 store。
 * 依赖外部脚本 three r149 + 本项目的 cabinScene.js，不新增 npm 依赖。
 */
const CabinScene = forwardRef<CabinSceneHandle, CabinSceneProps>(function CabinScene(
  {
    weather = 'sunny',
    quality = 'auto',
    interactive = false,
    preserveDrawingBuffer = false,
    reducedMotion,
    sound = false,
    volume = 0.62,
    speechBubble = true,
    className,
    style,
    threeSrc = DEFAULT_THREE_SRC,
    engineSrc = DEFAULT_ENGINE_SRC,
    onReady,
    onError,
    onNotice,
    onSnowmanCountChange,
    onPersonTalk,
    onAudioStateChange,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<EngineController | null>(null);
  const latest = useRef({
    weather,
    sound,
    volume,
    onReady,
    onError,
    onNotice,
    onSnowmanCountChange,
    onPersonTalk,
    onAudioStateChange,
  });
  latest.current = {
    weather,
    sound,
    volume,
    onReady,
    onError,
    onNotice,
    onSnowmanCountChange,
    onPersonTalk,
    onAudioStateChange,
  };

  useImperativeHandle(
    ref,
    () => ({
      setWeather(next) {
        sceneRef.current?.setWeather(next);
      },
      getWeather() {
        return (sceneRef.current?.getWeather() as CabinWeather | undefined) ?? weather;
      },
      placeSnowman(x, z) {
        return sceneRef.current?.placeSnowman(x, z) ?? false;
      },
      clearSnowmen() {
        sceneRef.current?.clearSnowmen();
      },
      getSnowmanCount() {
        return sceneRef.current?.getSnowmanCount() ?? 0;
      },
      getStats() {
        return (
          sceneRef.current?.getStats() ?? {
            weather,
            ready: false,
            fps: 0,
            width: 0,
            height: 0,
            dpr: 0,
            drawCalls: 0,
            triangles: 0,
            snowCover: 0,
            snowmen: 0,
            maxSnowmen: 0,
            quality,
            reducedMotion: false,
          }
        );
      },
      captureFrame(type) {
        return sceneRef.current?.captureFrame(type) ?? null;
      },
      talk() {
        return sceneRef.current?.talk() ?? null;
      },
      getTalkCount() {
        return sceneRef.current?.getTalkCount() ?? 0;
      },
      hideSpeech() {
        sceneRef.current?.hideSpeech();
      },
      setSoundEnabled(enabled) {
        return sceneRef.current?.setSoundEnabled(enabled) ?? false;
      },
      toggleSound() {
        return sceneRef.current?.toggleSound() ?? false;
      },
      isSoundEnabled() {
        return sceneRef.current?.isSoundEnabled() ?? false;
      },
      getAudioState() {
        return (
          sceneRef.current?.getAudioState() ?? {
            supported: false,
            enabled: false,
            running: false,
            weather,
            volume,
          }
        );
      },
    }),
    [quality, weather, volume],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    let disposed = false;
    let controller: EngineController | null = null;

    const boot = async () => {
      try {
        const engine = await ensureRuntime(threeSrc, engineSrc);
        if (disposed) {
          return;
        }
        const options: EngineOptions = {
          THREE: window.THREE,
          weather: latest.current.weather,
          quality,
          preserveDrawingBuffer,
          sound: latest.current.sound,
          volume: latest.current.volume,
          speechBubble,
          onReady: (stats) => latest.current.onReady?.(stats),
          onError: (error) => latest.current.onError?.(error),
          onNotice: (message) => latest.current.onNotice?.(message),
          onSnowmanCountChange: (count) => latest.current.onSnowmanCountChange?.(count),
          onPersonTalk: (event) => latest.current.onPersonTalk?.(event),
          onAudioStateChange: (state) => latest.current.onAudioStateChange?.(state),
        };
        if (reducedMotion !== undefined) {
          options.reducedMotion = reducedMotion;
        }
        controller = engine.createCabinScene(canvas, options);
        sceneRef.current = controller;
        if (disposed) {
          controller.dispose();
          controller = null;
          sceneRef.current = null;
        }
      } catch (error) {
        if (!disposed) {
          latest.current.onError?.(error);
        }
      }
    };

    void boot();

    return () => {
      disposed = true;
      controller?.dispose();
      controller = null;
      sceneRef.current = null;
    };
  }, [engineSrc, preserveDrawingBuffer, quality, reducedMotion, speechBubble, threeSrc]);

  useEffect(() => {
    sceneRef.current?.setWeather(weather);
  }, [weather]);

  useEffect(() => {
    sceneRef.current?.setSoundEnabled(sound);
  }, [sound]);

  useEffect(() => {
    sceneRef.current?.setVolume(volume);
  }, [volume]);

  return (
    <canvas
      ref={canvasRef}
      className={[styles.canvas, interactive ? styles.interactive : '', className]
        .filter(Boolean)
        .join(' ')}
      style={style}
      aria-hidden="true"
    />
  );
});

export default CabinScene;
