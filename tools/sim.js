// Bot simple que juega partidas completas para comprobar estabilidad y equilibrio.
const BR = require('./load')();
const N = +process.argv[2] || 200;
const deckArg = process.argv[3] || 'alba';
const stake = +process.argv[4] || 0;

function combos(arr, k, start = 0, cur = [], out = []) {
  if (cur.length === k) { out.push(cur.slice()); return out; }
  for (let i = start; i < arr.length; i++) { cur.push(arr[i]); combos(arr, k, i + 1, cur, out); cur.pop(); }
  return out;
}
function estimate(g, ids) {
  const p = g.previewHand(ids);
  if (!p || p.blocked) return -1;
  let chips = p.chips, mult = p.mult;
  for (const id of p.scoring) { const c = g.card(id); if (c._debuffed) continue; chips += c.enh === 'piedra' ? 50 : BR.RANK_INFO[c.rank].chips + (c.bonus || 0); if (g.isTrump(c)) mult += 1; }
  // talismanes de mano aproximados
  let xm = 1;
  for (const t of g.talismans) {
    const d = BR.TAL_BY_ID[t.id];
    if (d.hand) {
      try {
        const cards = ids.map((i) => g.card(i));
        const ev = BR.evaluate(cards, g.handOpts());
        const r = d.hand({ cards, scoring: ev.scoring, held: [], type: ev.type, contains: ev.contains, isFirst: g.r.handsPlayed === 0, isLast: g.r.handsLeft === 1 }, t, g) || {};
        chips += r.chips || 0; mult += r.mult || 0; if (r.xmult) xm *= r.xmult;
      } catch (e) {}
    }
  }
  return chips * mult * xm;
}
function bestPlay(g) {
  const hand = g.hand.slice();
  let best = null, bv = -2;
  for (let k = 1; k <= Math.min(5, hand.length); k++) for (const c of combos(hand, k)) {
    const v = estimate(g, c);
    if (v > bv || (v === bv && c.length > best.length)) { bv = v; best = c; }
  }
  return { ids: best, v: bv };
}

function playRound(g) {
  let guard = 0;
  while (g.phase === 'round' && guard++ < 100) {
    // usar consumibles sin selección
    for (const k of g.consumables.slice()) {
      const d = BR.consDef(k);
      if (!d.sel && g.canUse(k, [])) { if (k.type === 'ani' && ['velo', 'duplicado', 'inmolacion'].includes(k.id)) continue; g.useConsumable(k.uid, []); }
      else if (d.sel && k.type !== 'ani' && !['tijera', 'veleta', 'espejo'].includes(k.id)) { const ids = g.hand.slice(0, d.sel[1]); if (g.canUse(k, ids)) g.useConsumable(k.uid, ids); }
    }
    const need = g.r.target - g.r.score;
    const bp = bestPlay(g);
    if (bp.v * 1.0 < need / Math.max(1, g.r.handsLeft) && g.r.discardsLeft > 0 && g.r.handsLeft > 0) {
      const keep = new Set(g.previewHand(bp.ids).scoring);
      const disc = g.hand.filter((id) => !keep.has(id)).slice(-5);
      if (disc.length) { g.discard(disc); continue; }
    }
    const res = g.playHand(bp.ids);
    if (!res) throw new Error('play failed');
    const out = g.finishPlay();
    if (out.won) { g.endRound(); return true; }
    if (out.lost) return false;
  }
  return g.phase !== 'over';
}

function shopBot(g) {
  let guard = 0;
  while (guard++ < 30) {
    let did = false;
    // voucher
    if (g.shop.voucher && g.money >= g.itemCost(g.shop.voucher) + 5) { g.buy('voucher'); did = true; }
    for (let i = 0; i < g.shop.items.length; i++) {
      const it = g.shop.items[i]; if (!it) continue;
      const cost = g.itemCost(it);
      if (g.money < cost) continue;
      if (it.kind === 'tal' && g.talismans.length < g.talSlots()) { g.buy('items', i); did = true; }
      else if (it.kind === 'con' && g.consSpace() > 0) { g.buy('items', i); did = true; }
    }
    for (let i = 0; i < g.shop.packs.length; i++) {
      const it = g.shop.packs[i]; if (!it) continue;
      if (g.money >= g.itemCost(it) + 4) {
        g.buy('packs', i); did = true; packBot(g);
      }
    }
    // vender talismán más barato si lleno y hay rara en tienda
    if (!did && g.money >= g.rerollCostNow() + 10 && g.talismans.length < g.talSlots()) { g.reroll(); did = true; }
    if (!did) break;
  }
  // si los talismanes están llenos y los primeros son flojos, no hacer nada
}
function packBot(g) {
  let guard = 0;
  while (g.phase === 'pack' && guard++ < 10) {
    const ch = g.pack.choices.filter(Boolean);
    let done = false;
    for (const c of ch) {
      let ids = [];
      if (c.kind === 'aug' || c.kind === 'ani') {
        const d = BR.consDef({ type: c.kind, id: c.id });
        if (d.sel) ids = g.pack.hand.slice(0, d.sel[1]);
        if (c.kind === 'ani' && ['velo', 'duplicado', 'inmolacion', 'tijera'].includes(c.id)) continue;
      }
      const r = g.pickFromPack(c.key, ids);
      if (r && !r.err) { done = true; break; }
    }
    if (!done) g.skipPack();
  }
}

let wins = 0; const antes = {}; const errs = [];
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const g = BR.Game.create({ deckId: deckArg, stake, seed: 'SIM' + i });
  try {
    let guard = 0;
    while (guard++ < 200) {
      if (g.phase === 'blind') {
        if (g.blindIdx < 2 && g.rng.chance(0.15)) { g.skipBlind(); if (g.openPendingPack('blind')) packBot(g); continue; }
        g.selectBlind();
        // save/load round-trip
        const s = JSON.stringify(g.save()); const g2 = BR.Game.load(JSON.parse(s));
        if (g2.hand.length !== g.hand.length) throw new Error('save mismatch');
      } else if (g.phase === 'round') { playRound(g); }
      else if (g.phase === 'cashout') { const r = g.cashOut(); if (r === 'victory') break; }
      else if (g.phase === 'shop') { shopBot(g); g.advanceAfterShop(); }
      else if (g.phase === 'pack') packBot(g);
      else if (g.phase === 'over') break;
    }
    if (g.won) wins++;
    antes[g.ante] = (antes[g.ante] || 0) + 1;
  } catch (e) { errs.push(e.stack); }
}
console.log(`deck=${deckArg} stake=${stake} runs=${N} wins=${wins} (${(100 * wins / N).toFixed(1)}%) time=${Date.now() - t0}ms`);
console.log('ante final:', antes);
if (errs.length) { console.log('ERRORS', errs.length); console.log(errs.slice(0, 3).join('\n\n')); }
