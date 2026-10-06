/* LAZO — dibujo en canvas: escenario, estela, lazos, sombras, jefes y efectos */
(function (L) {
  'use strict';
  const TAU = Math.PI * 2;
  const R = {};
  let cv, cx, dpr = 1, S = 1, bgCache = null, bgKey = '', deco = [], decoKey = '', stars = [];
  R.reduced = false;

  R.init = function (canvas) { cv = canvas; cx = cv.getContext('2d'); };
  R.resize = function (vw, vh, scale) {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    S = scale;
    cv.width = Math.floor(vw * dpr); cv.height = Math.floor(vh * dpr);
    cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
    bgKey = '';
  };
  const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  R.hexA = hexA;

  function buildBg(w, B) {
    const W = cv.width, H = cv.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.5, Math.max(W, H) * 0.75);
    gr.addColorStop(0, B.bg[2]); gr.addColorStop(0.45, B.bg[1]); gr.addColorStop(1, B.bg[0]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // textura suave de suelo
    const rng = new L.RNG(L.hash(B.id));
    for (let i = 0; i < 70; i++) {
      const x = rng.range(0, W), y = rng.range(0, H), r = rng.range(40, 180) * dpr;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, hexA(B.fog, rng.range(0.02, 0.06))); rg.addColorStop(1, hexA(B.fog, 0));
      g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // viñeta
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    return c;
  }
  function buildDeco(w, B) {
    const rng = new L.RNG(L.hash(B.id + (w.pos || 0) + w.floor));
    deco = [];
    const n = Math.floor((w.W * w.H) / 16000);
    for (let i = 0; i < n; i++) {
      deco.push({ x: rng.range(0, w.W), y: rng.range(0, w.H), k: rng.int(0, 3), s: rng.range(0.6, 1.4), ph: rng.range(0, TAU) });
    }
    stars = [];
    for (let i = 0; i < 90; i++) stars.push({ x: rng.range(0, w.W), y: rng.range(0, w.H), s: rng.range(0.5, 1.8), ph: rng.range(0, TAU), sp: rng.range(0.3, 1.2) });
  }
  function drawFog(w, B, t) {
    cx.save(); cx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const x = w.W * (0.5 + 0.45 * Math.sin(t * 0.05 * (i + 1) + i * 2.1)), y = w.H * (0.5 + 0.42 * Math.cos(t * 0.04 * (i + 2) + i));
      const r = Math.max(w.W, w.H) * (0.22 + 0.06 * Math.sin(t * 0.2 + i));
      const g = cx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, hexA(B.fog, 0.06)); g.addColorStop(1, hexA(B.fog, 0));
      cx.fillStyle = g; cx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    cx.restore();
  }
  function drawDeco(w, B, t) {
    drawFog(w, B, t);
    cx.save();
    for (const d of deco) {
      const a = 0.35 + 0.25 * Math.sin(t * 0.8 + d.ph);
      if (d.k === 0) { // brizna
        cx.strokeStyle = hexA(B.fog, 0.18); cx.lineWidth = 1.5;
        cx.beginPath(); cx.moveTo(d.x, d.y); cx.quadraticCurveTo(d.x + 4 * d.s, d.y - 10 * d.s, d.x + 2 * d.s + Math.sin(t + d.ph) * 2, d.y - 18 * d.s); cx.stroke();
        cx.beginPath(); cx.moveTo(d.x + 3, d.y); cx.quadraticCurveTo(d.x - 3 * d.s, d.y - 8 * d.s, d.x - 5 * d.s + Math.sin(t + d.ph) * 2, d.y - 13 * d.s); cx.stroke();
      } else if (d.k === 1) { // florecilla luminosa
        cx.fillStyle = hexA(B.motes, a * 0.5);
        for (let k = 0; k < 5; k++) { const an = (k / 5) * TAU + d.ph; cx.beginPath(); cx.arc(d.x + Math.cos(an) * 3.5 * d.s, d.y + Math.sin(an) * 3.5 * d.s, 2.2 * d.s, 0, TAU); cx.fill(); }
        cx.fillStyle = hexA('#ffffff', a * 0.6); cx.beginPath(); cx.arc(d.x, d.y, 1.6 * d.s, 0, TAU); cx.fill();
      } else if (d.k === 2) { // seta
        cx.fillStyle = hexA(B.fog, 0.16); cx.fillRect(d.x - 1.5 * d.s, d.y - 6 * d.s, 3 * d.s, 6 * d.s);
        cx.fillStyle = hexA(B.motes, a * 0.45); cx.beginPath(); cx.ellipse(d.x, d.y - 6 * d.s, 6 * d.s, 3.5 * d.s, 0, Math.PI, 0); cx.fill();
      } else { // piedrecita
        cx.fillStyle = 'rgba(0,0,0,0.18)'; cx.beginPath(); cx.ellipse(d.x, d.y, 7 * d.s, 4 * d.s, d.ph, 0, TAU); cx.fill();
      }
    }
    for (const s of stars) {
      const a = 0.25 + 0.35 * Math.sin(t * s.sp * 2 + s.ph);
      cx.fillStyle = hexA(B.motes, Math.max(0, a));
      const y = (s.y - t * 6 * s.sp) % w.H; const yy = y < 0 ? y + w.H : y;
      cx.beginPath(); cx.arc(s.x + Math.sin(t * s.sp + s.ph) * 6, yy, s.s, 0, TAU); cx.fill();
    }
    cx.restore();
  }

  /* ---------------- sombras ---------------- */
  function eyes(e, ang, sep, er, col, t) {
    const look = 0.35;
    for (const sgn of [-1, 1]) {
      const ex = e.x + Math.cos(ang + sgn * 0.55) * sep * look * 1.4 + Math.cos(ang) * sep * 0.45;
      const ey = e.y + Math.sin(ang + sgn * 0.55) * sep * look * 1.4 + Math.sin(ang) * sep * 0.45 - sep * 0.2;
      const blink = Math.sin(t * 0.9 + e.ph * 3) > 0.985 ? 0.15 : 1;
      cx.fillStyle = col;
      cx.shadowColor = col; cx.shadowBlur = 8;
      cx.beginPath(); cx.ellipse(ex, ey, er, er * 1.25 * blink, 0, 0, TAU); cx.fill();
      cx.shadowBlur = 0;
      cx.fillStyle = 'rgba(255,255,255,0.9)';
      cx.beginPath(); cx.arc(ex - er * 0.3, ey - er * 0.35, er * 0.35, 0, TAU); cx.fill();
    }
  }
  function blob(x, y, r, t, ph, wob, n = 9) {
    cx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const rr = r * (1 + Math.sin(a * 3 + t * 3 + ph) * wob);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) cx.moveTo(px, py); else cx.quadraticCurveTo(x + Math.cos(a - Math.PI / n) * rr * 1.08, y + Math.sin(a - Math.PI / n) * rr * 1.08, px, py);
    }
    cx.closePath();
  }
  function bodyFill(e, E, extraGlow) {
    const g = cx.createRadialGradient(e.x - e.r * 0.3, e.y - e.r * 0.4, e.r * 0.1, e.x, e.y, e.r * 1.2);
    g.addColorStop(0, lighten(E.color, 0.25)); g.addColorStop(1, E.color);
    cx.fillStyle = e.flash > 0 ? '#ffffff' : g;
    cx.shadowColor = hexA(E.eye, 0.75); cx.shadowBlur = 16 + (extraGlow || 0);
    cx.fill();
    cx.shadowBlur = 0;
    cx.strokeStyle = hexA(E.eye, 0.7); cx.lineWidth = 2; cx.stroke();
  }
  function lighten(hex, k) { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.min(255, Math.round(v + (255 - v) * k)); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }

  function drawEnemy(w, e, t) {
    const E = L.ENEMIES[e.t];
    const p = w.p;
    const ang = Math.atan2(p.y - e.y, p.x - e.x);
    if (e.spawn > 0) {
      const k = 1 - e.spawn / 1.0;
      cx.save();
      cx.strokeStyle = hexA(E.eye, 0.7); cx.lineWidth = 2;
      cx.setLineDash([6, 6]); cx.lineDashOffset = -t * 30;
      cx.beginPath(); cx.arc(e.x, e.y, e.r * (1.6 - k * 0.6), 0, TAU); cx.stroke();
      cx.setLineDash([]);
      cx.fillStyle = hexA(E.color, Math.max(0, k) * 0.7);
      cx.beginPath(); cx.arc(e.x, e.y, e.r * Math.max(0, k), 0, TAU); cx.fill();
      cx.restore();
      return;
    }
    cx.save();
    if (e.elite) {
      cx.strokeStyle = hexA('#ff5a7a', 0.5 + 0.3 * Math.sin(t * 6)); cx.lineWidth = 3;
      cx.beginPath(); cx.arc(e.x, e.y, e.r + 8 + Math.sin(t * 4) * 2, 0, TAU); cx.stroke();
    }
    if (e.fade != null && e.fade < 1) cx.globalAlpha = Math.max(0.1, e.fade);
    switch (e.t) {
      case 'polilla': case 'madre': {
        const big = e.t === 'madre';
        const flap = Math.sin(t * (big ? 9 : 22) + e.ph);
        const wr = e.r * (big ? 1.25 : 1.15);
        const dir = Math.atan2(e.vy || 0.01, e.vx || 0.01);
        cx.save();
        cx.translate(e.x, e.y); cx.rotate(dir + Math.PI / 2);
        for (const sg of [-1, 1]) {
          cx.save(); cx.scale(sg, 1); cx.rotate(-0.25 + flap * 0.35);
          cx.beginPath(); cx.ellipse(wr * 0.65, -wr * 0.15, wr * 0.75, wr * 0.48, -0.3, 0, TAU);
          cx.fillStyle = e.flash > 0 ? '#fff' : E.color;
          cx.shadowColor = hexA(E.eye, 0.5); cx.shadowBlur = 12; cx.fill(); cx.shadowBlur = 0;
          cx.strokeStyle = hexA(E.eye, 0.5); cx.lineWidth = 1.3; cx.stroke();
          cx.fillStyle = hexA(E.eye, 0.55); cx.beginPath(); cx.arc(wr * 0.7, -wr * 0.18, wr * 0.16, 0, TAU); cx.fill();
          if (big) { cx.beginPath(); cx.ellipse(wr * 0.45, wr * 0.35, wr * 0.45, wr * 0.3, 0.4, 0, TAU); cx.fillStyle = e.flash > 0 ? '#fff' : E.color; cx.fill(); cx.stroke(); cx.fillStyle = hexA('#ff7ab0', 0.5); cx.beginPath(); cx.arc(wr * 0.5, wr * 0.38, wr * 0.1, 0, TAU); cx.fill(); }
          cx.restore();
        }
        cx.beginPath(); cx.ellipse(0, 0, e.r * 0.42, e.r * 0.85, 0, 0, TAU);
        cx.fillStyle = e.flash > 0 ? '#fff' : lighten(E.color, 0.12); cx.fill();
        cx.strokeStyle = hexA(E.eye, 0.4); cx.stroke();
        // antenas
        cx.strokeStyle = hexA(E.eye, 0.6); cx.lineWidth = 1.2;
        for (const sg of [-1, 1]) { cx.beginPath(); cx.moveTo(sg * e.r * 0.12, -e.r * 0.75); cx.quadraticCurveTo(sg * e.r * 0.5, -e.r * 1.3, sg * e.r * 0.6, -e.r * 1.25); cx.stroke(); }
        cx.restore();
        eyes({ x: e.x, y: e.y - e.r * 0.1, ph: e.ph }, ang, e.r * 0.5, e.r * 0.13, E.eye, t);
        break;
      }
      case 'saltarin': {
        const prep = e.st === 0 && e.timer < 0.35 ? (0.35 - e.timer) / 0.35 : 0;
        const sx = e.st === 1 ? 0.85 : 1 + prep * 0.25, sy = e.st === 1 ? 1.2 : 1 - prep * 0.25;
        cx.translate(e.x, e.y + e.r * (1 - sy)); cx.scale(sx, sy); cx.translate(-e.x, -e.y);
        blob(e.x, e.y, e.r, t, e.ph, 0.04, 8); bodyFill(e, E);
        cx.fillStyle = e.flash > 0 ? '#fff' : E.color;
        for (const sg of [-1, 1]) { cx.beginPath(); cx.moveTo(e.x + sg * e.r * 0.3, e.y - e.r * 0.8); cx.lineTo(e.x + sg * e.r * 0.65, e.y - e.r * 1.45); cx.lineTo(e.x + sg * e.r * 0.75, e.y - e.r * 0.55); cx.fill(); }
        eyes(e, ang, e.r * 0.55, e.r * 0.14, E.eye, t);
        break;
      }
      case 'gemelo': {
        blob(e.x - e.r * 0.35, e.y, e.r * 0.75, t, e.ph, 0.06); bodyFill(e, E);
        blob(e.x + e.r * 0.35, e.y + 2, e.r * 0.75, t, e.ph + 2, 0.06); bodyFill(e, E);
        eyes({ x: e.x - e.r * 0.35, y: e.y, ph: e.ph }, ang, e.r * 0.4, e.r * 0.1, E.eye, t);
        eyes({ x: e.x + e.r * 0.35, y: e.y + 2, ph: e.ph + 1 }, ang, e.r * 0.4, e.r * 0.1, E.eye, t);
        break;
      }
      case 'enjambre': {
        cx.beginPath(); cx.arc(e.x, e.y, e.r, 0, TAU); bodyFill(e, E, -6);
        const fl = Math.sin(t * 40 + e.ph) * 0.5;
        cx.fillStyle = 'rgba(255,255,255,0.25)';
        cx.beginPath(); cx.ellipse(e.x - e.r * 0.8, e.y - e.r * 0.6, e.r * 0.7, e.r * 0.35, -0.6 + fl, 0, TAU); cx.fill();
        cx.beginPath(); cx.ellipse(e.x + e.r * 0.8, e.y - e.r * 0.6, e.r * 0.7, e.r * 0.35, 0.6 - fl, 0, TAU); cx.fill();
        cx.fillStyle = E.eye; cx.beginPath(); cx.arc(e.x + Math.cos(ang) * e.r * 0.35, e.y + Math.sin(ang) * e.r * 0.35, e.r * 0.3, 0, TAU); cx.fill();
        break;
      }
      case 'escupidor': {
        blob(e.x, e.y, e.r, t, e.ph, 0.05); bodyFill(e, E, e.tell ? 10 : 0);
        const mx = e.x + Math.cos(ang) * e.r * 0.95, my = e.y + Math.sin(ang) * e.r * 0.95;
        cx.fillStyle = e.flash > 0 ? '#fff' : lighten(E.color, 0.2);
        cx.beginPath(); cx.arc(mx, my, e.r * 0.42, 0, TAU); cx.fill(); cx.strokeStyle = hexA(E.eye, 0.7); cx.stroke();
        cx.fillStyle = e.tell ? hexA(E.eye, 0.6 + 0.4 * Math.sin(t * 30)) : '#05060a';
        cx.beginPath(); cx.arc(mx, my, e.r * 0.22, 0, TAU); cx.fill();
        eyes({ x: e.x - Math.cos(ang) * e.r * 0.15, y: e.y - Math.sin(ang) * e.r * 0.15 - 3, ph: e.ph }, ang, e.r * 0.5, e.r * 0.12, E.eye, t);
        break;
      }
      case 'tijereta': {
        const dir = Math.atan2(e.vy || 0.01, e.vx || 0.01);
        cx.translate(e.x, e.y); cx.rotate(dir);
        const snip = Math.abs(Math.sin(t * 10 + e.ph)) * 0.5;
        cx.fillStyle = e.flash > 0 ? '#fff' : E.color; cx.strokeStyle = hexA(E.eye, 0.6); cx.lineWidth = 1.5;
        cx.beginPath(); cx.ellipse(-e.r * 0.2, 0, e.r * 1.05, e.r * 0.6, 0, 0, TAU); cx.shadowColor = hexA(E.eye, 0.5); cx.shadowBlur = 10; cx.fill(); cx.shadowBlur = 0; cx.stroke();
        for (const sg of [-1, 1]) { cx.save(); cx.rotate(sg * (0.25 + snip)); cx.beginPath(); cx.moveTo(e.r * 0.6, 0); cx.quadraticCurveTo(e.r * 1.4, sg * e.r * 0.5, e.r * 1.9, sg * e.r * 0.05); cx.quadraticCurveTo(e.r * 1.3, sg * e.r * 0.15, e.r * 0.6, 0); cx.fillStyle = hexA(E.eye, 0.85); cx.fill(); cx.restore(); }
        cx.fillStyle = E.eye; cx.beginPath(); cx.arc(e.r * 0.25, -e.r * 0.25, e.r * 0.14, 0, TAU); cx.arc(e.r * 0.25, e.r * 0.25, e.r * 0.14, 0, TAU); cx.fill();
        break;
      }
      case 'bombilla': {
        const pulse = 0.5 + 0.5 * Math.sin(t * 8 + e.ph);
        blob(e.x, e.y, e.r, t, e.ph, 0.03); bodyFill(e, E, pulse * 10);
        cx.strokeStyle = '#8a7a5a'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(e.x, e.y - e.r); cx.quadraticCurveTo(e.x + 6, e.y - e.r - 8, e.x + 3, e.y - e.r - 13); cx.stroke();
        cx.fillStyle = hexA('#ffdd55', 0.6 + 0.4 * pulse); cx.shadowColor = '#ffcc33'; cx.shadowBlur = 14;
        cx.beginPath(); cx.arc(e.x + 3, e.y - e.r - 14, 3 + pulse * 2, 0, TAU); cx.fill(); cx.shadowBlur = 0;
        cx.fillStyle = hexA('#ffcc4a', 0.25 + pulse * 0.2); cx.beginPath(); cx.arc(e.x, e.y + 2, e.r * 0.5, 0, TAU); cx.fill();
        eyes(e, ang, e.r * 0.5, e.r * 0.13, E.eye, t);
        break;
      }
      case 'caparazon': {
        cx.beginPath();
        for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + t * 0.2; const px = e.x + Math.cos(a) * e.r, py = e.y + Math.sin(a) * e.r; i ? cx.lineTo(px, py) : cx.moveTo(px, py); }
        cx.closePath(); bodyFill(e, E);
        cx.strokeStyle = hexA(E.eye, 0.35); cx.lineWidth = 2;
        cx.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + t * 0.2; const px = e.x + Math.cos(a) * e.r * 0.55, py = e.y + Math.sin(a) * e.r * 0.55; i ? cx.lineTo(px, py) : cx.moveTo(px, py); } cx.closePath(); cx.stroke();
        eyes(e, ang, e.r * 0.4, e.r * 0.11, E.eye, t);
        break;
      }
      case 'centinela': {
        cx.save(); cx.translate(e.x, e.y); cx.rotate(t * 1.5); cx.translate(-e.x, -e.y);
        cx.beginPath(); cx.moveTo(e.x, e.y - e.r * 1.2); cx.lineTo(e.x + e.r * 0.9, e.y); cx.lineTo(e.x, e.y + e.r * 1.2); cx.lineTo(e.x - e.r * 0.9, e.y); cx.closePath();
        bodyFill(e, E, e.tell ? 12 : 0);
        cx.restore();
        cx.strokeStyle = hexA(E.eye, e.tell ? 0.9 : 0.4); cx.lineWidth = 2;
        cx.beginPath(); cx.arc(e.x, e.y, e.r * 1.6, t * 2, t * 2 + 4); cx.stroke();
        cx.fillStyle = E.eye; cx.shadowColor = E.eye; cx.shadowBlur = 10; cx.beginPath(); cx.arc(e.x + Math.cos(ang) * 4, e.y + Math.sin(ang) * 4, e.r * 0.25, 0, TAU); cx.fill(); cx.shadowBlur = 0;
        break;
      }
      case 'ojo': {
        // tentáculos
        cx.strokeStyle = hexA(E.eye, 0.35); cx.lineWidth = 4; cx.lineCap = 'round';
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + Math.sin(t + i) * 0.2;
          cx.beginPath(); cx.moveTo(e.x + Math.cos(a) * e.r * 0.8, e.y + Math.sin(a) * e.r * 0.8);
          cx.quadraticCurveTo(e.x + Math.cos(a + 0.4) * e.r * 1.5, e.y + Math.sin(a + 0.4) * e.r * 1.5, e.x + Math.cos(a + Math.sin(t * 2 + i) * 0.5) * e.r * 1.9, e.y + Math.sin(a + Math.sin(t * 2 + i) * 0.5) * e.r * 1.9);
          cx.stroke();
        }
        blob(e.x, e.y, e.r, t, e.ph, 0.035, 10); bodyFill(e, E, 10);
        cx.fillStyle = '#e8fff6'; cx.beginPath(); cx.ellipse(e.x, e.y, e.r * 0.72, e.r * 0.52, 0, 0, TAU); cx.fill();
        const ix = e.x + Math.cos(ang) * e.r * 0.28, iy = e.y + Math.sin(ang) * e.r * 0.18;
        const ig = cx.createRadialGradient(ix, iy, 2, ix, iy, e.r * 0.38); ig.addColorStop(0, '#ffffff'); ig.addColorStop(0.25, E.eye); ig.addColorStop(1, '#0a3a40');
        cx.fillStyle = ig; cx.beginPath(); cx.arc(ix, iy, e.r * 0.36, 0, TAU); cx.fill();
        cx.fillStyle = '#02060a'; cx.beginPath(); cx.ellipse(ix, iy, e.r * 0.08, e.r * 0.22, 0, 0, TAU); cx.fill();
        // párpado
        cx.fillStyle = e.flash > 0 ? '#fff' : E.color;
        const lid = e.st === 1 ? 1 - (e.fade || 0) : Math.sin(t * 0.7) > 0.97 ? 0.8 : 0.05;
        cx.beginPath(); cx.ellipse(e.x, e.y - e.r * 0.52 + lid * e.r * 0.52, e.r * 0.76, e.r * 0.52 * Math.max(0.05, lid), 0, Math.PI, TAU); cx.fill();
        break;
      }
      case 'reina': {
        const ph = e.phase || 1;
        // corona solar
        cx.save(); cx.translate(e.x, e.y); cx.rotate(t * (0.3 + ph * 0.2));
        const spikes = 12;
        cx.beginPath();
        for (let i = 0; i < spikes * 2; i++) { const a = (i / (spikes * 2)) * TAU; const rr = i % 2 ? e.r * 1.15 : e.r * (1.55 + 0.1 * Math.sin(t * 4 + i)); i ? cx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : cx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        cx.closePath();
        const cg = cx.createRadialGradient(0, 0, e.r * 0.8, 0, 0, e.r * 1.7); cg.addColorStop(0, hexA('#ff5aa0', 0.9)); cg.addColorStop(1, hexA('#ffb36a', 0.2));
        cx.fillStyle = cg; cx.shadowColor = '#ff5aa0'; cx.shadowBlur = 30; cx.fill(); cx.shadowBlur = 0;
        cx.restore();
        cx.beginPath(); cx.arc(e.x, e.y, e.r, 0, TAU); bodyFill(e, E, 10);
        // corona
        cx.fillStyle = '#ffd36e'; cx.beginPath();
        const cy = e.y - e.r * 0.62;
        cx.moveTo(e.x - e.r * 0.45, cy); cx.lineTo(e.x - e.r * 0.5, cy - e.r * 0.35); cx.lineTo(e.x - e.r * 0.22, cy - e.r * 0.15); cx.lineTo(e.x, cy - e.r * 0.45); cx.lineTo(e.x + e.r * 0.22, cy - e.r * 0.15); cx.lineTo(e.x + e.r * 0.5, cy - e.r * 0.35); cx.lineTo(e.x + e.r * 0.45, cy); cx.closePath(); cx.fill();
        eyes({ x: e.x, y: e.y + e.r * 0.1, ph: e.ph }, ang, e.r * 0.5, e.r * 0.11, ph === 3 ? '#ffffff' : E.eye, t);
        break;
      }
      default: { // sombra
        const bob = Math.sin(t * 3 + e.ph) * 2;
        cx.beginPath();
        const r = e.r, x = e.x, y = e.y + bob;
        cx.moveTo(x - r, y + r * 0.2);
        cx.arc(x, y, r, Math.PI, 0);
        for (let i = 0; i <= 4; i++) { const px = x + r - (i / 4) * r * 2; const py = y + r * 0.85 + (i % 2 ? -r * 0.2 : 0) + Math.sin(t * 6 + i + e.ph) * 2; cx.lineTo(px, py); }
        cx.closePath();
        bodyFill(e, E);
        eyes({ x, y: y - 1, ph: e.ph }, ang, r * 0.55, r * 0.14, E.eye, t);
      }
    }
    cx.restore();
    if (e.frozen > 0) { cx.fillStyle = 'rgba(170,240,255,0.35)'; cx.strokeStyle = 'rgba(220,250,255,0.8)'; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(e.x, e.y, e.r + 4, 0, TAU); cx.fill(); cx.stroke(); }
    if (!e.boss && e.maxHp > 1) {
      for (let i = 0; i < e.maxHp; i++) { cx.fillStyle = i < e.hp ? hexA(E.eye, 0.9) : 'rgba(255,255,255,0.15)'; cx.beginPath(); cx.arc(e.x + (i - (e.maxHp - 1) / 2) * 7, e.y + e.r + 9, 2.3, 0, TAU); cx.fill(); }
    }
  }

  /* ---------------- luciérnaga ---------------- */
  function drawPlayer(w, t, C) {
    const p = w.p;
    if (p.inv > 0 && !p.dashT && Math.floor(t * 18) % 2 === 0) return;
    const sp = Math.hypot(p.vx, p.vy);
    // halo
    const hr = 95 + Math.sin(t * 3) * 8;
    const g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, hr);
    g.addColorStop(0, hexA(C.glow, 0.55)); g.addColorStop(0.35, hexA(C.glow, 0.16)); g.addColorStop(1, hexA(C.glow, 0));
    cx.globalCompositeOperation = 'lighter';
    cx.fillStyle = g; cx.fillRect(p.x - hr, p.y - hr, hr * 2, hr * 2);
    cx.globalCompositeOperation = 'source-over';
    // alas
    const flap = Math.sin(t * 38) * 0.6;
    cx.save(); cx.translate(p.x, p.y); cx.rotate(p.face + Math.PI / 2); cx.scale(1.25, 1.25);
    cx.fillStyle = 'rgba(230,245,255,0.55)'; cx.strokeStyle = 'rgba(255,255,255,0.7)'; cx.lineWidth = 1;
    for (const sg of [-1, 1]) { cx.save(); cx.scale(sg, 1); cx.rotate(0.5 + flap); cx.beginPath(); cx.ellipse(9, -2, 10, 5, -0.4, 0, TAU); cx.fill(); cx.stroke(); cx.restore(); }
    // cuerpo
    cx.fillStyle = '#2a2230'; cx.beginPath(); cx.ellipse(0, -4, 5, 7, 0, 0, TAU); cx.fill();
    const lg = cx.createRadialGradient(0, 5, 1, 0, 5, 11);
    lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.35, C.color); lg.addColorStop(1, hexA(C.glow, 0.9));
    cx.fillStyle = lg; cx.shadowColor = C.glow; cx.shadowBlur = 20;
    cx.beginPath(); cx.ellipse(0, 5, 8, 9.5, 0, 0, TAU); cx.fill(); cx.shadowBlur = 0;
    cx.fillStyle = '#ffffff'; cx.beginPath(); cx.arc(-2, -7, 1.6, 0, TAU); cx.arc(2, -7, 1.6, 0, TAU); cx.fill();
    cx.restore();
    if (p.shield > 0) { cx.strokeStyle = hexA('#ffb0e0', 0.7 + 0.3 * Math.sin(t * 5)); cx.lineWidth = 2; cx.beginPath(); cx.arc(p.x, p.y, 22, 0, TAU); cx.stroke(); }
    // hermanas
    const n = w.donCount('hermana');
    for (let k = 0; k < n; k++) {
      const a = w.roomT * 3.2 + (k * TAU) / n;
      const sx = p.x + Math.cos(a) * 46, sy = p.y + Math.sin(a) * 46;
      const sg = cx.createRadialGradient(sx, sy, 0, sx, sy, 16); sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.3, '#ffd0f0'); sg.addColorStop(1, 'rgba(255,150,220,0)');
      cx.globalCompositeOperation = 'lighter'; cx.fillStyle = sg; cx.fillRect(sx - 16, sy - 16, 32, 32); cx.globalCompositeOperation = 'source-over';
    }
  }

  /* ---------------- estela ---------------- */
  function drawTrail(T, C, alphaMul) {
    if (T.length < 2) return;
    cx.save();
    cx.globalCompositeOperation = 'lighter';
    cx.lineCap = 'round'; cx.lineJoin = 'round';
    const n = T.length;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < n; i++) {
        const k = i / n;
        cx.strokeStyle = pass === 0 ? hexA(C.glow, 0.10 * k * alphaMul) : hexA(pass ? C.color : C.glow, (0.15 + 0.85 * k) * alphaMul);
        cx.lineWidth = pass === 0 ? 4 + 12 * k : 1 + 3 * k;
        cx.beginPath(); cx.moveTo(T[i - 1].x, T[i - 1].y); cx.lineTo(T[i].x, T[i].y); cx.stroke();
      }
    }
    cx.restore();
  }

  let viewSX = 0, viewSY = 0;
  function applyView() { cx.setTransform(dpr * S, 0, 0, dpr * S, viewSX, viewSY); }

  R.draw = function (w, t, opts = {}) {
    const B = L.BIOMES[Math.min(2, w.floor)];
    const C = L.CHARS.find((c) => c.id === w.charId) || L.CHARS[0];
    const key = B.id + cv.width + 'x' + cv.height;
    if (key !== bgKey) { bgCache = buildBg(w, B); bgKey = key; decoKey = ''; }
    const dk = B.id + (w.pos || 0) + w.floor + w.W;
    if (dk !== decoKey) { buildDeco(w, B); decoKey = dk; }
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.drawImage(bgCache, 0, 0);
    const sh = R.reduced ? 0 : w.shake;
    viewSX = (Math.random() - 0.5) * sh * dpr; viewSY = (Math.random() - 0.5) * sh * dpr;
    applyView();
    drawDeco(w, B, t);
    // zonas (flores)
    for (const z of w.zones) {
      const a = Math.min(1, z.t) * (0.6 + 0.2 * Math.sin(t * 6));
      const g = cx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r);
      g.addColorStop(0, hexA('#ffd0f0', 0.35 * a)); g.addColorStop(1, hexA('#ff7ad0', 0));
      cx.fillStyle = g; cx.beginPath(); cx.arc(z.x, z.y, z.r, 0, TAU); cx.fill();
      cx.save(); cx.translate(z.x, z.y); cx.rotate(t);
      cx.fillStyle = hexA('#ffe0f6', 0.8 * a);
      for (let k = 0; k < 6; k++) { cx.rotate(TAU / 6); cx.beginPath(); cx.ellipse(0, -9, 4, 8, 0, 0, TAU); cx.fill(); }
      cx.fillStyle = hexA('#ffd36e', a); cx.beginPath(); cx.arc(0, 0, 4, 0, TAU); cx.fill(); cx.restore();
    }
    // destellos de lazo
    cx.save(); cx.globalCompositeOperation = 'lighter';
    for (const f of w.flashes) {
      const k = f.t / f.life;
      const a = (1 - k) * (f.echo ? 0.45 : 0.75);
      const c = L.polyCenter(f.poly);
      const col = f.solar ? '#ffb030' : f.echo ? '#c9a0ff' : C.color;
      let maxd = 10; for (const q of f.poly) maxd = Math.max(maxd, L.dist(q.x, q.y, c.x, c.y));
      const g = cx.createRadialGradient(c.x, c.y, 0, c.x, c.y, maxd);
      g.addColorStop(0, hexA(col, a * 0.15)); g.addColorStop(0.7, hexA(col, a * 0.35)); g.addColorStop(1, hexA(col, a * 0.6));
      cx.fillStyle = g;
      cx.beginPath(); f.poly.forEach((q, i) => (i ? cx.lineTo(q.x, q.y) : cx.moveTo(q.x, q.y))); cx.closePath(); cx.fill();
      cx.strokeStyle = hexA('#ffffff', a); cx.lineWidth = 2 + 4 * (1 - k); cx.stroke();
    }
    cx.restore();
    // recogibles
    for (const k of w.pickups) {
      if (k.type === 'polen') {
        const s = 2.5 + k.v * 0.6;
        const g = cx.createRadialGradient(k.x, k.y, 0, k.x, k.y, s * 4);
        g.addColorStop(0, 'rgba(255,240,170,0.9)'); g.addColorStop(0.3, 'rgba(255,200,80,0.45)'); g.addColorStop(1, 'rgba(255,190,60,0)');
        cx.fillStyle = g; cx.fillRect(k.x - s * 4, k.y - s * 4, s * 8, s * 8);
        cx.fillStyle = '#fff6c8'; cx.beginPath(); cx.arc(k.x, k.y, s * 0.7, 0, TAU); cx.fill();
      } else {
        const s = 1 + Math.sin(t * 6) * 0.1;
        heart(k.x, k.y, 9 * s, '#ff6a8a');
      }
    }
    // avisos de embestida
    for (const b of w.beams) {
      const k = b.t / b.life;
      cx.save(); cx.translate(b.x, b.y); cx.rotate(b.a);
      cx.fillStyle = hexA(b.c, 0.08 + 0.18 * k);
      cx.fillRect(0, -b.w / 2, 2000, b.w);
      cx.strokeStyle = hexA(b.c, 0.3 + 0.5 * k); cx.setLineDash([12, 10]); cx.lineDashOffset = -t * 60; cx.lineWidth = 2;
      cx.strokeRect(0, -b.w / 2, 2000, b.w); cx.setLineDash([]);
      cx.restore();
    }
    // estela
    drawTrail(w.trail, C, 1);
    if (w.has('twin')) drawTrail(w.mirror(w.trail), { color: '#bfe8ff', glow: '#7ab8ff' }, 0.7);
    // sombras
    const es = w.enemies.slice().sort((a, b) => a.y - b.y);
    for (const e of es) drawEnemy(w, e, t);
    // balas
    for (const b of w.bullets) {
      const g = cx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 2.4);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, b.cut ? '#ff4a4a' : '#ff7ad0'); g.addColorStop(1, b.cut ? 'rgba(200,30,30,0)' : 'rgba(160,40,140,0)');
      cx.fillStyle = g; cx.beginPath(); cx.arc(b.x, b.y, b.r * 2.4, 0, TAU); cx.fill();
    }
    drawPlayer(w, t, C);
    // partículas
    cx.save(); cx.globalCompositeOperation = 'lighter';
    for (const q of w.parts) {
      const a = 1 - q.t / q.life;
      cx.fillStyle = hexA(q.c.length === 7 ? q.c : '#ffffff', a);
      cx.beginPath(); cx.arc(q.x, q.y, q.s * (0.5 + a * 0.5), 0, TAU); cx.fill();
    }
    cx.restore();
    for (const r of w.rings) {
      const k = r.t / r.life;
      const rr = r.inward ? r.r * (1 - L.ease(k)) : r.r * L.ease(k);
      cx.strokeStyle = hexA(r.c, (1 - k) * 0.9); cx.lineWidth = 2 + 6 * (1 - k);
      cx.beginPath(); cx.arc(r.x, r.y, Math.max(1, rr), 0, TAU); cx.stroke();
    }
    // textos
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    for (const tx of w.texts) {
      const k = tx.t / tx.life;
      const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.6 : 1.2 - Math.min(0.2, (k - 0.15));
      cx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      cx.font = `700 ${(tx.small ? 15 : 24) * pop}px Fredoka, system-ui, sans-serif`;
      cx.lineWidth = tx.small ? 3 : 5; cx.strokeStyle = 'rgba(10,6,20,0.85)';
      cx.strokeText(tx.s, tx.x, tx.y); cx.fillStyle = tx.c; cx.fillText(tx.s, tx.x, tx.y);
      cx.globalAlpha = 1;
    }
    // ralentización
    if (w.slowT > 0) { cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = hexA('#9a8aff', Math.min(0.12, w.slowT * 0.08)); cx.fillRect(0, 0, cv.width, cv.height); }
    // daño reciente
    if (w.p.inv > w.p.st.inv - 0.35 && w.p.inv > 0 && !w.p.dashT) { cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = 'rgba(255,40,80,0.12)'; cx.fillRect(0, 0, cv.width, cv.height); }
    cx.setTransform(1, 0, 0, 1, 0, 0);
  };
  function heart(x, y, s, c) {
    cx.save(); cx.translate(x, y); cx.scale(s / 10, s / 10);
    cx.fillStyle = c; cx.shadowColor = c; cx.shadowBlur = 12;
    cx.beginPath(); cx.moveTo(0, 4); cx.bezierCurveTo(-10, -4, -6, -12, 0, -6); cx.bezierCurveTo(6, -12, 10, -4, 0, 4); cx.fill();
    cx.restore();
  }
  // fondo de menús: dibuja solo escenario y motas
  R.drawIdle = function (w, t) {
    const B = L.BIOMES[Math.min(2, w.floor)];
    const key = B.id + cv.width + 'x' + cv.height;
    if (key !== bgKey) { bgCache = buildBg(w, B); bgKey = key; decoKey = ''; }
    const dk = B.id + (w.pos || 0) + w.floor + w.W;
    if (dk !== decoKey) { buildDeco(w, B); decoKey = dk; }
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.drawImage(bgCache, 0, 0);
    viewSX = viewSY = 0; applyView(); drawDeco(w, B, t);
    cx.setTransform(1, 0, 0, 1, 0, 0);
  };
  L.R = R;
})(globalThis.L = globalThis.L || {});
