// ================= PLAYER =================
const GRAV = 38;
const WATER_Y = -1.5, SWIM_Y = WATER_Y - 1.0;
const P = {
  pos: new V3(), vel: new V3(), mode: 'air', ropes: { L: null, R: null }, pending: { L: null, R: null }, glide: false, dive: false, zip: null, sling: null,
  wallN: new V3(), facing: new V3(0, 0, -1), hp: 100, focus: 0, od: 0, invuln: 0, parryT: -9, parryCD: 0, dodgeT: 0, jumpCharge: -1,
  trick: null, airT: 0, landT: 0, loop: false, loopAng: 0, combo: 0, comboT: 0, xp: 0, level: 1, sp: 3, skills: {},
  zipCD: 0, slingCD: 0, atk: null, atkCD: 0, comboIdx: 0, comboWin: 0, lunge: null, act: null, lastHurt: 0, dead: false, inUp: false, inTun: false, runPh: 0, prevVel: new V3(),
};
try { const sv = JSON.parse(lsGet('webline.save') || 'null'); if (sv) { P.xp = sv.xp || 0; P.level = sv.level || 1; P.sp = sv.sp ?? 3; P.skills = sv.skills || {}; } } catch (e) { }
const saveProgress = () => lsSet('webline.save', JSON.stringify({ xp: P.xp, level: P.level, sp: P.sp, skills: P.skills }));
const SK = id => !!P.skills[id];
const keys = {}; const joy = { x: 0, y: 0, on: false }; let yaw = -0.69, pitch = -0.08; let lastLook = 0, gameTime = 0;
const camF = new V3(), camR = new V3(), camFH = new V3(), wish = new V3();
let playing = false, paused = false, timeScale = 1, slowT = 0, slowTarget = 1, shake = 0;

function updateCamVectors() {
  camF.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  camFH.set(-Math.sin(yaw), 0, -Math.cos(yaw)); camR.set(Math.cos(yaw), 0, -Math.sin(yaw));
  wish.set(0, 0, 0);
  if (keys.KeyW) wish.add(camFH); if (keys.KeyS) wish.sub(camFH); if (keys.KeyD) wish.add(camR); if (keys.KeyA) wish.sub(camR);
  if (joy.on) { wish.addScaledVector(camFH, -joy.y).addScaledVector(camR, joy.x); }
  if (wish.lengthSq() > 0) wish.normalize();
}
function slowmo(scale, dur) { slowTarget = scale; slowT = dur; }

// ---------- webs (visual) ----------
const webMat = new THREE.MeshBasicMaterial({ color: 0xf4f4f0, transparent: true, opacity: 0.95 });
const webGeo = new THREE.CylinderGeometry(0.022, 0.022, 1, 5, 1, true).translate(0, 0.5, 0);
const WEB_SEG = 12;
function makeWebLine() { const segs = []; for (let i = 0; i < WEB_SEG; i++) { const m = new THREE.Mesh(webGeo, webMat); m.frustumCulled = false; m.visible = false; scene.add(m); segs.push(m); } const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new Array(WEB_SEG + 1).fill(0).map(() => new V3())), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); l.frustumCulled = false; l.visible = false; scene.add(l); return { segs, l, t: 0 }; }
const webVis = { L: makeWebLine(), R: makeWebLine(), S1: makeWebLine(), S2: makeWebLine(), Z: makeWebLine() };
const splatTex = (() => { const c = makeCanvas(128, 128), g = c.getContext('2d'); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; g.translate(64, 64); for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(0, 0); g.lineTo(58, 0); g.stroke(); } for (let r = 12; r < 60; r += 12) { g.beginPath(); for (let i = 0; i <= 8; i++) { const a = i * Math.PI / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); } return canvasTex(c); })();
const splats = []; for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: splatTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); m.visible = false; scene.add(m); splats.push(m); }
let splatI = 0;
function addSplat(p, n) { const m = splats[splatI++ % splats.length]; m.visible = true; m.position.copy(p).addScaledVector(n, 0.05); m.lookAt(tA.copy(p).add(n)); m.userData.t = 6; }
const _wp = []; for (let i = 0; i <= WEB_SEG; i++) _wp.push(new V3());
const ROPE_N = WEB_SEG + 1;
function makeRope() { const r = { w: makeWebLine(), p: [], o: [], st: 'idle', life: 0, hand: 'L', anchor: new V3(), thick: 1 }; for (let i = 0; i < ROPE_N; i++) { r.p.push(new V3()); r.o.push(new V3()); } return r; }
const ropePool = []; for (let i = 0; i < 8; i++) ropePool.push(makeRope());
const handRope = { L: null, R: null };
function ropeFor(h, anchor) {
  let r = ropePool.find(x => x.st === 'idle'); if (!r) r = ropePool.filter(x => x.st === 'loose').sort((a, b) => a.life - b.life)[0] || ropePool[0];
  const hp = handWorld(h, new V3()); r.st = 'fly'; r.hand = h; r.anchor.copy(anchor); r.life = 0; r.thick = 1;
  for (let i = 0; i < ROPE_N; i++) { r.p[i].copy(hp); r.o[i].copy(hp).addScaledVector(P.vel, -1 / 60); }
  handRope[h] = r; return r;
}
function loosenRope(h) { const r = handRope[h]; if (!r) return; r.st = r.st === 'fly' ? 'drop' : 'loose'; r.life = r.st === 'drop' ? 1.2 : 2.6; handRope[h] = null; }
function drawPts(w, pts, thick) {
  const pa = w.l.geometry.attributes.position; for (let i = 0; i < ROPE_N; i++) pa.setXYZ(i, pts[i].x, pts[i].y, pts[i].z); pa.needsUpdate = true; w.l.visible = true;
  for (let i = 0; i < WEB_SEG; i++) { const m = w.segs[i]; tA.subVectors(pts[i + 1], pts[i]); const L = tA.length(); m.visible = L > 0.001; if (!m.visible) continue; m.position.copy(pts[i]); m.quaternion.setFromUnitVectors(UP, tA.multiplyScalar(1 / L)); m.scale.set(thick, L, thick); }
}
function hideRope(r) { for (const m of r.w.segs) m.visible = false; r.w.l.visible = false; }
const _ra = new V3(), _rb = new V3(), _rd = new V3();
function updateRopes(dt) {
  dt = Math.min(dt, 1 / 30); const g = -16 * dt * dt;
  for (const r of ropePool) {
    if (r.st === 'idle') continue;
    const pinA = r.st === 'fly' || r.st === 'attached', pinB = r.st !== 'drop' && r.st !== 'fly';
    let rest;
    if (pinA) handWorld(r.hand, _ra);
    if (r.st === 'fly') { const pw = P.pending[r.hand]; const frac = pw ? Math.min(1, pw.t * WEB_SPEED / pw.dist) : 1; _rb.lerpVectors(_ra, r.anchor, frac); rest = _ra.distanceTo(_rb) * 1.08 / (ROPE_N - 1); }
    else if (r.st === 'attached') { const rope = P.ropes[r.hand]; const dist = _ra.distanceTo(r.anchor); const taut = rope && P.pos.distanceTo(rope.pivot) >= rope.len - 0.15; rest = dist * (taut ? 1.0 : 1.1) / (ROPE_N - 1); r.rest = rest; }
    else { rest = r.rest || 1; r.life -= dt; r.thick = Math.max(0.05, Math.min(1, r.life / 1.2)); if (r.life <= 0) { r.st = 'idle'; hideRope(r); continue; } }
    // verlet integration
    for (let i = 0; i < ROPE_N; i++) { const p = r.p[i], o = r.o[i]; _rd.subVectors(p, o).multiplyScalar(0.985); o.copy(p); p.add(_rd); p.y += g; }
    for (let it = 0; it < 10; it++) {
      if (pinA) r.p[0].copy(_ra);
      if (r.st === 'fly') r.p[ROPE_N - 1].copy(_rb); else if (pinB) r.p[ROPE_N - 1].copy(r.anchor);
      for (let i = 0; i < ROPE_N - 1; i++) { const a = r.p[i], b = r.p[i + 1]; _rd.subVectors(b, a); const L = _rd.length() || 1e-6; const diff = (L - rest) / L * 0.5; a.addScaledVector(_rd, diff); b.addScaledVector(_rd, -diff); }
    }
    if (pinA) r.p[0].copy(_ra); if (r.st === 'fly') r.p[ROPE_N - 1].copy(_rb); else if (pinB) r.p[ROPE_N - 1].copy(r.anchor);
    drawPts(r.w, r.p, r.thick);
  }
}
// frac: how far the web has travelled (0..1); sag: metres of droop at the middle
function drawWeb(w, a, b, frac = 1, sag = 0) {
  if (!a) { for (const m of w.segs) m.visible = false; w.l.visible = false; return; }
  const pa = w.l.geometry.attributes.position; const wob = frac < 1 ? 0.25 : 0;
  for (let i = 0; i <= WEB_SEG; i++) { const t = i / WEB_SEG * frac; const p = _wp[i].lerpVectors(a, b, t); p.y -= sag * 4 * t * (1 - t) + wob * Math.sin(t * 20 + gameTime * 40) * t; pa.setXYZ(i, p.x, p.y, p.z); }
  pa.needsUpdate = true; w.l.visible = true;
  for (let i = 0; i < WEB_SEG; i++) { const m = w.segs[i]; const p0 = _wp[i], p1 = _wp[i + 1]; tA.subVectors(p1, p0); const L = tA.length(); m.visible = L > 0.001; if (!m.visible) continue; m.position.copy(p0); m.quaternion.setFromUnitVectors(UP, tA.multiplyScalar(1 / L)); m.scale.set(1, L, 1); }
}

