// ================= BOSSES: original villains =================
const BOSS_DEFS = {
  bulwark: { name: 'BULWARK', title: 'A demolition exosuit with a grudge', char: 'bearded', scale: 1.5, hp: 700, speed: 3.6, dmg: 26, tint: 0xf2b21c, glow: 0xff6a00, area: 'Eastbank' },
  overload: { name: 'OVERLOAD', title: 'Stole a power plant. Became one.', char: 'soldier', scale: 1.15, hp: 520, speed: 4, dmg: 14, tint: 0xb87333, glow: 0x37b8ff, area: 'Midtown' },
  kite: { name: 'KITE', title: 'Sky pirate with a drone wing', char: 'guard', scale: 1.0, hp: 380, speed: 0, dmg: 20, tint: 0x1f8f8a, glow: 0xffe04a, area: 'Southport' },
  hex: { name: 'HEX', title: 'Smoke, mirrors and a mean streak', char: 'coat', scale: 1.05, hp: 460, speed: 3.5, dmg: 12, tint: 0x6a2fa0, glow: 0xc06bff, area: 'the docks' },
};
for (const k in BOSS_DEFS) { const d = BOSS_DEFS[k]; ETYPES['boss_' + k] = { char: d.char, hp: d.hp, speed: d.speed || 3, dmg: d.dmg, heavy: true }; }
ETYPES.decoy = { char: 'coat', hp: 1, speed: 3.5, dmg: 0 };
const BOSS_ORDER = ['bulwark', 'overload', 'kite', 'hex']; let bossIdx = 0, crimesSinceBoss = 0, activeBoss = null;
const mines = [], novas = [];
const glowMat = c => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: c, emissiveIntensity: 2.2, roughness: 0.4 });
const armorMat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.6 });
function tintInst(inst, c, glow, metal) {
  inst.model.traverse(o => { if (!o.isMesh) return; o.material = o.material.clone(); o.material.color.lerp(new Col(c), 0.8); if (metal) { o.material.metalness = 0.6; o.material.roughness = 0.35; } if (glow) { o.material.emissive = new Col(glow); o.material.emissiveIntensity = 0.2; } });
}
function makeAccessories(key, d) {
  const g = new THREE.Group(); const parts = [];
  const add = (mesh, bone, off) => { g.add(mesh); parts.push({ mesh, bone, off: new V3(...off) }); };
  if (key === 'bulwark') {
    for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.5), armorMat(0xf2b21c)), s < 0 ? 'LeftArm' : 'RightArm', [0, 0.12, 0]);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.08), glowMat(0xff6a00)), 'Head', [0, 0.06, 0.13]);
    for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.6, 10), armorMat(0x222222)), 'Spine2', [s * 0.14, 0.22, -0.2]);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.3), armorMat(0x2a2a2a)), 'Spine2', [0, 0, -0.16]);
  } else if (key === 'overload') {
    for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), glowMat(0x37b8ff)), s < 0 ? 'LeftHand' : 'RightHand', [0, 0, 0]);
    add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 24).rotateX(Math.PI / 2), glowMat(0x37b8ff)), 'Spine2', [0, 0.05, 0]);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.05), glowMat(0x9fe6ff)), 'Head', [0, 0.05, 0.12]);
  } else if (key === 'kite') {
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new V3(0, 0, 0), new V3(s * 2.2, -0.1, -0.5), new V3(s * 0.4, -0.5, -0.2)]), new THREE.MeshStandardMaterial({ color: 0x1f8f8a, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.4 })); w.geometry.computeVertexNormals(); add(w, 'Spine2', [0, 0.1, -0.18]); }
    for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.35, 10), glowMat(0xffe04a)), 'Spine2', [s * 0.25, -0.15, -0.25]);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0d1418, metalness: 0.8, roughness: 0.15 })), 'Head', [0, 0.05, 0]);
  } else if (key === 'hex') {
    for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), glowMat(0xc06bff)), 'Head', [s * 0.035, 0.06, 0.11]);
    add(new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.32, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0x24103a, side: THREE.DoubleSide, roughness: 0.8 })), 'Head', [0, 0.12, -0.02]);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(g); return { g, parts };
}
function updateAccessories(e) {
  if (!e.acc) return; const q = e.inst.group.quaternion;
  for (const p of e.acc.parts) { const b = e.inst.bones[p.bone]; if (!b) continue; b.getWorldPosition(p.mesh.position); p.mesh.position.add(tA.copy(p.off).multiplyScalar(e.bscale || 1).applyQuaternion(q)); p.mesh.quaternion.copy(q); p.mesh.scale.setScalar(e.bscale || 1); }
}
function spawnBoss(key, pos, crime) {
  const d = BOSS_DEFS[key]; const e = spawnEnemy('boss_' + key, pos, crime); e.boss = key; e.bscale = d.scale; e.bar.visible = false;
  e.inst.inner.scale.multiplyScalar(d.scale); e.inst.inner.position.y *= d.scale;
  tintInst(e.inst, d.tint, d.glow, key === 'bulwark' || key === 'overload'); e.acc = makeAccessories(key, d);
  e.bst = 'intro'; e.bt = 0; e.bcd = 2; e.hits = 0; if (key === 'kite') { e.hover = pos.y + 16; e.ang = 0; }
  activeBoss = e; return e;
}
function spawnBossEvent() {
  const key = BOSS_ORDER[bossIdx % BOSS_ORDER.length]; bossIdx++; const d = BOSS_DEFS[key]; let spot = null;
  for (let k = 0; k < 40 && !spot; k++) { const D = pick(DIST); const b = pick(D.blocks); const x = b.bx0 - 1.5, z = b.bz0 - 1.5; const dd = Math.hypot(x - P.pos.x, z - P.pos.z); if (dd > 150 && dd < 380 && !boxAt(x, 1, z, 0.5)) spot = new V3(x, 0, z); }
  if (!spot) return;
  const c = { pos: spot, enemies: [], done: false, beam: null, engaged: false, label: d.name, boss: key };
  c.enemies.push(spawnBoss(key, spot.clone(), c)); for (let i = 0; i < 2; i++) c.enemies.push(spawnEnemy(rng() < 0.5 ? 'brawler' : 'gunner', spot.clone().add(new V3(rr(-6, 6), 0, rr(-6, 6))), c));
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 400, 12, 1, true).translate(0, 200, 0), new THREE.MeshBasicMaterial({ color: d.glow, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.copy(spot); scene.add(beam); c.beam = beam; crimes.push(c);
  ui.notice(`${d.name} is tearing up the streets · ${Math.round(spot.distanceTo(P.pos))} m`); ui.addMarker(c); sfx.od();
}
function bossShot(e, speed, dmg, color, home) { const m = makeShotMesh(color, home ? 0.3 : 0.16); const from = e.pos.clone().add(new V3(0, 1.5 * (e.bscale || 1), 0)); shots.push({ pos: from, vel: tB.copy(P.pos).add(tC.set(0, 1.1, 0)).sub(from).setLength(speed).clone(), life: home ? 5 : 2.2, dmg, owner: e, mesh: m, home }); }
function ringWarn(e, red) { e.ring.visible = true; e.ring.material.color.setHex(red ? 0xff3344 : 0xffd23a); e.ring.material.opacity = 0.6 + 0.4 * Math.sin(e.bt * 20); e.ring.position.y = 2.6 * (e.bscale || 1); }
function playerGrounded() { return P.mode === 'ground' || P.pos.y < 1; }
function updateBoss(e, dt, i) {
  const inst = e.inst;
  if (e.decoy) { // Hex's decoys: walk around, never attack, burst on any hit
    if (!e.alive) { scene.remove(inst.group); enemies.splice(i, 1); return true; }
    tA.subVectors(P.pos, e.pos).setY(0); e.yaw = Math.atan2(tA.x, tA.z); e.pos.addScaledVector(tA.normalize(), Math.sin(e.t + i) * 1.5 * dt);
    inst.group.position.copy(e.pos); inst.group.rotation.y = e.yaw; playAct(inst, 'walk', 0.2); inst.mixer.update(dt); updateAccessories(e); return true;
  }
  if (!e.boss) return false;
  const d = BOSS_DEFS[e.boss]; e.bt += dt; e.bcd -= dt; e.bstun = (e.bstun || 0) - dt;
  if (!e.alive) { e.gone += dt; if (e.boss === 'kite' && e.pos.y > 0) { e.pos.y = Math.max(supportHeight(e.pos.x, e.pos.z, e.pos.y), e.pos.y - 14 * dt); inst.group.rotation.x = Math.min(1.4, inst.group.rotation.x + dt * 2); }
    inst.group.position.copy(e.pos); inst.mixer.update(dt); updateAccessories(e); if (e.gone > 8) { scene.remove(inst.group); scene.remove(e.acc.g); enemies.splice(i, 1); } return true; }
  const toP = tA.subVectors(P.pos, e.pos); const flat = tB.copy(toP).setY(0); const dist = flat.length(); const dir = flat.lengthSq() > 0 ? flat.clone().normalize() : new V3(0, 0, 1);
  const engaged = dist < 70; if (engaged && !e.met) { e.met = true; ui.trick(d.name, d.title, true); }
  const gy = () => supportHeight(e.pos.x, e.pos.z, e.pos.y + 0.6);
  if (e.bstun > 0) { playAct(inst, 'fight_idle', 0.2); e.ring.visible = false; if (Math.random() < dt * 6) fx.spark(e.pos.clone().add(new V3(0, 2.4 * d.scale, 0)), 0xffffaa); }
  else if (!engaged) { playAct(inst, 'fight_idle', 0.3); }
  else if (e.boss === 'bulwark') {
    if (e.bst === 'charge') { e.pos.addScaledVector(e.cdir, 24 * dt); const r = collide(e.pos, tC.copy(e.cdir).multiplyScalar(24)); e.pos.y = gy(); playAct(inst, 'run', 0.1, { speed: 1.6 });
      if (Math.random() < dt * 20) fx.dust(e.pos, 6);
      if (e.pos.distanceTo(P.pos) < 2.4 * d.scale && !P.dead) { if (hurtPlayer(30, e.pos)) { P.vel.copy(e.cdir).multiplyScalar(20).addScaledVector(UP, 9); P.mode = 'air'; } e.bst = 'walk'; e.bcd = 2.5; }
      else if (r.wall) { e.bst = 'walk'; e.bstun = 3.5; e.bcd = 4; shake = 0.8; sfx.carHit(); addTrick('Bulwark stunned', 25, true); fx.burst(e.pos.clone().add(new V3(0, 2, 0)), 0xffd9a0, 3); }
      else if (e.bt > 2) { e.bst = 'walk'; e.bcd = 2; } }
    else if (e.bst === 'windCharge' || e.bst === 'windSlam') { ringWarn(e, true); e.yaw = Math.atan2(dir.x, dir.z); if (e.bt > (e.bst === 'windCharge' ? 0.9 : 1.0)) { e.ring.visible = false;
        if (e.bst === 'windCharge') { e.bst = 'charge'; e.bt = 0; e.cdir = dir.clone(); }
        else { e.bst = 'walk'; e.bcd = 3; novas.push({ pos: e.pos.clone(), r: 0, max: 8, col: 0xffa040, dmg: 24, owner: e, mesh: novaMesh(0xffa040) }); shake = 0.6; sfx.carHit(); } } }
    else { e.yaw = Math.atan2(dir.x, dir.z); const mv = dist > 3.5 ? 1 : 0; e.pos.addScaledVector(dir, mv * d.speed * dt); collide(e.pos, tC.copy(dir).multiplyScalar(d.speed)); e.pos.y = gy(); playAct(inst, mv ? 'walk' : 'fight_idle', 0.2, { speed: 0.8 });
      if (e.bcd <= 0) { if (dist < 5) { e.bst = 'windSlam'; e.bt = 0; playAct(inst, 'fight', 0.1, { restart: true, speed: 0.7 }); } else if (dist < 40) { e.bst = 'windCharge'; e.bt = 0; } } }
  } else if (e.boss === 'overload') {
    e.yaw = Math.atan2(dir.x, dir.z);
    if (e.bst === 'windBolt') { ringWarn(e, false); if (e.bt > 0.6) { e.ring.visible = false; bossShot(e, 46, d.dmg, 0x7fd8ff); sfx.shot(); e.bst = 'move'; e.bcd = 1.4; e.volley = (e.volley || 0) + 1; } }
    else if (e.bst === 'windNova') { ringWarn(e, true); if (e.bt > 1.1) { e.ring.visible = false; novas.push({ pos: e.pos.clone(), r: 0, max: 11, col: 0x37b8ff, dmg: 20, owner: e, mesh: novaMesh(0x37b8ff) }); e.bst = 'move'; e.bcd = 1.5; sfx.od(); } }
    else { const want = dist < 10 ? -1 : dist > 20 ? 1 : 0; tC.set(-dir.z, 0, dir.x); e.pos.addScaledVector(dir, want * d.speed * dt).addScaledVector(tC, Math.sin(e.bt * 0.8) * 3 * dt); collide(e.pos, tD.set(0, 0, 0)); e.pos.y = gy(); playAct(inst, want ? 'walk' : 'fight_idle', 0.2);
      if (dist < 4.5 && e.bcd < 0.8) { const side = tC.set(-dir.z, 0, dir.x).multiplyScalar(rng() < 0.5 ? 10 : -10); fx.burst(e.pos.clone().add(new V3(0, 1, 0)), 0x37b8ff, 2); e.pos.add(side); e.pos.y = gy(); e.bcd = 1; }
      else if (e.bcd <= 0 && dist < 45) { if ((e.volley || 0) >= 3 && dist < 14) { e.bst = 'windNova'; e.volley = 0; } else e.bst = 'windBolt'; e.bt = 0; playAct(inst, 'fight', 0.1, { restart: true }); } }
    if (Math.random() < dt * 8) fx.spark(e.pos.clone().add(new V3(rr(-0.4, 0.4), rr(0.8, 2), rr(-0.4, 0.4))), 0x7fd8ff);
  } else if (e.boss === 'kite') {
    if (e.down > 0) { e.down -= dt; e.pos.y = Math.max(gy(), e.pos.y - 20 * dt); playAct(inst, 'idle', 0.2); if (e.down <= 0) { e.bst = 'fly'; ui.trick('Kite is airborne', ''); } }
    else if (e.bst === 'dive') { e.pos.addScaledVector(e.cdir, 32 * dt); if (e.pos.distanceTo(P.pos) < 2.5 && !P.dead) { hurtPlayer(d.dmg, e.pos); e.bst = 'fly'; e.bcd = 3; } else if (e.pos.y <= gy() + 0.5 || e.bt > 1.6) { e.pos.y = Math.max(e.pos.y, gy()); e.down = 2.8; e.bstun = 2.8; addTrick('Kite grounded', 15); e.bst = 'fly'; e.bcd = 3; shake = 0.4; } }
    else if (e.bst === 'windDive') { ringWarn(e, true); e.yaw = Math.atan2(dir.x, dir.z); if (e.bt > 0.8) { e.ring.visible = false; e.bst = 'dive'; e.bt = 0; e.cdir = tC.subVectors(P.pos.clone().add(new V3(0, 1, 0)), e.pos).normalize().clone(); } }
    else { e.ang += dt * 0.5; const R = 18; const tx = P.pos.x + Math.cos(e.ang) * R, tz = P.pos.z + Math.sin(e.ang) * R; const ty = Math.max(P.pos.y, gy()) + 14;
      e.pos.x = damp(e.pos.x, tx, 1.2, dt); e.pos.z = damp(e.pos.z, tz, 1.2, dt); e.pos.y = damp(e.pos.y, ty, 1.5, dt); e.yaw = Math.atan2(dir.x, dir.z); playAct(inst, 'idle', 0.3);
      e.mineT = (e.mineT || 2) - dt; if (e.mineT <= 0 && engaged) { e.mineT = 2.6; const mm = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), glowMat(0xffe04a)); mm.position.copy(e.pos); scene.add(mm); mines.push({ mesh: mm, vy: 0, t: 0, armed: false }); }
      if (e.bcd <= 0 && engaged) { e.bst = 'windDive'; e.bt = 0; } }
    if (e.yanked === 'pull' || e.air) { e.air = false; e.yanked = null; e.down = 3; e.bstun = 3; addTrick('Kite pulled down', 20, true); }
    inst.group.rotation.x = e.bst === 'dive' ? 0.9 : e.down > 0 ? 0 : 0.25;
  } else if (e.boss === 'hex') {
    e.yaw = Math.atan2(dir.x, dir.z);
    const frac = e.hp / d.hp; if (!e.split1 && frac < 0.67) { e.split1 = true; hexSplit(e); } if (!e.split2 && frac < 0.34) { e.split2 = true; hexSplit(e); }
    if (e.bst === 'windOrbs') { ringWarn(e, false); if (e.bt > 0.7) { e.ring.visible = false; for (let k = 0; k < 3; k++) setTimeout(() => { if (e.alive) bossShot(e, 16, d.dmg, 0xc06bff, true); }, k * 220); e.bst = 'move'; e.bcd = 2.6; } }
    else { const want = dist < 9 ? -1 : dist > 17 ? 1 : 0; e.pos.addScaledVector(dir, want * d.speed * dt); collide(e.pos, tD.set(0, 0, 0)); e.pos.y = gy(); playAct(inst, want ? 'walk' : 'fight_idle', 0.2);
      if (e.bcd <= 0 && dist < 40) { e.bst = 'windOrbs'; e.bt = 0; playAct(inst, 'fight', 0.1, { restart: true }); } }
    if (e.hits >= 3) { e.hits = 0; hexTeleport(e); }
    if (Math.random() < dt * 10) fx.spark(e.pos.clone().add(new V3(rr(-0.5, 0.5), rr(0.2, 1.6), rr(-0.5, 0.5))), 0xc06bff);
  }
  inst.group.position.copy(e.pos); inst.group.rotation.y = damp(inst.group.rotation.y, e.yaw, 8, dt);
  inst.mixer.update(dt); updateAccessories(e); return true;
}
function novaMesh(c) { const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); scene.add(m); return m; }
function hexSplit(e) { fx.burst(e.pos.clone().add(new V3(0, 1, 0)), 0xc06bff, 4); for (let k = 0; k < 2; k++) { const dd = spawnEnemy('decoy', e.pos.clone().add(new V3(rr(-6, 6), 0, rr(-6, 6))), e.crime); dd.decoy = true; dd.bar.visible = false; tintInst(dd.inst, BOSS_DEFS.hex.tint, BOSS_DEFS.hex.glow); dd.acc = makeAccessories('hex', BOSS_DEFS.hex); } hexTeleport(e); ui.trick('Which one is real?', ''); }
function hexTeleport(e) { fx.burst(e.pos.clone().add(new V3(0, 1, 0)), 0x8a40c0, 3); const a = rr(0, 6.28); e.pos.x = P.pos.x + Math.cos(a) * 13; e.pos.z = P.pos.z + Math.sin(a) * 13; e.pos.y = supportHeight(e.pos.x, e.pos.z, P.pos.y + 2); fx.burst(e.pos.clone().add(new V3(0, 1, 0)), 0xc06bff, 3); sfx.whoosh(1.2); }
function updateBossFX(dt) {
  for (let i = mines.length - 1; i >= 0; i--) { const m = mines[i]; m.t += dt; const g = supportHeight(m.mesh.position.x, m.mesh.position.z, m.mesh.position.y + 0.5);
    if (m.mesh.position.y > g + 0.35) { m.vy -= 25 * dt; m.mesh.position.y = Math.max(g + 0.35, m.mesh.position.y + m.vy * dt); } else if (!m.armed) { m.armed = true; m.t = 0; }
    if (m.armed) { m.mesh.material.emissiveIntensity = Math.sin(m.t * 18) > 0 ? 4 : 0.5; if (m.t > 1.3) { fx.burst(m.mesh.position.clone(), 0xffb040, 4); sfx.boom(); if (m.mesh.position.distanceTo(P.pos) < 4.5) hurtPlayer(22, m.mesh.position); scene.remove(m.mesh); mines.splice(i, 1); } } }
  for (let i = novas.length - 1; i >= 0; i--) { const n = novas[i]; const prev = n.r; n.r += dt * 16; n.mesh.position.copy(n.pos).add(tA.set(0, 0.3, 0)); n.mesh.scale.setScalar(Math.max(0.01, n.r)); n.mesh.material.opacity = 0.85 * (1 - n.r / n.max);
    const pd = Math.hypot(P.pos.x - n.pos.x, P.pos.z - n.pos.z); if (!n.hit && pd > prev - 0.6 && pd < n.r + 0.6 && P.pos.y < n.pos.y + 1.4 && playerGrounded()) { n.hit = true; hurtPlayer(n.dmg, n.pos); }
    if (n.r >= n.max) { scene.remove(n.mesh); novas.splice(i, 1); } }
  for (const s of shots) if (s.home && !s.deflected) { tA.copy(P.pos).add(tB.set(0, 1.1, 0)).sub(s.pos).setLength(16); s.vel.lerp(tA, 1 - Math.exp(-2 * dt)); }
  ui.bossBar(activeBoss && activeBoss.alive && activeBoss.pos.distanceTo(P.pos) < 90 ? activeBoss : null);
}
function bossDefeated(e) { const d = BOSS_DEFS[e.boss]; gainXP(600); ui.notice(`${d.name} defeated · +600 XP`, true); ui.trick(d.name + ' down', '+600', true); slowmo(0.3, 1.2); sfx.level(); for (const o of enemies) if (o.decoy && o.alive) { o.alive = false; fx.burst(o.pos.clone().add(new V3(0, 1, 0)), 0xc06bff, 2); } if (activeBoss === e) activeBoss = null; }
