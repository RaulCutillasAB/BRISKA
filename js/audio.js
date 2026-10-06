/* LAZO — sonido sintetizado: campanillas, efectos y música ambiental generativa */
(function (L) {
  'use strict';
  const A = { vol: { sfx: 0.7, music: 0.5 } };
  let ctx = null, master, sfx, mus, verb, lastT = {};
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const PENTA = [0, 2, 4, 7, 9];
  const scale = (i, base) => base + PENTA[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5);

  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.85;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 5;
    master.connect(comp); comp.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = A.vol.sfx; sfx.connect(master);
    mus = ctx.createGain(); mus.gain.value = A.vol.music * 0.55; mus.connect(master);
    const len = ctx.sampleRate * 3, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2); }
    verb = ctx.createConvolver(); verb.buffer = buf;
    const vg = ctx.createGain(); vg.gain.value = 0.35; verb.connect(vg); vg.connect(master);
    startMusic();
  };
  A.setVolumes = (s, m) => { A.vol.sfx = s; A.vol.music = m; if (sfx) { sfx.gain.value = s; mus.gain.value = m * 0.55; } };
  function out(dest, wet) { const g = ctx.createGain(); g.connect(dest || sfx); if (wet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(verb); } return g; }
  function rate(k, ms) { const n = performance.now(); if (lastT[k] && n - lastT[k] < ms) return false; lastT[k] = n; return true; }

  function bell(m, { vol = 0.2, when = 0, dur = 1.2, dest, wet = 0.45, bright = 3.5 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + when, f = mtof(m);
    const o = ctx.createOscillator(), mo = ctx.createOscillator(), mg = ctx.createGain();
    o.frequency.value = f; mo.frequency.value = f * bright; mg.gain.setValueAtTime(f * 1.2, t); mg.gain.exponentialRampToValueAtTime(1, t + dur * 0.6);
    mo.connect(mg); mg.connect(o.frequency);
    const g = out(dest, wet);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); o.start(t); mo.start(t); o.stop(t + dur + 0.05); mo.stop(t + dur + 0.05);
  }
  function tone(f, { type = 'sine', vol = 0.2, a = 0.005, d = 0.3, when = 0, slide, dest, wet = 0.2 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + a + d);
    const g = out(dest, wet);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    o.connect(g); o.start(t); o.stop(t + a + d + 0.05);
  }
  function noise({ vol = 0.2, d = 0.2, f = 1200, q = 1, type = 'bandpass', sweep, when = 0, wet = 0.15 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + when, len = Math.floor(ctx.sampleRate * d), b = ctx.createBuffer(1, len, ctx.sampleRate), dd = b.getChannelData(0);
    for (let i = 0; i < len; i++) dd[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(); s.buffer = b;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q; if (sweep) fl.frequency.exponentialRampToValueAtTime(sweep, t + d);
    const g = out(null, wet); g.gain.value = vol; s.connect(fl); fl.connect(g); s.start(t);
  }

  let root = 72;
  A.sfx = {
    loop(n, solar) {
      const base = root;
      if (n === 0) { bell(scale(0, base), { vol: 0.08, dur: 0.6 }); return; }
      const k = Math.min(n, 8);
      for (let i = 0; i < k + 1; i++) bell(scale(i * 2, base), { vol: 0.16, when: i * 0.045, dur: 1.4 });
      if (n >= 3) bell(scale(k * 2 + 2, base), { vol: 0.14, when: (k + 1) * 0.045, dur: 2.2, bright: 2 });
      if (n >= 5) { tone(mtof(base - 24), { vol: 0.25, d: 1.2, wet: 0.4 }); for (let i = 0; i < 3; i++) bell(scale(10 + i * 2, base), { vol: 0.1, when: 0.4 + i * 0.07, dur: 2 }); }
      if (solar) { tone(110, { type: 'sawtooth', vol: 0.08, d: 0.6, slide: 55, wet: 0.5 }); noise({ vol: 0.2, d: 0.6, f: 600, sweep: 3000 }); }
    },
    echo() { bell(scale(4, root + 12), { vol: 0.07, dur: 1.2, wet: 0.8 }); },
    kill() { if (!rate('kill', 30)) return; tone(520 + Math.random() * 200, { type: 'triangle', vol: 0.09, d: 0.12, slide: 180 }); noise({ vol: 0.06, d: 0.1, f: 2500 }); },
    bigkill() { tone(140, { vol: 0.3, d: 0.5, slide: 50, wet: 0.4 }); noise({ vol: 0.2, d: 0.5, f: 800, sweep: 120, type: 'lowpass' }); },
    hurt() { tone(300, { type: 'square', vol: 0.12, d: 0.25, slide: 90, wet: 0.1 }); noise({ vol: 0.2, d: 0.25, f: 500, type: 'lowpass' }); },
    dash() { noise({ vol: 0.12, d: 0.22, f: 900, sweep: 4000, q: 0.7 }); },
    polen() { if (!rate('polen', 45)) return; bell(scale(Math.floor(Math.random() * 5) + 10, root), { vol: 0.035, dur: 0.35, wet: 0.2, bright: 2 }); },
    shoot() { if (!rate('shoot', 70)) return; tone(700, { type: 'sine', vol: 0.05, d: 0.15, slide: 350 }); },
    cut() { noise({ vol: 0.14, d: 0.08, f: 5000, q: 2 }); tone(1800, { type: 'triangle', vol: 0.05, d: 0.06, when: 0.04 }); },
    boom() { tone(90, { vol: 0.3, d: 0.4, slide: 40, wet: 0.3 }); noise({ vol: 0.25, d: 0.4, f: 700, type: 'lowpass' }); },
    wave() { bell(scale(0, root - 12), { vol: 0.08, dur: 1.5 }); bell(scale(2, root - 12), { vol: 0.06, when: 0.12, dur: 1.5 }); },
    clear() { [0, 2, 4, 5, 7].forEach((s, i) => bell(scale(s + 3, root), { vol: 0.13, when: i * 0.09, dur: 1.8 })); tone(mtof(root - 24), { vol: 0.15, d: 1.5, wet: 0.5 }); },
    heal() { [0, 2, 4].forEach((s, i) => bell(scale(s + 5, root), { vol: 0.1, when: i * 0.08, dur: 1.2 })); },
    shield() { bell(scale(7, root), { vol: 0.12, dur: 1, bright: 1.5 }); noise({ vol: 0.1, d: 0.3, f: 3000 }); },
    tell() { tone(220, { type: 'sawtooth', vol: 0.05, d: 0.6, slide: 440, wet: 0.3 }); },
    summon() { [0, 1, 2].forEach((i) => tone(200 + i * 70, { type: 'triangle', vol: 0.05, d: 0.3, when: i * 0.08, wet: 0.4 })); },
    phase() { tone(80, { type: 'sawtooth', vol: 0.12, d: 1.5, slide: 160, wet: 0.6 }); noise({ vol: 0.15, d: 1.2, f: 300, sweep: 2000 }); },
    bossDown() { A.sfx.bigkill(); [0, 2, 4, 5, 7, 9, 12].forEach((s, i) => bell(scale(s, root), { vol: 0.14, when: 0.3 + i * 0.1, dur: 2.5 })); },
    revive() { [0, 4, 7, 12, 16].forEach((s, i) => bell(root + s, { vol: 0.14, when: i * 0.07, dur: 2 })); },
    dead() { [7, 4, 2, 0, -3].forEach((s, i) => bell(root + s - 12, { vol: 0.14, when: i * 0.22, dur: 2.2, bright: 1.4 })); },
    click() { tone(900, { type: 'triangle', vol: 0.06, d: 0.05, wet: 0 }); },
    hover() { if (!rate('hover', 60)) return; tone(1500, { vol: 0.02, d: 0.03, wet: 0 }); },
    pick() { [0, 4, 7].forEach((s, i) => bell(root + s + 12, { vol: 0.12, when: i * 0.06, dur: 1.4 })); },
    buy() { bell(root + 19, { vol: 0.12, dur: 0.8 }); bell(root + 24, { vol: 0.1, when: 0.07, dur: 1 }); },
    error() { tone(160, { type: 'square', vol: 0.05, d: 0.15, wet: 0 }); },
    ach() { [0, 4, 7, 11, 14].forEach((s, i) => bell(root + s, { vol: 0.1, when: i * 0.08, dur: 1.6 })); },
    victory() { [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => bell(root + s - 12, { vol: 0.16, when: i * 0.12, dur: 3 })); },
  };

  /* ---------- música ---------- */
  const MOODS = {
    menu: { root: 60, chords: [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 7]], bpm: 64, dens: 0.35 },
    bosque: { root: 62, chords: [[0, 4, 7, 11], [-3, 0, 4, 9], [-7, -3, 0, 4], [-5, 2, 4, 7]], bpm: 76, dens: 0.55 },
    pantano: { root: 57, chords: [[0, 3, 7, 10], [-4, 0, 3, 7], [-7, -2, 3, 5], [-5, -2, 2, 5]], bpm: 70, dens: 0.5 },
    eclipse: { root: 59, chords: [[0, 3, 7, 10], [-2, 2, 5, 9], [-4, 0, 3, 7], [-5, -1, 2, 5]], bpm: 82, dens: 0.6 },
    boss: { root: 55, chords: [[0, 3, 7, 10], [1, 5, 8, 12], [-2, 2, 5, 8], [0, 3, 7, 11]], bpm: 108, dens: 0.8, pulse: true },
    map: { root: 64, chords: [[0, 4, 7, 9], [-3, 0, 4, 7], [-5, -1, 2, 7], [-7, -3, 0, 4]], bpm: 60, dens: 0.3 },
  };
  let mood = 'menu', timer = null, next = 0, bar = 0;
  A.setMood = (m) => { if (MOODS[m]) mood = m; root = (MOODS[m] || MOODS.menu).root + 12; };
  function pad(notes, t, dur, M) {
    for (const n of notes) {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(M.root + n);
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = mtof(M.root + n + 12) * 1.003;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022, t + dur * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
      o.connect(f); o2.connect(f); f.connect(g); g.connect(mus);
      const w = ctx.createGain(); w.gain.value = 0.7; g.connect(w); w.connect(verb);
      o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
    }
  }
  function schedule() {
    const M = MOODS[mood];
    const beat = 60 / M.bpm, ch = M.chords[bar % M.chords.length], t0 = next;
    pad(ch, t0, beat * 4.2, M);
    bell(M.root - 12 + ch[0], { vol: 0.12, when: t0 - ctx.currentTime, dur: beat * 3, dest: mus, wet: 0.3, bright: 1 });
    for (let s = 0; s < 8; s++) {
      if (Math.random() > M.dens) continue;
      const deg = Math.floor(Math.random() * 7) + 5;
      bell(scale(deg, M.root) + (ch[0] % 12 === 0 ? 0 : 0), { vol: 0.045 + Math.random() * 0.03, when: t0 - ctx.currentTime + s * beat / 2, dur: 1.6, dest: mus, wet: 0.6 });
    }
    if (M.pulse) for (let s = 0; s < 4; s++) tone(mtof(M.root - 24 + ch[0]), { vol: 0.09, d: beat * 0.6, when: t0 - ctx.currentTime + s * beat, dest: mus, wet: 0.1 });
    next += beat * 4; bar++;
  }
  function startMusic() {
    next = ctx.currentTime + 0.3;
    timer = setInterval(() => { if (!ctx || ctx.state !== 'running' || A.vol.music < 0.01) { if (ctx) next = Math.max(next, ctx.currentTime + 0.1); return; } while (next < ctx.currentTime + 1.5) schedule(); }, 300);
  }
  L.A = A;
})(globalThis.L = globalThis.L || {});
