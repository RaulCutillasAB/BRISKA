// Capturas de pantallas secundarias forzando estados
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.env.OUT || '/tmp/shots';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const W = +process.env.W || 1440, H = +process.env.H || 900;
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + '\n' + e.stack));
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.evaluate(() => { BR.Meta.data.tutorial = true; BR.Meta.data.settings.speed = 4; BR.Meta.save(); });
  await page.waitForTimeout(800);
  const T = process.env.TAG || 's';
  await page.click('[data-a=new]'); await page.click('#go'); await page.waitForTimeout(500);
  // preparar estado rico
  await page.evaluate(() => {
    const g = BR.game; g.money = 87;
    for (const id of ['reflejo', 'cuarenta', 'triunfo', 'sieteymedio', 'coloso']) g.addTalisman(g.newTalisman(id));
    g.talismans[1].ed = 'aurora'; g.talismans[4].ed = 'iridiscente'; g.talismans[2].ed = 'brillante';
    g.addConsumable({ type: 'con', id: 'pareja' }); g.addConsumable({ type: 'aug', id: 'vidriero' });
    g.deck[0].enh = 'cristal'; g.deck[1].enh = 'oro'; g.deck[2].seal = 'carmesi'; g.deck[3].ed = 'aurora'; g.deck[4].enh = 'piedra'; g.deck[5].enh = 'fortuna'; g.deck[6].enh = 'rubi'; g.deck[7].enh = 'prisma'; g.deck[8].seal = 'dorado'; g.deck[9].ed = 'brillante';
    g.blindIdx = 2; g.bossId = 'reina';
  });
  await page.evaluate(() => { BR.UI && 0; });
  await page.keyboard.press('r');
  await page.evaluate(() => { document.getElementById('blindsel')._sig = null; });
  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);
  // forzar re-render
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${T}-a-bossselect.png` });
  await page.click('[data-act=select]'); await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/${T}-b-bossround.png` });
  // jugar Caballo+Rey si hay
  await page.evaluate(() => { const g = BR.game; const c = g.makeCard(g.r.trump, 11), r = g.makeCard(g.r.trump, 12); g.deck.push(c, r); g._cardIndex = null; g.hand.splice(0, 2, c.id, r.id); });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(400);
  const ids = await page.evaluate(() => BR.game.hand.slice(0, 2));
  for (const id of ids) await page.click(`.sp[data-key="${id}"]`, { force: true });
  await page.click('#btn-play', { force: true });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${T}-c-cuarenta.png` });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${T}-d-scoring2.png` });
  await page.waitForFunction(() => !BR.uiBusy, null, { timeout: 30000 });
  // abrir sobre de augurios
  await page.evaluate(() => { const g = BR.game; g.phase = 'shop'; g.r = null; g.enterShop(); g.openPack('aug', 'jumbo', 'shop'); });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${T}-e-pack.png` });
  await page.evaluate(() => { const g = BR.game; g.pack = null; g.openPack('tal', 'mega', 'shop'); });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${T}-f-packtal.png` });
  await page.evaluate(() => { BR.game.phase = 'shop'; BR.game.pack = null; });
  await page.click('#btn-info'); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${T}-g-info.png` });
  await page.keyboard.press('Escape');
  await page.click('#btn-options'); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${T}-h-options.png` });
  await page.keyboard.press('Escape');
  // fin de partida
  await page.evaluate(() => { BR.Screens.endScreen(BR.game, false, [{ text: '¡Nueva baraja desbloqueada: Baraja del Mar!' }], () => {}); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${T}-i-over.png` });
  await page.evaluate(() => { BR.Meta.discover(BR.TALISMANS.slice(0, 40).map((t) => 'tal:' + t.id)); BR.Screens.grimoire(); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${T}-j-grim.png` });
  await page.evaluate(() => { BR.Meta.discover(BR.AUGURIOS.map((t) => 'aug:' + t.id).concat(BR.CONSTS.map((t) => 'con:' + t.id))); });
  await page.click('.tab[data-t=con]'); await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${T}-k-grimcon.png` });
  await page.click('.tab[data-t=aug]'); await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${T}-l-grimaug.png` });
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})();
