/* LAZO — datos: personajes, biomas, sombras, dones y eventos */
(function (L) {
  'use strict';

  L.BASE = { speed: 360, trailLen: 1050, loopDmg: 1, magnet: 75, dashCd: 2.2, dashDur: 0.18, dashSpeed: 1150, maxHearts: 4, inv: 1.4, polenMul: 1 };

  L.CHARS = [
    { id: 'lumi', name: 'Lumi', color: '#ffd76a', glow: '#ffb340', desc: 'Una luciérnaga valiente. Equilibrada en todo.', unlock: null },
    { id: 'chispa', name: 'Chispa', color: '#c6ff6a', glow: '#7dff3a', desc: 'Muy rápida e impulso cada segundo, pero con estela corta.', unlock: { id: 'pantano', text: 'Llega al Pantano de Niebla' },
      stats: (s) => { s.speed *= 1.25; s.dashCd = 1.0; s.trailLen *= 0.72; } },
    { id: 'nimbo', name: 'Nimbo', color: '#93dcff', glow: '#4ab8ff', desc: 'Estela enorme y serena, aunque algo lenta.', unlock: { id: 'seis', text: 'Atrapa 6 sombras en un solo lazo' },
      stats: (s) => { s.trailLen *= 1.55; s.speed *= 0.9; } },
    { id: 'brasa', name: 'Brasa', color: '#ff8a4a', glow: '#ff4a1a', desc: 'Su estela arde desde el principio. Solo 3 corazones.', unlock: { id: 'jefe1', text: 'Vence a la Madre Polilla' },
      stats: (s) => { s.maxHearts = 3; }, start: (w) => w.addDon('ardiente', true) },
    { id: 'eco', name: 'Eco', color: '#dca8ff', glow: '#a45cff', desc: 'Cada lazo resuena dos veces. Solo 3 corazones.', unlock: { id: 'victoria', text: 'Gana una partida' },
      stats: (s) => { s.maxHearts = 3; }, start: (w) => w.addDon('eco', true) },
  ];

  L.BIOMES = [
    { id: 'bosque', name: 'Bosque de Luciérnagas', sub: 'Primera noche', bg: ['#030b0d', '#08221f', '#114238'], fog: '#3fd9a0', motes: '#c8ffe0',
      pool: ['sombra', 'polilla', 'saltarin', 'gemelo', 'enjambre'], boss: 'madre' },
    { id: 'pantano', name: 'Pantano de Niebla', sub: 'Segunda noche', bg: ['#05051a', '#121238', '#25246a'], fog: '#8a8dff', motes: '#dcdcff',
      pool: ['sombra', 'polilla', 'saltarin', 'escupidor', 'tijereta', 'bombilla', 'caparazon', 'gemelo'], boss: 'ojo' },
    { id: 'eclipse', name: 'Cielo Eclipse', sub: 'Última noche', bg: ['#0e030c', '#2c0a28', '#5c1844'], fog: '#ff7ab0', motes: '#ffdcea',
      pool: ['polilla', 'saltarin', 'escupidor', 'tijereta', 'bombilla', 'caparazon', 'gemelo', 'enjambre', 'centinela'], boss: 'reina' },
  ];

  // cost = peso para presupuestos de oleadas
  L.ENEMIES = {
    sombra:    { name: 'Sombra', hp: 1, r: 15, speed: 72, cost: 1, polen: 2, color: '#2a2440', eye: '#ff9ad5', desc: 'Flota hacia ti sin prisa.' },
    polilla:   { name: 'Polilla Oscura', hp: 1, r: 14, speed: 105, cost: 1.4, polen: 2, color: '#2c2238', eye: '#ffd36e', desc: 'Revolotea en zigzag. Más rápida de lo que parece.' },
    saltarin:  { name: 'Saltarín', hp: 2, r: 17, speed: 0, cost: 2, polen: 3, color: '#20323a', eye: '#7dfcff', desc: 'Se agazapa y salta hacia ti.' },
    gemelo:    { name: 'Gemelo', hp: 2, r: 19, speed: 60, cost: 2.2, polen: 3, color: '#352040', eye: '#ffb0ff', desc: 'Al caer se divide en dos sombras.' },
    enjambre:  { name: 'Enjambre', hp: 1, r: 9, speed: 175, cost: 0.55, polen: 1, color: '#2a1a2a', eye: '#ff6a8a', desc: 'Diminutas y rapidísimas. Llegan en grupo.' },
    escupidor: { name: 'Escupidor', hp: 2, r: 17, speed: 70, cost: 2.4, polen: 4, color: '#1e2a40', eye: '#9effa0', desc: 'Guarda las distancias y te escupe orbes.' },
    tijereta:  { name: 'Tijereta', hp: 1, r: 13, speed: 165, cost: 2, polen: 4, color: '#3a2030', eye: '#ff7a5a', desc: 'Busca tu estela para cortarla. Huye de ti.' },
    bombilla:  { name: 'Bombilla', hp: 1, r: 16, speed: 62, cost: 1.6, polen: 3, color: '#3a3020', eye: '#ffcc4a', desc: 'Estalla al caer y daña a las sombras cercanas. ¡No la toques!' },
    caparazon: { name: 'Caparazón', hp: 4, r: 24, speed: 42, cost: 3, polen: 6, color: '#1c2430', eye: '#a8c8ff', desc: 'Lenta y dura. Hace falta encerrarla varias veces.' },
    centinela: { name: 'Centinela', hp: 3, r: 18, speed: 110, cost: 3.2, polen: 6, color: '#2a1838', eye: '#ff5ad0', desc: 'Te rodea y dispara anillos de orbes.' },
    // jefes
    madre:     { name: 'Madre Polilla', hp: 10, r: 52, speed: 120, boss: true, polen: 40, color: '#2a2034', eye: '#ffd36e', desc: 'Señora del bosque. Cruza el cielo y llama a sus crías.' },
    ojo:       { name: 'El Ojo del Pantano', hp: 15, r: 48, speed: 0, boss: true, polen: 55, color: '#151a3a', eye: '#9effe0', desc: 'Se teletransporta entre la niebla y dispara anillos de orbes.' },
    reina:     { name: 'La Reina Eclipse', hp: 24, r: 58, speed: 90, boss: true, polen: 0, color: '#2a0a24', eye: '#ff5aa0', desc: 'El corazón de la noche. Tres fases, cada una más feroz.' },
  };

  /* ---------------- dones ---------------- */
  const D = [];
  const don = (o) => { D.push(o); return o; };
  // comunes
  don({ id: 'cola', name: 'Cola de Cometa', r: 1, max: 4, icon: 'comet', desc: 'Tu estela es un 25% más larga.', apply: (s) => { s.trailLen *= 1.25; } });
  don({ id: 'alas', name: 'Alas Ligeras', r: 1, max: 3, icon: 'wing', desc: '+12% de velocidad.', apply: (s) => { s.speed *= 1.12; } });
  don({ id: 'musgo', name: 'Corazón de Musgo', r: 1, max: 3, icon: 'heart', desc: '+1 corazón máximo. Te cura 1.', apply: (s) => { s.maxHearts += 1; }, onGain: (w) => w.heal(1) });
  don({ id: 'iman', name: 'Imán de Polen', r: 1, max: 2, icon: 'magnet', desc: 'Atraes el polen desde el doble de distancia.', apply: (s) => { s.magnet *= 2; } });
  don({ id: 'filo', name: 'Lazo Afilado', r: 1, max: 3, icon: 'blade', desc: '+1 de daño a cada lazo.', apply: (s) => { s.loopDmg += 1; } });
  don({ id: 'chispazo', name: 'Chispazo', r: 1, max: 1, icon: 'spark', desc: 'Al cerrar un lazo, una onda daña a las sombras cercanas a su centro.',
    onLoop: (w, c) => { w.shockwave(c.cx, c.cy, 120 + c.r * 0.3, 1, '#ffe28a'); } });
  don({ id: 'destello', name: 'Destello', r: 1, max: 2, icon: 'bolt', desc: 'El impulso se recarga un 30% más rápido.', apply: (s) => { s.dashCd *= 0.7; } });
  don({ id: 'rocio', name: 'Gota de Rocío', r: 1, max: 2, icon: 'drop', desc: 'Al limpiar una sala, 35% de curar 1 corazón.', onClear: (w) => { if (w.rng.chance(0.35)) { w.heal(1); w.text(w.p.x, w.p.y - 30, '+1 ♥', '#ff8aa8'); } } });
  don({ id: 'seda', name: 'Bolsillo de Seda', r: 1, max: 2, icon: 'pouch', desc: '+30% de polen.', apply: (s) => { s.polenMul += 0.3; } });
  don({ id: 'espinas', name: 'Espinas', r: 1, max: 1, icon: 'thorn', desc: 'Tu impulso atraviesa y daña a las sombras (2 de daño).', flag: 'thorns' });
  don({ id: 'fino', name: 'Lazo Fino', r: 1, max: 1, icon: 'needle', desc: 'Los lazos pequeños hacen +2 de daño.', flag: 'fine' });
  don({ id: 'abrazo', name: 'Gran Abrazo', r: 1, max: 1, icon: 'hug', desc: 'Los lazos con 3 o más sombras dan +4 de polen por cada una.',
    onLoop: (w, c) => { if (c.hits.length >= 3) w.dropPolen(c.cx, c.cy, 4 * c.hits.length); } });
  // infrecuentes
  don({ id: 'eco', name: 'Eco', r: 2, max: 1, icon: 'echo', desc: 'Cada lazo vuelve a golpear en el mismo sitio 0,6 s después.', flag: 'echo' });
  don({ id: 'supernova', name: 'Supernova', r: 2, max: 1, icon: 'nova', desc: 'Las sombras que caen en un lazo estallan y dañan a las de alrededor.', flag: 'nova' });
  don({ id: 'escarcha', name: 'Escarcha', r: 2, max: 1, icon: 'snow', desc: 'Los lazos congelan 2 s a las sombras cercanas que no atrapan.',
    onLoop: (w, c) => { for (const e of w.enemies) if (!c.hits.includes(e) && !e.boss && L.dist(e.x, e.y, c.cx, c.cy) < c.r + 160) { e.frozen = 2; } w.ring(c.cx, c.cy, '#aef0ff', c.r + 160); } });
  don({ id: 'hermana', name: 'Luciérnaga Hermana', r: 2, max: 2, icon: 'sister', desc: 'Una compañera orbita a tu alrededor y quema a las sombras que toca.', flag: 'sister' });
  don({ id: 'petalo', name: 'Pétalo Escudo', r: 2, max: 1, icon: 'shield', desc: 'Un escudo bloquea un golpe. Se recarga en cada sala.', flag: 'petal', onRoom: (w) => { w.p.shield = 1; }, onGain: (w) => { w.p.shield = 1; } });
  don({ id: 'remolino', name: 'Remolino', r: 2, max: 1, icon: 'swirl', desc: 'Al cerrar un lazo, atraes las sombras cercanas hacia su centro.',
    onLoop: (w, c) => { for (const e of w.enemies) { if (e.boss) continue; const d = L.dist(e.x, e.y, c.cx, c.cy); if (d < 320 && d > 1) { e.kx += ((c.cx - e.x) / d) * 520; e.ky += ((c.cy - e.y) / d) * 520; } } w.ring(c.cx, c.cy, '#c7a6ff', 320, true); } });
  don({ id: 'flor', name: 'Semilla de Luz', r: 2, max: 1, icon: 'flower', desc: 'Cada lazo planta una flor que quema lo que tenga cerca durante 4 s.',
    onLoop: (w, c) => { w.zones.push({ x: c.cx, y: c.cy, r: Math.min(140, 50 + c.r * 0.4), t: 4, tick: 0, dmg: 1, color: '#ffd0f0', kind: 'flor' }); } });
  don({ id: 'racha', name: 'Racha', r: 2, max: 1, icon: 'chain', desc: 'Lazos seguidos (menos de 1,5 s entre ellos) hacen +1 de daño acumulativo (hasta +3).', flag: 'streak' });
  don({ id: 'ardiente', name: 'Estela Ardiente', r: 2, max: 1, icon: 'flame', desc: 'Tu estela quema a las sombras que la tocan.', flag: 'burn' });
  don({ id: 'niebla', name: 'Velo de Niebla', r: 2, max: 1, icon: 'veil', desc: 'Al recibir un golpe, las sombras se ralentizan 3 s y tu invulnerabilidad dura el doble.', flag: 'veil' });
  don({ id: 'raices', name: 'Raíces Firmes', r: 2, max: 1, icon: 'root', desc: 'Nada puede cortar tu estela.', flag: 'uncut' });
  don({ id: 'polendorado', name: 'Polen Dorado', r: 2, max: 1, icon: 'coin', desc: 'Al limpiar una sala ganas un 15% de tu polen (hasta 25).', onClear: (w) => { const v = Math.min(25, Math.floor(w.polen * 0.15)); if (v) { w.polen += v; w.text(w.p.x, w.p.y - 40, '+' + v + ' polen', '#ffe28a'); } } });
  // raros
  don({ id: 'corona', name: 'Corona Solar', r: 3, max: 1, icon: 'sun', desc: 'Cada cuarto lazo es solar: triple de daño y estalla en llamas.', flag: 'solar' });
  don({ id: 'fenix', name: 'Pluma de Fénix', r: 3, max: 1, icon: 'phoenix', desc: 'Si caes, renaces una vez con 2 corazones.', flag: 'phoenix', onGain: (w) => { w.p.revive = 1; } });
  don({ id: 'reloj', name: 'Reloj de Arena', r: 3, max: 1, icon: 'hourglass', desc: 'Atrapar 2 o más sombras de golpe ralentiza a todas las demás 1,5 s.',
    onLoop: (w, c) => { if (c.hits.length >= 2) { w.slowT = 1.5; } } });
  don({ id: 'perpetuo', name: 'Lazo Perpetuo', r: 3, max: 1, icon: 'infinity', desc: 'Cerrar un lazo no consume tu estela: encadena lazos sin parar.', flag: 'perpetual' });
  don({ id: 'constelacion', name: 'Constelación', r: 3, max: 1, icon: 'stars', desc: 'Cada sombra atrapada recibe +1 de daño por cada otra sombra atrapada con ella.', flag: 'constellation' });
  don({ id: 'cometa', name: 'Cometa', r: 3, max: 1, icon: 'meteor', desc: 'Tu impulso dura el doble y aniquila al instante a las sombras de 1 vida.', apply: (s) => { s.dashDur *= 2; }, flag: 'comet' });
  don({ id: 'cristal', name: 'Corazón de Cristal', r: 3, max: 1, icon: 'gem', desc: '+2 corazones máximos y curación completa, pero −10% de velocidad.', apply: (s) => { s.maxHearts += 2; s.speed *= 0.9; }, onGain: (w) => w.heal(99) });
  don({ id: 'gemela', name: 'Estela Gemela', r: 3, max: 1, icon: 'twin', desc: 'Una segunda estela, reflejo de la tuya, también cierra lazos.', flag: 'twin' });
  L.DONES = D;
  L.DON = Object.fromEntries(D.map((d) => [d.id, d]));
  L.RARITY = { 1: { name: 'Común', color: '#9fd8ff' }, 2: { name: 'Infrecuente', color: '#9cffb0' }, 3: { name: 'Raro', color: '#ffb36a' } };

  /* ---------------- eventos ---------------- */
  L.EVENTS = [
    { id: 'estanque', title: 'El Estanque de las Estrellas', icon: 'pond', text: 'Un agua quieta refleja un cielo que no es el tuyo. Algo brilla en el fondo.',
      opts: [
        { t: 'Beber un sorbo', d: 'Cura 2 corazones.', run: (w) => { w.heal(2); return 'El agua sabe a madrugada. Te sientes mejor.'; } },
        { t: 'Sumergirte a por el brillo', d: 'Pierdes 1 corazón. Ganas un don al azar.', run: (w) => { w.hurtRaw(1); const d = w.randomDon(2); w.addDon(d.id); return 'Sales empapada con ' + d.name + '.'; } },
        { t: 'Seguir tu camino', d: '', run: () => 'Dejas el estanque atrás.' },
      ] },
    { id: 'seta', title: 'La Seta Parlante', icon: 'mushroom', text: '—Psst, lucecita. Por un poco de polen te cuento un secreto. O puedes darme un mordisco, si te atreves.',
      opts: [
        { t: 'Pagar 30 de polen', d: 'Elige entre 3 dones infrecuentes o raros.', cost: 30, run: (w) => { w.polen -= 30; w.pendingChoice = { rarityMin: 2 }; return 'La seta susurra y tres luces se encienden a tu alrededor.'; } },
        { t: 'Morderla', d: '50%: +1 corazón máximo. 50%: pierdes 1 corazón.', run: (w) => { if (w.rng.chance(0.5)) { w.p.bonusHearts++; w.recalc(); w.heal(1); return '¡Deliciosa! Tu luz crece.'; } w.hurtRaw(1); return '¡Puaj! Era venenosa.'; } },
        { t: 'Marcharte', d: '', run: () => '—¡Tú te lo pierdes!' },
      ] },
    { id: 'altar', title: 'El Altar Olvidado', icon: 'altar', text: 'Un altar de piedra cubierto de musgo pide una ofrenda de luz.',
      opts: [
        { t: 'Ofrecer un corazón máximo', d: 'Pierdes 1 corazón máximo. Eliges un don raro entre 3.', can: (w) => w.p.st.maxHearts > 2, run: (w) => { w.p.bonusHearts--; w.recalc(); w.pendingChoice = { rarityMin: 3 }; return 'La piedra se abre en un resplandor dorado.'; } },
        { t: 'Ofrecer 50 de polen', d: 'Ganas un don al azar.', cost: 50, run: (w) => { w.polen -= 50; const d = w.randomDon(1); w.addDon(d.id); return 'El altar te concede ' + d.name + '.'; } },
        { t: 'No ofrecer nada', d: '', run: () => 'El altar sigue esperando a otro viajero.' },
      ] },
    { id: 'arbol', title: 'El Árbol de los Deseos', icon: 'tree', text: 'Sus ramas están llenas de cintas de colores. Solo puedes pedir un deseo.',
      opts: [
        { t: 'Desear fuerza', d: '+1 de daño de lazo. Pierdes 1 corazón.', run: (w) => { w.p.bonusDmg++; w.recalc(); w.hurtRaw(1); return 'Tus lazos se vuelven más afilados.'; } },
        { t: 'Desear salud', d: 'Te curas por completo.', run: (w) => { w.heal(99); return 'Una brisa cálida te envuelve.'; } },
        { t: 'Desear riqueza', d: '+60 de polen.', run: (w) => { w.polen += 60; return 'Llueve polen dorado de las ramas.'; } },
      ] },
    { id: 'cofre', title: 'El Cofre Sombrío', icon: 'chest', text: 'Un cofre tiembla ligeramente. ¿Tesoro o trampa?',
      opts: [
        { t: 'Abrirlo', d: '65%: un don infrecuente. 35%: te muerde (−1 corazón).', run: (w) => { if (w.rng.chance(0.65)) { const d = w.randomDon(2, 2); w.addDon(d.id); return '¡Dentro estaba ' + d.name + '!'; } w.hurtRaw(1); return '¡Era una sombra disfrazada! Te muerde y huye.'; } },
        { t: 'Dejarlo en paz', d: '', run: () => 'Mejor no tentar a la suerte.' },
      ] },
    { id: 'buho', title: 'El Viejo Búho', icon: 'owl', text: '—Uuh. Las luciérnagas jóvenes vuelan demasiado deprisa. Deja que te enseñe algo.',
      opts: [
        { t: 'Aprender a volar', d: '+10% de velocidad.', run: (w) => { w.p.bonusSpeed += 0.1; w.recalc(); return 'Tus alas se mueven con más soltura.'; } },
        { t: 'Aprender paciencia', d: 'Tu estela es un 20% más larga.', run: (w) => { w.p.bonusTrail += 0.2; w.recalc(); return 'Tu luz se alarga como un suspiro.'; } },
        { t: 'Cambiar un don', d: 'Pierdes un don al azar y ganas otro de rareza superior.', can: (w) => w.dones.some((d) => !d.innate && L.DON[d.id].r < 3), run: (w) => { const pool = w.dones.filter((d) => !d.innate && L.DON[d.id].r < 3); const o = w.rng.pick(pool); w.removeDon(o.id); const n = w.randomDon(L.DON[o.id].r + 1, L.DON[o.id].r + 1); w.addDon(n.id); return 'Tu ' + L.DON[o.id].name + ' se transforma en ' + n.name + '.'; } },
      ] },
    { id: 'lluvia', title: 'Lluvia de Polen', icon: 'rain', text: 'Las flores del claro sueltan su polen al viento. Brilla como una nevada dorada.',
      opts: [
        { t: 'Recogerlo todo', d: '+35 de polen.', run: (w) => { w.polen += 35; return 'Llenas los bolsillos de oro brillante.'; } },
        { t: 'Bailar bajo la lluvia', d: 'Cura 1 corazón y +15 de polen.', run: (w) => { w.heal(1); w.polen += 15; return 'Bailas hasta que se apaga la última mota.'; } },
      ] },
    { id: 'espejo', title: 'El Espejo de la Luna', icon: 'mirror', text: 'En el espejo ves otra luciérnaga que te imita… con un don que tú no tienes.',
      opts: [
        { t: 'Tocar el espejo', d: 'Duplicas un don que ya tengas (si se puede acumular). Pierdes 15 de polen.', cost: 15, can: (w) => w.dones.some((d) => w.donCount(d.id) < L.DON[d.id].max), run: (w) => { w.polen -= 15; const pool = w.dones.filter((d) => w.donCount(d.id) < L.DON[d.id].max); const d = w.rng.pick(pool); w.addDon(d.id); return 'Tu reflejo te devuelve ' + L.DON[d.id].name + '.'; } },
        { t: 'Romperlo', d: '+25 de polen. Pierdes 1 corazón.', run: (w) => { w.polen += 25; w.hurtRaw(1); return 'Los cristales se convierten en polen… y uno te corta.'; } },
        { t: 'Alejarte', d: '', run: () => 'La otra luciérnaga te despide con la mano.' },
      ] },
  ];

  L.NODE_TYPES = {
    combat: { name: 'Sombras', icon: 'swords', color: '#9fd8ff', desc: 'Limpia la sala de sombras. Recompensa: un don.' },
    elite: { name: 'Sombra mayor', icon: 'skull', color: '#ff8a8a', desc: 'Sombras más feroces. Recompensa: un don mejor.' },
    treasure: { name: 'Tesoro', icon: 'chest', color: '#ffd36e', desc: 'Un don gratis, sin pelear.' },
    shop: { name: 'Mercado', icon: 'lantern', color: '#9cffb0', desc: 'Cambia polen por dones y corazones.' },
    fountain: { name: 'Manantial', icon: 'drop', color: '#ff9ac8', desc: 'Descansa: cura o fortalece tu luz.' },
    event: { name: 'Misterio', icon: 'question', color: '#d9b3ff', desc: 'Algo inesperado te espera.' },
    boss: { name: 'Guardián', icon: 'crown', color: '#ff6a9a', desc: 'El señor de esta noche.' },
  };

  L.ACH = [
    { id: 'primer', name: 'Primer lazo', desc: 'Atrapa una sombra con un lazo' },
    { id: 'triple', name: 'Lazo triple', desc: 'Atrapa 3 sombras en un solo lazo' },
    { id: 'seis', name: 'Red de estrellas', desc: 'Atrapa 6 sombras en un solo lazo' },
    { id: 'diez', name: 'Constelación viva', desc: 'Atrapa 10 sombras en un solo lazo' },
    { id: 'jefe1', name: 'Madre derrotada', desc: 'Vence a la Madre Polilla' },
    { id: 'pantano', name: 'Entre la niebla', desc: 'Llega al Pantano de Niebla' },
    { id: 'jefe2', name: 'Ojo cerrado', desc: 'Vence al Ojo del Pantano' },
    { id: 'victoria', name: 'Amanecer', desc: 'Gana una partida' },
    { id: 'intacta', name: 'Sin un rasguño', desc: 'Limpia una sala de élite sin recibir daño' },
    { id: 'rica', name: 'Bolsillos llenos', desc: 'Ten 200 de polen a la vez' },
    { id: 'coleccion', name: 'Coleccionista', desc: 'Ten 12 dones a la vez' },
    { id: 'velocista', name: 'Estrella fugaz', desc: 'Gana una partida en menos de 20 minutos' },
    { id: 'luna3', name: 'Luna creciente', desc: 'Gana con la Luna III o superior' },
    { id: 'todos', name: 'Familia de luz', desc: 'Desbloquea todas las luciérnagas' },
  ];

  L.MOONS = [
    { name: 'Luna Llena', desc: 'La noche de siempre.' },
    { name: 'Luna I', desc: 'Aparecen un 25% más de sombras.' },
    { name: 'Luna II', desc: 'Las sombras son un 10% más rápidas.' },
    { name: 'Luna III', desc: 'Empiezas con un corazón menos.' },
    { name: 'Luna IV', desc: 'Las salas tienen una oleada extra.' },
    { name: 'Luna Nueva', desc: 'Los Guardianes tienen un 30% más de vida. La noche más oscura.' },
  ];
})(globalThis.L = globalThis.L || {});
