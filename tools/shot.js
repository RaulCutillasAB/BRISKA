// Capturas automáticas con Playwright: menú, selección, mapa, combate, recompensa
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.env.OUT || '/tmp/shots';
(async () => {
  const W = +process.env.W || 1440, H = +process.env.H || 900, TAG = process.env.TAG || 'd';
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: W, height: H }, hasTouch: !!process.env.TOUCH });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message + '\n' + e.stack));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${TAG}-1-menu.png` });
  await page.click('[data-a=new]'); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${TAG}-2-chars.png` });
  await page.click('[data-a=go]'); await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${TAG}-3-map.png` });
  await page.click('.mapnode.avail', { force: true }); await page.waitForTimeout(800);
  // mover el ratón en círculos alrededor de las sombras
  const t0 = Date.now(); let a = 0, shot = 0;
  while (Date.now() - t0 < 26000) {
    const st = await page.evaluate(() => { const w = LAZO.w; if (!w || LAZO.mode !== 'room') return null; const es = w.enemies.filter((e) => e.spawn <= 0); let cx = w.W / 2, cy = w.H / 2; if (es.length) { cx = es[0].x; cy = es[0].y; } return { cx, cy, S: innerWidth / w.W }; });
    if (!st) break;
    a += 0.35;
    const R = 110;
    await page.mouse.move((st.cx + Math.cos(a) * R) * st.S, (st.cy + Math.sin(a) * R) * st.S);
    await page.waitForTimeout(40);
    if ((Date.now() - t0 > 4000 && shot === 0) || (Date.now() - t0 > 9000 && shot === 1)) { await page.screenshot({ path: `${OUT}/${TAG}-4-play${shot}.png` }); shot++; }
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${TAG}-5-after.png` });
  console.log(await page.evaluate(() => LAZO.mode + ' loops=' + (LAZO.w && LAZO.w.stats.loops) + ' kills=' + (LAZO.w && LAZO.w.stats.kills)));
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})();
