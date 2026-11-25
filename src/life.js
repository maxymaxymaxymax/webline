// ================= TRAFFIC, CIVILIANS, WIND =================
const carMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.5 });
function wheel(x, z, r = 0.36) { return [new THREE.CylinderGeometry(r, r, 0.28, 8).rotateZ(Math.PI / 2).translate(x, r, z), 0x111111]; }
const carGeo = mergeGeos([
  [boxG(1.9, 0.62, 4.4, 0, 0.66, 0), 0xffffff], [boxG(1.72, 0.58, 2.3, 0, 1.25, -0.2), 0xffffff],
  [boxG(1.75, 0.42, 2.12, 0, 1.22, -0.2), 0x161b22], [boxG(1.92, 0.1, 4.42, 0, 0.42, 0), 0x222222],
  wheel(0.86, 1.35), wheel(-0.86, 1.35), wheel(0.86, -1.35), wheel(-0.86, -1.35),
  [boxG(0.42, 0.14, 0.05, 0.62, 0.78, 2.21), 0xfff3cf], [boxG(0.42, 0.14, 0.05, -0.62, 0.78, 2.21), 0xfff3cf],
  [boxG(0.4, 0.14, 0.05, 0.64, 0.8, -2.21), 0xc0121e], [boxG(0.4, 0.14, 0.05, -0.64, 0.8, -2.21), 0xc0121e]]);
const busGeo = mergeGeos([[boxG(2.5, 2.7, 11, 0, 1.75, 0), 0xffffff], [boxG(2.53, 0.9, 10.2, 0, 2.25, 0.2), 0x161b22], [boxG(2.4, 0.3, 11.02, 0, 0.55, 0), 0x2a2a2a], wheel(1.1, 3.8, 0.5), wheel(-1.1, 3.8, 0.5), wheel(1.1, -3.6, 0.5), wheel(-1.1, -3.6, 0.5)]);
const truckGeo = mergeGeos([[boxG(2.2, 1.6, 2.2, 0, 1.25, 2.4), 0xffffff], [boxG(2.22, 0.6, 0.1, 0, 1.6, 3.52), 0x161b22], [boxG(2.4, 2.8, 5, 0, 1.95, -1.4), 0xe8e4dc], wheel(1, 2.5, 0.45), wheel(-1, 2.5, 0.45), wheel(1, -2.6, 0.45), wheel(-1, -2.6, 0.45)]);
const CAR_COLS = [0xf2f2f2, 0x1a1a1a, 0x8a1c1c, 0x2b4c7e, 0x9a9a9a, 0x3c5a3a, 0xc9c1a8, 0x5c2a5a, 0xd8d8d8, 0x2a2f36];
const lanes = [], vehicles = [];
for (const d of DIST) {
  for (let j = 1; j < d.nz; j++) for (const dir of [1, -1]) lanes.push({ d, axis: 0, c: d.z0 + j * d.cd + dir * d.road * 0.25, dir, min: d.x0, max: d.x1, cell: d.cw, o: d.x0, road: d.road, cars: [] });
  for (let i = 1; i < d.nx; i++) for (const dir of [1, -1]) lanes.push({ d, axis: 1, c: d.x0 + i * d.cw - dir * d.road * 0.25, dir, min: d.z0, max: d.z1, cell: d.cd, o: d.z0, road: d.road, cars: [] });
}
for (let i = lanes.length - 1; i >= 0; i--) { const L = lanes[i]; if (L.d.id !== 'mid') continue;
  if (L.axis === 0 && L.c > NYC.z0 - 6 && L.c < NYC.z1 + 6) lanes.splice(i, 1);
  else if (L.axis === 1 && L.c > NYC.x0 - 6 && L.c < NYC.x1 + 6) { lanes.splice(i, 1); lanes.push(Object.assign({}, L, { max: NYC.z0 - 8, cars: [] }), Object.assign({}, L, { min: NYC.z1 + 8, cars: [] })); } }
