/* BRISKA — utilidades base y generador aleatorio con semilla */
(function (BR) {
  'use strict';

  function hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }

  // mulberry32 con estado serializable
  class RNG {
    constructor(state) { this.s = state >>> 0; }
    next() {
      let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    chance(p) { return this.next() < p; }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    weighted(list, wf) {
      let total = 0;
      for (const it of list) total += wf(it);
      let r = this.next() * total;
      for (const it of list) { r -= wf(it); if (r <= 0) return it; }
      return list[list.length - 1];
    }
  }

  const SEED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function randomSeed() {
    let s = '';
    for (let i = 0; i < 7; i++) s += SEED_CHARS[Math.floor(Math.random() * SEED_CHARS.length)];
    return s;
  }

  function fmt(n) {
    if (!isFinite(n)) return '∞';
    n = Math.floor(n);
    if (Math.abs(n) >= 1e11) {
      const e = Math.floor(Math.log10(Math.abs(n)));
      return (n / Math.pow(10, e)).toFixed(3) + 'e' + e;
    }
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function fmtNum(n) {
    // números con decimales (Mult)
    if (Math.abs(n) >= 1e11) return fmt(n);
    if (Number.isInteger(n)) return fmt(n);
    if (Math.abs(n) >= 100) return fmt(Math.round(n));
    return (Math.round(n * 100) / 100).toString().replace('.', ',');
  }

  BR.RNG = RNG;
  BR.hashSeed = hashSeed;
  BR.randomSeed = randomSeed;
  BR.fmt = fmt;
  BR.fmtNum = fmtNum;
  BR.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  BR.uid = (() => { let i = 1; return () => 'u' + (i++) + '_' + Math.floor(Math.random() * 1e6).toString(36); })();
})(globalThis.BR = globalThis.BR || {});
