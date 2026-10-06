/* BRISKA — controlador principal: une el núcleo, la vista y las pantallas */
(function (BR) {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const V = BR.View, S = BR.Screens, FX = BR.FX, AU = BR.Audio, Meta = BR.Meta;
  const UI = { spawnFrom: {}, g: null, sel: [], packSel: [], selTal: null, selCons: null, selShop: null, busy: false, drag: null, flip: new Set(), scoring: null, touch: false, cw: 96, ch: 134 };
  BR.UI = UI;
  BR.speedMult = 1;
  Object.defineProperty(BR, 'uiBusy', { get: () => UI.busy });

  const wait = (ms) => new Promise((r) => setTimeout(r, ms / BR.speedMult));
  const S$ = () => Meta.data.settings;

  function applySettings() {
    const s = S$();
    BR.speedMult = [1, 1, 1.6, 2.4, 3.4][s.speed] || 1.6;
    document.documentElement.style.setProperty('--speed', BR.speedMult);
    AU.setVolumes(s.sfx, s.music);
    BR.BG.setQuality(s.bg);
    FX.opts.shake = s.shake; FX.opts.particles = s.particles;
  }

  /* ======================= tamaños y disposición ======================= */
  const MOBILE_Q = matchMedia('(max-width: 720px), (orientation: portrait) and (max-width: 1100px)');
  const isMobile = () => MOBILE_Q.matches;
  function computeSize() {
    const mobile = isMobile();
    let cw;
    if (mobile) cw = Math.min((innerWidth - 16) / 5.3, innerHeight / 8.2);
    else {
      const side = BR.clamp(innerWidth * 0.2, 230, 300);
      const mw = innerWidth - side - 42;
      cw = Math.min(mw / 9.4, (innerHeight - 40) / 6.5, 132);
    }
    cw = Math.max(42, Math.floor(cw));
    document.documentElement.style.setProperty('--cw', cw + 'px');
    UI.cw = cw; UI.ch = Math.round(cw * 1.4);
  }
  const zr = (id) => $(id).getBoundingClientRect();
  function rowLayout(rect, n, w, h, opts = {}) {
    const gap = opts.gap != null ? opts.gap : w * 0.14;
    let step = w + gap;
    if (n > 1 && step * (n - 1) + w > rect.width) step = (rect.width - w) / (n - 1);
    const total = n ? step * (n - 1) + w : 0;
    const x0 = rect.left + (opts.align === 'left' ? 0 : (rect.width - total) / 2);
    const y = rect.top + (rect.height - h) / 2;
    return Array.from({ length: n }, (_, i) => ({ x: x0 + i * step, y }));
  }
  function handLayout(rect, n) {
    const pos = rowLayout(rect, n, UI.cw, UI.ch, { gap: UI.cw * 0.05 });
    return pos.map((p, i) => {
      const t = n > 1 ? i / (n - 1) - 0.5 : 0;
      return { x: p.x, y: p.y + t * t * UI.ch * 0.16 + UI.ch * 0.04, rot: t * Math.min(16, n * 1.7) };
    });
  }
  function deckPos() { const r = zr('z-deck'); return { x: r.left + (r.width - UI.cw) / 2, y: r.top + (r.height - UI.ch) / 2 }; }

  /* ======================= render ======================= */
  function render() {
    const g = UI.g;
    if (!g) { V.sync([]); return; }
    updateSide();
    const app = $('app');
    app.className = 'phase-' + g.phase + (g.phase === 'pack' && !(g.pack && g.pack.hand) ? ' nohand' : '');
    const D = [];
    const cw = UI.cw, ch = UI.ch;
    const cardTip = (c) => () => S.tipHTML('card', c, g);

    // talismanes
    {
      const order = UI.drag && UI.drag.group === 'tal' ? UI.drag.order : g.talismans.map((t) => t.uid);
      const pos = rowLayout(zr('z-tal'), order.length, cw, ch);
      order.forEach((uid, i) => {
        const t = g.talismans.find((x) => x.uid === uid); if (!t) return;
        D.push({ key: uid, kind: 'tal', obj: t, x: pos[i].x, y: pos[i].y, z: 10 + i, from: UI.spawnFrom[uid],
          cls: (UI.selTal === uid ? 'sel' : '') + (t._disabled ? ' disabled-tal' : ''),
          drag: 'tal', onClick: () => clickTal(uid), tip: () => S.tipHTML('tal', t, g) });
      });
      const full = g.talismans.length >= g.talSlots();
      $('tal-count').innerHTML = `<span class="${full ? 'full' : ''}">${g.talismans.length}/${g.talSlots()}</span>`;
    }
    // consumibles
    {
      const pos = rowLayout(zr('z-cons'), g.consumables.length, cw, ch, { gap: cw * 0.08 });
      g.consumables.forEach((k, i) => {
        D.push({ key: k.uid, kind: 'cons', obj: k, x: pos[i].x, y: pos[i].y, z: 10 + i, from: UI.spawnFrom[k.uid], cls: UI.selCons === k.uid ? 'sel' : '',
          onClick: () => clickCons(k.uid), tip: () => S.tipHTML('cons', k, g) });
      });
      $('cons-count').innerHTML = `<span class="${g.consumables.length >= g.consSlots() ? 'full' : ''}">${g.consumables.length}/${g.consSlots()}</span>`;
    }
    // mazo
    const showDeck = g.phase === 'round' || (g.phase === 'pack' && g.pack && g.pack.hand);
    if (showDeck && !isMobile()) {
      const p = deckPos();
      const sc = 1;
      D.push({ key: 'deck', kind: 'deck', obj: {}, x: p.x - (cw - cw * sc) / 2, y: p.y - (ch - ch * sc) / 2, scale: sc, z: 5, onClick: () => { AU.sfx.button(); S.runInfo(g); }, tip: () => `<div class="tt-title">Mazo</div><div class="tt-body">${g.phase === 'round' ? g.drawPile.length : g.deck.length} cartas por robar de ${g.deck.length}</div>` });
    }
    const dp = deckPos();
    // mano
    if (g.phase === 'round' || (g.phase === 'pack' && g.pack && g.pack.hand)) {
      const handIds = g.phase === 'round' ? g.hand : g.pack.hand;
      const order = UI.drag && UI.drag.group === 'hand' ? UI.drag.order : handIds;
      const pos = handLayout(zr('z-hand'), order.length);
      const selArr = g.phase === 'round' ? UI.sel : UI.packSel;
      order.forEach((id, i) => {
        const c = g.card(id); if (!c) return;
        const debuff = g.phase === 'round' && g.isDebuffed(c);
        let cls = selArr.includes(id) ? 'sel' : '';
        if (c._down || UI.flip.has(id)) cls += ' down';
        if (debuff) cls += ' debuff';
        D.push({ key: id, kind: 'card', obj: c, x: pos[i].x, y: pos[i].y, rot: pos[i].rot, z: 30 + i, cls,
          from: { x: dp.x, y: dp.y, rot: 0, down: true }, delay: UI.dealDelay ? UI.dealDelay(id) : 0,
          drag: 'hand', onClick: () => clickHandCard(id), tip: c._down ? null : cardTip(c) });
      });
    }
    // jugadas
    if (g.phase === 'round' && g.played.length) {
      const pos = rowLayout(zr('z-play'), g.played.length, cw, ch, { gap: cw * 0.12 });
      g.played.forEach((id, i) => {
        const c = g.card(id); if (!c) return;
        let cls = '';
        if (UI.scoring) cls = UI.scoring.has(id) ? 'raise' : 'dim';
        if (c._debuffed) cls += ' debuff';
        D.push({ key: id, kind: 'card', obj: c, x: pos[i].x, y: pos[i].y, z: 60 + i, cls, tip: cardTip(c) });
      });
    }
    // feria
    if (g.phase === 'shop' && g.shop) {
      const items = g.shop.items.map((it, i) => ({ it, i })).filter((x) => x.it);
      const pos = rowLayout(zr('z-shop'), items.length, cw, ch, { gap: cw * 0.35 });
      items.forEach(({ it, i }, k) => {
        const key = 'shop' + i + '_' + it.kind + it.id;
        const obj = it.kind === 'tal' ? { id: it.id, ed: it.ed, st: BR.TAL_BY_ID[it.id].init ? BR.TAL_BY_ID[it.id].init() : {} } : { type: it.kind, id: it.id };
        const cost = g.itemCost(it);
        D.push({ key, kind: it.kind === 'tal' ? 'tal' : 'cons', obj, x: pos[k].x, y: pos[k].y + 12, z: 20 + k, price: cost,
          cls: (UI.selShop === key ? 'sel' : '') + (g.canAfford(cost) ? '' : ' cant'),
          onClick: () => clickShop(key, 'items', i), tip: () => S.tipHTML(it.kind === 'tal' ? 'tal' : 'cons', obj, g) });
      });
      if (g.shop.voucher) {
        const r = zr('z-voucher'); const v = g.shop.voucher; const key = 'vou_' + v.id; const cost = g.itemCost(v);
        D.push({ key, kind: 'voucher', obj: v, x: r.left + (r.width - cw) / 2, y: r.top + (r.height - ch) / 2 + 12, z: 20, price: cost,
          cls: (UI.selShop === key ? 'sel' : '') + (g.canAfford(cost) ? '' : ' cant'), onClick: () => clickShop(key, 'voucher', 0), tip: () => S.tipHTML('voucher', v, g) });
      }
      const packs = g.shop.packs.map((p, i) => ({ p, i })).filter((x) => x.p);
      const pp = rowLayout(zr('z-packs'), packs.length, cw, ch, { gap: cw * 0.5 });
      packs.forEach(({ p, i }, k) => {
        const key = 'pack' + i + '_' + p.pack + p.size; const cost = g.itemCost(p);
        D.push({ key, kind: 'pack', obj: p, x: pp[k].x, y: pp[k].y + 12, z: 20 + k, price: cost,
          cls: (UI.selShop === key ? 'sel' : '') + (g.canAfford(cost) ? '' : ' cant'), onClick: () => clickShop(key, 'packs', i), tip: () => S.tipHTML('pack', p, g) });
      });
    }
    // sobre
    if (g.phase === 'pack' && g.pack) {
      const ch2 = g.pack.choices.map((c, i) => ({ c, i })).filter((x) => x.c);
      const pos = rowLayout(zr('z-pack'), ch2.length, cw, ch, { gap: cw * 0.3 });
      ch2.forEach(({ c }, k) => {
        const key = c.key;
        let kind = 'cons', obj;
        if (c.kind === 'tal') { kind = 'tal'; obj = { id: c.id, ed: c.ed, st: BR.TAL_BY_ID[c.id].init ? BR.TAL_BY_ID[c.id].init() : {} }; }
        else if (c.kind === 'card') { kind = 'card'; obj = c; }
        else obj = { type: c.kind, id: c.id };
        D.push({ key, kind, obj, x: pos[k].x, y: pos[k].y, z: 40 + k, cls: UI.selShop === key ? 'sel' : '',
          from: { x: pos[k].x, y: pos[k].y + 80, scale: 0.3 },
          onClick: () => clickPackChoice(key), tip: () => S.tipHTML(kind === 'card' ? 'card' : kind, obj, g) });
      });
    }
    V.sync(D);
    UI.spawnFrom = {};
    const showHint = g.phase === 'round' && Meta.data.stats.hands < 2 && !UI.sel.length && !UI.busy && !g.played.length;
    const hint = $('hint');
    if (hint) { hint.classList.toggle('show', showHint); }
    if (UI.hoverKey && !V.sprites.has(UI.hoverKey)) { S.hideTip(); UI.hoverKey = null; }
  }

  /* ======================= barra lateral ======================= */
  function updateSide() {
    const g = UI.g;
    const kind = g.blindKind(Math.min(2, g.blindIdx));
    const inRound = g.phase === 'round' && g.r;
    let name, color, medal, desc = '';
    const bk = inRound ? g.r.kind : kind;
    if (bk === 'boss') {
      const b = BR.BOSS_BY_ID[g.bossId];
      name = b.name; color = b.color; medal = BR.Art.bossMedal(g.bossId);
      desc = g.talFlags().noBoss && inRound ? '<s>' + BR.rich(b.desc) + '</s> (Rompehechizos)' : BR.rich(b.desc);
    } else { name = BR.RIVALS[bk].name; color = BR.RIVALS[bk].color; medal = BR.Art.blindMedal(bk); }
    if (g.phase === 'shop') { name = 'La Feria'; color = '#a8322e'; }
    $('blindbox').style.setProperty('--bbc', color);
    setHTML('bb-name', name);
    setHTML('bb-medal', g.phase === 'shop' ? `<div class="medal" style="--mc:#c0503a">${BR.icon('stall')}</div>` : medal);
    let target = inRound ? g.r.target : g.blindTarget(Math.min(2, g.blindIdx));
    let rew = inRound ? g.blindReward() : g.blindReward(Math.min(2, g.blindIdx));
    if (g.phase === 'shop') {
      if (g.blindIdx < 2) { target = g.blindTarget(g.blindIdx + 1); rew = g.blindReward(g.blindIdx + 1); }
      else { target = Math.floor(BR.anteBase(g.ante + 1, g.stake) * (g.flags.targetMult || 1)); rew = g.stake >= 1 ? 0 : 3; }
    }
    setHTML('bb-target', BR.fmt(target));
    setHTML('bb-reward', rew ? 'Recompensa: ' + (rew <= 5 ? '$'.repeat(rew) : '$' + rew) : 'Sin recompensa');
    setHTML('bb-desc', g.phase === 'shop' ? 'Próximo: ' + (g.blindIdx === 2 ? 'Noche ' + (g.ante + 1) : BR.RIVALS[g.blindKind(g.blindIdx + 1)]?.name || BR.BOSS_BY_ID[g.bossId].name) : desc);
    if (!UI.animScore) {
      const sc = inRound ? g.r.score : 0;
      setHTML('round-score', BR.fmt(sc));
      $('score-fill').style.width = (inRound ? Math.min(100, (sc / g.r.target) * 100) : 0) + '%';
      $('scorebox').classList.toggle('done', inRound && sc >= g.r.target);
    }
    setHTML('st-hands', inRound ? g.r.handsLeft : g.handsPerRound());
    setHTML('st-discards', inRound ? g.r.discardsLeft : g.discardsPerRound());
    if (!UI.animMoney) setHTML('st-money', (g.money < 0 ? '-$' : '$') + Math.abs(g.money));
    setHTML('st-ante', g.ante);
    $('st-ante').nextElementSibling.textContent = g.endless || g.ante > 8 ? '' : '/8';
    setHTML('st-round', (g.ante - 1) * 3 + Math.min(2, g.blindIdx) + 1);
    const tr = inRound ? g.r.trump : g.trumpLock ? g.trumpLock.suit : null;
    setHTML('st-trump', tr ? `${BR.Art.suitIcon(tr, 26)}<span>${BR.SUIT_INFO[tr].name}</span>` : '<span style="opacity:.5">—</span>');
    setHTML('deck-count', inRound ? `${g.drawPile.length}/${g.deck.length}` : `${g.deck.length}/${g.deck.length}`);
    if (!UI.animScore && !UI.busy) updatePreview();
    const sel = UI.sel.length;
    $('btn-play').disabled = !(inRound && sel > 0 && sel <= 5 && g.r.handsLeft > 0) || UI.busy;
    $('btn-discard').disabled = !(inRound && sel > 0 && sel <= 5 && g.r.discardsLeft > 0) || UI.busy;
    if (g.shop) { const rc = g.rerollCostNow(); setHTML('reroll-cost', rc === 0 ? 'gratis' : '$' + rc); $('btn-reroll').disabled = !g.canAfford(rc); }
    // panel de fase
    if (g.phase === 'blind') renderBlindSelect();
    if (g.phase === 'pack' && g.pack) {
      const K = BR.PACK_KINDS[g.pack.kind];
      setHTML('pack-title', (BR.PACK_SIZES[g.pack.size].name ? BR.PACK_SIZES[g.pack.size].name + ' ' : '') + K.name);
      const needSel = g.pack.hand ? ' · selecciona cartas de tu mano si el efecto lo pide' : '';
      setHTML('pack-sub', `Elige ${g.pack.picks} más${needSel}`);
    }
  }
  function setHTML(id, html) { const el = $(id); if (el && el._h !== html) { el.innerHTML = html; el._h = html; } }

  function updatePreview() {
    const g = UI.g;
    const hn = $('hand-name');
    hn.classList.remove('blocked');
    if (g.phase === 'round' && UI.sel.length) {
      const p = g.previewHand(UI.sel);
      if (p) {
        hn.innerHTML = `${BR.HANDS[p.type].name}<small>nv.${p.level}</small>${p.cante ? `<small class="cantetag">${p.cante === 'cuarenta' ? '¡Las 40!' : '¡Las 20!'}</small>` : ''}`;
        if (p.blocked) { hn.classList.add('blocked'); hn.innerHTML = '⚠ ' + p.blocked; }
        setChipsMult(p.chips, p.mult);
        return;
      }
    }
    hn.innerHTML = '&nbsp;';
    setChipsMult(0, 0);
  }
  function setChipsMult(c, m, bump) {
    const cv = $('chips-val'), mv = $('mult-val');
    const ct = BR.fmt(c), mt = BR.fmtNum(m);
    if (cv.textContent !== ct) { cv.textContent = ct; if (bump === 'c') bumpEl('chips-box'); }
    if (mv.textContent !== mt) { mv.textContent = mt; if (bump === 'm') bumpEl('mult-box'); }
  }
  function bumpEl(id) { const e = $(id); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
  function flashEl(id) { const e = $(id); e.classList.remove('flash'); void e.offsetWidth; e.classList.add('flash'); }

  /* ======================= selección de envite ======================= */
  function renderBlindSelect() {
    const g = UI.g;
    const el = $('blindsel');
    const sig = [g.ante, g.blindIdx, g.bossId, g.blindTags.join(), g.money].join('|');
    if (el._sig === sig) return;
    el._sig = sig;
    const cols = [0, 1, 2].map((i) => {
      const kind = g.blindKind(i);
      const isBoss = kind === 'boss';
      const b = isBoss ? BR.BOSS_BY_ID[g.bossId] : null;
      const color = isBoss ? b.color : BR.RIVALS[kind].color;
      const name = isBoss ? b.name : BR.RIVALS[kind].name;
      const state = i < g.blindIdx ? 'past' : i === g.blindIdx ? 'current' : 'future';
      const rew = g.blindReward(i);
      const medal = isBoss ? `<div data-tip="boss:${b.id}">${BR.Art.bossMedal(b.id)}</div>` : BR.Art.blindMedal(kind);
      let foot = '';
      if (!isBoss) {
        const tg = g.blindTags[i];
        foot = state === 'current' ? `<div class="bskip"><div data-tip="tagi:${tg}">${BR.Art.tagHTML(tg)}</div><span class="or">o</span><button class="btn ghost small" data-act="skip">Saltar envite</button></div>`
          : state === 'future' ? `<div class="bskip"><div data-tip="tagi:${tg}">${BR.Art.tagHTML(tg)}</div><span class="or">si lo saltas</span></div>` : '';
      }
      return `<div class="bcol ${state}" style="--bcc:${color}">
        <div class="bh">${name}</div>
        <div class="bbody">
          ${medal}
          <div class="lbl">Objetivo</div>
          <div class="btarget">${BR.fmt(g.blindTarget(i))}</div>
          <div class="reward">${rew ? (rew <= 5 ? '$'.repeat(rew) : '$' + rew) : 'Sin recompensa'}</div>
          <div class="bdesc">${isBoss ? BR.rich(b.desc) : i === 0 ? 'Un primer envite para calentar las manos.' : 'La apuesta sube. Demuestra lo que vales.'}</div>
          ${state === 'current' ? '<button class="btn play" data-act="select">Elegir</button>' : state === 'past' ? '<div class="done-mark">' + (g.skippedIdx && g.skippedIdx.includes(g.ante + ':' + i) ? 'SALTADO' : 'SUPERADO') + '</div>' : '<div class="done-mark" style="opacity:.6">PRÓXIMO</div>'}
        </div>${foot}</div>`;
    });
    el.innerHTML = cols.join('');
    el.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => (b.dataset.act === 'select' ? selectBlind() : skipBlind()));
  }

  async function selectBlind() {
    const g = UI.g;
    if (UI.busy || g.phase !== 'blind') return;
    AU.sfx.button();
    UI.busy = true;
    const ev = g.selectBlind();
    UI.sel = [];
    setMood();
    if (g.r.kind === 'boss') { AU.sfx.boss(); banner(BR.BOSS_BY_ID[g.bossId].name, 'red', BR.BOSS_BY_ID[g.bossId].desc.replace(/\{[a-z$]([^}]*)\}/gi, '$1')); FX.shake(5, 400); }
    AU.sfx.shuffle();
    const order = g.hand.slice();
    UI.dealDelay = (id) => { const i = order.indexOf(id); return i >= 0 ? i * 70 : 0; };
    render();
    order.forEach((_, i) => setTimeout(() => AU.sfx.deal(), i * 70 / BR.speedMult));
    UI.dealDelay = null;
    showEvents(ev);
    await wait(500);
    UI.busy = false;
    render();
    save();
  }
  function skipBlind() {
    const g = UI.g;
    if (UI.busy || g.phase !== 'blind') return;
    (g.skippedIdx = g.skippedIdx || []).push(g.ante + ':' + g.blindIdx);
    const res = g.skipBlind();
    if (!res) return;
    AU.sfx.levelup();
    const t = BR.TAG_BY_ID[res.tag];
    S.toast(`✦ ${t.name}: ${BR.rich(t.desc)}`, 'unlock');
    if (res.money) { moneyPop(res.money); }
    for (const x of res.extra) { const tt = BR.TAG_BY_ID[x.tag]; S.toast(`✦ Copia: ${tt.name}`, 'unlock'); }
    if (g.openPendingPack('blind')) { AU.sfx.pack(); }
    ach({ type: 'tick' });
    render(); save();
  }

  /* ======================= interacción ======================= */
  function clickHandCard(id) {
    const g = UI.g;
    if (UI.busy) return;
    hideActions();
    if (g.phase === 'round') {
      const i = UI.sel.indexOf(id);
      if (i >= 0) { UI.sel.splice(i, 1); AU.sfx.deselect(); }
      else if (UI.sel.length < 5) { UI.sel.push(id); AU.sfx.select(); }
      else { AU.sfx.error(); V.shakeIt(id); return; }
      render();
      if (UI.selCons) showConsActions(UI.selCons);
    } else if (g.phase === 'pack') {
      const i = UI.packSel.indexOf(id);
      if (i >= 0) { UI.packSel.splice(i, 1); AU.sfx.deselect(); }
      else if (UI.packSel.length < 5) { UI.packSel.push(id); AU.sfx.select(); }
      render();
      if (UI.selShop) showPackActions(UI.selShop);
    }
  }
  function clickTal(uid) {
    if (UI.busy) return;
    UI.selCons = null; UI.selShop = null;
    if (UI.selTal === uid) { UI.selTal = null; hideActions(); AU.sfx.deselect(); render(); return; }
    UI.selTal = uid; AU.sfx.select(); render();
    const t = UI.g.talismans.find((x) => x.uid === uid);
    showActions(uid, [{ label: `Vender <b>$${UI.g.sellValue(t)}</b>`, cls: 'green', fn: () => sellTal(uid) }]);
  }
  function clickCons(uid) {
    if (UI.busy) return;
    UI.selTal = null; UI.selShop = null;
    if (UI.selCons === uid) { UI.selCons = null; hideActions(); AU.sfx.deselect(); render(); return; }
    UI.selCons = uid; AU.sfx.select(); render();
    showConsActions(uid);
  }
  function showConsActions(uid) {
    const g = UI.g;
    const k = g.consumables.find((x) => x.uid === uid); if (!k) return;
    const sel = g.phase === 'pack' ? UI.packSel : UI.sel;
    const ok = g.canUse(k, sel);
    const d = BR.consDef(k);
    let hint = '';
    if (!ok && d.sel) hint = d.sel[0] === d.sel[1] ? `Selecciona ${d.sel[0]} carta${d.sel[0] > 1 ? 's' : ''}` : `Selecciona de ${d.sel[0]} a ${d.sel[1]} cartas`;
    if (d.sel && g.phase !== 'round' && g.phase !== 'pack') hint = 'Úsalo durante una ronda';
    showActions(uid, [
      { label: hint || 'Usar', cls: 'blue', disabled: !ok, fn: () => useCons(uid) },
      { label: `Vender <b>$${g.sellValue(k)}</b>`, cls: 'green', fn: () => sellCons(uid) },
    ]);
  }
  function clickShop(key, where, idx) {
    if (UI.busy) return;
    const g = UI.g;
    UI.selTal = null; UI.selCons = null;
    if (UI.selShop === key) { UI.selShop = null; hideActions(); render(); return; }
    UI.selShop = key; AU.sfx.select(); render();
    const it = where === 'items' ? g.shop.items[idx] : where === 'packs' ? g.shop.packs[idx] : g.shop.voucher;
    const cost = g.itemCost(it);
    const label = where === 'packs' ? 'Abrir' : where === 'voucher' ? 'Canjear' : 'Comprar';
    let noRoom = null;
    if (it.kind === 'tal' && g.talismans.length >= g.talSlots() && it.ed !== 'eclipse') noRoom = 'Sin huecos: vende un Talismán';
    if ((it.kind === 'aug' || it.kind === 'con' || it.kind === 'ani') && g.consSpace() <= 0) noRoom = 'Sin huecos de consumible';
    const acts = [{ label: noRoom || (!g.canAfford(cost) ? `Te faltan <b>$${cost - g.money - g.debtLimit()}</b>` : `${label} <b>${cost ? '$' + cost : 'gratis'}</b>`), cls: 'gold', disabled: !g.canAfford(cost) || !!noRoom, fn: () => buy(where, idx, key) }];
    if (where === 'items' && it.kind !== 'tal') {
      const d = BR.consDef({ type: it.kind, id: it.id });
      if (!d.sel) acts.push({ label: 'Comprar y usar', cls: 'blue', disabled: !g.canAfford(cost) || (d.can && !d.can(g)), fn: () => buy(where, idx, key, true) });
    }
    showActions(key, acts);
  }
  function clickPackChoice(key) {
    if (UI.busy) return;
    UI.selTal = null; UI.selCons = null;
    if (UI.selShop === key) { UI.selShop = null; hideActions(); render(); return; }
    UI.selShop = key; AU.sfx.select(); render();
    showPackActions(key);
  }
  function showPackActions(key) {
    const g = UI.g;
    const c = g.pack.choices.find((x) => x && x.key === key); if (!c) return;
    let ok = true, label = 'Elegir', hint = '';
    if (c.kind === 'tal') { ok = g.talismans.length < g.talSlots() || c.ed === 'eclipse'; if (!ok) hint = 'Sin huecos de Talismán'; }
    else if (c.kind === 'aug' || c.kind === 'ani' || c.kind === 'con') {
      label = 'Usar';
      const d = BR.consDef({ type: c.kind, id: c.id });
      ok = g.canUse({ type: c.kind, id: c.id }, UI.packSel);
      if (!ok && d.sel) hint = d.sel[0] === d.sel[1] ? `Selecciona ${d.sel[0]} carta${d.sel[0] > 1 ? 's' : ''}` : `Selecciona de ${d.sel[0]} a ${d.sel[1]} cartas`;
      else if (!ok) hint = 'No se puede usar ahora';
    }
    showActions(key, [{ label: hint || label, cls: 'gold', disabled: !ok, fn: () => pickPack(key) }]);
  }

  function showActions(key, acts) {
    const am = $('actionmenu');
    am.innerHTML = '';
    for (const a of acts) {
      const b = document.createElement('button');
      b.className = 'btn small ' + (a.cls || '');
      b.innerHTML = a.label; b.disabled = !!a.disabled;
      b.onclick = (e) => { e.stopPropagation(); if (b.disabled) return; hideActions(); a.fn(); };
      am.appendChild(b);
    }
    am.classList.add('show');
    const r = V.rect(key);
    if (!r) return;
    const w = am.offsetWidth, h = am.offsetHeight;
    let x = r.left + r.width / 2 - w / 2, y = r.bottom + 8;
    if (y + h > innerHeight - 6) y = r.top - h - 8;
    am.style.left = BR.clamp(x, 6, innerWidth - w - 6) + 'px';
    am.style.top = Math.max(6, y) + 'px';
    if (UI.touch) { const s = V.sprites.get(key); if (s && s.desc.tip) S.showTip(s.desc.tip(), r, y < r.top ? 'below' : 'above'); }
  }
  function hideActions() { $('actionmenu').classList.remove('show'); if (UI.touch) S.hideTip(); }
  function clearSelections() { UI.selTal = null; UI.selCons = null; UI.selShop = null; hideActions(); }

  /* ======================= jugar y descartar ======================= */
  async function playHand() {
    const g = UI.g;
    if (UI.busy || g.phase !== 'round' || !UI.sel.length) return;
    clearSelections();
    const ids = g.hand.filter((id) => UI.sel.includes(id));
    UI.busy = true;
    AU.sfx.whoosh();
    const res = g.playHand(ids);
    UI.sel = [];
    if (!res) { UI.busy = false; render(); return; }
    render();
    await wait(480);
    await animateScoring(res);
    await finishPlay(res);
  }

  function srcPos(src) {
    if (!src) return null;
    if (src.t === 'card' || src.t === 'held') { const r = V.rect(src.id); return r ? [r.left + r.width / 2, r.top + r.height * 0.12] : null; }
    if (src.t === 'tal' || src.t === 'cons') { const r = V.rect(src.id); return r ? [r.left + r.width / 2, r.bottom - r.height * 0.05] : null; }
    if (src.t === 'boss') return FX.center($('bb-medal'));
    return FX.center($('handbox'));
  }
  function jigSrc(src) {
    if (!src) return;
    if (src.t === 'card' || src.t === 'held' || src.t === 'tal' || src.t === 'cons') V.jig(src.id);
    if (src.card) V.jig(src.card);
  }

  async function animateScoring(res) {
    const g = UI.g;
    UI.animScore = true;
    UI.scoring = new Set(res.scoringIds);
    render();
    const hn = $('hand-name');
    let pitch = 0, i = 0;
    const startScore = g.r.score - res.total;
    for (const st of res.steps) {
      const d = Math.max(130, 400 * Math.pow(0.955, i)); i++;
      const pos = srcPos(st.src) || FX.center($('handbox'));
      switch (st.kind) {
        case 'blocked':
          hn.classList.add('blocked'); hn.textContent = '⚠ ' + st.text; AU.sfx.error(); FX.shake(6, 300);
          banner('¡No permitido!', 'red', st.text);
          V.shakeIt('dummy');
          await wait(1100); break;
        case 'base': {
          hn.innerHTML = `${BR.HANDS[st.type].name}<small>nv.${st.level}</small>`;
          const pc = FX.center($('z-play'));
          FX.pop(pc[0], pc[1] - UI.ch * 0.78, BR.HANDS[st.type].name, 'msg', { cls: 'handtitle', dur: 1400 });
          setChipsMult(st.chips, st.mult); bumpEl('chips-box'); bumpEl('mult-box');
          AU.sfx.tick(); await wait(380); break;
        }
        case 'cante': {
          setChipsMult(st.chips, st.mult, 'c');
          AU.sfx.cante(); BR.BG.pulse(0.8);
          banner(st.cante === 'cuarenta' ? '¡Las Cuarenta!' : '¡Las Veinte!', st.cante === 'cuarenta' ? '' : 'blue', st.cante === 'cuarenta' ? 'Caballo y Rey del palo de Triunfo' : 'Caballo y Rey del mismo palo');
          FX.pop(pos[0], pos[1] - 20, '+' + st.value, 'chips', { big: true });
          if (st.cante === 'cuarenta') FX.shake(7, 400);
          await wait(1000); break;
        }
        case 'chips':
          jigSrc(st.src); FX.pop(pos[0], pos[1], '+' + BR.fmt(st.value), 'chips'); setChipsMult(st.chips, st.mult, 'c');
          AU.sfx.chips(pitch++); await wait(d); break;
        case 'mult':
          jigSrc(st.src); FX.pop(pos[0], pos[1], '+' + BR.fmtNum(st.value) + (st.trump ? ' Triunfo' : ' Mult'), 'mult', { cls: st.trump ? 'small' : '' }); setChipsMult(st.chips, st.mult, 'm');
          AU.sfx.mult(pitch++); await wait(d); break;
        case 'xmult':
          jigSrc(st.src); FX.pop(pos[0], pos[1], '×' + BR.fmtNum(st.value) + ' Mult', 'xmult'); setChipsMult(st.chips, st.mult, 'm');
          AU.sfx.xmult(pitch++); FX.shake(4 + Math.min(6, st.value), 260); BR.BG.pulse(0.4); FX.ring(pos[0], pos[1], '#ff6a7a', 90, 500, 5);
          await wait(d * 1.25); break;
        case 'money':
          jigSrc(st.src); FX.pop(pos[0], pos[1], (st.value < 0 ? '-$' : '+$') + Math.abs(st.value), 'money'); FX.coins(pos[0], pos[1], 6);
          AU.sfx.money(); flashEl('st-money'); setHTML('st-money', (g.money < 0 ? '-$' : '$') + Math.abs(g.money)); await wait(d); break;
        case 'retrigger':
          jigSrc(st.src); FX.pop(pos[0], pos[1] - 10, '¡Otra vez!', 'msg', { color: '#ffb0ff' }); AU.sfx.tick(); await wait(d * 0.8); break;
        case 'debuffed':
          V.shakeIt(st.src.id); FX.pop(pos[0], pos[1], 'Debilitada', 'msg', { color: '#ff8090' }); await wait(d * 0.8); break;
        case 'msg':
          jigSrc(st.src); FX.pop(pos[0], pos[1], st.text, 'msg', { color: st.color === 'm' ? '#ff8090' : st.color === 'c' ? '#8fc0ff' : st.color === 'x' ? '#ff9ad0' : null });
          AU.sfx.tick(); await wait(d * 0.9); break;
        case 'balance':
          FX.pop(pos[0], pos[1], 'Equilibrio', 'msg', { color: '#d0a8ff' }); setChipsMult(st.chips, st.mult); bumpEl('chips-box'); bumpEl('mult-box'); AU.sfx.levelup(); await wait(600); break;
        case 'total': {
          AU.sfx.total();
          const tEl = $('hand-total');
          tEl.textContent = BR.fmt(st.value); tEl.classList.add('show');
          const need = g.r.target - startScore;
          const fire = st.value >= need && st.value > 0;
          const pc = FX.center($('z-play'));
          FX.pop(pc[0], pc[1] - UI.ch * 0.75, BR.fmt(st.value), 'msg', { big: true, color: fire ? '#ffd36e' : '#fff6dc', dur: 1300 });
          if (fire) {
            FX.flame($('chips-box'), true); FX.flame($('mult-box'), true); FX.embers($('handbox'), true);
            FX.shake(8, 450); BR.BG.pulse(1);
            FX.burst(pc[0], pc[1], { n: 40, colors: ['#ffd36e', '#ff8a3d', '#fff'], speed: 9, life: 900, size: 4, shape: 'star' });
          }
          await wait(500);
          await countScore(startScore, g.r.score);
          await wait(fire ? 650 : 350);
          FX.flame($('chips-box'), false); FX.flame($('mult-box'), false); FX.embers(null, false);
          tEl.classList.remove('show');
          break;
        }
      }
      if (st.post) await wait(60);
    }
    ach({ type: 'hand', total: res.total, cante: res.ctx && res.ctx.cante, contains: res.ev.contains, handType: res.ev.type });
    const nb = Meta.recordHand(g, res.total, res.ev.type);
    if (nb && res.total > 1000) S.toast('✦ ¡Nueva mejor mano: ' + BR.fmt(res.total) + '!', 'unlock');
    UI.animScore = false;
    UI.scoring = null;
  }
  function countScore(a, b) {
    return new Promise((resolve) => {
      const g = UI.g;
      const t0 = performance.now(), dur = 650 / BR.speedMult;
      const el = $('round-score'), fill = $('score-fill');
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        const v = a + (b - a) * e;
        el.textContent = BR.fmt(v); el._h = null;
        fill.style.width = Math.min(100, (v / g.r.target) * 100) + '%';
        if (k < 1) requestAnimationFrame(step); else { $('scorebox').classList.toggle('done', b >= g.r.target); resolve(); }
      };
      requestAnimationFrame(step);
      flashEl('round-score');
    });
  }

  async function finishPlay(res) {
    const g = UI.g;
    const playedIds = g.played.slice();
    const out = g.finishPlay();
    const sr = $('stage').getBoundingClientRect();
    for (const c of out.broken) { V.exit(c.id, { mode: 'shatter' }); }
    if (out.broken.length) { AU.sfx.glass(); FX.shake(5, 250); for (const c of out.broken) { const p = V.center(c.id); if (p) FX.burst(p[0], p[1], { n: 26, colors: ['#e8fbff', '#9fe0ff', '#fff'], speed: 7, life: 700, size: 3, shape: 'rect' }); } }
    if (out.glassEv) showEvents(out.glassEv);
    for (const id of playedIds) if (!out.broken.some((c) => c.id === id)) V.exit(id, { mode: 'fly', x: sr.width + UI.cw, y: sr.height * 0.4, rot: 40 });
    for (const id of out.discarded || []) V.exit(id, { mode: 'fly', x: sr.width + UI.cw, y: sr.height * 0.7, rot: 40 });
    $('hand-name').innerHTML = '&nbsp;'; setChipsMult(0, 0);
    if (out.won) {
      // las cartas que quedan vuelven al mazo
      render();
      await wait(400);
      await roundWon(out);
      return;
    }
    if (out.lost) { render(); await wait(500); gameOver(out.empty ? 'Te has quedado sin cartas' : null); return; }
    const order = out.drawn.slice();
    UI.dealDelay = (id) => { const i = order.indexOf(id); return i >= 0 ? 200 + i * 70 : 0; };
    render();
    UI.dealDelay = null;
    order.forEach((_, i) => setTimeout(() => AU.sfx.deal(), (200 + i * 70) / BR.speedMult));
    await wait(300 + order.length * 70);
    UI.busy = false;
    render();
    save();
  }

  async function discard() {
    const g = UI.g;
    if (UI.busy || g.phase !== 'round' || !UI.sel.length || g.r.discardsLeft <= 0) return;
    clearSelections();
    UI.busy = true;
    const ids = UI.sel.slice();
    const sr = $('stage').getBoundingClientRect();
    ids.forEach((id, i) => V.exit(id, { mode: 'fly', x: sr.width + UI.cw, y: sr.height * 0.55 + i * 10, rot: 50 + i * 8 }));
    const res = g.discard(ids);
    UI.sel = [];
    AU.sfx.whoosh();
    showEvents(res.ev);
    if (res.created.length) { AU.sfx.levelup(); S.toast('✦ El Lacre del Augur te concede un Augurio', 'unlock'); }
    const order = res.drawn.slice();
    UI.dealDelay = (id) => { const i = order.indexOf(id); return i >= 0 ? 150 + i * 70 : 0; };
    render();
    UI.dealDelay = null;
    order.forEach((_, i) => setTimeout(() => AU.sfx.deal(), (150 + i * 70) / BR.speedMult));
    await wait(250 + order.length * 70);
    UI.busy = false;
    if (res.lost) { gameOver('Te has quedado sin cartas'); return; }
    render(); save();
  }

  function showEvents(evs) {
    if (!evs) return;
    let k = 0;
    for (const e of evs) {
      if (!e.msg && !e.money) continue;
      setTimeout(() => {
        const p = V.center(e.uid); if (!p) return;
        V.jig(e.uid);
        if (e.money) { FX.pop(p[0], p[1] + UI.ch * 0.4, '+$' + e.money, 'money'); AU.sfx.money(); }
        else { FX.pop(p[0], p[1] + UI.ch * 0.4, e.msg, 'msg', { color: e.color === 'm' ? '#ff8090' : e.color === 'c' ? '#8fc0ff' : e.color === 'x' ? '#ff9ad0' : null }); AU.sfx.tick(); }
      }, (k++ * 280) / BR.speedMult);
    }
  }

  /* ======================= fin de ronda / cobro ======================= */
  async function roundWon(out) {
    const g = UI.g;
    const boss = g.r.kind === 'boss';
    AU.sfx.win();
    banner(out.fenix ? '¡El Fénix te salva!' : boss ? '¡Guardián vencido!' : '¡Envite superado!', '', out.fenix ? 'Arde en llamas y renace tu esperanza' : null);
    FX.confetti();
    BR.BG.pulse(1.2);
    ach({ type: 'round', boss: g.r.kind === 'boss' });
    await wait(900);
    for (const id of g.hand) V.exit(id, { mode: 'fly', x: deckPos().x, y: deckPos().y, down: true });
    const res = g.endRound();
    showEvents(res.tev.filter((e) => !e.money));
    if (res.created.length) S.toast('✦ Has recibido ' + res.created.length + ' consumible' + (res.created.length > 1 ? 's' : ''), 'unlock');
    const un = Meta.checkUnlocks(g);
    for (const u of un) S.toast('🔓 ' + u.text, 'unlock');
    UI.busy = false;
    render();
    buildCashout();
    save();
  }
  function buildCashout() {
    const g = UI.g;
    const el = $('cashout');
    const lines = g.cashLines || [];
    el.innerHTML = `<div class="cashcard panel"><h2>¡A cobrar!</h2><div class="sub">Noche ${g.ante} · ${g.blindKind() === 'boss' ? BR.BOSS_BY_ID[g.bossId].name : BR.RIVALS[g.blindKind()].name}</div>
      ${lines.map((l) => `<div class="cashline"><span>${l.label}</span><span class="v">${l.value ? '$'.repeat(Math.min(l.value, 8)) + (l.value > 8 ? '…' : '') + ' ' + l.value : '0'}</span></div>`).join('')}
      <button class="btn gold big" id="btn-cash">Cobrar <b>$${g.cashTotal}</b></button></div>`;
    const ls = el.querySelectorAll('.cashline');
    ls.forEach((l, i) => setTimeout(() => { l.classList.add('in'); AU.sfx.coinTick(); }, (250 + i * 260) / BR.speedMult));
    el.querySelector('#btn-cash').onclick = () => cashOut();
  }
  function cashOut() {
    const g = UI.g;
    if (g.phase !== 'cashout' || UI.busy) return;
    const total = g.cashTotal;
    const p = FX.center($('btn-cash'));
    FX.coins(p[0], p[1], 18);
    AU.sfx.buy();
    const before = g.money;
    const r = g.cashOut();
    animateMoney(before, g.money);
    if (r === 'victory') {
      AU.sfx.victory(); FX.confetti(); setTimeout(FX.confetti, 900);
      BR.BG.set('win');
      ach({ type: 'win' });
      const un = recordEnd(true);
      render();
      setTimeout(() => S.endScreen(g, true, un, endChoice), 1200 / BR.speedMult);
      save();
      return;
    }
    clearSelections();
    setMood();
    render();
    if (g.shopTagsApplied && g.shopTagsApplied.length) for (const t of g.shopTagsApplied) S.toast('✦ ' + BR.TAG_BY_ID[t].name + ' activada', 'unlock');
    save();
  }
  function animateMoney(a, b) {
    if (a === b) return;
    UI.animMoney = true;
    const t0 = performance.now(), dur = 500;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const v = Math.round(a + (b - a) * k);
      $('st-money').textContent = (v < 0 ? '-$' : '$') + Math.abs(v); $('st-money')._h = null;
      if (k < 1) requestAnimationFrame(step); else { UI.animMoney = false; flashEl('st-money'); render(); }
    };
    requestAnimationFrame(step);
  }
  function moneyPop(v) { const p = FX.center($('st-money')); FX.pop(p[0], p[1], (v < 0 ? '-$' : '+$') + Math.abs(v), 'money'); FX.coins(p[0], p[1], 6); AU.sfx.money(); flashEl('st-money'); }

  /* ======================= feria ======================= */
  async function buy(where, idx, key, useNow) {
    const g = UI.g;
    const it = where === 'items' ? g.shop.items[idx] : where === 'packs' ? g.shop.packs[idx] : g.shop.voucher;
    const before = g.money;
    const sr0 = V.rect(key);
    const r = g.buy(where, idx, useNow);
    UI.selShop = null;
    if (sr0) {
      const fr = { x: sr0.left, y: sr0.top };
      if (r.talisman) UI.spawnFrom[r.talisman.uid] = fr;
      if (r.consumable) UI.spawnFrom[r.consumable.uid] = fr;
    }
    if (r.err) { AU.sfx.error(); S.toast(r.err, 'err'); V.shakeIt(key); render(); return; }
    AU.sfx.buy();
    const p = V.center(key);
    if (p) FX.coins(p[0], p[1], 8);
    animateMoney(before, g.money);
    if (r.voucher) { AU.sfx.levelup(); banner(BR.VOUCHER_BY_ID[r.voucher].name, '', BR.VOUCHER_BY_ID[r.voucher].desc.replace(/\{[a-z$]([^}]*)\}/gi, '$1')); }
    if (r.talisman || r.consumable) { const s0 = V.sprites.get(key); if (s0) { s0.el.remove(); V.sprites.delete(key); } }
    if (r.pack) { AU.sfx.pack(); UI.packSel = []; if (p) FX.burst(p[0], p[1], { n: 40, colors: ['#fff6dc', '#ffd36e', '#c77dff'], speed: 8, life: 800, size: 4, shape: 'star' }); }
    render();
    if (r.used) { V.exit(key, { mode: 'dissolve' }); render(); UI.busy = true; await animateConsResult(r.used); UI.busy = false; render(); }
    ach({ type: 'tick' });
    save();
  }
  function reroll() {
    const g = UI.g;
    if (UI.busy || g.phase !== 'shop') return;
    const before = g.money;
    if (!g.reroll()) { AU.sfx.error(); S.toast('No tienes suficiente dinero', 'err'); return; }
    clearSelections();
    AU.sfx.shuffle();
    animateMoney(before, g.money);
    render(); save();
  }
  function nextBlind() {
    const g = UI.g;
    if (UI.busy || g.phase !== 'shop') return;
    AU.sfx.button();
    clearSelections();
    g.advanceAfterShop();
    for (const u of Meta.checkUnlocks(g)) S.toast('🔓 ' + u.text, 'unlock');
    ach({ type: 'tick' });
    if (g.blindIdx === 0) { banner('Noche ' + g.ante, '', g.ante === 8 ? 'La última noche. El Guardián final te espera.' : g.ante > 8 ? 'Más allá de las estrellas…' : null); AU.sfx.levelup(); }
    setMood();
    render(); save();
  }
  function sellTal(uid) {
    const g = UI.g;
    const p = V.center(uid);
    const r = g.sellTalisman(uid);
    if (!r) return;
    UI.selTal = null;
    V.exit(uid, { mode: 'dissolve' });
    if (p) { FX.coins(p[0], p[1], 10); FX.pop(p[0], p[1], '+$' + r.value, 'money'); }
    AU.sfx.sell(); flashEl('st-money');
    showEvents(r.ev);
    render(); save();
  }
  function sellCons(uid) {
    const g = UI.g;
    const p = V.center(uid);
    const r = g.sellConsumable(uid);
    if (!r) return;
    UI.selCons = null;
    V.exit(uid, { mode: 'dissolve' });
    if (p) { FX.coins(p[0], p[1], 6); FX.pop(p[0], p[1], '+$' + r.value, 'money'); }
    AU.sfx.sell(); flashEl('st-money');
    showEvents(r.ev);
    render(); save();
  }

  /* ======================= consumibles ======================= */
  async function useCons(uid) {
    const g = UI.g;
    if (UI.busy) return;
    const k = g.consumables.find((x) => x.uid === uid); if (!k) return;
    const sel = g.phase === 'pack' ? UI.packSel.slice() : UI.sel.slice();
    if (!g.canUse(k, sel)) { AU.sfx.error(); return; }
    UI.busy = true;
    const p = V.center(uid);
    const res = g.useConsumable(uid, sel);
    UI.selCons = null;
    V.exit(uid, { mode: 'dissolve' });
    if (p) FX.burst(p[0], p[1], { n: 30, colors: k.type === 'con' ? ['#9fd8ff', '#fff'] : k.type === 'aug' ? ['#e6c8ff', '#ffd36e'] : ['#9ff5e6', '#fff'], speed: 6, life: 800, size: 4, shape: 'star' });
    await animateConsResult(res, k);
    UI.busy = false;
    if (res.lost) { gameOver('Te has quedado sin cartas'); return; }
    render(); save();
  }
  async function animateConsResult(res, k) {
    const g = UI.g;
    if (!res) return;
    if (res.levelUp || res.levelUpAll) {
      AU.sfx.levelup();
      const hn = $('hand-name');
      if (res.levelUp) { const h = res.levelUp; hn.innerHTML = `${BR.HANDS[h].name}<small>nv.${g.handLevels[h].lvl}</small>`; const H = BR.HANDS[h], L = g.handLevels[h].lvl; setChipsMult(H.chips + H.lc * (L - 1), H.mult + H.lm * (L - 1)); }
      else hn.innerHTML = 'Todas las manos<small>+1 nivel</small>';
      bumpEl('chips-box'); bumpEl('mult-box');
      const c = FX.center($('handbox'));
      FX.pop(c[0], c[1] - 30, '¡Sube de nivel!', 'msg', { color: '#9fd8ff' });
      FX.burst(c[0], c[1], { n: 30, colors: ['#9fd8ff', '#fff6dc'], speed: 6, life: 900, size: 3, shape: 'star' });
      await wait(1100);
      UI.animScore = false;
    }
    if (res.changed && res.changed.length) {
      AU.sfx.flip();
      for (const c of res.changed) UI.flip.add(c.id);
      // mostrar el reverso con el contenido antiguo: forzamos la firma
      render();
      await wait(260);
      UI.flip.clear();
      render();
      for (const c of res.changed) { const pp = V.center(c.id); if (pp) FX.burst(pp[0], pp[1], { n: 12, colors: ['#ffd36e', '#fff'], speed: 4, life: 600, size: 3, shape: 'star' }); }
      AU.sfx.levelup();
      await wait(350);
    }
    if (res.destroyed && res.destroyed.length) {
      for (const c of res.destroyed) V.exit(c.id, { mode: 'dissolve' });
      AU.sfx.glass();
    }
    if (res.added && res.added.length) AU.sfx.deal();
    if (res.money) moneyPop(res.money);
    if (res.msg) { const c = FX.center($('z-play')); FX.pop(c[0], c[1], res.msg, 'msg', { big: true }); }
    if (res.talisman) { AU.sfx.levelup(); }
    if (res.trump) flashEl('st-trump');
    if (res.ev) showEvents(res.ev);
    render();
    await wait(200);
  }

  /* ======================= sobres ======================= */
  async function pickPack(key) {
    const g = UI.g;
    if (UI.busy || g.phase !== 'pack') return;
    const c = g.pack.choices.find((x) => x && x.key === key); if (!c) return;
    const p = V.center(key);
    UI.busy = true;
    const pr0 = V.rect(key);
    const res = g.pickFromPack(key, UI.packSel.slice());
    if (res.talisman && pr0 && c.kind === 'tal') { UI.spawnFrom[res.talisman.uid] = { x: pr0.left, y: pr0.top }; const s0 = V.sprites.get(key); if (s0) { s0.el.remove(); V.sprites.delete(key); } }
    if (res.err) { UI.busy = false; AU.sfx.error(); S.toast(res.err, 'err'); V.shakeIt(key); return; }
    UI.selShop = null;
    if (c.kind === 'tal' || c.kind === 'card') { AU.sfx.buy(); }
    else { V.exit(key, { mode: 'dissolve' }); if (p) FX.burst(p[0], p[1], { n: 30, colors: ['#e6c8ff', '#9fd8ff', '#fff'], speed: 6, life: 800, size: 4, shape: 'star' }); }
    if (c.kind === 'card') { const dp = deckPos(); V.exit(key, { mode: 'fly', x: dp.x, y: dp.y, down: false, scale: 0.6 }); }
    UI.packSel = [];
    await animateConsResult(res, c);
    if (res.closed) await afterPackClosed();
    ach({ type: 'tick' });
    UI.busy = false;
    render(); save();
  }
  async function skipPack() {
    const g = UI.g;
    if (UI.busy || g.phase !== 'pack') return;
    AU.sfx.button();
    g.skipPack();
    UI.selShop = null; UI.packSel = [];
    hideActions();
    await afterPackClosed();
    render(); save();
  }
  async function afterPackClosed() {
    const g = UI.g;
    UI.packSel = [];
    if (g.phase === 'pack') AU.sfx.pack();
    setMood();
  }

  /* ======================= fin de partida ======================= */
  function recordEnd(won) {
    const g = UI.g;
    Meta.flushGame(g);
    Meta.recordDaily(g);
    if (g.recorded) { Meta.data.stats.bestAnte = Math.max(Meta.data.stats.bestAnte, g.ante); Meta.save(); return []; }
    g.recorded = true;
    return Meta.endRun(g, won);
  }
  function gameOver(reason) {
    const g = UI.g;
    UI.busy = true;
    g.phase = 'over';
    AU.sfx.lose();
    BR.BG.set('over');
    AU.setMood('boss');
    FX.shake(10, 600);
    banner('Derrota', 'red', reason || 'No alcanzaste el objetivo');
    const un = recordEnd(false);
    Meta.clearRun();
    setTimeout(() => { UI.busy = false; S.endScreen(g, false, un, endChoice); }, 1600 / BR.speedMult);
  }
  function endChoice(a) {
    const g = UI.g;
    if (a === 'endless') { S.close(); g.continueEndless(); setMood(); render(); save(); return; }
    if (a === 'new') { S.newRun(startRun); return; }
    UI.g = null; render(); showMenu();
  }

  /* ======================= logros ======================= */
  function ach(ev) {
    ev.g = ev.g || UI.g;
    const got = Meta.checkAch(ev);
    got.forEach((a, i) => setTimeout(() => { S.toast(`🏆 <b>Logro:</b> ${a.name} — <span style="font-weight:500">${a.desc}</span>`, 'unlock'); AU.sfx.levelup(); }, i * 700));
  }

  /* ======================= utilidades ======================= */
  function banner(text, cls, sub) {
    const b = $('banner');
    b.innerHTML = `<span class="bannertext ${cls || ''}">${text}</span>${sub ? `<span class="bannersub">${sub}</span>` : ''}`;
    clearTimeout(b._t); b._t = setTimeout(() => { b.innerHTML = ''; }, 1700 / BR.speedMult);
    b.querySelectorAll('.bannertext,.bannersub').forEach((e) => e.style.animationDuration = (1600 / BR.speedMult) + 'ms');
  }
  function setMood() {
    const g = UI.g;
    if (!g) { BR.BG.set('menu'); AU.setMood('menu'); return; }
    if (g.phase === 'shop') { BR.BG.set('shop'); AU.setMood('shop'); return; }
    const kind = g.phase === 'round' && g.r ? g.r.kind : g.blindKind(Math.min(2, g.blindIdx));
    if (kind === 'boss') { BR.BG.set(null, BR.BG.bossColors(BR.BOSS_BY_ID[g.bossId].color)); AU.setMood(g.phase === 'round' ? 'boss' : 'round'); }
    else { BR.BG.set(kind); AU.setMood('round'); }
  }
  function save() {
    const g = UI.g;
    if (!g) return;
    Meta.flushGame(g);
    if (g.phase === 'over') { Meta.clearRun(); Meta.save(); return; }
    if (['blind', 'round', 'shop', 'cashout', 'pack', 'victory'].includes(g.phase)) Meta.saveRun(g);
    Meta.save();
  }

  /* ======================= arrastrar ======================= */
  V.handlers.dragStart = (key) => {
    const g = UI.g; if (!g || UI.busy) return;
    hideActions();
    if (g.talismans.some((t) => t.uid === key)) UI.drag = { group: 'tal', key, order: g.talismans.map((t) => t.uid) };
    else if (g.phase === 'round' && g.hand.includes(key)) UI.drag = { group: 'hand', key, order: g.hand.slice() };
    else if (g.phase === 'pack' && g.pack && g.pack.hand && g.pack.hand.includes(key)) UI.drag = { group: 'hand', key, order: g.pack.hand.slice() };
  };
  V.handlers.dragMove = (key, x) => {
    if (!UI.drag || UI.drag.key !== key) return;
    const zone = UI.drag.group === 'tal' ? zr('z-tal') : zr('z-hand');
    const n = UI.drag.order.length;
    const pos = UI.drag.group === 'tal' ? rowLayout(zone, n, UI.cw, UI.ch) : handLayout(zone, n);
    let best = 0, bd = Infinity;
    pos.forEach((p, i) => { const d = Math.abs(p.x + UI.cw / 2 - x); if (d < bd) { bd = d; best = i; } });
    const cur = UI.drag.order.indexOf(key);
    if (cur !== best) { UI.drag.order.splice(cur, 1); UI.drag.order.splice(best, 0, key); AU.sfx.tick(); render(); }
  };
  V.handlers.dragEnd = (key) => {
    const g = UI.g; if (!UI.drag) { render(); return; }
    if (UI.drag.group === 'tal') g.reorderTalismans(UI.drag.order);
    else if (g.phase === 'round') g.reorderHand(UI.drag.order);
    else if (g.phase === 'pack') g.pack.hand = UI.drag.order.slice();
    UI.drag = null;
    const s = V.sprites.get(key); if (s) s.tf = null;
    render(); save();
  };
  V.handlers.hover = (key, on, touch) => {
    if (UI.drag) return;
    const s = V.sprites.get(key);
    if (on && s && s.desc && s.desc.tip) {
      UI.hoverKey = key;
      const r = s.el.getBoundingClientRect();
      S.showTip(s.desc.tip(), r, (s.desc.kind === 'tal' || s.desc.kind === 'cons') && r.top < innerHeight * 0.35 ? 'below' : 'above');
      if (!touch && !UI.busy) AU.sfx.hover();
    } else if (!on && UI.hoverKey === key) { S.hideTip(); UI.hoverKey = null; }
  };

  /* ======================= arranque ======================= */
  function startRun(opts) {
    S.onClose = null;
    S.close();
    V.clear();
    const g = BR.Game.create(opts);
    if (opts.daily) { g.daily = opts.daily; Meta.recordDaily(g); Meta.data.daily.tries++; Meta.save(); }
    UI.g = g; BR.game = g;
    V.deckId = g.deckId;
    UI.sel = []; UI.packSel = []; clearSelections();
    $('blindsel')._sig = null;
    setMood();
    render();
    save();
    banner(g.daily ? 'Reto del día' : 'Noche 1', '', g.daily ? BR.DECK_BY_ID[g.deckId].name + ' · semilla ' + g.seed : 'Que empiece la partida');
    AU.sfx.levelup();
    if (!Meta.data.tutorial) { Meta.data.tutorial = true; Meta.save(); setTimeout(() => S.howto(), 600); }
  }
  function continueRun() {
    const data = Meta.loadRun();
    if (!data) { showMenu(); return; }
    let g;
    try { g = BR.Game.load(data); } catch (e) { console.error(e); Meta.clearRun(); showMenu(); return; }
    S.onClose = null; S.close(); V.clear();
    UI.g = g; BR.game = g; V.deckId = g.deckId;
    UI.sel = []; UI.packSel = []; clearSelections();
    $('blindsel')._sig = null;
    if (g.phase === 'over') { Meta.clearRun(); showMenu(); return; }
    setMood();
    render();
    if (g.phase === 'cashout') buildCashout();
    if (g.phase === 'victory') S.endScreen(g, true, [], endChoice);
  }
  function showMenu() {
    UI.g = null; BR.game = null;
    V.clear();
    $('app').className = 'phase-menu';
    setMood();
    S.mainMenu(!!Meta.loadRun(), (a) => {
      if (a === 'continue') continueRun();
      else if (a === 'daily') {
        const d = Meta.dailyInfo();
        const go = () => startRun({ deckId: d.deckId, stake: 0, seed: d.seed, daily: d.key });
        if (Meta.loadRun()) S.confirm('¿Reto del día?', 'Perderás la partida guardada.', 'Jugar el reto', (y) => (y ? go() : showMenu())); else go();
      }
      else if (a === 'new') { if (Meta.loadRun()) S.confirm('¿Nueva partida?', 'Perderás la partida guardada.', 'Empezar de nuevo', (y) => (y ? S.newRun(startRun) : showMenu())); else S.newRun(startRun); S.onClose = () => { if (!UI.g) showMenu(); }; }
      else if (a === 'grim') { S.grimoire(); S.onClose = () => showMenu(); }
      else if (a === 'how') { S.howto(() => showMenu()); }
      else if (a === 'opts') { openOptions(false); S.onClose = () => showMenu(); }
    });
  }
  function openOptions(inRun) {
    S.options(inRun, (a) => {
      if (a === 'apply') { applySettings(); return; }
      if (a === 'how') { S.howto(); return; }
      if (a === 'abandon') {
        S.confirm('¿Abandonar?', 'La partida actual se perderá y contará como derrota.', 'Abandonar', (y) => {
          if (!y) { openOptions(true); return; }
          S.onClose = null; S.close();
          if (UI.g) { recordEnd(false); Meta.clearRun(); }
          showMenu();
        });
      }
      if (a === 'menu') { S.onClose = null; S.close(); save(); showMenu(); }
      if (a === 'reset') {
        S.confirm('¿Borrar todo?', 'Se perderán tus barajas, estadísticas y descubrimientos.', 'Borrar', (y) => { if (y) { Meta.reset(); applySettings(); S.toast('Progreso borrado'); } S.onClose = null; showMenu(); });
      }
    });
  }

  function bind() {
    $('btn-play').onclick = () => { AU.sfx.button(); playHand(); };
    $('btn-discard').onclick = () => { AU.sfx.button(); discard(); };
    $('btn-sort-rank').onclick = () => sortHand('rank');
    $('btn-sort-suit').onclick = () => sortHand('suit');
    $('btn-next').onclick = nextBlind;
    $('btn-reroll').onclick = reroll;
    $('btn-skippack').onclick = skipPack;
    $('btn-info').onclick = () => { if (UI.g) { AU.sfx.button(); S.runInfo(UI.g); } };
    $('btn-options').onclick = () => { AU.sfx.button(); openOptions(!!UI.g); };
    $('btn-menu-m').onclick = () => {
      AU.sfx.button();
      const o = S.open(`<div class="modal" style="width:min(320px,100%);text-align:center"><button class="close">×</button><h2 style="font-size:22px">Menú</h2><div class="menubtns" style="margin:10px auto 0"><button class="btn blue" data-a="info">Info partida</button><button class="btn ghost" data-a="opt">Opciones</button></div></div>`, { closable: true });
      o.querySelector('[data-a=info]').onclick = () => S.runInfo(UI.g);
      o.querySelector('[data-a=opt]').onclick = () => openOptions(true);
    };
    $('trumpbox').setAttribute('data-tip', 'boss:x');
    $('trumpbox').removeAttribute('data-tip');
    $('trumpbox').onpointerenter = () => {
      const g = UI.g; if (!g) return;
      S.showTip(`<div class="tt-title">Palo de Triunfo</div><div class="tt-body">${BR.rich(`Las cartas de este palo dan {m+${g.flags.trumpMult || 1}} Mult al puntuar. Caballo + Rey del Triunfo: {kLas Cuarenta} ({c+${40 * (g.flags.canteMult || 1)}} Fichas)`)}</div>`, $('trumpbox').getBoundingClientRect(), 'below');
    };
    $('trumpbox').onpointerleave = () => S.hideTip();
    const mbox = $('st-money').parentElement;
    mbox.onpointerenter = () => {
      const g = UI.g; if (!g) return;
      const it = g.flags.noInterest ? 'Esta baraja no genera intereses.' : `Al cobrar ganas {$$1} de interés por cada {$$5} que tengas (máximo {$$${g.interestCap()}}).`;
      S.showTip(`<div class="tt-title">Dinero</div><div class="tt-body">${BR.rich(it)}</div>${g.debtLimit() ? `<div class="tt-extra">Puedes endeudarte hasta -$${g.debtLimit()}</div>` : ''}`, mbox.getBoundingClientRect(), 'below');
    };
    mbox.onpointerleave = () => S.hideTip();
    document.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') UI.touch = true; else if (e.pointerType === 'mouse') UI.touch = false;
      AU.init();
      if (!e.target.closest('.sp') && !e.target.closest('#actionmenu') && (UI.selTal || UI.selCons || UI.selShop)) { clearSelections(); render(); }
    }, true);
    addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'Escape') { if (S.isOpen() && UI.g) { S.close(); } else if (UI.g) openOptions(true); return; }
      if (S.isOpen() || !UI.g) return;
      const k = e.key.toLowerCase();
      if (k === 'enter' || k === ' ') { e.preventDefault(); if (UI.g.phase === 'round') { AU.sfx.button(); playHand(); } }
      else if (k === 'x' || k === 'd') { if (UI.g.phase === 'round') { AU.sfx.button(); discard(); } }
      else if (k === 'r') sortHand('rank');
      else if (k === 'p' || k === 's') sortHand('suit');
    });
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { computeSize(); render(); }, 80); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  }
  function sortHand(mode) {
    const g = UI.g;
    if (!g || UI.busy) return;
    if (g.phase === 'round') { g.sortHand(mode); AU.sfx.shuffle(); render(); save(); }
    else if (g.phase === 'pack' && g.pack && g.pack.hand) { const sv = g.hand; g.hand = g.pack.hand; g.sortHand(mode); g.pack.hand = g.hand; g.hand = sv; AU.sfx.shuffle(); render(); }
  }

  function boot() {
    BR.injectArtDefs();
    Meta.load();
    BR.BG.init($('bg'));
    FX.init($('fx'));
    V.init($('stage'));
    applySettings();
    computeSize();
    bind();
    showMenu();
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.__BRISKA_SINGLE__) navigator.serviceWorker.register('sw.js').catch(() => {});
    // las fuentes cambian medidas
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { computeSize(); render(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(globalThis.BR = globalThis.BR || {});
