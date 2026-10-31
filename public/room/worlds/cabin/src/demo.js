/*!
 * 林间小屋 · 独立演示页
 * 只负责 URL 参数、界面文案和测试钩子；所有渲染在 engine/cabinScene.js 里。
 */
(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const canvas = document.getElementById('scene');
  const loader = document.getElementById('loader');
  const toastEl = document.getElementById('toast');
  const debugEl = document.getElementById('debug');
  const errorEl = document.getElementById('error-note');
  const weatherButtons = Array.prototype.slice.call(document.querySelectorAll('.weather-btn'));
  const weatherLabel = document.getElementById('weather-label');
  const weatherDesc = document.getElementById('weather-desc');
  const snowHint = document.getElementById('snow-hint');
  const snowCountEl = document.getElementById('snow-count');
  const clearButton = document.getElementById('clear-snowmen');
  const soundButton = document.getElementById('sound-toggle');

  const uiHidden = params.get('ui') === '0';
  const debugEnabled = params.get('debug') === '1';
  const forceReducedMotion = params.get('motion') === '0';
  const quality = params.get('quality') === 'low' ? 'low' : 'auto';
  const requestedWeather = params.get('weather');
  const requestedTalk = Math.max(0, Math.min(20, parseInt(params.get('talk') || '0', 10) || 0));
  const talkDelay = Math.max(200, parseInt(params.get('talkdelay') || '900', 10) || 900);
  const requestedSnowmen = Math.max(
    0,
    Math.min(12, parseInt(params.get('snowmen') || '0', 10) || 0)
  );

  if (uiHidden) {
    document.body.classList.add('ui-hidden');
  }

  const META = {
    sunny: {
      label: '晴天',
      desc: '风把松针吹得很轻。',
      hint: '下雪时，点一下空地，就能堆一个雪人。'
    },
    rain: {
      label: '落雨',
      desc: '雨点落在木檐上，像翻书页的声音。',
      hint: '小人撑起了伞，腿边的书页不会被淋湿。'
    },
    snow: {
      label: '下雪',
      desc: '雪正在把整片林子调成静音。',
      hint: '点一下空地放雪人；最多可以挤下 12 个。'
    },
    dusk: {
      label: '黄昏',
      desc: '窗灯亮起，松林一点点退进暮色。',
      hint: '萤火虫出来了，白天堆好的雪人还站在那里。'
    }
  };

  let scene = null;
  let toastTimer = 0;
  let snowmanCount = 0;
  let debugTimer = 0;
  let seeded = false;
  let audioState = { supported: true, enabled: true, running: false, weather: 'sunny' };

  function showToast(message) {
    if (!toastEl || uiHidden || !message) {
      return;
    }
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove('is-visible');
    }, 3200);
  }

  function updateSoundButton(next) {
    if (next) {
      audioState = next;
    }
    if (!soundButton) {
      return;
    }
    const enabled = audioState.enabled !== false;
    const running = audioState.running === true;
    soundButton.classList.toggle('is-muted', !enabled);
    soundButton.classList.toggle('is-pending', enabled && !running);
    soundButton.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    const label = !enabled
      ? '环境声已关闭，点击开启'
      : running
        ? '环境声已开启，点击静音'
        : '环境声待启动，点击开启';
    soundButton.setAttribute('aria-label', label);
    soundButton.title = label;
  }

  function updateSnowTools(count) {
    if (typeof count === 'number') {
      snowmanCount = count;
    }
    if (snowCountEl) {
      snowCountEl.textContent = String(snowmanCount);
    }
    if (clearButton) {
      clearButton.disabled = snowmanCount === 0;
      clearButton.style.opacity = snowmanCount === 0 ? '0.45' : '';
    }
    document.body.classList.toggle('has-snowmen', snowmanCount > 0);
  }

  function setActiveWeather(name) {
    const meta = META[name] || META.sunny;
    document.body.dataset.weather = name;
    weatherButtons.forEach(function (button) {
      const active = button.dataset.weather === name;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (weatherLabel) {
      weatherLabel.textContent = meta.label;
    }
    if (weatherDesc) {
      weatherDesc.textContent = meta.desc;
    }
    if (snowHint) {
      snowHint.textContent = meta.hint;
    }
  }

  function hideLoader() {
    if (!loader) {
      return;
    }
    loader.classList.add('is-hidden');
    window.setTimeout(function () {
      loader.style.display = 'none';
    }, 900);
  }

  function handleError(error) {
    window.console.error('[林间小屋] 场景启动失败：', error);
    hideLoader();
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent =
        '场景没能启动：' +
        (error && error.message ? error.message : '未知错误') +
        '。请确认浏览器支持 WebGL，并允许访问 three.js 的 CDN。';
    }
  }

  function seedSnowmen(count) {
    if (!scene) {
      return;
    }
    const spots = [
      [2.0, 0.2],
      [0.2, 0.4],
      [1.6, 2.1],
      [4.3, 1.4],
      [-1.6, 4.7],
      [3.1, 6.9],
      [5.0, 4.9],
      [0.9, 7.2],
      [-4.2, 6.4],
      [-2.0, -0.2],
      [4.8, 2.8],
      [-3.4, 1.6]
    ];
    let placed = 0;
    for (let i = 0; i < spots.length && placed < count; i += 1) {
      if (scene.placeSnowman(spots[i][0], spots[i][1])) {
        placed += 1;
      }
    }
    let guard = 0;
    while (placed < count && guard < 90) {
      guard += 1;
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.4 + Math.random() * 6.4;
      const x = 0.6 + Math.cos(angle) * radius;
      const z = 2.1 + Math.sin(angle) * radius;
      if (scene.placeSnowman(x, z)) {
        placed += 1;
      }
    }
    updateSnowTools(scene.getSnowmanCount());
    if (placed < count) {
      window.console.warn('[林间小屋] 预留的空地不足，雪人只放下 ' + placed + ' / ' + count + ' 个。');
    }
  }

  function switchWeather(name) {
    if (!scene) {
      return false;
    }
    const applied = scene.setWeather(name);
    if (applied) {
      setActiveWeather(name);
    }
    return applied;
  }

  function startDebug() {
    if (!debugEl || !scene) {
      return;
    }
    debugEl.hidden = false;
    const update = function () {
      if (!scene) {
        return;
      }
      const stats = scene.getStats();
      const snowCover = Number(stats.snowCover || 0).toFixed(2);
      debugEl.textContent = [
        'weather ' +
          stats.weather +
          '  |  fps ' +
          stats.fps +
          '  |  tris ' +
          stats.triangles +
          '  |  calls ' +
          stats.drawCalls,
        'snowmen ' +
          stats.snowmen +
          '/' +
          stats.maxSnowmen +
          '  |  snowCover ' +
          snowCover +
          '  |  dpr ' +
          stats.dpr +
          '  |  quality ' +
          stats.quality,
        'viewport ' +
          Math.round(stats.width) +
          ' × ' +
          Math.round(stats.height) +
          '  |  motion ' +
          (stats.reducedMotion ? 'reduced' : 'full')
      ].join('\n');
    };
    update();
    debugTimer = window.setInterval(update, 600);
  }

  weatherButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      switchWeather(button.dataset.weather);
    });
  });

  if (clearButton) {
    clearButton.addEventListener('click', function () {
      if (!scene) {
        return;
      }
      scene.clearSnowmen();
      updateSnowTools(scene.getSnowmanCount());
      showToast('雪人都清空了，等下一场雪吧。');
    });
  }

  if (soundButton) {
    soundButton.addEventListener('click', function () {
      if (!scene) {
        return;
      }
      const enabled = scene.toggleSound();
      updateSoundButton(scene.getAudioState());
      if (enabled) {
        showToast(
          scene.getAudioState().running
            ? '声音开了，风从松林里过来了。'
            : '声音已开启，浏览器放行后会响起来。'
        );
      } else {
        showToast('静音了，画面还在呼吸。');
      }
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    const map = { '1': 'sunny', '2': 'rain', '3': 'snow', '4': 'dusk' };
    const next = map[event.key];
    if (next) {
      switchWeather(next);
    }
  });

  function onReady(stats) {
    hideLoader();
    document.body.dataset.ready = 'true';
    if (!scene) {
      return;
    }
    const weather = scene.getWeather();
    setActiveWeather(weather);
    updateSnowTools(scene.getSnowmanCount());
    updateSoundButton(scene.getAudioState());
    if (!seeded) {
      seeded = true;
      if (requestedSnowmen > 0) {
        seedSnowmen(requestedSnowmen);
      }
    }
    if (debugEnabled) {
      startDebug();
    }
    if (requestedTalk > 0) {
      let spoken = 0;
      const speakNext = function () {
        if (!scene) {
          return;
        }
        scene.talk();
        spoken += 1;
        if (spoken < requestedTalk) {
          window.setTimeout(speakNext, 260);
        }
      };
      window.setTimeout(speakNext, talkDelay);
    }
    window.dispatchEvent(new CustomEvent('cabin-ready', { detail: stats }));
  }

  try {
    if (!window.CabinSceneEngine) {
      throw new Error('引擎脚本没有加载成功');
    }
    if (!window.THREE) {
      throw new Error('three.js 没有加载成功');
    }
    scene = window.CabinSceneEngine.createCabinScene(canvas, {
      THREE: window.THREE,
      weather: requestedWeather,
      quality: quality,
      reducedMotion: forceReducedMotion ? true : undefined,
      preserveDrawingBuffer: params.get('capture') === '1',
      // 演示页默认开声；浏览器会在首次点击画面后放行音频。
      sound: params.get('sound') !== '0',
      volume: 0.62,
      onReady: onReady,
      onError: handleError,
      onNotice: showToast,
      onSnowmanCountChange: updateSnowTools,
      onAudioStateChange: updateSoundButton
    });

    window.__cabin = scene;
    window.__cabinDemo = {
      setWeather: switchWeather,
      placeSnowman: function (x, z) {
        return scene.placeSnowman(x, z);
      },
      clearSnowmen: function () {
        scene.clearSnowmen();
        updateSnowTools(scene.getSnowmanCount());
      },
      seedSnowmen: seedSnowmen,
      getSnowmen: function () {
        return scene.getSnowmen();
      },
      getStats: function () {
        return scene.getStats();
      },
      getWeather: function () {
        return scene.getWeather();
      },
      talk: function () {
        return scene.talk();
      },
      getTalkCount: function () {
        return scene.getTalkCount();
      },
      setSound: function (enabled) {
        scene.setSoundEnabled(enabled);
        updateSoundButton(scene.getAudioState());
        return scene.getAudioState();
      },
      toggleSound: function () {
        scene.toggleSound();
        updateSoundButton(scene.getAudioState());
        return scene.getAudioState();
      },
      getAudioState: function () {
        return scene.getAudioState();
      },
      getSpeechText: function () {
        const el = document.querySelector('.cabin-speech');
        return el ? el.textContent : '';
      },
      advance: function (seconds) {
        return scene.advance(seconds);
      },
      getCanvasRect: function () {
        const rect = canvas.getBoundingClientRect();
        return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      },
      capture: function () {
        return scene.captureFrame('png');
      },
      toast: showToast
    };
  } catch (error) {
    handleError(error);
  }

  window.addEventListener('pagehide', function () {
    window.clearInterval(debugTimer);
    if (scene && typeof scene.dispose === 'function') {
      scene.dispose();
      scene = null;
    }
  });
})();
