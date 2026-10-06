/* LAZO — pantallas y menús (DOM) */
(function (L) {
  'use strict';
  const U = {};
  const $ = (id) => document.getElementById(id);
  const scr = () => $('screen');
  const snd = (k) => L.A.sfx[k] && L.A.sfx[k]();

  U.show = function (html, dim = true) {
    const s = scr();
    s.className = 'show' + (dim ? ' dim' : '');
    s.innerHTML = html;
    s.scrollTop = 0;
    U.hideTip();
    s.querySelectorAll('button, .card, .opt, .char, .tab').forEach((el) => el.addEventListener('pointerenter', () => snd('hover')));
    return s;
  };
  U.hide = function () { const s = scr(); s.className = ''; s.innerHTML = ''; U.hideTip(); };
  U.on = (sel, ev, fn) => scr().querySelectorAll(sel).forEach((el) => el.addEventListener(ev, (e) => fn(el, e)));
  U.toast = function (html) { const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html; $('toasts').appendChild(t); setTimeout(() => t.remove(), 3500); };
  U.banner = function (title, sub, color) {
    const b = document.createElement('div'); b.className = 'big-banner'; b.style.setProperty('--bc', color || '#ffd76a');
    b.innerHTML = `<b>${title}</b>${sub ? `<span>${sub}</span>` : ''}`;
    document.body.appendChild(b); setTimeout(() => b.remove(), 2300);
  };
  U.tip = function (html, x, y) { const t = $('tip'); t.innerHTML = html; t.classList.add('show'); const w = t.offsetWidth, h = t.offsetHeight; t.style.left = L.clamp(x - w / 2, 6, innerWidth - w - 6) + 'px'; t.style.top = (y - h - 12 < 6 ? y + 24 : y - h - 12) + 'px'; };
  U.hideTip = () => $('tip').classList.remove('show');
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest && e.target.closest('[data-don]');
    if (!el) return;
    const d = L.DON[el.dataset.don]; const r = el.getBoundingClientRect();
    U.tip(`<b style="color:${L.RARITY[d.r].color}">${d.name}</b>${d.desc}`, r.left + r.width / 2, r.top);
  });
  document.addEventListener('pointerout', (e) => { if (e.target.closest && e.target.closest('[data-don]')) U.hideTip(); });

  const heartSVG = (cls) => `<div class="hrt ${cls || ''}">${L.icon('heart').replace('fill="none"', 'fill="currentColor"')}</div>`;
  U.heartSVG = heartSVG;
  U.donCard = function (d, extra = '') {
    const R = L.RARITY[d.r];
    return `<div class="card" data-id="${d.id}" style="--rc:${R.color}"><div class="ic">${L.icon(d.icon)}</div><div class="txt"><div class="rar">${R.name}</div><h3>${d.name}</h3><p>${d.desc}</p>${extra}</div></div>`;
  };
  U.donRow = function (w) {
    const counts = {};
    for (const d of w.dones) counts[d.id] = (counts[d.id] || 0) + 1;
    return `<div class="donrow">${Object.keys(counts).map((id) => { const d = L.DON[id]; return `<div class="dmini" data-don="${id}" style="--rc:${L.RARITY[d.r].color}">${L.icon(d.icon)}${counts[id] > 1 ? `<i>×${counts[id]}</i>` : ''}</div>`; }).join('')}</div>`;
  };
  U.runBar = function (w) {
    let hs = '';
    for (let i = 0; i < w.p.st.maxHearts; i++) hs += heartSVG(i < w.p.hearts ? '' : 'empty');
    return `<div class="runbar"><div class="hs">${hs}</div><div id="polen" style="font-size:16px"><span class="pdot"></span><b>${w.polen}</b></div>${w.dones.length ? U.donRow(w) : '<span style="color:var(--muted);font-size:14px">Aún sin dones</span>'}</div>`;
  };

  /* ---------------- menú principal ---------------- */
  U.menu = function (hasRun, cb) {
    U.show(`<div class="menu">
      <div class="title">Lazo</div>
      <div class="tagline">Una luciérnaga contra la noche</div>
      <div class="btns">
        ${hasRun ? '<button class="btn" data-a="continue">Continuar</button>' : ''}
        <button class="btn ${hasRun ? 'sky' : ''}" data-a="new">${hasRun ? 'Nueva partida' : 'Jugar'}</button>
        <button class="btn alt" data-a="how">Cómo se juega</button>
        <button class="btn alt" data-a="codex">Diario de la noche</button>
        <button class="btn alt" data-a="opts">Opciones</button>
      </div></div><div class="foot">Lazo · un juego original · v1.0</div>`, false);
    U.on('[data-a]', 'click', (el) => { L.A.init(); snd('click'); cb(el.dataset.a); });
  };

  /* ---------------- elegir luciérnaga ---------------- */
  U.charSelect = function (meta, cb, back) {
    let sel = meta.lastChar && meta.unlocked(meta.lastChar) ? meta.lastChar : 'lumi';
    let moon = Math.min(meta.d.lastMoon || 0, meta.d.maxMoon);
    const draw = () => {
      U.show(`<div class="box"><h2>Elige tu luciérnaga</h2><div class="sub">Cada una brilla a su manera</div>
        <div class="chars">${L.CHARS.map((c) => { const un = meta.unlocked(c.id); return `<div class="char ${c.id === sel ? 'on' : ''} ${un ? '' : 'locked'}" data-c="${c.id}" style="--cc:${c.color}"><div class="fly">${L.icon(un ? 'firefly' : 'lock')}</div><b>${un ? c.name : '???'}</b></div>`; }).join('')}</div>
        <div class="chardesc">${(() => { const c = L.CHARS.find((x) => x.id === sel); return meta.unlocked(c.id) ? c.desc : '🔒 ' + c.unlock.text; })()}</div>
        <div class="moons">${L.MOONS.map((m, i) => `<div class="moon ${i === moon ? 'on' : ''} ${i > meta.d.maxMoon ? 'locked' : ''}" data-m="${i}" style="--mx:${Math.round(100 - i * 20)}%" title="${m.name}"></div>`).join('')}</div>
        <div class="moondesc"><b>${L.MOONS[moon].name}</b> · ${L.MOONS[moon].desc}${moon > 0 ? ' (y las anteriores)' : ''}</div>
        <div class="row"><button class="btn alt" data-a="back">Volver</button><button class="btn" data-a="go" ${meta.unlocked(sel) ? '' : 'disabled'}>¡A volar!</button></div></div>`);
      U.on('[data-c]', 'click', (el) => { sel = el.dataset.c; snd('click'); draw(); });
      U.on('[data-m]', 'click', (el) => { const m = +el.dataset.m; if (m <= meta.d.maxMoon) { moon = m; snd('click'); draw(); } else { snd('error'); U.toast('Gana una partida en ' + L.MOONS[m - 1].name + ' para desbloquearla'); } });
      U.on('[data-a=back]', 'click', () => { snd('click'); back(); });
      U.on('[data-a=go]', 'click', () => { snd('pick'); cb(sel, moon); });
    };
    draw();
  };

  /* ---------------- mapa ---------------- */
  U.map = function (w, cb, menu) {
    const B = w.biome();
    const nodes = w.map.nodes;
    const av = new Set(w.available());
    const visited = new Set(w.visited || []);
    const VW = 400, rowH = 74, VH = (w.map.layers) * rowH + 40;
    const nx = (n) => 30 + n.x * (VW - 60);
    const ny = (n) => VH - 40 - n.l * rowH;
    let edges = '';
    for (const n of nodes) for (const m of n.next) {
      const a = nodes[m];
      const lit = (w.pos === n.id && av.has(m)) || (visited.has(n.id) && visited.has(m));
      edges += `<line x1="${nx(n)}" y1="${ny(n)}" x2="${nx(a)}" y2="${ny(a)}" stroke="${lit ? '#ffe7a0' : 'rgba(255,255,255,.22)'}" stroke-width="${lit ? 3 : 2}" stroke-dasharray="${lit ? '' : '2 7'}" stroke-linecap="round"/>`;
    }
    let ns = '';
    for (const n of nodes) {
      const T = L.NODE_TYPES[n.type];
      const isAv = av.has(n.id), isCur = w.pos === n.id, isDone = visited.has(n.id);
      const r = n.type === 'boss' ? 28 : 20;
      const cls = isAv ? 'avail' : isDone || isCur ? 'done' : 'dimmed';
      ns += `<g class="mapnode ${cls}" data-n="${n.id}" transform="translate(${nx(n)} ${ny(n)})">
        <circle class="halo" r="${r + 9}" fill="none" stroke="${T.color}" stroke-width="2"/>
        <circle r="${r}" fill="${isCur ? '#ffe7a0' : 'rgba(10,10,30,.85)'}" stroke="${T.color}" stroke-width="${isAv ? 3 : 2}"/>
        <g transform="translate(${-r * 0.6} ${-r * 0.6}) scale(${(r * 1.2) / 48})" style="color:${isCur ? '#1a1030' : T.color}" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${L.ICONS[T.icon]}</g>
      </g>`;
    }
    U.show(`<div class="mapwrap">
      <div class="maphead"><h2 style="color:${B.motes}">${B.name}</h2><div class="sub">${B.sub} · elige tu camino</div></div>
      ${U.runBar(w)}
      <svg class="mapsvg" viewBox="0 0 ${VW} ${VH}">${edges}${ns}</svg>
      <div class="row" style="margin-top:4px"><button class="btn alt small" data-a="menu">${L.icon('pause').replace('class="ico ', 'style="width:16px;height:16px;display:inline-block;vertical-align:-3px" class="ico ')} Menú</button></div>
    </div>`, true);
    const s = scr();
    s.querySelectorAll('.mapnode').forEach((g) => {
      const n = nodes[+g.dataset.n]; const T = L.NODE_TYPES[n.type];
      g.addEventListener('pointerenter', () => { const r = g.getBoundingClientRect(); U.tip(`<b style="color:${T.color}">${T.name}</b>${T.desc}`, r.left + r.width / 2, r.top); if (av.has(n.id)) snd('hover'); });
      g.addEventListener('pointerleave', U.hideTip);
      g.addEventListener('click', () => { if (av.has(n.id)) { snd('pick'); U.hideTip(); cb(n.id); } else snd('error'); });
    });
    U.on('[data-a=menu]', 'click', () => { snd('click'); menu(); });
  };

  /* ---------------- recompensa ---------------- */
  U.reward = function (w, title, sub, choices, cb, skipPolen = 10) {
    U.show(`<div class="box" style="width:min(720px,100%)"><h2>${title}</h2><div class="sub">${sub}</div>
      <div class="cards">${choices.map((d) => U.donCard(d, w.donCount(d.id) ? `<div class="own">Tienes ${w.donCount(d.id)}</div>` : '')).join('')}</div>
      <div class="row"><button class="btn alt small" data-a="skip">Dejarlo (+${skipPolen} de polen)</button></div></div>`);
    U.on('.card', 'click', (el) => { snd('pick'); cb(el.dataset.id); });
    U.on('[data-a=skip]', 'click', () => { snd('click'); cb(null); });
  };

  /* ---------------- mercado ---------------- */
  U.shop = function (w, stock, cb) {
    const price = (it) => it.price;
    const draw = () => {
      U.show(`<div class="box" style="width:min(860px,100%)"><h2>Mercado de la Noche</h2><div class="sub">Una polilla mercader extiende su manta de tesoros</div>
        ${U.runBar(w)}
        <div class="cards" style="margin-top:16px">${stock.items.map((it, i) => {
          if (it.kind === 'don') { const d = L.DON[it.id]; return U.donCard(d, `<div class="price"><span class="pdot"></span>${it.price}</div>`).replace('class="card"', `class="card ${it.sold ? 'sold' : ''} ${w.polen < it.price ? 'cant' : ''}" data-i="${i}"`); }
          const ic = it.kind === 'heal' ? 'heart' : it.kind === 'max' ? 'heart' : 'swirl';
          const nm = it.kind === 'heal' ? 'Néctar' : it.kind === 'max' ? 'Corazón de Luz' : '';
          const ds = it.kind === 'heal' ? 'Cura 1 corazón.' : 'Ganas 1 corazón máximo.';
          return `<div class="card ${it.sold ? 'sold' : ''} ${w.polen < it.price ? 'cant' : ''}" data-i="${i}" style="--rc:#ff8ac8"><div class="ic">${L.icon(ic)}</div><div class="txt"><div class="rar">Remedio</div><h3>${nm}</h3><p>${ds}</p><div class="price"><span class="pdot"></span>${it.price}</div></div></div>`;
        }).join('')}</div>
        <div class="row"><button class="btn alt small" data-a="reroll" ${w.polen < stock.reroll ? 'disabled' : ''}>Renovar (${stock.reroll})</button><button class="btn" data-a="leave">Seguir el camino</button></div></div>`);
      U.on('[data-i]', 'click', (el) => {
        const it = stock.items[+el.dataset.i];
        if (it.sold) return;
        if (w.polen < it.price) { snd('error'); U.toast('No tienes suficiente polen'); return; }
        if (it.kind === 'heal' && w.p.hearts >= w.p.st.maxHearts) { snd('error'); U.toast('Ya tienes todos los corazones'); return; }
        w.polen -= it.price; it.sold = true; snd('buy');
        if (it.kind === 'don') w.addDon(it.id); else if (it.kind === 'heal') w.heal(1); else { w.p.bonusHearts++; w.recalc(); w.heal(1); }
        cb('buy'); draw();
      });
      U.on('[data-a=reroll]', 'click', () => { if (w.polen < stock.reroll) return; w.polen -= stock.reroll; stock.reroll += 5; cb('reroll'); snd('buy'); draw(); });
      U.on('[data-a=leave]', 'click', () => { snd('click'); cb('leave'); });
    };
    draw();
  };

  /* ---------------- manantial ---------------- */
  U.fountain = function (w, cb) {
    U.show(`<div class="box event" style="width:min(560px,100%)"><div class="eic" style="color:#ffb0d8">${L.icon('drop')}</div><h2>El Manantial</h2>
      <p class="txt">Agua tibia que brilla como la luna. Un buen sitio para recuperar el aliento.</p>${U.runBar(w)}
      <div class="opts" style="margin-top:14px">
        <div class="opt" data-o="heal"><b>Descansar</b><span>Recuperas todos tus corazones.</span></div>
        <div class="opt" data-o="max"><b>Meditar</b><span>Ganas 1 corazón máximo (sin curarte).</span></div>
      </div></div>`);
    U.on('[data-o]', 'click', (el) => { snd('pick'); cb(el.dataset.o); });
  };

  /* ---------------- evento ---------------- */
  U.event = function (w, E, cb) {
    U.show(`<div class="box event" style="width:min(600px,100%)"><div class="eic">${L.icon(E.icon)}</div><h2>${E.title}</h2><p class="txt">${E.text}</p>${U.runBar(w)}
      <div class="opts" style="margin-top:14px">${E.opts.map((o, i) => { const ok = (!o.can || o.can(w)) && (!o.cost || w.polen >= o.cost); return `<div class="opt ${ok ? '' : 'no'}" data-o="${i}"><b>${o.t}</b>${o.d ? `<span>${o.d}</span>` : ''}</div>`; }).join('')}</div></div>`);
    U.on('[data-o]', 'click', (el) => { snd('pick'); cb(+el.dataset.o); });
  };
  U.eventResult = function (w, E, text, cb) {
    U.show(`<div class="box event" style="width:min(560px,100%)"><div class="eic">${L.icon(E.icon)}</div><h2>${E.title}</h2><p class="txt">${text}</p>${U.runBar(w)}<div class="row"><button class="btn" data-a="ok">Continuar</button></div></div>`);
    U.on('[data-a=ok]', 'click', () => { snd('click'); cb(); });
  };

  /* ---------------- pausa ---------------- */
  U.pause = function (w, cb) {
    U.show(`<div class="box" style="width:min(520px,100%)"><h2>Pausa</h2><div class="sub">${w.biome().name}</div>${U.runBar(w)}
      <div class="row" style="flex-direction:column;align-items:center"><button class="btn" data-a="resume">Seguir volando</button><button class="btn alt" data-a="opts">Opciones</button><button class="btn alt" data-a="how">Cómo se juega</button><button class="btn alt" data-a="quit">Abandonar partida</button></div></div>`);
    U.on('[data-a]', 'click', (el) => { snd('click'); cb(el.dataset.a); });
  };

  /* ---------------- fin ---------------- */
  U.end = function (w, won, news, cb) {
    const s = w.stats;
    const m = Math.floor(s.time / 60), sec = Math.floor(s.time % 60);
    U.show(`<div class="box" style="width:min(640px,100%)"><h2 style="color:${won ? '#ffe7a0' : '#ffb0c8'}">${won ? '¡Ha amanecido!' : 'Tu luz se apaga…'}</h2>
      <div class="sub">${won ? 'La Reina Eclipse ha caído y el sol vuelve a salir.' : 'Pero las luciérnagas siempre vuelven a brillar.'}</div>
      <div class="stats">
        <div class="stat"><b>${L.fmt(s.score)}</b><span>Puntuación</span></div>
        <div class="stat"><b>${w.biome().name.split(' ')[0]} ${w.floor + 1}</b><span>Noche alcanzada</span></div>
        <div class="stat"><b>${s.loops}</b><span>Lazos cerrados</span></div>
        <div class="stat"><b>${s.kills}</b><span>Sombras atrapadas</span></div>
        <div class="stat"><b>×${s.bestCombo}</b><span>Mejor lazo</span></div>
        <div class="stat"><b>${m}:${String(sec).padStart(2, '0')}</b><span>Tiempo</span></div>
      </div>
      <div style="margin-top:14px">${U.donRow(w)}</div>
      ${news.length ? `<div style="margin-top:14px;text-align:center;color:var(--gold);font-weight:600">${news.join('<br>')}</div>` : ''}
      <div class="row"><button class="btn" data-a="again">Otra vez</button><button class="btn alt" data-a="menu">Menú</button></div></div>`);
    U.on('[data-a]', 'click', (el) => { snd('click'); cb(el.dataset.a); });
  };

  /* ---------------- diario (códice) ---------------- */
  U.codex = function (meta, back) {
    let tab = 'dones';
    const draw = () => {
      let body = '';
      if (tab === 'dones') {
        const n = L.DONES.filter((d) => meta.d.seen['d:' + d.id]).length;
        body = `<div class="sub" style="margin-top:0">${n} / ${L.DONES.length} dones descubiertos</div><div class="grid">${L.DONES.map((d) => meta.d.seen['d:' + d.id] ? `<div class="gi" style="--rc:${L.RARITY[d.r].color}"><div class="gic">${L.icon(d.icon)}</div><div><b>${d.name}</b><small>${d.desc}</small></div></div>` : `<div class="gi unk"><div class="gic">${L.icon('question')}</div><div><b>???</b><small>Aún por descubrir</small></div></div>`).join('')}</div>`;
      } else if (tab === 'sombras') {
        const ids = Object.keys(L.ENEMIES);
        body = `<div class="grid">${ids.map((id) => { const E = L.ENEMIES[id]; return meta.d.seen['e:' + id] ? `<div class="gi" style="--rc:${E.eye}"><div class="gic" style="background:${E.color};border-radius:50%">${L.icon(E.boss ? 'crown' : 'veil')}</div><div><b>${E.name}</b><small>${E.desc}</small></div></div>` : `<div class="gi unk"><div class="gic">${L.icon('question')}</div><div><b>???</b><small>Aún no la has visto</small></div></div>`; }).join('')}</div>`;
      } else if (tab === 'logros') {
        body = `<div class="grid">${L.ACH.map((a) => `<div class="gi ${meta.d.ach[a.id] ? '' : 'unk'}" style="--rc:#ffd76a"><div class="gic">${L.icon(meta.d.ach[a.id] ? 'stars' : 'lock')}</div><div><b>${a.name}</b><small>${a.desc}</small></div></div>`).join('')}</div>`;
      } else {
        const s = meta.d.stats;
        body = `<div class="stats"><div class="stat"><b>${s.runs}</b><span>Partidas</span></div><div class="stat"><b>${s.wins}</b><span>Amaneceres</span></div><div class="stat"><b>${L.fmt(s.best)}</b><span>Mejor puntuación</span></div><div class="stat"><b>×${s.combo}</b><span>Mejor lazo</span></div><div class="stat"><b>${L.fmt(s.kills)}</b><span>Sombras atrapadas</span></div><div class="stat"><b>${L.fmt(s.loops)}</b><span>Lazos cerrados</span></div></div>`;
      }
      U.show(`<div class="box" style="width:min(820px,100%)"><h2>Diario de la noche</h2><div class="sub">Todo lo que has visto bajo las estrellas</div>
        <div class="tabs">${[['dones', 'Dones'], ['sombras', 'Sombras'], ['logros', 'Logros'], ['stats', 'Estadísticas']].map(([k, n]) => `<div class="tab ${k === tab ? 'on' : ''}" data-t="${k}">${n}</div>`).join('')}</div>${body}
        <div class="row"><button class="btn alt" data-a="back">Volver</button></div></div>`);
      U.on('[data-t]', 'click', (el) => { tab = el.dataset.t; snd('click'); draw(); });
      U.on('[data-a=back]', 'click', () => { snd('click'); back(); });
    };
    draw();
  };

  U.options = function (meta, apply, back) {
    const s = meta.d.settings;
    const draw = () => {
      U.show(`<div class="box" style="width:min(520px,100%)"><h2>Opciones</h2>
        <div class="optrow"><span>Efectos</span><input type="range" id="o-sfx" min="0" max="1" step="0.05" value="${s.sfx}"></div>
        <div class="optrow"><span>Música</span><input type="range" id="o-mus" min="0" max="1" step="0.05" value="${s.music}"></div>
        <div class="optrow"><span>Temblor de pantalla</span><div class="seg"><button data-k="shake" data-v="1" class="${s.shake ? 'on' : ''}">Sí</button><button data-k="shake" data-v="0" class="${!s.shake ? 'on' : ''}">No</button></div></div>
        <div class="optrow"><span>Control táctil</span><div class="seg"><button data-k="touch" data-v="rel" class="${s.touch === 'rel' ? 'on' : ''}">Arrastrar</button><button data-k="touch" data-v="abs" class="${s.touch === 'abs' ? 'on' : ''}">Seguir el dedo</button></div></div>
        <div class="row"><button class="btn alt small" data-a="reset">Borrar progreso</button><button class="btn" data-a="back">Volver</button></div></div>`);
      $('o-sfx').oninput = (e) => { s.sfx = +e.target.value; apply(); };
      $('o-mus').oninput = (e) => { s.music = +e.target.value; apply(); };
      $('o-sfx').onchange = () => { meta.save(); snd('polen'); };
      $('o-mus').onchange = () => meta.save();
      U.on('[data-k]', 'click', (el) => { const k = el.dataset.k, v = el.dataset.v; s[k] = k === 'shake' ? v === '1' : v; meta.save(); apply(); snd('click'); draw(); });
      U.on('[data-a=back]', 'click', () => { snd('click'); back(); });
      U.on('[data-a=reset]', 'click', (el) => { if (el.dataset.sure) { meta.reset(); apply(); U.toast('Progreso borrado'); back(); } else { el.dataset.sure = 1; el.textContent = '¿Seguro? Pulsa otra vez'; } });
    };
    draw();
  };

  U.howto = function (back) {
    const pages = [
      ['Vuela', 'Mueve tu luciérnaga con el <b>ratón</b>, las <b>flechas/WASD</b> o <b>arrastrando el dedo</b>. Dejas tras de ti una estela de luz.'],
      ['Cierra lazos', 'Si <b>cruzas tu propia estela</b>, se cierra un lazo. Todas las sombras que queden <b>dentro</b> reciben daño. ¡Cuantas más atrapes de una vez, mejor!'],
      ['Esquiva', 'Si una sombra te toca, pierdes un corazón. Usa el <b>impulso</b> (clic, Espacio o el botón táctil) para atravesar el peligro. Cuidado: los orbes y las tijeretas <b>cortan tu estela</b>.'],
      ['El camino', 'Cada noche es un mapa de caminos: salas de sombras, mercados, manantiales, tesoros y misterios. Al final te espera un <b>Guardián</b>. Supera tres noches para ver el amanecer.'],
      ['Dones', 'Tras cada sala eliges un <b>don</b>. Combínalos: estelas ardientes, ecos, supernovas, hermanas que orbitan… Ninguna partida será igual.'],
    ];
    let i = 0;
    const draw = () => {
      U.show(`<div class="box howto" style="width:min(560px,100%)"><h2>${pages[i][0]}</h2>
        <div class="demo"><svg viewBox="0 0 220 120" width="260" height="140">${demo(i)}</svg></div>
        <p style="text-align:center">${pages[i][1]}</p>
        <div class="row"><button class="btn alt small" data-a="prev" ${i ? '' : 'disabled'}>Anterior</button><button class="btn small" data-a="next">${i === pages.length - 1 ? '¡Entendido!' : 'Siguiente'}</button></div></div>`);
      U.on('[data-a=prev]', 'click', () => { i = Math.max(0, i - 1); snd('click'); draw(); });
      U.on('[data-a=next]', 'click', () => { snd('click'); if (i === pages.length - 1) back(); else { i++; draw(); } });
    };
    draw();
  };
  function demo(i) {
    const fly = (x, y) => `<circle cx="${x}" cy="${y}" r="14" fill="rgba(255,215,106,.25)"/><circle cx="${x}" cy="${y}" r="6" fill="#ffd76a"/>`;
    const shadow = (x, y) => `<circle cx="${x}" cy="${y}" r="10" fill="#2a2440" stroke="#ff9ad5" stroke-opacity=".6"/><circle cx="${x - 3}" cy="${y - 2}" r="1.8" fill="#ff9ad5"/><circle cx="${x + 3}" cy="${y - 2}" r="1.8" fill="#ff9ad5"/>`;
    if (i === 0) return `<path d="M20 90 C60 30 110 110 170 50" stroke="#ffd76a" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"><animate attributeName="stroke-dasharray" values="0 400;400 0" dur="2s" repeatCount="indefinite"/></path>${fly(170, 50)}`;
    if (i === 1) return `<path d="M40 100 C30 40 90 15 140 30 C190 45 180 100 120 105 C80 108 60 80 70 50" stroke="#ffd76a" stroke-width="4" fill="rgba(255,215,106,.12)" stroke-linecap="round"/>${shadow(105, 65)}${shadow(130, 75)}${shadow(90, 85)}${fly(70, 50)}`;
    if (i === 2) return `${shadow(120, 60)}<path d="M40 60 L180 60" stroke="#8fd8ff" stroke-width="6" stroke-dasharray="4 8" stroke-linecap="round"/>${fly(180, 60)}`;
    if (i === 3) return `<g stroke="rgba(255,255,255,.4)" stroke-dasharray="2 6" stroke-width="2"><line x1="40" y1="100" x2="80" y2="60"/><line x1="80" y1="60" x2="140" y2="70"/><line x1="140" y1="70" x2="180" y2="25"/><line x1="40" y1="100" x2="110" y2="105"/><line x1="110" y1="105" x2="140" y2="70"/></g>${[[40, 100, '#9fd8ff'], [80, 60, '#d9b3ff'], [110, 105, '#9cffb0'], [140, 70, '#ffd36e'], [180, 25, '#ff6a9a']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="11" fill="#0d0b22" stroke="${c}" stroke-width="3"/>`).join('')}`;
    return `${[30, 85, 140].map((x, k) => `<rect x="${x}" y="20" width="50" height="80" rx="10" fill="rgba(255,255,255,.06)" stroke="${['#9fd8ff', '#9cffb0', '#ffb36a'][k]}" stroke-width="2"/><circle cx="${x + 25}" cy="52" r="12" fill="${['#9fd8ff', '#9cffb0', '#ffb36a'][k]}" opacity=".5"/>`).join('')}`;
  }
  L.U = U;
})(globalThis.L = globalThis.L || {});
