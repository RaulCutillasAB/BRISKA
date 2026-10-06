/* BRISKA — motor de puntuación. Produce una lista de pasos animables. */
(function (BR) {
  'use strict';

  // Resuelve la definición efectiva de un talismán (copias: Reflejo / Eco)
  function effDef(g, t, depth) {
    depth = depth || 0;
    const d = BR.TAL_BY_ID[t.id];
    if (!d.copy || depth > 6) return d.copy ? null : { def: d, inst: t };
    const i = g.talismans.indexOf(t);
    const tgt = d.copy === 'right' ? g.talismans[i + 1] : g.talismans[0];
    if (!tgt || tgt === t) return null;
    return effDef(g, tgt, depth + 1);
  }

  function score(g, playedCards) {
    const steps = [];
    const opts = g.handOpts();
    for (const c of playedCards) c._debuffed = g.isDebuffed(c);
    const heldCards = g.handCards().filter((c) => !playedCards.includes(c));
    for (const c of heldCards) c._debuffed = g.isDebuffed(c);

    const ev = BR.evaluate(playedCards, opts);
    const ctx = {
      cards: playedCards, scoring: ev.scoring, held: heldCards, type: ev.type, contains: ev.contains,
      isFirst: g.r.handsPlayed === 0, isLast: g.r.handsLeft === 1, cante: null,
    };
    let chips = 0, mult = 0;
    const st = (o) => { o.chips = chips; o.mult = mult; steps.push(o); };
    const active = g.talismans.filter((t) => !t._disabled);

    // efectos de un resultado
    function apply(eff, src) {
      if (!eff) return;
      const one = (kind, val) => {
        if (kind === 'chips') chips += val;
        else if (kind === 'mult') mult += val;
        else if (kind === 'xmult') mult *= val;
        else if (kind === 'money') g.money += val;
        st({ kind, value: val, src });
      };
      if (eff.chips) one('chips', eff.chips);
      if (eff.mult) one('mult', eff.mult);
      if (eff.xmult && eff.xmult !== 1) one('xmult', eff.xmult);
      if (eff.money) one('money', eff.money);
      if (eff.msg) st({ kind: 'msg', text: eff.msg, color: eff.color, src });
    }

    // Comprobaciones del Guardián
    const boss = g.bossActive();
    if (boss && boss.check) {
      const err = boss.check(g, ev, playedCards);
      if (err) {
        return { ev, steps: [{ kind: 'blocked', text: err, chips: 0, mult: 0, src: { t: 'boss' } }], total: 0, blocked: true, ctx };
      }
    }
    if (boss && boss.onPlay) { const m = boss.onPlay(g, playedCards); if (m) st({ kind: 'money', value: m, src: { t: 'boss' } }); }

    // ANTES: talismanes que crecen o modifican
    if (boss && boss.before) { if (boss.before(g, ev)) st({ kind: 'msg', text: '−1 nivel', color: 'm', src: { t: 'boss' } }); }
    for (const t of active) {
      const d = BR.TAL_BY_ID[t.id];
      if (d.before) apply(d.before(ctx, t, g), { t: 'tal', id: t.uid });
    }

    // base de la mano
    const lv = g.handLevel(ev.type);
    const H = BR.HANDS[ev.type];
    chips = H.chips + H.lc * (lv - 1);
    mult = H.mult + H.lm * (lv - 1);
    if (boss && boss.halve) { chips = Math.max(1, Math.floor(chips / 2)); mult = Math.max(1, Math.floor(mult / 2)); }
    st({ kind: 'base', type: ev.type, level: lv, src: { t: 'hand' } });

    // Cantes: Caballo y Rey del mismo palo jugados
    {
      let best = null;
      for (const s of BR.SUITS) {
        const hasC = playedCards.some((c) => !c._debuffed && c.enh !== 'piedra' && c.rank === 11 && c.suit === s);
        const hasR = playedCards.some((c) => !c._debuffed && c.enh !== 'piedra' && c.rank === 12 && c.suit === s);
        if (hasC && hasR) { const k = s === g.r.trump ? 'cuarenta' : 'veinte'; if (!best || k === 'cuarenta') best = k; }
      }
      if (best) {
        ctx.cante = best;
        const v = (best === 'cuarenta' ? 40 : 20) * (g.flags.canteMult || 1);
        chips += v;
        st({ kind: 'cante', value: v, cante: best, src: { t: 'hand' } });
        g.counts.cantes++;
        if (best === 'cuarenta') g.counts.cuarenta++;
      }
    }

    // fichas por carta
    for (const c of ev.scoring) {
      const src = { t: 'card', id: c.id };
      if (c._debuffed) { st({ kind: 'debuffed', src }); continue; }
      let trig = 1 + (c.seal === 'carmesi' ? 1 : 0);
      for (const t of active) {
        const e = effDef(g, t); if (!e || !e.def.retrig) continue;
        trig += e.def.retrig(ctx, e.inst, g, c, 'play') || 0;
      }
      for (let k = 0; k < trig; k++) {
        if (k > 0) st({ kind: 'retrigger', src });
        const cc = c.enh === 'piedra' ? 50 : BR.RANK_INFO[c.rank].chips;
        let base = cc + (c.bonus || 0) + (c.enh === 'ambar' ? 30 : 0);
        chips += base; st({ kind: 'chips', value: base, src });
        if (c.enh === 'rubi') apply({ mult: 4 }, src);
        if (c.enh === 'fortuna') {
          if (g.roll(1, 5)) { apply({ mult: 20 }, src); g.counts.lucky++; }
          if (g.roll(1, 15)) { apply({ money: 20 }, src); g.counts.lucky++; }
        }
        if (c.enh === 'cristal') apply({ xmult: 2 }, src);
        if (g.isTrump(c)) { mult += g.flags.trumpMult || 1; st({ kind: 'mult', value: g.flags.trumpMult || 1, src, trump: true }); }
        if (c.seal === 'dorado') apply({ money: 3 }, src);
        if (c.ed === 'brillante') apply({ chips: 50 }, src);
        if (c.ed === 'iridiscente') apply({ mult: 10 }, src);
        if (c.ed === 'aurora') apply({ xmult: 1.5 }, src);
        for (const t of active) {
          const e = effDef(g, t); if (!e || !e.def.card) continue;
          const r = e.def.card(ctx, e.inst, g, c);
          if (r) apply(r, { t: 'tal', id: t.uid, card: c.id });
        }
      }
    }

    // cartas en la mano
    for (const c of heldCards) {
      const src = { t: 'held', id: c.id };
      if (c._debuffed) continue;
      let trig = 1 + (c.seal === 'carmesi' ? 1 : 0);
      for (const t of active) {
        const e = effDef(g, t); if (!e || !e.def.retrig) continue;
        trig += e.def.retrig(ctx, e.inst, g, c, 'held') || 0;
      }
      for (let k = 0; k < trig; k++) {
        let any = false;
        const tmp = [];
        if (c.enh === 'hierro') { tmp.push(() => apply({ xmult: 1.5 }, src)); any = true; }
        for (const t of active) {
          const e = effDef(g, t); if (!e || !e.def.held) continue;
          const r = e.def.held(ctx, e.inst, g, c);
          if (r) { tmp.push(() => apply(r, { t: 'tal', id: t.uid, card: c.id, held: true })); any = true; }
        }
        if (!any) break;
        if (k > 0) st({ kind: 'retrigger', src });
        tmp.forEach((f) => f());
      }
    }

    // talismanes
    for (const t of g.talismans) {
      const src = { t: 'tal', id: t.uid };
      if (t._disabled) { st({ kind: 'msg', text: 'Eclipsado', src }); continue; }
      if (t.ed === 'brillante') apply({ chips: 50 }, src);
      if (t.ed === 'iridiscente') apply({ mult: 10 }, src);
      const e = effDef(g, t);
      if (e && e.def.hand) apply(e.def.hand(ctx, e.inst, g), src);
      if (t.ed === 'aurora') apply({ xmult: 1.5 }, src);
    }

    // Telescopio Real: constelaciones guardadas
    if (g.vouchers.includes('observatorio')) {
      for (const cn of g.consumables) {
        if (cn.type === 'con' && cn.id === ev.type) apply({ xmult: 1.5 }, { t: 'cons', id: cn.uid });
      }
    }

    // Baraja del Equilibrio
    if (g.flags.balance) {
      const avg = (chips + mult) / 2; chips = avg; mult = avg;
      st({ kind: 'balance', src: { t: 'hand' } });
    }

    chips = Math.max(0, chips); mult = Math.max(0, mult);
    const total = Math.floor(chips * mult);
    st({ kind: 'total', value: total, src: { t: 'hand' } });

    return { ev, steps, total, ctx };
  }

  BR.score = score;
  BR.effDef = effDef;
})(globalThis.BR = globalThis.BR || {});