// ---------- collision ----------
const PR = 0.35, PH = 1.8;
let standCar = null;
function collide(pos, vel, isPlayer) {
  let ground = false, wall = null, ceil = false; if (isPlayer) standCar = null;
  const hb = b => {
    if (pos.x + PR <= b.x0 || pos.x - PR >= b.x1 || pos.z + PR <= b.z0 || pos.z - PR >= b.z1 || pos.y + PH <= b.y0 || pos.y >= b.y1) return;
    const pxp = b.x1 - (pos.x - PR), pxn = (pos.x + PR) - b.x0, pzp = b.z1 - (pos.z - PR), pzn = (pos.z + PR) - b.z0, pyp = b.y1 - pos.y, pyn = (pos.y + PH) - b.y0;
    let m = pyp, ax = 1;
    if (!(pyp < 0.6 && vel.y <= 8)) { if (pxp < m) { m = pxp; ax = 2; } if (pxn < m) { m = pxn; ax = 3; } if (pzp < m) { m = pzp; ax = 4; } if (pzn < m) { m = pzn; ax = 5; } if (pyn < m) { m = pyn; ax = 6; } }
    switch (ax) {
      case 1: pos.y += pyp; if (vel.y < 0) vel.y = 0; ground = true; break;
      case 2: pos.x += pxp; wall = new V3(1, 0, 0); break; case 3: pos.x -= pxn; wall = new V3(-1, 0, 0); break;
      case 4: pos.z += pzp; wall = new V3(0, 0, 1); break; case 5: pos.z -= pzn; wall = new V3(0, 0, -1); break;
      case 6: pos.y -= pyn; if (vel.y > 0) vel.y = 0; ceil = true; break;
    }
    if (wall) { const vn = vel.dot(wall); if (vn < 0) vel.addScaledVector(wall, -vn); }
    if (ax === 1 && (b.car || b.train) && isPlayer) standCar = b;
  };
  forBoxesNear(pos.x - 1.5, pos.z - 1.5, pos.x + 1.5, pos.z + 1.5, hb);
  for (const b of carBoxes) if (Math.abs(b.x0 - pos.x) < 14 && Math.abs(b.z0 - pos.z) < 14) { hb(b); }
  return { ground, wall, ceil };
}
function touchingWall(pos, N) { let hit = false; const px = pos.x - N.x * 0.25, pz = pos.z - N.z * 0.25; forBoxesNear(px - 1, pz - 1, px + 1, pz + 1, b => { if (!hit && px + PR > b.x0 && px - PR < b.x1 && pz + PR > b.z0 && pz - PR < b.z1 && pos.y + 1.2 > b.y0 && pos.y + 0.3 < b.y1) hit = true; }); return hit; }
function moveAndCollide(dt) {
  const n = Math.max(1, Math.ceil(P.vel.length() * dt / 0.28)); const h = dt / n; let g = false, w = null;
  for (let i = 0; i < n; i++) {
    P.pos.addScaledVector(P.vel, h); ropeConstraint(h);
    const r = collide(P.pos, P.vel, true); if (r.ground) g = true; if (r.wall) w = r.wall;
    if (standCar) { P.pos.x += standCar.vx * h; P.pos.z += standCar.vz * h; }
    if (P.pos.y < 0 && onLand(P.pos.x, P.pos.z)) { P.pos.y = 0; if (P.vel.y < 0) P.vel.y = 0; g = true; }
  }
  return { ground: g, wall: w };
}

