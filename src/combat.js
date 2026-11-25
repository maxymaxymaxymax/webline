// ================= COMBAT =================
const enemies = [], crimes = [], shots = [];
const ETYPES = {
  brawler: { char: 'bearded', hp: 90, speed: 4.4, dmg: 10, heavy: false },
  bruiser: { char: 'biker', hp: 150, speed: 3.4, dmg: 22, heavy: true },
  gunner: { char: 'soldier', hp: 75, speed: 4, dmg: 8, ranged: true },
};
const ringTex = (() => { const c = makeCanvas(128, 128), g = c.getContext('2d'); g.strokeStyle = '#fff'; g.lineWidth = 10; g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.stroke(); g.fillStyle = '#fff'; g.font = '900 64px Impact,sans-serif'; g.textAlign = 'center'; g.fillText('!', 64, 86); return canvasTex(c); })();
const cocoonMat = new THREE.MeshStandardMaterial({ map: splatTex, color: 0xf2f2ee, transparent: true, opacity: 0.9, roughness: 0.9 });
const cocoonGeo = new THREE.CapsuleGeometry(0.42, 1.0, 4, 10).translate(0, 0.95, 0);
const barTex = makeCanvas(64, 8);
function spawnEnemy(type, pos, crime) {
  const T = ETYPES[type]; const inst = makeInstance(T.char);
  const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, color: 0xffd23a, depthTest: false, transparent: true })); ring.scale.set(0.9, 0.9, 1); ring.position.y = 2.4; ring.visible = false; ring.renderOrder = 10; inst.group.add(ring);
  const cocoon = new THREE.Mesh(cocoonGeo, cocoonMat); cocoon.visible = false; inst.group.add(cocoon);
  const bar = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xea2a3d, depthTest: false })); bar.scale.set(0.9, 0.07, 1); bar.position.y = 2.15; bar.renderOrder = 10; inst.group.add(bar);
  scene.add(inst.group);
  const e = { type, T, inst, ring, cocoon, bar, pos: pos.clone(), vel: new V3(), yaw: rr(0, 6.28), hp: T.hp, st: 'idle', t: 0, cd: rr(1, 3), webbed: 0, stun: 0, crime, alive: true, air: false, gone: 0, flash: 0, wind: 0 };
  playAct(inst, 'fight_idle', 0); enemies.push(e); return e;
}
function nearEnemy(r) { for (const e of enemies) if (e.alive && e.pos.distanceToSquared(P.pos) < r * r) return e; return null; }
function pickTarget(r) {
  let best = null, bs = -1e9;
  for (const e of enemies) { if (!e.alive) continue; tA.subVectors(e.pos, P.pos); const d = tA.length(); if (d > r) continue; tA.y = 0; tA.normalize(); const s = tA.dot(camFH) * 6 - d + (e.st === 'windup' ? 3 : 0); if (s > bs) { bs = s; best = e; } }
  return best;
}
const dmgMul = () => (SK('heavy') ? 1.2 : 1) * (P.od > 0 ? 2 : 1);
function hitEnemy(e, dmg, knock, up, label) {
  if (!e.alive) return;
  if (e.decoy) { e.alive = false; fx.burst(e.pos.clone().add(new V3(0, 1, 0)), 0xc06bff, 2); sfx.whoosh(1); ui.trick('Decoy', ''); return; }
  if (e.boss) { knock = knock ? knock.clone().multiplyScalar(e.boss === 'kite' && e.down > 0 ? 0.3 : 0.1) : null; up = 0; if (e.bstun > 0) dmg *= 1.8; e.hits = (e.hits || 0) + 1; }
  const mult = e.webbed >= 3 ? 1.6 : 1; e.hp -= dmg * mult; e.flash = 0.12; e.stun = Math.max(e.stun, 0.45);
  if (e.st === 'windup' && !e.T.heavy) { e.st = 'stagger'; e.t = 0; e.ring.visible = false; }
  if (knock) { e.vel.copy(knock); e.vel.y += up || 0; if ((up || 0) > 3 || knock.length() > 8) { e.air = true; e.st = 'knock'; e.webbed = Math.min(e.webbed, 2.9); e.cocoon.visible = false; } }
  fx.spark(tA.copy(e.pos).add(tB.set(0, 1.2, 0))); sfx.hit(dmg > 25); P.focus = Math.min(100, P.focus + 4); shake = Math.max(shake, dmg > 25 ? 0.35 : 0.15);
  if (P.od > 0) for (const o of enemies) if (o !== e && o.alive && o.pos.distanceTo(e.pos) < 3.5) { o.hp -= 10; o.vel.subVectors(o.pos, e.pos).setLength(6); o.vel.y = 3; o.air = true; o.st = 'knock'; }
  P.combo++; P.comboT = 3;
  if (e.hp <= 0) killEnemy(e, label);
}
function killEnemy(e, label) {
  if (e.boss) bossDefeated(e);
  e.alive = false; e.st = 'down'; e.ring.visible = false; e.bar.visible = false; playAct(e.inst, 'death', 0.15, { once: true });
  gainXP(30); ui.trick(label || 'Takedown', '+30'); P.focus = Math.min(100, P.focus + 8);
}
// ---------- finishers: hit a weakened (or fully webbed) thug to take them out in style ----------
const FINISHERS = [
  { name: 'Web Slam', steps: [['upper', 0.28], ['punchR', 0.32]] },
  { name: 'Spin Kick', steps: [['punchL', 0.18], ['kickR', 0.38]] },
  { name: 'Launch & Web', steps: [['kickR', 0.26], ['upper', 0.3], ['webshotR', 0.3]] },
];
function canFinish(e) { return e && e.alive && !e.boss && e.pos.distanceTo(P.pos) < 3.2 && (e.hp <= e.T.hp * 0.34 || e.st === 'webbed' || e.stun > 1.0); }
function startFinisher(e) {
  const f = FINISHERS[Math.floor(Math.random() * FINISHERS.length)];
  tA.subVectors(e.pos, P.pos); tA.y = 0; P.facing.copy(tA.normalize());
  P.finisher = { e, f, step: 0, t: 0, done: false }; P.invuln = 2; P.atkCD = 1.2; e.stun = 5; e.st = 'idle'; e.cocoon.visible = false;
  slowmo(0.45, 0.9); ui.trick('FINISHER', f.name); sfx.whoosh(0.6);
  P.act = { pose: f.steps[0][0], t: 0, dur: f.steps[0][1], hit: true, legs: f.steps[0][0].startsWith('kick') };
}
function updateFinisher(dt) {
  const F = P.finisher; if (!F) return; const e = F.e; F.t += dt;
  const [, dur] = F.f.steps[F.step];
  if (F.t > dur * 0.5 && !F.hitDone) { F.hitDone = true; const last = F.step === F.f.steps.length - 1;
    tA.subVectors(e.pos, P.pos); tA.y = 0; tA.normalize(); fx.burst(e.pos.clone().add(new V3(0, 1.2, 0)), 0xffd9a0, last ? 2.2 : 1); sfx.hit && sfx.hit(last ? 1.4 : 0.9);
    if (F.f.name === 'Web Slam' && F.step === 0) { e.vel.set(0, 13, 0); e.air = true; }
    else if (F.f.name === 'Launch & Web' && F.step === 1) { e.vel.copy(tA).multiplyScalar(6); e.vel.y = 12; e.air = true; }
    else if (!last) e.vel.addScaledVector(tA, 2);
    if (last) { slowmo(0.15, 0.35);
      if (F.f.name === 'Web Slam') { e.vel.set(0, -30, 0); }
      else if (F.f.name === 'Spin Kick') { e.vel.copy(tA).multiplyScalar(22); e.vel.y = 6; e.air = true; }
      else { e.st = 'webbed'; e.cocoon.visible = true; e.vel.copy(tA).multiplyScalar(14); e.vel.y = 3; }
      e.hp = 0; killEnemy(e, 'Finisher: ' + F.f.name); gainXP(20); P.focus = Math.min(100, P.focus + 15);
    }
  }
  if (F.t >= dur) { F.step++; F.t = 0; F.hitDone = false;
    if (F.step >= F.f.steps.length) { P.finisher = null; return; }
    const [pose, d2] = F.f.steps[F.step]; P.act = { pose, t: 0, dur: d2, hit: true, legs: pose.startsWith('kick') };
    if (F.f.name === 'Web Slam' && F.step === 1) { P.vel.y = 7; P.mode = 'air'; }
  }
}
function melee() {
  if (P.atkCD > 0 || P.dead || P.finisher) return;
  { const tf = pickTarget(4); if (canFinish(tf)) { startFinisher(tf); return; } }
  const t = pickTarget(10); P.comboIdx = P.comboWin > 0 ? (P.comboIdx + 1) % 4 : 0; P.comboWin = 0.9;
  const poses = ['punchR', 'punchL', 'kickR', 'upper']; const idx = P.comboIdx;
  P.act = { pose: poses[idx], t: 0, dur: idx === 3 ? 0.42 : 0.3, legs: idx === 2, hit: false, target: t, idx };
  P.atkCD = 0.2; if (t) { tA.subVectors(t.pos, P.pos); tA.y = 0; P.facing.copy(tA.normalize()); if (t.pos.distanceTo(P.pos) > 1.8) P.lunge = { e: t, t: 0.25 }; }
  sfx.whoosh(0.35);
}
function updatePlayerAct(dt) {
  const a = P.act; if (!a) return; a.t += dt;
  if (!a.hit && a.t > a.dur * 0.45) {
    a.hit = true; const e = a.target;
    if (e && e.alive && e.pos.distanceTo(P.pos) < 2.8) {
      tA.subVectors(e.pos, P.pos); tA.y = 0; tA.normalize();
      slowmo(0.08, a.idx >= 2 ? 0.07 : 0.04);
      if (a.idx === 3) hitEnemy(e, 32 * dmgMul(), tA.multiplyScalar(5), 10, 'Uppercut');
      else if (a.idx === 2) hitEnemy(e, 22 * dmgMul(), tA.multiplyScalar(9), 3);
      else hitEnemy(e, 15 * dmgMul(), tA.multiplyScalar(1.5), 0);
    }
  }
  if (a.t >= a.dur) P.act = null;
}
function webShot() {
  if (P.atkCD > 0) return; const e = pickTarget(25); if (!e) return; P.atkCD = 0.25;
  P.act = { pose: 'webshotR', t: 0, dur: 0.25, hit: true };
  shots.push({ web: true, pos: handWorld('R', new V3()), target: e, speed: 60, mesh: makeShotMesh(0xffffff, 0.18) }); sfx.thwip(1.1);
}
function makeShotMesh(c, r) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ color: c })); scene.add(m); return m; }
function parry() { if (P.parryCD > 0) return; P.parryT = gameTime; P.parryCD = 0.45; sfx.whoosh(0.3); }
function dodge() { if (P.dodgeT > 0 || P.mode !== 'ground') return; P.dodgeT = 0.6; P.invuln = 0.35; const d = wish.lengthSq() > 0 ? wish.clone() : camFH.clone().negate(); P.vel.addScaledVector(d, 16); P.vel.y = 3; P.mode = 'air'; sfx.whoosh(0.5);
  for (const e of enemies) if (e.alive && e.st === 'windup' && e.t > e.wind - 0.25 && e.pos.distanceTo(P.pos) < 5) { slowmo(0.3, 0.5); addTrick('Perfect Dodge', 15); P.focus = Math.min(100, P.focus + 10); break; } }
