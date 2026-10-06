/* BRISKA — estado y reglas de la partida (sin DOM) */
(function (BR) {
  'use strict';

  const EDITION_W = { brillante: 0.02, iridiscente: 0.014, aurora: 0.003, eclipse: 0.003 };

  class Game {
    constructor() {}

    /* ------------------------------------------------------------ */
    static create({ deckId = 'alba', stake = 0, seed = null } = {}) {
      const g = new Game();
      g.seed = (seed || BR.randomSeed()).toUpperCase();
      g.rng = new BR.RNG(BR.hashSeed(g.seed));
      g.deckId = deckId;
      g.stake = stake;
      g.ante = 1;
      g.blindIdx = 0;
      g.phase = 'blind';
      g.money = 4;
      g.base = { hands: 4, discards: 3, handSize: 8, talSlots: 5, consSlots: 2 };
      g.flags = {};
      g.vouchers = [];
      g.talismans = [];
      g.consumables = [];
      g.tags = [];
      g.nextId = 1;
      g.deck = [];
      g.drawPile = []; g.hand = []; g.played = []; g.discardPile = [];
      g.handLevels = {};
      for (const h of BR.HAND_ORDER) g.handLevels[h] = { lvl: 1, played: 0 };
      g.counts = { consts: 0, augs: 0, anis: 0, bosses: 0, skips: 0, cantes: 0, cuarenta: 0, lucky: 0, hands: 0, glass: 0, sold: 0, best: 0, cardsAdded: 0, rerolls: 0, discards: 0 };
      g.lastCons = null;
      g.bossesSeen = [];
      g.anteplayed = [];
      g.trumpLock = null;
      g.sortMode = 'rank';
      g.shop = null; g.pack = null; g.r = null;
      g.won = false; g.endless = false;
      g.log = [];

      const D = BR.DECK_BY_ID[deckId] || BR.DECKS[0];
      const cards = D.build ? D.build(g.rng) : (() => { const c = []; for (const s of BR.SUITS) for (const r of BR.RANKS) c.push({ suit: s, rank: r }); return c; })();
      for (const c of cards) g.deck.push(g.makeCard(c.suit, c.rank));
      if (D.apply) D.apply(g);
      if (stake >= 3) g.base.discards -= 1;
      if (stake >= 5) g.base.hands -= 1;
      g.prepareAnte();
      return g;
    }

    static load(data) {
      const g = new Game();
      Object.assign(g, JSON.parse(JSON.stringify(data)));
      g.rng = new BR.RNG(data.rngState);
      delete g.rngState;
      return g;
    }

    save() {
      const o = {};
      for (const k of Object.keys(this)) { if (k === 'rng' || k === 'log' || k[0] === '_') continue; o[k] = this[k]; }
      o.rngState = this.rng.s;
      const s = JSON.parse(JSON.stringify(o, (k, v) => (k === '_debuffed' || k === '_disabled' ? undefined : v)));
      return s;
    }

    /* ---------------------- consultas ---------------------- */
    card(id) { return this._cardIndex ? (this._cardIndex.get(id) || this._reindex(id)) : this._reindex(id); }
    _reindex(id) { this._cardIndex = new Map(this.deck.map((c) => [c.id, c])); return this._cardIndex.get(id); }
    handCards() { return this.hand.map((id) => this.card(id)).filter(Boolean); }
    hasTal(id) { return this.talismans.some((t) => t.id === id && !t._disabled); }
    talFlags() {
      const f = {};
      for (const t of this.talismans) { if (t._disabled) continue; const d = BR.TAL_BY_ID[t.id]; if (d.flags) for (const k in d.flags) f[k] = true; }
      return f;
    }
    handOpts() { const f = this.talFlags(); return { fourFingers: f.fourFingers, shortcut: f.shortcut, smeared: f.smeared, splash: f.splash }; }
    passive(key) {
      let v = 0;
      for (const t of this.talismans) { const d = BR.TAL_BY_ID[t.id]; if (d.passive && d.passive[key]) v += d.passive[key]; }
      return v;
    }
    talSlots() { return this.base.talSlots + (this.vouchers.includes('vitrina') ? 1 : 0) + (this.vouchers.includes('galeria') ? 1 : 0) + this.talismans.filter((t) => t.ed === 'eclipse').length; }
    consSlots() { return this.base.consSlots + (this.vouchers.includes('bolsillo') ? 1 : 0); }
    consSpace() { return this.consSlots() - this.consumables.length; }
    handSize() {
      let v = this.base.handSize + (this.vouchers.includes('telar') ? 1 : 0) + (this.vouchers.includes('grantelar') ? 1 : 0) + this.passive('handSize');
      const b = this.bossActive(); if (b && b.handSize) v += b.handSize;
      return Math.max(1, v);
    }
    handsPerRound() { return Math.max(1, this.base.hands + (this.vouchers.includes('manofirme') ? 1 : 0) + (this.vouchers.includes('manohierro') ? 1 : 0)); }
    discardsPerRound() { return Math.max(0, this.base.discards + (this.vouchers.includes('papelera') ? 1 : 0) + (this.vouchers.includes('incinerador') ? 1 : 0) + this.passive('discards')); }
    interestCap() { return this.vouchers.includes('cofre') ? 20 : this.vouchers.includes('alcancia') ? 10 : 5; }
    debtLimit() { return this.passive('debt'); }
    canAfford(p) { return this.money - p >= -this.debtLimit(); }

    isFace(c) { if (c.enh === 'piedra') return false; if (this.talFlags().allFaces) return true; return c.rank >= 10; }
    suitIs(c, s) { return BR.suitMatches(c, s, this.handOpts()); }
    isTrump(c) { return !!(this.r && this.r.trump && c.enh !== 'piedra' && !c._debuffed && this.suitIs(c, this.r.trump)); }
    bossActive() {
      if (!this.r || this.r.kind !== 'boss') return null;
      if (this.talFlags().noBoss) return null;
      return BR.BOSS_BY_ID[this.r.bossId];
    }
    currentBoss() { return BR.BOSS_BY_ID[this.bossId]; }
    isDebuffed(c) { const b = this.bossActive(); return !!(b && b.debuff && b.debuff(c, this)); }
    roll(n, d) { const m = this.talFlags().doubleProb ? 2 : 1; return this.rng.next() < (n * m) / d; }
    handLevel(type) { const b = this.bossActive(); if (b && b.levelOne) return 1; return this.handLevels[type].lvl; }
    levelUp(type, n) { this.handLevels[type].lvl = Math.max(1, this.handLevels[type].lvl + n); }

    /* ---------------------- creación ---------------------- */
    makeCard(suit, rank) { return { id: 'c' + (this.nextId++), suit, rank, enh: null, seal: null, ed: null, bonus: 0 }; }
    addCardToDeck(c, where) {
      this.deck.push(c); this._cardIndex = null;
      if (where === 'hand' && this.phase === 'round') this.hand.push(c.id);
      else if (where === 'hand' && this.phase === 'pack' && this.pack && this.pack.hand) this.pack.hand.push(c.id);
      else if (this.phase === 'round') this.drawPile.splice(this.rng.int(0, this.drawPile.length), 0, c.id);
      this.counts.cardsAdded++;
      this.fire('cardAdded', 1);
    }
    destroyCards(cards) {
      const ids = new Set(cards.map((c) => c.id));
      this.deck = this.deck.filter((c) => !ids.has(c.id)); this._cardIndex = null;
      for (const k of ['drawPile', 'hand', 'played', 'discardPile']) this[k] = this[k].filter((id) => !ids.has(id));
      if (this.pack && this.pack.hand) this.pack.hand = this.pack.hand.filter((id) => !ids.has(id));
    }
    newTalisman(id) {
      const d = BR.TAL_BY_ID[id];
      return { uid: 't' + (this.nextId++), id, ed: null, st: d.init ? d.init() : {} };
    }
    addTalisman(t, force) {
      if (!force && this.talismans.length >= this.talSlots() && t.ed !== 'eclipse') return false;
      this.talismans.push(t);
      this.discover('tal', t.id);
      return true;
    }
    destroyTalisman(t) { const i = this.talismans.indexOf(t); if (i >= 0) this.talismans.splice(i, 1); }
    addConsumable(c) {
      if (!c) return false;
      if (this.consumables.length >= this.consSlots()) return false;
      const inst = { uid: 'k' + (this.nextId++), type: c.type, id: c.id };
      this.consumables.push(inst);
      this.discover(c.type, c.id);
      return inst;
    }
    discover(kind, id) { (this.discovered = this.discovered || []).push(kind + ':' + id); }

    rollEdition(mult) {
      const m = (this.vouchers.includes('gemarara') ? 4 : this.vouchers.includes('gema') ? 2 : 1) * (mult || 1);
      const r = this.rng.next();
      let acc = 0;
      for (const e of ['aurora', 'eclipse', 'iridiscente', 'brillante']) { acc += EDITION_W[e] * m; if (r < acc) return e; }
      return null;
    }
    randomTalismanId(rarity, exclude) {
      if (!rarity) { const r = this.rng.next(); rarity = r < 0.7 ? 1 : r < 0.95 ? 2 : 3; }
      const owned = new Set(this.talismans.map((t) => t.id).concat(exclude || []));
      let pool = BR.TALISMANS.filter((t) => t.rarity === rarity && !t.legendary && !owned.has(t.id));
      if (!pool.length) pool = BR.TALISMANS.filter((t) => t.rarity === rarity && !t.legendary);
      return this.rng.pick(pool).id;
    }
    randomAugurio(exclude) {
      const pool = BR.AUGURIOS.filter((a) => !(exclude || []).includes(a.id));
      return { type: 'aug', id: this.rng.pick(pool).id };
    }
    availableConsts() { return BR.CONSTS.filter((c) => !BR.HANDS[c.hand].secret || this.handLevels[c.hand].played > 0); }
    randomConst(exclude) {
      const pool = this.availableConsts().filter((c) => !(exclude || []).includes(c.id));
      return { type: 'con', id: this.rng.pick(pool.length ? pool : this.availableConsts()).id };
    }
    randomAnima(exclude) {
      const pool = BR.ANIMAS.filter((a) => !(exclude || []).includes(a.id));
      return { type: 'ani', id: this.rng.weighted(pool, (a) => a.w || 1).id };
    }

    /* ---------------------- eventos de talismanes ---------------------- */
    fire(hook, ...args) {
      const out = [];
      for (const t of this.talismans.slice()) {
        const d = BR.TAL_BY_ID[t.id];
        if (d[hook]) { const r = d[hook](t, this, ...args); if (r) { out.push({ uid: t.uid, name: d.name, ...r }); if (r.money) this.money += r.money; } }
      }
      return out;
    }

    /* ---------------------- noches y envites ---------------------- */
    prepareAnte() {
      this.blindIdx = 0;
      this.anteplayed = [];
      const finalAnte = this.ante % 8 === 0;
      let pool = BR.BOSSES.filter((b) => (finalAnte ? b.final : !b.final && b.min <= this.ante));
      const fresh = pool.filter((b) => !this.bossesSeen.includes(b.id));
      if (fresh.length) pool = fresh; else this.bossesSeen = this.bossesSeen.filter((id) => !pool.some((b) => b.id === id));
      this.bossId = this.rng.pick(pool).id;
      this.bossesSeen.push(this.bossId);
      this.blindTags = [this.randomTag(), this.randomTag()];
      this.phase = 'blind';
    }
    rerollBoss() {
      const finalAnte = this.ante % 8 === 0;
      const pool = BR.BOSSES.filter((b) => (finalAnte ? b.final : !b.final && b.min <= this.ante) && b.id !== this.bossId);
      this.bossId = this.rng.pick(pool).id;
    }
    randomTag() {
      const pool = BR.TAGS.filter((t) => (t.min || 1) <= this.ante);
      return this.rng.pick(pool).id;
    }
    blindKind(i) { return ['small', 'big', 'boss'][i == null ? this.blindIdx : i]; }
    blindTarget(i) {
      const kind = this.blindKind(i);
      const base = BR.anteBase(this.ante, this.stake);
      let m = kind === 'small' ? 1 : kind === 'big' ? 1.5 : (BR.BOSS_BY_ID[this.bossId].targetMult || 2);
      m *= this.flags.targetMult || 1;
      return Math.floor(base * m);
    }
    blindReward(i) {
      const kind = this.blindKind(i);
      if (kind === 'small') return this.stake >= 1 ? 0 : 3;
      if (kind === 'big') return 4;
      return this.ante % 8 === 0 ? 8 : 5;
    }

    skipBlind() {
      if (this.phase !== 'blind' || this.blindIdx > 1) return null;
      const tagId = this.blindTags[this.blindIdx];
      this.counts.skips++;
      this.blindIdx++;
      const res = this.gainTag(tagId);
      return res;
    }
    gainTag(tagId, noDouble) {
      const res = { tag: tagId, extra: [] };
      const doubles = this.tags.filter((t) => t === 'doble');
      if (!noDouble && tagId !== 'doble' && doubles.length) {
        this.tags = this.tags.filter((t) => t !== 'doble');
        for (let i = 0; i < doubles.length; i++) res.extra.push(this.gainTag(tagId, true));
      }
      switch (tagId) {
        case 'prisa': this.money += 5 * this.counts.skips; res.money = 5 * this.counts.skips; break;
        case 'economia': { const v = Math.max(0, Math.min(40, this.money)); this.money += v; res.money = v; break; }
        case 'guardian': this.rerollBoss(); res.boss = true; break;
        case 'celeste': this.queuePack('con', 'mega'); break;
        case 'arcana': this.queuePack('aug', 'mega'); break;
        case 'espectral': this.queuePack('ani', 'normal'); break;
        case 'bufon': this.queuePack('tal', 'mega'); break;
        default: this.tags.push(tagId);
      }
      return res;
    }
    queuePack(kind, size) { (this.pendingPacks = this.pendingPacks || []).push({ kind, size }); }
    openPendingPack(ret) {
      if (!this.pendingPacks || !this.pendingPacks.length) return false;
      const p = this.pendingPacks.shift();
      this.openPack(p.kind, p.size, ret);
      return true;
    }

    selectBlind() {
      if (this.phase !== 'blind') return;
      const kind = this.blindKind();
      let trump = this.rng.pick(BR.SUITS);
      if (this.trumpLock) { trump = this.trumpLock.suit; this.trumpLock.n--; if (this.trumpLock.n <= 0) this.trumpLock = null; }
      this.r = {
        kind, bossId: kind === 'boss' ? this.bossId : null,
        target: this.blindTarget(), score: 0,
        handsLeft: this.handsPerRound(), discardsLeft: this.discardsPerRound(),
        handsPlayed: 0, discardsUsed: 0, typesPlayed: [], trump, lastType: null, startMoney: this.money,
      };
      this.phase = 'round';
      this.drawPile = this.rng.shuffle(this.deck.map((c) => c.id));
      this.hand = []; this.played = []; this.discardPile = [];
      for (const c of this.deck) { delete c._down; }
      if (kind === 'boss') this.discover('boss', this.bossId);
      const b = this.bossActive();
      if (b && b.start) b.start(this);
      const ev = this.fire('blindStart');
      this.draw();
      return ev;
    }
    pickEclipse() {
      for (const t of this.talismans) delete t._disabled;
      if (this.talismans.length) this.rng.pick(this.talismans)._disabled = true;
    }
    draw() {
      const n = this.handSize() - this.hand.length;
      const b = this.bossActive();
      const drawn = [];
      for (let i = 0; i < n && this.drawPile.length; i++) {
        const id = this.drawPile.pop();
        const c = this.card(id);
        if (b && b.faceDown && b.faceDown(c, this)) c._down = true;
        this.hand.push(id); drawn.push(id);
      }
      this.sortHand();
      return drawn;
    }
    sortHand(mode) {
      if (mode) this.sortMode = mode;
      const key = (c) => {
        const rp = c.enh === 'piedra' ? -1 : BR.rankPower(c.rank);
        const sp = c.enh === 'piedra' ? -1 : BR.SUITS.indexOf(c.suit);
        return this.sortMode === 'suit' ? sp * 100 + rp : rp * 10 + sp;
      };
      const arr = this.handCards();
      arr.sort((a, b) => key(b) - key(a));
      this.hand = arr.map((c) => c.id);
    }
    reorderHand(ids) { if (ids.length === this.hand.length && ids.every((id) => this.hand.includes(id))) this.hand = ids.slice(); }
    reorderTalismans(uids) {
      const m = new Map(this.talismans.map((t) => [t.uid, t]));
      if (uids.length === this.talismans.length && uids.every((u) => m.has(u))) this.talismans = uids.map((u) => m.get(u));
    }

    previewHand(ids) {
      const cards = ids.map((id) => this.card(id));
      if (!cards.length) return null;
      for (const c of cards) c._debuffed = this.isDebuffed(c);
      const ev = BR.evaluate(cards, this.handOpts());
      const lv = this.handLevel(ev.type); const H = BR.HANDS[ev.type];
      let chips = H.chips + H.lc * (lv - 1), mult = H.mult + H.lm * (lv - 1);
      const b = this.bossActive();
      if (b && b.halve) { chips = Math.max(1, Math.floor(chips / 2)); mult = Math.max(1, Math.floor(mult / 2)); }
      let blocked = null;
      if (b && b.check) blocked = b.check(this, ev, cards);
      return { type: ev.type, level: lv, chips, mult, scoring: ev.scoring.map((c) => c.id), blocked };
    }

    playHand(ids) {
      if (this.phase !== 'round' || !ids.length || ids.length > 5 || this.r.handsLeft <= 0) return null;
      if (!ids.every((id) => this.hand.includes(id))) return null;
      const cards = ids.map((id) => this.card(id));
      this.hand = this.hand.filter((id) => !ids.includes(id));
      this.played = ids.slice();
      for (const c of cards) delete c._down;
      const res = BR.score(this, cards);
      this.r.handsLeft--;
      this.r.handsPlayed++;
      this.counts.hands++;
      if (res.blocked) {
        res.total = 0;
      } else {
        this.r.typesPlayed.push(res.ev.type);
        this.r.lastType = res.ev.type;
        this.handLevels[res.ev.type].played++;
        this.r.score += res.total;
        if (res.total > this.counts.best) this.counts.best = res.total;
        // después de puntuar
        for (const t of this.talismans.slice()) {
          const d = BR.TAL_BY_ID[t.id];
          if (d.after && !t._disabled) {
            const r = d.after(res.ctx, t, this);
            if (r) res.steps.push({ kind: 'msg', text: r.msg, color: r.color, src: { t: 'tal', id: t.uid }, chips: 0, mult: 0, post: true });
          }
        }
      }
      for (const id of ids) if (!this.anteplayed.includes(id)) this.anteplayed.push(id);
      res.scoringIds = res.ev.scoring.map((c) => c.id);
      this._lastPlay = res;
      return res;
    }

    finishPlay() {
      const res = this._lastPlay;
      const out = { broken: [], discarded: [], drawn: [], won: false, lost: false, fenix: false };
      if (!res) return out;
      // cristales que se rompen
      if (!res.blocked) {
        for (const c of res.ev.scoring) {
          if (c.enh === 'cristal' && !c._debuffed && this.roll(1, 4)) out.broken.push(c);
        }
      }
      if (out.broken.length) {
        this.destroyCards(out.broken);
        this.counts.glass += out.broken.length;
        out.glassEv = this.fire('glassBroken', out.broken.length);
      }
      this.discardPile.push(...this.played.filter((id) => this.card(id)));
      this.played = [];
      const b = this.bossActive();
      if (b && b.after) { const d = b.after(this); if (d) out.discarded = d; }
      this._lastPlay = null;
      if (this.r.score >= this.r.target) { out.won = true; return out; }
      if (this.r.handsLeft <= 0) {
        const fen = this.talismans.find((t) => t.id === 'fenix');
        if (fen && this.r.score >= this.r.target * 0.25) {
          this.destroyTalisman(fen); out.won = true; out.fenix = true; this.r.fenix = true; return out;
        }
        out.lost = true; this.phase = 'over'; return out;
      }
      out.drawn = this.draw();
      if (!this.hand.length) { out.lost = true; out.empty = true; this.phase = 'over'; }
      return out;
    }
    randomDiscard(n) {
      const ids = this.rng.shuffle(this.hand.slice()).slice(0, n);
      this.hand = this.hand.filter((id) => !ids.includes(id));
      this.discardPile.push(...ids);
      return ids;
    }

    discard(ids) {
      if (this.phase !== 'round' || !ids.length || ids.length > 5 || this.r.discardsLeft <= 0) return null;
      if (!ids.every((id) => this.hand.includes(id))) return null;
      const cards = ids.map((id) => this.card(id));
      this.r.discardsLeft--; this.r.discardsUsed++; this.counts.discards++;
      const ev = this.fire('discard', cards);
      const created = [];
      for (const c of cards) {
        if (c.seal === 'violeta') { const k = this.addConsumable(this.randomAugurio()); if (k) created.push(k); }
      }
      this.hand = this.hand.filter((id) => !ids.includes(id));
      this.discardPile.push(...ids);
      for (const c of cards) delete c._down;
      const drawn = this.draw();
      const res = { ev, created, drawn };
      if (!this.hand.length) { res.lost = true; this.phase = 'over'; }
      return res;
    }

    /* ---------------------- fin de ronda ---------------------- */
    endRound() {
      const lines = [];
      const kind = this.r.kind;
      const rew = this.blindReward();
      lines.push({ label: kind === 'boss' ? 'Guardián derrotado' : BR.RIVALS[kind].name, value: rew, kind: 'reward' });
      const handMoney = this.flags.handMoney || 1;
      if (this.r.handsLeft > 0) lines.push({ label: `Manos restantes (${this.r.handsLeft}) × $${handMoney}`, value: this.r.handsLeft * handMoney, kind: 'hands' });
      if (this.flags.discardMoney && this.r.discardsLeft > 0) lines.push({ label: `Descartes restantes (${this.r.discardsLeft})`, value: this.r.discardsLeft * this.flags.discardMoney, kind: 'discards' });

      // cartas en mano: oro y lacre zafiro
      const held = this.handCards();
      let gold = 0;
      for (const c of held) if (c.enh === 'oro' && !this.isDebuffed(c)) gold += 3;
      const trigGold = this.hasTal('guitarra') ? 2 : 1;
      if (gold) lines.push({ label: 'Cartas de Oro en la mano', value: gold * trigGold, kind: 'gold' });
      const created = [];
      for (const c of held) {
        if (c.seal === 'zafiro' && this.r.lastType) { const k = this.addConsumable({ type: 'con', id: this.r.lastType }); if (k) created.push(k); }
      }
      // talismanes
      const tev = this.fire('roundEnd');
      if (kind === 'boss') {
        this.counts.bosses++;
        tev.push(...this.fire('bossBeaten'));
        const inv = this.tags.filter((t) => t === 'inversor').length;
        if (inv) { lines.push({ label: 'Insignia del Inversor', value: 25 * inv, kind: 'tag' }); this.tags = this.tags.filter((t) => t !== 'inversor'); }
      }
      for (const e of tev) if (e.money) lines.push({ label: e.name, value: e.money, kind: 'tal', uid: e.uid });
      // el dinero de los talismanes se cobra junto al resto
      let already = 0; for (const e of tev) if (e.money) already += e.money;
      this.money -= already;
      if (this.vouchers.includes('tarotista')) { const k = this.addConsumable(this.randomAugurio()); if (k) created.push(k); }
      // interés (sobre el dinero antes de cobrar)
      if (!this.flags.noInterest) {
        const it = Math.min(this.interestCap(), Math.floor(Math.max(0, this.money) / 5));
        if (it > 0) lines.push({ label: `Interés ($1 por cada $5, máx. $${this.interestCap()})`, value: it, kind: 'interest' });
      }
      for (const t of this.talismans) delete t._disabled;
      this.cashLines = lines;
      this.cashTotal = lines.reduce((s, l) => s + l.value, 0);
      this.phase = 'cashout';
      // devolver cartas a la baraja
      this.hand = []; this.drawPile = []; this.discardPile = []; this.played = [];
      for (const c of this.deck) { delete c._down; delete c._debuffed; }
      return { lines, total: this.cashTotal, created, tev };
    }

    cashOut() {
      if (this.phase !== 'cashout') return;
      this.money += this.cashTotal;
      this.cashLines = null;
      const wasBoss = this.r.kind === 'boss';
      const finalWin = wasBoss && this.ante === 8 && !this.won;
      this.r = null;
      if (finalWin) { this.won = true; this.phase = 'victory'; return 'victory'; }
      this.enterShop();
      return 'shop';
    }
    continueEndless() { this.endless = true; this.enterShop(); }

    advanceAfterShop() {
      if (this.blindIdx === 2) { this.ante++; this.prepareAnte(); }
      else { this.blindIdx++; this.phase = 'blind'; }
    }

    /* ---------------------- feria (tienda) ---------------------- */
    priceMult() { return this.vouchers.includes('saldo') ? 0.5 : this.vouchers.includes('descuento') ? 0.75 : 1; }
    price(base) { return Math.max(1, Math.floor((base + (this.stake >= 4 ? 1 : 0)) * this.priceMult())); }
    itemCost(it) {
      if (it.free) return 0;
      if (it.kind === 'tal') return this.price(BR.TAL_BY_ID[it.id].cost + (it.ed ? BR.EDITIONS[it.ed].cost : 0));
      if (it.kind === 'aug' || it.kind === 'con') return this.price(3);
      if (it.kind === 'ani') return this.price(4);
      if (it.kind === 'pack') return this.price(BR.PACK_SIZES[it.size].cost);
      if (it.kind === 'voucher') return this.price(10);
      return 1;
    }
    sellValue(t) {
      if (t.type) return 1 + (t.type === 'ani' ? 1 : 0);
      const d = BR.TAL_BY_ID[t.id];
      return Math.max(1, Math.floor((d.cost + (t.ed ? BR.EDITIONS[t.ed].cost : 0)) / 2) + (t.sellBonus || 0));
    }
    shopSlots() { return 2 + (this.vouchers.includes('mostrador') ? 1 : 0) + (this.vouchers.includes('granbazar') ? 1 : 0); }
    genShopItem() {
      const wAug = this.vouchers.includes('taller') ? 8 : 4;
      const wCon = this.vouchers.includes('lupa') ? 8 : 4;
      const kind = this.rng.weighted(['tal', 'aug', 'con'], (k) => (k === 'tal' ? 20 : k === 'aug' ? wAug : wCon));
      if (kind === 'tal') return { kind, id: this.randomTalismanId(null, this.shop ? this.shop.items.filter((i) => i && i.kind === 'tal').map((i) => i.id) : []), ed: this.rollEdition() };
      if (kind === 'aug') return { kind, id: this.randomAugurio().id };
      return { kind, id: this.randomConst().id };
    }
    genPack() {
      const kind = this.rng.weighted(['aug', 'con', 'tal', 'nai', 'ani'], (k) => ({ aug: 4, con: 4, tal: 1.6, nai: 3, ani: 0.6 }[k]));
      const size = this.rng.weighted(Object.keys(BR.PACK_SIZES), (s) => BR.PACK_SIZES[s].w);
      return { kind: 'pack', pack: kind, size, art: this.rng.int(0, 2) };
    }
    availableVouchers() { return BR.VOUCHERS.filter((v) => !this.vouchers.includes(v.id) && (!v.req || this.vouchers.includes(v.req))); }
    enterShop() {
      this.phase = 'shop';
      const keepVoucher = this.shop && this.shop.voucherAnte === this.ante ? this.shop.voucher : undefined;
      this.shop = { items: [], packs: [], rerollCost: 5, freeRerolls: 0, voucher: null, voucherAnte: this.ante };
      if (keepVoucher !== undefined) this.shop.voucher = keepVoucher;
      else { const av = this.availableVouchers(); this.shop.voucher = av.length ? { kind: 'voucher', id: this.rng.pick(av).id } : null; }
      for (let i = 0; i < this.shopSlots(); i++) this.shop.items.push(this.genShopItem());
      this.shop.packs = [this.genPack(), this.genPack()];
      if (this.vouchers.includes('halcon')) this.shop.rerollCost -= 2;
      if (this.vouchers.includes('aguila')) this.shop.rerollCost -= 2;
      this.shop.baseReroll = this.shop.rerollCost;
      // insignias que afectan a la feria
      const applied = [];
      const keep = [];
      for (const tg of this.tags) {
        if (tg === 'cupon') { for (const it of this.shop.items) it.free = true; for (const p of this.shop.packs) p.free = true; applied.push(tg); }
        else if (tg === 'rara') { this.shop.items.unshift({ kind: 'tal', id: this.randomTalismanId(3), ed: null, free: true }); applied.push(tg); }
        else if (tg === 'iris' || tg === 'aurora') {
          let it = this.shop.items.find((i) => i.kind === 'tal' && !i.free);
          if (!it) { it = { kind: 'tal', id: this.randomTalismanId() }; this.shop.items.unshift(it); }
          it.ed = tg === 'iris' ? 'iridiscente' : 'aurora'; it.free = true; applied.push(tg);
        } else if (tg === 'destino') { this.shop.rerollCost = 0; applied.push(tg); }
        else keep.push(tg);
      }
      this.tags = keep;
      this.fire('shopEnter');
      this.shopTagsApplied = applied;
      return applied;
    }
    reroll() {
      if (this.phase !== 'shop') return false;
      const free = this.shop.freeRerolls > 0;
      const cost = free ? 0 : this.shop.rerollCost;
      if (!this.canAfford(cost)) return false;
      if (free) this.shop.freeRerolls--; else { this.money -= cost; this.shop.rerollCost++; }
      this.counts.rerolls++;
      this.shop.items = [];
      for (let i = 0; i < this.shopSlots(); i++) this.shop.items.push(this.genShopItem());
      return true;
    }
    rerollCostNow() { return this.shop.freeRerolls > 0 ? 0 : this.shop.rerollCost; }

    buy(where, idx) {
      if (this.phase !== 'shop') return { err: 'No estás en la Feria' };
      const it = where === 'items' ? this.shop.items[idx] : where === 'packs' ? this.shop.packs[idx] : this.shop.voucher;
      if (!it) return { err: 'Agotado' };
      const cost = this.itemCost(it);
      if (!this.canAfford(cost)) return { err: 'No tienes suficiente dinero' };
      if (it.kind === 'tal') {
        if (this.talismans.length >= this.talSlots() && it.ed !== 'eclipse') return { err: 'No te quedan huecos de Talismán' };
        const t = this.newTalisman(it.id); t.ed = it.ed || null;
        this.money -= cost; this.addTalisman(t, true);
        this.shop.items[idx] = null;
        return { ok: true, talisman: t };
      }
      if (it.kind === 'aug' || it.kind === 'con' || it.kind === 'ani') {
        if (this.consSpace() <= 0) return { err: 'No te quedan huecos de consumible' };
        this.money -= cost;
        const k = this.addConsumable({ type: it.kind, id: it.id });
        this.shop.items[idx] = null;
        return { ok: true, consumable: k };
      }
      if (it.kind === 'pack') {
        this.money -= cost;
        this.shop.packs[idx] = null;
        this.openPack(it.pack, it.size, 'shop');
        return { ok: true, pack: true };
      }
      if (it.kind === 'voucher') {
        this.money -= cost;
        this.vouchers.push(it.id);
        this.discover('vou', it.id);
        this.shop.voucher = null;
        this.applyVoucher(it.id);
        return { ok: true, voucher: it.id };
      }
      return { err: '?' };
    }
    applyVoucher(id) {
      if (id === 'mostrador' || id === 'granbazar') { this.shop.items.push(this.genShopItem()); }
      if (id === 'halcon' || id === 'aguila') { this.shop.rerollCost = Math.max(0, this.shop.rerollCost - 2); }
    }

    sellTalisman(uid) {
      const t = this.talismans.find((x) => x.uid === uid); if (!t) return null;
      const v = this.sellValue(t);
      this.destroyTalisman(t); this.money += v; this.counts.sold++;
      const ev = this.fire('otherSold', t);
      return { value: v, ev };
    }
    sellConsumable(uid) {
      const i = this.consumables.findIndex((x) => x.uid === uid); if (i < 0) return null;
      const v = this.sellValue(this.consumables[i]);
      this.consumables.splice(i, 1); this.money += v; this.counts.sold++;
      const ev = this.fire('otherSold', null);
      return { value: v, ev };
    }

    /* ---------------------- consumibles ---------------------- */
    selectionCards(ids) {
      return ids.map((id) => this.card(id)).filter(Boolean);
    }
    canUse(inst, ids) {
      const d = BR.consDef(inst);
      ids = ids || [];
      if (d.can && !d.can(this)) return false;
      if (d.sel) {
        const pool = this.phase === 'pack' && this.pack && this.pack.hand ? this.pack.hand : this.phase === 'round' ? this.hand : null;
        if (!pool) return false;
        if (ids.length < d.sel[0] || ids.length > d.sel[1]) return false;
        if (!ids.every((id) => pool.includes(id))) return false;
      }
      return true;
    }
    applyConsumable(c, ids) {
      const d = BR.consDef(c);
      let cards = this.selectionCards(ids || []);
      if (d.sel) {
        const order = this.phase === 'pack' ? this.pack.hand : this.hand;
        cards.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      }
      const res = d.use(this, cards) || {};
      if (c.type === 'con') this.counts.consts++;
      if (c.type === 'aug') this.counts.augs++;
      if (c.type === 'ani') this.counts.anis++;
      if ((c.type === 'aug' && c.id !== 'repeticion') || c.type === 'con') this.lastCons = { type: c.type, id: c.id };
      res.ev = this.fire('consUsed', c);
      if (this.phase === 'round') this.sortHandKeep();
      return res;
    }
    sortHandKeep() { /* mantiene el orden actual */ }
    useConsumable(uid, ids) {
      const inst = this.consumables.find((x) => x.uid === uid);
      if (!inst || !this.canUse(inst, ids)) return null;
      this.consumables = this.consumables.filter((x) => x !== inst);
      const res = this.applyConsumable(inst, ids);
      res.used = inst;
      return res;
    }

    /* ---------------------- sobres ---------------------- */
    openPack(kind, size, ret) {
      const S = BR.PACK_SIZES[size];
      let n = S.n; const pick = S.pick;
      if (kind === 'tal' || kind === 'ani') n = size === 'normal' ? 2 : 4;
      const choices = [];
      const used = [];
      for (let i = 0; i < n; i++) {
        let it;
        if (kind === 'aug') {
          if (this.vouchers.includes('sexto') && this.rng.chance(0.1)) it = { kind: 'ani', id: this.randomAnima(used).id };
          else it = { kind: 'aug', id: this.randomAugurio(used).id };
        } else if (kind === 'con') it = { kind: 'con', id: this.randomConst(used).id };
        else if (kind === 'ani') it = { kind: 'ani', id: this.randomAnima(used).id };
        else if (kind === 'tal') it = { kind: 'tal', id: this.randomTalismanId(null, used), ed: this.rollEdition() };
        else {
          const c = { kind: 'card', suit: this.rng.pick(BR.SUITS), rank: this.rng.pick(BR.RANKS), enh: null, seal: null, ed: null };
          if (this.rng.chance(0.4)) c.enh = this.rng.pick(Object.keys(BR.ENH));
          if (this.rng.chance(0.12)) c.seal = this.rng.pick(Object.keys(BR.SEALS));
          const e = this.rollEdition(3); if (e && e !== 'eclipse') c.ed = e;
          it = c;
        }
        if (it.id) used.push(it.id);
        it.key = 'p' + (this.nextId++);
        choices.push(it);
      }
      this.pack = { kind, size, choices, picks: pick, ret: ret || 'shop', hand: null };
      if (kind === 'aug' || kind === 'ani') {
        const ids = this.rng.shuffle(this.deck.map((c) => c.id)).slice(0, this.handSize());
        this.pack.hand = ids;
        const save = this.hand; this.hand = ids; this.sortHand(); this.pack.hand = this.hand; this.hand = save;
      }
      this.phase = 'pack';
      return this.pack;
    }
    pickFromPack(key, ids) {
      if (this.phase !== 'pack') return { err: '?' };
      const it = this.pack.choices.find((c) => c && c.key === key);
      if (!it) return { err: '?' };
      let res = { ok: true };
      if (it.kind === 'tal') {
        if (this.talismans.length >= this.talSlots() && it.ed !== 'eclipse') return { err: 'No te quedan huecos de Talismán' };
        const t = this.newTalisman(it.id); t.ed = it.ed || null; this.addTalisman(t, true); res.talisman = t;
      } else if (it.kind === 'card') {
        const c = this.makeCard(it.suit, it.rank); c.enh = it.enh; c.seal = it.seal; c.ed = it.ed;
        this.addCardToDeck(c); res.card = c;
      } else {
        const inst = { type: it.kind, id: it.id };
        if (!this.canUse(inst, ids)) return { err: 'Selecciona cartas válidas' };
        this.discover(it.kind, it.id);
        res = { ok: true, ...this.applyConsumable(inst, ids) };
      }
      this.pack.choices = this.pack.choices.map((c) => (c === it ? null : c));
      this.pack.picks--;
      if (this.pack.picks <= 0 || !this.pack.choices.some(Boolean)) res.closed = this.closePack();
      return res;
    }
    closePack() {
      const ret = this.pack.ret;
      this.pack = null;
      if (this.openPendingPack(ret)) return 'pack';
      this.phase = ret;
      return ret;
    }
    skipPack() { if (this.phase !== 'pack') return null; return this.closePack(); }
  }

  BR.Game = Game;
})(globalThis.BR = globalThis.BR || {});