// ---------- swinging ----------
const assist = () => S.assist / 100;
function findAnchor(side) {
  const sp = P.vel.length(); const f = tA.copy(camFH);
  if (sp > 10) { tB.set(P.vel.x, 0, P.vel.z); if (tB.lengthSq() > 4) f.lerp(tB.normalize(), 0.4).normalize(); }
  const right = tC.set(-f.z, 0, f.x); const o = P.pos.clone().add(new V3(0, 1.5, 0));
  const lookUp = clamp(pitch, -0.2, 0.9);
  const cands = [[1, 1.1, 0.45], [0.8, 1.4, 0.6], [1.3, 0.9, 0.35], [0.6, 1.7, 0.3], [1.1, 1.25, 0.85], [1.5, 1.2, 0.2], [0.9, 0.8, 0.6], [0.45, 1.3, 0.9], [1.2, 1.6, 0.1]];
  let best = null, bs = -1e9; const maxR = 90 + assist() * 40;
  for (const [a, b, c] of cands) {
    const d = new V3().copy(f).multiplyScalar(a).addScaledVector(UP, b + lookUp * 0.6).addScaledVector(right, side * c).normalize();
    const hit = raycast(o, d, maxR); if (!hit || hit.point.y < o.y + 3) continue;
    const s = -Math.abs(hit.t - 40) * 0.5 + Math.min(hit.point.y - o.y, 45) * 0.35 + d.dot(f) * 10;
    if (s > bs) { bs = s; best = hit; }
  }
  if (!best && assist() >= 0.6) { const d = new V3().copy(f).addScaledVector(UP, 1.2).addScaledVector(right, side * 0.4).normalize(); best = { point: o.clone().addScaledVector(d, 42), normal: d.clone().negate(), t: 42, virtual: true }; }
  return best;
}
function fireWeb(hand) {
  if (P.dead || P.sling) return;
  if (P.mode === 'ground' && nearEnemy(9)) { if (hand === 'L') melee(); else webShot(); return; }
  const side = hand === 'L' ? -1 : 1; const hit = findAnchor(side);
  if (!hit) { sfx.thwip(0.5); return; }
  if (P.mode === 'ground' || P.mode === 'swim') { P.vel.y = P.mode === 'swim' ? 12 : 9; P.pos.y += 0.2; P.mode = 'air'; }
  if (P.mode === 'wall') { P.vel.addScaledVector(P.wallN, 7).addScaledVector(UP, 6); P.mode = 'air'; }
  if (P.glide) setGlide(false);
  P.zip = null;
  loosenRope(hand); P.pending[hand] = { anchor: hit.point.clone(), normal: hit.normal.clone(), virtual: !!hit.virtual, t: 0, dist: hit.point.distanceTo(P.pos) }; ropeFor(hand, hit.point);
  P.ropes[hand] = null; sfx.thwip(1);
}
const WEB_SPEED = 280;
function updatePending(dt) {
  for (const h of ['L', 'R']) {
    const pw = P.pending[h]; if (!pw) continue; pw.t += dt;
    if (pw.t * WEB_SPEED >= pw.dist) { P.pending[h] = null;
      const f = new V3(P.vel.x, 0, P.vel.z); if (f.lengthSq() < 36) f.copy(camFH); else f.normalize(); f.lerp(camFH, 0.5).normalize();
      const rel = new V3().subVectors(pw.anchor, P.pos); const along = Math.max(rel.x * f.x + rel.z * f.z, 8);
      const pivot = P.pos.clone().addScaledVector(f, along); pivot.y = Math.max(pw.anchor.y, P.pos.y + 4);
      const d = P.pos.distanceTo(pivot); P.ropes[h] = { anchor: pw.anchor, pivot, len: Math.max(3, d), t: 0 }; if (handRope[h]) handRope[h].st = 'attached'; if (!pw.virtual) addSplat(pw.anchor, pw.normal); P.dive = false; sfx.thwip(0.6); }
  }
}
function releaseWeb(hand) {
  P.pending[hand] = null; loosenRope(hand);
  const r = P.ropes[hand]; if (!r) return; P.ropes[hand] = null;
  if (!P.ropes.L && !P.ropes.R && P.mode === 'air') {
    const v = P.vel, sp = v.length();
    if (sp > 10 && v.y > -4) {
      const d = tA.subVectors(P.pos, r.pivot || r.anchor).normalize();
      const perfect = v.y > 2 && d.y > -0.85 && d.y < -0.2;
      const boost = (1.5 + (SK('swing2') ? 1.5 : 0) + (perfect ? 2 : 0)) * (0.6 + 0.6 * assist());
      v.addScaledVector(tB.copy(v).normalize(), boost); v.y += perfect ? 3.5 : 2;
      P.rel = { t: 0, type: pick(['arc', 'super', 'cork', 'backflip', 'frontflip', 'sideflip', 'backflip']), dur: 0.8 };
      if (perfect) addTrick('Perfect Release', 15);
    }
    P.loop = false; P.loopAng = 0;
  }
}
function ropeConstraint(h) {
  for (const k of ['L', 'R']) {
    const r = P.ropes[k]; if (!r) continue;
    tD.subVectors(P.pos, r.pivot); const dist = tD.length(); tD.multiplyScalar(1 / dist); const vr = P.vel.dot(tD);
    if (P.loop) { P.pos.copy(r.pivot).addScaledVector(tD, r.len); P.vel.addScaledVector(tD, -vr); continue; }
    const stretch = dist - r.len; if (stretch <= 0) continue;
    // elastic web: spring + damping, with a hard limit so it never over-stretches
    P.vel.addScaledVector(tD, -(stretch * 70 + Math.max(vr, 0) * 9) * h);
    const maxS = 0.25 + r.len * 0.045;
    if (stretch > maxS) { P.pos.copy(r.pivot).addScaledVector(tD, r.len + maxS); if (vr > 0) P.vel.addScaledVector(tD, -vr); }
  }
}
function swingForces(dt) {
  const as = assist(); let any = false;
  for (const h of ['L', 'R']) {
    const r = P.ropes[h]; if (!r) continue; any = true; r.t += dt;
    if (as > 0.3) { const ground = supportHeight(P.pos.x, P.pos.z, P.pos.y + 0.5); const bottom = r.pivot.y - r.len; const clear = ground + 1.2 + as; if (bottom < clear && P.vel.y < 0) r.len = Math.max(3, r.len - Math.min(clear - bottom, 9 * as * dt)); }
    // steer: swing the hidden pivot around toward where the camera looks
    { const ox = r.pivot.x - P.pos.x, oz = r.pivot.z - P.pos.z, ol = Math.hypot(ox, oz);
      if (ol > 1 && ox * P.vel.x + oz * P.vel.z > 0) { const cur = Math.atan2(ox, oz), want = Math.atan2(camFH.x, camFH.z); let dA = want - cur; dA = Math.atan2(Math.sin(dA), Math.cos(dA)); const rot = clamp(dA, -1.1 * dt, 1.1 * dt) * (0.5 + 0.5 * as); const na = cur + rot; r.pivot.x = P.pos.x + Math.sin(na) * ol; r.pivot.z = P.pos.z + Math.cos(na) * ol; } }
    tD.subVectors(P.pos, r.pivot).normalize();
    const pump = tA.copy(wish); if (pump.lengthSq() < 0.01) { pump.set(P.vel.x, 0, P.vel.z); if (pump.lengthSq() > 1) pump.normalize().multiplyScalar(0.55 * as); }
    pump.addScaledVector(tD, -pump.dot(tD));
    P.vel.addScaledVector(pump, (10 + (SK('swing1') ? 3 : 0)) * (0.6 + 0.6 * as) * dt * (P.od > 0 ? 1.1 : 1));
  }
  const shift = keys.ShiftLeft || keys.ShiftRight; const sp = P.vel.length();
  if (any && shift && sp > 20) {
    if (!P.loop) { P.loop = true; P.loopAng = 0; P.loopPrev = null; }
    P.vel.addScaledVector(tA.copy(P.vel).normalize(), 9 * dt);
    const r = P.ropes.L || P.ropes.R; const rv = tB.subVectors(P.pos, r.pivot).normalize();
    if (P.loopPrev) { P.loopAng += Math.acos(clamp(rv.dot(P.loopPrev), -1, 1)); if (P.loopAng > 5.6) { P.loopAng = 0; P.vel.multiplyScalar(SK('loop') ? 1.3 : 1.15); addTrick('Loop-the-Loop', 50, true); slowmo(0.6, 0.25); } }
    P.loopPrev = rv.clone();
  } else if (P.loop) { P.loop = false; P.loopAng = 0; }
  return any;
}

