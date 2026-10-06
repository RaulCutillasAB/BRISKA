/* BRISKA — audio sintetizado: guitarra (Karplus-Strong), campanas y música generativa andaluza */
(function (BR) {
  'use strict';
  const A = {};
  let ctx = null, master, sfxGain, musGain, verb, verbGain;
  const cache = new Map();
  A.vol = { sfx: 0.7, music: 0.45 };

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function makeVerb() {
    const len = ctx.sampleRate * 2.2;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const c = ctx.createConvolver(); c.buffer = buf; return c;
  }

  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.gain.value = A.vol.sfx; sfxGain.connect(master);
    musGain = ctx.createGain(); musGain.gain.value = A.vol.music * 0.5; musGain.connect(master);
    verb = makeVerb(); verbGain = ctx.createGain(); verbGain.gain.value = 0.28; verb.connect(verbGain); verbGain.connect(master);
    A.startMusic();
  };
  A.setVolumes = function (sfx, music) {
    A.vol.sfx = sfx; A.vol.music = music;
    if (sfxGain) sfxGain.gain.setTargetAtTime(sfx, ctx.currentTime, 0.05);
    if (musGain) musGain.gain.setTargetAtTime(music * 0.5, ctx.currentTime, 0.2);
  };

  function pluckBuffer(midi, bright) {
    const key = midi + ':' + (bright || 0);
    if (cache.has(key)) return cache.get(key);
    const sr = ctx.sampleRate, f = mtof(midi);
    const dur = 2.2, len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const N = Math.max(2, Math.round(sr / f));
    const decay = 0.996 + Math.min(0.0035, 0.0006 * (60 / Math.max(30, midi)));
    let last = 0;
    for (let i = 0; i < N; i++) { const r = Math.random() * 2 - 1; last = bright ? r : last * 0.5 + r * 0.5; d[i] = last; }
    for (let i = N; i < len; i++) d[i] = (d[i - N] + d[i - N + 1 < i ? i - N + 1 : i - N]) * 0.5 * decay;
    // body resonance: gentle fade in to avoid click
    for (let i = 0; i < 40; i++) d[i] *= i / 40;
    cache.set(key, buf);
    return buf;
  }

  function out(dest, wet) {
    const g = ctx.createGain();
    g.connect(dest || sfxGain);
    if (wet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(verb); }
    return g;
  }

  A.pluck = function (midi, vol = 0.5, when = 0, dest, wet = 0.35, bright) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const s = ctx.createBufferSource(); s.buffer = pluckBuffer(midi, bright);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400 + midi * 30;
    const g = out(dest, wet); g.gain.value = vol;
    s.connect(lp); lp.connect(g); s.start(t); s.stop(t + 2.2);
  };

  function tone(freq, { type = 'sine', vol = 0.3, attack = 0.005, decay = 0.4, when = 0, wet = 0.3, dest, slide } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + decay);
    const g = out(dest, wet);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    o.connect(g); o.start(t); o.stop(t + attack + decay + 0.05);
  }
  function noise({ vol = 0.2, dur = 0.12, when = 0, freq = 2000, q = 1, type = 'bandpass', sweep, wet = 0.1 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = out(null, wet); g.gain.value = vol;
    s.connect(f); f.connect(g); s.start(t);
  }

  // Escala frigia dominante en La (sabor andaluz)
  const SCALE = [0, 1, 4, 5, 7, 8, 10];
  const scaleNote = (i, base = 57) => base + SCALE[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7);

  A.sfx = {
    select() { tone(1400, { type: 'triangle', vol: 0.08, decay: 0.06, wet: 0 }); noise({ vol: 0.05, dur: 0.04, freq: 4000 }); },
    deselect() { tone(900, { type: 'triangle', vol: 0.06, decay: 0.06, wet: 0 }); },
    hover() { tone(2200, { type: 'sine', vol: 0.025, decay: 0.03, wet: 0 }); },
    deal(i = 0) { noise({ vol: 0.07, dur: 0.07, freq: 3200, sweep: 1200, when: i * 0.045, q: 0.8 }); },
    flip() { noise({ vol: 0.08, dur: 0.06, freq: 2600, sweep: 5200, q: 0.7 }); },
    button() { tone(600, { type: 'triangle', vol: 0.1, decay: 0.08, wet: 0.05 }); tone(900, { type: 'sine', vol: 0.06, decay: 0.1, when: 0.03 }); },
    chips(i) { A.pluck(scaleNote(i, 57), 0.55, 0, null, 0.3); },
    mult(i) { const m = scaleNote(i + 4, 69); tone(mtof(m), { type: 'sine', vol: 0.16, decay: 0.5, wet: 0.5 }); tone(mtof(m) * 2.01, { type: 'sine', vol: 0.05, decay: 0.3, wet: 0.5 }); A.pluck(m - 12, 0.25); },
    xmult(i) {
      tone(mtof(45), { type: 'sine', vol: 0.4, decay: 1.1, wet: 0.6, slide: mtof(44.5) });
      tone(mtof(57), { type: 'triangle', vol: 0.12, decay: 0.9, wet: 0.6 });
      const base = 64 + (i % 5);
      [0, 4, 7, 12].forEach((s, k) => A.pluck(base + s, 0.35, k * 0.025, null, 0.5, true));
    },
    money() { tone(1760, { type: 'sine', vol: 0.12, decay: 0.25, wet: 0.3 }); tone(2637, { type: 'sine', vol: 0.1, decay: 0.35, when: 0.06, wet: 0.4 }); },
    coinTick() { tone(2093, { type: 'sine', vol: 0.06, decay: 0.12, wet: 0.2 }); },
    total() { [57, 61, 64, 69].forEach((m, k) => A.pluck(m, 0.4, k * 0.03, null, 0.5)); tone(mtof(33), { type: 'sine', vol: 0.3, decay: 0.8, wet: 0.2 }); },
    whoosh() { noise({ vol: 0.12, dur: 0.35, freq: 500, sweep: 3000, q: 0.6, wet: 0.3 }); },
    glass() { for (let k = 0; k < 7; k++) tone(2500 + Math.random() * 3000, { type: 'triangle', vol: 0.05, decay: 0.15 + Math.random() * 0.2, when: k * 0.02, wet: 0.5 }); noise({ vol: 0.15, dur: 0.2, freq: 6000, q: 0.5, wet: 0.3 }); },
    levelup() { [0, 4, 7, 11, 14].forEach((s, k) => tone(mtof(64 + s), { type: 'triangle', vol: 0.1, decay: 0.4, when: k * 0.06, wet: 0.6 })); },
    cante() { [57, 61, 64, 69, 73, 76].forEach((m, k) => A.pluck(m, 0.4, k * 0.05, null, 0.6, true)); tone(mtof(81), { type: 'sine', vol: 0.08, decay: 1.2, when: 0.3, wet: 0.8 }); },
    error() { tone(180, { type: 'sawtooth', vol: 0.06, decay: 0.18, wet: 0 }); tone(140, { type: 'sawtooth', vol: 0.05, decay: 0.2, when: 0.08, wet: 0 }); },
    buy() { A.sfx.money(); A.pluck(69, 0.35, 0.05); A.pluck(76, 0.3, 0.1); },
    sell() { tone(1318, { type: 'sine', vol: 0.1, decay: 0.2 }); tone(988, { type: 'sine', vol: 0.08, decay: 0.25, when: 0.07 }); },
    pack() { noise({ vol: 0.18, dur: 0.4, freq: 1500, sweep: 6000, q: 0.5, wet: 0.3 }); [64, 68, 71, 76].forEach((m, k) => A.pluck(m, 0.3, 0.15 + k * 0.05, null, 0.6, true)); },
    win() {
      // rasgueado: Mi mayor → La mayor
      const E = [40, 47, 52, 56, 59, 64], Am = [45, 52, 57, 61, 64, 69];
      E.forEach((m, k) => A.pluck(m, 0.4, k * 0.018, null, 0.5));
      E.slice().reverse().forEach((m, k) => A.pluck(m, 0.3, 0.32 + k * 0.016, null, 0.5));
      Am.forEach((m, k) => A.pluck(m, 0.45, 0.62 + k * 0.022, null, 0.6, true));
      tone(mtof(81), { type: 'sine', vol: 0.06, decay: 1.6, when: 0.7, wet: 0.9 });
    },
    lose() { [64, 62, 60, 59, 57, 52].forEach((m, k) => A.pluck(m - 12, 0.4, k * 0.16, null, 0.6)); tone(mtof(33), { type: 'sine', vol: 0.2, decay: 2, when: 0.4, wet: 0.5 }); },
    victory() { A.sfx.win(); setTimeout(() => A.sfx.cante(), 900); setTimeout(() => A.sfx.win(), 1600); },
    boss() { tone(mtof(33), { type: 'sawtooth', vol: 0.08, decay: 1.6, wet: 0.6, slide: mtof(31) }); tone(mtof(45), { type: 'sine', vol: 0.25, decay: 1.6, wet: 0.6 }); noise({ vol: 0.08, dur: 1, freq: 200, sweep: 80, type: 'lowpass', wet: 0.6 }); },
    shuffle() { for (let k = 0; k < 8; k++) noise({ vol: 0.05, dur: 0.05, freq: 2500 + k * 200, when: k * 0.04, q: 0.8 }); },
    tick() { tone(3000, { type: 'sine', vol: 0.03, decay: 0.02, wet: 0 }); },
  };

  /* ---------------- Música generativa ---------------- */
  const PROG = [
    { bass: 45, tones: [57, 60, 64, 69, 72] },
    { bass: 43, tones: [55, 59, 62, 67, 71] },
    { bass: 41, tones: [53, 57, 60, 65, 69] },
    { bass: 40, tones: [52, 56, 59, 64, 68] },
  ];
  const PROG_SHOP = [
    { bass: 45, tones: [57, 61, 64, 69, 73] },
    { bass: 50, tones: [57, 62, 66, 69, 74] },
    { bass: 40, tones: [56, 59, 64, 68, 71] },
    { bass: 45, tones: [57, 61, 64, 69, 76] },
  ];
  let mood = 'menu', musTimer = null, nextBar = 0, bar = 0;
  A.setMood = (m) => { mood = m; };
  function pad(chord, t, dur) {
    for (const m of chord.tones.slice(0, 3)) {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = mood === 'boss' ? 500 : 900; f.Q.value = 0.5;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.018, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.02);
        o.connect(f); f.connect(g); g.connect(musGain);
        const w = ctx.createGain(); w.gain.value = 0.6; g.connect(w); w.connect(verb);
        o.start(t); o.stop(t + dur * 1.05);
      }
    }
  }
  function scheduleBar() {
    const bpm = mood === 'shop' ? 92 : mood === 'boss' ? 66 : 76;
    const beat = 60 / bpm;
    const prog = mood === 'shop' ? PROG_SHOP : PROG;
    const chord = prog[bar % 4];
    const t0 = nextBar;
    pad(chord, t0, beat * 4);
    // bajo
    A.pluck(chord.bass, 0.32, t0 - ctx.currentTime, musGain, 0.3);
    if (mood !== 'menu') A.pluck(chord.bass, 0.18, t0 - ctx.currentTime + beat * 2.5, musGain, 0.3);
    // arpegio con aire de guitarra
    const density = mood === 'menu' ? 0.45 : mood === 'boss' ? 0.5 : mood === 'shop' ? 0.85 : 0.65;
    for (let s = 0; s < 8; s++) {
      if (Math.random() > density && s % 2) continue;
      const tn = chord.tones[(s * 2 + (bar % 2)) % chord.tones.length] + (Math.random() < 0.12 ? 12 : 0);
      const sw = s % 2 ? beat * 0.06 : 0;
      A.pluck(tn, 0.14 + Math.random() * 0.06, t0 - ctx.currentTime + s * beat / 2 + sw, musGain, 0.45);
    }
    // adorno frigio ocasional
    if (bar % 4 === 3 && Math.random() < 0.7) {
      [69, 70, 69, 68].forEach((m, k) => A.pluck(m, 0.1, t0 - ctx.currentTime + beat * 3 + k * beat / 4, musGain, 0.5));
    }
    nextBar += beat * 4; bar++;
  }
  A.startMusic = function () {
    if (!ctx || musTimer) return;
    nextBar = ctx.currentTime + 0.2;
    musTimer = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      if (A.vol.music <= 0.001) { nextBar = Math.max(nextBar, ctx.currentTime + 0.1); return; }
      while (nextBar < ctx.currentTime + 1.2) scheduleBar();
    }, 250);
  };
  A.ready = () => !!ctx;
  BR.Audio = A;
})(globalThis.BR = globalThis.BR || {});
