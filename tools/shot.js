// Prueba visual con Playwright: recorre menú → partida → jugada → feria
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.env.OUT || '/tmp/shots';
(async () => {
  const W = +process.env.W || 1440, H = +process.env.H || 900;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }).catch(() => chromium.launch());
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: !!process.env.TOUCH });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + '\n' + e.stack));
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.waitForTimeout(1500);
  const tag = process.env.TAG || 'd';
  await page.screenshot({ path: `${OUT}/${tag}-01-menu.png` });
  await page.click('[data-a=new]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${tag}-02-newrun.png` });
  await page.click('#go');
  await page.waitForTimeout(1200);
  // cerrar tutorial
  for (let i = 0; i < 6; i++) { const b = await page.$('#h-next'); if (b) { await b.click(); await page.waitForTimeout(150); } }
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${tag}-03-blind.png` });
  await page.click('[data-act=select]');
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/${tag}-04-round.png` });
  // seleccionar las 5 primeras cartas del jugador
  const ids = await page.evaluate(() => BR.game.hand.slice(0, 5));
  for (const id of ids.slice(0, 2)) { await page.click(`.sp[data-key="${id}"]`); await page.waitForTimeout(120); }
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${tag}-05-selected.png` });
  await page.click('#btn-play');
  await page.waitForTimeout(1700);
  await page.screenshot({ path: `${OUT}/${tag}-06-scoring.png` });
  await page.waitForTimeout(4500);
  await page.screenshot({ path: `${OUT}/${tag}-07-after.png` });
  // forzar victoria rápida para ver cobro y feria
  await page.evaluate(() => { BR.game.r.target = 1; });
  const ids2 = await page.evaluate(() => BR.game.hand.slice(0, 1));
  await page.click(`.sp[data-key="${ids2[0]}"]`);
  await page.click('#btn-play');
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${OUT}/${tag}-08-cashout.png` });
  await page.click('#btn-cash');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${tag}-09-shop.png` });
  // hover sobre un talismán de la feria
  const sk = await page.evaluate(() => [...BR.View.sprites.keys()].find((k) => k.startsWith('shop')));
  if (sk) { await page.hover(`.sp[data-key="${sk}"]`); await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/${tag}-10-tooltip.png` }); }
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})();
