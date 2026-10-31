// 共用的“按住”交互，带键盘无障碍与进度回填。
export function mountHold(root, { label, sub = 'PRESS & HOLD', glyph = true, onStart, onStop, onComplete } = {}) {
  const btn = document.createElement('button');
  btn.className = 'btn-hold';
  btn.type = 'button';
  btn.setAttribute('aria-label', label);
  btn.innerHTML = `
    <span class="hold-top">
      <span class="hold-fill"></span>
      ${glyph ? '<span class="hold-glyph"></span>' : ''}
      <span class="hold-label">${label}</span>
      <span class="hold-pct">0%</span>
    </span>
    <span class="hold-track"><i></i></span>
    <span class="hold-sub">${sub}</span>`;
  root.appendChild(btn);

  let holding = false;
  let spaceDown = false;

  const pct = btn.querySelector('.hold-pct');

  const start = () => {
    if (holding) return;
    holding = true;
    btn.classList.add('is-holding');
    onStart?.();
  };
  const stop = () => {
    if (!holding) return;
    holding = false;
    btn.classList.remove('is-holding');
    onStop?.();
  };

  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (btn.disabled) return;
    try {
      btn.setPointerCapture?.(e.pointerId);
    } catch (err) {}
    start();
  });
  btn.addEventListener('pointerup', stop);
  btn.addEventListener('pointercancel', stop);
  btn.addEventListener('pointerleave', () => {
    if (!spaceDown) stop();
  });
  btn.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.code !== 'Enter') return;
    e.preventDefault();
    spaceDown = true;
    start();
  });
  btn.addEventListener('keyup', (e) => {
    if (e.code !== 'Space' && e.code !== 'Enter') return;
    e.preventDefault();
    spaceDown = false;
    stop();
  });
  btn.addEventListener('blur', () => {
    spaceDown = false;
  });

  return {
    node: btn,
    get holding() {
      return holding;
    },
    setProgress(p) {
      btn.style.setProperty('--p', p);
      if (pct) pct.textContent = `${Math.round(p * 100)}%`;
    },
    reset() {
      holding = false;
      spaceDown = false;
      btn.classList.remove('is-holding');
      btn.disabled = false;
      btn.style.setProperty('--p', 0);
      if (pct) pct.textContent = '0%';
    },
    complete() {
      holding = false;
      btn.classList.remove('is-holding');
      onComplete?.();
    },
    disable() {
      holding = false;
      btn.disabled = true;
      btn.classList.remove('is-holding');
    },
    remove() {
      btn.remove();
    },
  };
}

// 生成“下一件藏品”的收尾排，返回一个可直接交给 ui.setAction 的 HTML + 绑定函数。
export function doneAction({ caption, next, onNext }) {
  const html = `
    <div class="next-row">
      <span class="name-caption">${caption}</span>
      ${
        next
          ? `<button class="next-link" type="button">
              <span>下一件 · ${next.title}</span>
              <span class="next-arrow" aria-hidden="true">→</span>
            </button>`
          : ''
      }
    </div>`;
  return {
    html,
    mount(root) {
      const btn = root.querySelector('.next-link');
      if (btn && onNext) btn.addEventListener('click', onNext);
    },
  };
}
