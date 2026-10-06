// Bot más fino: evalúa las mejores jugadas con el motor real de puntuación (clonando la partida).
const BR = require('./load')();
const N = +process.argv[2] || 30;
const deckArg = process.argv[3] || 'alba';
const stake = +process.argv[4] || 0;
function combos(arr, k, start = 0, cur = [], out = []) { if (cur.length === k) { out.push(cur.slice()); return out; } for (let i = start; i < arr.length; i++) { cur.push(arr[i]); combos(arr, k, i + 1, cur, out); cur.pop(); } return out; }
function quick(g, ids) { const p = g.previewHand(ids); if (!p || p.blocked) return -1; let c = p.chips; for (const id of p.scoring) { const x = g.card(id); c += x.enh === 'piedra' ? 50 : BR.RANK_INFO[x.rank].chips; } return c * p.mult + ids.length * 0.01; }
function realScore(g, ids) {
  const c = BR.Game.load(g.save());
  const r = c.playHand(ids); return r ? r.total : -1;
}
function bestPlay(g) {
  const all = [];
  for (let k = 1; k <= Math.min(5, g.hand.length); k++) for (const c of combos(g.hand, k)) all.push({ c, v: quick(g, c) });
  all.sort((a, b) => b.v - a.v);
  let best = all[0], bv = -1;
  for (const a of all.slice(0, 12)) { const v = realScore(g, a.c); if (v > bv) { bv = v; best = a; } }
  return { ids: best.c, v: bv };
}
function favType(g) { let b = 'pareja', bv = -1; for (const [k, v] of Object.entries(g.handLevels)) { const s = v.played + v.lvl * 2; if (s > bv) { bv = s; b = k; } } return b; }
const XM = /\{x×/;
function talValue(g, id) { const d = BR.TAL_BY_ID[id]; const t = d.text({ st: d.init ? d.init() : {} }, null); let v = d.rarity * 2 + (XM.test(t) ? 6 : 0) + (d.hand || d.card ? 2 : 0); const fav = favType(g); if (t.includes(BR.HANDS[fav].name)) v += 5; if (d.passive || d.flags) v -= 2; return v; }
function playRound(g) {
  let guard = 0;
  while (g.phase === 'round' && guard++ < 60) {
    for (const k of g.consumables.slice()) {
      const d = BR.consDef(k);
      if (k.type === 'con') { g.useConsumable(k.uid, []); continue; }
      if (!d.sel && g.canUse(k, []) && !['velo', 'duplicado', 'inmolacion', 'espectro', 'ouija', 'sigilo'].includes(k.id)) g.useConsumable(k.uid, []);
      else if (d.sel && !['tijera', 'veleta', 'espejo', 'cantero'].includes(k.id)) { const ids = g.hand.slice(0, d.sel[1]); if (g.canUse(k, ids)) g.useConsumable(k.uid, ids); }
    }
    const need = g.r.target - g.r.score;
    const bp = bestPlay(g);
    if (bp.v < need && bp.v * g.r.handsLeft < need * 1.1 && g.r.discardsLeft > 0) {
      const keep = new Set(g.previewHand(bp.ids).scoring);
      const disc = g.hand.filter((id) => !keep.has(id)).slice(-5);
      if (disc.length) { const r = g.discard(disc); if (r && r.lost) return false; continue; }
    }
    g.playHand(bp.ids);
    const out = g.finishPlay();
    if (out.won) { g.endRound(); return true; }
    if (out.lost) return false;
  }
  return g.phase !== 'over';
}
function shopBot(g) {
  let guard = 0;
  while (guard++ < 20) {
    let did = false;
    if (g.shop.voucher && g.money >= g.itemCost(g.shop.voucher) + 8) { g.buy('voucher'); did = true; }
    for (let i = 0; i < g.shop.items.length; i++) {
      const it = g.shop.items[i]; if (!it) continue; const cost = g.itemCost(it);
      if (!g.canAfford(cost)) continue;
      if (it.kind === 'tal') {
        if (g.talismans.length < g.talSlots()) { g.buy('items', i); did = true; }
        else { // reemplazar el peor si este es mejor
          let worst = g.talismans[0]; for (const t of g.talismans) if (talValue(g, t.id) < talValue(g, worst.id)) worst = t;
          if (talValue(g, it.id) > talValue(g, worst.id) + 2 && g.money + g.sellValue(worst) >= cost) { g.sellTalisman(worst.uid); g.buy('items', i); did = true; }
        }
      } else if (it.kind === 'con' && (it.id === favType(g) || g.counts.consts < 2) && g.money - cost >= 5) { g.buy('items', i, true); did = true; }
    }
    for (let i = 0; i < g.shop.packs.length; i++) { const it = g.shop.packs[i]; if (!it) continue; if ((it.pack === 'con' || it.pack === 'tal') && g.money >= g.itemCost(it) + 10) { g.buy('packs', i); did = true; packBot(g); } }
    if (!did && g.money >= g.rerollCostNow() + 25) { g.reroll(); did = true; }
    if (!did) break;
  }
}
function packBot(g) {
  let guard = 0;
  while (g.phase === 'pack' && guard++ < 10) {
    let done = false;
    const fav = favType(g);
    const ch = g.pack.choices.filter(Boolean).sort((a, b) => (a.kind === 'tal' ? -talValue(g, a.id) : a.id === fav ? -10 : 0) - (b.kind === 'tal' ? -talValue(g, b.id) : b.id === fav ? -10 : 0));
    for (const c of ch) {
      let ids = [];
      if (c.kind === 'aug' || c.kind === 'ani') { const d = BR.consDef({ type: c.kind, id: c.id }); if (d.sel) ids = g.pack.hand.slice(0, d.sel[1]); if (['velo', 'duplicado', 'inmolacion', 'tijera', 'espectro', 'ouija', 'cantero'].includes(c.id)) continue; }
      const r = g.pickFromPack(c.key, ids); if (r && !r.err) { done = true; break; }
    }
    if (!done) g.skipPack();
  }
}
let wins = 0; const antes = {}; const errs = []; const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const g = BR.Game.create({ deckId: deckArg, stake, seed: 'B' + i });
  try {
    let guard = 0;
    while (guard++ < 300) {
      if (g.phase === 'blind') { g.selectBlind(); }
      else if (g.phase === 'round') playRound(g);
      else if (g.phase === 'cashout') { if (g.cashOut() === 'victory') break; }
      else if (g.phase === 'shop') { shopBot(g); g.advanceAfterShop(); }
      else if (g.phase === 'pack') packBot(g);
      else break;
    }
    if (g.won) wins++; antes[g.ante] = (antes[g.ante] || 0) + 1;
  } catch (e) { errs.push(e.stack); }
}
console.log(`deck=${deckArg} stake=${stake} runs=${N} wins=${wins} (${(100 * wins / N).toFixed(1)}%) ${(Date.now() - t0) / 1000}s`, JSON.stringify(antes));
if (errs.length) console.log(errs.slice(0, 2).join('\n'));
