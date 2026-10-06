/* BRISKA — partículas, textos emergentes y temblores */
(function (BR) {
  'use strict';
  const FX = {};
  let cv, cx, parts = [], rings = [], dpr = 1, raf = 0, running = false;
  FX.opts = { shake: true, particles: true };

  FX.init = function (canvas) {
    cv = canvas; cx = cv.getContext('2d');
    const rs = () => { dpr = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
    addEventListener('resize', rs); rs();
  };
  function loop() {
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, innerWidth, innerHeight);
    const now = performance.now();
    parts = parts.filter((p) => now - p.t0 < p.life);
    rings = rings.filter((r) => now - r.t0 < r.life);
    for (const r of rings) {
      const k = (now - r.t0) / r.life;
      cx.globalAlpha = (1 - k) * 0.9;
      cx.strokeStyle = r.color; cx.lineWidth = r.w * (1 - k) + 1;
      cx.beginPath(); cx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - k, 3)), 0, Math.PI * 2); cx.stroke();
    }
    for (const p of parts) {
      const k = (now - p.t0) / p.life;
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.g;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      cx.globalAlpha = Math.max(0, 1 - k * k);
      cx.fillStyle = p.color;
      if (p.shape === 'coin') {
        cx.save(); cx.translate(p.x, p.y); cx.scale(Math.cos(p.rot), 1);
        cx.beginPath(); cx.arc(0, 0, p.s, 0, Math.PI * 2); cx.fill();
        cx.strokeStyle = '#8a5a07'; cx.lineWidth = 1.5; cx.stroke(); cx.restore();
      } else if (p.shape === 'rect') {
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillRect(-p.s, -p.s * 0.5, p.s * 2, p.s); cx.restore();
      } else if (p.shape === 'star') {
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot);
        const s = p.s * (1 - k * 0.5);
        cx.beginPath(); cx.moveTo(0, -s); cx.lineTo(s * 0.25, -s * 0.25); cx.lineTo(s, 0); cx.lineTo(s * 0.25, s * 0.25); cx.lineTo(0, s); cx.lineTo(-s * 0.25, s * 0.25); cx.lineTo(-s, 0); cx.lineTo(-s * 0.25, -s * 0.25); cx.closePath(); cx.fill(); cx.restore();
      } else {
        cx.beginPath(); cx.arc(p.x, p.y, p.s * (1 - k * 0.6), 0, Math.PI * 2); cx.fill();
      }
    }
    cx.globalAlpha = 1;
    if (parts.length || rings.length) raf = requestAnimationFrame(loop); else { running = false; cx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function kick() { if (!running) { running = true; raf = requestAnimationFrame(loop); } }

  FX.burst = function (x, y, { n = 14, colors = ['#fff'], speed = 5, life = 700, size = 3, g = 0.12, shape = 'dot', drag = 0.96, spread = Math.PI * 2, dir = -Math.PI / 2 } = {}) {
    if (!FX.opts.particles || !cv) return;
    const now = performance.now();
    for (let i = 0; i < n; i++) {
      const a = dir + (Math.random() - 0.5) * spread;
      const v = speed * (0.4 + Math.random() * 0.8);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g, drag, t0: now, life: life * (0.6 + Math.random() * 0.6), s: size * (0.6 + Math.random() * 0.8), color: colors[i % colors.length], shape, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4 });
    }
    if (parts.length > 900) parts.splice(0, parts.length - 900);
    kick();
  };
  FX.ring = function (x, y, color = '#fff', r1 = 120, life = 600, w = 6) {
    if (!cv) return;
    rings.push({ x, y, color, r0: 8, r1, life, w, t0: performance.now() });
    kick();
  };
  FX.confetti = function () {
    const cols = ['#f2c96b', '#e8566a', '#5fa8e8', '#4fc28a', '#c77dff', '#fff6dc'];
    for (let k = 0; k < 4; k++) setTimeout(() => {
      FX.burst(innerWidth * (0.15 + Math.random() * 0.7), innerHeight * 0.25, { n: 60, colors: cols, speed: 9, life: 2400, size: 5, g: 0.18, shape: 'rect', drag: 0.985 });
    }, k * 260);
  };
  FX.coins = function (x, y, n = 8) { FX.burst(x, y, { n, colors: ['#f6cf55', '#ffe58a', '#e0a92a'], speed: 6, life: 900, size: 5, g: 0.3, shape: 'coin', drag: 0.97 }); };

  FX.center = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  const COLORS = { chips: '#3d8bf2', mult: '#ef4a5a', xmult: '#ef4a5a', money: '#f2c14e' };
  FX.pop = function (x, y, text, kind = 'msg', opt = {}) {
    const el = document.createElement('div');
    el.className = 'pop pop-' + kind + (opt.big ? ' big' : '') + (opt.cls ? ' ' + opt.cls : '');
    el.textContent = text;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    if (opt.color) el.style.setProperty('--pc', opt.color);
    document.getElementById('pops').appendChild(el);
    const dur = (opt.dur || 900) / (BR.speedMult || 1);
    el.style.animationDuration = dur + 'ms';
    setTimeout(() => el.remove(), dur + 50);
    if (kind !== 'msg' && FX.opts.particles) FX.burst(x, y, { n: kind === 'xmult' ? 22 : 8, colors: [COLORS[kind] || '#fff', '#fff'], speed: kind === 'xmult' ? 7 : 4, life: 600, size: kind === 'xmult' ? 4 : 3, shape: kind === 'xmult' ? 'star' : 'dot' });
    return el;
  };

  FX.shake = function (amt = 6, dur = 300) {
    if (!FX.opts.shake) return;
    const root = document.getElementById('shaker');
    if (!root) return;
    const t0 = performance.now();
    const step = (now) => {
      const k = (now - t0) / dur;
      if (k >= 1) { root.style.transform = ''; return; }
      const a = amt * (1 - k);
      root.style.transform = `translate(${(Math.random() - 0.5) * a * 2}px, ${(Math.random() - 0.5) * a * 2}px) rotate(${(Math.random() - 0.5) * a * 0.08}deg)`;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // Llama ascendente sobre un elemento (puntuación que supera el objetivo)
  FX.flame = function (el, on) { if (el) el.classList.toggle('onfire', !!on); };
  FX.emberLoop = null;
  FX.embers = function (el, on) {
    clearInterval(FX.emberLoop); FX.emberLoop = null;
    if (!on || !el) return;
    FX.emberLoop = setInterval(() => {
      if (!document.body.contains(el)) { clearInterval(FX.emberLoop); return; }
      const r = el.getBoundingClientRect();
      FX.burst(r.left + Math.random() * r.width, r.top + r.height * 0.3, { n: 2, colors: ['#ffb347', '#ff6a3d', '#ffe08a'], speed: 2.5, life: 800, size: 3, g: -0.05, dir: -Math.PI / 2, spread: 0.8 });
    }, 50);
  };
  BR.FX = FX;
})(globalThis.BR = globalThis.BR || {});
