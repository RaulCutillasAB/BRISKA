/* BRISKA — arte: baraja española vectorial, talismanes, consumibles, sobres */
(function (BR) {
  'use strict';

  /* ---------------- definiciones globales (gradientes y palos) ---------------- */
  const DEFS = `
  <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="g-paper" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#f1e4c8"/></linearGradient>
    <linearGradient id="g-ambar" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#ffe9b8"/><stop offset="1" stop-color="#f3bf62"/></linearGradient>
    <linearGradient id="g-rubi" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#ffe1e1"/><stop offset="1" stop-color="#f2a3a8"/></linearGradient>
    <linearGradient id="g-cristal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eefcff" stop-opacity=".92"/><stop offset=".5" stop-color="#bfe7f5" stop-opacity=".62"/><stop offset="1" stop-color="#e8f9ff" stop-opacity=".88"/></linearGradient>
    <linearGradient id="g-oro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b0"/><stop offset=".35" stop-color="#f2c650"/><stop offset=".6" stop-color="#fbe48c"/><stop offset="1" stop-color="#cf9726"/></linearGradient>
    <linearGradient id="g-hierro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2f4f7"/><stop offset=".45" stop-color="#b7bfc9"/><stop offset=".55" stop-color="#d8dde4"/><stop offset="1" stop-color="#8e98a5"/></linearGradient>
    <linearGradient id="g-fortuna" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#eefbe6"/><stop offset="1" stop-color="#b9e6a5"/></linearGradient>
    <linearGradient id="g-prisma" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7a7a"/><stop offset=".2" stop-color="#ffd36e"/><stop offset=".4" stop-color="#8ef08a"/><stop offset=".6" stop-color="#6fd6ff"/><stop offset=".8" stop-color="#a98bff"/><stop offset="1" stop-color="#ff86d8"/></linearGradient>
    <radialGradient id="g-piedra" cx=".4" cy=".35" r=".9"><stop offset="0" stop-color="#a7a29a"/><stop offset=".6" stop-color="#7d786f"/><stop offset="1" stop-color="#57534c"/></radialGradient>
    <linearGradient id="g-goldm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe58a"/><stop offset=".5" stop-color="#f0b938"/><stop offset="1" stop-color="#b9780f"/></linearGradient>
    <radialGradient id="g-coin" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#fff2a8"/><stop offset=".45" stop-color="#f4c443"/><stop offset="1" stop-color="#c0800e"/></radialGradient>
    <linearGradient id="g-cupred" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7d8a"/><stop offset=".5" stop-color="#d8344b"/><stop offset="1" stop-color="#8c1427"/></linearGradient>
    <linearGradient id="g-blade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9fd0ff"/><stop offset=".5" stop-color="#4c8fdc"/><stop offset=".51" stop-color="#2f6cb8"/><stop offset="1" stop-color="#1f4f8c"/></linearGradient>
    <linearGradient id="g-club" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7cc46a"/><stop offset=".55" stop-color="#3f8f45"/><stop offset="1" stop-color="#21582a"/></linearGradient>
    <linearGradient id="g-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe0c2"/><stop offset="1" stop-color="#eab58c"/></linearGradient>
    <symbol id="s-oros" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="44" fill="url(#g-coin)" stroke="#7a4a05" stroke-width="3.5"/>
      <circle cx="50" cy="50" r="33" fill="none" stroke="#9a620c" stroke-width="2.5"/>
      <g fill="#b06e0c">${Array.from({ length: 8 }, (_, i) => `<ellipse cx="50" cy="31" rx="5" ry="10" transform="rotate(${i * 45} 50 50)"/>`).join('')}</g>
      <circle cx="50" cy="50" r="9" fill="#fff1a6" stroke="#9a620c" stroke-width="2.5"/>
      <path d="M22 34a32 32 0 0 1 22-18" stroke="#fff8d0" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>
    </symbol>
    <symbol id="s-copas" viewBox="0 0 100 100">
      <path d="M16 18h68c0 30-14 44-34 44S16 48 16 18z" fill="url(#g-cupred)" stroke="#5e0a18" stroke-width="3.5" stroke-linejoin="round"/>
      <ellipse cx="50" cy="18" rx="34" ry="6" fill="url(#g-goldm)" stroke="#7a4a05" stroke-width="3"/>
      <path d="M44 62h12v12H44z" fill="url(#g-goldm)" stroke="#7a4a05" stroke-width="3"/>
      <ellipse cx="50" cy="74" rx="10" ry="4.5" fill="url(#g-goldm)" stroke="#7a4a05" stroke-width="3"/>
      <path d="M26 94c0-10 10-16 24-16s24 6 24 16z" fill="url(#g-goldm)" stroke="#7a4a05" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M26 32c2 10 8 18 18 21" stroke="#ffc0c8" stroke-width="4" fill="none" stroke-linecap="round" opacity=".75"/>
      <circle cx="50" cy="40" r="6" fill="#ffd76a" stroke="#7a4a05" stroke-width="2"/>
    </symbol>
    <symbol id="s-espadas" viewBox="0 0 100 100">
      <path d="M50 2l9 13v54H41V15z" fill="url(#g-blade)" stroke="#0e2c55" stroke-width="3" stroke-linejoin="round"/>
      <path d="M50 8v58" stroke="#d8ecff" stroke-width="2" opacity=".8"/>
      <path d="M22 68h56a5 5 0 0 1 0 10H22a5 5 0 0 1 0-10z" fill="url(#g-goldm)" stroke="#7a4a05" stroke-width="3"/>
      <rect x="44" y="78" width="12" height="12" fill="#6a3a12" stroke="#3a1c06" stroke-width="2.5"/>
      <circle cx="50" cy="93" r="6" fill="url(#g-goldm)" stroke="#7a4a05" stroke-width="2.5"/>
    </symbol>
    <symbol id="s-bastos" viewBox="0 0 100 100">
      <path d="M36 8c-9 4-9 18-5 32l8 52c2 4 20 4 22 0l8-52c4-14 4-28-5-32-8-4-20-4-28 0z" fill="url(#g-club)" stroke="#0f3a17" stroke-width="3.5" stroke-linejoin="round"/>
      <ellipse cx="37" cy="30" rx="5" ry="4" fill="#2c6a32" stroke="#0f3a17" stroke-width="2"/>
      <ellipse cx="62" cy="46" rx="5" ry="4" fill="#2c6a32" stroke="#0f3a17" stroke-width="2"/>
      <ellipse cx="45" cy="64" rx="4" ry="3.5" fill="#2c6a32" stroke="#0f3a17" stroke-width="2"/>
      <path d="M30 22l-12-8c-2 6 2 12 10 12zM70 34l12-6c0 8-6 12-12 10z" fill="#5cbf5a" stroke="#0f3a17" stroke-width="2"/>
      <path d="M40 14c-4 4-4 12-2 20" stroke="#bfeaa8" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".7"/>
    </symbol>
    <symbol id="tal-frame" viewBox="0 0 200 280">
      <g opacity=".14" stroke="#ffe7a8" stroke-width="2">${Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return `<path d="M${100 + Math.cos(a) * 30} ${118 + Math.sin(a) * 30}L${100 + Math.cos(a) * 160} ${118 + Math.sin(a) * 160}"/>`; }).join('')}</g>
      <rect x="7" y="7" width="186" height="266" rx="14" fill="none" stroke="#f2c96b" stroke-width="3"/>
      <rect x="14" y="14" width="172" height="252" rx="9" fill="none" stroke="var(--rc)" stroke-width="2" opacity=".9"/>
      <g fill="#f2c96b"><path d="M100 4l8 10-8 10-8-10z"/><circle cx="20" cy="20" r="4"/><circle cx="180" cy="20" r="4"/><circle cx="20" cy="260" r="4"/><circle cx="180" cy="260" r="4"/></g>
      <path d="M100 6l5 8-5 8-5-8z" fill="var(--rc)"/>
      <circle cx="100" cy="118" r="62" fill="rgba(0,0,0,.28)" stroke="#f2c96b" stroke-width="2" stroke-dasharray="2 6"/>
      <circle cx="100" cy="118" r="52" fill="none" stroke="rgba(255,231,168,.35)" stroke-width="1.5"/>
    </symbol>
  </defs></svg>`;
  BR.injectArtDefs = function () {
    if (document.getElementById('br-defs')) return;
    const d = document.createElement('div'); d.id = 'br-defs'; d.innerHTML = DEFS; document.body.appendChild(d);
  };

  const suitUse = (s, x, y, w, extra) => `<use href="#s-${s}" x="${x}" y="${y}" width="${w}" height="${w}" ${extra || ''}/>`;

  const PIPS = {
    2: [[100, 82], [100, 198]],
    3: [[100, 72], [100, 140], [100, 208]],
    4: [[66, 84], [134, 84], [66, 196], [134, 196]],
    5: [[66, 80], [134, 80], [100, 140], [66, 200], [134, 200]],
    6: [[66, 74], [134, 74], [66, 140], [134, 140], [66, 206], [134, 206]],
    7: [[66, 70], [134, 70], [100, 105], [66, 140], [134, 140], [66, 210], [134, 210]],
  };
  const PINTAS = { oros: 0, copas: 1, espadas: 2, bastos: 3 };
  const PAPER = { ambar: 'g-ambar', rubi: 'g-rubi', cristal: 'g-cristal', oro: 'g-oro', hierro: 'g-hierro', fortuna: 'g-fortuna', prisma: 'g-paper' };
  const PAPER_SOLID = { ambar: '#f8d48a', rubi: '#f6bcc0', cristal: '#d5f0f8', oro: '#f5d36a', hierro: '#c9cfd8', fortuna: '#d2efc4', prisma: '#f6ead2', none: '#f6ead2' };

  function figure(rank, suit) {
    const S = BR.SUIT_INFO[suit];
    const col = S.color, dk = S.dark;
    const arch = `<path d="M42 238V92Q42 46 100 44Q158 46 158 92V238Z" fill="${col}" fill-opacity=".13" stroke="${col}" stroke-width="2.5"/>
      <g stroke="${col}" stroke-opacity=".18" stroke-width="2">${Array.from({ length: 9 }, (_, i) => `<path d="M100 120L${52 + i * 12} 50"/>`).join('')}</g>`;
    let fig = '';
    if (rank === 12) {
      fig = `<path d="M50 238C54 190 72 170 100 168C128 170 146 190 150 238Z" fill="${col}" stroke="${dk}" stroke-width="3"/>
        <path d="M66 176Q100 198 134 176Q130 192 100 202Q70 192 66 176Z" fill="#fffaf0" stroke="${dk}" stroke-width="2"/>
        <g fill="#2a2030"><circle cx="82" cy="186" r="1.8"/><circle cx="100" cy="194" r="1.8"/><circle cx="118" cy="186" r="1.8"/></g>
        <circle cx="100" cy="128" r="25" fill="url(#g-skin)" stroke="#5a3418" stroke-width="2.5"/>
        <path d="M76 132Q100 182 124 132Q114 150 100 150Q86 150 76 132Z" fill="#8a5a3a" stroke="#4a2a14" stroke-width="2"/>
        <path d="M90 140Q100 146 110 140" stroke="#4a2a14" stroke-width="2.5" fill="none"/>
        <circle cx="91" cy="124" r="2.6" fill="#2a1a10"/><circle cx="109" cy="124" r="2.6" fill="#2a1a10"/>
        <path d="M74 108L78 80L90 96L100 74L110 96L122 80L126 108Z" fill="url(#g-goldm)" stroke="#7a4a05" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="100" cy="98" r="4" fill="${col}" stroke="#7a4a05" stroke-width="1.5"/>
        ${suitUse(suit, 118, 164, 40)}`;
    } else if (rank === 11) {
      fig = `<path d="M136 238C138 204 132 182 122 166C136 156 142 136 134 114C128 98 114 88 100 84L94 68L84 86C70 92 58 106 52 124C48 138 52 148 62 150C70 152 76 146 82 142C88 140 94 142 96 150C98 176 86 204 78 238Z" fill="${col}" stroke="${dk}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M100 84C112 96 120 114 118 140C126 170 132 200 134 238" stroke="${dk}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".55"/>
        <circle cx="84" cy="110" r="4" fill="#fffaf0" stroke="${dk}" stroke-width="2"/><circle cx="85" cy="110" r="2" fill="#1a1020"/>
        <path d="M56 136L84 122L104 124" stroke="url(#g-goldm)" stroke-width="4" fill="none" stroke-linecap="round"/>
        <circle cx="60" cy="140" r="2.5" fill="${dk}"/>
        ${suitUse(suit, 116, 60, 38)}`;
    } else {
      fig = `<path d="M64 238L72 172Q100 160 128 172L136 238Z" fill="${col}" stroke="${dk}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M70 204H130" stroke="url(#g-goldm)" stroke-width="5"/>
        <circle cx="100" cy="140" r="21" fill="url(#g-skin)" stroke="#5a3418" stroke-width="2.5"/>
        <path d="M79 140C78 120 88 116 100 116S122 120 121 140C118 128 110 126 100 126S82 128 79 140Z" fill="#6a3a1a"/>
        <ellipse cx="96" cy="118" rx="27" ry="9" fill="${dk}" stroke="#1a1020" stroke-width="2"/>
        <path d="M116 114C130 96 140 92 150 94C140 100 132 108 122 118" fill="#fffaf0" stroke="${dk}" stroke-width="2"/>
        <circle cx="93" cy="141" r="2.4" fill="#2a1a10"/><circle cx="107" cy="141" r="2.4" fill="#2a1a10"/>
        <path d="M94 151Q100 155 106 151" stroke="#7a3a20" stroke-width="2" fill="none"/>
        ${suitUse(suit, 82, 172, 36)}`;
    }
    const nm = { 10: 'SOTA', 11: 'CABALLO', 12: 'REY' }[rank];
    return `${arch}${fig}<rect x="42" y="218" width="116" height="20" fill="${dk}"/><text x="100" y="233" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="13" fill="#fff6dc" letter-spacing="2">${nm}</text>`;
  }

  function stoneFace() {
    let specks = '';
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 40; i++) specks += `<circle cx="${(rnd() * 180 + 10).toFixed(1)}" cy="${(rnd() * 260 + 10).toFixed(1)}" r="${(rnd() * 3 + 0.6).toFixed(1)}" fill="${rnd() > 0.5 ? '#4a463f' : '#b8b2a6'}" opacity=".6"/>`;
    return `<rect x="2" y="2" width="196" height="276" rx="14" fill="url(#g-piedra)"/>${specks}
      <path d="M30 60l40 30 20-14 30 40 50-20M20 180l40-10 30 30 60-20" stroke="#4a463f" stroke-width="2" fill="none" opacity=".5"/>
      <rect x="10" y="10" width="180" height="260" rx="10" fill="none" stroke="#3a3630" stroke-width="2.5" opacity=".6"/>
      <text x="100" y="150" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="40" fill="#3a3630" opacity=".55">+50</text>`;
  }

  const ENH_BADGE = { ambar: 'bee', rubi: 'gem', cristal: 'prism', oro: 'coin', hierro: 'anvil', prisma: 'prism', fortuna: 'clover' };
  const ENH_COL = { ambar: '#b6740c', rubi: '#b0203a', cristal: '#2a8ab0', oro: '#9a620c', hierro: '#3a4656', prisma: '#8a4ad0', fortuna: '#2f8a2f' };

  BR.Art = {};
  BR.Art.cardSVG = function (c) {
    if (c.enh === 'piedra') return `<svg viewBox="0 0 200 280" class="cv">${stoneFace()}${sealSVG(c)}</svg>`;
    const S = BR.SUIT_INFO[c.suit];
    const col = S.color, dk = S.dark;
    const paper = c.enh ? PAPER[c.enh] : 'g-paper';
    const solid = PAPER_SOLID[c.enh || 'none'];
    const R = BR.RANK_INFO[c.rank];
    let center = '';
    if (c.rank === 1) {
      center = `<circle cx="100" cy="140" r="66" fill="${col}" fill-opacity=".08" stroke="${col}" stroke-width="2" stroke-dasharray="3 6"/>
        <g stroke="${col}" stroke-opacity=".35" stroke-width="2">${Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return `<path d="M${100 + Math.cos(a) * 60} ${140 + Math.sin(a) * 60}L${100 + Math.cos(a) * 72} ${140 + Math.sin(a) * 72}"/>`; }).join('')}</g>
        ${suitUse(c.suit, 44, 84, 112)}`;
    } else if (c.rank >= 10) center = figure(c.rank, c.suit);
    else {
      const sz = c.rank <= 3 ? 50 : c.rank <= 5 ? 44 : 40;
      center = PIPS[c.rank].map(([x, y]) => suitUse(c.suit, x - sz / 2, y - sz / 2, sz)).join('');
    }
    const n = PINTAS[c.suit];
    let gaps = '';
    for (let i = 0; i < n; i++) { const x = 100 + (i - (n - 1) / 2) * 18 - 5; gaps += `<rect x="${x}" y="9" width="10" height="7" fill="${solid}"/><rect x="${x}" y="264" width="10" height="7" fill="${solid}"/>`; }
    const idx = `<text x="25" y="47" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="${R.short.length > 1 ? 30 : 36}" fill="${dk}">${R.short}</text>${suitUse(c.suit, 11, 52, 28)}`;
    const border = c.enh === 'prisma' ? 'url(#g-prisma)' : col;
    let badge = '';
    if (c.enh && ENH_BADGE[c.enh]) badge = `<g transform="translate(160 14)"><circle cx="13" cy="13" r="14" fill="#fffaf0" stroke="${ENH_COL[c.enh]}" stroke-width="2.5"/><g transform="translate(2 2) scale(.34)" stroke="${ENH_COL[c.enh]}" fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${BR.ICONS[ENH_BADGE[c.enh]]}</g></g>`;
    return `<svg viewBox="0 0 200 280" class="cv">
      <rect x="2" y="2" width="196" height="276" rx="14" fill="url(#${paper})" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
      ${c.enh === 'fortuna' ? `<g opacity=".12" transform="translate(52 92) scale(1.5)" stroke="#1a6a1a" stroke-width="3" fill="none">${BR.ICONS.clover}</g>` : ''}
      <rect x="12" y="12" width="176" height="256" rx="9" fill="none" stroke="${border}" stroke-width="${c.enh === 'prisma' ? 6 : 3}"/>
      ${gaps}
      ${center}
      ${idx}
      <g transform="rotate(180 100 140)">${idx}</g>
      ${badge}
      ${c.bonus ? `<g><rect x="70" y="248" width="60" height="18" rx="9" fill="#2e6fd8"/><text x="100" y="262" text-anchor="middle" font-family="Outfit, sans-serif" font-weight="700" font-size="13" fill="#fff">+${c.bonus}</text></g>` : ''}
      ${sealSVG(c)}
    </svg>`;
  };
  function sealSVG(c) {
    if (!c.seal) return '';
    const col = BR.SEALS[c.seal].color;
    return `<g transform="translate(14 222)"><path d="M18 0l5 5 7-1 1 7 5 5-5 5-1 7-7-1-5 5-5-5-7 1-1-7-5-5 5-5 1-7 7 1z" fill="${col}" stroke="rgba(0,0,0,.45)" stroke-width="2"/><circle cx="18" cy="18" r="9" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/><path d="M18 12l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" fill="rgba(255,255,255,.75)"/></g>`;
  }

  BR.Art.backSVG = function (deckId) {
    const D = BR.DECK_BY_ID[deckId] || BR.DECKS[0];
    const c1 = D.color, c2 = D.color2;
    let pat = '';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) pat += `<path d="M${22 + x * 31} ${26 + y * 33}l6 8-6 8-6-8z" fill="${c2}" opacity=".18"/>`;
    return `<svg viewBox="0 0 200 280" class="cv">
      <defs><linearGradient id="bk-${D.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="#140c24"/></linearGradient></defs>
      <rect x="2" y="2" width="196" height="276" rx="14" fill="url(#bk-${D.id})" stroke="#0a0614" stroke-width="2"/>
      ${pat}
      <rect x="12" y="12" width="176" height="256" rx="9" fill="none" stroke="${c2}" stroke-width="2.5" opacity=".9"/>
      <rect x="18" y="18" width="164" height="244" rx="6" fill="none" stroke="#f2c96b" stroke-width="1.2" opacity=".7"/>
      <circle cx="100" cy="140" r="46" fill="#140c24" fill-opacity=".55" stroke="#f2c96b" stroke-width="2.5"/>
      <g fill="#f2c96b"><path d="M100 98l9 33 33 9-33 9-9 33-9-33-33-9 33-9z"/></g>
      <g fill="${c2}" opacity=".9"><path d="M100 116l4 18 18 6-18 6-4 18-4-18-18-6 18-6z"/></g>
      <circle cx="100" cy="140" r="5" fill="#fff6dc"/>
      <text x="100" y="250" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="14" fill="#f2c96b" letter-spacing="5">BRISKA</text>
    </svg>`;
  };

  BR.Art.talismanHTML = function (t) {
    const d = BR.TAL_BY_ID[t.id];
    const rc = BR.RARITY[d.rarity].color;
    const len = d.name.length;
    return `<div class="tface r${d.rarity}" style="--h:${d.hue};--rc:${rc}">
      <svg class="tframe" viewBox="0 0 200 280"><use href="#tal-frame"/></svg>
      ${BR.icon(d.icon, 'ticon')}
      <div class="tname ${len > 14 ? 'long' : ''}">${d.name}</div>
    </div>`;
  };

  function starPattern(id) {
    let s = BR.hashSeed('const-' + id);
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const n = 5 + Math.floor(rnd() * 3);
    const pts = [];
    for (let i = 0; i < n; i++) pts.push([30 + rnd() * 140, 50 + rnd() * 140]);
    pts.sort((a, b) => a[0] - b[0]);
    let lines = '';
    for (let i = 1; i < pts.length; i++) lines += `<path d="M${pts[i - 1][0].toFixed(1)} ${pts[i - 1][1].toFixed(1)}L${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}"/>`;
    if (n > 5) lines += `<path d="M${pts[1][0].toFixed(1)} ${pts[1][1].toFixed(1)}L${pts[n - 2][0].toFixed(1)} ${pts[n - 2][1].toFixed(1)}" stroke-dasharray="3 5"/>`;
    let stars = '';
    for (let i = 0; i < 26; i++) stars += `<circle cx="${(rnd() * 190 + 5).toFixed(1)}" cy="${(rnd() * 270 + 5).toFixed(1)}" r="${(rnd() * 1.2 + 0.3).toFixed(1)}" fill="#fff" opacity="${(rnd() * 0.6 + 0.2).toFixed(2)}"/>`;
    const big = pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#fff6d0"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" fill="#9fd8ff" opacity=".25"/>`).join('');
    return `${stars}<g stroke="#9fd8ff" stroke-width="2" opacity=".75" fill="none">${lines}</g>${big}`;
  }

  BR.Art.consHTML = function (k) {
    const d = BR.consDef(k);
    if (k.type === 'con') {
      return `<div class="cface con"><svg viewBox="0 0 200 280" class="cv">
        <rect x="2" y="2" width="196" height="276" rx="14" fill="#0b1640"/>
        <rect x="2" y="2" width="196" height="276" rx="14" fill="url(#g-blade)" opacity=".18"/>
        ${starPattern(k.id)}
        <rect x="9" y="9" width="182" height="262" rx="10" fill="none" stroke="#9fd8ff" stroke-width="2" opacity=".7"/>
      </svg><div class="cname">${d.name}</div><div class="csub">${BR.HANDS[d.hand].name}</div></div>`;
    }
    if (k.type === 'aug') {
      return `<div class="cface aug"><svg viewBox="0 0 200 280" class="cv">
        <rect x="9" y="9" width="182" height="262" rx="10" fill="none" stroke="#e6c8ff" stroke-width="2" opacity=".75"/>
        <rect x="16" y="16" width="168" height="248" rx="6" fill="none" stroke="#f2c96b" stroke-width="1.2" opacity=".6"/>
        <text x="100" y="44" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="18" fill="#f2c96b" letter-spacing="2">${d.num || ''}</text>
        <circle cx="100" cy="128" r="54" fill="rgba(255,255,255,.06)" stroke="#e6c8ff" stroke-width="1.5" stroke-dasharray="2 5"/>
      </svg>${BR.icon(d.icon, 'cicon')}<div class="cname">${d.name}</div></div>`;
    }
    return `<div class="cface ani"><svg viewBox="0 0 200 280" class="cv">
        <rect x="9" y="9" width="182" height="262" rx="10" fill="none" stroke="#9ff5e6" stroke-width="2" opacity=".7"/>
        <circle cx="100" cy="128" r="60" fill="rgba(160,255,240,.08)"/>
      </svg>${BR.icon(d.icon, 'cicon')}<div class="cname">${d.name}</div></div>`;
  };

  BR.Art.packHTML = function (p) {
    const K = BR.PACK_KINDS[p.pack];
    const sz = BR.PACK_SIZES[p.size];
    return `<div class="pface" style="--p1:${K.color};--p2:${K.color2}">
      <div class="pcrimp top"></div><div class="pcrimp bot"></div>
      <div class="pshine"></div>
      ${BR.icon(K.icon, 'picon')}
      <div class="pname">${K.name.replace('Sobre ', 'Sobre<br>')}</div>
      ${sz.name ? `<div class="psize">${sz.name}</div>` : ''}
    </div>`;
  };

  BR.Art.voucherHTML = function (v) {
    const d = BR.VOUCHER_BY_ID[v.id];
    return `<div class="vface"><div class="vperf l"></div><div class="vperf r"></div>
      ${BR.icon(d.icon, 'vicon')}<div class="vname">${d.name}</div><div class="vlabel">Privilegio</div></div>`;
  };

  BR.Art.tagHTML = function (id) {
    const d = BR.TAG_BY_ID[id];
    return `<div class="tagbadge" data-tag="${id}">${BR.icon(d.icon)}</div>`;
  };

  BR.Art.bossMedal = function (bossId, size) {
    const b = BR.BOSS_BY_ID[bossId];
    return `<div class="medal boss" style="--mc:${b.color};${size ? '--ms:' + size + 'px' : ''}">${BR.icon(b.icon)}</div>`;
  };
  BR.Art.blindMedal = function (kind, size) {
    const col = BR.RIVALS[kind].color;
    return `<div class="medal" style="--mc:${col};${size ? '--ms:' + size + 'px' : ''}">${BR.icon(kind === 'small' ? 'coin' : 'sun')}</div>`;
  };
  BR.Art.suitIcon = (s, size) => `<svg class="suitico" viewBox="0 0 100 100" width="${size || 20}" height="${size || 20}"><use href="#s-${s}"/></svg>`;
})(globalThis.BR = globalThis.BR || {});
