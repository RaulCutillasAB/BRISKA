// Bot que juega partidas completas sin gráficos: valida la simulación y mide la dificultad
const L = require('./load')();
const N = +process.argv[2] || 20, SKILL = +(process.argv[3] || 1);
const DT = 1 / 60;
function bot(w, st) {
  if (SKILL >= 2) return bot2(w, st);
  const p = w.p, I = w.input;
  const live = w.enemies.filter((e) => e.spawn <= 0);
  // esquivar balas cercanas con impulso
  for (const b of w.bullets) if (L.dist(b.x, b.y, p.x, p.y) < 40 && SKILL > 0.5) I.dash = true;
  if (!live.length) { I.tx = w.W / 2 + Math.cos(st.a) * 60; I.ty = w.H / 2 + Math.sin(st.a) * 60; st.a += DT * 4; return; }
  // centro: la sombra más cercana (o el grupo)
  let tgt = live[0], bd = 1e9;
  for (const e of live) { const d = L.dist(e.x, e.y, p.x, p.y); if (d < bd) { bd = d; tgt = e; } }
  let cx = 0, cy = 0, n = 0;
  for (const e of live) if (L.dist(e.x, e.y, tgt.x, tgt.y) < 160) { cx += e.x; cy += e.y; n++; }
  cx /= n; cy /= n;
  if (st.cx == null) { st.cx = cx; st.cy = cy; }
  st.cx += (cx - st.cx) * 0.05; st.cy += (cy - st.cy) * 0.05; cx = st.cx; cy = st.cy;
  for (const e of live) if (L.dist(e.x, e.y, p.x, p.y) < e.r + 30 && SKILL > 0.5) I.dash = true;
  const R = Math.max(120, tgt.r + 80) * (0.8 + 0.4 * (1 - SKILL));
  st.a += DT * (p.st.speed / R) * 0.95;
  I.tx = L.clamp(cx + Math.cos(st.a) * R, 20, w.W - 20); I.ty = L.clamp(cy + Math.sin(st.a) * R, 20, w.H - 20);
}
// estrategia de pastoreo: girar en grandes círculos; las sombras persiguen y quedan dentro
function bot2(w, st) {
  const p = w.p, I = w.input;
  const live = w.enemies.filter((e) => e.spawn <= 0);
  let cx = w.W / 2, cy = w.H / 2;
  if (live.length) { let sx = 0, sy = 0; for (const e of live) { sx += e.x; sy += e.y; } cx = cx * 0.5 + (sx / live.length) * 0.5; cy = cy * 0.5 + (sy / live.length) * 0.5; }
  if (st.cx == null) { st.cx = cx; st.cy = cy; }
  st.cx += (cx - st.cx) * 0.02; st.cy += (cy - st.cy) * 0.02;
  const R = Math.min(w.H, w.W) * (SKILL >= 3 ? 0.2 : 0.26);
  const ang = Math.atan2(p.y - st.cy, p.x - st.cx) + 0.55;
  I.tx = L.clamp(st.cx + Math.cos(ang) * R, 20, w.W - 20); I.ty = L.clamp(st.cy + Math.sin(ang) * R, 20, w.H - 20);
  // esquivar
  const vx = p.vx, vy = p.vy, m = Math.hypot(vx, vy) || 1;
  for (const e of live) { const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); if (d < e.r + 34 && (dx * vx + dy * vy) / (d * m) > 0.3) I.dash = true; }
  for (const b of w.bullets) if (L.dist(b.x, b.y, p.x, p.y) < 34) I.dash = true;
}
let wins = 0; const reach = {}; const errs = []; let loops = 0, rooms = 0;
const t0 = Date.now();
for (let r = 0; r < N; r++) {
  const w = new L.World({ seed: 'S' + r, W: 910, H: 570 });
  const st = { a: 0 };
  try {
    let guard = 0, done = false;
    while (!done && guard++ < 200) {
      const av = w.available();
      const nodeId = av[Math.floor(w.rng.next() * av.length)];
      const node = w.choose(nodeId);
      if (['combat', 'elite', 'boss'].includes(node.type)) {
        w.startRoom(node.type);
        let t = 0;
        while (w.phase === 'room' && t < 240) {
          bot(w, st); w.update(DT); t += DT;
          for (const ev of w.events) { if (ev.t === 'roomDone') w.phase = 'reward'; }
          w.events.length = 0;
        }
        rooms++;
        if (w.phase === 'dead') { done = true; break; }
        if (t >= 240) { errs.push('room timeout ' + node.type + ' floor ' + w.floor + ' enemies ' + w.enemies.length); w.phase = 'reward'; }
        const ch = w.donChoices(node.type === 'combat' ? 'combat' : node.type);
        w.addDon(ch[0].id);
        if (node.type === 'boss') { if (w.floor === 2) { wins++; done = true; break; } w.nextFloor(); }
      } else if (node.type === 'treasure') { w.addDon(w.donChoices('treasure')[0].id); }
      else if (node.type === 'fountain') { w.heal(99); }
      else if (node.type === 'shop') { if (w.polen >= 60) { w.polen -= 60; w.addDon(w.randomDon(1, 3).id); } }
      else if (node.type === 'event') { const E = L.EVENTS[Math.floor(w.rng.next() * L.EVENTS.length)]; const ops = E.opts.filter((o) => (!o.can || o.can(w)) && (!o.cost || w.polen >= o.cost)); ops[0].run(w); if (w.pendingChoice) { w.addDon(w.randomDon(w.pendingChoice.rarityMin).id); w.pendingChoice = null; } }
      w.phase = 'map';
    }
    loops += w.stats.loops;
    const k = w.floor + ':' + (w.pos != null ? w.map.nodes[w.pos].l : 0);
    reach[w.floor] = (reach[w.floor] || 0) + 1;
  } catch (e) { errs.push(e.stack); }
}
console.log(`runs=${N} skill=${SKILL} wins=${wins} floorsReached=${JSON.stringify(reach)} loops/run=${(loops / N).toFixed(0)} rooms=${rooms} ${(Date.now() - t0) / 1000}s`);
if (errs.length) console.log(errs.slice(0, 5).join('\n'));
