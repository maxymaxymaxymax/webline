// ================= ELEVATED TRAIN =================
const RAIL = { x: 600, z0: -1460, z1: -350, deck: 17, gap: 3, stations: [-1400, -1150, -880, -620, -410] };
const TRAINS = [];
const trainTex = (() => {
  // stainless side panel: brushed steel, window band, doors, red stripe, line badge
  const W = 1024, H = 256, c = makeCanvas(W, H), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#d7dade'); gr.addColorStop(0.5, '#b9bdc2'); gr.addColorStop(1, '#9ea3a8'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 1400; i++) { g.strokeStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '50,55,60'},${0.04 + Math.random() * 0.08})`; g.beginPath(); const y = Math.random() * H; g.moveTo(Math.random() * W, y); g.lineTo(Math.random() * W, y); g.stroke(); }
  g.strokeStyle = 'rgba(60,64,70,.35)'; g.lineWidth = 2; for (let x = 0; x < W; x += 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H * 0.22); g.moveTo(x, H * 0.72); g.lineTo(x, H); g.stroke(); }
  const doors = [0.12, 0.38, 0.62, 0.88];
  for (let x = 0; x < W; x += 74) { if (doors.some(d => Math.abs(x / W - d) < 0.06)) continue; const wg = g.createLinearGradient(0, H * 0.28, 0, H * 0.56); wg.addColorStop(0, '#2d3a48'); wg.addColorStop(0.4, '#151b22'); wg.addColorStop(1, '#0d1116'); g.fillStyle = wg; g.fillRect(x + 8, H * 0.28, 58, H * 0.28); g.fillStyle = 'rgba(255,220,160,.18)'; g.fillRect(x + 8, H * 0.28, 58, 6); }
  for (const d of doors) { const x = d * W; g.fillStyle = '#a9aeb3'; g.fillRect(x - 34, H * 0.18, 68, H * 0.78); g.strokeStyle = '#4a4f55'; g.lineWidth = 3; g.strokeRect(x - 34, H * 0.18, 68, H * 0.78); g.beginPath(); g.moveTo(x, H * 0.18); g.lineTo(x, H * 0.96); g.stroke(); g.fillStyle = '#141a20'; g.fillRect(x - 26, H * 0.26, 20, H * 0.3); g.fillRect(x + 6, H * 0.26, 20, H * 0.3); }
  g.fillStyle = '#c4122a'; g.fillRect(0, H * 0.62, W, H * 0.07);
  g.fillStyle = '#ff9f1c'; g.beginPath(); g.arc(W * 0.25, H * 0.82, 16, 0, 7); g.fill(); g.fillStyle = '#111'; g.font = '900 22px Arial'; g.textAlign = 'center'; g.fillText('E', W * 0.25, H * 0.82 + 8);
  g.fillStyle = '#2a2e33'; g.font = '700 18px Arial'; g.fillText('NEW HARBOR TRANSIT', W * 0.5, H * 0.83 + 6);
  return canvasTex(c);
})();
const trainEndTex = (() => { const c = makeCanvas(256, 256), g = c.getContext('2d'); g.fillStyle = '#c3c7cc'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#10151b'; g.fillRect(28, 50, 200, 90); g.fillStyle = '#c4122a'; g.fillRect(0, 158, 256, 18); g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(50, 205, 14, 0, 7); g.arc(206, 205, 14, 0, 7); g.fill(); g.fillStyle = '#ff9f1c'; g.fillRect(98, 14, 60, 26); g.fillStyle = '#111'; g.font = '900 20px Arial'; g.textAlign = 'center'; g.fillText('E', 128, 34); return canvasTex(c); })();
const girderTex = (() => { const c = makeCanvas(512, 128), g = c.getContext('2d'); g.fillStyle = '#3e5245'; g.fillRect(0, 0, 512, 128); for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '20,25,20' : '120,90,60'},${Math.random() * 0.12})`; g.fillRect(Math.random() * 512, Math.random() * 128, 3, 3); } g.strokeStyle = '#2b3a30'; g.lineWidth = 4; for (let x = 0; x < 512; x += 64) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x + 32, 120); g.lineTo(x + 64, 8); g.stroke(); } g.fillStyle = '#2b3a30'; g.fillRect(0, 0, 512, 10); g.fillRect(0, 118, 512, 10); g.fillStyle = '#6b7d70'; for (let x = 4; x < 512; x += 10) { g.fillRect(x, 3, 3, 3); g.fillRect(x, 121, 3, 3); } return canvasTex(c, true, true); })();
{
  const len = RAIL.z1 - RAIL.z0, zc = (RAIL.z0 + RAIL.z1) / 2;
  const gMat = new THREE.MeshStandardMaterial({ map: girderTex, roughness: 0.8, metalness: 0.3 });
  girderTex.repeat.set(len / 8, 1);
  for (const sx of [-1, 1]) {
    const x = RAIL.x + sx * RAIL.gap;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.3, len), gMat); deck.position.set(x, RAIL.deck - 0.65, zc); deck.castShadow = deck.receiveShadow = true; scene.add(deck);
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, len), gMat); side.position.set(x + sx * 1.8, RAIL.deck - 0.3, zc); scene.add(side);
    for (const r of [-0.72, 0.72]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, len), new THREE.MeshStandardMaterial({ color: 0x8c8f93, metalness: 0.9, roughness: 0.3, map: TEX.metal })); rail.position.set(x + r, RAIL.deck + 0.26, zc); scene.add(rail); }
    for (let z = RAIL.z0; z < RAIL.z1; z += 40) addBox(x - 1.9, RAIL.deck - 1.3, z, x + 1.9, RAIL.deck + 0.1, Math.min(RAIL.z1, z + 40), 2);
  }
  const ties = []; for (let z = RAIL.z0; z < RAIL.z1; z += 0.75) for (const sx of [-1, 1]) ties.push([RAIL.x + sx * RAIL.gap, z]);
  instGeo(new THREE.BoxGeometry(2.4, 0.18, 0.28).translate(0, RAIL.deck + 0.09, 0), new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95 }), ties, (t, m) => m.makeTranslation(t[0], 0, t[1]));
  const cols = []; for (let z = RAIL.z0 + 10; z < RAIL.z1; z += 26) { cols.push([RAIL.x - 6.4, z], [RAIL.x + 6.4, z]); addBox(RAIL.x - 6.8, 0, z - 0.4, RAIL.x - 6.0, RAIL.deck - 1.3, z + 0.4, 2); addBox(RAIL.x + 6.0, 0, z - 0.4, RAIL.x + 6.8, RAIL.deck - 1.3, z + 0.4, 2); }
  instGeo(new THREE.BoxGeometry(0.7, RAIL.deck - 1.2, 0.7).translate(0, (RAIL.deck - 1.2) / 2, 0), gMat, cols, (c, m) => m.makeTranslation(c[0], 0, c[1]), { shadow: true });
  const beams = cols.filter((c, i) => i % 2 === 0); instGeo(new THREE.BoxGeometry(13.6, 0.9, 0.8).translate(0, RAIL.deck - 1.7, 0), gMat, beams, (c, m) => m.makeTranslation(RAIL.x, 0, c[1]));
  for (const sz of RAIL.stations) { // station platforms with canopies
    for (const sx of [-1, 1]) { plain(RAIL.x + sx * 6.4, RAIL.deck - 0.9, sz, 5, 1.0, 40, 0x9a958c); plain(RAIL.x + sx * 6.4, RAIL.deck + 4.2, sz, 5.4, 0.3, 40, 0x3e5245); }
  }
}
function makeTrainCar(lead) {
  const side = new THREE.MeshStandardMaterial({ map: trainTex, roughness: 0.35, metalness: 0.6 });
  const end = new THREE.MeshStandardMaterial({ map: trainEndTex, roughness: 0.4, metalness: 0.5, emissive: lead ? 0x332a10 : 0x000000 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x9da2a7, map: TEX.metal, roughness: 0.45, metalness: 0.7 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.1, 15.4), [side, side, roof, roof, end, end]); body.position.y = 1.95; g.add(body);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 15.3, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).scale(1, 0.25, 1), roof); top.position.y = 3.5; g.add(top);
  const dark = new THREE.MeshStandardMaterial({ color: 0x1d2024, roughness: 0.8, metalness: 0.4 });
  for (const z of [-5.2, 5.2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 2.6), dark); b.position.set(0, 0.42, z); g.add(b); for (const zz of [-0.8, 0.8]) for (const xx of [-1.05, 1.05]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.15, 14).rotateZ(Math.PI / 2), dark); w.position.set(xx, 0.38, z + zz); g.add(w); } }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g); return g;
}
for (const [sx, dir, start] of [[-1, 1, RAIL.z0 + 40], [1, -1, RAIL.z1 - 40]]) {
  const t = { x: RAIL.x + sx * RAIL.gap, c: start, dir, v: 0, stop: 2, cars: [], len: 4 * 15.8 };
  for (let i = 0; i < 4; i++) t.cars.push(makeTrainCar(i === 0 || i === 3));
  TRAINS.push(t);
}
function nextStop(t) {
  const lim = t.dir > 0 ? RAIL.z1 - t.len / 2 - 2 : RAIL.z0 + t.len / 2 + 2; let best = lim;
  for (const s of RAIL.stations) { const d = (s - t.c) * t.dir; if (d > 1.5 && d < (best - t.c) * t.dir) best = s; }
  return best;
}
function updateTrains(dt) {
  for (const t of TRAINS) {
    if (t.stop > 0) { t.stop -= dt; t.v = 0; if (t.stop <= 0) { const lim = t.dir > 0 ? RAIL.z1 - t.len / 2 - 2 : RAIL.z0 + t.len / 2 + 2; if (Math.abs(lim - t.c) < 2) t.dir *= -1; t.target = nextStop(t); } }
    else {
      if (t.target === undefined) t.target = nextStop(t);
      const dist = (t.target - t.c) * t.dir; const vmax = 24, acc = 3.2, dec = 3.6;
      const want = Math.min(vmax, Math.sqrt(Math.max(0, 2 * dec * dist)));
      t.v = t.v < want ? Math.min(want, t.v + acc * dt) : Math.max(want, t.v - dec * 1.6 * dt);
      t.c += t.v * t.dir * dt;
      if (dist < 0.4 && t.v < 0.6) { t.c = t.target; t.v = 0; t.stop = 6; }
    }
    t.pitch = damp(t.pitch || 0, 0, 3, dt);
    t.cars.forEach((car, i) => { const z = t.c + t.dir * (t.len / 2 - 7.9 - i * 15.8); car.position.set(t.x, RAIL.deck + 0.34 + Math.sin(gameTime * 9 + i) * 0.015 * Math.min(1, t.v / 10), z); car.rotation.y = t.dir > 0 ? 0 : Math.PI; });
  }
}
function trainBoxes() {
  for (const t of TRAINS) {
    const dz = t.c - P.pos.z; if (Math.abs(dz) > t.len / 2 + 30 || Math.abs(t.x - P.pos.x) > 20) continue;
    const y0 = RAIL.deck + 0.34, y1 = y0 + 3.75, z0 = t.c - t.len / 2, z1 = t.c + t.len / 2;
    carBoxes.push({ x0: t.x - 1.5, x1: t.x + 1.5, z0, z1, y0, y1, train: t, vx: 0, vz: t.v * t.dir });
    // standing on the track in front of a moving train
    const front = t.dir > 0 ? z1 : z0; const ahead = (P.pos.z - front) * t.dir;
    if (t.v > 4 && ahead > -0.3 && ahead < 0.9 && Math.abs(P.pos.x - t.x) < 1.8 && P.pos.y > y0 - 0.5 && P.pos.y < y1 - 0.5 && !P.dead) {
      P.vel.set(0, 9, t.v * t.dir * 1.4); P.mode = 'air'; shake = 0.7; sfx.carHit(); ui.trick('Hit by a train', '');
    }
  }
}
function trainSound() {
  let k = 0, sp = 0; for (const t of TRAINS) { const d = Math.hypot(t.x - camera.position.x, t.c - camera.position.z, RAIL.deck - camera.position.y); const kk = clamp(1 - d / 140, 0, 1) * clamp(t.v / 12, 0, 1); if (kk > k) { k = kk; sp = t.v; } }
  sfx.train(k, sp);
}