// ---------- traversal actions ----------
function setGlide(on) { if (on === P.glide) return; P.glide = on; if (on) { P.dive = false; sfx.whoosh(0.8); addTrick('Web-Wings', 0); } }
// ---------- perch points: marked spots you can web-zip to and land on ----------
const PERCH = [];
function buildPerches() {
  PERCH.length = 0;
  for (const r of roofTops) { if (r.y < 8 || r.w < 5) continue; const hx = r.w / 2 - 0.3, hz = r.d / 2 - 0.3; for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) PERCH.push({ p: new V3(r.x + sx * hx, r.y + 1.3, r.z + sz * hz), snap: false }); }
  for (const a of antList) PERCH.push({ p: new V3(a[0], a[1] + a[3] + 0.2, a[2]), snap: true });
  for (const w of wtList) PERCH.push({ p: new V3(w[0], w[1] + 8.8, w[2]), snap: true });
  for (const l of lampList) PERCH.push({ p: new V3(l[0], 7.6, l[1]), snap: true });
}
let perchT = null, perchTimer = 0; const _pd = new V3();
function findPerch(dt) {
  perchTimer -= dt; if (perchTimer > 0) return; perchTimer = 0.08;
  if (!PERCH.length) buildPerches();
  if (P.mode === 'swim' || P.dead || P.zip) { perchT = null; return; }
  let best = null, bs = 1e9; const cp = camera.position;
  for (const c of PERCH) {
    _pd.subVectors(c.p, cp); const d = _pd.length(); if (d > 95 || d < 5) continue;
    const dot = _pd.dot(camF) / d; if (dot < 0.985) continue;
    if (c.p.distanceTo(P.pos) < 4) continue;
    const sc = (1 - dot) * 400 + d * 0.02; if (sc < bs) { bs = sc; best = c; }
  }
  if (best && !best.snap) { // settle on the real surface
    const h = raycast(tA.set(best.p.x, best.p.y + 4, best.p.z), tB.set(0, -1, 0), 8); if (h) { best.p.y = h.point.y + 0.05; } best.snap = true;
  }
  if (best) { const o = tA.copy(P.pos); o.y += 1.4; _pd.subVectors(best.p, o); const d = _pd.length(); const h = raycast(o, _pd.normalize(), d - 1.2); if (h) best = null; }
  perchT = best ? best.p : null;
}
function perchZip() {
  if (!perchT || P.zipCD > 0 || P.dead || P.mode === 'swim') return false;
  releaseWeb('L'); releaseWeb('R'); setGlide(false); P.mode = 'air'; P.sling = null; P.trick = null;
  P.zip = { target: perchT.clone(), start: P.pos.clone(), t: 0, perch: true, dur: Math.max(0.35, P.pos.distanceTo(perchT) / 62) };
  webVis.Z.t = 0; addSplat(perchT, UP); P.zipCD = 0.45; sfx.thwip(1.2); return true;
}
function webZip() {
  if (perchZip()) return;
  if (P.zipCD > 0 || P.mode !== 'air' || P.dead) return;
  const o = P.pos.clone().add(new V3(0, 1.4, 0)); const hit = raycast(o, camF, 75);
  releaseWeb('L'); releaseWeb('R'); setGlide(false);
  if (hit) { P.zip = { target: hit.point.clone().addScaledVector(hit.normal, 0.8), n: hit.normal.clone(), t: 0, top: hit.normal.y > 0.5 || hit.box.y1 - hit.point.y < 4 }; if (hit.box && hit.box.y1 - hit.point.y < 6) { P.zip.target.y = hit.box.y1 + 0.5; P.zip.top = true; } webVis.Z.t = 0; addSplat(hit.point, hit.normal); }
  else { P.vel.copy(camF).multiplyScalar(Math.max(30, P.vel.length())); P.vel.y = Math.max(P.vel.y, 5); addTrick('Web Dash', 5); }
  P.zipCD = SK('zip') ? 0.7 : 1.2; sfx.thwip(1.2);
}
function startSling() { if (P.slingCD > 0 || P.dead || P.zip) return; releaseWeb('L'); releaseWeb('R'); setGlide(false); P.sling = { t: 0 }; webVis.S1.t = webVis.S2.t = 0; }
function releaseSling() {
  if (!P.sling) return; const c = clamp(P.sling.t / (SK('sling') ? 0.7 : 1.0), 0.25, 1); P.sling = null;
  P.vel.copy(camF).multiplyScalar((48 + 60 * c) * (SK('sling') ? 1.3 : 1)); P.vel.y += 8; P.mode = 'air'; P.slingCD = 2.2;
  addTrick('Slingshot', Math.round(15 * c), c > 0.95); shake = 0.5 * c; sfx.whoosh(1.4); sfx.thwip(1.4);
}
const TRICKS = { W: ['Front Flip', 'frontflip'], S: ['Backflip', 'backflip'], A: ['Barrel Roll', 'rollL'], D: ['Barrel Roll', 'rollR'], N: ['Starfish Spin', 'starfish'] };
function doTrick() {
  if (P.mode !== 'air' || P.ropes.L || P.ropes.R || P.glide || P.trick || P.zip || P.sling) return;
  const k = keys.KeyW ? 'W' : keys.KeyS ? 'S' : keys.KeyA ? 'A' : keys.KeyD ? 'D' : 'N';
  P.trick = { type: TRICKS[k][1], t: 0, dur: 0.48 }; addTrick(TRICKS[k][0], 12); P.focus = Math.min(100, P.focus + 2); sfx.whoosh(0.6);
}
function addTrick(name, pts, big) {
  if (pts > 0) { P.combo++; P.comboT = 3; const mult = 1 + Math.floor(P.combo / 5) * 0.5; gainXP(Math.round(pts * mult)); }
  ui.trick(name, pts > 0 ? '+' + Math.round(pts * (1 + Math.floor(P.combo / 5) * 0.5)) : '', big);
}
function gainXP(n) {
  P.xp += n; let need = 250 + P.level * 150;
  while (P.xp >= need) { P.xp -= need; P.level++; P.sp++; need = 250 + P.level * 150; ui.notice(`Level ${P.level} · skill point earned · Tab`, true); sfx.level(); }
  saveProgress();
}

