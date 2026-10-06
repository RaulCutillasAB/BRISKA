// Pruebas de la simulación: cada don, evento, jefe y sala sin errores
const L = require('./load')();
let ok = 0, bad = 0;
const check = (c, m) => { if (c) ok++; else { bad++; console.log('✗', m); } };
const DT = 1 / 60;
function play(w, secs) {
  let a = 0;
  for (let t = 0; t < secs && w.phase === 'room'; t += DT) {
    a += DT * 2.6;
    w.input.tx = w.W / 2 + Math.cos(a) * w.H * 0.25; w.input.ty = w.H / 2 + Math.sin(a) * w.H * 0.25;
    if (Math.random() < 0.01) w.input.dash = true;
    w.update(DT);
    w.events.length = 0;
  }
}
// geometría
check(L.inPoly(5, 5, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]), 'inPoly dentro');
check(!L.inPoly(15, 5, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]), 'inPoly fuera');
check(L.segX(0, 0, 10, 10, 0, 10, 10, 0) !== null, 'segX cruza');
check(L.polyArea([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]) === 100, 'polyArea');
// un lazo atrapa a una sombra
{
  const w = new L.World({ seed: 'T', W: 900, H: 600 }); w.choose(w.available()[0]); w.startRoom('combat'); w.waves = []; w.wave = 0;
  const e = w.spawnEnemy('caparazon', 450, 300, { delay: 0 }); e.speed = 0;
  w.p.x = 450 + 150; w.p.y = 300;
  for (let i = 0; i <= 70; i++) { const a = (i / 60) * Math.PI * 2; w.input.tx = 450 + Math.cos(a) * 150; w.input.ty = 300 + Math.sin(a) * 150; w.p.x = w.input.tx; w.p.y = w.input.ty; w.updateTrail(); }
  check(w.stats.loops >= 1, 'se cierra un lazo'); check(e.hp < 4, 'el lazo daña a la sombra');
}
// cada don en una sala completa
for (const d of L.DONES) {
  const w = new L.World({ seed: 'D' + d.id, W: 900, H: 600 });
  try { w.addDon(d.id); w.addDon('cola'); w.choose(w.available()[0]); w.startRoom('combat'); play(w, 40); ok++; }
  catch (e) { bad++; console.log('✗ don', d.id, e.stack); }
}
// todos los dones a la vez, en cada jefe
for (const f of [0, 1, 2]) {
  const w = new L.World({ seed: 'B' + f, W: 900, H: 600, moon: 5 });
  try { for (const d of L.DONES) if (d.id !== 'fenix') w.addDon(d.id); w.floor = f; w.genMap(); w.pos = w.map.nodes.length - 1; w.startRoom('boss'); play(w, 90); ok++; }
  catch (e) { bad++; console.log('✗ jefe', f, e.stack); }
}
// cada tipo de sombra
for (const t of Object.keys(L.ENEMIES)) {
  const w = new L.World({ seed: 'E' + t, W: 900, H: 600 });
  try { w.choose(w.available()[0]); w.startRoom('combat'); w.waves = []; w.wave = 0; for (let i = 0; i < 3; i++) w.spawnEnemy(t, 200 + i * 200, 150, { delay: 0 }); play(w, 20); ok++; }
  catch (e) { bad++; console.log('✗ sombra', t, e.stack); }
}
// eventos: todas las opciones
for (const E of L.EVENTS) for (let i = 0; i < E.opts.length; i++) {
  const w = new L.World({ seed: 'V' + E.id + i, W: 900, H: 600 }); w.polen = 200; w.addDon('cola'); w.addDon('chispazo');
  try { const r = E.opts[i].run(w); check(typeof r === 'string', 'evento devuelve texto ' + E.id); check(w.p.hearts >= 1, 'evento no mata ' + E.id); }
  catch (e) { bad++; console.log('✗ evento', E.id, i, e.stack); }
}
// guardar y cargar
{
  const w = new L.World({ seed: 'SAVE', W: 900, H: 600 }); w.addDon('eco'); w.polen = 33; w.choose(w.available()[0]);
  const d = JSON.parse(JSON.stringify(w.save())); const w2 = L.World.load(d, 900, 600);
  check(w2.polen === 33 && w2.dones.length === 1 && w2.pos === w.pos && w2.rng.next() === w.rng.next(), 'guardar/cargar');
}
// mapa: siempre conectado hasta el jefe
for (let s = 0; s < 50; s++) {
  const w = new L.World({ seed: 'M' + s, W: 900, H: 600 });
  const seen = new Set(); const st = w.map.nodes.filter((n) => n.l === 0).map((n) => n.id);
  while (st.length) { const id = st.pop(); if (seen.has(id)) continue; seen.add(id); st.push(...w.map.nodes[id].next); }
  check(seen.size === w.map.nodes.length, 'mapa conectado ' + s);
}
console.log(`${ok} OK, ${bad} fallos`);
process.exit(bad ? 1 : 0);
