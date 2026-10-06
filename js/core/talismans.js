/* BRISKA — Talismanes (comodines). Cada uno con su propia identidad. */
(function (BR) {
  'use strict';
  const T = [];
  const def = (o) => { T.push(o); return o; };
  const HN = (k) => BR.HANDS[k].name;
  const fx = BR.fmtNum;

  /* ======================= COMUNES ======================= */
  def({ id: 'chispa', name: 'La Chispa', rarity: 1, cost: 2, icon: 'spark', hue: 18,
    text: () => '{m+4} Mult', hand: () => ({ mult: 4 }) });

  const suitT = (id, name, suit, icon, hue) => def({ id, name, rarity: 1, cost: 5, icon, hue,
    text: () => `Las cartas de {s${suit}} dan {m+3} Mult al puntuar`,
    card: (ctx, t, g, c) => (g.suitIs(c, suit) ? { mult: 3 } : null) });
  suitT('avaro', 'Moneda Avara', 'oros', 'coin', 42);
  suitT('sediento', 'Cáliz Sediento', 'copas', 'cup', 350);
  suitT('hambriento', 'Filo Hambriento', 'espadas', 'sword', 215);
  suitT('terco', 'Raíz Terca', 'bastos', 'staff', 130);

  const typeMult = (id, name, type, v, icon, hue, cost) => def({ id, name, rarity: 1, cost: cost || 4, icon, hue,
    text: () => `{m+${v}} Mult si la mano jugada contiene {k${HN(type)}}`,
    hand: (ctx) => (ctx.contains[type] ? { mult: v } : null) });
  typeMult('gemelos', 'Los Gemelos', 'pareja', 8, 'twins', 280, 3);
  typeMult('treslunas', 'Tres Lunas', 'trio', 12, 'moons', 250);
  typeMult('brujula', 'La Brújula', 'escalera', 12, 'compass', 190);
  typeMult('abanico', 'El Abanico', 'color', 10, 'fan', 330);
  typeMult('faroles', 'Dos Faroles', 'doble', 10, 'lanterns', 30);

  const typeChips = (id, name, type, v, icon, hue) => def({ id, name, rarity: 1, cost: 4, icon, hue,
    text: () => `{c+${v}} Fichas si la mano jugada contiene {k${HN(type)}}`,
    hand: (ctx) => (ctx.contains[type] ? { chips: v } : null) });
  typeChips('collar', 'Collar de Perlas', 'pareja', 50, 'pearls', 200);
  typeChips('triptico', 'El Tríptico', 'trio', 100, 'triptych', 40);
  typeChips('sendero', 'El Sendero', 'escalera', 100, 'path', 100);
  typeChips('panuelo', 'Pañuelo de Seda', 'color', 80, 'scarf', 300);
  typeChips('espejos', 'Dos Espejos', 'doble', 80, 'mirror', 170);

  def({ id: 'ligera', name: 'Mano Ligera', rarity: 1, cost: 5, icon: 'feather', hue: 60,
    text: () => '{m+20} Mult si juegas {k3 cartas o menos}',
    hand: (ctx) => (ctx.cards.length <= 3 ? { mult: 20 } : null) });

  def({ id: 'hucha', name: 'Hucha de Barro', rarity: 1, cost: 6, icon: 'piggy', hue: 20,
    text: () => 'Gana {$$4} al final de cada ronda',
    roundEnd: () => ({ money: 4 }) });

  def({ id: 'trebol', name: 'Trébol Errante', rarity: 1, cost: 4, icon: 'clover', hue: 120,
    text: () => '{m+0} a {m+23} Mult al azar',
    hand: (ctx, t, g) => ({ mult: g.rng.int(0, 23) }) });

  def({ id: 'vela', name: 'Vela Encendida', rarity: 1, cost: 5, icon: 'candle', hue: 35,
    init: () => ({ v: 20 }),
    text: (t) => `{m+${t.st.v}} Mult. Pierde {m4} Mult al final de cada ronda`,
    hand: (ctx, t) => ({ mult: t.st.v }),
    roundEnd: (t, g) => { t.st.v -= 4; if (t.st.v <= 0) { g.destroyTalisman(t, 'Consumida'); return { msg: '¡Consumida!' }; } return { msg: '−4', color: 'm' }; } });

  def({ id: 'pan', name: 'Pan del Día', rarity: 1, cost: 5, icon: 'bread', hue: 38,
    init: () => ({ v: 100 }),
    text: (t) => `{c+${t.st.v}} Fichas. Pierde {c5} Fichas por cada mano jugada`,
    hand: (ctx, t) => ({ chips: t.st.v }),
    after: (ctx, t, g) => { t.st.v -= 5; if (t.st.v <= 0) { g.destroyTalisman(t, 'Duro'); return { msg: '¡Se acabó!' }; } return { msg: '−5', color: 'c' }; } });

  def({ id: 'banquero', name: 'El Banquero', rarity: 1, cost: 6, icon: 'scale', hue: 48,
    text: (t, g) => `{c+2} Fichas por cada {$$1} que tengas ${g ? '(ahora {c+' + Math.max(0, g.money * 2) + '})' : ''}`,
    hand: (ctx, t, g) => (g.money > 0 ? { chips: g.money * 2 } : null) });

  def({ id: 'figurin', name: 'Figurín', rarity: 1, cost: 4, icon: 'mask', hue: 270,
    text: () => 'Las {kfiguras} dan {c+30} Fichas al puntuar',
    card: (ctx, t, g, c) => (g.isFace(c) ? { chips: 30 } : null) });

  def({ id: 'corte', name: 'La Corte', rarity: 1, cost: 4, icon: 'crown', hue: 45,
    text: () => 'Las {kfiguras} dan {m+5} Mult al puntuar',
    card: (ctx, t, g, c) => (g.isFace(c) ? { mult: 5 } : null) });

  def({ id: 'pares', name: 'Los Pares', rarity: 1, cost: 4, icon: 'even', hue: 200,
    text: () => 'Las cartas de valor {kpar} (2, 4, 6, Sota, Rey) dan {m+4} Mult',
    card: (ctx, t, g, c) => (c.enh !== 'piedra' && [2, 4, 6, 10, 12].includes(c.rank) ? { mult: 4 } : null) });

  def({ id: 'impares', name: 'Los Impares', rarity: 1, cost: 4, icon: 'odd', hue: 20,
    text: () => 'Las cartas de valor {kimpar} (As, 3, 5, 7, Caballo) dan {c+31} Fichas',
    card: (ctx, t, g, c) => (c.enh !== 'piedra' && [1, 3, 5, 7, 11].includes(c.rank) ? { chips: 31 } : null) });

  def({ id: 'manga', name: 'As en la Manga', rarity: 1, cost: 4, icon: 'ace', hue: 0,
    text: () => 'Los {kAses} dan {c+20} Fichas y {m+4} Mult al puntuar',
    card: (ctx, t, g, c) => (c.enh !== 'piedra' && c.rank === 1 ? { chips: 20, mult: 4 } : null) });

  def({ id: 'tres', name: 'El Tres de Brisca', rarity: 1, cost: 5, icon: 'three', hue: 15,
    text: () => 'Cada {k3} que puntúa da {m+6} Mult. ¡En la brisca, el tres manda!',
    card: (ctx, t, g, c) => (c.enh !== 'piedra' && c.rank === 3 ? { mult: 6 } : null) });

  def({ id: 'pregon', name: 'El Pregón', rarity: 1, cost: 5, icon: 'horn', hue: 28,
    text: () => 'Las cartas del palo de {kTriunfo} dan {m+4} Mult extra al puntuar',
    card: (ctx, t, g, c) => (g.isTrump(c) ? { mult: 4 } : null) });

  def({ id: 'estandarte', name: 'El Pendón', rarity: 1, cost: 5, icon: 'flag', hue: 355,
    text: (t, g) => `{c+30} Fichas por cada {kDescarte} que te quede`,
    hand: (ctx, t, g) => (g.r.discardsLeft > 0 ? { chips: 30 * g.r.discardsLeft } : null) });

  def({ id: 'aliento', name: 'Último Aliento', rarity: 1, cost: 5, icon: 'wind', hue: 180,
    text: () => '{m+15} Mult si no te quedan {kDescartes}',
    hand: (ctx, t, g) => (g.r.discardsLeft === 0 ? { mult: 15 } : null) });

  def({ id: 'pozo', name: 'Pozo Profundo', rarity: 1, cost: 5, icon: 'well', hue: 210,
    text: (t, g) => `{c+2} Fichas por cada carta que quede en tu mazo${g && g.r ? ' (ahora {c+' + g.drawPile.length * 2 + '})' : ''}`,
    hand: (ctx, t, g) => ({ chips: g.drawPile.length * 2 }) });

  def({ id: 'telescopio', name: 'Catalejo', rarity: 1, cost: 5, icon: 'scope', hue: 230,
    text: () => '{p1 entre 4} de subir de nivel la mano que juegues',
    before: (ctx, t, g) => { if (g.roll(1, 4)) { g.levelUp(ctx.type, 1); return { msg: '¡Nivel!', color: 'k' }; } return null; } });

  def({ id: 'cosecha', name: 'La Cosecha', rarity: 1, cost: 5, icon: 'wheat', hue: 75,
    init: () => ({ v: 0 }),
    text: (t) => `Gana {m+1} Mult por mano jugada y pierde {m1} por descarte (ahora {m+${t.st.v}})`,
    before: (ctx, t) => { t.st.v += 1; return { msg: '+1', color: 'm' }; },
    hand: (ctx, t) => (t.st.v > 0 ? { mult: t.st.v } : null),
    discard: (t) => { if (t.st.v > 0) { t.st.v -= 1; return { msg: '−1', color: 'm' }; } return null; } });

  def({ id: 'cuervo', name: 'El Cuervo', rarity: 1, cost: 4, icon: 'crow', hue: 260,
    text: () => 'Gana {$$5} si descartas {k3 o más figuras} a la vez',
    discard: (t, g, cards) => (cards.filter((c) => g.isFace(c)).length >= 3 ? { money: 5 } : null) });

  def({ id: 'paciencia', name: 'Paciencia', rarity: 1, cost: 4, icon: 'hourglass', hue: 40,
    text: () => 'Gana {$$2} por cada Descarte sin usar si no descartaste en la ronda',
    roundEnd: (t, g) => (g.r.discardsUsed === 0 && g.r.discardsLeft > 0 ? { money: 2 * g.r.discardsLeft } : null) });

  def({ id: 'toro', name: 'La Embestida', rarity: 1, cost: 6, icon: 'bull', hue: 5,
    text: (t, g) => `{m+1} Mult por cada {$$3} que tengas${g ? ' (ahora {m+' + Math.max(0, Math.floor(g.money / 3)) + '})' : ''}`,
    hand: (ctx, t, g) => (g.money >= 3 ? { mult: Math.floor(g.money / 3) } : null) });

  def({ id: 'calle', name: 'Calle sin Reyes', rarity: 1, cost: 6, icon: 'road', hue: 160,
    init: () => ({ v: 0 }),
    text: (t) => `Gana {m+1} Mult por cada mano seguida sin {kfiguras} puntuando (ahora {m+${t.st.v}})`,
    before: (ctx, t, g) => { if (ctx.scoring.some((c) => g.isFace(c))) { const had = t.st.v; t.st.v = 0; return had ? { msg: 'Reinicia' } : null; } t.st.v += 1; return { msg: '+1', color: 'm' }; },
    hand: (ctx, t) => (t.st.v > 0 ? { mult: t.st.v } : null) });

  def({ id: 'sieteymedio', name: 'Siete y Media', rarity: 1, cost: 6, icon: 'seven', hue: 290,
    text: () => '{x×3} Mult si las cartas jugadas suman {kexactamente 7½} (las figuras valen ½)',
    hand: (ctx) => {
      let s = 0; for (const c of ctx.cards) { if (c.enh === 'piedra') continue; s += c.rank >= 10 ? 0.5 : c.rank; }
      return s === 7.5 ? { xmult: 3 } : null;
    } });

  def({ id: 'escoba', name: 'La Escoba', rarity: 1, cost: 6, icon: 'broom', hue: 85,
    text: () => '{x×2} Mult si las cartas jugadas suman {kexactamente 15} (Sota 8, Caballo 9, Rey 10)',
    hand: (ctx) => {
      let s = 0; for (const c of ctx.cards) { if (c.enh === 'piedra') continue; s += c.rank >= 10 ? c.rank - 2 : c.rank; }
      return s === 15 ? { xmult: 2 } : null;
    } });

  /* ===================== INFRECUENTES ===================== */
  def({ id: 'astrolabio', name: 'Astrolabio', rarity: 2, cost: 7, icon: 'astrolabe', hue: 225,
    text: (t, g) => `{x×0,1} Mult por cada {kConstelación} usada en la partida (ahora {x×${fx(1 + 0.1 * (g ? g.counts.consts : 0))}})`,
    hand: (ctx, t, g) => (g.counts.consts > 0 ? { xmult: 1 + 0.1 * g.counts.consts } : null) });

  def({ id: 'marco', name: 'Marco Vacío', rarity: 2, cost: 8, icon: 'frame', hue: 50,
    text: (t, g) => `{x×1} Mult por cada hueco de Talismán vacío (contándose a sí mismo)${g ? ' (ahora {x×' + (1 + g.talSlots() - g.talismans.length) + '})' : ''}`,
    hand: (ctx, t, g) => { const v = 1 + g.talSlots() - g.talismans.length; return v > 1 ? { xmult: v } : null; } });

  def({ id: 'lluvia', name: 'Lluvia de Oro', rarity: 2, cost: 7, icon: 'rain', hue: 45,
    text: () => 'Las cartas de {soros} dan {$$1} al puntuar',
    card: (ctx, t, g, c) => (g.suitIs(c, 'oros') ? { money: 1 } : null) });

  def({ id: 'campana', name: 'La Campana', rarity: 2, cost: 6, icon: 'bell', hue: 40,
    text: () => 'La primera carta que puntúa se activa {k2 veces más}',
    retrig: (ctx, t, g, c, zone) => (zone === 'play' && ctx.scoring[0] === c ? 2 : 0) });

  def({ id: 'tambor', name: 'El Tamborilero', rarity: 2, cost: 6, icon: 'drum', hue: 15,
    text: () => 'Las {kfiguras} jugadas se activan {k1 vez más}',
    retrig: (ctx, t, g, c, zone) => (zone === 'play' && g.isFace(c) ? 1 : 0) });

  def({ id: 'castanuelas', name: 'Castañuelas', rarity: 2, cost: 6, icon: 'castanets', hue: 340,
    text: () => 'Los {k2, 3, 4 y 5} jugados se activan {k1 vez más}',
    retrig: (ctx, t, g, c, zone) => (zone === 'play' && c.enh !== 'piedra' && c.rank >= 2 && c.rank <= 5 ? 1 : 0) });

  def({ id: 'guitarra', name: 'La Guitarra', rarity: 2, cost: 6, icon: 'guitar', hue: 25,
    text: () => 'Las habilidades de las cartas {ken tu mano} se activan {k1 vez más}',
    retrig: (ctx, t, g, c, zone) => (zone === 'held' ? 1 : 0) });

  def({ id: 'duende', name: 'El Duende', rarity: 2, cost: 6, icon: 'imp', hue: 140,
    text: () => 'En la {kúltima mano} de la ronda, las cartas jugadas se activan {k1 vez más}',
    retrig: (ctx, t, g, c, zone) => (zone === 'play' && ctx.isLast ? 1 : 0) });

  def({ id: 'cuarenta', name: 'Las Cuarenta', rarity: 2, cost: 7, icon: 'forty', hue: 0,
    text: () => 'Al {kcantar} (Caballo y Rey del mismo palo): {x×2} Mult, o {x×4} si es en {kTriunfo}',
    hand: (ctx) => (ctx.cante ? { xmult: ctx.cante === 'cuarenta' ? 4 : 2 } : null) });

  def({ id: 'peregrino', name: 'El Peregrino', rarity: 2, cost: 6, icon: 'boot', hue: 30,
    text: () => 'Cada carta que puntúa gana {c+4} Fichas {kpermanentes}',
    card: (ctx, t, g, c) => { c.bonus = (c.bonus || 0) + 4; return { msg: '¡Mejora!', color: 'c' }; } });

  def({ id: 'corredor', name: 'El Galgo', rarity: 2, cost: 6, icon: 'wing', hue: 195,
    init: () => ({ v: 0 }),
    text: (t) => `Gana {c+15} Fichas cada vez que juegas una {kEscalera} (ahora {c+${t.st.v}})`,
    before: (ctx, t) => { if (ctx.contains.escalera) { t.st.v += 15; return { msg: '+15', color: 'c' }; } return null; },
    hand: (ctx, t) => (t.st.v ? { chips: t.st.v } : null) });

  def({ id: 'vidriera', name: 'La Vidriera', rarity: 2, cost: 7, icon: 'gem', hue: 185,
    init: () => ({ v: 1 }),
    text: (t) => `Gana {x×0,75} Mult por cada carta de {kCristal} que se rompa (ahora {x×${fx(t.st.v)}})`,
    glassBroken: (t, g, n) => { t.st.v += 0.75 * n; return { msg: '×' + fx(t.st.v), color: 'x' }; },
    hand: (ctx, t) => (t.st.v > 1 ? { xmult: t.st.v } : null) });

  def({ id: 'coleccionista', name: 'El Coleccionista', rarity: 2, cost: 7, icon: 'book', hue: 280,
    init: () => ({ v: 1 }),
    text: (t) => `Gana {x×0,25} Mult por cada carta añadida a tu baraja (ahora {x×${fx(t.st.v)}})`,
    cardAdded: (t, g, n) => { t.st.v += 0.25 * n; return { msg: '×' + fx(t.st.v), color: 'x' }; },
    hand: (ctx, t) => (t.st.v > 1 ? { xmult: t.st.v } : null) });

  def({ id: 'hoguera', name: 'Las Ascuas', rarity: 2, cost: 7, icon: 'flame', hue: 10,
    init: () => ({ v: 1 }),
    text: (t) => `Gana {x×0,25} Mult por cada objeto vendido. Se reinicia al derrotar a un {kGuardián} (ahora {x×${fx(t.st.v)}})`,
    otherSold: (t) => { t.st.v += 0.25; return { msg: '×' + fx(t.st.v), color: 'x' }; },
    bossBeaten: (t) => { if (t.st.v > 1) { t.st.v = 1; return { msg: 'Se apaga' }; } return null; },
    hand: (ctx, t) => (t.st.v > 1 ? { xmult: t.st.v } : null) });

  def({ id: 'manoagil', name: 'Mano Ágil', rarity: 2, cost: 7, icon: 'hand', hue: 320,
    text: () => 'Los {kColores} y las {kEscaleras} pueden formarse con {k4 cartas}', flags: { fourFingers: true } });

  def({ id: 'atajo', name: 'La Trocha', rarity: 2, cost: 6, icon: 'arrow', hue: 160,
    text: () => 'Las {kEscaleras} pueden tener huecos de 1 valor (p. ej. 3·5·6·S·C)', flags: { shortcut: true } });

  def({ id: 'pareidolia', name: 'Mil Caras', rarity: 2, cost: 6, icon: 'eye', hue: 300,
    text: () => 'Todas las cartas cuentan como {kfiguras}', flags: { allFaces: true } });

  def({ id: 'oleaje', name: 'El Oleaje', rarity: 2, cost: 4, icon: 'wave', hue: 200,
    text: () => '{kTodas} las cartas jugadas puntúan', flags: { splash: true } });

  def({ id: 'tintes', name: 'Tintes Mezclados', rarity: 2, cost: 6, icon: 'drop', hue: 310,
    text: () => '{soros} y {scopas} cuentan como el mismo palo; {sespadas} y {sbastos} también', flags: { smeared: true } });

  def({ id: 'dado', name: 'Dado Trucado', rarity: 2, cost: 6, icon: 'dice', hue: 120,
    text: () => 'Duplica todas las {kprobabilidades} (p. ej. 1 entre 4 → 2 entre 4)', flags: { doubleProb: true } });

  def({ id: 'vidente', name: 'La Vidente', rarity: 2, cost: 6, icon: 'eye2', hue: 275,
    text: () => 'Crea un {kAugurio} al derrotar cada Envite (si hay espacio)',
    roundEnd: (t, g) => (g.addConsumable(g.randomAugurio()) ? { msg: '+Augurio', color: 'k' } : null) });

  def({ id: 'farolillo', name: 'El Farolillo', rarity: 2, cost: 6, icon: 'lantern', hue: 220,
    text: () => 'Crea la {kConstelación} de la última mano jugada al terminar la ronda (si hay espacio)',
    roundEnd: (t, g) => (g.r.lastType && g.addConsumable({ type: 'con', id: g.r.lastType }) ? { msg: '+Constelación', color: 'k' } : null) });

  def({ id: 'gallo', name: 'El Gallo', rarity: 2, cost: 7, icon: 'rooster', hue: 5,
    text: () => 'La {kprimera mano} de cada ronda da {x×2} Mult',
    hand: (ctx) => (ctx.isFirst ? { xmult: 2 } : null) });

  def({ id: 'bailaora', name: 'La Bailaora', rarity: 2, cost: 7, icon: 'rose', hue: 345,
    text: () => '{x×3} Mult si entre las cartas que puntúan hay {klos 4 palos}',
    hand: (ctx, t, g) => {
      const need = new Set(BR.SUITS); const wild = [];
      for (const c of ctx.scoring) { if (c.enh === 'piedra') continue; if (c.enh === 'prisma') wild.push(c); else need.delete(c.suit); }
      return need.size <= wild.length ? { xmult: 3 } : null;
    } });

  def({ id: 'rocinante', name: 'Rocinante', rarity: 2, cost: 7, icon: 'horse', hue: 30,
    text: () => 'Cada {kCaballo} que puntúa da {x×1,5} Mult',
    card: (ctx, t, g, c) => (c.enh !== 'piedra' && c.rank === 11 ? { xmult: 1.5 } : null) });

  def({ id: 'duo', name: 'Los Novios', rarity: 2, cost: 7, icon: 'twin', hue: 330,
    text: () => '{x×2} Mult si la mano jugada contiene {kPareja}', hand: (ctx) => (ctx.contains.pareja ? { xmult: 2 } : null) });
  def({ id: 'bandada', name: 'La Bandada', rarity: 2, cost: 7, icon: 'bird', hue: 190,
    text: () => '{x×2} Mult si la mano jugada contiene {kColor}', hand: (ctx) => (ctx.contains.color ? { xmult: 2 } : null) });
  def({ id: 'familia', name: 'Los Vecinos', rarity: 2, cost: 7, icon: 'house', hue: 25,
    text: () => '{x×2} Mult si la mano jugada contiene {kDoble Pareja}', hand: (ctx) => (ctx.contains.doble ? { xmult: 2 } : null) });

  def({ id: 'herreria', name: 'La Herrería', rarity: 2, cost: 7, icon: 'anvil', hue: 210,
    text: (t, g) => `{x×0,2} Mult por cada carta de {kHierro} en tu baraja${g ? ' (ahora {x×' + fx(1 + 0.2 * g.deck.filter((c) => c.enh === 'hierro').length) + '})' : ''}`,
    hand: (ctx, t, g) => { const n = g.deck.filter((c) => c.enh === 'hierro').length; return n ? { xmult: 1 + 0.2 * n } : null; } });

  def({ id: 'cantera', name: 'La Cantera', rarity: 2, cost: 6, icon: 'mountain', hue: 30,
    text: (t, g) => `{c+25} Fichas por cada carta de {kGranito} en tu baraja${g ? ' (ahora {c+' + 25 * g.deck.filter((c) => c.enh === 'piedra').length + '})' : ''}`,
    hand: (ctx, t, g) => { const n = g.deck.filter((c) => c.enh === 'piedra').length; return n ? { chips: 25 * n } : null; } });

  def({ id: 'mercader', name: 'El Mercader', rarity: 2, cost: 5, icon: 'stall', hue: 35,
    text: () => 'Una {krenovación gratis} en cada Feria', shopEnter: (t, g) => { g.shop.freeRerolls = (g.shop.freeRerolls || 0) + 1; } });

  def({ id: 'cazador', name: 'Cazarrecompensas', rarity: 2, cost: 6, icon: 'target', hue: 10,
    text: () => 'Gana {$$8} al derrotar a un {kGuardián}', bossBeaten: () => ({ money: 8 }) });

  def({ id: 'malabarista', name: 'Manos Largas', rarity: 2, cost: 6, icon: 'juggle', hue: 100,
    text: () => '{k+1} carta en la mano', passive: { handSize: 1 } });
  def({ id: 'basurero', name: 'El Trapero', rarity: 2, cost: 6, icon: 'sack', hue: 70,
    text: () => '{k+1} Descarte por ronda', passive: { discards: 1 } });

  def({ id: 'mareaalta', name: 'Marea Alta', rarity: 2, cost: 7, icon: 'tide', hue: 205,
    init: () => ({ v: 0 }),
    text: (t) => `Gana {m+2} Mult cada vez que juegas {k5 cartas} (ahora {m+${t.st.v}})`,
    before: (ctx, t) => { if (ctx.cards.length === 5) { t.st.v += 2; return { msg: '+2', color: 'm' }; } return null; },
    hand: (ctx, t) => (t.st.v ? { mult: t.st.v } : null) });

  def({ id: 'treintayuna', name: 'La Treinta y Una', rarity: 2, cost: 6, icon: 'cards', hue: 145,
    text: () => '{m+31} Mult si las cartas jugadas suman {kexactamente 31} (figuras 10, As 11)',
    hand: (ctx) => { let s = 0; for (const c of ctx.cards) { if (c.enh === 'piedra') continue; s += c.rank >= 10 ? 10 : c.rank === 1 ? 11 : c.rank; } return s === 31 ? { mult: 31 } : null; } });

  /* ======================== RARAS ======================== */
  def({ id: 'trinidad', name: 'La Trinidad', rarity: 3, cost: 8, icon: 'triangle', hue: 50,
    text: () => '{x×3} Mult si la mano jugada contiene {kTrío}', hand: (ctx) => (ctx.contains.trio ? { xmult: 3 } : null) });
  def({ id: 'conclave', name: 'El Cónclave', rarity: 3, cost: 8, icon: 'square', hue: 0,
    text: () => '{x×4} Mult si la mano jugada contiene {kPóker}', hand: (ctx) => (ctx.contains.poker ? { xmult: 4 } : null) });
  def({ id: 'procesion', name: 'La Procesión', rarity: 3, cost: 8, icon: 'stairs', hue: 260,
    text: () => '{x×3} Mult si la mano jugada contiene {kEscalera}', hand: (ctx) => (ctx.contains.escalera ? { xmult: 3 } : null) });

  def({ id: 'fenix', name: 'El Fénix', rarity: 3, cost: 7, icon: 'phoenix', hue: 18,
    text: () => 'Evita la derrota si alcanzaste al menos el {k25%} del objetivo. Arde al hacerlo' });

  def({ id: 'reflejo', name: 'El Reflejo', rarity: 3, cost: 10, icon: 'mirror2', hue: 230, copy: 'right',
    text: () => 'Copia la habilidad del Talismán a su {kderecha}' });
  def({ id: 'eco', name: 'El Eco', rarity: 3, cost: 10, icon: 'echo', hue: 300, copy: 'left',
    text: () => 'Copia la habilidad del Talismán {kmás a la izquierda}' });

  def({ id: 'reymago', name: 'El Rey Mago', rarity: 3, cost: 8, icon: 'crown2', hue: 280,
    text: () => 'Cada {kRey} que tengas en la mano da {x×1,5} Mult',
    held: (ctx, t, g, c) => (c.enh !== 'piedra' && c.rank === 12 ? { xmult: 1.5 } : null) });

  def({ id: 'vampira', name: 'La Sanguijuela', rarity: 3, cost: 7, icon: 'fang', hue: 345,
    init: () => ({ v: 1 }),
    text: (t) => `Gana {x×0,1} Mult por cada carta {kmejorada} que puntúa y le roba la mejora (ahora {x×${fx(t.st.v)}})`,
    before: (ctx, t) => { let n = 0; for (const c of ctx.scoring) if (c.enh && !c._debuffed) { c.enh = null; n++; } if (n) { t.st.v += 0.1 * n; return { msg: '×' + fx(t.st.v), color: 'x' }; } return null; },
    hand: (ctx, t) => (t.st.v > 1 ? { xmult: t.st.v } : null) });

  def({ id: 'triunfo', name: 'El As de Triunfo', rarity: 3, cost: 8, icon: 'laurel', hue: 45,
    text: () => 'Las cartas del palo de {kTriunfo} dan {x×1,5} Mult al puntuar',
    card: (ctx, t, g, c) => (g.isTrump(c) ? { xmult: 1.5 } : null) });

  def({ id: 'rompehechizos', name: 'Rompehechizos', rarity: 3, cost: 8, icon: 'shield', hue: 190,
    text: () => 'Desactiva los efectos de todos los {kGuardianes}', flags: { noBoss: true } });

  def({ id: 'teatro', name: 'El Gran Teatro', rarity: 3, cost: 9, icon: 'theatre', hue: 350,
    text: (t, g) => `{x×0,5} Mult por cada {kGuardián} derrotado en la partida (ahora {x×${fx(1 + 0.5 * (g ? g.counts.bosses : 0))}})`,
    hand: (ctx, t, g) => (g.counts.bosses ? { xmult: 1 + 0.5 * g.counts.bosses } : null) });

  def({ id: 'cuna', name: 'La Cuna', rarity: 3, cost: 7, icon: 'cradle', hue: 200,
    text: () => 'Al empezar cada ronda añade a tu mano una carta aleatoria con {kLacre}',
    blindStart: (t, g) => { const c = g.makeCard(g.rng.pick(BR.SUITS), g.rng.pick(BR.RANKS)); c.seal = g.rng.pick(Object.keys(BR.SEALS)); g.addCardToDeck(c, 'hand'); return { msg: '¡Nace!' }; } });

  def({ id: 'prestamista', name: 'El Prestamista', rarity: 3, cost: 6, icon: 'scale2', hue: 25,
    text: () => 'Puedes endeudarte hasta {$−$20}', passive: { debt: 20 } });

  def({ id: 'cometa', name: 'El Cometa', rarity: 3, cost: 9, icon: 'comet', hue: 210,
    init: () => ({ v: 1 }),
    text: (t) => `Gana {x×0,1} Mult cada vez que usas una {kConstelación} (ahora {x×${fx(t.st.v)}})`,
    consUsed: (t, g, c) => { if (c.type === 'con') { t.st.v += 0.1; return { msg: '×' + fx(t.st.v), color: 'x' }; } return null; },
    hand: (ctx, t) => (t.st.v > 1 ? { xmult: t.st.v } : null) });

  /* ====================== LEGENDARIAS ====================== */
  def({ id: 'sibila', name: 'La Sibila', rarity: 4, cost: 20, icon: 'eye3', hue: 270, legendary: true,
    text: () => 'Todas las cartas jugadas que puntúan se activan {k1 vez más}',
    retrig: (ctx, t, g, c, zone) => (zone === 'play' ? 1 : 0) });
  def({ id: 'coloso', name: 'El Coloso', rarity: 4, cost: 20, icon: 'colossus', hue: 40, legendary: true,
    text: () => 'Las {kfiguras} que puntúan dan {x×2} Mult',
    card: (ctx, t, g, c) => (g.isFace(c) ? { xmult: 2 } : null) });
  def({ id: 'quimera', name: 'La Quimera', rarity: 4, cost: 20, icon: 'chimera', hue: 0, legendary: true,
    init: () => ({ v: 1 }),
    text: (t) => `Gana {x×1} Mult cada vez que derrotas a un {kGuardián} (ahora {x×${fx(t.st.v)}})`,
    bossBeaten: (t) => { t.st.v += 1; return { msg: '×' + fx(t.st.v), color: 'x' }; },
    hand: (ctx, t) => (t.st.v > 1 ? { xmult: t.st.v } : null) });
  def({ id: 'titania', name: 'Titania', rarity: 4, cost: 20, icon: 'butterfly', hue: 160, legendary: true,
    text: () => 'Las cartas de tu mano de {kÁurea} o {kHierro} dan {x×2} Mult',
    held: (ctx, t, g, c) => (c.enh === 'oro' || c.enh === 'hierro' ? { xmult: 2 } : null) });

  BR.TALISMANS = T;
  BR.TAL_BY_ID = Object.fromEntries(T.map((t) => [t.id, t]));
})(globalThis.BR = globalThis.BR || {});
