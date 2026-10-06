// Tests del núcleo: node tools/test.js
const BR = require('./load')();
let pass = 0, fail = 0;
const eq = (a, b, msg) => { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('✗', msg, '→', JSON.stringify(a), '!=', JSON.stringify(b)); } };
const C = (s) => s.split(' ').map((t, i) => { const m = t.match(/^(A|\d|S|C|R)(o|c|e|b)(\*)?$/); const r = { A: 1, S: 10, C: 11, R: 12 }[m[1]] || +m[1]; const suit = { o: 'oros', c: 'copas', e: 'espadas', b: 'bastos' }[m[2]]; return { id: 'x' + i, suit, rank: r, enh: m[3] ? 'piedra' : null }; });
const ev = (s, o) => BR.evaluate(C(s), o);

eq(ev('Ao Ac').type, 'pareja', 'pareja');
eq(ev('Ao Ac 3e 3b').type, 'doble', 'doble pareja');
eq(ev('Ao Ac Ae').type, 'trio', 'trio');
eq(ev('Ao Ac Ae 2b 2c').type, 'full', 'full');
eq(ev('Ao Ac Ae Ab').type, 'poker', 'poker');
eq(ev('Ao 2c 3e 4b 5c').type, 'escalera', 'escalera baja');
eq(ev('7o Sc Ce Rb Ac').type, 'escalera', 'escalera alta 7-S-C-R-A');
eq(ev('5o 6c 7e Sb Cc').type, 'escalera', 'escalera 5-6-7-S-C');
eq(ev('Co Rc Ae 2b 3c').type, 'alta', 'sin vuelta C-R-A-2-3');
eq(ev('Ao 3o 5o 7o Ro').type, 'color', 'color');
eq(ev('Ao 2o 3o 4o 5o').type, 'escolor', 'escalera de color');
eq(ev('Ao Ao Ao Ao Ao').type, 'repcolor', 'repoker de color');
eq(ev('Ao Ac Ae Ab Ac').type, 'repoker', 'repoker');
eq(ev('Ao Ao Ao 2o 2o').type, 'fullcolor', 'full de color');
eq(ev('Ao 3o 5o 7o', { fourFingers: true }).type, 'color', 'mano agil color 4');
eq(ev('Ao 2c 3e 4b', { fourFingers: true }).type, 'escalera', 'mano agil escalera 4');
eq(ev('Ao 3c 4e 6b 7c', { shortcut: true }).type, 'escalera', 'atajo');
eq(ev('Ao 3c 4e 6b 7c').type, 'alta', 'sin atajo');
eq(ev('Ao Ac 5e*').scoring.length, 3, 'piedra siempre puntua');
eq(ev('Ao Ac 5e').scoring.length, 2, 'pareja puntua 2');
eq(ev('Ao Ac 5e', { splash: true }).scoring.length, 3, 'oleaje');
eq(ev('Ro 2c').scoring.map((c) => c.rank), [12], 'carta alta: rey');
eq(ev('Ro Ac').scoring.map((c) => c.rank), [1], 'carta alta: as manda');
eq(ev('Ao Ac Ae 2b 2c').contains.doble, true, 'full contiene doble');
eq(ev('Ao 3c 5o 7c Ro', { smeared: true }).type, 'color', 'tintes mezclados');
{ const cs = C('Ao 3o 5o 7o Rc'); cs[4].enh = 'prisma'; eq(BR.evaluate(cs).type, 'color', 'prisma comodín de palo'); }

