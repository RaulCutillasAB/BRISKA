/* LAZO — controlador: bucle, entrada, flujo de la partida y progreso */
(function (L) {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const U = L.U, A = L.A, R = L.R;

  /* ---------------- progreso ---------------- */
  const KEY = 'lazo.meta.v1', RUN = 'lazo.run.v1';
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
  const def = () => ({ ach: {}, seen: {}, stats: { runs: 0, wins: 0, best: 0, combo: 0, kills: 0, loops: 0 }, settings: { sfx: 0.7, music: 0.5, shake: true, touch: 'rel' }, maxMoon: 0, lastMoon: 0, lastChar: 'lumi', tutorial: false });
  const Meta = {
    d: def(),
    load() { try { const x = JSON.parse(store.get(KEY) || 'null'); if (x) { const b = def(); this.d = { ...b, ...x, stats: { ...b.stats, ...x.stats }, settings: { ...b.settings, ...x.settings } }; } } catch (e) {} },
    save() { store.set(KEY, JSON.stringify(this.d)); },
    reset() { store.del(KEY); store.del(RUN); this.d = def(); },
    unlocked(id) { const c = L.CHARS.find((x) => x.id === id); return !c.unlock || !!this.d.ach[c.unlock.id]; },
    get lastChar() { return this.d.lastChar; },
  };

  /* ---------------- estado ---------------- */
  let w = null, mode = 'menu', paused = false, last = 0, t = 0, deco = null, roomNode = null;
  let vw = 0, vh = 0, S = 1;
  const isTouch = () => matchMedia('(pointer: coarse)').matches;

  function size() {
    vw = innerWidth; vh = innerHeight;
    S = L.clamp(Math.sqrt(vw * vh) / 720, 0.5, 2.4);
    R.resize(vw, vh, S);
    const W = vw / S, H = vh / S;
    if (w) { if (mode === 'room') w.resize(W, H); else { w.W = W; w.H = H; } }
    if (deco) { deco.W = W; deco.H = H; }
  }
  const worldDims = () => ({ W: vw / S, H: vh / S });

  function applySettings() {
    const s = Meta.d.settings;
    A.setVolumes(s.sfx, s.music);
    R.reduced = !s.shake;
  }

  /* ---------------- entrada ---------------- */
  const keys = {};
  let touchId = null, tStart = null;
  function toWorld(cx, cy) { return { x: cx / S, y: cy / S }; }
  function bindInput() {
    const cv = $('cv');
    cv.addEventListener('pointermove', (e) => {
      if (!w || mode !== 'room') return;
      if (e.pointerType === 'mouse') { const p = toWorld(e.clientX, e.clientY); w.input.tx = p.x; w.input.ty = p.y; }
      else if (e.pointerId === touchId && tStart) {
        if (Meta.d.settings.touch === 'abs') { const p = toWorld(e.clientX, e.clientY - 60); w.input.tx = p.x; w.input.ty = p.y; }
        else { const k = 1.35 / S; w.input.tx = tStart.px + (e.clientX - tStart.x) * k; w.input.ty = tStart.py + (e.clientY - tStart.y) * k; }
      }
    });
    cv.addEventListener('pointerdown', (e) => {
      A.init();
      if (!w || mode !== 'room' || paused) return;
      if (e.pointerType === 'mouse') { if (e.button === 0 || e.button === 2) w.input.dash = true; return; }
      if (touchId == null) {
        touchId = e.pointerId; tStart = { x: e.clientX, y: e.clientY, px: w.p.x, py: w.p.y };
        if (Meta.d.settings.touch === 'abs') { const p = toWorld(e.clientX, e.clientY - 60); w.input.tx = p.x; w.input.ty = p.y; } else { w.input.tx = w.p.x; w.input.ty = w.p.y; }
      }
    });
    const up = (e) => { if (e.pointerId === touchId) { touchId = null; tStart = null; if (w) { w.input.tx = w.p.x + w.p.vx * 0.08; w.input.ty = w.p.y + w.p.vy * 0.08; } } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('keydown', (e) => {
      A.init();
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (mode === 'room' && w) {
        if (k === ' ' || k === 'shift' || k === 'k') { e.preventDefault(); w.input.dash = true; }
        if (k === 'escape' || k === 'p') { paused ? resume() : pause(); }
      }
      updKeys();
    });
    addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; updKeys(); });
    addEventListener('blur', () => { for (const k in keys) keys[k] = false; updKeys(); if (mode === 'room' && !paused) pause(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'room' && !paused) pause(); });
    $('touch-dash').addEventListener('pointerdown', (e) => { e.stopPropagation(); A.init(); if (w && mode === 'room') w.input.dash = true; });
    $('btn-pause').innerHTML = L.icon('pause');
    $('touch-dash').innerHTML = L.icon('bolt');
    $('btn-pause').addEventListener('click', () => { if (mode === 'room') pause(); });
  }
  function updKeys() {
    if (!w) return;
    const x = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
    const y = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
    w.input.kx = x; w.input.ky = y;
    if (x || y) w.input.tx = null;
  }

  /* ---------------- HUD ---------------- */
  const hudC = {};
  function hud() {
    if (!w) return;
    const p = w.p;
    const hk = p.hearts + '/' + p.st.maxHearts + '/' + p.shield;
    if (hudC.h !== hk) {
      const prev = hudC.hp; hudC.h = hk; hudC.hp = p.hearts;
      let h = '';
      for (let i = 0; i < p.st.maxHearts; i++) h += U.heartSVG(i < p.hearts ? (prev != null && i === p.hearts - 1 && p.hearts > prev ? 'pop' : '') : 'empty');
      if (p.shield) h += U.heartSVG('shield');
      $('hearts').innerHTML = h;
    }
    if (hudC.pol !== w.polen) { $('polen-v').textContent = w.polen; if (hudC.pol != null && w.polen > hudC.pol) { const el = $('polen'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } hudC.pol = w.polen; }
    const dk = p.dashCd <= 0 ? 1 : 1 - p.dashCd / p.st.dashCd;
    $('dash-fill').style.width = (dk * 100).toFixed(0) + '%';
    $('dash').classList.toggle('ready', dk >= 1);
    $('touch-dash').classList.toggle('cd', dk < 1);
    let label = '';
    if (w.roomType === 'boss') label = '';
    else if (w.cleared) label = '¡Sala despejada!';
    else label = 'Oleada ' + Math.max(1, w.wave) + ' de ' + w.waves.length + (w.roomType === 'elite' ? ' · Sombras mayores' : '');
    if (hudC.lab !== label) { $('room-label').textContent = label; hudC.lab = label; }
    if (w.boss) {
      $('bossbar').classList.remove('hidden');
      $('boss-name').textContent = L.ENEMIES[w.boss.t].name;
      $('boss-fill').style.width = Math.max(0, (w.boss.hp / w.boss.maxHp) * 100) + '%';
    } else $('bossbar').classList.add('hidden');
  }
  function showHud(on) { $('cv').style.cursor = on ? 'crosshair' : 'default'; $('hud').classList.toggle('hidden', !on); $('touch-dash').classList.toggle('hidden', !on || !isTouch()); for (const k in hudC) delete hudC[k]; }

  /* ---------------- tutorial ---------------- */
  let tutStep = 0;
  function hint(html) { const h = $('hint'); h.innerHTML = html || ''; h.classList.toggle('show', !!html); }
  function tutorial(ev) {
    if (Meta.d.tutorial || mode !== 'room') return;
    if (tutStep === 0) { hint(isTouch() ? 'Arrastra el dedo para volar.<small>Cruza tu propia estela para cerrar un lazo alrededor de las sombras.</small>' : 'Mueve el ratón para volar.<small>Cruza tu propia estela para cerrar un lazo alrededor de las sombras.</small>'); tutStep = 1; }
    if (ev && ev.t === 'loop' && ev.n > 0 && tutStep === 1) { hint('¡Eso es! Cuantas más sombras atrapes de golpe, mejor.<small>' + (isTouch() ? 'Toca el botón del rayo' : 'Haz clic o pulsa Espacio') + ' para dar un impulso y esquivar.</small>'); tutStep = 2; setTimeout(() => { if (tutStep === 2) hint(''); }, 6000); }
    if (ev && ev.t === 'clear' && tutStep >= 1) { tutStep = 3; hint(''); Meta.d.tutorial = true; Meta.save(); }
  }

  /* ---------------- bucle ---------------- */
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(1 / 30, (now - last) / 1000 || 0); last = now; t += dt;
    if (mode === 'room' && w) {
      if (!paused) {
        w.update(dt);
        handleEvents();
      }
      R.draw(w, t);
      hud();
    } else if (mode === 'over' && w) {
      R.draw(w, t);
    } else {
      R.drawIdle(w || deco, t);
    }
  }
  function handleEvents() {
    const evs = w.events; w.events = [];
    for (const ev of evs) {
      switch (ev.t) {
        case 'loop': A.sfx.loop(ev.n, ev.solar); break;
        case 'echo': A.sfx.echo(); break;
        case 'kill': ev.boss ? A.sfx.bossDown() : ev.elite ? A.sfx.bigkill() : A.sfx.kill(); break;
        case 'hurt': A.sfx.hurt(); break;
        case 'dash': A.sfx.dash(); break;
        case 'polen': A.sfx.polen(); break;
        case 'shoot': A.sfx.shoot(); break;
        case 'cut': A.sfx.cut(); break;
        case 'boom': A.sfx.boom(); break;
        case 'wave': if (ev.n > 1) A.sfx.wave(); break;
        case 'clear': A.sfx.clear(); if (w.roomType !== 'boss') U.banner('¡Despejado!', null, '#9cffc8'); break;
        case 'heal': A.sfx.heal(); break;
        case 'shield': A.sfx.shield(); break;
        case 'tell': A.sfx.tell(); break;
        case 'summon': A.sfx.summon(); break;
        case 'phase': A.sfx.phase(); break;
        case 'revive': A.sfx.revive(); U.banner('¡Renaces!', 'La Pluma de Fénix arde por ti', '#ffb36a'); break;
        case 'bossDown': U.banner('¡' + L.ENEMIES[w.boss.t].name + ' ha caído!', null, '#ff8ac8'); break;
        case 'ach': ach(ev.id); break;
        case 'roomDone': afterRoom(); break;
        case 'dead': die(); break;
      }
      tutorial(ev);
    }
    // descubrimientos
    for (const e of w.enemies) if (!Meta.d.seen['e:' + e.t]) { Meta.d.seen['e:' + e.t] = 1; }
  }
  function ach(id) {
    if (Meta.d.ach[id]) return;
    Meta.d.ach[id] = Date.now();
    const a = L.ACH.find((x) => x.id === id);
    if (a) { U.toast('★ Logro: ' + a.name); A.sfx.ach(); }
    for (const c of L.CHARS) if (c.unlock && c.unlock.id === id) setTimeout(() => U.toast('✦ Nueva luciérnaga: ' + c.name), 900);
    if (L.CHARS.every((c) => Meta.unlocked(c.id)) && !Meta.d.ach.todos) ach('todos');
    Meta.save();
  }
  function seeDons() { for (const d of w.dones) Meta.d.seen['d:' + d.id] = 1; }

  /* ---------------- flujo ---------------- */
  function saveRun() { if (w) { seeDons(); store.set(RUN, JSON.stringify(w.save())); Meta.save(); } }
  function menu() {
    mode = 'menu'; paused = false; showHud(false); hint('');
    if (!deco) { deco = new L.World({ seed: 'MENU', ...worldDims() }); }
    w = null;
    A.setMood('menu');
    U.menu(!!store.get(RUN), (a) => {
      if (a === 'continue') continueRun();
      else if (a === 'new') U.charSelect(Meta, startRun, menu);
      else if (a === 'how') U.howto(menu);
      else if (a === 'codex') U.codex(Meta, menu);
      else if (a === 'opts') U.options(Meta, applySettings, menu);
    });
  }
  function startRun(charId, moon) {
    Meta.d.lastChar = charId; Meta.d.lastMoon = moon; Meta.d.stats.runs++; Meta.save();
    w = new L.World({ charId, moon, ...worldDims() });
    w.events = [];
    store.set(RUN, JSON.stringify(w.save()));
    showMap();
  }
  function continueRun() {
    try { const d = JSON.parse(store.get(RUN)); const { W, H } = worldDims(); w = L.World.load(d, W, H); } catch (e) { store.del(RUN); menu(); return; }
    showMap();
  }
  function showMap() {
    mode = 'map'; showHud(false); hint('');
    A.setMood('map');
    saveRun();
    U.map(w, enterNode, () => { saveRun(); menu(); });
  }
  function enterNode(id) {
    const node = w.choose(id);
    if (!node) return;
    roomNode = node;
    saveRun();
    const T = node.type;
    if (T === 'combat' || T === 'elite' || T === 'boss') startRoom(T);
    else if (T === 'treasure') reward('treasure', 'Un cofre de luz', 'Elige un don');
    else if (T === 'shop') shop();
    else if (T === 'fountain') U.fountain(w, (o) => { if (o === 'heal') w.heal(99); else { w.p.bonusHearts++; w.recalc(); } w.events = []; showMap(); });
    else if (T === 'event') event();
  }
  function startRoom(type) {
    U.hide();
    const { W, H } = worldDims(); w.W = W; w.H = H;
    w.startRoom(type);
    mode = 'room'; paused = false; showHud(true);
    A.setMood(type === 'boss' ? 'boss' : w.biome().id);
    if (type === 'boss') { const E = L.ENEMIES[w.boss.t]; U.banner(E.name, E.desc, '#ff6a9a'); A.sfx.phase(); }
    else if (type === 'elite') U.banner('Sombras mayores', 'Más fuertes, mejores premios', '#ff8a8a');
    tutStep = 0; tutorial();
    const it = w.input; it.tx = null; it.kx = it.ky = 0;
  }
  function afterRoom() {
    mode = 'reward'; showHud(false); hint('');
    const type = roomNode.type;
    Meta.d.stats.kills += 0;
    if (type === 'boss') {
      if (w.floor >= 2) { win(); return; }
      reward('boss', '¡Guardián vencido!', 'Elige un don poderoso', () => {
        w.nextFloor(); w.heal(2);
        showMap();
      });
      return;
    }
    reward(type === 'elite' ? 'elite' : 'combat', type === 'elite' ? '¡Sombras mayores vencidas!' : '¡Sala despejada!', 'Elige un don');
  }
  function reward(kind, title, sub, after) {
    mode = 'reward'; showHud(false);
    const ch = w.donChoices(kind);
    U.reward(w, title, sub, ch, (id) => {
      if (id) { w.addDon(id); A.sfx.pick(); } else w.polen += 10;
      w.events = [];
      if (after) after(); else showMap();
    });
  }
  function shop() {
    const f = 1 + w.floor * 0.2;
    const items = [];
    const ex = [];
    for (let i = 0; i < 3; i++) { const d = w.randomDon(1, 3, ex); ex.push(d.id); items.push({ kind: 'don', id: d.id, price: Math.round([0, 32, 55, 85][d.r] * f) }); }
    items.push({ kind: 'heal', price: Math.round(14 * f) });
    items.push({ kind: 'max', price: Math.round(48 * f) });
    const stock = { items, reroll: 10 };
    U.shop(w, stock, (a) => {
      if (a === 'reroll') { const ex2 = []; stock.items = stock.items.map((it) => { if (it.kind !== 'don') return it; const d = w.randomDon(1, 3, ex2); ex2.push(d.id); return { kind: 'don', id: d.id, price: Math.round([0, 32, 55, 85][d.r] * f) }; }); }
      if (a === 'leave') { w.events = []; showMap(); }
    });
  }
  function event() {
    const pool = L.EVENTS.filter((e) => !(w.seenEvents || []).includes(e.id));
    const E = w.rng.pick(pool.length ? pool : L.EVENTS);
    (w.seenEvents = w.seenEvents || []).push(E.id);
    U.event(w, E, (i) => {
      const o = E.opts[i];
      const txt = o.run(w);
      w.events = [];
      U.eventResult(w, E, txt, () => {
        if (w.pendingChoice) { const pc = w.pendingChoice; w.pendingChoice = null; const ch = []; for (let k = 0; k < 3; k++) ch.push(w.randomDon(pc.rarityMin, 3, ch.map((x) => x.id))); U.reward(w, 'Un regalo de la noche', 'Elige un don', ch, (id) => { if (id) w.addDon(id); else w.polen += 10; w.events = []; showMap(); }); }
        else showMap();
      });
    });
  }
  function pause() {
    if (mode !== 'room' || paused) return;
    paused = true; hint('');
    U.pause(w, (a) => {
      if (a === 'resume') resume();
      else if (a === 'opts') U.options(Meta, applySettings, () => { paused = false; pause(); });
      else if (a === 'how') U.howto(() => { paused = false; pause(); });
      else if (a === 'quit') { endRun(false); }
    });
  }
  function resume() { paused = false; U.hide(); last = performance.now(); }
  function recordEnd(won) {
    const s = Meta.d.stats, st = w.stats;
    s.kills += st.kills; s.loops += st.loops; s.best = Math.max(s.best, st.score); s.combo = Math.max(s.combo, st.bestCombo);
    if (won) { s.wins++; if (w.moon >= Meta.d.maxMoon && w.moon < L.MOONS.length - 1) Meta.d.maxMoon = w.moon + 1; }
    seeDons(); store.del(RUN); Meta.save();
  }
  function die() {
    mode = 'over'; showHud(false); hint('');
    A.sfx.dead();
    setTimeout(() => endRun(false), 1400);
  }
  function endRun(won) {
    const before = L.CHARS.filter((c) => Meta.unlocked(c.id)).length;
    recordEnd(won);
    const news = [];
    if (won && w.moon + 1 === Meta.d.maxMoon && w.moon + 1 < L.MOONS.length) news.push('✦ Nueva dificultad: ' + L.MOONS[w.moon + 1].name);
    const after = L.CHARS.filter((c) => Meta.unlocked(c.id)).length;
    if (after > before) news.push('✦ ¡Has desbloqueado una nueva luciérnaga!');
    mode = 'end'; showHud(false); paused = false;
    U.end(w, won, news, (a) => { if (a === 'again') { const c = w.charId, m = w.moon; startRun(c, m); } else menu(); });
  }
  function win() {
    ach('victoria');
    if (w.stats.time < 20 * 60) ach('velocista');
    if (w.moon >= 3) ach('luna3');
    A.sfx.victory();
    U.banner('¡Amanece!', 'La noche ha terminado', '#ffe7a0');
    setTimeout(() => endRun(true), 1800);
  }

  function boot() {
    Meta.load();
    R.init($('cv'));
    size();
    applySettings();
    bindInput();
    addEventListener('resize', size);
    menu();
    requestAnimationFrame(frame);
    window.LAZO = { get w() { return w; }, Meta, get mode() { return mode; }, startRun, enterNode };
  }
  boot();
})(globalThis.L = globalThis.L || {});
