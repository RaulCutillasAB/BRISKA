/* BRISKA — Augurios, Constelaciones y Ánimas */
(function (BR) {
  'use strict';

  const ENH_NAME = (e) => BR.ENH[e].name;

  /* ======================= AUGURIOS ======================= */
  const A = [];
  const aug = (o) => { o.type = 'aug'; A.push(o); return o; };

  const enhAug = (id, name, enh, max, icon, num) => aug({ id, name, icon, num,
    text: () => `Convierte ${max > 1 ? 'hasta ' + max + ' cartas seleccionadas' : '1 carta seleccionada'} en {k${ENH_NAME(enh)}}`,
    sel: [1, max],
    use: (g, cards) => { for (const c of cards) { c.enh = enh; } return { changed: cards }; } });
  enhAug('abeja', 'La Abeja', 'ambar', 2, 'bee', 'I');
  enhAug('brasa', 'La Brasa', 'rubi', 2, 'flame', 'II');
  enhAug('vidriero', 'El Vidriero', 'cristal', 1, 'gem', 'III');
  enhAug('cantero', 'El Cantero', 'piedra', 1, 'mountain', 'IV');
  enhAug('orfebre', 'El Orfebre', 'oro', 2, 'coin', 'V');
  enhAug('fragua', 'La Fragua', 'hierro', 2, 'anvil', 'VI');
  enhAug('arcoiris', 'El Arcoíris', 'prisma', 1, 'prism', 'VII');
  enhAug('fortuna', 'La Fortuna', 'fortuna', 2, 'clover', 'VIII');

  const suitAug = (id, name, suit, icon, num) => aug({ id, name, icon, num,
    text: () => `Convierte hasta 3 cartas seleccionadas al palo de {s${suit}}`,
    sel: [1, 3],
    use: (g, cards) => { for (const c of cards) c.suit = suit; return { changed: cards }; } });
  suitAug('tesoro', 'El Tesoro', 'oros', 'sun', 'IX');
  suitAug('fuente', 'La Fuente', 'copas', 'cup', 'X');
  suitAug('batalla', 'La Batalla', 'espadas', 'sword', 'XI');
  suitAug('bosque', 'El Bosque', 'bastos', 'tree', 'XII');

  aug({ id: 'ascenso', name: 'El Ascenso', icon: 'stairs', num: 'XIII',
    text: () => 'Sube {k1 valor} hasta 2 cartas seleccionadas (el Rey pasa a As)', sel: [1, 2],
    use: (g, cards) => { for (const c of cards) { const o = BR.RANK_INFO[c.rank].ord; c.rank = BR.ORD_TO_RANK[(o + 1) % 10]; } return { changed: cards }; } });
  aug({ id: 'tijera', name: 'La Tijera', icon: 'scissors', num: 'XIV',
    text: () => '{kDestruye} hasta 2 cartas seleccionadas', sel: [1, 2],
    use: (g, cards) => { g.destroyCards(cards); return { destroyed: cards }; } });
  aug({ id: 'espejo', name: 'El Espejo', icon: 'mirror', num: 'XV',
    text: () => 'Selecciona 2 cartas: la de la {kizquierda} se convierte en copia de la de la {kderecha}', sel: [2, 2],
    use: (g, cards) => { const [a, b] = cards; Object.assign(a, { suit: b.suit, rank: b.rank, enh: b.enh, seal: b.seal, ed: b.ed, bonus: b.bonus || 0 }); return { changed: [a] }; } });
  aug({ id: 'hucha', name: 'La Hucha', icon: 'piggy', num: 'XVI',
    text: () => 'Duplica tu dinero (máximo {$+$20})', sel: null,
    use: (g) => { const v = Math.max(0, Math.min(20, g.money)); g.money += v; return { money: v }; } });
  aug({ id: 'tasador', name: 'El Tasador', icon: 'scale', num: 'XVII',
    text: (g) => `Gana el valor de venta de tus Talismanes (máximo {$$50})${g ? ' (ahora {$$' + Math.min(50, g.talismans.reduce((s, t) => s + g.sellValue(t), 0)) + '})' : ''}`, sel: null,
    use: (g) => { const v = Math.min(50, g.talismans.reduce((s, t) => s + g.sellValue(t), 0)); g.money += v; return { money: v }; } });
  aug({ id: 'rueda', name: 'La Ruleta', icon: 'wheel', num: 'XVIII',
    text: () => '{p1 entre 4} de dar una edición ({kBrillante}, {kIridiscente} o {kAurora}) a un Talismán al azar', sel: null,
    can: (g) => g.talismans.some((t) => !t.ed),
    use: (g) => {
      const pool = g.talismans.filter((t) => !t.ed);
      if (!g.roll(1, 4)) return { msg: '¡Nada!' };
      const t = g.rng.pick(pool); t.ed = g.rng.weighted(['brillante', 'iridiscente', 'aurora'], (e) => ({ brillante: 50, iridiscente: 35, aurora: 15 }[e]));
      return { talisman: t, msg: '¡' + BR.EDITIONS[t.ed].name + '!' };
    } });
  aug({ id: 'profecia', name: 'La Profecía', icon: 'moon', num: 'XIX',
    text: () => 'Crea hasta {k2 Constelaciones} aleatorias (si hay espacio)', sel: null,
    can: (g) => g.consSpace() > 0,
    use: (g) => { for (let i = 0; i < 2; i++) g.addConsumable(g.randomConst()); return {}; } });
  aug({ id: 'invocacion', name: 'La Invocación', icon: 'hand', num: 'XX',
    text: () => 'Crea un {kTalismán} aleatorio (si hay espacio)', sel: null,
    can: (g) => g.talismans.length < g.talSlots(),
    use: (g) => { const t = g.newTalisman(g.randomTalismanId()); g.addTalisman(t); return { talisman: t }; } });
  aug({ id: 'oraculo', name: 'El Oráculo', icon: 'eye2', num: 'XXI',
    text: () => 'Crea hasta {k2 Augurios} aleatorios (si hay espacio)', sel: null,
    can: (g) => g.consSpace() > 0,
    use: (g) => { for (let i = 0; i < 2; i++) g.addConsumable(g.randomAugurio(['oraculo'])); return {}; } });
  aug({ id: 'repeticion', name: 'La Repetición', icon: 'echo', num: 'XXII',
    text: (g) => `Crea una copia del último Augurio o Constelación usado${g && g.lastCons ? ' ({k' + BR.consDef(g.lastCons).name + '})' : ''}`, sel: null,
    can: (g) => !!g.lastCons && g.consSpace() > 0,
    use: (g) => { g.addConsumable({ ...g.lastCons }); return {}; } });
  aug({ id: 'veleta', name: 'La Veleta', icon: 'vane', num: 'XXIII',
    text: () => 'Selecciona 1 carta: su palo será el {kTriunfo} durante esta ronda y la siguiente', sel: [1, 1],
    can: (g) => g.phase === 'round' || g.phase === 'pack',
    use: (g, cards) => { const s = cards[0].suit; if (cards[0].enh === 'piedra') return { msg: 'Sin palo' }; g.trumpLock = { suit: s, n: 1 }; if (g.phase === 'round') g.r.trump = s; return { msg: 'Triunfo: ' + BR.SUIT_INFO[s].name, trump: true }; } });

  /* ===================== CONSTELACIONES ===================== */
  const CONST_NAMES = {
    alta: 'Lira', pareja: 'Géminis', doble: 'Pléyades', trio: 'Triángulo', escalera: 'Serpiente', color: 'Cisne',
    full: 'Casiopea', poker: 'Cruz del Sur', escolor: 'Orión', repoker: 'Hidra', fullcolor: 'Pegaso', repcolor: 'Andrómeda',
  };
  const C = BR.HAND_ORDER.slice().reverse().map((h) => ({
    id: h, type: 'con', name: CONST_NAMES[h], hand: h, sel: null,
    text: (g) => {
      const H = BR.HANDS[h]; const lv = g ? g.handLevels[h].lvl : 1;
      return `Sube de nivel {k${H.name}}${g ? ' (nv. ' + lv + ' → ' + (lv + 1) + ')' : ''}: {c+${H.lc}} Fichas y {m+${H.lm}} Mult`;
    },
    use: (g) => { g.levelUp(h, 1); return { levelUp: h }; },
  }));

  /* ======================== ÁNIMAS ======================== */
  const S = [];
  const ani = (o) => { o.type = 'ani'; S.push(o); return o; };
  ani({ id: 'cripta', name: 'La Cripta', icon: 'skull', w: 0.15,
    text: () => 'Crea un Talismán {kLegendario} (si hay espacio)', sel: null,
    can: (g) => g.talismans.length < g.talSlots(),
    use: (g) => { const t = g.newTalisman(g.rng.pick(BR.TALISMANS.filter((x) => x.legendary)).id); g.addTalisman(t); return { talisman: t }; } });
  ani({ id: 'velo', name: 'El Velo', icon: 'veil',
    text: () => 'Da {kAurora} a un Talismán al azar y {kdestruye} todos los demás', sel: null,
    can: (g) => g.talismans.some((t) => !t.ed),
    use: (g) => { const pool = g.talismans.filter((t) => !t.ed); const t = g.rng.pick(pool); t.ed = 'aurora'; for (const o of g.talismans.slice()) if (o !== t) g.destroyTalisman(o); return { talisman: t }; } });
  ani({ id: 'espectro', name: 'El Espectro', icon: 'ghost',
    text: () => 'Da {kEclipse} a un Talismán al azar. {k−1} carta en la mano para siempre', sel: null,
    can: (g) => g.talismans.some((t) => !t.ed),
    use: (g) => { const pool = g.talismans.filter((t) => !t.ed); const t = g.rng.pick(pool); t.ed = 'eclipse'; g.base.handSize -= 1; return { talisman: t }; } });
  ani({ id: 'duplicado', name: 'El Duplicado', icon: 'twin',
    text: () => 'Crea una copia de un Talismán al azar y {kdestruye} los demás', sel: null,
    can: (g) => g.talismans.length > 0,
    use: (g) => { const t = g.rng.pick(g.talismans); for (const o of g.talismans.slice()) if (o !== t) g.destroyTalisman(o); const c = g.newTalisman(t.id); c.ed = t.ed === 'eclipse' ? null : t.ed; c.st = JSON.parse(JSON.stringify(t.st)); g.addTalisman(c, true); return { talisman: c }; } });
  for (const [sid, nm] of [['carmesi', 'Sello del Eco'], ['zafiro', 'Sello Estelar'], ['dorado', 'Sello del Mercader'], ['violeta', 'Sello del Augur']]) {
    ani({ id: 'sello_' + sid, name: nm, icon: 'seal', seal: sid,
      text: () => `Añade un {k${BR.SEALS[sid].name}} a 1 carta seleccionada`, sel: [1, 1],
      use: (g, cards) => { cards[0].seal = sid; return { changed: cards }; } });
  }
  ani({ id: 'agujero', name: 'La Gran Conjunción', icon: 'blackhole', w: 0.4,
    text: () => 'Sube {k1 nivel} todas las manos', sel: null,
    use: (g) => { for (const h of BR.HAND_ORDER) g.levelUp(h, 1); return { levelUpAll: true }; } });
  ani({ id: 'inmolacion', name: 'La Quema', icon: 'flame', 
    text: () => '{kDestruye} 5 cartas al azar de tu mano y gana {$$20}', sel: null,
    can: (g) => g.hand.length > 0,
    use: (g) => { const cs = g.rng.shuffle(g.handCards().slice()).slice(0, 5); g.destroyCards(cs); g.money += 20; return { destroyed: cs, money: 20 }; } });
  ani({ id: 'ofrenda', name: 'La Ofrenda', icon: 'chalice',
    text: () => '{kDestruye} 1 carta al azar de tu mano y añade 3 {kfiguras} mejoradas', sel: null,
    can: (g) => g.hand.length > 0,
    use: (g) => {
      const d = g.rng.pick(g.handCards()); g.destroyCards([d]);
      const added = [];
      for (let i = 0; i < 3; i++) { const c = g.makeCard(g.rng.pick(BR.SUITS), g.rng.pick([10, 11, 12])); c.enh = g.rng.pick(Object.keys(BR.ENH).filter((e) => e !== 'piedra')); g.addCardToDeck(c, 'hand'); added.push(c); }
      return { destroyed: [d], added };
    } });
  ani({ id: 'clon', name: 'El Clon', icon: 'twin2',
    text: () => 'Crea {k2 copias} de 1 carta seleccionada en tu mano', sel: [1, 1],
    use: (g, cards) => { const added = []; for (let i = 0; i < 2; i++) { const c = g.makeCard(cards[0].suit, cards[0].rank); Object.assign(c, { enh: cards[0].enh, seal: cards[0].seal, ed: cards[0].ed, bonus: cards[0].bonus || 0 }); g.addCardToDeck(c, 'hand'); added.push(c); } return { added }; } });
  ani({ id: 'aura', name: 'El Halo', icon: 'aurora',
    text: () => 'Da {kBrillante}, {kIridiscente} o {kAurora} a 1 carta seleccionada', sel: [1, 1],
    use: (g, cards) => { cards[0].ed = g.rng.weighted(['brillante', 'iridiscente', 'aurora'], (e) => ({ brillante: 50, iridiscente: 35, aurora: 15 }[e])); return { changed: cards }; } });
  ani({ id: 'sigilo', name: 'La Runa', icon: 'rune',
    text: () => 'Convierte todas las cartas de tu mano a un mismo {kpalo} aleatorio', sel: null,
    can: (g) => g.hand.length > 0,
    use: (g) => { const s = g.rng.pick(BR.SUITS); const cs = g.handCards(); for (const c of cs) c.suit = s; return { changed: cs }; } });
  ani({ id: 'ouija', name: 'La Tabla Parlante', icon: 'planchette',
    text: () => 'Convierte todas las cartas de tu mano a un mismo {kvalor} aleatorio. {k−1} carta en la mano', sel: null,
    can: (g) => g.hand.length > 0,
    use: (g) => { const r = g.rng.pick(BR.RANKS); const cs = g.handCards(); for (const c of cs) c.rank = r; g.base.handSize -= 1; return { changed: cs }; } });

  BR.AUGURIOS = A;
  BR.CONSTS = C;
  BR.ANIMAS = S;
  BR.CONST_BY_ID = Object.fromEntries(C.map((x) => [x.id, x]));
  BR.AUG_BY_ID = Object.fromEntries(A.map((x) => [x.id, x]));
  BR.ANI_BY_ID = Object.fromEntries(S.map((x) => [x.id, x]));
  BR.consDef = (c) => (c.type === 'aug' ? BR.AUG_BY_ID[c.id] : c.type === 'con' ? BR.CONST_BY_ID[c.id] : BR.ANI_BY_ID[c.id]);
})(globalThis.BR = globalThis.BR || {});
