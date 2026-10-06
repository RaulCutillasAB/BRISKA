// Pruebas de interfaz: arrastrar, atajos de teclado, continuar partida guardada
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 800 } });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message + '\n' + e.stack));
  let ok = 0, bad = 0;
  const check = (c, m) => { if (c) ok++; else { bad++; console.log('✗', m); } };
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.evaluate(() => { BR.Meta.reset(); BR.Meta.data.tutorial = true; BR.Meta.save(); });
  await page.reload(); await page.waitForTimeout(500);
  await page.click('[data-a=new]'); await page.click('#go'); await page.waitForTimeout(400);
  await page.click('[data-act=select]'); await page.waitForTimeout(1500);
  // arrastrar carta de la mano
  const before = await page.evaluate(() => BR.game.hand.slice());
  const a = await page.$(`.sp[data-key="${before[0]}"]`), b = await page.$(`.sp[data-key="${before[5]}"]`);
  const ra = await a.boundingBox(), rb = await b.boundingBox();
  await page.mouse.move(ra.x + ra.width / 2, ra.y + ra.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(ra.x + ra.width / 2 + ((rb.x - ra.x) * i) / 12, ra.y + ra.height / 2 - 10, { steps: 2 });
  await page.mouse.up(); await page.waitForTimeout(400);
  const after = await page.evaluate(() => BR.game.hand.slice());
  check(after.indexOf(before[0]) >= 4, 'arrastre de carta: ' + after.indexOf(before[0]));
  check(await page.evaluate(() => BR.UI.sel.length === 0), 'arrastre no selecciona');
  // atajos: seleccionar 2 y descartar con X
  await page.click(`.sp[data-key="${after[0]}"]`); await page.click(`.sp[data-key="${after[1]}"]`);
  await page.keyboard.press('x'); await page.waitForTimeout(1500);
  check(await page.evaluate(() => BR.game.r.discardsLeft === BR.game.discardsPerRound() - 1), 'descartar con X');
  await page.keyboard.press('p'); await page.waitForTimeout(200);
  check(await page.evaluate(() => BR.game.sortMode === 'suit'), 'ordenar por palo con P');
  // jugar con Enter
  const h = await page.evaluate(() => BR.game.hand.slice(0, 1));
  await page.click(`.sp[data-key="${h[0]}"]`);
  await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  await page.waitForFunction(() => !BR.uiBusy, null, { timeout: 20000 });
  check(await page.evaluate(() => BR.game.r.handsPlayed === 1), 'jugar con Enter');
  // arrastrar talismanes
  await page.evaluate(() => { const g = BR.game; g.addTalisman(g.newTalisman('chispa')); g.addTalisman(g.newTalisman('gemelos')); g.addTalisman(g.newTalisman('trebol')); window.dispatchEvent(new Event('resize')); });
  await page.waitForTimeout(400);
  const tb = await page.evaluate(() => BR.game.talismans.map((t) => t.uid));
  const ta = await (await page.$(`.sp[data-key="${tb[0]}"]`)).boundingBox(), tc = await (await page.$(`.sp[data-key="${tb[2]}"]`)).boundingBox();
  await page.mouse.move(ta.x + 20, ta.y + 30); await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(ta.x + 20 + ((tc.x - ta.x + 30) * i) / 10, ta.y + 30, { steps: 2 });
  await page.mouse.up(); await page.waitForTimeout(300);
  const ta2 = await page.evaluate(() => BR.game.talismans.map((t) => t.uid));
  check(ta2[2] === tb[0], 'arrastre de talismán');
  // vender talismán
  await page.click(`.sp[data-key="${ta2[0]}"]`); await page.waitForTimeout(150);
  const money0 = await page.evaluate(() => BR.game.money);
  await page.click('#actionmenu .btn'); await page.waitForTimeout(300);
  check(await page.evaluate((m) => BR.game.money > m && BR.game.talismans.length === 2, money0), 'vender talismán');
  // guardar y continuar
  const snap = await page.evaluate(() => ({ hand: BR.game.hand.slice(), score: BR.game.r.score, tal: BR.game.talismans.length }));
  await page.reload(); await page.waitForTimeout(600);
  check(!!(await page.$('[data-a=continue]')), 'botón continuar');
  await page.click('[data-a=continue]'); await page.waitForTimeout(800);
  const snap2 = await page.evaluate(() => ({ hand: BR.game.hand.slice(), score: BR.game.r.score, tal: BR.game.talismans.length }));
  check(JSON.stringify(snap) === JSON.stringify(snap2), 'continuar restaura la partida');
  const nsp = await page.evaluate(() => [...BR.View.sprites.keys()].filter((k) => k.startsWith('c')).length);
  check(nsp === snap.hand.length, 'sprites de mano tras cargar: ' + nsp);
  // opciones: abandonar
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  check(await page.evaluate(() => document.getElementById('overlay').classList.contains('show')), 'Esc abre opciones');
  await page.click('[data-a=abandon]'); await page.waitForTimeout(200); await page.click('[data-a=yes]'); await page.waitForTimeout(500);
  check(!(await page.$('[data-a=continue]')), 'abandonar borra la partida');
  check(await page.evaluate(() => BR.Meta.data.stats.runs === 1), 'abandonar cuenta como partida');
  console.log(`${ok} OK, ${bad} fallos`, errs.length ? errs : '');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
