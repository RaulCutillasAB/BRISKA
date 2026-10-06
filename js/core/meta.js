/* BRISKA — perfil del jugador: progreso, desbloqueos, estadísticas y ajustes */
(function (BR) {
  'use strict';
  const KEY = 'briska.profile.v1', RUNKEY = 'briska.run.v1';
  const mem = {};
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] || null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } },
  };
  const DEFAULT = () => ({
    v: 1,
    disc: {},
    stats: { runs: 0, wins: 0, bestHand: 0, bestAnte: 0, hands: 0, cuarenta: 0, consts: 0, bossesBeaten: 0, money: 0, bestHandType: null, playedTypes: {} },
    deckWins: {},
    stakeUnlocked: 0,
    decks: ['alba'],
    settings: { speed: 2, sfx: 0.7, music: 0.45, shake: true, bg: 'high', particles: true },
    tutorial: false,
    lastDeck: 'alba', lastStake: 0,
  });
  const M = {};
  M.load = function () {
    let d = null;
    try { d = JSON.parse(store.get(KEY) || 'null'); } catch (e) { d = null; }
    const base = DEFAULT();
    M.data = d ? { ...base, ...d, stats: { ...base.stats, ...(d.stats || {}) }, settings: { ...base.settings, ...(d.settings || {}) } } : base;
    return M.data;
  };
  M.save = function () { store.set(KEY, JSON.stringify(M.data)); };
  M.saveRun = function (g) { if (!g) return store.del(RUNKEY); store.set(RUNKEY, JSON.stringify(g.save())); };
  M.loadRun = function () { try { const s = store.get(RUNKEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } };
  M.clearRun = function () { store.del(RUNKEY); };
  M.reset = function () { store.del(KEY); store.del(RUNKEY); M.load(); };

  M.isDisc = (kind, id) => !!(M.data.disc[kind + ':' + id]);
  M.discover = function (list) {
    let n = 0;
    for (const k of list || []) if (!M.data.disc[k]) { M.data.disc[k] = 1; n++; }
    return n;
  };
  M.countDisc = function (kind) { return Object.keys(M.data.disc).filter((k) => k.startsWith(kind + ':')).length; };

  M.flushGame = function (g) {
    if (g.discovered && g.discovered.length) { M.discover(g.discovered); g.discovered = []; }
  };

  // comprueba desbloqueos; devuelve lista de mensajes
  M.checkUnlocks = function (g) {
    const out = [];
    const S = M.data.stats;
    if (g) {
      S.bestAnte = Math.max(S.bestAnte, g.ante);
    }
    for (const D of BR.DECKS) {
      if (M.data.decks.includes(D.id) || !D.unlock) continue;
      const u = D.unlock;
      let ok = false;
      if (u.type === 'ante') ok = S.bestAnte >= u.v;
      if (u.type === 'consts') ok = S.consts + (g ? g.counts.consts : 0) >= u.v;
      if (u.type === 'cuarenta') ok = S.cuarenta + (g ? g.counts.cuarenta : 0) >= u.v;
      if (u.type === 'wins') ok = S.wins >= u.v;
      if (u.type === 'stake') ok = Object.values(M.data.deckWins).some((s) => s >= u.v - 1);
      if (ok) { M.data.decks.push(D.id); out.push({ kind: 'deck', id: D.id, text: '¡Nueva baraja desbloqueada: ' + D.name + '!' }); }
    }
    return out;
  };

  M.recordHand = function (g, total, type) {
    const S = M.data.stats;
    S.hands++;
    S.playedTypes[type] = (S.playedTypes[type] || 0) + 1;
    if (total > S.bestHand) { S.bestHand = total; S.bestHandType = type; return true; }
    return false;
  };

  M.endRun = function (g, won) {
    const S = M.data.stats;
    S.runs++;
    if (won) {
      S.wins++;
      const prev = M.data.deckWins[g.deckId] == null ? -1 : M.data.deckWins[g.deckId];
      M.data.deckWins[g.deckId] = Math.max(prev, g.stake);
      if (g.stake + 1 > M.data.stakeUnlocked && g.stake + 1 < BR.STAKES.length) M.data.stakeUnlocked = g.stake + 1;
    }
    S.cuarenta += g.counts.cuarenta; S.consts += g.counts.consts; S.bossesBeaten += g.counts.bosses;
    g.counts._flushed = true;
    S.bestAnte = Math.max(S.bestAnte, g.ante);
    const un = M.checkUnlocks(null);
    M.save();
    return un;
  };
  BR.Meta = M;
})(globalThis.BR = globalThis.BR || {});