// puntuación
function mk(seed) { const g = BR.Game.create({ deckId: 'alba', seed: seed || 'TEST' }); g.selectBlind(); return g; }
{
  const g = mk(); g.r.trump = 'bastos';
  const a = g.makeCard('oros', 1), b = g.makeCard('copas', 1); g.deck.push(a, b); g._cardIndex = null; g.hand.push(a.id, b.id);
  const r = g.playHand([a.id, b.id]); eq(r.total, (10 + 11 + 11) * 2, 'pareja de ases = 64');
}
{
  const g = mk(); g.r.trump = 'oros';
  const a = g.makeCard('oros', 1), b = g.makeCard('copas', 1); g.deck.push(a, b); g._cardIndex = null; g.hand.push(a.id, b.id);
  const r = g.playHand([a.id, b.id]); eq(r.total, (10 + 22) * 3, 'triunfo +1 mult');
}
{
  const g = mk(); g.r.trump = 'espadas';
  const a = g.makeCard('copas', 11), b = g.makeCard('copas', 12); g.deck.push(a, b); g._cardIndex = null; g.hand.push(a.id, b.id);
  const r = g.playHand([a.id, b.id]); eq(r.ctx.cante, 'veinte', 'las veinte'); eq(r.total, (5 + 20 + 10) * 1, 'veinte: carta alta rey + 20');
}
{
  const g = mk(); g.r.trump = 'copas';
  const a = g.makeCard('copas', 11), b = g.makeCard('copas', 12); g.deck.push(a, b); g._cardIndex = null; g.hand.push(a.id, b.id);
  const r = g.playHand([a.id, b.id]); eq(r.ctx.cante, 'cuarenta', 'las cuarenta'); eq(r.total, (5 + 40 + 10) * (1 + 1), 'cuarenta + triunfo');
}
{
  const g = mk(); g.r.trump = 'bastos';
  g.addTalisman(g.newTalisman('reflejo')); g.addTalisman(g.newTalisman('chispa'));
  const a = g.makeCard('oros', 1), b = g.makeCard('copas', 1); g.deck.push(a, b); g._cardIndex = null; g.hand.push(a.id, b.id);
  const r = g.playHand([a.id, b.id]); eq(r.total, 32 * (2 + 4 + 4), 'reflejo copia chispa');
}
{
  const g = mk(); g.r.trump = 'bastos';
  g.addTalisman(g.newTalisman('sibila'));
  const a = g.makeCard('oros', 1), b = g.makeCard('copas', 1); g.deck.push(a, b); g._cardIndex = null; g.hand.push(a.id, b.id);
  const r = g.playHand([a.id, b.id]); eq(r.total, (10 + 44) * 2, 'sibila redispara');
}
{
  const g = mk(); g.r.trump = 'bastos';
  g.addTalisman(g.newTalisman('sieteymedio'));
  const a = g.makeCard('oros', 7), b = g.makeCard('copas', 10); g.deck.push(a, b); g._cardIndex = null; g.hand.push(a.id, b.id);
  const r = g.playHand([a.id, b.id]); eq(r.total, Math.floor((5 + 8) * 1 * 3), 'siete y media x3');
}
{
  const g = mk(); g.r.trump = 'bastos';
  const a = g.makeCard('oros', 1); a.enh = 'cristal'; g.deck.push(a); g._cardIndex = null; g.hand.push(a.id);
  const r = g.playHand([a.id]); eq(r.total, (5 + 11) * 2, 'cristal x2');
}
// guardado y carga
{
  const g = mk('SAVE'); g.addTalisman(g.newTalisman('vela'));
  const s = JSON.stringify(g.save()); const g2 = BR.Game.load(JSON.parse(s));
  eq(g2.hand.length, g.hand.length, 'load hand'); eq(g2.card(g2.hand[0]).id, g.hand[0], 'load card index'); eq(g2.talismans[0].st.v, 20, 'load talisman state');
  eq(g2.rng.next(), g.rng.next(), 'rng state');
}
// economía
{
  const g = mk('ECO'); g.money = 23; g.r.score = g.r.target; g.r.handsLeft = 2;
  const r = g.endRound(); eq(r.total, 3 + 2 + 4, 'cobro: 3 + 2 manos + interes 4');
}
// todos los consumibles se pueden usar sin romper
{
  let errs = 0;
  for (const list of [BR.AUGURIOS, BR.CONSTS, BR.ANIMAS]) for (const d of list) {
    const g = mk('CONS' + d.id); g.addTalisman(g.newTalisman('chispa')); g.addTalisman(g.newTalisman('vela'));
    g.addConsumable({ type: d.type, id: d.id }); const k = g.consumables[g.consumables.length - 1];
    const ids = d.sel ? g.hand.slice(0, d.sel[1]) : [];
    try { const r = g.useConsumable(k.uid, ids); if (!r && (!d.can || d.can(g))) { console.log('no usable', d.id); errs++; } } catch (e) { console.log('ERR', d.id, e.message); errs++; }
  }
  eq(errs, 0, 'consumibles');
}
// todos los talismanes puntúan sin romper
{
  let errs = 0;
  for (const t of BR.TALISMANS) {
    const g = mk('TAL' + t.id); g.addTalisman(g.newTalisman(t.id)); g.addTalisman(g.newTalisman('chispa'));
    try { for (let i = 0; i < 3 && g.phase === 'round'; i++) { g.playHand(g.hand.slice(0, 5)); const o = g.finishPlay(); if (o.won) { g.endRound(); g.cashOut(); break; } g.discard(g.hand.slice(0, 2)); } } catch (e) { console.log('ERR', t.id, e.stack); errs++; }
  }
  eq(errs, 0, 'talismanes');
}
// todos los guardianes
{
  let errs = 0;
  for (const b of BR.BOSSES) {
    const g = BR.Game.create({ seed: 'BOSS' + b.id }); g.blindIdx = 2; g.bossId = b.id; g.addTalisman(g.newTalisman('chispa'));
    try { g.selectBlind(); for (let i = 0; i < 6 && g.phase === 'round'; i++) { g.playHand(g.hand.slice(0, 5)); const o = g.finishPlay(); if (o.won || o.lost) break; } } catch (e) { console.log('ERR', b.id, e.stack); errs++; }
  }
  eq(errs, 0, 'guardianes');
}
// insignias
{
  let errs = 0;
  for (const t of BR.TAGS) { const g = BR.Game.create({ seed: 'TAG' + t.id }); try { g.gainTag(t.id); if (g.openPendingPack('blind')) g.skipPack(); g.selectBlind(); g.r.score = g.r.target; g.endRound(); g.cashOut(); } catch (e) { console.log('ERR', t.id, e.stack); errs++; } }
  eq(errs, 0, 'insignias');
}
// privilegios
{
  let errs = 0;
  for (const v of BR.VOUCHERS) { const g = BR.Game.create({ seed: 'V' + v.id }); try { g.enterShop(); g.money = 100; g.shop.voucher = { kind: 'voucher', id: v.id }; const r = g.buy('voucher'); if (r.err) throw new Error(r.err); g.advanceAfterShop(); g.selectBlind(); } catch (e) { console.log('ERR', v.id, e.stack); errs++; } }
  eq(errs, 0, 'privilegios');
}
// barajas
{
  let errs = 0;
  for (const d of BR.DECKS) { try { const g = BR.Game.create({ deckId: d.id, seed: 'DK' }); g.selectBlind(); if (g.hand.length < 1) throw new Error('mano vacía'); } catch (e) { console.log('ERR', d.id, e.stack); errs++; } }
  eq(errs, 0, 'barajas');
}
console.log(`\n${pass} OK, ${fail} fallos`);
process.exit(fail ? 1 : 0);