// ---------- main step ----------
function enterWall(N) { P.mode = 'wall'; P.wallN.copy(N); P.ropes.L = P.ropes.R = null; setGlide(false); P.zip = null; P.dive = false; P.trick = null; const sp = P.vel.length(); if (sp > 14) { P.vel.addScaledVector(N, -P.vel.dot(N)); P.vel.y = Math.max(P.vel.y, sp * 0.35); P.vel.setLength(Math.min(sp, 40) * 0.85); P.wallRun = 1.2; addTrick('Wall Run', 3); } else { P.vel.set(0, Math.max(0, P.vel.y * 0.3), 0); P.wallRun = 0; } }
function land(impact) {
  P.mode = 'ground'; setGlide(false); P.dive = false; P.zip = null; P.rel = null; if (standCar && standCar.car) carLanding(standCar.car, impact);
  if (P.trick && P.trick.t < P.trick.dur * 0.7) { ui.trick('Bail', ''); P.combo = 0; }
  P.trick = null;
  const fd = S.fall / 100; const thr = 34 + (1 - fd) * 1000;
  if (impact > thr) hurtPlayer((impact - thr) * 2.2 * fd, null, true);
  const hsp = Math.hypot(P.vel.x, P.vel.z);
  if (impact > 12 && hsp > 13 && impact < 45) { P.roll = { t: 0 }; sfx.land(0.5); fx.dust(P.pos, impact * 0.5); }
  else if (impact > 18) { P.landT = 0.42; shake = Math.min(1, impact / 50); civReact(P.pos, 'cheer', 22); fx.dust(P.pos, impact); sfx.land(impact / 40); }
  else sfx.land(0.2);
  if (P.airT > 4) addTrick('Big Air', Math.round(P.airT * 4));
  P.airT = 0;
}
function playerStep(dt) {
  if (P.dead) return;
  P.zipCD -= dt; P.slingCD -= dt; P.invuln -= dt; P.parryCD -= dt; P.atkCD -= dt; P.comboWin -= dt; P.landT -= dt; P.dodgeT -= dt;
  if (P.od > 0) { P.od -= dt; if (P.od <= 0) ui.notice('Overdrive ended'); }
  if (P.comboT > 0 && P.mode !== 'air') { P.comboT -= dt; if (P.comboT <= 0) P.combo = 0; }
  if (P.trick) { P.trick.t += dt; if (P.trick.t >= P.trick.dur) P.trick = null; }
  P.prevVel.copy(P.vel);
  const shift = keys.ShiftLeft || keys.ShiftRight;
  if (P.sling) {
    P.sling.t += dt; P.vel.multiplyScalar(Math.exp(-6 * dt)); if (P.mode === 'air') P.vel.y -= 2 * dt;
    P.pos.addScaledVector(camF, -1.2 * dt * (P.sling.t < 0.8 ? 1 : 0));
    const r = moveAndCollide(dt); if (r.ground && P.mode === 'air') P.mode = 'ground'; return;
  }
  if (P.lunge) {
    const e = P.lunge.e; tA.subVectors(e.pos, P.pos); tA.y = 0; const d = tA.length(); P.lunge.t -= dt;
    if (d < 1.5 || P.lunge.t <= 0) P.lunge = null; else { P.vel.x = tA.x / d * 26; P.vel.z = tA.z / d * 26; }
  }
  if (P.mode === 'ground') {
    const maxS = (shift ? 26 : 13) * (P.od > 0 ? 1.1 : 1) * (P.landT > 0 || P.jumpCharge >= 0 || P.atk ? 0.15 : 1);
    if (!P.lunge) { const a = 60 * dt; P.vel.x += clamp(wish.x * maxS - P.vel.x, -a, a); P.vel.z += clamp(wish.z * maxS - P.vel.z, -a, a); }
    if (P.dodgeT > 0.2) { } // dodge impulse handled in dodge()
    if (P.jumpCharge >= 0) P.jumpCharge += dt;
    P.vel.y -= GRAV * dt;
    const r = moveAndCollide(dt);
    if (!r.ground) { P.mode = 'air'; }
    else if (r.wall && shift && wish.lengthSq() > 0 && wish.dot(r.wall) < -0.5) { enterWall(r.wall); P.vel.y = 6; }
    if (P.vel.x * P.vel.x + P.vel.z * P.vel.z > 0.5) P.facing.set(P.vel.x, 0, P.vel.z).normalize();
  } else if (P.mode === 'swim') {
    const sp = shift ? 7 : 4; const a = 12 * dt;
    P.vel.x += clamp(wish.x * sp - P.vel.x, -a, a); P.vel.z += clamp(wish.z * sp - P.vel.z, -a, a);
    P.vel.y += ((SWIM_Y - P.pos.y) * 6 - P.vel.y * 2.5) * dt;                  // buoyancy holds you at the surface
    P.pos.addScaledVector(P.vel, dt); collide(P.pos, P.vel, true);
    if (onLand(P.pos.x, P.pos.z)) { P.pos.y = 0.05; P.vel.set(P.vel.x * 0.3, 0, P.vel.z * 0.3); P.mode = 'ground'; sfx.whoosh(0.5); }   // climb out onto the seawall
    if (wish.lengthSq() > 0.01) P.facing.lerp(tA.set(wish.x, 0, wish.z), 1 - Math.exp(-5 * dt)).normalize();
    P.swimPh = (P.swimPh || 0) + dt * (wish.lengthSq() > 0.01 ? (shift ? 9 : 6) : 1.5);
    if (wish.lengthSq() > 0.01 && Math.random() < dt * 3) fx.ripple(P.pos);
  } else if (P.mode === 'wall') {
    const N = P.wallN; const up = keys.KeyW ? 1 : keys.KeyS ? -1 : 0;
    const T = tB.set(-N.z, 0, N.x); if (T.dot(camR) < 0) T.negate(); const side = keys.KeyD ? 1 : keys.KeyA ? -1 : 0;
    const sp = (shift ? 1.4 : 1) * (SK('wall') ? 1.3 : 1);
    P.wallRun = Math.max(0, (P.wallRun || 0) - dt);
    if (shift || P.wallRun > 0) { // wall run: sprint up / along the wall and keep momentum
      tC.set(0, up * 30 * sp, 0).addScaledVector(T, side * 27 * sp);
      if (!up && !side) tC.copy(P.vel).multiplyScalar(0.985);
      P.vel.lerp(tC, 1 - Math.exp(-(P.wallRun > 0 ? 1.5 : 5) * dt)); P.vel.addScaledVector(N, -P.vel.dot(N)).addScaledVector(N, -2);
    } else {
      tC.set(0, up * 20 * sp, 0).addScaledVector(T, side * 14 * sp);
      P.vel.lerp(tC, 1 - Math.exp(-10 * dt)); P.vel.addScaledVector(N, -2);
    }
    const r = moveAndCollide(dt);
    if (!touchingWall(P.pos, N)) { P.mode = 'air'; if (up > 0) { P.vel.set(0, 11, 0).addScaledVector(N, -5); addTrick('Vault', 3); } }
    else if (r.ground && up <= 0 && P.pos.y < 0.5) P.mode = 'ground';
    P.facing.copy(N).negate();
  } else { // air
    P.airT += dt; updatePending(dt);
    const swinging = swingForces(dt);
    if (P.zip && P.zip.perch) {
      const z = P.zip; z.t += dt; const k = Math.min(1, z.t / z.dur); const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;   // ease in-out
      const np = tA.lerpVectors(z.start, z.target, e); np.y += Math.sin(k * Math.PI) * Math.min(6, z.start.distanceTo(z.target) * 0.08);  // gentle arc
      P.vel.subVectors(np, P.pos).divideScalar(Math.max(dt, 1e-4)); P.pos.copy(np);
      if (k >= 1) { P.pos.copy(z.target); P.vel.set(0, 0, 0); P.zip = null; P.zipSkip = true; P.mode = 'ground'; P.idleT = 1.3; P.landT = 0; addTrick('Perch', 4); sfx.whoosh && sfx.whoosh(0.4); }
    } else if (P.zip) {
      P.zip.t += dt; tA.subVectors(P.zip.target, P.pos); const d = tA.length();
      P.vel.copy(tA).multiplyScalar(78 / Math.max(d, 0.01));
      if (d < 2.2 || P.zip.t > 1.6) {
        if (P.zip.top) { P.vel.copy(camFH).multiplyScalar(14); P.vel.y = 17; addTrick('Point Launch', 10); }
        else { P.vel.multiplyScalar(0.2); }
        P.zip = null;
      }
    } else if (P.glide) {
      // constant cruise speed: the mouse only steers; tunnels give a temporary push
      const f = tA.copy(camF); f.y = clamp(f.y, -0.75, 0.3); f.normalize();
      const cruise = 42 * (SK('wings1') ? 1.1 : 1); P.tunBoost = Math.max(0, (P.tunBoost || 0) - 6 * dt);
      tB.copy(f).multiplyScalar(cruise + P.tunBoost); tB.y -= 2.2;
      const vy = P.vel.y; P.vel.lerp(tB, 1 - Math.exp(-3 * dt)); if (vy > tB.y) P.vel.y = Math.max(tB.y, vy - 18 * dt);
      const hd = Math.atan2(P.vel.x, P.vel.z); let dy = hd - (P.glideHd ?? hd); dy = Math.atan2(Math.sin(dy), Math.cos(dy)); P.glideHd = hd;
      P.bank = damp(P.bank || 0, clamp(-dy / dt * 0.45, -1.1, 1.1), 5, dt);
    } else {
      let g = GRAV; P.dive = shift && !swinging && P.vel.y < 4; if (P.dive) g *= 1.75;
      P.vel.y -= g * dt;
      if (!swinging) P.vel.addScaledVector(wish, 8 * dt);
      const sp = P.vel.length(); const k = P.dive ? 0.0011 : 0.0016; P.vel.multiplyScalar(1 / (1 + k * sp * dt));
    }
    const up = inUpdraft(P.pos); if (up) { P.vel.y = Math.min(P.vel.y + (P.glide ? 34 : 14) * (SK('wings1') ? 1.35 : 1) * dt, P.glide ? 24 : 12); if (!P.inUp) { ui.trick('Updraft', ''); P.inUp = true; } } else P.inUp = false;
    const tun = P.glide ? inTunnel(P.pos) : null; if (tun) { P.tunBoost = Math.min(30 * (SK('wings2') ? 1.5 : 1), (P.tunBoost || 0) + 40 * dt); if (!P.inTun) { addTrick('Wind Tunnel', 10); P.inTun = true; } } else P.inTun = false;
    if (P.vel.length() > 130) P.vel.setLength(130);
    const r = (P.zip && P.zip.perch) || P.zipSkip ? (P.zipSkip = false, {}) : moveAndCollide(dt);
    if (r.ground && P.prevVel.y <= 0.5) land(-P.prevVel.y);
    else if (r.wall) {
      if ((P.ropes.L || P.ropes.R) && assist() > 0.35) { P.vel.addScaledVector(r.wall, 3); }
      else if (!P.zip || true) { enterWall(r.wall); if (P.zip) P.zip = null; }
    }
    tA.set(P.vel.x, 0, P.vel.z); if (tA.lengthSq() > 1) P.facing.lerp(tA.normalize(), 1 - Math.exp(-6 * dt)).normalize();
  }
  if (P.mode !== 'swim' && P.pos.y < WATER_Y - 0.4 && !onLand(P.pos.x, P.pos.z)) {
    const imp = -P.vel.y; fx.splash(P.pos); P.mode = 'swim'; P.ropes.L = P.ropes.R = null; P.pending.L = P.pending.R = null; setGlide(false); P.zip = null; P.trick = null; P.rel = null; P.dive = false;
    P.vel.multiplyScalar(0.25); P.vel.y = Math.max(-6, -imp * 0.15); if (imp > 25) addTrick('Big Splash', 8); P.airT = 0;
  }
  if (!P.ropes.L && !P.ropes.R) P.loop = false;
}
function jumpRelease() {
  if (P.mode === 'swim') { P.vel.y = 13; P.vel.addScaledVector(P.facing, 4); P.mode = 'air'; fx.splash(P.pos); P.jumpCharge = -1; return; }
  if (P.mode === 'ground' && P.jumpCharge >= 0) { const c = clamp(P.jumpCharge / 0.6, 0, 1); P.vel.y = 12 + 16 * c; P.mode = 'air'; P.pos.y += 0.05; if (c > 0.9) addTrick('Charged Jump', 4); sfx.whoosh(0.4 + c * 0.6); }
  P.jumpCharge = -1;
}
function wallJump() { P.mode = 'air'; P.vel.copy(P.wallN).multiplyScalar(12).addScaledVector(UP, 10).addScaledVector(camFH, 4); sfx.whoosh(0.6); }
function respawn(water) {
  let best = null, bd = 1e9; for (const r of roofTops) { if (r.y < 40 || r.y > 250) continue; const d = Math.hypot(r.x - P.pos.x, r.z - P.pos.z); if (d < bd) { bd = d; best = r; } }
  P.pos.set(best.x, best.y + 0.1, best.z); P.vel.set(0, 0, 0); P.mode = 'ground'; P.ropes.L = P.ropes.R = null; P.pending.L = P.pending.R = null; setGlide(false); P.zip = null; P.sling = null; P.trick = null;
  if (water) ui.notice('Fished out of the harbor');
}