for (const L of lanes) {
  let s = L.min + rr(0, 30);
  while (s < L.max - 8) {
    const r = rng(); const type = r < 0.06 ? 2 : r < 0.12 ? 3 : 1;
    const car = { L, s, v: rr(8, 13), vmax: type === 2 ? 10 : rr(10, 15), type, len: type === 2 ? 11 : type === 3 ? 7.5 : 4.6, taxi: type === 1 && rng() < 0.28 };
    car.col = car.taxi ? 0xf6c12a : type === 2 ? pick([0x2d6cb5, 0xe6e6e6]) : pick(CAR_COLS);
    vehicles.push(car); L.cars.push(car); s += car.len + rr(30, 110);
  }
}
const vByType = { 1: vehicles.filter(v => v.type === 1), 2: vehicles.filter(v => v.type === 2), 3: vehicles.filter(v => v.type === 3) };
const vMesh = {};
for (const [t, geo] of [[1, carGeo], [2, busGeo], [3, truckGeo]]) {
  const list = vByType[t]; const m = new THREE.InstancedMesh(geo, carMat, list.length);
  list.forEach((v, i) => { v.idx = i; m.setColorAt(i, tCol.setHex(v.col)); });
  m.frustumCulled = false; m.receiveShadow = true; m.castShadow = false; scene.add(m); vMesh[t] = m;
}
let lightClock = 0;
function updateTraffic(dt) {
  lightClock = (lightClock + dt) % 18;
  const greenAxis = lightClock < 8 ? 0 : lightClock < 9 ? -1 : lightClock < 17 ? 1 : -1;
  for (const L of lanes) {
    const cars = L.cars; cars.sort((a, b) => (b.s - a.s) * L.dir);
    for (let k = 0; k < cars.length; k++) {
      const c = cars[k]; let target = c.vmax;
      if (greenAxis !== L.axis) {
        const rel = (c.s - L.o) / L.cell; const nextIdx = L.dir > 0 ? Math.ceil(rel) : Math.floor(rel);
        const center = L.o + nextIdx * L.cell; const dist = (center - c.s) * L.dir - c.len / 2;
        const stop = L.road / 2 + 1.2;
        if (dist > stop - 0.5 && dist < stop + 26) target = Math.min(target, Math.max(0, (dist - stop) * 0.9));
      }
      if (P.pos.y < 2.6) { const along = L.axis === 0 ? P.pos.x : P.pos.z, perp = (L.axis === 0 ? P.pos.z : P.pos.x) - L.c;
        if (Math.abs(perp) < 1.9) { const ah = (along - c.s) * L.dir - c.len / 2; if (ah > -0.5 && ah < 18) { target = Math.min(target, Math.max(0, (ah - 2.2) * 1.4)); c.block = (c.block || 0) + dt; if (c.block > 0.7 && !(c.honkT > 0)) { c.honkT = rr(2, 3.5); sfx.horn(c.x, c.z); } } else c.block = 0; } }
      c.honkT = (c.honkT || 0) - dt;
      if (k > 0) { const ahead = cars[k - 1]; const gap = (ahead.s - c.s) * L.dir - (ahead.len + c.len) / 2; if (gap > -2) target = Math.min(target, Math.max(0, (gap - 3) * 0.9)); }
      c.v = c.v > target ? damp(c.v, target, 5, dt) : damp(c.v, target, 0.8, dt);
      c.s += c.v * L.dir * dt;
      if (c.s > L.max) c.s = L.min; else if (c.s < L.min) c.s = L.max;
      const acc = (c.v - (c.pv ?? c.v)) / Math.max(dt, 1e-3); c.pv = c.v;
      c.pitch = damp(c.pitch || 0, clamp(-acc * 0.012, -0.07, 0.07), 6, dt);
      c.bobV = (c.bobV || 0) + (-(c.bob || 0) * 140 - c.bobV * 7) * dt; c.bob = (c.bob || 0) + c.bobV * dt;
      c.x = L.axis === 0 ? c.s : L.c; c.z = L.axis === 0 ? L.c : c.s; c.yaw = L.axis === 0 ? (L.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (L.dir > 0 ? 0 : Math.PI);
    }
  }
  buildCarBoxes(); if (typeof trainBoxes === 'function') trainBoxes(); renderVehicles();
}
const carBoxes = []; const trafficInfo = { near: 0, minD: 999, minV: 0 };
function buildCarBoxes() {
  carBoxes.length = 0; trafficInfo.near = 0; trafficInfo.minD = 999; const cp = camera.position;
  for (const c of vehicles) {
    if (c.x === undefined) continue; const dc = Math.hypot(c.x - cp.x, c.z - cp.z);
    if (dc < 70) { trafficInfo.near++; if (dc < trafficInfo.minD) { trafficInfo.minD = dc; trafficInfo.minV = c.v; } }
    const dx = c.x - P.pos.x, dz = c.z - P.pos.z; if (dx * dx + dz * dz > 400) continue;
    const M = vehReady ? VEH[c.model] : null; const len = M ? M.len : c.len, wid = M ? M.w * 0.82 : 1.9, hgt = (M ? M.h : 1.5) + (c.bob || 0);
    const ex = c.L.axis === 0 ? len / 2 : wid / 2, ez = c.L.axis === 0 ? wid / 2 : len / 2;
    carBoxes.push({ x0: c.x - ex, x1: c.x + ex, z0: c.z - ez, z1: c.z + ez, y0: 0, y1: hgt, car: c, vx: c.L.axis === 0 ? c.v * c.L.dir : 0, vz: c.L.axis === 0 ? 0 : c.v * c.L.dir });
    // getting hit by a moving car
    if (c.v > 5 && P.pos.y < hgt - 0.4 && !P.dead) { const along = (c.L.axis === 0 ? -dx : -dz) * c.L.dir; const perp = Math.abs(c.L.axis === 0 ? dz : dx);
      if (along > len / 2 - 0.2 && along < len / 2 + 0.6 && perp < wid / 2 + 0.3) { const dir = new V3(c.L.axis === 0 ? c.L.dir : 0, 0, c.L.axis === 0 ? 0 : c.L.dir);
        P.vel.copy(dir).multiplyScalar(c.v * 1.3).addScaledVector(UP, 7); P.mode = 'air'; c.v *= 0.2; c.bobV -= 3; c.honkT = 3; sfx.carHit(); sfx.horn(c.x, c.z); shake = 0.5; ui.trick('Hit by a car', ''); } }
  }
}
function carLanding(c, impact) { c.bobV -= Math.min(7, impact * 0.25); if (impact > 8) sfx.carHit(); }
// ---------- real vehicle models (near) + simple boxes (far) ----------
const VEH = {}; let vehReady = false;
const CAR_TYPES = ['Sedan', 'Sedan', 'Hatchback', 'SUV', 'Pickup', 'Muscle', 'Sports', 'Van', 'Limousine', 'Police Sedan', 'Roadster'];
// Car textures: 4 livery rows (0 plain, 1 taxi, 2 police, 3 ambulance). RGB = detail colour, A = how much body paint shows through.
const CAR_TEX = (() => {
  const mk = (w, h, draw) => { const c = makeCanvas(w, h), g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = MAX_ANISO; t.premultiplyAlpha = false; return t; };
  const paint = (g, x, y, w, h) => { g.fillStyle = 'rgba(255,255,255,1)'; g.fillRect(x, y, w, h); };
  const side = mk(1024, 1024, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    for (let row = 0; row < 4; row++) {
      const y0 = row * H / 4, h = H / 4; const Y = v => y0 + (1 - v) * h; // v: 0 bottom .. 1 top
      paint(g, 0, y0, W, h);
      g.fillStyle = 'rgba(28,30,34,1)'; g.fillRect(0, Y(0.2), W, Y(0) - Y(0.2));                     // dark rocker / lower trim
      g.fillStyle = 'rgba(20,22,26,1)'; for (const u of [0.19, 0.81]) { g.beginPath(); g.arc(u * W, Y(0.06), h * 0.27, Math.PI, 0); g.fill(); } // wheel arches
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, Y(0.56)); g.lineTo(W, Y(0.54)); g.stroke();   // shoulder highlight
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, Y(0.535)); g.lineTo(W, Y(0.515)); g.stroke();
      g.strokeStyle = 'rgba(10,10,12,0.85)'; g.lineWidth = 3; for (const u of [0.33, 0.56, 0.75]) { g.beginPath(); g.moveTo(u * W, Y(0.22)); g.lineTo(u * W + 6, Y(0.62)); g.stroke(); } // door seams
      g.fillStyle = 'rgba(200,205,210,1)'; for (const u of [0.36, 0.59]) g.fillRect(u * W, Y(0.5), 36, 8);  // chrome handles
      g.fillStyle = 'rgba(40,40,44,1)'; g.beginPath(); g.arc(0.86 * W, Y(0.45), 9, 0, 7); g.fill();       // fuel cap
      if (row === 1) { // taxi: checker band + roof-line text
        for (let i = 0; i < W / 22; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? 'rgba(15,15,15,1)' : 'rgba(255,255,255,0)'; if ((i + j) % 2) g.fillRect(i * 22, Y(0.43) + j * 11, 22, 11); }
        g.fillStyle = 'rgba(15,15,15,1)'; g.font = '900 54px Arial'; g.textAlign = 'center'; g.fillText('TAXI', W * 0.47, Y(0.26)); g.font = '700 22px Arial'; g.fillText('NEW HARBOR CAB  ·  212-555-0147', W * 0.47, Y(0.33)); }
      if (row === 2) { g.fillStyle = 'rgba(245,245,245,1)'; g.fillRect(0, Y(0.5), W, Y(0.22) - Y(0.5)); g.fillStyle = 'rgba(20,40,110,1)'; g.fillRect(0, Y(0.44), W, 14); g.font = '900 58px Arial'; g.textAlign = 'center'; g.fillText('POLICE', W * 0.47, Y(0.27)); g.font = '700 20px Arial'; g.fillText('NEW HARBOR PD  ·  UNIT 27', W * 0.47, Y(0.36)); }
      if (row === 3) { g.fillStyle = 'rgba(200,24,30,1)'; g.fillRect(0, Y(0.47), W, 26); g.fillRect(0, Y(0.3), W, 10); g.font = '900 50px Arial'; g.textAlign = 'center'; g.fillText('AMBULANCE', W * 0.47, Y(0.33)); g.lineWidth = 12; g.strokeStyle = 'rgba(30,90,200,1)'; const cx = W * 0.15, cy = Y(0.36); g.beginPath(); g.moveTo(cx, cy - 34); g.lineTo(cx, cy + 34); g.moveTo(cx - 30, cy - 17); g.lineTo(cx + 30, cy + 17); g.moveTo(cx - 30, cy + 17); g.lineTo(cx + 30, cy - 17); g.stroke(); }
    }
  });
  const ends = mk(1024, 512, (g, W, H) => { // left half: front, right half: back
    g.clearRect(0, 0, W, H); const F = W / 2; const Y = v => (1 - v) * H;
    paint(g, 0, 0, W, H);
    g.fillStyle = 'rgba(25,27,30,1)'; g.fillRect(0, Y(0.16), W, H - Y(0.16));                                  // bumpers
    g.fillStyle = 'rgba(18,18,20,1)'; g.fillRect(F * 0.28, Y(0.42), F * 0.44, Y(0.24) - Y(0.42));              // grille
    g.strokeStyle = 'rgba(190,195,200,1)'; g.lineWidth = 6; g.strokeRect(F * 0.28, Y(0.42), F * 0.44, Y(0.24) - Y(0.42));
    g.strokeStyle = 'rgba(60,62,66,1)'; g.lineWidth = 3; for (let x = F * 0.3; x < F * 0.71; x += 16) { g.beginPath(); g.moveTo(x, Y(0.41)); g.lineTo(x, Y(0.25)); g.stroke(); }
    g.fillStyle = 'rgba(255,248,225,1)'; for (const u of [0.11, 0.89]) { g.beginPath(); g.ellipse(F * u, Y(0.36), F * 0.08, H * 0.05, 0, 0, 7); g.fill(); }  // headlights
    g.strokeStyle = 'rgba(170,175,180,1)'; g.lineWidth = 4; for (const u of [0.11, 0.89]) { g.beginPath(); g.ellipse(F * u, Y(0.36), F * 0.09, H * 0.06, 0, 0, 7); g.stroke(); }
    const plate = (cx, txt) => { g.fillStyle = 'rgba(240,240,232,1)'; g.fillRect(cx - 70, Y(0.15), 140, 36); g.strokeStyle = 'rgba(30,30,30,1)'; g.lineWidth = 3; g.strokeRect(cx - 70, Y(0.15), 140, 36); g.fillStyle = 'rgba(25,40,110,1)'; g.font = '800 24px Arial'; g.textAlign = 'center'; g.fillText(txt, cx, Y(0.15) + 27); };
    plate(F * 0.5, 'WBL 4127'); plate(F * 1.5, 'NH 88K2');
    g.fillStyle = 'rgba(200,20,28,1)'; for (const u of [1.08, 1.92]) g.fillRect(F * u - F * 0.07, Y(0.5), F * 0.14, Y(0.32) - Y(0.5)); // tail lights
    g.fillStyle = 'rgba(255,170,60,1)'; for (const u of [1.08, 1.92]) g.fillRect(F * u - F * 0.07, Y(0.34), F * 0.14, 14);
    g.strokeStyle = 'rgba(10,10,12,0.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(F * 1.18, Y(0.62)); g.lineTo(F * 1.82, Y(0.62)); g.stroke();      // trunk seam
    g.strokeStyle = 'rgba(10,10,12,0.6)'; g.beginPath(); g.moveTo(F * 0.2, Y(0.6)); g.lineTo(F * 0.8, Y(0.6)); g.stroke();                           // hood seam
  });
  const glass = mk(256, 256, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(150,175,200,1)'); gr.addColorStop(0.45, 'rgba(40,55,70,1)'); gr.addColorStop(1, 'rgba(12,16,22,1)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 18; for (const x of [40, 120]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 90, H); g.stroke(); } });
  return { side, ends, glass };
})();
const vehMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.25, envMapIntensity: 0.6 });
vehMat.customProgramCacheKey = () => 'veh2';
vehMat.onBeforeCompile = sh => {
  sh.uniforms.uSideT = { value: CAR_TEX.side }; sh.uniforms.uEndT = { value: CAR_TEX.ends }; sh.uniforms.uGlassT = { value: CAR_TEX.glass };
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float paint; attribute vec3 iPaint; attribute float iStyle; attribute vec4 part; attribute vec3 ouv; varying float vPaint; varying vec3 vPC; varying vec4 vPart; varying vec3 vOuv; varying float vStyle;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaint=paint; vPC=iPaint; vPart=part; vOuv=ouv; vStyle=iStyle;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uSideT, uEndT, uGlassT; varying float vPaint; varying vec3 vPC; varying vec4 vPart; varying vec3 vOuv; varying float vStyle; float LAMP=0.0;')
    .replace('#include <color_fragment>', `#include <color_fragment>
    {
      vec3 base=diffuseColor.rgb; float face=vOuv.z; vec2 uv=vOuv.xy;
      vec4 t=vec4(1.0);
      if(face<0.5) t=texture2D(uSideT, vec2(uv.x, (3.0-vStyle+uv.y)/4.0));
      else if(face<1.5) t=texture2D(uEndT, vec2(uv.x*0.5, uv.y));
      else if(face<2.5) t=texture2D(uEndT, vec2(0.5+uv.x*0.5, uv.y));
      vec3 paintC=mix(base, vPC, vPaint);
      float pm=smoothstep(0.80,0.96,min(t.r,min(t.g,t.b)));   // white areas of the texture show the body paint, everything else is detail
      vec3 c=mix(t.rgb, paintC, pm);
      if(vPart.z>0.5 || vPart.w>0.5) c=base;                            // tyres and rims keep their own colour
      if(vPart.x>0.5){ c=texture2D(uGlassT, vec2(uv.x*1.5, uv.y)).rgb; }  // reflective glass
      if(vPart.y>0.5){ c=base*1.2; LAMP=1.0; }
      float dirt=smoothstep(0.35,0.0,uv.y)*(face<0.5?1.0:0.6); c*=1.0-0.28*dirt;
      diffuseColor.rgb=c;
    }`)
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,0.3,vPaint); roughnessFactor=mix(roughnessFactor,0.06,vPart.x); roughnessFactor=mix(roughnessFactor,0.9,vPart.z); roughnessFactor=mix(roughnessFactor,0.25,vPart.w);')
    .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,0.85,vPart.w); metalnessFactor=mix(metalnessFactor,0.0,vPart.z);')
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*LAMP*(0.6+1.4*uNightV);');
  sh.uniforms.uNightV = NIGHT_U; sh.fragmentShader = sh.fragmentShader.replace('uniform sampler2D uSideT', 'uniform float uNightV; uniform sampler2D uSideT');
};
async function loadVehicles() {
  const g = await gltfLoader.loadAsync((window.MODEL_BASE || 'models/') + 'vehicles' + (window.MODEL_EXT || '.glb'));
  const root = g.scene; root.updateMatrixWorld(true); const rn = root.getObjectByName('RootNode'); const rnInv = rn.matrixWorld.clone().invert();
  const want = [...new Set([...CAR_TYPES, 'Taxi', 'Bus', 'Truck', 'Ambulance'])]; let sedanLen = 1;
  const raw = {};
  for (const name of want) {
    const nm = name.replace(/ /g, '_'); const parts = rn.children.filter(c => { const cn = c.name.replace(/ /g, '_'); return cn === nm || cn.startsWith(nm + '_wheel'); }); if (!parts.length) continue;
    const meshes = []; parts.forEach(pt => pt.traverse(o => { if (o.isMesh) meshes.push(o); }));
    const cnt = {}; for (const m of meshes) if (/^body/.test(m.material.name) && !/black/.test(m.material.name)) cnt[m.material.name] = (cnt[m.material.name] || 0) + m.geometry.attributes.position.count;
    const paintName = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0]; let paintCol = null;
    const pos = [], nor = [], col = [], pnt = [], prt = []; const hl = new V3(); let hn = 0; const rl = new V3(); let rn2 = 0;
    for (const m of meshes) {
      const gg = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()); gg.applyMatrix4(new THREE.Matrix4().multiplyMatrices(rnInv, m.matrixWorld));
      const pa = gg.attributes.position.array, na = gg.attributes.normal.array; const c = m.material.color; const isP = m.material.name === paintName ? 1 : 0; if (isP) paintCol = c.clone();
      const isHL = /headlight/.test(m.material.name), isRL = /rear_light|tail/.test(m.material.name); const mn = m.material.name; const pr = [/window/.test(mn) ? 1 : 0, /light/.test(mn) ? 1 : 0, /tire/.test(mn) ? 1 : 0, /wheel/.test(mn) ? 1 : 0];
      for (let i = 0; i < pa.length; i += 3) { pos.push(pa[i], pa[i + 1], pa[i + 2]); nor.push(na[i], na[i + 1], na[i + 2]); col.push(c.r, c.g, c.b); pnt.push(isP); prt.push(...pr); if (isHL) { hl.x += pa[i]; hl.y += pa[i + 1]; hl.z += pa[i + 2]; hn++; } if (isRL) { rl.x += pa[i]; rl.z += pa[i + 2]; rn2++; } }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('paint', new THREE.Float32BufferAttribute(pnt, 1)); geo.setAttribute('part', new THREE.Float32BufferAttribute(prt, 4));
    geo.computeBoundingBox(); const bb = geo.boundingBox, ctr = bb.getCenter(new V3()), sz = bb.getSize(new V3());
    geo.translate(-ctr.x, -bb.min.y, -ctr.z); if (hn) { hl.multiplyScalar(1 / hn).sub(ctr); }
    let len = Math.max(sz.x, sz.z);
    if (rn2) { rl.multiplyScalar(1 / rn2).sub(ctr); }
    const fdir = new V3(); if (hn) fdir.add(hl); if (rn2) fdir.sub(rl); fdir.y = 0;   // front = headlights side, away from the rear lights
    if (sz.x > sz.z) { geo.rotateY(fdir.x > 0 ? -Math.PI / 2 : Math.PI / 2); } else if (fdir.z < 0) geo.rotateY(Math.PI);
    raw[name] = { geo, len, paintCol: paintCol || new Col(0xffffff) }; if (name === 'Sedan') sedanLen = len;
  }
  const sc = 4.7 / sedanLen;
  for (const name in raw) {
    const r = raw[name]; r.geo.scale(sc, sc, sc); r.geo.computeBoundingSphere(); r.geo.computeBoundingBox(); const bsz = r.geo.boundingBox.getSize(new V3());
    const cap = name === 'Bus' || name === 'Truck' || name === 'Ambulance' ? 60 : 140;
    { const bb = r.geo.boundingBox, P_ = r.geo.attributes.position, N_ = r.geo.attributes.normal, o = new Float32Array(P_.count * 3);
      for (let i = 0; i < P_.count; i++) { const x = P_.getX(i), y = P_.getY(i), z = P_.getZ(i), nx = N_.getX(i), ny = N_.getY(i), nz = N_.getZ(i);
        const u = (z - bb.min.z) / (bb.max.z - bb.min.z), v = (y - bb.min.y) / (bb.max.y - bb.min.y), w = (x - bb.min.x) / (bb.max.x - bb.min.x);
        let face = 0, uu = nx > 0 ? 1 - u : u; if (Math.abs(nz) > Math.abs(nx) && Math.abs(nz) > Math.abs(ny) * 0.8) { face = nz > 0 ? 1 : 2; uu = nz > 0 ? w : 1 - w; } else if (ny > 0.75) face = 3;
        o[i * 3] = uu; o[i * 3 + 1] = v; o[i * 3 + 2] = face; }
      r.geo.setAttribute('ouv', new THREE.BufferAttribute(o, 3)); }
    const ip = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); r.geo.setAttribute('iPaint', ip);
    const ist = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1); r.geo.setAttribute('iStyle', ist);
    const m = new THREE.InstancedMesh(r.geo, vehMat, cap); m.count = 0; m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; scene.add(m);
    VEH[name] = { mesh: m, ip, ist, len: r.len * sc, w: bsz.x, h: bsz.y, paintCol: r.paintCol, cap };
  }
  const special = { Taxi: 1, 'Police Sedan': 1, Ambulance: 1, Bus: 1 };
  for (const v of vehicles) {
    v.model = v.type === 2 ? 'Bus' : v.type === 3 ? (rng() < 0.15 ? 'Ambulance' : rng() < 0.5 ? 'Truck' : 'Van') : v.taxi ? 'Taxi' : pick(CAR_TYPES);
    if (!VEH[v.model]) v.model = 'Sedan';
    v.pc = special[v.model] ? VEH[v.model].paintCol.clone() : new Col(v.col);
    v.style = v.model === 'Taxi' ? 1 : v.model === 'Police Sedan' ? 2 : v.model === 'Ambulance' ? 3 : 0;
    if (v.style === 1) v.pc.setHex(0xf2b705); if (v.style >= 2) v.pc.setHex(0xf2f2f2);
  }
  vehReady = true;
}
const farCarMesh = new THREE.InstancedMesh(carGeo, carMat, vehicles.length); farCarMesh.frustumCulled = false; scene.add(farCarMesh);
vehicles.forEach((v, i) => farCarMesh.setColorAt(i, tCol.setHex(v.col)));
for (const t in vMesh) scene.remove(vMesh[t]);
const _pq = new Qt(), _px = new V3(1, 0, 0);
function renderVehicles() {
  const cp = camera.position; let far = 0; for (const n in VEH) VEH[n].mesh.count = 0;
  for (const v of vehicles) {
    const L = v.L; const yaw = L.axis === 0 ? (L.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (L.dir > 0 ? 0 : Math.PI);
    const x = L.axis === 0 ? v.s : L.c, z = L.axis === 0 ? L.c : v.s; const d2 = (x - cp.x) ** 2 + (z - cp.z) ** 2;
    tQ.setFromAxisAngle(UP, yaw); if (d2 < 120 * 120) tQ.multiply(_pq.setFromAxisAngle(_px, v.pitch || 0));
    if (vehReady && d2 < (S.quality === 'ultra' ? 520 * 520 : 300 * 300)) { const M = VEH[v.model]; if (M.mesh.count < M.cap) { const i = M.mesh.count++; tM.compose(tA.set(x, Math.max(-0.08, v.bob || 0), z), tQ, tB.set(1, 1, 1)); M.mesh.setMatrixAt(i, tM); M.ip.setXYZ(i, v.pc.r, v.pc.g, v.pc.b); M.ist.setX(i, v.style || 0); continue; } }
    if (d2 > 1400 * 1400) continue;
    tM.compose(tA.set(x, 0, z), tQ, tB.set(1, 1, v.len / 4.6)); farCarMesh.setMatrixAt(far, tM); farCarMesh.setColorAt(far, tCol.setHex(v.col)); far++;
  }
  farCarMesh.count = far; farCarMesh.instanceMatrix.needsUpdate = true; if (farCarMesh.instanceColor) farCarMesh.instanceColor.needsUpdate = true;
  for (const n in VEH) { const M = VEH[n]; M.mesh.instanceMatrix.needsUpdate = true; M.ip.needsUpdate = true; M.ist.needsUpdate = true; }
}

// ---------- civilians ----------
const civs = [];
function addCivRect(x0, z0, x1, z1, n) { for (let i = 0; i < n; i++) { const per = 2 * ((x1 - x0) + (z1 - z0)); civs.push({ r: [x0, z0, x1, z1, per], t: rr(0, per), dir: rng() < .5 ? 1 : -1, sp: rr(1.1, 1.7), ph: rr(0, 6), st: 0, stT: 0, x: 0, z: 0, yaw: 0, y: 0, vy: 0 }); } }
for (const d of DIST) for (const b of d.blocks) { addCivRect(b.bx0 - 1.6, b.bz0 - 1.6, b.bx1 + 1.6, b.bz1 + 1.6, d.id === 'mid' ? ri(5, 10) : ri(2, 5)); const k0 = civs.length; addCivRect(b.bx0 - 1.1, b.bz0 - 1.1, b.bx1 + 1.1, b.bz1 + 1.1, d.id === 'mid' ? ri(1, 4) : ri(0, 2)); for (let k = k0; k < civs.length; k++) { civs[k].stand = true; civs[k].sp = 0; } }
for (let i = 0; i < 14; i++) { const x = rr(SEA.x0 + 20, SEA.x1 - 80), z = rr(700, 960); addCivRect(x, z, x + rr(20, 60), z + rr(10, 30), ri(3, 8)); }
const CIV_N = civs.length;
function civPos(c) {
  const [x0, z0, x1, z1, per] = c.r; let t = ((c.t % per) + per) % per; const w = x1 - x0, d = z1 - z0;
  if (t < w) { c.x = x0 + t; c.z = z0; c.yaw = Math.PI / 2; }
  else if (t < w + d) { c.x = x1; c.z = z0 + (t - w); c.yaw = 0; }
  else if (t < 2 * w + d) { c.x = x1 - (t - w - d); c.z = z1; c.yaw = -Math.PI / 2; }
  else { c.x = x0; c.z = z1 - (t - 2 * w - d); c.yaw = Math.PI; }
  if (c.dir < 0) c.yaw += Math.PI;
}
civs.forEach(civPos);
function civReact(pos, kind, radius) {
  for (const c of civs) { const dx = c.x - pos.x, dz = c.z - pos.z; if (dx * dx + dz * dz > radius * radius) continue; if (kind === 'cheer' && c.st !== 2) { c.st = 1; c.stT = rr(2.5, 4); } if (kind === 'flee') { c.st = 2; c.stT = rr(5, 8); c.fx = pos.x; c.fz = pos.z; } }
}
let civFrame = 0;
function simCivs(dt, center) {
  civFrame++;
  for (let i = 0; i < CIV_N; i++) {
    const c = civs[i]; const dx = c.x - center.x, dz = c.z - center.z;
    if (dx * dx + dz * dz > 260 * 260 && (i + civFrame) % 20) continue;
    if (c.stT > 0) { c.stT -= dt; if (c.stT <= 0) c.st = 0; }
    let speed = c.sp;
    if (c.st === 1) speed = 0;
    else if (c.st === 2) { const before = Math.hypot(c.x - c.fx, c.z - c.fz); c.t += c.dir * 0.5; civPos(c); const after = Math.hypot(c.x - c.fx, c.z - c.fz); c.t -= c.dir * 0.5; if (after < before) c.dir *= -1; speed = 4.8; }
    c.speed = speed; c.t += c.dir * speed * dt; civPos(c);
  }
}
// ---------- wind: updrafts & tunnels ----------
const windSystems = [], updrafts = [], tunnels = [];
const windTime = { value: 0 };
function windPoints(origin, dir, len, radius, count, speed, color, size) {
  dir = dir.clone().normalize(); const u = new V3().crossVectors(dir, Math.abs(dir.y) > 0.9 ? new V3(1, 0, 0) : UP).normalize(); const v = new V3().crossVectors(dir, u).normalize();
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) { const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * radius; arr[i * 3] = Math.cos(a) * r; arr[i * 3 + 1] = Math.sin(a) * r; arr[i * 3 + 2] = rng(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const m = new THREE.ShaderMaterial({
    uniforms: { time: windTime, uLen: { value: len }, uSpeed: { value: speed }, uO: { value: origin.clone() }, uD: { value: dir }, uU: { value: u }, uV: { value: v }, uColor: { value: new Col(color) }, uSize: { value: size } },
    vertexShader: `uniform float time,uLen,uSpeed,uSize; uniform vec3 uO,uD,uU,uV; varying float vA;
      void main(){ float s=mod(position.z*uLen+time*uSpeed,uLen); float sw=time*1.3+position.z*40.0;
        vec3 p=uO+uD*s+uU*(position.x+sin(sw)*0.8)+uV*(position.y+cos(sw)*0.8);
        vec4 mv=viewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(uSize*420.0/-mv.z,1.0,40.0);
        float f=s/uLen; vA=smoothstep(0.0,0.12,f)*smoothstep(1.0,0.8,f); }`,
    fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c); if(d>0.5) discard; gl_FragColor=vec4(uColor*vA*(1.0-d*2.0)*0.9,1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); windSystems.push(pts); return pts;
}
const columnMat = new THREE.ShaderMaterial({
  uniforms: { time: windTime, uColor: { value: new Col(0x9fe0ff) } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform float time; uniform vec3 uColor; varying vec2 vUv; void main(){ float a=(1.0-vUv.y)*0.16*(0.55+0.45*sin(vUv.y*40.0-time*5.0+vUv.x*12.566)); gl_FragColor=vec4(uColor*a,1.0); }`
});
{
  const cands = roofTops.filter(r => r.y > 45 && r.y < 260 && r.w > 12);
  for (let i = 0; i < 42 && cands.length; i++) {
    const r = cands.splice(Math.floor(rng() * cands.length), 1)[0];
    const u = { x: r.x, z: r.z, r: 9, y0: r.y, y1: r.y + 140 }; updrafts.push(u);
    windPoints(new V3(u.x, u.y0, u.z), UP, 140, u.r, 160, 22, 0x6f9fb8, 0.14);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(u.r, u.r, 60, 24, 1, true).translate(0, 30, 0), columnMat); col.position.set(u.x, u.y0, u.z); scene.add(col);
  }
  for (const [x, z] of [[345, -1100], [345, -80], [345, 340], [760, 790]]) { const u = { x, z, r: 11, y0: 0, y1: 160 }; updrafts.push(u); windPoints(new V3(x, 0, z), UP, 160, 11, 200, 22, 0x6f9fb8, 0.14); const col = new THREE.Mesh(new THREE.CylinderGeometry(u.r, u.r, 60, 24, 1, true).translate(0, 30, 0), columnMat); col.position.set(x, 0, z); scene.add(col); }
  const tdefs = [[-112.5, 150, 120, -1, 0, 380], [112.5, 170, -350, 1, 0, 420], [-187.5, 130, -600, -1, 0, 380], [37.5, 210, -100, 1, 0, 360], [187.5, 140, -950, -1, 0, 400], [-37.5, 190, 300, -1, 0, 400],
  [-300, 120, -760, 0, 1, 900], [-300, 110, 100, 0, 1, 800], [430, 90, -900, 0, 1, 500], [430, 80, 100, 0, 1, 450], [600, 70, 400, 0, -1, 600], [-150, 160, -1350, 1, 0, 450]];
  for (const [x, y, z, a, b, len] of tdefs) {
    const dir = b === 0 ? new V3(0, 0, a) : new V3(b, 0, 0); const t = { o: new V3(x, y, z), dir, len, r: 13 }; tunnels.push(t);
    windPoints(t.o, dir, len, t.r, 380, 34, 0xa08a6a, 0.16);
  }
}
function inUpdraft(p) { for (const u of updrafts) { const dx = p.x - u.x, dz = p.z - u.z; if (dx * dx + dz * dz < u.r * u.r * 1.3 && p.y > u.y0 - 2 && p.y < u.y1) return u; } return null; }
function inTunnel(p) { for (const t of tunnels) { tA.subVectors(p, t.o); const s = tA.dot(t.dir); if (s < 0 || s > t.len) continue; tA.addScaledVector(t.dir, -s); if (tA.lengthSq() < t.r * t.r * 1.4) return t; } return null; }
