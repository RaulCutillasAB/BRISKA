// Juega partidas a través de la interfaz real buscando errores de ejecución.
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.env.OUT || '/tmp/shots';
const RUNS = +process.env.RUNS || 2;
const CHEAT = !!process.env.CHEAT;
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const W = +process.env.W || 1280, H = +process.env.H || 800;
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + '\n' + e.stack));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.evaluate(() => { BR.Meta.data.settings.speed = 4; BR.Meta.data.tutorial = true; BR.Meta.save(); });
  await page.reload();
  await page.waitForTimeout(800);
  const idle = async (max = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < max) { const b = await page.evaluate(() => BR.uiBusy); if (!b) return; await page.waitForTimeout(80); } errs.push('timeout busy'); };
  const clickSprite = async (key) => { const el = await page.$(`.sp[data-key="${key}"]`); if (!el) return false; try { await el.click({ timeout: 2000, force: true }); return true; } catch (e) { return false; } };
  const clickAction = async (idx = 0) => { const b = await page.$$('#actionmenu.show .btn'); if (b[idx]) { const dis = await b[idx].evaluate((x) => x.disabled); if (!dis) { await b[idx].click({ force: true }); return true; } } return false; };
  let shot = 0;
  for (let run = 0; run < RUNS; run++) {
    await page.evaluate(() => { BR.Meta.clearRun(); });
    await page.reload(); await page.waitForTimeout(600);
    await page.click('[data-a=new]'); await page.waitForTimeout(300);
    // elegir baraja aleatoria desbloqueada
    await page.evaluate((run) => { BR.Meta.data.decks = BR.DECKS.map((d) => d.id); BR.Meta.data.stakeUnlocked = 5; }, run);
    for (let i = 0; i < run % BR_DECKS(); i++) { await page.click('[data-d="1"]'); }
    await page.click('#go'); await page.waitForTimeout(500);
    if (CHEAT) await page.evaluate(() => { const g = BR.game; g.money = 60; for (let i = 0; i < 4; i++) g.addTalisman(g.newTalisman(g.randomTalismanId(1 + (i % 3)))); g.addConsumable(g.randomAugurio()); g.addConsumable({ type: 'ani', id: 'agujero' }); BR.UI && 0; });
    let steps = 0;
    while (steps++ < 400) {
      const st = await page.evaluate(() => ({ phase: BR.game ? BR.game.phase : 'none', ov: document.getElementById('overlay').classList.contains('show'), ante: BR.game && BR.game.ante }));
      if (st.ov) {
        const end = await page.$('[data-a=endless]');
        const nw = await page.$('[data-a=new]');
        if (end && run === 0) { await end.click(); await page.waitForTimeout(400); continue; }
        if (nw) break;
        const close = await page.$('#overlay .close'); if (close) await close.click(); else break;
        continue;
      }
      if (st.phase === 'blind') {
        const skip = await page.$('[data-act=skip]');
        if (skip && Math.random() < 0.2) await skip.click(); else await page.click('[data-act=select]');
        await page.waitForTimeout(200); await idle();
      } else if (st.phase === 'round') {
        // usar consumibles a veces
        const cons = await page.evaluate(() => BR.game.consumables.map((c) => c.uid));
        if (cons.length && Math.random() < 0.5) {
          const sel = await page.evaluate(() => BR.game.hand.slice(0, 2));
          for (const id of sel) await clickSprite(id);
          await clickSprite(cons[0]); await page.waitForTimeout(100);
          await clickAction(0); await page.waitForTimeout(150); await idle();
          await page.evaluate(() => { BR.UI.sel = []; });
        }
        const pick = await page.evaluate(() => {
          const g = BR.game; const hand = g.hand.slice();
          let best = null, bv = -1;
          const comb = (k, s = 0, cur = []) => { if (cur.length === k) { const p = g.previewHand(cur); if (p && !p.blocked) { let v = p.chips * p.mult * (cur.length); if (v > bv) { bv = v; best = cur.slice(); } } return; } for (let i = s; i < hand.length; i++) { cur.push(hand[i]); comb(k, i + 1, cur); cur.pop(); } };
          for (let k = 1; k <= Math.min(5, hand.length); k++) comb(k);
          return { best: best || hand.slice(0, 1), disc: g.r.discardsLeft > 0 && Math.random() < 0.3 };
        });
        if (pick.disc) {
          const ids = await page.evaluate(() => BR.game.hand.slice(-3));
          for (const id of ids) await clickSprite(id);
          await page.click('#btn-discard', { force: true }); await page.waitForTimeout(100); await idle();
          continue;
        }
        for (const id of pick.best) await clickSprite(id);
        await page.waitForTimeout(60);
        if (Math.random() < 0.05) await page.screenshot({ path: `${OUT}/m-${run}-${shot++}.png` });
        await page.click('#btn-play', { force: true }); await page.waitForTimeout(150); await idle(60000);
      } else if (st.phase === 'cashout') {
        await page.waitForTimeout(300); await page.click('#btn-cash'); await page.waitForTimeout(300);
      } else if (st.phase === 'shop') {
        const keys = await page.evaluate(() => [...BR.View.sprites.keys()].filter((k) => k.startsWith('shop') || k.startsWith('pack') || k.startsWith('vou')));
        for (const k of keys) {
          if (Math.random() < 0.6) {
            if (await clickSprite(k)) { await page.waitForTimeout(80); await clickAction(Math.random() < 0.3 ? 1 : 0); await page.waitForTimeout(150); await idle(); }
            const ph = await page.evaluate(() => BR.game.phase);
            if (ph === 'pack') break;
          }
        }
        let ph = await page.evaluate(() => BR.game.phase);
        if (ph === 'shop') {
          // vender un talismán a veces
          const tals = await page.evaluate(() => BR.game.talismans.map((t) => t.uid));
          if (tals.length >= 4 && Math.random() < 0.3) { await clickSprite(tals[0]); await clickAction(0); await page.waitForTimeout(200); }
          if (Math.random() < 0.2) await page.click('#btn-reroll', { force: true });
          if (Math.random() < 0.03) await page.screenshot({ path: `${OUT}/m-${run}-${shot++}.png` });
          await page.click('#btn-next', { force: true }); await page.waitForTimeout(200);
        }
      } else if (st.phase === 'pack') {
        const choices = await page.evaluate(() => BR.game.pack.choices.filter(Boolean).map((c) => c.key));
        const hand = await page.evaluate(() => (BR.game.pack.hand || []).slice(0, 1));
        for (const id of hand) await clickSprite(id);
        let ok = false;
        for (const k of choices) { if (await clickSprite(k)) { await page.waitForTimeout(80); if (await clickAction(0)) { ok = true; await page.waitForTimeout(200); await idle(); break; } } }
        const ph = await page.evaluate(() => BR.game.phase);
        if (ph === 'pack' && !ok) { await page.click('#btn-skippack', { force: true }); await page.waitForTimeout(200); await idle(); }
      } else if (st.phase === 'over' || st.phase === 'victory') { await page.waitForTimeout(800); }
      else break;
    }
    const fin = await page.evaluate(() => BR.game && ({ ante: BR.game.ante, phase: BR.game.phase, won: BR.game.won }));
    console.log('run', run, JSON.stringify(fin), 'steps', steps);
    await page.screenshot({ path: `${OUT}/m-end-${run}.png` });
  }
  console.log(errs.length ? errs.slice(0, 10).join('\n') : 'no errors');
  await browser.close();
})();
function BR_DECKS() { return 11; }