// ---------- hero visual orientation & pose ----------
const heroQ = new Qt(), _m4 = new THREE.Matrix4(), _x = new V3(), _y = new V3(), _z = new V3();
function basisQ(upv, fwd, out) { _y.copy(upv).normalize(); _x.crossVectors(_y, fwd); if (_x.lengthSq() < 1e-6) _x.set(1, 0, 0); _x.normalize(); _z.crossVectors(_x, _y).normalize(); _m4.makeBasis(_x, _y, _z); return out.setFromRotationMatrix(_m4); }
let runPhase = 0;
function updateHeroVisual(dt) {
  const tq = new Qt(); const pose = { pose: null, w: { spine: 0, armL: 0, armR: 0, legs: 0, hips: 0 }, rate: 12 };
  const vel = P.vel, spd = vel.length(); let yOff = 0;
  const full = (p) => { pose.pose = p; pose.w = { spine: 1, armL: 1, armR: 1, legs: 1, hips: 1 }; };
  if (P.mode === 'ground') {
    basisQ(UP, P.facing, tq);
    const hs = Math.hypot(vel.x, vel.z);
    if (P.atk || P.act) { playAct(hero, nearEnemy(14) ? 'fight_idle' : 'idle', 0.2); }
    else if (hs > 6 && !P.roll) { pose.pose = { spine: v3(0, 1, 0.12 + Math.min(hs, 26) * 0.012), head: v3(0, 1, 0.25) }; pose.w = { spine: 0.7, armL: 0, armR: 0, legs: 0, hips: 0 }; }
    else if (hs > 11) playAct(hero, 'run', 0.15, { speed: hs / 7.5 }); else if (hs > 1.2) playAct(hero, hs > 5 ? 'run' : 'walk', 0.15, { speed: hs > 5 ? hs / 7 : hs / 1.8 }); else playAct(hero, nearEnemy(14) ? 'fight_idle' : 'idle', 0.3);
    P.idleT = hs < 0.4 && !P.atk && !P.act ? (P.idleT || 0) + dt : 0;
    if (P.roll) { P.roll.t += dt; const e = P.roll.t / 0.55; if (e >= 1) P.roll = null; else { full(POSES.roll); pose.rate = 30; tq.multiply(_rq.setFromAxisAngle(new V3(1, 0, 0), e * Math.PI * 2)); yOff = 0.55 * Math.sin(e * Math.PI) - 0.2; } }
    if (P.roll) { }
    else if (P.landT > 0) { full(POSES.land); pose.rate = 25; }
    else if (P.idleT > 1.2 && P.pos.y > 3 && !nearEnemy(20)) { full(POSES.perch); pose.rate = 4; yOff = -0.42 * Math.min(1, (P.idleT - 1.2) * 2); }
    else if (P.jumpCharge >= 0) { full(POSES.crouch); }
    if (P.sling) { full(POSES.sling); }
    if (P.act) { const a = POSES[P.act.pose]; if (a) { pose.pose = a; pose.w = { spine: 0.8, armL: 1, armR: 1, legs: P.act.legs ? 1 : 0, hips: 0 }; pose.rate = 30; } }
    if (P.parryT > gameTime - 0.3) { pose.pose = POSES.parry; pose.w = { spine: 0.5, armL: 1, armR: 1, legs: 0, hips: 0 }; pose.rate = 35; }
  } else if (P.mode === 'swim') {
    playAct(hero, 'idle', 0.3); const moving = Math.hypot(vel.x, vel.z) > 0.6;
    tA.copy(P.facing).setY(0).normalize(); if (moving) tA.y = 0.12; else { tA.set(0, 1, 0).lerp(tA, 0.25); }
    basisQ(tA.normalize(), tB.set(0, -1, 0).addScaledVector(tA, tA.y), tq);
    const ph = P.swimPh || 0, s1 = Math.sin(ph), c1 = Math.cos(ph);
    const sw = moving ? { spine: v3(0, 1, 0.1), head: v3(0, 0.8, -0.6), armL: v3(0.3, c1, s1 * 0.6 + 0.2), foreL: v3(0.25, c1, s1 * 0.7 + 0.3), armR: v3(-0.3, -c1, -s1 * 0.6 + 0.2), foreR: v3(-0.25, -c1, -s1 * 0.7 + 0.3), thighL: v3(0.1, -1, Math.sin(ph * 2) * 0.25), shinL: v3(0.08, -1, Math.sin(ph * 2 + 0.6) * 0.3), thighR: v3(-0.1, -1, -Math.sin(ph * 2) * 0.25), shinR: v3(-0.08, -1, -Math.sin(ph * 2 + 0.6) * 0.3) }
      : { spine: v3(0, 1, 0), head: v3(0, 1, 0.2), armL: v3(0.9, -0.2, Math.sin(ph) * 0.4), foreL: v3(0.8, -0.1, 0.4), armR: v3(-0.9, -0.2, -Math.sin(ph) * 0.4), foreR: v3(-0.8, -0.1, 0.4), thighL: v3(0.2, -1, Math.sin(ph * 1.3) * 0.4), shinL: v3(0.1, -1, -0.3), thighR: v3(-0.2, -1, -Math.sin(ph * 1.3) * 0.4), shinR: v3(-0.1, -1, -0.3) };
    full(sw); pose.rate = 10;
  } else if (P.mode === 'wall' && vel.length() > 11) {
    tB.copy(vel).addScaledVector(P.wallN, -vel.dot(P.wallN)).normalize(); basisQ(P.wallN, tB, tq); playAct(hero, 'run', 0.12, { speed: vel.length() / 8 });
  } else if (P.mode === 'wall') {
    basisQ(UP, tA.copy(P.wallN).negate(), tq); playAct(hero, 'walk', 0.2, { speed: 0.001 });
    full(POSES.wall); runPhase += dt * (Math.abs(vel.y) + Math.abs(vel.x) + Math.abs(vel.z)) * 1.5;
    const s = Math.sin(runPhase); pose.pose = Object.assign({}, POSES.wall, s > 0 ? {} : mirror(POSES.wall));
  } else {
    playAct(hero, 'idle', 0.3);
    const rope = P.ropes.L || P.ropes.R;
    if (P.sling) { basisQ(UP, camFH, tq); full(POSES.sling); }
    else if (rope) {
      tA.set(0, 0, 0); for (const h of ['L', 'R']) if (P.ropes[h]) tA.add(tB.subVectors(P.ropes[h].pivot, P.pos).normalize());
      tB.copy(vel); tB.addScaledVector(tA, -tB.dot(tA.normalize())); if (tB.lengthSq() < 0.01) tB.copy(P.facing);
      basisQ(tA, tB.normalize(), tq);
      const rp0 = P.ropes.L || P.ropes.R; tC.subVectors(P.pos, rp0.pivot).normalize(); tD.set(vel.x, 0, vel.z); if (tD.lengthSq() < 0.5) tD.copy(P.facing); tD.normalize();
      const sinA = tC.dot(tD), rising = vel.y > 0;
      let sp = blendPose(POSES.swBottom, POSES.swFront, smooth(0.05, 0.6, sinA));
      sp = blendPose(sp, POSES.swBack, smooth(0.05, 0.6, -sinA));
      sp = blendPose(sp, POSES.swTop, smooth(0.45, 0.85, sinA) * (rising ? 0.5 : 1) * smooth(-2, 6, -vel.y + 4));
      full(swayPose(sp, gameTime * 1.6, 0.05)); if (P.loop) pose.pose = POSES.tuck; P.rel = null;
      const hdw = Math.atan2(vel.x, vel.z); let dyw = hdw - (P.swHd ?? hdw); dyw = Math.atan2(Math.sin(dyw), Math.cos(dyw)); P.swHd = hdw;
      P.sbank = damp(P.sbank || 0, clamp(-dyw / Math.max(dt, 1e-3) * 0.35, -0.7, 0.7), 4, dt); tq.multiply(_rq.setFromAxisAngle(new V3(0, 0, 1), P.sbank));
      pose.look = vel.clone().normalize().lerp(new V3(0, -0.3, 0), 0.25).normalize();
      for (const h of ['L', 'R']) if (P.ropes[h]) { const ad = new V3().subVectors(P.ropes[h].anchor, handWorld(h, tC)).normalize(); pose['aim' + h] = ad; pose['aimU' + h] = ad.clone().lerp(tA.clone().normalize(), 0.35).normalize(); }
      pose.rate = 7;
    } else if (P.zip) { basisQ(tA.subVectors(P.zip.target, P.pos).normalize(), camFH, tq); full(POSES.zip); }
    else if (P.glide || P.dive) { tA.copy(vel).normalize(); if (tA.lengthSq() < 0.5) tA.copy(camF); basisQ(tA, tB.set(0, -1, 0).addScaledVector(tA, tA.y), tq); if (P.glide) tq.multiply(_rq.setFromAxisAngle(new V3(0, 1, 0), P.bank || 0)); full(P.glide ? POSES.glide : POSES.dive); }
    else {
      for (const h of ['L', 'R']) if (P.pending[h]) pose['aim' + h] = new V3().subVectors(P.pending[h].anchor, handWorld(h, tC)).normalize();
      tB.set(vel.x, 0, vel.z); if (tB.lengthSq() < 1) tB.copy(P.facing); tB.normalize();
      const hd = smooth(-6, -24, vel.y); // fast fall: head points down along the fall
      tA.set(0, 1, 0).addScaledVector(tB, clamp(vel.y * -0.012, -0.35, 0.35)).normalize();
      if (hd > 0) { tC.copy(vel).normalize(); tA.lerp(tC, hd).normalize(); tD.set(0, -1, 0).addScaledVector(tC, tC.y); if (tD.lengthSq() < 0.01) tD.copy(tB); basisQ(tA, tB.lerp(tD.normalize(), hd).normalize(), tq); } else basisQ(tA, tB, tq);
      let base = blendPose(POSES.fall, POSES.air, smooth(-14, 8, vel.y)); if (hd > 0) base = blendPose(base, POSES.headDown, hd); pose.rate = 9;
      if (P.rel) {
        P.rel.t += dt; const e = P.rel.t / P.rel.dur;
        if (e >= 1) P.rel = null;
        else {
          const rp = P.rel.type === 'arc' ? POSES.relArc : P.rel.type === 'super' ? POSES.relSuper : P.rel.type === 'cork' ? POSES.relCork : POSES.tuck;
          const w = Math.min(1, e * 5) * (1 - smooth(0.7, 1, e)); base = blendPose(base, rp, w); pose.rate = 10;
          tA.set(0, 0.45, 0).addScaledVector(tC.copy(vel).normalize(), 0.55 * w).normalize(); basisQ(tA, tB, tq);
          const spin = (1 - Math.cos(Math.min(e / 0.85, 1) * Math.PI)) * Math.PI;
          if (P.rel.type === 'cork') tq.multiply(_rq.setFromAxisAngle(new V3(0, 1, 0), spin));
          else if (P.rel.type === 'backflip') tq.multiply(_rq.setFromAxisAngle(new V3(-1, 0, 0), spin));
          else if (P.rel.type === 'frontflip') tq.multiply(_rq.setFromAxisAngle(new V3(1, 0, 0), spin));
          else if (P.rel.type === 'sideflip') tq.multiply(_rq.setFromAxisAngle(new V3(0, 0, 1), spin));
          if (e < 0.05 && !P.rel.named) { P.rel.named = true; const nm = { backflip: 'Backflip', frontflip: 'Front Flip', sideflip: 'Side Flip', cork: 'Corkscrew', arc: 'Swan Dive', super: 'Superhero' }[P.rel.type]; addTrick(nm, 6); }
        }
      }
      full(swayPose(base, gameTime * 2.2, 0.2));
      if (P.trick) { const tr = P.trick.type; full(tr === 'starfish' ? POSES.starfish : POSES.tuck); pose.rate = 20; }
    }
    if (P.trick) {
      const e = P.trick.t / P.trick.dur, ang = (1 - Math.cos(Math.min(e, 1) * Math.PI)) * Math.PI; const tr = P.trick.type;
      const ax = tr === 'frontflip' ? new V3(1, 0, 0) : tr === 'backflip' ? new V3(-1, 0, 0) : tr === 'rollL' ? new V3(0, 0, -1) : tr === 'rollR' ? new V3(0, 0, 1) : new V3(0, 1, 0);
      tq.multiply(_rq.setFromAxisAngle(ax, ang)); yOff = 0.9 * Math.sin(Math.min(e, 1) * Math.PI) * (tr === 'starfish' ? 0 : 1);
    }
  }
  heroQ.slerp(tq, 1 - Math.exp(-(P.trick || (P.rel && P.rel.type !== 'arc' && P.rel.type !== 'super') ? 35 : 10) * dt));
  hero.group.quaternion.copy(heroQ);
  hero.group.position.copy(P.pos); if (yOff) hero.group.position.addScaledVector(UP, yOff);
  if (P.mode === 'swim') hero.group.position.addScaledVector(tA.set(0, 1, 0).applyQuaternion(heroQ), -0.9).addScaledVector(UP, 0.9 + 0.08 * Math.sin(gameTime * 2));
  if (P.mode !== 'ground' && !P.trick && (P.glide || P.dive || P.ropes.L || P.ropes.R)) hero.group.position.addScaledVector(tA.set(0, 1, 0).applyQuaternion(heroQ), -0.9).addScaledVector(UP, 0.9);
  hero.mixer.update(dt);
  applyHeroPose(pose, dt);
  suitU.uOD.value = damp(suitU.uOD.value, P.od > 0 ? 1 : 0, 5, dt);
  // webs
  for (const h of ['L', 'R']) { if (handRope[h] && !P.ropes[h] && !P.pending[h]) loosenRope(h); }
  updateRopes(dt);
  drawWeb(webVis.Z, P.zip ? handWorld('R', new V3()) : null, P.zip && P.zip.target);
  if (P.sling) { const a = handWorld('L', new V3()), b = handWorld('R', new V3()); drawWeb(webVis.S1, a, a.clone().addScaledVector(camF, 14).addScaledVector(camR, -7).addScaledVector(UP, 4)); drawWeb(webVis.S2, b, b.clone().addScaledVector(camF, 14).addScaledVector(camR, 7).addScaledVector(UP, 4)); }
  else { drawWeb(webVis.S1, null); drawWeb(webVis.S2, null); }
  wings.update(dt); updateCatPack(dt);
  for (const s of splats) if (s.visible) { s.userData.t -= dt; if (s.userData.t <= 0) s.visible = false; }
}
// web-wings membrane between arms, torso and legs
const wings = (() => {
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array(8 * 3 * 3); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const c = makeCanvas(512, 512), g = c.getContext('2d'); const gr = g.createRadialGradient(0, 0, 40, 0, 0, 720); gr.addColorStop(0, '#1d3480'); gr.addColorStop(1, '#0d1638'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); g.strokeStyle = 'rgba(190,205,255,.55)'; g.lineWidth = 2.5; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 760, Math.sin(a) * 760); g.stroke(); } g.lineWidth = 1.6; for (let r = 60; r < 760; r += 55) { g.beginPath(); for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI / 2; const rr2 = r * (1 - 0.06 * Math.sin(i * Math.PI)); i ? g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : g.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } g.stroke(); } g.strokeStyle = '#c4122a'; g.lineWidth = 10; g.strokeRect(0, 0, 512, 512);
  const uv = new Float32Array(8 * 3 * 2); for (let i = 0; i < 8 * 3; i++) { uv[i * 2] = [0, 1, 0.5][i % 3]; uv[i * 2 + 1] = [0, 0.3, 1][i % 3]; } geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: canvasTex(c), side: THREE.DoubleSide, roughness: 0.45, transparent: true, opacity: 0.9 }));
  const trails = [0, 1].map(() => { const n = 40; const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const l = new THREE.Line(g2, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })); l.frustumCulled = false; scene.add(l); return { l, n, pts: [] }; }); mesh.frustumCulled = false; mesh.castShadow = true; scene.add(mesh);
  let k = 0; const J = {};
  return {
    update(dt) {
      k = damp(k, P.glide ? 1 : 0, 9, dt); mesh.visible = k > 0.02; if (!mesh.visible) { trails.forEach(t => { t.l.visible = false; t.pts.length = 0; }); return; }
      const B = hero.bones; for (const n of ['LeftHand', 'RightHand', 'LeftArm', 'RightArm', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'Spine1', 'Hips']) J[n] = B[n].getWorldPosition(J[n] || new V3());
      const lerpK = (a, b) => new V3().lerpVectors(b, a, k);
      const tri = [[lerpK(J.LeftHand, J.LeftArm), J.LeftArm, J.LeftUpLeg], [lerpK(J.LeftHand, J.LeftArm), J.LeftUpLeg, lerpK(J.LeftLeg, J.LeftUpLeg)], [lerpK(J.RightHand, J.RightArm), J.RightUpLeg, J.RightArm], [lerpK(J.RightHand, J.RightArm), lerpK(J.RightLeg, J.RightUpLeg), J.RightUpLeg],
      [J.LeftUpLeg, lerpK(J.LeftLeg, J.LeftUpLeg), J.Hips], [J.RightUpLeg, J.Hips, lerpK(J.RightLeg, J.RightUpLeg)], [lerpK(J.LeftLeg, J.Hips), lerpK(J.RightLeg, J.Hips), J.Hips], [J.LeftArm, J.Spine1, J.LeftUpLeg]];
      tri.forEach((t, i) => t.forEach((p, j) => { pos[(i * 3 + j) * 3] = p.x; pos[(i * 3 + j) * 3 + 1] = p.y; pos[(i * 3 + j) * 3 + 2] = p.z; }));
      const fl = Math.min(1, P.vel.length() / 40) * 0.05; for (let i = 0; i < pos.length; i += 3) { const ph = gameTime * 28 + i * 0.7; pos[i + 1] += Math.sin(ph) * fl; }
      geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
      [J.LeftHand, J.RightHand].forEach((hp, ti) => { const tr = trails[ti]; tr.pts.unshift(hp.clone()); if (tr.pts.length > tr.n) tr.pts.pop(); const a = tr.l.geometry.attributes.position; for (let i = 0; i < tr.n; i++) { const q = tr.pts[Math.min(i, tr.pts.length - 1)]; a.setXYZ(i, q.x, q.y, q.z); } a.needsUpdate = true; tr.l.visible = P.vel.length() > 22; tr.l.material.opacity = 0.45 * k; });
    }
  };
})();

