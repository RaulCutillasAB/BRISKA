/* BRISKA — datos base: palos, rangos, manos, mejoras, lacres, ediciones */
(function (BR) {
  'use strict';

  BR.SUITS = ['oros', 'copas', 'espadas', 'bastos'];
  BR.SUIT_INFO = {
    oros:    { name: 'Oros',    color: '#e3a92b', dark: '#8a5a07' },
    copas:   { name: 'Copas',   color: '#d8405a', dark: '#7c1426' },
    espadas: { name: 'Espadas', color: '#3d7fd0', dark: '#173f77' },
    bastos:  { name: 'Bastos',  color: '#3b9b5c', dark: '#18502b' },
  };

  // Baraja española de 40 naipes
  BR.RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
  BR.RANK_INFO = {
    1:  { name: 'As',      short: 'A', chips: 11, ord: 0 },
    2:  { name: 'Dos',     short: '2', chips: 2,  ord: 1 },
    3:  { name: 'Tres',    short: '3', chips: 10, ord: 2 }, // en la brisca, el tres vale diez
    4:  { name: 'Cuatro',  short: '4', chips: 4,  ord: 3 },
    5:  { name: 'Cinco',   short: '5', chips: 5,  ord: 4 },
    6:  { name: 'Seis',    short: '6', chips: 6,  ord: 5 },
    7:  { name: 'Siete',   short: '7', chips: 7,  ord: 6 },
    10: { name: 'Sota',    short: 'S', chips: 8,  ord: 7 },
    11: { name: 'Caballo', short: 'C', chips: 9,  ord: 8 },
    12: { name: 'Rey',     short: 'R', chips: 10, ord: 9 },
  };
  BR.ORD_TO_RANK = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
  // valor "alto" para ordenar: el As es la carta más alta
  BR.rankPower = (r) => (r === 1 ? 10 : BR.RANK_INFO[r].ord);

  BR.HANDS = {
    alta:      { name: 'Carta Alta',          chips: 5,   mult: 1,  lc: 10, lm: 1 },
    pareja:    { name: 'Pareja',              chips: 10,  mult: 2,  lc: 15, lm: 1 },
    doble:     { name: 'Doble Pareja',        chips: 20,  mult: 2,  lc: 20, lm: 1 },
    trio:      { name: 'Trío',                chips: 30,  mult: 3,  lc: 20, lm: 2 },
    escalera:  { name: 'Escalera',            chips: 30,  mult: 4,  lc: 30, lm: 3 },
    color:     { name: 'Color',               chips: 35,  mult: 4,  lc: 15, lm: 2 },
    full:      { name: 'Full',                chips: 40,  mult: 4,  lc: 25, lm: 2 },
    poker:     { name: 'Póker',               chips: 60,  mult: 7,  lc: 30, lm: 3 },
    escolor:   { name: 'Escalera de Color',   chips: 100, mult: 8,  lc: 40, lm: 4 },
    repoker:   { name: 'Repóker',             chips: 120, mult: 12, lc: 35, lm: 3, secret: true },
    fullcolor: { name: 'Full de Color',       chips: 140, mult: 14, lc: 40, lm: 4, secret: true },
    repcolor:  { name: 'Repóker de Color',    chips: 160, mult: 16, lc: 50, lm: 3, secret: true },
  };
  BR.HAND_ORDER = ['repcolor', 'fullcolor', 'repoker', 'escolor', 'poker', 'full', 'color', 'escalera', 'trio', 'doble', 'pareja', 'alta'];
  BR.HAND_DESC = {
    alta: 'La carta más alta que juegues.',
    pareja: 'Dos cartas del mismo valor.',
    doble: 'Dos parejas distintas.',
    trio: 'Tres cartas del mismo valor.',
    escalera: 'Cinco valores consecutivos (A·2·3… 7·S·C·R·A).',
    color: 'Cinco cartas del mismo palo.',
    full: 'Un trío y una pareja.',
    poker: 'Cuatro cartas del mismo valor.',
    escolor: 'Escalera con todas las cartas del mismo palo.',
    repoker: 'Cinco cartas del mismo valor.',
    fullcolor: 'Full con todas las cartas del mismo palo.',
    repcolor: 'Repóker con todas las cartas del mismo palo.',
  };

  BR.ENH = {
    ambar:   { name: 'Ámbar',   desc: '{c+30} Fichas' },
    rubi:    { name: 'Rubí',    desc: '{m+4} Mult' },
    cristal: { name: 'Cristal', desc: '{x×2} Mult. {p1 entre 4} de romperse' },
    piedra:  { name: 'Piedra',  desc: '{c+50} Fichas. Sin valor ni palo; siempre puntúa' },
    oro:     { name: 'Oro',     desc: '{$+$3} si está en tu mano al terminar la ronda' },
    hierro:  { name: 'Hierro',  desc: '{x×1,5} Mult mientras esté en tu mano' },
    prisma:  { name: 'Prisma',  desc: 'Cuenta como cualquier palo' },
    fortuna: { name: 'Fortuna', desc: '{p1 entre 5} de {m+20} Mult. {p1 entre 15} de ganar {$$20}' },
  };
  BR.SEALS = {
    carmesi: { name: 'Lacre Carmesí', color: '#e0344e', desc: 'Se activa {k1 vez más}' },
    zafiro:  { name: 'Lacre Zafiro',  color: '#3a7ee8', desc: 'Si está en tu mano al terminar la ronda, crea la {kConstelación} de la última mano jugada' },
    dorado:  { name: 'Lacre Dorado',  color: '#e8b52f', desc: 'Gana {$$3} al puntuar' },
    violeta: { name: 'Lacre Violeta', color: '#9a52e0', desc: 'Crea un {kAugurio} al descartarla' },
  };
  BR.EDITIONS = {
    brillante:   { name: 'Brillante',   desc: '{c+50} Fichas', cost: 2 },
    iridiscente: { name: 'Iridiscente', desc: '{m+10} Mult', cost: 3 },
    aurora:      { name: 'Aurora',      desc: '{x×1,5} Mult', cost: 5 },
    eclipse:     { name: 'Eclipse',     desc: '{k+1} hueco de Talismán', cost: 5 },
  };

  BR.RARITY = {
    1: { name: 'Común',      color: '#5fa8e8' },
    2: { name: 'Infrecuente', color: '#4fc28a' },
    3: { name: 'Rara',       color: '#e8566a' },
    4: { name: 'Legendaria', color: '#c77dff' },
  };

  /* ---------- Barajas iniciales ---------- */
  BR.DECKS = [
    { id: 'alba', name: 'Baraja del Alba', color: '#e2725b', color2: '#f3b37a', desc: '{k+1} Descarte en cada ronda', unlock: null,
      apply: (g) => { g.base.discards += 1; } },
    { id: 'mar', name: 'Baraja del Mar', color: '#2f7fc4', color2: '#7ad0e8', desc: '{k+1} Mano en cada ronda', unlock: { type: 'ante', v: 2, text: 'Llega a la Noche 2' },
      apply: (g) => { g.base.hands += 1; } },
    { id: 'oro', name: 'Baraja del Tesoro', color: '#d8a12a', color2: '#ffe08a', desc: 'Empiezas con {$$10} extra', unlock: { type: 'ante', v: 3, text: 'Llega a la Noche 3' },
      apply: (g) => { g.money += 10; } },
    { id: 'bosque', name: 'Baraja del Bosque', color: '#3c9a58', color2: '#9fe0a0', desc: 'Al cobrar: {$+$2} por Mano restante y {$+$1} por Descarte restante. {kSin intereses}', unlock: { type: 'ante', v: 4, text: 'Llega a la Noche 4' },
      apply: (g) => { g.flags.noInterest = true; g.flags.handMoney = 2; g.flags.discardMoney = 1; } },
    { id: 'noche', name: 'Baraja de la Noche', color: '#3b2b5c', color2: '#9a86d6', desc: '{k+1} hueco de Talismán. {k−1} Mano por ronda', unlock: { type: 'ante', v: 5, text: 'Llega a la Noche 5' },
      apply: (g) => { g.base.talSlots += 1; g.base.hands -= 1; } },
    { id: 'astral', name: 'Baraja Astral', color: '#4a3fb0', color2: '#c1b8ff', desc: 'Empiezas con los privilegios {kLupa Astral} y {kTelescopio Real}', unlock: { type: 'consts', v: 15, text: 'Usa 15 Constelaciones' },
      apply: (g) => { g.vouchers.push('lupa', 'observatorio'); } },
    { id: 'brisca', name: 'Baraja de Brisca', color: '#b43d4e', color2: '#ffb0a8', desc: 'Las cartas de {kTriunfo} dan {m+3} Mult (en vez de +1). Los {kCantes} valen el doble', unlock: { type: 'cuarenta', v: 3, text: 'Canta Las Cuarenta 3 veces' },
      apply: (g) => { g.flags.trumpMult = 3; g.flags.canteMult = 2; } },
    { id: 'bicolor', name: 'Baraja Bicolor', color: '#c05f3a', color2: '#7fb2e8', desc: 'Solo {sOros} y {sEspadas}: 20 de cada', unlock: { type: 'wins', v: 1, text: 'Gana una partida' },
      build: () => { const c = []; for (const s of ['oros', 'espadas']) for (const r of BR.RANKS) { c.push({ suit: s, rank: r }, { suit: s, rank: r }); } return c; } },
    { id: 'desnuda', name: 'Baraja Desnuda', color: '#8a7a68', color2: '#e6d6b8', desc: 'Sin {kfiguras}: solo 28 naipes del As al Siete', unlock: { type: 'stake', v: 2, text: 'Gana en Vela Roja' },
      build: () => { const c = []; for (const s of BR.SUITS) for (const r of [1, 2, 3, 4, 5, 6, 7]) c.push({ suit: s, rank: r }); return c; } },
    { id: 'equilibrio', name: 'Baraja del Equilibrio', color: '#7a4fb8', color2: '#f0a8e8', desc: 'Fichas y Mult se {kequilibran} antes de multiplicar. Objetivos {x×2}', unlock: { type: 'stake', v: 3, text: 'Gana en Vela Verde' },
      apply: (g) => { g.flags.balance = true; g.flags.targetMult = 2; } },
    { id: 'errante', name: 'Baraja Errante', color: '#2a8a8a', color2: '#ffd36e', desc: 'Todos los valores y palos son {kaleatorios}', unlock: { type: 'wins', v: 3, text: 'Gana 3 partidas' },
      build: (rng) => { const c = []; for (let i = 0; i < 40; i++) c.push({ suit: rng.pick(BR.SUITS), rank: rng.pick(BR.RANKS) }); return c; } },
  ];

  /* ---------- Dificultades: Velas ---------- */
  BR.STAKES = [
    { name: 'Vela Blanca',  color: '#f2ecdf', desc: 'Dificultad base' },
    { name: 'Vela Roja',    color: '#e04a4a', desc: 'El Envite Menor no da recompensa' },
    { name: 'Vela Verde',   color: '#45b36b', desc: 'Los objetivos crecen más deprisa' },
    { name: 'Vela Negra',   color: '#2a2433', desc: '{k−1} Descarte por ronda' },
    { name: 'Vela Azul',    color: '#3d7fd0', desc: 'Todo en la tienda cuesta {$+$1}' },
    { name: 'Vela Dorada',  color: '#e8b52f', desc: '{k−1} Mano por ronda. El desafío definitivo' },
  ];

  BR.ANTE_TARGETS = [300, 800, 1900, 4200, 8500, 16000, 28000, 46000];
  BR.ANTE_TARGETS_HARD = [300, 1000, 2600, 6500, 14000, 28000, 52000, 90000];
  BR.anteBase = function (ante, stake) {
    const t = stake >= 2 ? BR.ANTE_TARGETS_HARD : BR.ANTE_TARGETS;
    if (ante < 1) return 100;
    if (ante <= 8) return t[ante - 1];
    const k = ante - 8;
    let v = t[7] * Math.pow(1.6 + 0.2 * k, k);
    const p = Math.pow(10, Math.floor(Math.log10(v)) - 1);
    return Math.floor(v / p) * p;
  };

  /* ---------- Privilegios (vales) ---------- */
  BR.VOUCHERS = [
    { id: 'mostrador', name: 'Mostrador Ampliado', icon: 'stall', desc: '{k+1} hueco de artículo en la Feria' },
    { id: 'granbazar', name: 'Gran Bazar', icon: 'stall', req: 'mostrador', desc: '{k+1} hueco más de artículo en la Feria' },
    { id: 'descuento', name: 'Rebaja', icon: 'tag', desc: 'Todo en la Feria cuesta un {k25%} menos' },
    { id: 'saldo', name: 'Gran Saldo', icon: 'tag', req: 'descuento', desc: 'Todo en la Feria cuesta un {k50%} menos' },
    { id: 'manofirme', name: 'Pulso Firme', icon: 'hand', desc: '{k+1} Mano por ronda' },
    { id: 'manohierro', name: 'Pulso de Hierro', icon: 'hand', req: 'manofirme', desc: '{k+1} Mano más por ronda' },
    { id: 'papelera', name: 'Brasero', icon: 'flame', desc: '{k+1} Descarte por ronda' },
    { id: 'incinerador', name: 'Gran Hoguera', icon: 'flame', req: 'papelera', desc: '{k+1} Descarte más por ronda' },
    { id: 'telar', name: 'Telar', icon: 'loom', desc: '{k+1} carta en la mano' },
    { id: 'grantelar', name: 'Telar Mayor', icon: 'loom', req: 'telar', desc: '{k+1} carta más en la mano' },
    { id: 'alcancia', name: 'Alcancía', icon: 'coin', desc: 'Interés máximo: {$$10}' },
    { id: 'cofre', name: 'Cofre del Tesoro', icon: 'chest', req: 'alcancia', desc: 'Interés máximo: {$$20}' },
    { id: 'lupa', name: 'Lupa Astral', icon: 'star', desc: 'Las {kConstelaciones} aparecen el doble en la Feria' },
    { id: 'observatorio', name: 'Telescopio Real', icon: 'scope', req: 'lupa', desc: 'Las {kConstelaciones} guardadas dan {x×1,5} Mult a su mano' },
    { id: 'taller', name: 'Taller del Augur', icon: 'eye', desc: 'Los {kAugurios} aparecen el doble en la Feria' },
    { id: 'tarotista', name: 'La Pitonisa', icon: 'eye', req: 'taller', desc: 'Al final de cada ronda crea un {kAugurio} si hay espacio' },
    { id: 'halcon', name: 'Ojo de Halcón', icon: 'feather', desc: 'Renovar la Feria cuesta {$$2} menos' },
    { id: 'aguila', name: 'Ojo de Águila', icon: 'feather', req: 'halcon', desc: 'Renovar la Feria cuesta {$$2} menos aún' },
    { id: 'gema', name: 'Gema Pulida', icon: 'gem', desc: 'Las {kediciones} aparecen el doble' },
    { id: 'gemarara', name: 'Gema Imposible', icon: 'gem', req: 'gema', desc: 'Las {kediciones} aparecen cuatro veces más' },
    { id: 'bolsillo', name: 'Bolsillo Secreto', icon: 'pouch', desc: '{k+1} hueco de consumible' },
    { id: 'sexto', name: 'Sexto Sentido', icon: 'spiral', req: 'bolsillo', desc: 'Pueden aparecer {kÁnimas} en los Sobres de Augurios' },
    { id: 'vitrina', name: 'Vitrina', icon: 'frame', desc: '{k+1} hueco de Talismán' },
    { id: 'galeria', name: 'Galería', icon: 'frame', req: 'vitrina', desc: '{k+1} hueco más de Talismán' },
  ];

  /* ---------- Sobres ---------- */
  BR.PACK_KINDS = {
    aug: { name: 'Sobre de Augurios', desc: 'Elige {k{pick}} de {k{n}} Augurios para usar al instante', color: '#7a3fb8', color2: '#e0b0ff', icon: 'eye' },
    con: { name: 'Sobre Celeste', desc: 'Elige {k{pick}} de {k{n}} Constelaciones para usar al instante', color: '#1f3f8a', color2: '#8fd0ff', icon: 'star' },
    tal: { name: 'Sobre de Talismanes', desc: 'Elige {k{pick}} de {k{n}} Talismanes', color: '#a8322e', color2: '#ffc070', icon: 'mask' },
    nai: { name: 'Sobre de Naipes', desc: 'Elige {k{pick}} de {k{n}} naipes para añadir a tu baraja', color: '#2f7a4a', color2: '#d8f0a0', icon: 'cards' },
    ani: { name: 'Sobre de Ánimas', desc: 'Elige {k{pick}} de {k{n}} Ánimas para usar al instante', color: '#1c5c66', color2: '#8ff0e0', icon: 'spiral' },
  };
  BR.PACK_SIZES = {
    normal: { name: '', n: 3, pick: 1, cost: 4, w: 4 },
    jumbo:  { name: 'Grande', n: 5, pick: 1, cost: 6, w: 2 },
    mega:   { name: 'Mega', n: 5, pick: 2, cost: 8, w: 0.6 },
  };

  /* ---------- Insignias (por saltar envites) ---------- */
  BR.TAGS = [
    { id: 'cupon', name: 'Insignia del Cupón', icon: 'tag', desc: 'Los artículos iniciales de la próxima Feria son {kgratis}' },
    { id: 'rara', name: 'Insignia Rara', icon: 'gem', desc: 'La próxima Feria tiene un Talismán {kRaro} gratis' },
    { id: 'iris', name: 'Insignia Iridiscente', icon: 'prism', desc: 'El próximo Talismán de la Feria es {kIridiscente} y gratis' },
    { id: 'aurora', name: 'Insignia Aurora', icon: 'aurora', desc: 'El próximo Talismán de la Feria es {kAurora} y gratis', min: 2 },
    { id: 'inversor', name: 'Insignia del Inversor', icon: 'coin', desc: 'Gana {$$25} al derrotar al Guardián de esta Noche' },
    { id: 'doble', name: 'Insignia Doble', icon: 'twin', desc: 'Copia la próxima Insignia que consigas' },
    { id: 'celeste', name: 'Insignia Celeste', icon: 'star', desc: 'Abre gratis un {kMega Sobre Celeste}' },
    { id: 'arcana', name: 'Insignia Arcana', icon: 'eye', desc: 'Abre gratis un {kMega Sobre de Augurios}' },
    { id: 'espectral', name: 'Insignia Espectral', icon: 'spiral', desc: 'Abre gratis un {kSobre de Ánimas}', min: 2 },
    { id: 'bufon', name: 'Insignia del Bufón', icon: 'mask', desc: 'Abre gratis un {kMega Sobre de Talismanes}' },
    { id: 'prisa', name: 'Insignia de la Prisa', icon: 'feather', desc: 'Gana {$$5} por cada Envite saltado en la partida' },
    { id: 'economia', name: 'Insignia de la Usura', icon: 'chest', desc: 'Duplica tu dinero (máximo {$+$40})' },
    { id: 'destino', name: 'Insignia del Destino', icon: 'dice', desc: 'Renovar la próxima Feria empieza costando {$$0}' },
    { id: 'guardian', name: 'Insignia del Guardián', icon: 'mask2', desc: 'Cambia al {kGuardián} de esta Noche' },
  ];

  /* ---------- Guardianes (jefes) ---------- */
  BR.BOSSES = [
    { id: 'usurero', name: 'El Usurero', icon: 'coin', color: '#c89a2a', desc: 'Las cartas de {sOros} están debilitadas', min: 1, debuff: (c) => c.suit === 'oros' },
    { id: 'sed', name: 'La Sed', icon: 'cup', color: '#c03a50', desc: 'Las cartas de {sCopas} están debilitadas', min: 1, debuff: (c) => c.suit === 'copas' },
    { id: 'oxido', name: 'El Óxido', icon: 'sword', color: '#3a6cb0', desc: 'Las cartas de {sEspadas} están debilitadas', min: 1, debuff: (c) => c.suit === 'espadas' },
    { id: 'carcoma', name: 'La Carcoma', icon: 'staff', color: '#3a8a52', desc: 'Las cartas de {sBastos} están debilitadas', min: 1, debuff: (c) => c.suit === 'bastos' },
    { id: 'muralla', name: 'La Muralla', icon: 'wall', color: '#7a6a5a', desc: 'Objetivo enorme', min: 2, targetMult: 4 },
    { id: 'aguja', name: 'La Aguja', icon: 'needle', color: '#5a8a8a', desc: 'Solo dispones de {k1 Mano}', min: 2, targetMult: 1, start: (g) => { g.r.handsLeft = 1; } },
    { id: 'ojo', name: 'El Ojo', icon: 'eye', color: '#3f6fd0', desc: 'No puedes repetir el mismo tipo de mano', min: 3,
      check: (g, ev) => g.r.typesPlayed.includes(ev.type) ? 'El Ojo ya ha visto esa mano' : null },
    { id: 'boca', name: 'La Boca', icon: 'mouth', color: '#c0508a', desc: 'Solo puedes jugar un tipo de mano en esta ronda', min: 2,
      check: (g, ev) => (g.r.typesPlayed.length && g.r.typesPlayed[0] !== ev.type) ? 'La Boca solo acepta ' + BR.HANDS[g.r.typesPlayed[0]].name : null },
    { id: 'mascara', name: 'La Máscara', icon: 'mask2', color: '#6a4a8a', desc: 'Las {kfiguras} se roban boca abajo', min: 2, faceDown: (c, g) => g.isFace(c) },
    { id: 'polilla', name: 'La Polilla', icon: 'moth', color: '#8a7a5a', desc: '{p1 de cada 6} cartas se roba boca abajo', min: 2, faceDown: (c, g) => g.rng.chance(1 / 6) },
    { id: 'marea', name: 'La Marea', icon: 'wave', color: '#2a7a9a', desc: 'Tras cada mano jugada, descarta 2 cartas al azar de tu mano', min: 1,
      after: (g) => { g.randomDiscard(2); } },
    { id: 'silencio', name: 'El Silencio', icon: 'bell', color: '#5a5a7a', desc: '{k−1} carta en la mano', min: 1, handSize: -1 },
    { id: 'ancla', name: 'El Ancla', icon: 'anchor', color: '#3a4a6a', desc: 'Debes jugar exactamente {k5 cartas}', min: 1,
      check: (g, ev, cards) => cards.length !== 5 ? 'El Ancla exige 5 cartas' : null },
    { id: 'avaro', name: 'El Avaro', icon: 'chest', color: '#a07a2a', desc: 'Pierdes {$$1} por cada carta jugada', min: 2,
      onPlay: (g, cards) => { g.money -= cards.length; return -cards.length; } },
    { id: 'garra', name: 'La Garra', icon: 'claw', color: '#8a3a2a', desc: 'Las Fichas y el Mult base se reducen a la mitad', min: 1, halve: true },
    { id: 'pozo', name: 'El Pozo', icon: 'well', color: '#2a3a4a', desc: 'Empiezas la ronda sin {kDescartes}', min: 2, start: (g) => { g.r.discardsLeft = 0; } },
    { id: 'sombra', name: 'La Sombra', icon: 'moon', color: '#3a3050', desc: 'Todas las {kfiguras} están debilitadas', min: 3, debuff: (c, g) => g.isFace(c, true) },
    { id: 'usurpador', name: 'El Usurpador', icon: 'crown', color: '#8a2a4a', desc: 'Las cartas del palo de {kTriunfo} están debilitadas', min: 3, debuff: (c, g) => g.r && c.suit === g.r.trump },
    { id: 'olvido', name: 'El Olvido', icon: 'hourglass', color: '#5a6a8a', desc: 'Juegas todas las manos como si fueran de nivel 1', min: 3, levelOne: true },
    { id: 'espina', name: 'La Espina', icon: 'thorn', color: '#4a6a3a', desc: 'Las cartas ya jugadas en esta Noche están debilitadas', min: 2, debuff: (c, g) => g.anteplayed.includes(c.id) },
    { id: 'brazo', name: 'El Brazo', icon: 'arm', color: '#6a4a3a', desc: 'Baja 1 nivel la mano que juegues', min: 2,
      before: (g, ev) => { const h = g.handLevels[ev.type]; if (h.lvl > 1) { h.lvl--; return true; } return false; } },
    // Guardianes finales
    { id: 'eclipse', name: 'Eclipse Carmesí', icon: 'eclipse', color: '#c0203a', final: true, desc: 'Desactiva un Talismán al azar en cada mano', start: (g) => g.pickEclipse(), after: (g) => g.pickEclipse() },
    { id: 'reina', name: 'La Reina sin Rostro', icon: 'mask', color: '#d0d0e8', final: true, desc: 'Todos los {kAses} y {kfiguras} están debilitados', debuff: (c, g) => c.rank === 1 || g.isFace(c, true) },
    { id: 'leviatan', name: 'Leviatán', icon: 'wave', color: '#1a6a7a', final: true, desc: '{k−2} cartas en la mano', handSize: -2 },
    { id: 'tejedor', name: 'El Tejedor', icon: 'spiral', color: '#7a5ab0', final: true, desc: 'Juegas todas las manos como si fueran de nivel 1', levelOne: true },
  ];
  BR.BOSS_BY_ID = Object.fromEntries(BR.BOSSES.map((b) => [b.id, b]));
  BR.VOUCHER_BY_ID = Object.fromEntries(BR.VOUCHERS.map((b) => [b.id, b]));
  BR.TAG_BY_ID = Object.fromEntries(BR.TAGS.map((b) => [b.id, b]));
  BR.DECK_BY_ID = Object.fromEntries(BR.DECKS.map((b) => [b.id, b]));

  BR.RIVALS = {
    small: { name: 'Envite Menor', mult: 1, reward: 3, color: '#3d7fd0' },
    big: { name: 'Envite Mayor', mult: 1.5, reward: 4, color: '#e0a030' },
  };
})(globalThis.BR = globalThis.BR || {});
