/* LAZO — simulación del mundo (sin DOM): estela, lazos, sombras, jefes, salas y mapa */
(function (L) {
  'use strict';
  const TAU = Math.PI * 2;

  class World {
    constructor(o) {
      this.seed = (o.seed || L.seedStr()).toUpperCase();
      this.rng = new L.RNG(L.hash(this.seed));
      this.charId = o.charId || 'lumi';
      this.moon = o.moon || 0;
      this.W = o.W || 1200; this.H = o.H || 760;
      this.floor = 0;
      this.polen = 0;
      this.dones = [];
      this.p = { x: this.W / 2, y: this.H / 2, vx: 0, vy: 0, r: 11, hearts: 4, st: { ...L.BASE }, inv: 0, dashT: 0, dashCd: 0, shield: 0, revive: 0, bonusHearts: 0, bonusDmg: 0, bonusSpeed: 0, bonusTrail: 0, face: 0 };
      this.stats = { loops: 0, kills: 0, bestCombo: 0, hurt: 0, polen: 0, rooms: 0, time: 0, score: 0 };
      this.events = []; // eventos para la interfaz (sonido, logros…)
      this.input = { tx: null, ty: null, kx: 0, ky: 0, dash: false, mode: 'pointer' };
      this.resetRoom();
      this.recalc();
      this.p.hearts = this.p.st.maxHearts;
      const C = L.CHARS.find((c) => c.id === this.charId);
      if (C && C.start) C.start(this);
      this.genMap();
      this.phase = 'map';
    }

    /* ---------------- estado persistente ---------------- */
    save() {
      return {
        seed: this.seed, rngS: this.rng.s, charId: this.charId, moon: this.moon, floor: this.floor, polen: this.polen,
        dones: this.dones, map: this.map, pos: this.pos, visited: this.visited, stats: this.stats,
        p: { hearts: this.p.hearts, shield: this.p.shield, revive: this.p.revive, bonusHearts: this.p.bonusHearts, bonusDmg: this.p.bonusDmg, bonusSpeed: this.p.bonusSpeed, bonusTrail: this.p.bonusTrail },
      };
    }
    static load(d, W, H) {
      const w = new World({ seed: d.seed, charId: d.charId, moon: d.moon, W, H });
      w.rng.s = d.rngS; w.floor = d.floor; w.polen = d.polen; w.dones = d.dones; w.map = d.map; w.pos = d.pos; w.visited = d.visited || []; w.stats = d.stats;
      Object.assign(w.p, d.p);
      w.recalc();
      w.phase = 'map';
      return w;
    }

    resize(W, H) {
      const sx = W / this.W, sy = H / this.H;
      this.W = W; this.H = H;
      const sc = (o) => { o.x *= sx; o.y *= sy; };
      sc(this.p); this.enemies.forEach(sc); this.bullets.forEach(sc); this.pickups.forEach(sc); this.zones.forEach(sc);
      this.trail = [];
    }

    /* ---------------- dones ---------------- */
    donCount(id) { return this.dones.filter((d) => d.id === id).length; }
    has(flag) { return this.dones.some((d) => L.DON[d.id].flag === flag); }
    addDon(id, innate) {
      const d = L.DON[id];
      this.dones.push({ id, innate: !!innate });
      this.recalc();
      if (d.onGain) d.onGain(this);
      this.events.push({ t: 'don', id });
      if (this.dones.length >= 12) this.ach('coleccion');
    }
    removeDon(id) { const i = this.dones.findIndex((d) => d.id === id); if (i >= 0) this.dones.splice(i, 1); this.recalc(); }
    recalc() {
      const s = { ...L.BASE };
      const C = L.CHARS.find((c) => c.id === this.charId);
      if (C && C.stats) C.stats(s);
      for (const d of this.dones) { const D = L.DON[d.id]; if (D.apply) D.apply(s); }
      s.maxHearts += this.p.bonusHearts;
      s.loopDmg += this.p.bonusDmg;
      s.speed *= 1 + this.p.bonusSpeed;
      s.trailLen *= 1 + this.p.bonusTrail;
      if (this.moon >= 3) s.maxHearts -= 1;
      s.maxHearts = Math.max(1, s.maxHearts);
      this.p.st = s;
      this.p.hearts = Math.min(this.p.hearts, s.maxHearts);
    }
    randomDon(rmin = 1, rmax = 3, exclude = []) {
      const owned = (id) => this.donCount(id) >= L.DON[id].max;
      let pool = L.DONES.filter((d) => d.r >= rmin && d.r <= rmax && !owned(d.id) && !exclude.includes(d.id));
      if (!pool.length) pool = L.DONES.filter((d) => !owned(d.id) && !exclude.includes(d.id));
      if (!pool.length) pool = L.DONES.slice();
      const wr = { 1: 60, 2: 30, 3: 10 };
      return this.rng.weighted(pool, (d) => wr[d.r]);
    }
    donChoices(kind) {
      const out = [];
      const ranges = { combat: [1, 3], elite: [2, 3], treasure: [2, 3], rare: [3, 3], boss: [2, 3] };
      const [a, b] = ranges[kind] || [1, 3];
      for (let i = 0; i < 3; i++) out.push(this.randomDon(a, b, out.map((d) => d.id)));
      return out;
    }
    heal(n) { this.p.hearts = Math.min(this.p.st.maxHearts, this.p.hearts + n); this.events.push({ t: 'heal' }); }
    hurtRaw(n) { this.p.hearts = Math.max(1, this.p.hearts - n); this.events.push({ t: 'hurt' }); }
    ach(id) { this.events.push({ t: 'ach', id }); }

    /* ---------------- mapa ---------------- */
    genMap() {
      const layers = [];
      const nodes = [];
      const R = this.rng;
      const NL = 6;
      for (let l = 0; l < NL; l++) {
        const n = l === 0 ? 2 : R.int(2, 4);
        const row = [];
        for (let i = 0; i < n; i++) {
          let type;
          if (l === 0) type = 'combat';
          else if (l === NL - 1) type = i % 2 ? 'shop' : 'fountain';
          else type = R.weighted(['combat', 'elite', 'event', 'treasure', 'shop', 'fountain'], (t) => ({ combat: 46, elite: l >= 2 ? 14 : 0, event: 16, treasure: l >= 2 ? 8 : 3, shop: l >= 2 ? 8 : 0, fountain: l >= 2 ? 7 : 0 }[t]));
          const node = { id: nodes.length, l, i, n, type, x: (i + 1) / (n + 1) + R.range(-0.04, 0.04), next: [] };
          nodes.push(node); row.push(node);
        }
        layers.push(row);
      }
      const boss = { id: nodes.length, l: NL, i: 0, n: 1, type: 'boss', x: 0.5, next: [] };
      nodes.push(boss);
      for (let l = 0; l < NL - 1; l++) {
        const a = layers[l], b = layers[l + 1];
        for (const n of a) {
          const near = b.slice().sort((p, q) => Math.abs(p.x - n.x) - Math.abs(q.x - n.x));
          n.next.push(near[0].id);
          if (near[1] && R.chance(0.45)) n.next.push(near[1].id);
        }
        for (const m of b) if (!a.some((n) => n.next.includes(m.id))) { const c = a.slice().sort((p, q) => Math.abs(p.x - m.x) - Math.abs(q.x - m.x))[0]; c.next.push(m.id); }
      }
      for (const n of layers[NL - 1]) n.next.push(boss.id);
      // garantizar variedad: al menos un mercado y un misterio en el piso
      const mids = nodes.filter((n) => n.l >= 2 && n.l <= 4);
      if (!nodes.some((n) => n.type === 'event') && mids.length) R.pick(mids).type = 'event';
      this.map = { nodes, layers: NL + 1 };
      this.pos = null;
      this.visited = [];
    }
    available() {
      if (this.pos == null) return this.map.nodes.filter((n) => n.l === 0).map((n) => n.id);
      return this.map.nodes[this.pos].next.slice();
    }
    choose(id) {
      if (!this.available().includes(id)) return null;
      this.pos = id;
      this.visited.push(id);
      return this.map.nodes[id];
    }
    nextFloor() {
      this.floor++;
      this.genMap();
      if (this.floor === 1) this.ach('pantano');
    }
    biome() { return L.BIOMES[Math.min(2, this.floor)]; }

    /* ---------------- salas ---------------- */
    resetRoom() {
      this.enemies = []; this.bullets = []; this.pickups = []; this.zones = [];
      this.parts = []; this.rings = []; this.flashes = []; this.texts = []; this.echoes = []; this.beams = [];
      this.trail = []; this.trailLenNow = 0;
      this.waves = []; this.wave = 0; this.waveT = 0;
      this.roomT = 0; this.slowT = 0; this.hitstop = 0; this.shake = 0;
      this.streak = 0; this.lastLoopT = -9; this.loopN = 0; this.lastKillT = 0;
      this.cleared = false; this.clearT = 0; this.roomHurt = 0;
      this.boss = null;
    }
    startRoom(type) {
      this.resetRoom();
      this.roomType = type;
      this.phase = 'room';
      const p = this.p;
      p.x = this.W / 2; p.y = this.H / 2; p.vx = p.vy = 0; p.inv = 1; p.dashT = 0; p.dashCd = 0;
      this.input.tx = null;
      for (const d of this.dones) { const D = L.DON[d.id]; if (D.onRoom) D.onRoom(this); }
      if (type === 'boss') this.planBoss();
      else this.planWaves(type);
    }
    planWaves(type) {
      const node = this.map.nodes[this.pos];
      const depth = node ? node.l : 0;
      const R = this.rng;
      const B = L.BIOMES[Math.min(2, this.floor)];
      let budget = 3.2 + this.floor * 3.4 + depth * 0.9;
      if (type === 'elite') budget *= 1.15;
      if (this.moon >= 1) budget *= 1.25;
      let nw = 2 + (this.floor >= 1 ? 1 : 0) + (depth >= 4 ? 1 : 0) + (this.moon >= 4 ? 1 : 0);
      if (this.floor === 0 && depth <= 1) nw = 2;
      let pool = B.pool.slice();
      if (this.floor === 0 && depth <= 1) pool = ['sombra', 'polilla'];
      else if (this.floor === 0 && depth <= 3) pool = pool.filter((t) => t !== 'enjambre');
      for (let w = 0; w < nw; w++) {
        let b = budget * (0.75 + w * 0.22);
        const list = [];
        if (type === 'elite' && (w === nw - 1 || w === 0)) { const t = R.pick(pool.filter((x) => x !== 'enjambre')); list.push({ t, elite: true }); b -= L.ENEMIES[t].cost * 3; }
        let guard = 0;
        while (b > 0.5 && guard++ < 40) {
          const t = R.pick(pool);
          if (t === 'enjambre') { const n = R.int(4, 6); for (let i = 0; i < n; i++) list.push({ t }); b -= L.ENEMIES[t].cost * n; }
          else { list.push({ t }); b -= L.ENEMIES[t].cost; }
        }
        this.waves.push(list);
      }
    }
    planBoss() {
      const B = this.biome();
      const id = B.boss;
      const E = L.ENEMIES[id];
      const e = this.spawnEnemy(id, this.W / 2, this.H * 0.25, { delay: 1.4 });
      e.hp = e.maxHp = Math.round(E.hp * (this.moon >= 5 ? 1.3 : 1));
      this.boss = e;
      this.waves = [];
    }
    spawnEnemy(t, x, y, o = {}) {
      const E = L.ENEMIES[t];
      const el = !!o.elite;
      const speedMul = (this.moon >= 2 ? 1.1 : 1) * (1 + this.floor * 0.06);
      const e = {
        id: Math.random().toString(36).slice(2, 9), t, x, y, vx: 0, vy: 0, kx: 0, ky: 0,
        r: E.r * (el ? 1.45 : 1), hp: E.hp * (el ? 3 : 1), maxHp: E.hp * (el ? 3 : 1), speed: E.speed * speedMul * (el ? 1.08 : 1),
        elite: el, boss: !!E.boss, spawn: o.delay != null ? o.delay : 0.9, age: 0, st: 0, timer: this.rng.range(0.5, 2), flash: 0, frozen: 0, burnT: 0,
        ph: this.rng.range(0, TAU), ihit: 0, dashHit: 0, phase: 1,
      };
      this.enemies.push(e);
      return e;
    }
    spawnPos(minD = 230) {
      const m = 50;
      for (let i = 0; i < 30; i++) {
        const x = this.rng.range(m, this.W - m), y = this.rng.range(m + 30, this.H - m);
        if (L.dist(x, y, this.p.x, this.p.y) > minD) return { x, y };
      }
      return { x: this.rng.range(m, this.W - m), y: m + 30 };
    }
    launchWave() {
      const list = this.waves[this.wave++];
      if (!list) return;
      const swarmAt = this.spawnPos();
      for (const s of list) {
        const pos = s.t === 'enjambre' ? { x: swarmAt.x + this.rng.range(-50, 50), y: swarmAt.y + this.rng.range(-50, 50) } : this.spawnPos();
        this.spawnEnemy(s.t, pos.x, pos.y, { elite: s.elite, delay: 0.9 + this.rng.range(0, 0.5) });
      }
      this.waveT = 0;
      this.lastWaveN = list.length;
      this.events.push({ t: 'wave', n: this.wave, of: this.waves.length });
    }

    /* ---------------- bucle principal ---------------- */
    update(dt) {
      if (this.phase !== 'room') return;
      if (this.hitstop > 0) { this.hitstop -= dt; dt *= 0.08; }
      this.roomT += dt; this.stats.time += dt;
      this.shake = Math.max(0, this.shake - dt * 30);
      this.updatePlayer(dt);
      this.updateTrail();
      // oleadas
      if (!this.cleared && this.roomType !== 'boss') {
        this.waveT += dt;
        const alive = this.enemies.length;
        if (this.wave < this.waves.length && (this.wave === 0 ? this.roomT > 0.6 : this.waveT > 2.5 && (alive <= Math.max(1, Math.floor(this.lastWaveN * 0.3)) || this.waveT > 16))) this.launchWave();
        if (this.wave >= this.waves.length && this.enemies.length === 0) this.clearRoom();
        // las últimas sombras se cansan si la sala se alarga
        this.lastKillT = this.lastKillT || 0;
        if (this.wave >= this.waves.length && this.enemies.length <= 2 && this.roomT - this.lastKillT > 10) for (const e of this.enemies) e.tired = true;
      }
      const sl = this.slowT > 0 ? 0.35 : 1;
      this.slowT = Math.max(0, this.slowT - dt);
      this.updateEnemies(dt * sl, dt);
      this.updateBullets(dt * sl);
      this.updateZones(dt);
      this.updatePickups(dt);
      this.updateEchoes(dt);
      this.updateFx(dt);
      if (this.cleared) {
        this.clearT += dt;
        if (this.clearT > 1.3 && !this.doneEmitted) { this.doneEmitted = true; this.events.push({ t: 'roomDone' }); }
      }
      if (this.polen >= 200) this.ach('rica');
    }

    updatePlayer(dt) {
      const p = this.p, s = p.st, I = this.input;
      p.inv = Math.max(0, p.inv - dt);
      p.dashCd = Math.max(0, p.dashCd - dt);
      let dx = 0, dy = 0, want = 0;
      if (I.kx || I.ky) { const m = Math.hypot(I.kx, I.ky); dx = I.kx / m; dy = I.ky / m; want = s.speed; }
      else if (I.tx != null) {
        const ddx = I.tx - p.x, ddy = I.ty - p.y, d = Math.hypot(ddx, ddy);
        if (d > 2) { dx = ddx / d; dy = ddy / d; want = Math.min(s.speed, d * 7); }
      }
      if (I.dash) {
        I.dash = false;
        if (p.dashCd <= 0 && !this.cleared) {
          let ax = dx, ay = dy;
          if (!ax && !ay) { const m = Math.hypot(p.vx, p.vy); if (m > 1) { ax = p.vx / m; ay = p.vy / m; } else { ax = Math.cos(p.face); ay = Math.sin(p.face); } }
          p.dashT = s.dashDur; p.dashCd = s.dashCd; p.dax = ax; p.day = ay;
          for (const e of this.enemies) e.dashHit = 0;
          this.events.push({ t: 'dash' });
          this.burst(p.x, p.y, 10, '#ffffff', 220, 0.3, 2);
        }
      }
      if (p.dashT > 0) {
        p.dashT -= dt;
        p.vx = p.dax * s.dashSpeed; p.vy = p.day * s.dashSpeed;
      } else {
        const k = Math.min(1, dt * 11);
        p.vx += (dx * want - p.vx) * k; p.vy += (dy * want - p.vy) * k;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const m = 16;
      p.x = L.clamp(p.x, m, this.W - m); p.y = L.clamp(p.y, m, this.H - m);
      if (Math.hypot(p.vx, p.vy) > 20) p.face = Math.atan2(p.vy, p.vx);
    }

    /* ---------------- estela y lazos ---------------- */
    updateTrail() {
      const p = this.p, T = this.trail;
      const last = T[T.length - 1];
      if (!last) { T.push({ x: p.x, y: p.y }); return; }
      const d = L.dist(last.x, last.y, p.x, p.y);
      if (d < 6) return;
      const np = { x: p.x, y: p.y };
      // intersección con la estela previa (de la más reciente a la más antigua)
      let hit = null, hi = -1;
      for (let i = T.length - 3; i >= 1; i--) {
        const a = T[i - 1], b = T[i];
        const x = L.segX(last.x, last.y, np.x, np.y, a.x, a.y, b.x, b.y);
        if (x) { hit = x; hi = i; break; }
      }
      T.push(np);
      this.trailLenNow += d;
      if (hit) {
        const poly = [{ x: hit.x, y: hit.y }];
        for (let k = hi; k < T.length - 1; k++) poly.push(T[k]);
        const area = L.polyArea(poly);
        if (area > 900) {
          this.closeLoop(poly, area);
          if (!this.has('perpetual')) { this.trail = [{ x: hit.x, y: hit.y }, np]; this.trailLenNow = L.dist(hit.x, hit.y, np.x, np.y); }
        }
      }
      // recortar longitud
      const T2 = this.trail;
      while (this.trailLenNow > p.st.trailLen && T2.length > 2) {
        this.trailLenNow -= L.dist(T2[0].x, T2[0].y, T2[1].x, T2[1].y);
        T2.shift();
      }
    }
    mirror(poly) { return poly.map((q) => ({ x: this.W - q.x, y: this.H - q.y })); }
    closeLoop(poly, area) {
      this.loopN++;
      this.stats.loops++;
      const now = this.roomT;
      if (this.has('streak')) { this.streak = now - this.lastLoopT < 1.5 ? Math.min(3, this.streak + 1) : 0; }
      this.lastLoopT = now;
      const solar = this.has('solar') && this.loopN % 4 === 0;
      const ctx = this.applyLoop(poly, area, { solar, primary: true });
      if (this.has('twin')) this.applyLoop(this.mirror(poly), area, { solar, twin: true });
      if (this.has('echo')) this.echoes.push({ poly, area, t: 0.6, solar });
      for (const d of this.dones) { const D = L.DON[d.id]; if (D.onLoop) D.onLoop(this, ctx); }
      return ctx;
    }
    applyLoop(poly, area, o) {
      const c = L.polyCenter(poly);
      const r = Math.sqrt(area / Math.PI);
      const hits = this.enemies.filter((e) => e.spawn <= 0 && L.inPoly(e.x, e.y, poly));
      let dmg = this.p.st.loopDmg;
      if (this.has('fine') && area < 15000) dmg += 2;
      if (o.primary || o.twin) dmg += this.streak || 0;
      if (o.solar) dmg *= 3;
      const n = hits.length;
      for (const e of hits) {
        let d = dmg;
        if (this.has('constellation')) d += n - 1;
        if (e.boss && e.ihit > 0) continue;
        this.damage(e, d, 'loop');
        if (e.boss) e.ihit = 0.35;
      }
      // polen dentro del lazo
      for (const k of this.pickups) if (L.inPoly(k.x, k.y, poly)) k.pull = true;
      this.flashes.push({ poly: poly.map((q) => ({ x: q.x, y: q.y })), t: 0, life: o.echo ? 0.45 : 0.7, hits: n, solar: o.solar, echo: o.echo });
      const col = o.solar ? '#ffb030' : o.echo ? '#d9b3ff' : (L.CHARS.find((x) => x.id === this.charId) || L.CHARS[0]).color;
      for (let k = 0; k < poly.length; k += 2) { const q = poly[k], dx = q.x - c.x, dy = q.y - c.y, d = Math.hypot(dx, dy) || 1; this.parts.push({ x: q.x, y: q.y, vx: (dx / d) * this.rng.range(20, 90), vy: (dy / d) * this.rng.range(20, 90), life: this.rng.range(0.4, 0.9), t: 0, c: k % 4 ? col : '#ffffff', s: this.rng.range(1.5, 3) }); }
      if (o.solar) { this.shockwave(c.x, c.y, 160 + r * 0.4, 2, '#ffb030'); this.shake = Math.max(this.shake, 10); }
      if (o.primary) {
        if (n > 0) {
          this.hitstop = Math.min(0.09, 0.03 + n * 0.012);
          this.shake = Math.max(this.shake, 3 + n * 1.5);
          if (n > this.stats.bestCombo) this.stats.bestCombo = n;
          const gain = n * 10 * n;
          this.stats.score += gain;
          if (n >= 2) this.text(c.x, c.y - 10, n >= 6 ? '¡LAZO ×' + n + '!' : n >= 4 ? '¡Lazo ×' + n + '!' : 'Lazo ×' + n, n >= 6 ? '#ffd36e' : n >= 4 ? '#ffb0e0' : '#bfefff', n >= 4 ? 1.6 : 1.2);
          this.ach('primer'); if (n >= 3) this.ach('triple'); if (n >= 6) this.ach('seis'); if (n >= 10) this.ach('diez');
        }
        this.events.push({ t: 'loop', n, solar: o.solar });
      }
      return { poly, cx: c.x, cy: c.y, r, area, hits };
    }
    updateEchoes(dt) {
      for (const e of this.echoes) {
        e.t -= dt;
        if (e.t <= 0 && !e.done) {
          e.done = true;
          this.applyLoop(e.poly, e.area, { echo: true, solar: e.solar });
          if (this.has('twin')) this.applyLoop(this.mirror(e.poly), e.area, { echo: true });
          this.events.push({ t: 'echo' });
        }
      }
      this.echoes = this.echoes.filter((e) => !e.done);
    }
    cutTrail(x, y) {
      if (this.has('uncut')) return false;
      const T = this.trail;
      for (let i = T.length - 2; i >= 1; i--) {
        if (L.segDist(x, y, T[i - 1].x, T[i - 1].y, T[i].x, T[i].y) < 10) {
          const removed = T.slice(0, i);
          this.trail = T.slice(i);
          let l = 0; for (let k = 1; k < this.trail.length; k++) l += L.dist(this.trail[k - 1].x, this.trail[k - 1].y, this.trail[k].x, this.trail[k].y);
          this.trailLenNow = l;
          for (let k = 0; k < removed.length; k += 2) this.parts.push({ x: removed[k].x, y: removed[k].y, vx: this.rng.range(-40, 40), vy: this.rng.range(-40, 40), life: 0.6, t: 0, c: '#ff8a8a', s: 2 });
          this.events.push({ t: 'cut' });
          return true;
        }
      }
      return false;
    }

    /* ---------------- daño ---------------- */
    damage(e, d, how) {
      if (e.spawn > 0 || e.dead) return;
      e.hp -= d;
      e.flash = 0.16;
      this.text(e.x + this.rng.range(-8, 8), e.y - e.r - 6, '' + d, how === 'loop' ? '#ffffff' : '#ffd0a0', 0.8, true);
      if (e.hp <= 0) this.kill(e, how);
      else if (!e.boss) { const dd = Math.max(1, L.dist(e.x, e.y, this.p.x, this.p.y)); e.kx += ((e.x - this.p.x) / dd) * 120; e.ky += ((e.y - this.p.y) / dd) * 120; }
    }
    kill(e, how) {
      if (e.dead) return;
      e.dead = true;
      this.stats.kills++;
      this.lastKillT = this.roomT;
      this.stats.score += e.boss ? 1000 : e.elite ? 60 : 15;
      const E = L.ENEMIES[e.t];
      this.burst(e.x, e.y, e.boss ? 80 : e.elite ? 30 : 16, E.eye, e.boss ? 420 : 260, 0.7, e.boss ? 4 : 2.5);
      this.burst(e.x, e.y, 8, '#ffffff', 160, 0.4, 2);
      this.events.push({ t: 'kill', boss: e.boss, elite: e.elite });
      let pv = E.polen * (e.elite ? 3 : 1);
      if (pv) this.dropPolen(e.x, e.y, pv);
      if (e.elite && this.rng.chance(0.5)) this.pickups.push({ x: e.x, y: e.y, vx: 0, vy: -60, type: 'heart', v: 1, t: 0 });
      else if (!e.boss && this.rng.chance(0.018)) this.pickups.push({ x: e.x, y: e.y, vx: 0, vy: -60, type: 'heart', v: 1, t: 0 });
      if (e.t === 'gemelo') for (let i = 0; i < 2; i++) { const n = this.spawnEnemy('sombra', e.x + (i ? 14 : -14), e.y, { delay: 0 }); n.r *= 0.8; n.kx = (i ? 1 : -1) * 220; }
      if (e.t === 'bombilla') this.explode(e.x, e.y, 135, 2, false);
      if (how === 'loop' && this.has('nova') && !e.boss) this.shockwave(e.x, e.y, 95, 1, '#ff9ae0');
      if (e.boss) this.bossDown(e);
    }
    explode(x, y, r, d, hurtsPlayer) {
      this.shockwave(x, y, r, d, '#ffcc4a');
      this.shake = Math.max(this.shake, 8);
      if (hurtsPlayer && L.dist(x, y, this.p.x, this.p.y) < r * 0.7) this.hurt();
      this.events.push({ t: 'boom' });
    }
    shockwave(x, y, r, d, color) {
      this.rings.push({ x, y, r, t: 0, life: 0.45, c: color });
      for (const e of this.enemies.slice()) if (!e.dead && e.spawn <= 0 && L.dist(e.x, e.y, x, y) < r + e.r * 0.5) { if (e.boss) continue; this.damage(e, d, 'wave'); }
    }
    ring(x, y, c, r, inward) { this.rings.push({ x, y, r, t: 0, life: 0.5, c, inward }); }
    hurt() {
      const p = this.p;
      if (p.inv > 0 || p.dashT > 0 || this.cleared) return;
      if (p.shield > 0) { p.shield = 0; p.inv = 0.8; this.ring(p.x, p.y, '#ffb0e0', 90); this.events.push({ t: 'shield' }); return; }
      p.hearts -= 1;
      this.stats.hurt++; this.roomHurt++;
      const veil = this.has('veil');
      p.inv = p.st.inv * (veil ? 2 : 1);
      if (veil) this.slowT = 3;
      this.shake = 14; this.hitstop = 0.12;
      this.burst(p.x, p.y, 26, '#ff6a8a', 300, 0.6, 3);
      this.events.push({ t: 'hurt' });
      // empuje a las sombras cercanas
      for (const e of this.enemies) { const d = L.dist(e.x, e.y, p.x, p.y); if (d < 160 && !e.boss) { e.kx += ((e.x - p.x) / (d || 1)) * 500; e.ky += ((e.y - p.y) / (d || 1)) * 500; } }
      this.bullets = this.bullets.filter((b) => L.dist(b.x, b.y, p.x, p.y) > 120);
      if (p.hearts <= 0) {
        if (p.revive > 0) {
          p.revive = 0; p.hearts = 2; p.inv = 2.5;
          this.dones = this.dones.filter((d) => d.id !== 'fenix');
          this.shockwave(p.x, p.y, 260, 3, '#ff9a3a');
          this.text(p.x, p.y - 40, '¡Renaces!', '#ffb36a', 1.6);
          this.events.push({ t: 'revive' });
        } else {
          this.phase = 'dead';
          this.events.push({ t: 'dead' });
        }
      }
    }
    clearRoom() {
      if (this.cleared) return;
      this.cleared = true; this.clearT = 0; this.doneEmitted = false;
      this.stats.rooms++;
      this.bullets = [];
      for (const k of this.pickups) k.pull = true;
      for (const d of this.dones) { const D = L.DON[d.id]; if (D.onClear) D.onClear(this); }
      if (this.roomType === 'elite' && this.roomHurt === 0) this.ach('intacta');
      this.events.push({ t: 'clear' });
    }
    bossDown(e) {
      this.enemies.forEach((x) => { if (x !== e && !x.dead) { x.dead = true; this.burst(x.x, x.y, 12, '#ffffff', 200, 0.5, 2); } });
      this.bullets = [];
      this.hitstop = 0.35; this.shake = 22;
      this.slowT = 0;
      if (this.floor === 0) this.ach('jefe1');
      if (this.floor === 1) this.ach('jefe2');
      this.clearRoom();
      this.events.push({ t: 'bossDown' });
    }
    dropPolen(x, y, v) {
      v = Math.round(v * this.p.st.polenMul);
      while (v > 0) {
        const piece = v >= 10 ? 5 : v >= 4 ? 2 : 1;
        v -= piece;
        const a = this.rng.range(0, TAU), s = this.rng.range(60, 200);
        this.pickups.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, type: 'polen', v: piece, t: 0 });
      }
    }

    /* ---------------- sombras ---------------- */
    updateEnemies(dt, rdt) {
      const p = this.p;
      const toP = (e) => { const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1; return { dx: dx / d, dy: dy / d, d }; };
      for (const e of this.enemies) {
        if (e.dead) continue;
        e.flash = Math.max(0, e.flash - rdt);
        e.ihit = Math.max(0, e.ihit - rdt);
        if (e.spawn > 0) { e.spawn -= rdt; continue; }
        e.age += dt;
        e.kx *= Math.pow(0.02, rdt); e.ky *= Math.pow(0.02, rdt);
        if (e.frozen > 0) { e.frozen -= rdt; e.x += e.kx * rdt; e.y += e.ky * rdt; this.clampE(e); continue; }
        let vx = 0, vy = 0;
        const t = toP(e);
        if (e.tired && !e.boss) { vx = t.dx * 40; vy = t.dy * 40; e.vx = vx; e.vy = vy; e.x += (vx + e.kx) * dt; e.y += (vy + e.ky) * dt; this.clampE(e); if (L.dist(e.x, e.y, p.x, p.y) < e.r * 0.8 + p.r * 0.5) this.hurt(); continue; }
        switch (e.t) {
          case 'sombra': case 'caparazon': case 'gemelo': vx = t.dx * e.speed; vy = t.dy * e.speed; break;
          case 'polilla': { const s = Math.sin(e.age * 4 + e.ph) * 0.7; vx = (t.dx - t.dy * s) * e.speed; vy = (t.dy + t.dx * s) * e.speed; break; }
          case 'enjambre': vx = (t.dx + Math.sin(e.age * 9 + e.ph) * 0.5) * e.speed; vy = (t.dy + Math.cos(e.age * 8 + e.ph) * 0.5) * e.speed; break;
          case 'bombilla': vx = t.dx * e.speed; vy = t.dy * e.speed; break;
          case 'saltarin': {
            e.timer -= dt;
            if (e.st === 0 && e.timer <= 0) { e.st = 1; e.timer = 0.38; e.jx = t.dx; e.jy = t.dy; }
            else if (e.st === 1) { vx = e.jx * 430; vy = e.jy * 430; if (e.timer <= 0) { e.st = 0; e.timer = this.rng.range(0.9, 1.5); } }
            else { vx = t.dx * 12; vy = t.dy * 12; }
            break;
          }
          case 'escupidor': {
            const want = t.d < 220 ? -1 : t.d > 320 ? 1 : 0;
            vx = t.dx * e.speed * want + Math.cos(e.age + e.ph) * 30; vy = t.dy * e.speed * want + Math.sin(e.age + e.ph) * 30;
            e.timer -= dt;
            if (e.timer <= 0.5 && !e.tell) e.tell = true;
            if (e.timer <= 0) { e.timer = 2.6; e.tell = false; this.shoot(e.x, e.y, Math.atan2(t.dy, t.dx), 200, e.elite ? 3 : 1, 0.22); }
            break;
          }
          case 'tijereta': {
            const T = this.trail;
            if (t.d < 150) { vx = -t.dx * e.speed; vy = -t.dy * e.speed; }
            else if (T.length > 6) {
              const q = T[Math.floor(T.length * 0.45)];
              const dx = q.x - e.x, dy = q.y - e.y, d = Math.hypot(dx, dy) || 1;
              vx = (dx / d) * e.speed; vy = (dy / d) * e.speed;
            } else { vx = Math.cos(e.age * 0.7 + e.ph) * e.speed * 0.5; vy = Math.sin(e.age * 0.9 + e.ph) * e.speed * 0.5; }
            e.timer -= dt;
            if (e.timer <= 0 && this.cutTrail(e.x, e.y)) { e.timer = 0.8; this.text(e.x, e.y - 20, '¡zas!', '#ff9a8a', 0.8); }
            break;
          }
          case 'centinela': {
            e.ang = (e.ang == null ? Math.atan2(e.y - p.y, e.x - p.x) : e.ang) + dt * 0.7;
            const tx = p.x + Math.cos(e.ang) * 230, ty = p.y + Math.sin(e.ang) * 230;
            const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
            vx = (dx / d) * Math.min(e.speed * 1.4, d * 3); vy = (dy / d) * Math.min(e.speed * 1.4, d * 3);
            e.timer -= dt;
            if (e.timer <= 0.6) e.tell = true;
            if (e.timer <= 0) { e.timer = 3.6; e.tell = false; this.ringShot(e.x, e.y, 8, 150, e.age); }
            break;
          }
          case 'madre': this.bossMadre(e, dt, t, (a, b) => { vx = a; vy = b; }); break;
          case 'ojo': this.bossOjo(e, dt, t, (a, b) => { vx = a; vy = b; }); break;
          case 'reina': this.bossReina(e, dt, t, (a, b) => { vx = a; vy = b; }); break;
        }
        e.vx = vx; e.vy = vy;
        e.x += (vx + e.kx) * dt; e.y += (vy + e.ky) * dt;
        this.clampE(e);
        // contacto con la luciérnaga
        const pd = L.dist(e.x, e.y, p.x, p.y);
        if (pd < e.r * 0.8 + p.r * 0.5) {
          if (p.dashT > 0 && !e.boss) {
            if (this.has('comet') && e.hp <= 1) { this.kill(e, 'dash'); continue; }
            if (this.has('thorns') && !e.dashHit) { e.dashHit = 1; this.damage(e, 2, 'dash'); }
          } else if (e.t === 'bombilla') { this.kill(e, 'touch'); this.explode(e.x, e.y, 100, 0, true); this.hurt(); }
          else this.hurt();
        }
        // estela ardiente
        if (this.has('burn') && !e.boss) {
          e.burnT -= rdt;
          if (e.burnT <= 0 && this.touchesTrail(e)) { e.burnT = 0.6; this.damage(e, 1, 'burn'); this.burst(e.x, e.y, 4, '#ff8a3a', 80, 0.4, 2); }
        }
        // hermanas
        if (this.has('sister')) {
          const n = this.donCount('hermana');
          for (let k = 0; k < n; k++) {
            const a = this.roomT * 3.2 + (k * TAU) / n;
            const sx = p.x + Math.cos(a) * 46, sy = p.y + Math.sin(a) * 46;
            if (L.dist(sx, sy, e.x, e.y) < e.r + 8 && !e.sisT) { e.sisT = 0.5; this.damage(e, 1, 'sister'); }
          }
          if (e.sisT) e.sisT = Math.max(0, e.sisT - rdt) || 0;
        }
      }
      // separación
      const es = this.enemies;
      for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
        const a = es[i], b = es[j];
        if (a.spawn > 0 || b.spawn > 0) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = (a.r + b.r) * 0.9;
        if (d < m && d > 0.01) {
          const push = (m - d) / 2, ux = dx / d, uy = dy / d;
          const wa = a.boss ? 0 : 1, wb = b.boss ? 0 : 1;
          a.x -= ux * push * wa; a.y -= uy * push * wa; b.x += ux * push * wb; b.y += uy * push * wb;
        }
      }
      this.enemies = this.enemies.filter((e) => !e.dead);
    }
    touchesTrail(e) {
      const T = this.trail;
      for (let i = 1; i < T.length; i += 1) if (L.segDist(e.x, e.y, T[i - 1].x, T[i - 1].y, T[i].x, T[i].y) < e.r + 3) return true;
      return false;
    }
    clampE(e) { const m = e.r * 0.6; e.x = L.clamp(e.x, m, this.W - m); e.y = L.clamp(e.y, m, this.H - m); }
    shoot(x, y, a, sp, n = 1, spread = 0.2, r = 7) {
      for (let i = 0; i < n; i++) {
        const aa = a + (i - (n - 1) / 2) * spread;
        this.bullets.push({ x, y, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, r, life: 6 });
      }
      this.events.push({ t: 'shoot' });
    }
    ringShot(x, y, n, sp, off = 0) { for (let i = 0; i < n; i++) { const a = off + (i * TAU) / n; this.bullets.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 7, life: 6 }); } this.events.push({ t: 'shoot' }); }

    /* ---------------- jefes ---------------- */
    bossMadre(e, dt, t, mv) {
      const half = e.hp < e.maxHp * 0.5;
      e.timer -= dt;
      if (e.st === 0) { // revoloteo
        const s = Math.sin(e.age * 2) * 0.8;
        mv((t.dx - t.dy * s) * e.speed * 0.7, (t.dy + t.dx * s) * e.speed * 0.7);
        if (e.timer <= 0) { e.st = 1; e.timer = 1.1; e.cx = t.dx; e.cy = t.dy; this.beams.push({ x: e.x, y: e.y, a: Math.atan2(t.dy, t.dx), t: 0, life: 1.1, w: e.r * 1.6, c: '#ffd36e' }); this.events.push({ t: 'tell' }); }
      } else if (e.st === 1) { // aviso
        mv(0, 0);
        if (e.timer <= 0) { e.st = 2; e.timer = 1.1; }
      } else if (e.st === 2) { // embestida
        mv(e.cx * (half ? 640 : 540), e.cy * (half ? 640 : 540));
        if (e.timer <= 0 || e.x <= e.r || e.x >= this.W - e.r || e.y <= e.r || e.y >= this.H - e.r) {
          e.st = 3; e.timer = 0.6;
          const n = half ? 4 : 3;
          for (let i = 0; i < n; i++) { const a = (i / n) * TAU; this.spawnEnemy('polilla', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70, { delay: 0.5 }); }
          this.events.push({ t: 'summon' });
        }
      } else { mv(0, 0); if (e.timer <= 0) { e.st = 0; e.timer = half ? 2.4 : 3.4; } }
    }
    bossOjo(e, dt, t, mv) {
      const half = e.hp < e.maxHp * 0.5;
      e.timer -= dt;
      e.shotT = (e.shotT == null ? 1.5 : e.shotT) - dt;
      mv(Math.cos(e.age * 0.8) * 30, Math.sin(e.age * 1.1) * 30);
      if (e.st === 0) {
        if (e.shotT <= 0) {
          e.shotT = half ? 1.6 : 2.2;
          this.ringShot(e.x, e.y, half ? 14 : 11, 150, e.age);
          if (half) this.shoot(e.x, e.y, Math.atan2(t.dy, t.dx), 230, 3, 0.18);
        }
        if (e.timer <= 0) { e.st = 1; e.timer = 0.7; e.fade = 1; this.events.push({ t: 'tell' }); }
      } else if (e.st === 1) {
        e.fade = e.timer / 0.7;
        if (e.timer <= 0) {
          const pos = this.spawnPos(260); e.x = pos.x; e.y = pos.y; e.st = 2; e.timer = 0.6;
          if (this.enemies.length < 7) { const k = half ? 3 : 2; for (let i = 0; i < k; i++) this.spawnEnemy(this.rng.pick(['sombra', 'escupidor', 'polilla']), e.x + this.rng.range(-90, 90), e.y + this.rng.range(-90, 90), { delay: 0.7 }); }
        }
      } else { e.fade = 1 - e.timer / 0.6; if (e.timer <= 0) { e.st = 0; e.fade = 1; e.timer = half ? 4.5 : 6; } }
    }
    bossReina(e, dt, t, mv) {
      const f = e.hp / e.maxHp;
      const ph = f > 0.66 ? 1 : f > 0.33 ? 2 : 3;
      if (ph !== e.phase) { e.phase = ph; e.st = 0; e.timer = 1.2; this.ring(e.x, e.y, '#ff5aa0', 300); this.shake = 12; this.text(e.x, e.y - 80, ph === 2 ? '¡La Reina se enfurece!' : '¡El eclipse total!', '#ff9ac8', 1.8); this.events.push({ t: 'phase' }); for (let i = 0; i < 6 + ph * 2; i++) this.bullets.push({ x: e.x, y: e.y, vx: Math.cos(i) * 200, vy: Math.sin(i) * 200, r: 8, life: 5 }); }
      e.timer -= dt;
      e.shotT = (e.shotT == null ? 2 : e.shotT) - dt;
      e.sumT = (e.sumT == null ? 4 : e.sumT) - dt;
      if (ph === 1) {
        mv(t.dx * e.speed * 0.6, t.dy * e.speed * 0.6);
        if (e.shotT <= 0) { e.shotT = 2.8; this.ringShot(e.x, e.y, 12, 150, e.age); }
        if (e.sumT <= 0 && this.enemies.length < 12) { e.sumT = 6; const c = this.spawnPos(); for (let i = 0; i < 5; i++) this.spawnEnemy('enjambre', c.x + this.rng.range(-40, 40), c.y + this.rng.range(-40, 40), { delay: 0.8 }); }
      } else if (ph === 2) {
        const cx = this.W / 2 + Math.cos(e.age * 0.5) * this.W * 0.25, cy = this.H / 2 + Math.sin(e.age * 0.7) * this.H * 0.2;
        mv((cx - e.x) * 1.2, (cy - e.y) * 1.2);
        if (e.shotT <= 0) { e.shotT = 0.16; const a = e.age * 2.3; this.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 7, life: 5, cut: true }); this.bullets.push({ x: e.x, y: e.y, vx: -Math.cos(a) * 170, vy: -Math.sin(a) * 170, r: 7, life: 5, cut: true }); if (Math.floor(e.age * 6) % 3 === 0) this.events.push({ t: 'shoot' }); }
        if (e.sumT <= 0 && this.enemies.length < 10) { e.sumT = 7; for (let i = 0; i < 2; i++) { const c = this.spawnPos(); this.spawnEnemy('tijereta', c.x, c.y, { delay: 0.8 }); } }
      } else {
        if (e.st === 0) { mv(t.dx * e.speed, t.dy * e.speed); if (e.timer <= 0) { e.st = 1; e.timer = 0.75; e.cx = t.dx; e.cy = t.dy; this.beams.push({ x: e.x, y: e.y, a: Math.atan2(t.dy, t.dx), t: 0, life: 0.75, w: e.r * 1.5, c: '#ff5aa0' }); this.events.push({ t: 'tell' }); } }
        else if (e.st === 1) { mv(0, 0); if (e.timer <= 0) { e.st = 2; e.timer = 0.9; } }
        else if (e.st === 2) { mv(e.cx * 680, e.cy * 680); if (e.timer <= 0 || e.x <= e.r || e.x >= this.W - e.r || e.y <= e.r || e.y >= this.H - e.r) { e.st = 0; e.timer = 1.8; this.ringShot(e.x, e.y, 16, 160, e.age); this.shake = 8; } }
        if (e.sumT <= 0 && this.enemies.length < 10) { e.sumT = 6; const c = this.spawnPos(); this.spawnEnemy(this.rng.pick(['bombilla', 'centinela', 'gemelo']), c.x, c.y, { delay: 0.8 }); }
      }
    }

    /* ---------------- balas, zonas, recogibles, efectos ---------------- */
    updateBullets(dt) {
      const p = this.p;
      for (const b of this.bullets) {
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.x < -20 || b.y < -20 || b.x > this.W + 20 || b.y > this.H + 20) b.life = 0;
        if (b.life <= 0) continue;
        if (L.dist(b.x, b.y, p.x, p.y) < b.r + p.r * 0.6) { b.life = 0; this.hurt(); continue; }
        if (b.cut && this.trail.length > 3 && this.cutTrail(b.x, b.y)) { b.life = 0; this.burst(b.x, b.y, 6, '#ff9a9a', 120, 0.3, 2); }
      }
      this.bullets = this.bullets.filter((b) => b.life > 0);
    }
    updateZones(dt) {
      for (const z of this.zones) {
        z.t -= dt; z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = 0.5;
          for (const e of this.enemies.slice()) if (!e.boss && e.spawn <= 0 && L.dist(e.x, e.y, z.x, z.y) < z.r + e.r * 0.5) this.damage(e, z.dmg, 'zone');
        }
      }
      this.zones = this.zones.filter((z) => z.t > 0);
    }
    updatePickups(dt) {
      const p = this.p;
      for (const k of this.pickups) {
        k.t += dt;
        const d = L.dist(k.x, k.y, p.x, p.y);
        if (k.pull || d < p.st.magnet || (this.cleared && this.clearT > 0.3)) {
          const sp = 380 + k.t * 300;
          k.vx += ((p.x - k.x) / (d || 1)) * sp * dt * 6; k.vy += ((p.y - k.y) / (d || 1)) * sp * dt * 6;
          const m = Math.hypot(k.vx, k.vy); if (m > sp) { k.vx *= sp / m; k.vy *= sp / m; }
        } else { k.vx *= Math.pow(0.04, dt); k.vy *= Math.pow(0.04, dt); }
        k.x += k.vx * dt; k.y += k.vy * dt;
        k.x = L.clamp(k.x, 8, this.W - 8); k.y = L.clamp(k.y, 8, this.H - 8);
        if (d < p.r + 9) {
          k.got = true;
          if (k.type === 'polen') { this.polen += k.v; this.stats.polen += k.v; this.events.push({ t: 'polen' }); }
          else if (k.type === 'heart') { if (p.hearts < p.st.maxHearts) { this.heal(1); this.text(p.x, p.y - 26, '+1 ♥', '#ff8aa8'); } else { this.polen += 5; } }
        }
      }
      this.pickups = this.pickups.filter((k) => !k.got && k.t < 30);
    }
    updateFx(dt) {
      for (const q of this.parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.pow(0.15, dt); q.vy *= Math.pow(0.15, dt); }
      this.parts = this.parts.filter((q) => q.t < q.life);
      if (this.parts.length > 700) this.parts.splice(0, this.parts.length - 700);
      for (const r of this.rings) r.t += dt;
      this.rings = this.rings.filter((r) => r.t < r.life);
      for (const f of this.flashes) f.t += dt;
      this.flashes = this.flashes.filter((f) => f.t < f.life);
      for (const t of this.texts) { t.t += dt; t.y -= dt * 34; }
      this.texts = this.texts.filter((t) => t.t < t.life);
      for (const b of this.beams) b.t += dt;
      this.beams = this.beams.filter((b) => b.t < b.life);
    }
    burst(x, y, n, c, sp, life, s) {
      for (let i = 0; i < n; i++) {
        const a = this.rng.range(0, TAU), v = this.rng.range(sp * 0.25, sp);
        this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * this.rng.range(0.6, 1.2), t: 0, c, s: s * this.rng.range(0.6, 1.3) });
      }
    }
    text(x, y, s, c, life = 1, small) { this.texts.push({ x, y, s, c, t: 0, life, small }); }
  }
  L.World = World;
})(globalThis.L = globalThis.L || {});
