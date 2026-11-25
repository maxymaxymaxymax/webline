// ================= CROWD (GPU-skinned instanced pedestrians, baked animation) + PROPS =================
const crowd = { ready: false, meshes: [], vars: [], clips: null, time: { value: 0 } };
const CROWD_PAL_N = 256;
async function loadCrowd() {
  const base = window.MODEL_BASE || 'models/', ext = window.MODEL_EXT === '.wasm' ? '.wasm' : '.glb';
  const [J, buf] = await Promise.all([fetch(base + 'people.json').then(r => r.json()), fetch(base + 'people' + ext).then(r => r.arrayBuffer())]);
  const NB = J.nb, F = J.frames;
  const anim = new Float32Array(buf, J.anim, F * NB * 12);
  const at = new THREE.DataTexture(anim, NB * 3, F, THREE.RGBAFormat, THREE.FloatType); at.needsUpdate = true;
  // palettes: one row per look, one texel per body region
  const pal = new Uint8Array(16 * CROWD_PAL_N * 4); const R = mulberry32(77);
  const pick = a => a[Math.floor(R() * a.length)];
  const SKIN = [0xf1c8a8, 0xe0ac88, 0xc68a62, 0x9c6844, 0x7a4e30, 0x5a3820, 0xf5d5bd, 0xd29b74];
  const TOPS = [0xeeeeee, 0x1d2230, 0x7a1f24, 0x2f4a6e, 0x3d5a3a, 0xc9b48a, 0x555b63, 0xd8603a, 0x8a8f96, 0x222222, 0xb83a52, 0x4f6fa8, 0xe2c64a, 0x6b4a7a];
  const BOTS = [0x2a3346, 0x1e1e22, 0x4a5a78, 0x6b5a45, 0x8b8070, 0x33373d, 0x223355, 0xa59a86];
  const SHOES = [0x111111, 0xeeeeee, 0x4a3022, 0x2a2a30, 0x7a6a5a];
  const HAIR = [0x1a1410, 0x2e2018, 0x4a3020, 0x6b4a2a, 0xa07a4a, 0xd0b07a, 0x8a8a8a, 0x101010];
  const OUT = [0x2b2e35, 0x5a4636, 0x1d2a3e, 0x6d6a60, 0x3b3b3b, 0x7a2a2a, 0x2f3f2f, 0xa8946c];
  const ACC = [0x3a2a20, 0x111111, 0x7a1e1e, 0x1e3a6e, 0xc0a060];
  for (let p = 0; p < CROWD_PAL_N; p++) {
    const sk = pick(SKIN), hr = pick(HAIR);
    const cols = [sk, pick(TOPS), pick(BOTS), pick(SHOES), hr, pick(OUT), pick(ACC), 0x1b1b1e, 0xe8e4dc, 0x6a8ab0, 0x141416, new Col(sk).multiplyScalar(0.78).getHex(), 0x1a1210, new Col(hr).multiplyScalar(1.15).getHex(), new Col(hr).multiplyScalar(1.3).getHex(), 0x888888];
    for (let r = 0; r < 16; r++) { const c = new Col(cols[r]); const o = (p * 16 + r) * 4; pal[o] = c.r * 255; pal[o + 1] = c.g * 255; pal[o + 2] = c.b * 255; pal[o + 3] = 255; }
  }
  const pt = new THREE.DataTexture(pal, 16, CROWD_PAL_N); pt.needsUpdate = true;
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0 });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uAnim = { value: at }; sh.uniforms.uPal = { value: pt }; sh.uniforms.uCTime = crowd.time;
    sh.vertexShader = `uniform highp sampler2D uAnim; uniform sampler2D uPal; uniform float uCTime;
attribute vec4 pSi; attribute vec4 pSw; attribute float pReg; attribute float pAo; attribute float pOpt; attribute vec4 iAnim; attribute vec2 iPal; varying vec3 vPCol;
mat4 cBone(int b,int f){ vec4 r0=texelFetch(uAnim,ivec2(b*3,f),0), r1=texelFetch(uAnim,ivec2(b*3+1,f),0), r2=texelFetch(uAnim,ivec2(b*3+2,f),0);
  return mat4(r0.x,r1.x,r2.x,0.0, r0.y,r1.y,r2.y,0.0, r0.z,r1.z,r2.z,0.0, r0.w,r1.w,r2.w,1.0); }
` + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `
  float cft=mod(max(uCTime-iAnim.z,0.0)*30.0*iAnim.w, iAnim.y); int cf0=int(iAnim.x)+int(floor(cft)); int cf1=int(iAnim.x)+int(mod(floor(cft)+1.0,iAnim.y)); float ca=fract(cft);
  mat4 SM=mat4(0.0);
  for(int k=0;k<4;k++){ float w=pSw[k]; if(w>0.001){ int b=int(pSi[k]+0.5); SM+=w*(cBone(b,cf0)*(1.0-ca)+cBone(b,cf1)*ca); } }
  vec3 objectNormal=normalize(mat3(SM)*normal);
  vPCol=pow(texelFetch(uPal,ivec2(int(pReg+0.5),int(iPal.x+0.5)),0).rgb,vec3(2.2))*mix(0.6,1.05,pAo);`)
      .replace('#include <begin_vertex>', `vec3 transformed=(SM*vec4(position,1.0)).xyz; { int om=int(pOpt+0.5); int msk=int(iPal.y+0.5); if(om!=0 && (om&msk)==0) transformed=vec3(0.0); }`);
    sh.fragmentShader = 'varying vec3 vPCol;\n' + sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse*vPCol, opacity );');
  };
  const CAPS = [8, 22, 70];
  J.variants.forEach((v, vi) => {
    const lods = v.lods.map((L, li) => {
      const g = new THREE.BufferGeometry(); const n = L.nv;
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf.slice(L.pos, L.pos + n * 12)), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(buf.slice(L.nrm, L.nrm + n * 12)), 3));
      g.setAttribute('pReg', new THREE.BufferAttribute(new Uint8Array(buf.slice(L.reg, L.reg + n)), 1));
      g.setAttribute('pAo', new THREE.BufferAttribute(new Uint8Array(buf.slice(L.ao, L.ao + n)), 1, true));
      g.setAttribute('pSi', new THREE.BufferAttribute(new Uint8Array(buf.slice(L.si, L.si + n * 4)), 4));
      g.setAttribute('pSw', new THREE.BufferAttribute(new Uint8Array(buf.slice(L.sw, L.sw + n * 4)), 4, true));
      g.setAttribute('pOpt', new THREE.BufferAttribute(new Uint8Array(buf.slice(L.opt, L.opt + n)), 1));
      g.setIndex(new THREE.BufferAttribute(new Uint16Array(buf.slice(L.idx, L.idx + L.nt * 6)), 1));
      const cap = CAPS[li]; const m = new THREE.InstancedMesh(g, mat, cap);
      m.ia = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); m.ip = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2);
      g.setAttribute('iAnim', m.ia); g.setAttribute('iPal', m.ip);
      m.ia.setUsage(THREE.DynamicDrawUsage); m.ip.setUsage(THREE.DynamicDrawUsage); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false; m.count = 0; m.castShadow = false; m.receiveShadow = true; scene.add(m); crowd.meshes.push(m); return m;
    });
    crowd.vars.push({ v, lods });
  });
  crowd.clips = J.clips;
  // give every civilian a look
  const IDLE = ['idle', 'talk', 'phone', 'idlePockets', 'idleCrossed', 'idleHip', 'listen', 'talk2', 'idleShift'];
  const REACT = ['cheer', 'wave', 'clap', 'photo', 'point', 'lookUp'];
  for (const c of civs) {
    const vi = Math.floor(rng() * crowd.vars.length), v = crowd.vars[vi].v; c.pv = vi; c.pal = Math.floor(rng() * CROWD_PAL_N);
    let mask = 1 << Math.floor(rng() * 3);
    if (v.optHat && rng() < 0.22) mask |= 8; if (v.glasses || rng() < 0.12) mask |= 16; if (v.optBag && rng() < 0.4) mask |= 32; if (v.optScarf && rng() < 0.3) mask |= 64; if (v.optCup && rng() < 0.2) mask |= 128;
    c.mask = mask;
    c.walkClip = v.old ? 'walkOld' : (rng() < 0.15 ? 'walkPhone' : (crowd.clips[v.walk] ? v.walk : 'walk'));
    const wc = crowd.clips[c.walkClip]; c.sp = wc.stride / (wc.len / 30) * rr(0.92, 1.08);
    c.idleClip = v.old ? 'idleOld' : IDLE[Math.floor(rng() * IDLE.length)]; c.reactClip = REACT[Math.floor(rng() * REACT.length)];
    if (c.stand) c.sp = 0;
    c.ry = c.yaw; c.clip = ''; c.t0 = 0;
  }
  crowd.ready = true;
}
const _cFr = new THREE.Frustum(), _cPM = new THREE.Matrix4(), _cS = new THREE.Sphere(new V3(), 1.2);
function updateCrowd(dt) {
  if (!crowd.ready) return;
  crowd.time.value += dt; const T = crowd.time.value;
  for (const m of crowd.meshes) m.count = 0;
  _cPM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _cFr.setFromProjectionMatrix(_cPM);
  const q = S.quality, RMAX = q === 'ultra' ? 260 : q === 'high' ? 210 : q === 'medium' ? 170 : 120;
  const L0 = q === 'low' ? 10 : 22, L1 = q === 'low' ? 45 : 70;
  const cx = camera.position.x, cz = camera.position.z, cy = camera.position.y;
  for (let i = 0; i < CIV_N; i++) {
    const c = civs[i]; const dx = c.x - cx, dz = c.z - cz; const d2 = dx * dx + dz * dz;
    if (d2 > RMAX * RMAX) continue;
    const y = c.y || 0; _cS.center.set(c.x, y + 0.9, c.z); if (!_cFr.intersectsSphere(_cS)) continue;
    const dist = Math.sqrt(d2 + (cy - y) * (cy - y));
    const li = dist < L0 ? 0 : dist < L1 ? 1 : 2; let m = crowd.vars[c.pv].lods[li];
    if (m.count >= m.instanceMatrix.count) { m = crowd.vars[c.pv].lods[2]; if (m.count >= m.instanceMatrix.count) continue; }
    // pick clip from state
    let clip, rate = 1;
    if (c.st === 1) clip = c.reactClip;
    else if (c.st === 2) { clip = 'flee'; rate = (c.speed || 4.8) / (crowd.clips.flee.stride / (crowd.clips.flee.len / 30)); }
    else if ((c.speed || 0) > 0.2) { clip = c.walkClip; const wc = crowd.clips[clip]; rate = c.speed / (wc.stride / (wc.len / 30)); }
    else clip = c.idleClip;
    if (clip !== c.clip) { c.clip = clip; c.t0 = T - rng() * 2; }
    const C = crowd.clips[clip];
    let yawT = c.yaw; if (c.st === 1) yawT = Math.atan2(P.pos.x - c.x, P.pos.z - c.z);
    let dd = yawT - c.ry; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); c.ry += dd * Math.min(1, dt * 7);
    const k = m.count++, a = m.instanceMatrix.array, o = k * 16, co = Math.cos(c.ry), si = Math.sin(c.ry);
    a[o] = co; a[o + 1] = 0; a[o + 2] = -si; a[o + 3] = 0; a[o + 4] = 0; a[o + 5] = 1; a[o + 6] = 0; a[o + 7] = 0; a[o + 8] = si; a[o + 9] = 0; a[o + 10] = co; a[o + 11] = 0; a[o + 12] = c.x; a[o + 13] = y; a[o + 14] = c.z; a[o + 15] = 1;
    m.ia.array[k * 4] = C.row; m.ia.array[k * 4 + 1] = C.len; m.ia.array[k * 4 + 2] = c.t0; m.ia.array[k * 4 + 3] = rate;
    m.ip.array[k * 2] = c.pal; m.ip.array[k * 2 + 1] = c.mask;
  }
  for (const m of crowd.meshes) if (m.count) { m.instanceMatrix.needsUpdate = true; m.ia.needsUpdate = true; m.ip.needsUpdate = true; }
}
// ---------- props (street furniture + rooftop equipment) ----------
async function loadProps() {
  const g = await gltfLoader.loadAsync((window.MODEL_BASE || 'models/') + 'props' + (window.MODEL_EXT || '.glb'));
  const geos = {}; g.scene.traverse(o => { if (o.isMesh) geos[o.name] = o.geometry; });
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.1 });
  const R = mulberry32(31); const lists = {}; const M = new THREE.Matrix4(), Qy = new Qt(), S1 = new V3(1, 1, 1);
  const put = (name, x, y, z, yaw, r = 2) => { if (!geos[name]) return; (lists[name] || (lists[name] = [])).push({ m: M.compose(new V3(x, y, z), Qy.setFromAxisAngle(UP, yaw), S1).clone(), c: null, r }); };
  for (const r of roofTops) {
    if (r.w < 8 || r.d < 8) continue; const hx = r.w / 2 - 2, hz = r.d / 2 - 2; const n = 1 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) put(R() < 0.6 ? 'hvac' : 'vents', r.x + (R() * 2 - 1) * hx, r.y - 1, r.z + (R() * 2 - 1) * hz, Math.floor(R() * 4) * Math.PI / 2, 2);
    if (R() < 0.3) put('dish', r.x + (R() * 2 - 1) * hx, r.y - 1, r.z + (R() * 2 - 1) * hz, R() * 6.28, 1.5);
    if (R() < 0.12) put('antenna', r.x + (R() * 2 - 1) * hx * 0.5, r.y - 1, r.z + (R() * 2 - 1) * hz * 0.5, R() * 6.28, 7);
    if (R() < 0.08 && r.w > 14) put('shed', r.x - hx + 1.5, r.y - 1, r.z + hz - 0.2, 0, 4);
    if (R() < 0.05 && r.w > 16 && r.d > 14) put('garden', r.x, r.y - 1, r.z, Math.floor(R() * 4) * Math.PI / 2, 4);
    if (R() < 0.05 && r.y < 70 && r.w > 14) put('billboard', r.x, r.y - 1, r.z + hz - 1, 0, 9);
  }
  for (const d of DIST) for (const b of d.blocks) {
    const sides = [[b.bx0 - 3.2, (b.bz0 + b.bz1) / 2, Math.PI / 2, b.bz1 - b.bz0, 0], [b.bx1 + 3.2, (b.bz0 + b.bz1) / 2, -Math.PI / 2, b.bz1 - b.bz0, 0], [(b.bx0 + b.bx1) / 2, b.bz0 - 3.2, 0, b.bx1 - b.bx0, 1], [(b.bx0 + b.bx1) / 2, b.bz1 + 3.2, Math.PI, b.bx1 - b.bx0, 1]];
    for (const [sx, sz, yaw, len, alongX] of sides) {
      const n = Math.floor(len / 22);
      for (let i = 0; i < n; i++) {
        if (R() < 0.45) continue; const t = (R() - 0.5) * (len - 6); const x = alongX ? sx + t : sx, z = alongX ? sz : sz + t;
        const k = R(); const name = k < 0.18 ? 'signpole' : k < 0.3 ? 'payphone' : k < 0.42 ? 'bike' : k < 0.52 ? 'dumpster' : k < 0.6 ? 'drum' : k < 0.7 ? 'bikekiosk' : k < 0.8 ? 'barrier' : k < 0.9 ? 'cone' : 'fence';
        put(name, x, 0.15, z, yaw + (name === 'bike' ? Math.PI / 2 : 0), 2);
      }
    }
    if (d.id === 'mid' && R() < 0.12) put('subway', b.bx0 - 3.6, 0.15, (b.bz0 + b.bz1) / 2, Math.PI / 2, 3);
  }
  const sh = S.quality === 'high' || S.quality === 'ultra';
  for (const name in lists) chunkedInstances(geos[name], mat, lists[name], sh && name !== 'cone');
}
// ---------- real building models ----------
async function loadBuildings() {
  if (!bldLots.length) return;
  const byModel = {}; for (const L of bldLots) (byModel[L.n] || (byModel[L.n] = [])).push(L);
  const CELL = 260, hiQ = S.quality === 'high' || S.quality === 'ultra';
  const patch = m => { if (m.userData.lodP) return; m.userData.lodP = 1; const prev = m.onBeforeCompile; m.onBeforeCompile = sh => { sh.uniforms.uLodR = LOD_U; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBW;').replace('#include <project_vertex>', '#include <project_vertex>\nvBW=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vBW; uniform float uLodR;').replace('void main() {', 'void main() {\nif(distance(vBW.xz,cameraPosition.xz)>uLodR) discard;'); }; m.customProgramCacheKey = () => 'bld' + m.uuid; m.needsUpdate = true; };
  await Promise.all(Object.keys(byModel).map(async n => {
    const g = await gltfLoader.loadAsync((window.MODEL_BASE || 'models/') + 'bld/' + n + (window.MODEL_EXT || '.glb'));
    const B = BLD_DEF[n]; const cx = (B[0] + B[1]) / 2, cz = (B[4] + B[5]) / 2; g.scene.updateMatrixWorld(true);
    const meshes = []; g.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
    const cells = new Map(); for (const L of byModel[n]) { const k = Math.floor(L.x / CELL) + ',' + Math.floor(L.z / CELL); (cells.get(k) || cells.set(k, []).get(k)).push(L); }
    const M = new THREE.Matrix4(), T = new THREE.Matrix4(), q = new Qt();
    for (const o of meshes) {
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
      const mats = [].concat(o.material); for (const mm of mats) { patch(mm); if (!o.geometry.attributes.normal) mm.flatShading = true; if (mm.map) mm.map.anisotropy = 4; mm.envMapIntensity = 0.6; }
      for (const list of cells.values()) {
        const im = new THREE.InstancedMesh(o.geometry, o.material, list.length); const box = new THREE.Box3();
        list.forEach((L, i) => { T.makeTranslation(-cx, -B[2], -cz); M.compose(new V3(L.x, 0, L.z), q.setFromAxisAngle(UP, L.yaw), new V3(L.s, L.s, L.s)).multiply(T).multiply(o.matrixWorld); im.setMatrixAt(i, M); box.expandByPoint(new V3(L.x - L.W, 0, L.z - L.W)); box.expandByPoint(new V3(L.x + L.W, L.H, L.z + L.W)); });
        im.geometry = o.geometry; im.instanceMatrix.needsUpdate = true; im.castShadow = hiQ; im.receiveShadow = true;
        im.frustumCulled = false; im.userData.bs = box.getBoundingSphere(new THREE.Sphere()); scene.add(im); crowd.bld.push(im);
      }
    }
  }));
}
crowd.bld = [];
const _bf = new THREE.Frustum(), _bm = new THREE.Matrix4();
function updateBuildings() {
  if (!crowd.bld.length) return; const q = S.quality; LOD_U.value = q === 'ultra' ? 700 : q === 'high' ? 420 : q === 'medium' ? 260 : 170;
  _bm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _bf.setFromProjectionMatrix(_bm); const cp = camera.position;
  for (const im of crowd.bld) { const s = im.userData.bs; const dx = s.center.x - cp.x, dz = s.center.z - cp.z; im.visible = Math.hypot(dx, dz) - s.radius < LOD_U.value && _bf.intersectsSphere(s); }
}
