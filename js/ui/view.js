/* BRISKA — capa de sprites: cartas, talismanes y objetos animados con FLIP */
(function (BR) {
  'use strict';
  const V = { sprites: new Map(), handlers: {}, deckId: 'alba' };
  let stage;

  V.init = function (el) {
    stage = el;
    stage.addEventListener('pointerdown', onDown);
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerup', onUp);
    addEventListener('pointercancel', onUp);
    stage.addEventListener('pointerover', (e) => { const s = sp(e); if (s && e.pointerType !== 'touch') { V.handlers.hover && V.handlers.hover(s.key, true); } });
    stage.addEventListener('pointerout', (e) => {
      const s = sp(e); if (!s) return;
      const to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.sp');
      if (to === s.el) return;
      s.inner.style.removeProperty('--rx'); s.inner.style.removeProperty('--ry');
      if (e.pointerType !== 'touch') V.handlers.hover && V.handlers.hover(s.key, false);
    });
  };
  function sp(e) { const el = e.target.closest && e.target.closest('.sp'); return el ? V.sprites.get(el.dataset.key) : null; }

  function contentSig(d) {
    const o = d.obj || {};
    switch (d.kind) {
      case 'card': return [o.suit, o.rank, o.enh, o.seal, o.ed, o.bonus, V.deckId].join('|');
      case 'tal': return o.id + '|' + o.ed;
      case 'cons': return o.type + '|' + o.id;
      case 'pack': return o.pack + '|' + o.size;
      case 'voucher': return o.id;
      case 'deck': return V.deckId;
      default: return '';
    }
  }
  function build(s, d) {
    const o = d.obj;
    let front = '', back = '';
    if (d.kind === 'card') { front = BR.Art.cardSVG(o); back = BR.Art.backSVG(V.deckId); }
    else if (d.kind === 'tal') front = BR.Art.talismanHTML(o);
    else if (d.kind === 'cons') front = BR.Art.consHTML(o);
    else if (d.kind === 'pack') front = BR.Art.packHTML(o);
    else if (d.kind === 'voucher') front = BR.Art.voucherHTML(o);
    else if (d.kind === 'deck') front = BR.Art.backSVG(V.deckId);
    const ed = o && o.ed;
    s.inner.innerHTML = `<div class="face front">${front}</div>${back ? `<div class="face back">${back}</div>` : ''}<div class="edfx"></div>${ed && d.kind !== 'card' ? `<div class="edtag">${BR.EDITIONS[ed].name}</div>` : ''}`;
    s.el.classList.remove('ed-brillante', 'ed-iridiscente', 'ed-aurora', 'ed-eclipse');
    if (ed) s.el.classList.add('ed-' + ed);
    s.sig = contentSig(d);
  }

  V.cw = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cw')) || 96;

  V.sync = function (descs) {
    const seen = new Set();
    for (const d of descs) {
      seen.add(d.key);
      let s = V.sprites.get(d.key);
      const isNew = !s;
      if (!s) {
        const el = document.createElement('div');
        el.className = 'sp kind-' + d.kind;
        el.dataset.key = d.key;
        const inner = document.createElement('div'); inner.className = 'sp-in';
        el.appendChild(inner);
        s = { key: d.key, el, inner, sig: null, price: null };
        V.sprites.set(d.key, s);
        if (d.kind === 'tal') inner.style.setProperty('--dl', (-Math.random() * 5).toFixed(2) + 's');
        stage.appendChild(el);
      }
      if (s.removing) { s.removing = false; clearTimeout(s.rmTimer); s.el.classList.remove('dissolve', 'shatter', 'down'); s.el.style.opacity = ''; s.tf = null; if (s.cls) s.cls.split(' ').filter(Boolean).forEach((c) => s.el.classList.remove(c)); s.cls = ''; }
      s.exit = null;
      const sig = contentSig(d);
      if (sig !== s.sig) build(s, d);
      s.desc = d;
      // clases
      const cls = d.cls || '';
      if (s.cls !== cls) {
        if (s.cls) s.cls.split(' ').filter(Boolean).forEach((c) => s.el.classList.remove(c));
        cls.split(' ').filter(Boolean).forEach((c) => s.el.classList.add(c));
        s.cls = cls;
      }
      // precio / etiqueta
      const pr = d.price == null ? '' : d.price;
      if (s.price !== pr) {
        const old = s.el.querySelector('.price'); if (old) old.remove();
        if (pr !== '') { const p = document.createElement('div'); p.className = 'price' + (pr === 0 ? ' free' : ''); p.textContent = pr === 0 ? 'Gratis' : '$' + pr; s.el.appendChild(p); }
        s.price = pr;
      }
      const tl = d.tagline || '';
      if (s.tagline !== tl) {
        const old = s.el.querySelector('.tagline'); if (old) old.remove();
        if (tl) { const p = document.createElement('div'); p.className = 'tagline'; p.textContent = tl; s.el.appendChild(p); }
        s.tagline = tl;
      }
      const w = d.w, h = d.h;
      if (w && s.w !== w) { s.el.style.width = w + 'px'; s.w = w; }
      if (h && s.h !== h) { s.el.style.height = h + 'px'; s.h = h; }
      s.el.style.zIndex = d.z || 1;
      if (s.dragging) continue;
      const tf = `translate3d(${d.x.toFixed(1)}px, ${d.y.toFixed(1)}px, 0) rotate(${(d.rot || 0).toFixed(2)}deg) scale(${d.scale || 1})`;
      if (isNew && d.from) {
        s.el.classList.add('noanim');
        s.el.style.transform = `translate3d(${d.from.x}px, ${d.from.y}px, 0) rotate(${d.from.rot || 0}deg) scale(${d.from.scale || 1})`;
        if (d.from.down) s.el.classList.add('down');
        void s.el.offsetWidth;
        s.el.classList.remove('noanim');
        const delay = d.delay || 0;
        if (delay) { s.el.style.transitionDelay = delay + 'ms'; setTimeout(() => { s.el.style.transitionDelay = ''; }, delay + 600); }
        requestAnimationFrame(() => { s.el.style.transform = tf; if (d.from.down && !(d.cls || '').includes('down')) s.el.classList.remove('down'); });
      } else if (isNew) {
        s.el.classList.add('noanim');
        s.el.style.transform = tf;
        s.el.style.opacity = '0';
        void s.el.offsetWidth;
        s.el.classList.remove('noanim');
        s.el.style.opacity = '';
      } else if (s.tf !== tf) s.el.style.transform = tf;
      s.tf = tf;
      s.el.style.setProperty('--t', tf);
    }
    for (const [k, s] of V.sprites) if (!seen.has(k) && !s.removing) remove(s);
  };

  function remove(s) {
    s.removing = true;
    const ex = s.exit || { mode: 'fade' };
    let dur = 350;
    if (ex.mode === 'fly') {
      s.el.style.transform = `translate3d(${ex.x}px, ${ex.y}px, 0) rotate(${ex.rot || 0}deg) scale(${ex.scale || 1})`;
      if (ex.down) s.el.classList.add('down');
      dur = 520;
    } else if (ex.mode === 'dissolve') { s.el.classList.add('dissolve'); dur = 720; }
    else if (ex.mode === 'shatter') { s.el.classList.add('shatter'); dur = 560; }
    else { s.el.style.opacity = '0'; s.el.style.transform = (s.tf || '') + ' scale(.85)'; }
    s.rmTimer = setTimeout(() => { if (s.removing) { s.el.remove(); V.sprites.delete(s.key); } }, dur / (BR.speedMult || 1) + 80);
  }
  V.exit = function (key, ex) { const s = V.sprites.get(key); if (s) s.exit = ex; };
  V.el = (key) => { const s = V.sprites.get(key); return s ? s.el : null; };
  V.rect = (key) => { const s = V.sprites.get(key); return s ? s.el.getBoundingClientRect() : null; };
  V.center = (key) => { const r = V.rect(key); return r ? [r.left + r.width / 2, r.top + r.height / 2] : null; };
  V.jig = function (key) {
    const s = V.sprites.get(key); if (!s) return;
    s.el.classList.remove('jig'); void s.el.offsetWidth; s.el.classList.add('jig');
    clearTimeout(s.jt); s.jt = setTimeout(() => s.el.classList.remove('jig'), 400);
  };
  V.shakeIt = function (key) {
    const s = V.sprites.get(key); if (!s) return;
    s.el.classList.remove('shakeit'); void s.el.offsetWidth; s.el.classList.add('shakeit');
    setTimeout(() => s.el.classList.remove('shakeit'), 450);
  };
  V.clear = function () { for (const [, s] of V.sprites) s.el.remove(); V.sprites.clear(); };

  /* ------------- interacción: clic, arrastre, inclinación ------------- */
  let press = null;
  function onDown(e) {
    const s = sp(e); if (!s || !s.desc) return;
    if (e.button && e.button !== 0) return;
    press = { s, x0: e.clientX, y0: e.clientY, moved: false, id: e.pointerId, touch: e.pointerType === 'touch', long: false };
    if (press.touch) {
      press.lt = setTimeout(() => { if (press && !press.moved) { press.long = true; V.handlers.hover && V.handlers.hover(s.key, true, true); } }, 420);
    }
  }
  function onMove(e) {
    if (press && e.pointerId === press.id) {
      const dx = e.clientX - press.x0, dy = e.clientY - press.y0;
      const d = press.s.desc;
      if (!press.moved && Math.hypot(dx, dy) > 9 && d.drag && !BR.uiBusy) {
        press.moved = true; clearTimeout(press.lt);
        const r = press.s.el.getBoundingClientRect();
        const sr = stage.getBoundingClientRect();
        press.ox = press.x0 - r.left; press.oy = press.y0 - r.top; press.sr = sr;
        press.s.dragging = true; press.s.el.classList.add('dragging');
        V.handlers.hover && V.handlers.hover(press.s.key, false);
        V.handlers.dragStart && V.handlers.dragStart(press.s.key);
      } else if (!press.moved && Math.hypot(dx, dy) > 9) { clearTimeout(press.lt); }
      if (press.moved) {
        const x = e.clientX - press.ox - press.sr.left, y = e.clientY - press.oy - press.sr.top;
        press.s.el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${BR.clamp(dx * 0.05, -10, 10)}deg)`;
        V.handlers.dragMove && V.handlers.dragMove(press.s.key, e.clientX - press.sr.left);
      }
      return;
    }
    if (e.pointerType === 'touch') return;
    const el = e.target && e.target.closest && e.target.closest('.sp');
    if (el) {
      const s = V.sprites.get(el.dataset.key); if (!s) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      s.inner.style.setProperty('--ry', (px * 18).toFixed(1) + 'deg');
      s.inner.style.setProperty('--rx', (-py * 18).toFixed(1) + 'deg');
    }
  }
  function onUp(e) {
    if (!press || e.pointerId !== press.id) return;
    const p = press; press = null;
    clearTimeout(p.lt);
    if (p.moved) {
      p.s.dragging = false; p.s.el.classList.remove('dragging');
      V.handlers.dragEnd && V.handlers.dragEnd(p.s.key);
      return;
    }
    if (p.long) { setTimeout(() => V.handlers.hover && V.handlers.hover(p.s.key, false), 1200); return; }
    if (e.type === 'pointercancel') return;
    const d = p.s.desc;
    if (d && d.onClick) d.onClick(e);
  }
  BR.View = V;
})(globalThis.BR = globalThis.BR || {});
