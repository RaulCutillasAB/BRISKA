/* BRISKA — textos enriquecidos, tooltips y pantallas (menús y modales) */
(function (BR) {
  'use strict';
  const S = {};

  /* ---------------- texto enriquecido ---------------- */
  BR.rich = function (txt) {
    if (!txt) return '';
    return txt.replace(/\{([cmxkp$s])([^}]*)\}/g, (m, t, v) => {
      if (t === 'c') return `<span class="k-c">${v}</span>`;
      if (t === 'm') return `<span class="k-m">${v}</span>`;
      if (t === 'x') return `<span class="k-x">${v}</span>`;
      if (t === '$') return `<span class="k-d">${v}</span>`;
      if (t === 'p') return `<span class="k-p">${v}</span>`;
      if (t === 's') {
        const id = v.toLowerCase(); const si = BR.SUIT_INFO[id];
        return si ? `<span class="k-s" style="color:${si.color}">${si.name}</span>` : v;
      }
      return `<span class="k-k">${v}</span>`;
    });
  };
  const cardName = (c) => (c.enh === 'piedra' ? 'Carta de Granito' : `${BR.RANK_INFO[c.rank].name} de ${BR.SUIT_INFO[c.suit].name}`);
  BR.cardName = cardName;

  /* ---------------- tooltips ---------------- */
  S.tipHTML = function (kind, o, g, extra) {
    let title = '', tags = [], body = [], ext = extra ? [extra] : [];
    const tag = (t, c) => tags.push(`<span class="tt-tag" style="--tc:${c}">${t}</span>`);
    if (kind === 'card') {
      title = cardName(o);
      const R = BR.RANK_INFO[o.rank];
      if (o.enh !== 'piedra') body.push(`{c+${R.chips + (o.bonus || 0)}} Fichas`);
      if (o.enh) { tag(BR.ENH[o.enh].name, '#6a4ab0'); body.push(BR.ENH[o.enh].desc); }
      if (o.seal) { tag(BR.SEALS[o.seal].name, BR.SEALS[o.seal].color); body.push(BR.SEALS[o.seal].desc); }
      if (o.ed) { tag(BR.EDITIONS[o.ed].name, '#2a8ab0'); body.push(BR.EDITIONS[o.ed].desc); }
      if (g && g.r && g.r.trump && o.enh !== 'piedra' && g.suitIs(o, g.r.trump)) ext.push('Palo de Triunfo: +' + (g.flags.trumpMult || 1) + ' Mult al puntuar');
      if (o._debuffed || (g && g.isDebuffed && g.phase === 'round' && g.isDebuffed(o))) ext.push('⚠ Debilitada: no puntúa');
      body = [body.join('<br>')];
    } else if (kind === 'tal') {
      const d = BR.TAL_BY_ID[o.id];
      if (!o.st) o = { ...o, st: d.init ? d.init() : {} };
      title = d.name;
      tag(BR.RARITY[d.rarity].name, BR.RARITY[d.rarity].color);
      if (o.ed) tag(BR.EDITIONS[o.ed].name, '#2a8ab0');
      body.push(d.text(o, g));
      if (d.copy && g) {
        const e = BR.effDef(g, o);
        ext.push(e ? 'Copiando: ' + e.def.name : 'Nada que copiar');
      }
      if (o.ed) body.push(BR.EDITIONS[o.ed].desc);
      if (g && o.uid && g.talismans.includes(o)) ext.push('Valor de venta: $' + g.sellValue(o));
    } else if (kind === 'cons') {
      const d = BR.consDef(o);
      title = d.name;
      tag(o.type === 'aug' ? 'Augurio' : o.type === 'con' ? 'Constelación' : 'Ánima', o.type === 'aug' ? '#8a4ad0' : o.type === 'con' ? '#2a5ab0' : '#1a8a80');
      body.push(d.text(g));
    } else if (kind === 'pack') {
      const K = BR.PACK_KINDS[o.pack], Z = BR.PACK_SIZES[o.size];
      let n = Z.n; if (o.pack === 'tal' || o.pack === 'ani') n = o.size === 'normal' ? 2 : 4;
      title = (Z.name ? Z.name + ' ' : '') + K.name;
      tag('Sobre', K.color);
      body.push(K.desc.replace('{pick}', Z.pick).replace('{n}', n));
    } else if (kind === 'voucher') {
      const d = BR.VOUCHER_BY_ID[o.id];
      title = d.name; tag('Privilegio', '#b8861a'); body.push(d.desc);
    } else if (kind === 'tagi') {
      const d = BR.TAG_BY_ID[o]; title = d.name; tag('Insignia', '#6a4ab0'); body.push(d.desc);
    } else if (kind === 'boss') {
      const d = BR.BOSS_BY_ID[o]; title = d.name; tag(d.final ? 'Guardián final' : 'Guardián', d.color); body.push(d.desc);
    } else if (kind === 'deckinfo') {
      title = BR.DECK_BY_ID[o].name; body.push(BR.DECK_BY_ID[o].desc);
    }
    return `<div class="tt-title">${title}</div>${tags.length ? `<div class="tt-tags">${tags.join('')}</div>` : '<div style="height:6px"></div>'}${body.filter(Boolean).map((b) => `<div class="tt-body">${BR.rich(b)}</div>`).join('')}${ext.map((x) => `<div class="tt-extra">${BR.rich(x)}</div>`).join('')}`;
  };
  const tipEl = () => document.getElementById('tooltip');
  S.showTip = function (html, rect, prefer) {
    const t = tipEl(); t.innerHTML = html; t.classList.add('show');
    const tw = t.offsetWidth, th = t.offsetHeight;
    let x = rect.left + rect.width / 2 - tw / 2, y;
    if (prefer === 'below' || rect.top - th - 12 < 4) y = rect.bottom + 10; else y = rect.top - th - 12;
    if (y + th > innerHeight - 4) y = Math.max(4, rect.top - th - 12);
    x = BR.clamp(x, 6, innerWidth - tw - 6);
    t.style.left = x + 'px'; t.style.top = y + 'px';
  };
  S.hideTip = function () { tipEl().classList.remove('show'); };
  // tooltips para elementos DOM con data-tip
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (!el) return;
    const [kind, id] = el.dataset.tip.split(':');
    let o = id;
    if (kind === 'tal') o = { id };
    if (kind === 'cons') o = { type: el.dataset.ct, id };
    if (kind === 'voucher') o = { id };
    if (kind === 'card') o = JSON.parse(el.dataset.card);
    S.showTip(S.tipHTML(kind, o, kind === 'cons' || kind === 'tal' ? null : BR.game), el.getBoundingClientRect());
  });
  document.addEventListener('pointerout', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) S.hideTip(); });

  /* ---------------- overlay ---------------- */
  const ov = () => document.getElementById('overlay');
  S.open = function (html, opts = {}) {
    const o = ov();
    o.className = 'show' + (opts.cls ? ' ' + opts.cls : '');
    o.innerHTML = html;
    S.hideTip();
    if (opts.closable) {
      o.onclick = (e) => { if (e.target === o) S.close(); };
    } else o.onclick = null;
    const c = o.querySelector('.close'); if (c) c.onclick = () => { BR.Audio.sfx.button(); S.close(); };
    return o;
  };
  S.close = function () { const o = ov(); o.className = ''; o.innerHTML = ''; S.hideTip(); if (S.onClose) { const f = S.onClose; S.onClose = null; f(); } };
  S.isOpen = () => ov().classList.contains('show');
  S.toast = function (msg, cls) {
    const t = document.createElement('div'); t.className = 'toast ' + (cls || ''); t.innerHTML = msg;
    document.getElementById('toasts').appendChild(t);
    setTimeout(() => t.remove(), 3300);
  };

  /* ---------------- menú principal ---------------- */
  S.mainMenu = function (hasSave, cb) {
    const deco = [
      { suit: 'oros', rank: 1 }, { suit: 'copas', rank: 12 }, { suit: 'espadas', rank: 11 }, { suit: 'bastos', rank: 10 }, { suit: 'copas', rank: 3 },
    ].map((c, i) => `<div class="mc" style="transform:translateX(${(i - 2) * 72 - 45}px) rotate(${(i - 2) * 9}deg) translateY(${Math.abs(i - 2) * 12}px);animation-delay:${-i * 1.1}s">${BR.Art.cardSVG(c)}</div>`).join('');
    const o = S.open(`<div class="mainmenu">
      <div class="logo">BRISKA</div>
      <div class="tagline">naipes bajo las estrellas</div>
      <div class="menucards">${deco}</div>
      <div class="menubtns">
        ${hasSave ? '<button class="btn play big" data-a="continue">Continuar partida</button>' : ''}
        <button class="btn ${hasSave ? 'blue' : 'play big'}" data-a="new">Nueva partida</button>
        <button class="btn gold daily" data-a="daily">Reto del día <span class="dsub">${(() => { const d = BR.Meta.dailyInfo(); return BR.DECK_BY_ID[d.deckId].name + (d.best ? ' · récord: Noche ' + d.best.ante : ''); })()}</span></button>
        <button class="btn ghost" data-a="grim">Grimorio</button>
        <button class="btn ghost" data-a="how">Cómo se juega</button>
        <button class="btn ghost" data-a="opts">Opciones</button>
      </div>
    </div><div class="foot">Briska · arte, música y reglas originales · v1.0</div>`, { cls: 'menu' });
    o.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => { BR.Audio.init(); BR.Audio.sfx.button(); cb(b.dataset.a); });
  };

  /* ---------------- nueva partida ---------------- */
  S.newRun = function (cb) {
    const M = BR.Meta.data;
    let di = Math.max(0, BR.DECKS.findIndex((d) => d.id === M.lastDeck));
    let stake = Math.min(M.lastStake || 0, M.stakeUnlocked);
    const o = S.open(`<div class="modal"><button class="close">×</button>
      <h2>Nueva partida</h2><div class="subtitle">Elige tu baraja y la vela que alumbrará la noche</div>
      <div class="deckpick"><button class="btn ghost arrow" data-d="-1">‹</button><div class="deckshow" id="deckshow"></div><button class="btn ghost arrow" data-d="1">›</button></div>
      <div class="stakes" id="stakes"></div><div class="stakedesc" id="stakedesc"></div>
      <div class="seedrow">Semilla (opcional): <input id="seed" maxlength="10" placeholder="aleatoria"></div>
      <div class="row"><button class="btn play big" id="go">¡A jugar!</button></div></div>`, { closable: true });
    const draw = () => {
      const D = BR.DECKS[di];
      const locked = !M.decks.includes(D.id);
      const won = M.deckWins[D.id];
      o.querySelector('#deckshow').innerHTML = `<div class="dcard ${locked ? 'locked' : ''}">${BR.Art.backSVG(D.id)}${locked ? '<div class="lock">🔒</div>' : ''}</div>
        <div class="dinfo"><h3>${D.name}</h3><div class="ddesc">${BR.rich(D.desc)}</div>
        ${locked ? `<div class="dlock">🔒 ${D.unlock.text}</div>` : ''}
        ${won != null ? `<div class="dwin">Ganada en: <b style="color:${BR.STAKES[won].color}">${BR.STAKES[won].name}</b></div>` : ''}</div>`;
      o.querySelector('#stakes').innerHTML = BR.STAKES.map((s, i) => `<div class="stake ${i === stake ? 'on' : ''} ${i > M.stakeUnlocked ? 'locked' : ''}" data-s="${i}" title="${s.name}"><div class="candle" style="--cc:${s.color}"></div></div>`).join('');
      const st = BR.STAKES[stake];
      o.querySelector('#stakedesc').innerHTML = `<b>${st.name}</b> · ${BR.rich(st.desc)}${stake > 0 ? ' <span style="color:var(--muted)">(+ las anteriores)</span>' : ''}`;
      o.querySelectorAll('.stake').forEach((el) => el.onclick = () => { const s = +el.dataset.s; if (s <= M.stakeUnlocked) { stake = s; BR.Audio.sfx.select(); draw(); } else { BR.Audio.sfx.error(); S.toast('Gana una partida en ' + BR.STAKES[s - 1].name + ' para desbloquearla', 'err'); } });
      o.querySelector('#go').disabled = locked;
    };
    o.querySelectorAll('[data-d]').forEach((b) => b.onclick = () => { di = (di + +b.dataset.d + BR.DECKS.length) % BR.DECKS.length; BR.Audio.sfx.flip(); draw(); });
    o.querySelector('#go').onclick = () => {
      const D = BR.DECKS[di]; if (!M.decks.includes(D.id)) return;
      M.lastDeck = D.id; M.lastStake = stake; BR.Meta.save();
      const seed = o.querySelector('#seed').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      BR.Audio.sfx.button(); cb({ deckId: D.id, stake, seed: seed || null });
    };
    draw();
  };

  /* ---------------- grimorio ---------------- */
  S.grimoire = function () {
    const tabs = [['tal', 'Talismanes'], ['aug', 'Augurios'], ['con', 'Constelaciones'], ['ani', 'Ánimas'], ['vou', 'Privilegios'], ['boss', 'Guardianes'], ['ach', 'Logros'], ['stats', 'Estadísticas']];
    let cur = 'tal';
    const o = S.open(`<div class="modal" style="width:min(860px,100%)"><button class="close">×</button><h2>Grimorio</h2>
      <div class="subtitle">Todo lo que has descubierto bajo las estrellas</div>
      <div class="tabs" id="gtabs"></div><div id="gbody"></div></div>`, { closable: true });
    const M = BR.Meta;
    const draw = () => {
      o.querySelector('#gtabs').innerHTML = tabs.map(([k, n]) => `<div class="tab ${k === cur ? 'on' : ''}" data-t="${k}">${n}</div>`).join('');
      o.querySelectorAll('.tab').forEach((t) => t.onclick = () => { cur = t.dataset.t; BR.Audio.sfx.select(); draw(); });
      let html = '';
      const grid = (items, total) => `<div class="grimcount">${items.filter((i) => i.known).length} / ${total} descubiertos</div><div class="cgrid">${items.map((i) => i.known ? i.html : '<div class="ci unk">?</div>').join('')}</div>`;
      if (cur === 'tal') {
        const items = BR.TALISMANS.map((t) => ({ known: M.isDisc('tal', t.id), html: `<div class="ci" data-tip="tal:${t.id}"><div class="face front">${BR.Art.talismanHTML({ id: t.id })}</div></div>` }));
        html = grid(items, BR.TALISMANS.length);
      } else if (cur === 'aug' || cur === 'con' || cur === 'ani') {
        const list = cur === 'aug' ? BR.AUGURIOS : cur === 'con' ? BR.CONSTS : BR.ANIMAS;
        const items = list.map((c) => ({ known: M.isDisc(cur, c.id), html: `<div class="ci" data-tip="cons:${c.id}" data-ct="${cur}"><div class="face front">${BR.Art.consHTML({ type: cur, id: c.id })}</div></div>` }));
        html = grid(items, list.length);
      } else if (cur === 'vou') {
        const items = BR.VOUCHERS.map((v) => ({ known: M.isDisc('vou', v.id), html: `<div class="ci" data-tip="voucher:${v.id}"><div class="face front" style="box-shadow:none">${BR.Art.voucherHTML({ id: v.id })}</div></div>` }));
        html = grid(items, BR.VOUCHERS.length);
      } else if (cur === 'boss') {
        const items = BR.BOSSES.map((b) => ({ known: M.isDisc('boss', b.id), html: `<div class="ci" data-tip="boss:${b.id}" style="display:grid;place-items:center;background:rgba(0,0,0,.3);border-radius:10px">${BR.Art.bossMedal(b.id, 58)}<div style="font-size:11px;text-align:center;font-weight:700;margin-top:-18px">${b.name}</div></div>` }));
        html = grid(items, BR.BOSSES.length);
      } else if (cur === 'ach') {
        const A = M.data.ach || {};
        const n = M.ACH.filter((a) => A[a.id]).length;
        html = `<div class="grimcount">${n} / ${M.ACH.length} logros</div><div class="achgrid">${M.ACH.map((a) => `<div class="achi ${A[a.id] ? 'on' : ''}"><div class="achic">${BR.icon(a.icon)}</div><div><b>${a.name}</b><div>${a.desc}</div></div></div>`).join('')}</div>`;
      } else {
        const st = M.data.stats;
        const fav = Object.entries(st.playedTypes).sort((a, b) => b[1] - a[1])[0];
        html = `<div class="statgrid">
          <div class="s"><div class="v">${st.runs}</div><div class="l">Partidas</div></div>
          <div class="s"><div class="v">${st.wins}</div><div class="l">Victorias</div></div>
          <div class="s"><div class="v">${BR.fmt(st.bestHand)}</div><div class="l">Mejor mano</div></div>
          <div class="s"><div class="v">${st.bestAnte}</div><div class="l">Noche más lejana</div></div>
          <div class="s"><div class="v">${BR.fmt(st.hands)}</div><div class="l">Manos jugadas</div></div>
          <div class="s"><div class="v">${fav ? BR.HANDS[fav[0]].name : '—'}</div><div class="l">Mano favorita</div></div>
          <div class="s"><div class="v">${st.cuarenta}</div><div class="l">Las Cuarenta cantadas</div></div>
          <div class="s"><div class="v">${st.bossesBeaten}</div><div class="l">Guardianes vencidos</div></div>
          <div class="s"><div class="v">${M.data.decks.length}/${BR.DECKS.length}</div><div class="l">Barajas</div></div>
        </div>`;
      }
      o.querySelector('#gbody').innerHTML = html;
    };
    draw();
  };

  /* ---------------- opciones ---------------- */
  S.options = function (inRun, cb) {
    const st = BR.Meta.data.settings;
    const o = S.open(`<div class="modal" style="width:min(520px,100%)"><button class="close">×</button><h2>Opciones</h2>
      <div class="optrow"><label>Velocidad del juego</label><div class="seg" id="o-speed">${[1, 2, 3, 4].map((v) => `<button data-v="${v}" class="${st.speed === v ? 'on' : ''}">${v}×</button>`).join('')}</div></div>
      <div class="optrow"><label>Efectos de sonido</label><input type="range" id="o-sfx" min="0" max="1" step="0.05" value="${st.sfx}"></div>
      <div class="optrow"><label>Música</label><input type="range" id="o-mus" min="0" max="1" step="0.05" value="${st.music}"></div>
      <div class="optrow"><label>Fondo animado</label><div class="seg" id="o-bg">${[['high', 'Alto'], ['low', 'Bajo'], ['off', 'No']].map(([v, n]) => `<button data-v="${v}" class="${st.bg === v ? 'on' : ''}">${n}</button>`).join('')}</div></div>
      <div class="optrow"><label>Temblor de pantalla</label><div class="seg" id="o-shake"><button data-v="1" class="${st.shake ? 'on' : ''}">Sí</button><button data-v="0" class="${!st.shake ? 'on' : ''}">No</button></div></div>
      <div class="optrow"><label>Partículas</label><div class="seg" id="o-part"><button data-v="1" class="${st.particles ? 'on' : ''}">Sí</button><button data-v="0" class="${!st.particles ? 'on' : ''}">No</button></div></div>
      <div class="row">
        ${inRun ? '<button class="btn ghost" data-a="how">Cómo se juega</button><button class="btn red" data-a="abandon">Abandonar partida</button><button class="btn ghost" data-a="menu">Menú principal</button>' : '<button class="btn red small" data-a="reset">Borrar todo el progreso</button>'}
      </div></div>`, { closable: true });
    const seg = (id, f) => o.querySelectorAll('#' + id + ' button').forEach((b) => b.onclick = () => { o.querySelectorAll('#' + id + ' button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); f(b.dataset.v); BR.Meta.save(); cb('apply'); BR.Audio.sfx.select(); });
    seg('o-speed', (v) => st.speed = +v);
    seg('o-bg', (v) => st.bg = v);
    seg('o-shake', (v) => st.shake = v === '1');
    seg('o-part', (v) => st.particles = v === '1');
    o.querySelector('#o-sfx').oninput = (e) => { st.sfx = +e.target.value; cb('apply'); };
    o.querySelector('#o-sfx').onchange = () => { BR.Meta.save(); BR.Audio.sfx.coinTick(); };
    o.querySelector('#o-mus').oninput = (e) => { st.music = +e.target.value; cb('apply'); };
    o.querySelector('#o-mus').onchange = () => BR.Meta.save();
    o.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => { BR.Audio.sfx.button(); cb(b.dataset.a); });
  };

  S.confirm = function (title, text, yes, cb) {
    const o = S.open(`<div class="modal" style="width:min(420px,100%);text-align:center"><h2 style="font-size:24px">${title}</h2><p style="color:var(--muted)">${text}</p>
      <div class="row"><button class="btn ghost" data-a="no">Cancelar</button><button class="btn red" data-a="yes">${yes}</button></div></div>`, { closable: true });
    o.querySelector('[data-a=no]').onclick = () => { BR.Audio.sfx.button(); cb(false); };
    o.querySelector('[data-a=yes]').onclick = () => { BR.Audio.sfx.button(); cb(true); };
  };

  /* ---------------- información de la partida ---------------- */
  S.runInfo = function (g) {
    const rows = BR.HAND_ORDER.filter((h) => !BR.HANDS[h].secret || g.handLevels[h].played > 0).map((h) => {
      const H = BR.HANDS[h], L = g.handLevels[h];
      return `<tr><td class="lv">nv.${L.lvl}</td><td><b>${H.name}</b><div style="font-size:11px;color:var(--muted)">${BR.HAND_DESC[h]}</div></td><td><span class="hc">${H.chips + H.lc * (L.lvl - 1)}</span> × <span class="hm">${H.mult + H.lm * (L.lvl - 1)}</span></td><td class="hp">${L.played}×</td></tr>`;
    }).join('');
    const counts = {};
    for (const c of g.deck) { if (c.enh === 'piedra') continue; counts[c.suit + c.rank] = (counts[c.suit + c.rank] || 0) + 1; }
    const stones = g.deck.filter((c) => c.enh === 'piedra').length;
    let dl = '<div class="h"></div>' + BR.RANKS.map((r) => `<div class="h">${BR.RANK_INFO[r].short}</div>`).join('');
    for (const s of BR.SUITS) { dl += `<div class="h">${BR.Art.suitIcon(s, 16)}</div>` + BR.RANKS.map((r) => { const n = counts[s + r] || 0; return `<div class="n ${n ? '' : 'z'}">${n}</div>`; }).join(''); }
    const vouch = g.vouchers.map((v) => `<span class="tt-tag" style="--tc:#b8861a;cursor:help" data-tip="voucher:${v}">${BR.VOUCHER_BY_ID[v].name}</span>`).join(' ') || '<span style="color:var(--muted)">Ninguno todavía</span>';
    const tags = g.tags.map((t) => `<span class="tt-tag" style="--tc:#6a4ab0;cursor:help" data-tip="tagi:${t}">${BR.TAG_BY_ID[t].name}</span>`).join(' ') || '<span style="color:var(--muted)">Ninguna</span>';
    S.open(`<div class="modal" style="width:min(760px,100%)"><button class="close">×</button><h2>La partida</h2>
      <div class="subtitle">${BR.DECK_BY_ID[g.deckId].name} · ${BR.STAKES[g.stake].name} · Semilla <b style="color:var(--gold2);font-style:normal;letter-spacing:.1em">${g.seed}</b></div>
      <table class="handtable">${rows}</table>
      <h3 style="font-family:Cinzel;color:var(--gold2);margin:16px 0 8px">Tu baraja (${g.deck.length} naipes${stones ? ', ' + stones + ' de granito' : ''})</h3>
      <div class="decklist">${dl}</div>
      <h3 style="font-family:Cinzel;color:var(--gold2);margin:16px 0 8px">Privilegios</h3><div>${vouch}</div>
      <h3 style="font-family:Cinzel;color:var(--gold2);margin:16px 0 8px">Insignias pendientes</h3><div>${tags}</div>
    </div>`, { closable: true });
  };

  /* ---------------- cómo se juega ---------------- */
  const HOW = [
    ['La noche te desafía', `<p>Cada <b>Noche</b> tiene tres envites: el <b>Envite Menor</b>, el <b>Envite Mayor</b> y un <b>Guardián</b> con una regla maldita.</p><p>Para superar un envite debes alcanzar su <b>puntuación objetivo</b> antes de quedarte sin <b>Manos</b>. Vence a los 8 Guardianes y habrás ganado la partida.</p><p>Puedes <b>saltarte</b> el Envite Menor o el Mayor: no ganarás dinero, pero recibirás una <b>Insignia</b> con un premio.</p>`],
    ['Puntuar', `<p>Selecciona hasta <b>5 cartas</b> y juega una mano: Pareja, Trío, Escalera, Color, Full, Póker…</p><p>La puntuación es <span class="k-c">Fichas</span> × <span class="k-m">Mult</span>. Cada carta que puntúa suma sus fichas: <b>As 11, Tres 10, Rey 10, Caballo 9, Sota 8</b> y el resto su valor.</p><p>Usa los <b>Descartes</b> para cambiar cartas que no te sirvan.</p>`],
    ['La baraja española', `<p>Juegas con <b>40 naipes</b>: Oros, Copas, Espadas y Bastos, del As al Siete más Sota, Caballo y Rey.</p><p>Las <b>Escaleras</b> siguen el orden A·2·3·4·5·6·7·Sota·Caballo·Rey·A. El As puede ir al principio o al final.</p><p>Fíjate en los cortes del marco: igual que en los naipes tradicionales, indican el palo.</p>`],
    ['Triunfo y Cantes', `<p>Cada ronda se muestra un <b>palo de Triunfo</b>. Sus cartas dan <span class="k-m">+1 Mult</span> extra al puntuar.</p><p>Si juegas el <b>Caballo y el Rey</b> del mismo palo, <b>cantas Las Veinte</b>: <span class="k-c">+20 Fichas</span>. Si es en el palo de Triunfo… <b>¡Las Cuarenta!</b> <span class="k-c">+40 Fichas</span>.</p><p>Muchos talismanes se alimentan del Triunfo y de los cantes.</p>`],
    ['La Feria', `<p>Tras cada envite visitas <b>La Feria</b>. Allí encontrarás:</p><p>• <b>Talismanes</b>: efectos permanentes. ¡Su orden importa! Arrástralos para reordenarlos.<br>• <b>Augurios</b>: transforman tus cartas.<br>• <b>Constelaciones</b>: suben de nivel un tipo de mano.<br>• <b>Sobres</b> y <b>Privilegios</b>.</p><p>Ahorra: ganas <span class="k-d">$1</span> de interés por cada <span class="k-d">$5</span> (máx. $5).</p>`],
    ['Consejos', `<p>Busca una estrategia: una mano favorita, un palo, figuras… y elige talismanes que se potencien entre sí.</p><p>Los efectos <span class="k-x">×Mult</span> son los más poderosos: colócalos a la <b>derecha</b> para que multipliquen todo lo anterior.</p><p><b>Atajos</b>: <b>Enter</b> jugar · <b>X</b> descartar · <b>R</b>/<b>P</b> ordenar por valor/palo · <b>Esc</b> opciones.</p>`],
  ];
  S.howto = function (done) {
    let p = 0;
    const o = S.open(`<div class="modal" style="width:min(560px,100%)"><button class="close">×</button><h2 id="h-t"></h2><div class="howto" id="h-b"></div>
      <div class="pager"><button class="btn ghost small" id="h-prev">Anterior</button><div class="dots" id="h-d"></div><button class="btn play small" id="h-next">Siguiente</button></div></div>`, { closable: true });
    S.onClose = done || null;
    const draw = () => {
      o.querySelector('#h-t').textContent = HOW[p][0];
      o.querySelector('#h-b').innerHTML = HOW[p][1];
      o.querySelector('#h-d').innerHTML = HOW.map((_, i) => `<i class="${i === p ? 'on' : ''}"></i>`).join('');
      o.querySelector('#h-prev').style.visibility = p ? 'visible' : 'hidden';
      o.querySelector('#h-next').textContent = p === HOW.length - 1 ? '¡Entendido!' : 'Siguiente';
    };
    o.querySelector('#h-prev').onclick = () => { p = Math.max(0, p - 1); BR.Audio.sfx.flip(); draw(); };
    o.querySelector('#h-next').onclick = () => { if (p === HOW.length - 1) { BR.Audio.sfx.button(); S.close(); return; } p++; BR.Audio.sfx.flip(); draw(); };
    draw();
  };

  /* ---------------- fin de partida ---------------- */
  S.endScreen = function (g, won, unlocks, cb) {
    const fav = Object.entries(g.handLevels).sort((a, b) => b[1].played - a[1].played)[0];
    const o = S.open(`<div class="modal" style="width:min(600px,100%);text-align:center">
      <h2 style="${won ? '' : 'color:#ffb0b8'}">${won ? '¡Has vencido a la Noche!' : 'La noche te ha vencido'}</h2>
      <div class="subtitle">${won ? 'Las estrellas cantan tu nombre. ¿Te atreves a seguir jugando?' : 'Las cartas se barajan de nuevo. La próxima noche será tuya.'}</div>
      <div class="statgrid">
        <div class="s"><div class="v">${BR.fmt(g.counts.best)}</div><div class="l">Mejor mano</div></div>
        <div class="s"><div class="v">${g.ante}</div><div class="l">Noche</div></div>
        <div class="s"><div class="v">${fav && fav[1].played ? BR.HANDS[fav[0]].name : '—'}</div><div class="l">Mano más jugada</div></div>
        <div class="s"><div class="v">${g.counts.hands}</div><div class="l">Manos jugadas</div></div>
        <div class="s"><div class="v">${g.counts.cuarenta}</div><div class="l">Las Cuarenta</div></div>
        <div class="s"><div class="v" style="letter-spacing:.1em">${g.seed}</div><div class="l">Semilla</div></div>
      </div>
      ${unlocks && unlocks.length ? `<div style="margin-top:14px;color:var(--gold2);font-weight:700">${unlocks.map((u) => '✦ ' + u.text).join('<br>')}</div>` : ''}
      <div class="row">${won ? '<button class="btn gold" data-a="endless">Seguir jugando (infinito)</button>' : ''}<button class="btn play" data-a="new">Nueva partida</button><button class="btn ghost" data-a="menu">Menú</button></div></div>`);
    o.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => { BR.Audio.sfx.button(); cb(b.dataset.a); });
  };

  BR.Screens = S;
})(globalThis.BR = globalThis.BR || {});