function webYank() {
  const e = pickTarget(26); if (!e) return; const side = keys.KeyA ? -1 : keys.KeyD ? 1 : 0;
  shots.push({ web: true, pos: handWorld('R', new V3()), target: e, speed: 90, mesh: makeShotMesh(0xffffff, 0.12), yank: side || 'pull' }); sfx.thwip(1.3);
  P.act = { pose: 'webshotR', t: 0, dur: 0.3, hit: true };
}
function doYank(e, side) {
  if (e.boss === 'bulwark') { ui.trick('Too heavy to yank', ''); return; }
  if (e.boss === 'kite') { e.down = 3; e.bstun = 3; addTrick('Kite pulled down', 20, true); return; }
  if (e.boss) { e.bstun = 1.2; hitEnemy(e, 10, null); return; }
  if (side === 'pull') { tA.subVectors(P.pos, e.pos); tA.y = 0; const d = tA.length(); e.vel.copy(tA.normalize()).multiplyScalar(Math.min(22, d * 1.6)); e.vel.y = 7; e.air = true; e.st = 'knock'; e.yanked = 'pull'; hitEnemy(e, 8, null); }
  else { const dir = tA.copy(camR).multiplyScalar(side); e.vel.copy(dir).multiplyScalar(17); e.vel.y = 4; e.air = true; e.st = 'knock'; e.yanked = 'slam'; hitEnemy(e, 6, null); }
}
function hurtPlayer(dmg, src, fall) {
  if (P.dead || (P.invuln > 0 && !fall)) return false;
  P.hp -= dmg; P.lastHurt = gameTime; ui.flash(); shake = Math.max(shake, 0.4); sfx.hurt();
  if (src) { tA.subVectors(P.pos, src).setY(0).normalize(); P.vel.addScaledVector(tA, 6); }
  P.invuln = 0.4; P.combo = 0;
  if (P.hp <= 0) { P.hp = 0; P.dead = true; ui.dead(); }
  return true;
}
const abil = { mech: 0, lash: 0, bomb: 0, bombs: 2 };
const mechGroup = (() => { const g = new THREE.Group(); const mat = new THREE.MeshStandardMaterial({ color: 0xd4a43a, metalness: 0.95, roughness: 0.25 }); for (let i = 0; i < 4; i++) { const arm = new THREE.Group(); arm.rotation.y = i * Math.PI / 2 + Math.PI / 4; const a = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.1, 8).rotateZ(Math.PI / 2).translate(0.55, 0, 0), mat); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.2, 8).rotateZ(Math.PI / 2 + 0.6).translate(1.4, -0.35, 0), mat); const c = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 8).rotateZ(-Math.PI / 2 - 0.9).translate(1.95, -0.75, 0), mat); arm.add(a, b, c); g.add(arm); } g.visible = false; scene.add(g); return g; })();
const lashGroup = (() => { const g = new THREE.Group(); const mat = new THREE.MeshStandardMaterial({ color: 0x0a0a0e, roughness: 0.15, metalness: 0.3, emissive: 0x5a0010, emissiveIntensity: 0.6 }); for (let i = 0; i < 3; i++) { const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(new V3(Math.sin(t * 5 + i * 2) * 0.6 * t + (i - 1) * t * 1.5, Math.cos(t * 4 + i) * 0.5 * t, t * 9)); } const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.09, 6), mat); g.add(m); } g.visible = false; scene.add(g); return g; })();
let mechT = 0, lashT = 0;
function useAbility(k) {
  if (P.dead) return;
  if (k === 1 && abil.mech <= 0) { abil.mech = SK('mech2') ? 8 : 12; mechT = 0.8; sfx.mech(); const r = SK('mech2') ? 8 : 6; for (const e of enemies) if (e.alive && e.pos.distanceTo(P.pos) < r) { tA.subVectors(e.pos, P.pos).setY(0).normalize(); hitEnemy(e, 30 * dmgMul(), tA.multiplyScalar(10), 6, 'Mech-Arms'); } P.act = { pose: 'mech', t: 0, dur: 0.6, hit: true }; }
  if (k === 2 && abil.lash <= 0) { abil.lash = 9; lashT = 0.5; sfx.lash(); const range = SK('lash2') ? 13.5 : 9; for (const e of enemies) { if (!e.alive) continue; tA.subVectors(e.pos, P.pos); const d = tA.length(); tA.y = 0; tA.normalize(); if (d < range && tA.dot(camFH) > 0.5) hitEnemy(e, 35 * dmgMul(), tA.multiplyScalar(13), 6, 'Ink Lash'); } P.act = { pose: 'lash', t: 0, dur: 0.45, hit: true }; P.facing.copy(camFH); }
  if (k === 3 && abil.bombs > 0) { abil.bombs--; const t = pickTarget(30); const to = t ? t.pos.clone() : P.pos.clone().addScaledVector(camFH, 12); shots.push({ bomb: true, pos: P.pos.clone().add(new V3(0, 1.5, 0)), to, t: 0, from: P.pos.clone().add(new V3(0, 1.5, 0)), mesh: makeShotMesh(0xe8e8e8, 0.3) }); sfx.thwip(0.8); }
  if (k === 4 && P.focus >= 100 && P.od <= 0) { P.focus = 0; P.od = SK('od2') ? 15 : 10; ui.trick('Overdrive', '', true); slowmo(0.4, 0.6); sfx.od(); shake = 0.6; }
}
function updateAbilities(dt) {
  abil.mech -= dt; abil.lash -= dt; const maxB = SK('bomb2') ? 3 : 2; if (abil.bombs < maxB) { abil.bomb += dt; if (abil.bomb > 15) { abil.bomb = 0; abil.bombs++; } }
  mechT -= dt; mechGroup.visible = mechT > 0; if (mechT > 0) { mechGroup.position.copy(P.pos).add(tA.set(0, 1.3, 0)); mechGroup.rotation.y += dt * 18; const s = Math.min(1, (0.8 - mechT) * 6, mechT * 6); mechGroup.scale.setScalar(Math.max(0.01, s)); }
  lashT -= dt; lashGroup.visible = lashT > 0; if (lashT > 0) { lashGroup.position.copy(P.pos).add(tA.set(0, 1.2, 0)); lashGroup.quaternion.setFromUnitVectors(new V3(0, 0, 1), camFH); lashGroup.scale.set(1, 1, Math.min(1, (0.5 - lashT) * 7) * (SK('lash2') ? 1.5 : 1)); }
}
function updateShots(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i]; let done = false;
    if (s.bomb) { s.t += dt * 1.6; const t = Math.min(1, s.t); s.pos.lerpVectors(s.from, s.to, t); s.pos.y += Math.sin(t * Math.PI) * 5; if (t >= 1) { done = true; fx.burst(s.pos, 0xffffff, 5); sfx.boom(); for (const e of enemies) if (e.alive && e.pos.distanceTo(s.to) < 5.5) { e.webbed = 3; e.webT = 7; e.cocoon.visible = true; e.st = 'webbed'; gainXP(5); } ui.trick('Web Bomb', '+5'); } }
    else if (s.web) { const tp = tA.copy(s.target.pos).add(tB.set(0, 1.1, 0)); const d = tp.distanceTo(s.pos); if (d < s.speed * dt + 0.3 || !s.target.alive) { done = true; const e = s.target; if (e.alive) { if (s.yank) doYank(e, s.yank); else { e.webbed += SK('webcart') ? 1.5 : 1; if (e.webbed >= 3) { e.st = 'webbed'; e.webT = 6; e.cocoon.visible = true; ui.trick('Webbed', ''); } e.stun = Math.max(e.stun, 0.5); } } } else s.pos.addScaledVector(tp.sub(s.pos).normalize(), s.speed * dt); }
    else { // bullet
      s.life -= dt; s.pos.addScaledVector(s.vel, dt);
      if (s.deflected) { const e = s.owner; if (e.alive && s.pos.distanceTo(tA.copy(e.pos).add(tB.set(0, 1.2, 0))) < 1) { hitEnemy(e, 40, s.vel.clone().setLength(6), 3, 'Deflected'); done = true; } }
      else if (s.pos.distanceTo(tA.copy(P.pos).add(tB.set(0, 1.1, 0))) < 2.4 && gameTime - P.parryT < (SK('guard') ? 0.4 : 0.28)) { s.deflected = true; s.vel.subVectors(tA.copy(s.owner.pos).add(tB.set(0, 1.2, 0)), s.pos).setLength(55); addTrick('Deflect', 12); sfx.parry(); P.focus = Math.min(100, P.focus + 12); }
      else if (s.pos.distanceTo(tA.copy(P.pos).add(tB.set(0, 1.1, 0))) < 0.8) { hurtPlayer(s.dmg, s.owner.pos); done = true; }
      if (s.life <= 0) done = true;
    }
    if (s.mesh) s.mesh.position.copy(s.pos);
    if (done) { scene.remove(s.mesh); s.mesh.geometry.dispose(); shots.splice(i, 1); }
  }
}
function updateEnemies(dt) {
  let attackers = enemies.filter(e => e.alive && (e.st === 'windup')).length;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i]; const inst = e.inst; e.t += dt; e.stun -= dt; e.flash -= dt;
    if ((e.boss || e.decoy) && updateBoss(e, dt, i)) continue;
    const toP = tA.subVectors(P.pos, e.pos); const dist = toP.length(); toP.y = 0; const dirP = toP.lengthSq() > 0 ? toP.clone().normalize() : new V3(0, 0, 1);
    e.bar.scale.x = 0.9 * Math.max(0, e.hp / e.T.hp);
    if (!e.alive) { e.gone += dt; if (e.gone > 7) { scene.remove(inst.group); enemies.splice(i, 1); continue; } }
    else if (e.air) {
      e.vel.y -= GRAV * 0.8 * dt; const before = e.pos.clone(); e.pos.addScaledVector(e.vel, dt);
      const r = collide(e.pos, e.vel);
      if (r.wall && e.yanked === 'slam') { const dm = (SK('wallthrash') ? 90 : 45) * dmgMul(); e.yanked = null; addTrick('Wall Slam', 20, true); fx.burst(e.pos.clone().add(new V3(0, 1, 0)), 0xffd9a0, 2); e.vel.set(0, 0, 0); hitEnemy(e, dm, null); if (SK('wallthrash')) for (const o of enemies) if (o !== e && o.alive && o.pos.distanceTo(e.pos) < 4) o.stun = 2.5; }
      if (e.yanked === 'pull' && e.pos.distanceTo(P.pos) < 2.2) { e.yanked = null; tB.subVectors(e.pos, P.pos).setY(0).normalize(); hitEnemy(e, 25 * dmgMul(), tB.multiplyScalar(4), 9, 'Yank Uppercut'); P.act = { pose: 'upper', t: 0, dur: 0.35, hit: true }; }
      const gy = supportHeight(e.pos.x, e.pos.z, e.pos.y + 0.5);
      if (e.pos.y <= gy && e.vel.y <= 0) { e.pos.y = gy; if (e.yanked === 'slam') { hitEnemy(e, 15, null); e.yanked = null; } e.air = false; e.vel.set(0, 0, 0); if (e.alive) { e.st = 'getup'; e.t = 0; } }
      inst.group.rotation.x = clamp(inst.group.rotation.x + dt * 4, 0, 1.3);
    } else if (e.st === 'webbed') { e.webT -= dt; inst.mixer.timeScale = 0; if (e.webT <= 0) { e.st = 'idle'; e.webbed = 0; e.cocoon.visible = false; inst.mixer.timeScale = 1; } }
    else if (e.st === 'getup') { inst.group.rotation.x = damp(inst.group.rotation.x, 0, 4, dt); if (e.t > 1.1) { e.st = 'idle'; inst.group.rotation.x = 0; } }
    else {
      inst.mixer.timeScale = 1; inst.group.rotation.x = 0;
      const alert = dist < 45 && Math.abs(P.pos.y - e.pos.y) < 14;
      if (e.stun > 0) { playAct(inst, 'fight_idle', 0.1); }
      else if (e.st === 'windup') {
        e.ring.visible = true; e.ring.material.color.setHex(e.T.heavy ? 0xff3344 : 0xffd23a); e.ring.material.opacity = 0.6 + 0.4 * Math.sin(e.t * 20);
        e.yaw = Math.atan2(dirP.x, dirP.z);
        if (e.t >= e.wind) {
          e.ring.visible = false; e.st = 'recover'; e.t = 0; e.cd = rr(1.6, 3.2);
          if (e.T.ranged) { const m = makeShotMesh(0xffe08a, 0.1); const from = e.pos.clone().add(new V3(0, 1.4, 0)); shots.push({ pos: from, vel: tB.copy(P.pos).add(tC.set(0, 1.1, 0)).sub(from).setLength(34).clone(), life: 2, dmg: e.T.dmg, owner: e, mesh: m }); sfx.shot(); }
          else if (dist < 3.2) {
            const since = gameTime - P.parryT; const win = (SK('guard') ? 0.4 : 0.28) * (e.T.heavy ? 0.5 : 1);
            if (since < win) { e.stun = SK('counter') ? 2.5 : 1.6; e.st = 'idle'; slowmo(0.25, 0.35); addTrick(e.T.heavy ? 'Perfect Parry' : 'Parry', 15); sfx.parry(); P.focus = Math.min(100, P.focus + (SK('counter') ? 35 : 20)); fx.spark(e.pos.clone().add(new V3(0, 1.3, 0)), 0x9fd8ff); }
            else hurtPlayer(e.T.dmg, e.pos);
          }
        }
      } else if (alert) {
        e.yaw = Math.atan2(dirP.x, dirP.z); e.cd -= dt;
        const want = e.T.ranged ? 14 : 2.2; let mv = 0;
        if (dist > want + 0.6) mv = 1; else if (e.T.ranged && dist < want - 4) mv = -0.7;
        if (!e.T.ranged && dist <= 3 && attackers >= 2) mv = 0;
        const side = tB.set(-dirP.z, 0, dirP.x).multiplyScalar(Math.sin(e.t * 0.7 + i) * 0.4);
        e.vel.copy(dirP).multiplyScalar(mv * e.T.speed).add(side.multiplyScalar(e.T.speed * (mv === 0 ? 1 : 0.3)));
        for (const o of enemies) if (o !== e && o.alive) { tC.subVectors(e.pos, o.pos); tC.y = 0; const d = tC.length(); if (d < 1.3 && d > 0.01) e.vel.addScaledVector(tC, (1.3 - d) * 6 / d); }
        e.pos.addScaledVector(e.vel, dt); collide(e.pos, e.vel); e.pos.y = supportHeight(e.pos.x, e.pos.z, e.pos.y + 0.6);
        const hs = Math.hypot(e.vel.x, e.vel.z);
        playAct(inst, hs > 3 ? 'run' : hs > 0.6 ? 'walk' : 'fight_idle', 0.2);
        if (e.cd <= 0 && ((e.T.ranged && dist < 30) || (!e.T.ranged && dist < 3.2 && attackers < 2)) && !P.dead) { e.st = 'windup'; e.t = 0; e.wind = e.T.heavy ? 0.95 : e.T.ranged ? 0.8 : 0.6; attackers++; if (!e.T.ranged) playAct(inst, 'fight', 0.1, { restart: true, speed: e.T.heavy ? 0.8 : 1.1 }); }
      } else { playAct(inst, 'fight_idle', 0.3); }
      if (e.st === 'recover' && e.t > 0.5) e.st = 'idle';
    }
    inst.group.position.copy(e.pos); inst.group.rotation.y = damp(inst.group.rotation.y, e.yaw, 10, dt);
    if (e.pos.distanceTo(P.pos) < 220) inst.mixer.update(dt);
  }
}
// crimes
let crimeTimer = 8;
function spawnCrime() {
  const d = pick(DIST); let spot = null;
  for (let k = 0; k < 30 && !spot; k++) { const b = pick(d.blocks); const x = b.bx0 - 1.5, z = b.bz0 - 1.5; const dd = Math.hypot(x - P.pos.x, z - P.pos.z); if (dd > 140 && dd < 420 && !boxAt(x, 1, z, 0.5)) spot = new V3(x, 0, z); }
  if (!spot) return;
  const c = { pos: spot, enemies: [], done: false, beam: null, engaged: false, label: pick(['Armed robbery', 'Mugging in progress', 'Gang fight', 'Store holdup', 'Car jacking']) };
  const n = ri(3, 5); for (let i = 0; i < n; i++) { const t = i === 0 && rng() < 0.6 ? 'bruiser' : rng() < 0.3 ? 'gunner' : 'brawler'; c.enemies.push(spawnEnemy(t, spot.clone().add(new V3(rr(-5, 5), 0, rr(-5, 5))), c)); }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 300, 12, 1, true).translate(0, 150, 0), new THREE.MeshBasicMaterial({ color: 0xff3040, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.copy(spot); scene.add(beam); c.beam = beam; crimes.push(c);
  ui.notice(`${c.label} · ${Math.round(spot.distanceTo(P.pos))} m`); ui.addMarker(c);
}
function updateCrimes(dt) {
  crimeTimer -= dt; if (crimeTimer <= 0 && crimes.length < 2 && playing) { spawnCrime(); crimeTimer = rr(25, 45); }
  for (let i = crimes.length - 1; i >= 0; i--) {
    const c = crimes[i]; const near = c.pos.distanceTo(P.pos) < 60;
    if (near && !c.engaged) { c.engaged = true; civReact(c.pos, 'flee', 40); }
    c.beam.material.opacity = near ? 0.06 : 0.22;
    if (c.enemies.every(e => !e.alive)) { scene.remove(c.beam); crimes.splice(i, 1); gainXP(150); ui.notice(c.boss ? 'Boss fight won' : 'Crime stopped · +150 XP', true); if (!c.boss) { crimesSinceBoss++; if (crimesSinceBoss >= 2 && !activeBoss) { crimesSinceBoss = 0; setTimeout(() => { if (playing) spawnBossEvent(); }, 5000); } } civReact(c.pos, 'cheer', 50); ui.removeMarker(c); sfx.good(); }
  }
}
