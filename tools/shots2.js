// Capturas de estados concretos: jefes, biomas, mercado, evento, selección, móvil
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.env.OUT || '/tmp/shots';
(async () => {
  const W = +process.env.W || 1440, H = +process.env.H || 900, T = process.env.TAG || 's';
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: W, height: H }, hasTouch: !!process.env.TOUCH });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message + '\n' + e.stack));
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.evaluate(() => { LAZO.Meta.d.tutorial = true; });
  await page.waitForTimeout(500);
  await page.click('[data-a=new]'); await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${T}-chars.png` });
  await page.click('[data-a=go]'); await page.waitForTimeout(400);
  const room = async (floor, type, name, extra) => {
    await page.evaluate(([f, ty, ex]) => {
      const w = LAZO.w; w.floor = f; w.genMap();
      for (const id of ['ardiente', 'hermana', 'petalo', 'flor']) if (ex) w.addDon(id);
      const n = w.map.nodes.find((x) => x.type === ty) || w.map.nodes[0]; w.pos = null; n.type = ty;
      w.map.nodes.filter((x) => x.l === 0)[0].type = ty;
      LAZO.enterNode(w.map.nodes.filter((x) => x.l === 0)[0].id);
    }, [floor, type, extra]);
    const t0 = Date.now(); let a = 0;
    while (Date.now() - t0 < 6500) {
      const st = await page.evaluate(() => { const w = LAZO.w; return { x: w.p.x, y: w.p.y, S: innerWidth / w.W, W: w.W, H: w.H }; });
      a += 0.3; await page.mouse.move((st.W / 2 + Math.cos(a) * st.H * 0.25) * st.S, (st.H / 2 + Math.sin(a) * st.H * 0.25) * st.S);
      await page.waitForTimeout(40);
    }
    await page.screenshot({ path: `${OUT}/${T}-${name}.png` });
    await page.evaluate(() => { const w = LAZO.w; w.phase = 'map'; });
  };
  await room(0, 'boss', 'boss1', false);
  await room(1, 'combat', 'pantano', true);
  await room(1, 'boss', 'boss2', true);
  await room(2, 'combat', 'eclipse', true);
  await room(2, 'boss', 'boss3', true);
  // mercado y evento
  await page.evaluate(() => { const w = LAZO.w; w.polen = 120; w.phase = 'map'; const n = w.map.nodes.filter((x) => x.l === 0)[0]; n.type = 'shop'; w.pos = null; LAZO.enterNode(n.id); });
  await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/${T}-shop.png` });
  await page.evaluate(() => { const w = LAZO.w; const n = w.map.nodes.filter((x) => x.l === 0)[0]; n.type = 'event'; w.pos = null; LAZO.enterNode(n.id); });
  await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/${T}-event.png` });
  await page.evaluate(() => { const w = LAZO.w; w.genMap(); w.choose(w.available()[0]); w.choose(w.available()[0]); });
  await page.click('.opt'); await page.waitForTimeout(300); await page.click('[data-a=ok]').catch(() => {}); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${T}-map2.png` });
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})();