// ---------- camera ----------
const camPos = new V3(), camLook = new V3();
function updateCamera(dt, realDt) {
  const spd = P.vel.length();
  if (gameTime - lastLook > 0.9 && spd > 22 && P.mode === 'air' && !P.sling) { const hv = Math.hypot(P.vel.x, P.vel.z); const wantP = clamp(Math.atan2(P.vel.y, hv + 1) * 0.55, -0.95, 0.15); pitch = damp(pitch, wantP, 1.2, realDt); }
  if (gameTime - lastLook > 1.2 && spd > 14 && P.mode === 'air' && !P.sling) { const vy = Math.atan2(-P.vel.x, -P.vel.z); let d = vy - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yaw += d * (1 - Math.exp(-0.9 * realDt)) * (0.3 + 0.7 * assist()); }
  const tgt = tA.copy(P.pos).add(tB.set(0, 1.45, 0));
  const inCombat = nearEnemy(18);
  let dist = 5.2 + clamp(spd * 0.035, 0, 3) + (inCombat ? 1.8 : 0) + (P.glide ? 1 : 0);
  const back = tC.copy(camF).negate();
  const o = tgt.clone(); const dir = back.clone().multiplyScalar(dist).addScaledVector(camR, 0.55).addScaledVector(UP, 0.35); const dl = dir.length(); dir.normalize();
  const hit = raycast(o, dir, dl); const dd = hit ? Math.max(0.6, hit.t - 0.35) : dl;
  const want = o.addScaledVector(dir, dd); if (want.y < 0.4 && onLand(want.x, want.z)) want.y = 0.4; if (want.y < WATER_Y + 0.7) want.y = WATER_Y + 0.7;
  camPos.lerp(want, 1 - Math.exp(-(hit ? 30 : 16 - clamp(spd * 0.08, 0, 7)) * realDt));
  camera.position.copy(camPos);
  if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake * 0.5; camera.position.y += (Math.random() - 0.5) * shake * 0.5; shake = Math.max(0, shake - realDt * 2.2); }
  camLook.copy(camera.position).add(camF);
  camera.lookAt(camLook);
  const fov = S.fov + clamp((spd - 14) * 0.38, 0, 26) + (P.sling ? -6 + P.sling.t * 8 : 0);
  camera.fov = damp(camera.fov, fov, 4, realDt); camera.updateProjectionMatrix();
}
