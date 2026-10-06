/* BRISKA — evaluación de manos */
(function (BR) {
  'use strict';

  // opts: { fourFingers, shortcut, smeared, splash }
  function suitMatches(card, suit, opts) {
    if (card.enh === 'piedra') return false;
    if (card.enh === 'prisma' && !card._debuffed) return true;
    if (card.suit === suit) return true;
    if (opts && opts.smeared) {
      const warm = (s) => s === 'oros' || s === 'copas';
      return warm(card.suit) === warm(suit);
    }
    return false;
  }

  function evaluate(cards, opts) {
    opts = opts || {};
    const normal = cards.filter((c) => c.enh !== 'piedra');
    const stones = cards.filter((c) => c.enh === 'piedra');
    const need = opts.fourFingers ? 4 : 5;

    // grupos por valor
    const groups = new Map();
    for (const c of normal) {
      if (!groups.has(c.rank)) groups.set(c.rank, []);
      groups.get(c.rank).push(c);
    }
    const gl = [...groups.values()].sort((a, b) => b.length - a.length || BR.rankPower(b[0].rank) - BR.rankPower(a[0].rank));

    // color
    let flush = null;
    if (normal.length >= need) {
      for (const s of BR.SUITS) {
        const m = normal.filter((c) => suitMatches(c, s, opts));
        if (m.length >= need && (!flush || m.length > flush.length)) flush = m;
      }
    }

    // escalera
    let straight = null;
    if (normal.length >= need) {
      const ords = new Set();
      for (const c of normal) { const o = BR.RANK_INFO[c.rank].ord; ords.add(o); if (c.rank === 1) ords.add(10); }
      const sorted = [...ords].sort((a, b) => a - b);
      const step = opts.shortcut ? 2 : 1;
      let best = [], cur = [sorted[0]];
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - cur[cur.length - 1] <= step) cur.push(sorted[i]);
        else { if (cur.length > best.length) best = cur; cur = [sorted[i]]; }
      }
      if (cur.length > best.length) best = cur;
      if (best.length >= need) {
        const set = new Set(best);
        straight = normal.filter((c) => set.has(BR.RANK_INFO[c.rank].ord) || (c.rank === 1 && set.has(10)));
      }
    }

    const g0 = gl[0] ? gl[0].length : 0;
    const g1 = gl[1] ? gl[1].length : 0;
    const contains = {
      alta: true,
      pareja: g0 >= 2,
      doble: g0 >= 2 && g1 >= 2,
      trio: g0 >= 3,
      poker: g0 >= 4,
      repoker: g0 >= 5,
      full: g0 >= 3 && g1 >= 2,
      color: !!flush,
      escalera: !!straight,
    };
    contains.escolor = contains.color && contains.escalera;
    contains.fullcolor = contains.full && contains.color;
    contains.repcolor = contains.repoker && contains.color;

    let type = 'alta';
    for (const t of BR.HAND_ORDER) if (contains[t]) { type = t; break; }

    let sc = new Set();
    const add = (arr) => arr && arr.forEach((c) => sc.add(c));
    switch (type) {
      case 'repcolor': case 'repoker': add(gl[0]); add(flush); break;
      case 'fullcolor': case 'full': add(gl[0]); add(gl[1]); add(flush); break;
      case 'escolor': add(straight); add(flush); break;
      case 'poker': add(gl[0]); break;
      case 'color': add(flush); break;
      case 'escalera': add(straight); break;
      case 'trio': add(gl[0]); break;
      case 'doble': add(gl[0]); add(gl[1]); break;
      case 'pareja': add(gl[0]); break;
      default: {
        if (normal.length) {
          let hi = normal[0];
          for (const c of normal) if (BR.rankPower(c.rank) > BR.rankPower(hi.rank)) hi = c;
          sc.add(hi);
        }
      }
    }
    add(stones);
    if (opts.splash) add(cards);
    const scoring = cards.filter((c) => sc.has(c));
    return { type, scoring, contains };
  }

  BR.evaluate = evaluate;
  BR.suitMatches = suitMatches;
})(globalThis.BR = globalThis.BR || {});
