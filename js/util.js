/* LAZO — utilidades: azar con semilla, matemáticas y geometría */
(function (L) {
  'use strict';
  class RNG {
    constructor(seed) { this.s = (seed >>> 0) || 1; }
    next() { let t = (this.s = (this.s + 0x6d2b79f5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    range(a, b) { return a + this.next() * (b - a); }
    int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
    pick(a) { return a[Math.floor(this.next() * a.length)]; }
    chance(p) { return this.next() < p; }
    shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    weighted(list, w) { let t = 0; for (const x of list) t += w(x); let r = this.next() * t; for (const x of list) { r -= w(x); if (r <= 0) return x; } return list[list.length - 1]; }
  }
  L.RNG = RNG;
  L.hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  L.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  L.lerp = (a, b, t) => a + (b - a) * t;
  L.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  L.ease = (t) => 1 - Math.pow(1 - t, 3);

  // intersección de segmentos p1p2 y p3p4; devuelve {x,y,t,u} o null
  L.segX = function (x1, y1, x2, y2, x3, y3, x4, y4) {
    const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
    if (Math.abs(d) < 1e-9) return null;
    const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
    const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1), t, u };
  };
  L.inPoly = function (x, y, poly) {
    let ins = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) ins = !ins;
    }
    return ins;
  };
  L.polyArea = function (poly) { let s = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) s += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y); return Math.abs(s / 2); };
  L.polyCenter = function (poly) { let x = 0, y = 0; for (const p of poly) { x += p.x; y += p.y; } return { x: x / poly.length, y: y / poly.length }; };
  // distancia de un punto a un segmento
  L.segDist = function (px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy;
    let t = l ? ((px - x1) * dx + (py - y1) * dy) / l : 0;
    t = L.clamp(t, 0, 1);
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  };
  L.fmt = (n) => Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  L.seedStr = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)]; return s; };
})(globalThis.L = globalThis.L || {});
