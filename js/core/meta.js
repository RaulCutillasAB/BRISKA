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
  /* ---------------- logros ---------------- */
  M.ACH = [
    { id: 'primer', name: 'Primer envite', icon: 'spark', desc: 'Supera tu primer envite', check: (e) => e.type === 'round' },
    { id: 'guardian', name: 'Cazador de sombras', icon: 'mask2', desc: 'Derrota a un Guardián', check: (e) => e.type === 'round' && e.boss },
    { id: 'veinte', name: 'Cantaor', icon: 'horn', desc: 'Canta Las Veinte', check: (e) => e.type === 'hand' && !!e.cante },
    { id: 'cuarenta', name: '¡Las Cuarenta!', icon: 'forty', desc: 'Canta Las Cuarenta en el palo de Triunfo', check: (e) => e.type === 'hand' && e.cante === 'cuarenta' },
    { id: 'mil', name: 'Mano firme', icon: 'hand', desc: 'Consigue 1.000 puntos en una sola mano', check: (e) => e.type === 'hand' && e.total >= 1000 },
    { id: 'diezmil', name: 'Mano maestra', icon: 'crown', desc: 'Consigue 10.000 puntos en una sola mano', check: (e) => e.type === 'hand' && e.total >= 1e4 },
    { id: 'cienmil', name: 'Mano legendaria', icon: 'crown2', desc: 'Consigue 100.000 puntos en una sola mano', check: (e) => e.type === 'hand' && e.total >= 1e5 },
    { id: 'millon', name: 'Firmamento', icon: 'comet', desc: 'Consigue 1.000.000 de puntos en una sola mano', check: (e) => e.type === 'hand' && e.total >= 1e6 },
    { id: 'unamano', name: 'De un golpe', icon: 'target', desc: 'Supera un envite con una sola mano', check: (e) => e.type === 'round' && e.g.r && e.g.r.handsPlayed === 1 },
    { id: 'frio', name: 'Sangre fría', icon: 'drop', desc: 'Derrota a un Guardián sin descartar', check: (e) => e.type === 'round' && e.boss && e.g.r && e.g.r.discardsUsed === 0 },
    { id: 'noche4', name: 'Medianoche', icon: 'moon', desc: 'Llega a la Noche 4', check: (e) => e.g && e.g.ante >= 4 },
    { id: 'victoria', name: 'Amanecer', icon: 'sun', desc: 'Gana una partida', check: (e) => e.type === 'win' },
    { id: 'noche10', name: 'Más allá del alba', icon: 'eclipse', desc: 'Llega a la Noche 10 en modo infinito', check: (e) => e.g && e.g.ante >= 10 },
    { id: 'rico', name: 'Bolsa llena', icon: 'chest', desc: 'Ten $50 a la vez', check: (e) => e.g && e.g.money >= 50 },
    { id: 'escolor', name: 'Escalera Real', icon: 'stairs', desc: 'Juega una Escalera de Color', check: (e) => e.type === 'hand' && e.contains && e.contains.escolor },
    { id: 'repoker', name: 'Cinco iguales', icon: 'cards', desc: 'Juega un Repóker', check: (e) => e.type === 'hand' && e.contains && e.contains.repoker },
    { id: 'lleno', name: 'Galería completa', icon: 'frame', desc: 'Ten 5 Talismanes a la vez', check: (e) => e.g && e.g.talismans.length >= 5 },
    { id: 'cristal', name: 'Añicos', icon: 'gem', desc: 'Rompe 3 cartas de Cristal en una partida', check: (e) => e.g && e.g.counts.glass >= 3 },
    { id: 'nivel5', name: 'Astrónomo', icon: 'astrolabe', desc: 'Sube una mano a nivel 5', check: (e) => e.g && Object.values(e.g.handLevels).some((h) => h.lvl >= 5) },
    { id: 'legend', name: 'Leyenda viva', icon: 'butterfly', desc: 'Consigue un Talismán Legendario', check: (e) => e.g && e.g.talismans.some((t) => BR.TAL_BY_ID[t.id].legendary) },
    { id: 'biblio', name: 'Bibliófilo', icon: 'book', desc: 'Descubre 40 Talismanes', check: () => M.countDisc('tal') >= 40 },
    { id: 'prisa', name: 'Prisa nocturna', icon: 'feather', desc: 'Salta 3 envites en una partida', check: (e) => e.g && e.g.counts.skips >= 3 },
    { id: 'tahur', name: 'Tahúr', icon: 'twins', desc: 'Desbloquea todas las barajas', check: () => M.data.decks.length >= BR.DECKS.length },
    { id: 'dorada', name: 'Llama eterna', icon: 'candle', desc: 'Gana una partida en Vela de Medianoche', check: (e) => e.type === 'win' && e.g.stake >= 5 },
    { id: 'diario', name: 'Fiel a la cita', icon: 'hourglass', desc: 'Llega a la Noche 3 en un Reto del día', check: (e) => e.g && e.g.daily && e.g.ante >= 3 },
  ];
  M.checkAch = function (ev) {
    const out = [];
    M.data.ach = M.data.ach || {};
    for (const a of M.ACH) {
      if (M.data.ach[a.id]) continue;
      let ok = false;
      try { ok = !!a.check(ev); } catch (e) { ok = false; }
      if (ok) { M.data.ach[a.id] = Date.now(); out.push(a); }
    }
    if (out.length) M.save();
    return out;
  };

  /* ---------------- reto del día ---------------- */
  M.today = function () { const d = new Date(); return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); };
  M.dailyInfo = function () {
    const key = M.today();
    const n = parseInt(key, 10);
    const deck = BR.DECKS[n % BR.DECKS.length];
    const best = (M.data.daily && M.data.daily.date === key) ? M.data.daily : null;
    return { key, seed: 'DIA' + key.slice(2), deckId: deck.id, best };
  };
  M.recordDaily = function (g) {
    if (!g.daily) return;
    const key = g.daily;
    if (!M.data.daily || M.data.daily.date !== key) M.data.daily = { date: key, ante: 0, best: 0, tries: 0 };
    M.data.daily.ante = Math.max(M.data.daily.ante, g.ante);
    M.data.daily.best = Math.max(M.data.daily.best, g.counts.best);
    M.save();
  };

  BR.Meta = M;
})(globalThis.BR = globalThis.BR || {});
