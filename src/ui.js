// ================= PEOPLE POOL (rigged civilians) =================
const CIV_KEYS = ['man', 'woman', 'coat', 'guard', 'worker', 'dancer'];
const pool = []; let poolTimer = 0;
function buildPool() {
  const n = crowd.ready ? 0 : ({ ultra: 64, high: 40, medium: 28, low: 16 }[S.quality] || 28);
  for (let i = 0; i < n; i++) { const inst = makeInstance(CIV_KEYS[i % CIV_KEYS.length]); inst.group.visible = false; scene.add(inst.group); const tint = 0.85 + rng() * 0.3; inst.model.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.multiplyScalar(tint); } }); pool.push({ inst, civ: null, phase: rng() * 3 }); }
}
function assignPool(center) {
  const R = 170; const cand = [];
  for (const c of civs) { const d = (c.x - center.x) ** 2 + (c.z - center.z) ** 2; if (d < R * R) cand.push([d, c]); }
  cand.sort((a, b) => a[0] - b[0]); const want = new Set(cand.slice(0, pool.length).map(x => x[1]));
  const free = []; for (const p of pool) { if (p.civ && want.has(p.civ)) want.delete(p.civ); else { p.civ = null; free.push(p); } }
  for (const c of want) { const p = free.pop(); if (!p) break; p.civ = c; p.inst.cur = null; }
  for (const p of pool) p.inst.group.visible = !!p.civ;
}
function updatePool(dt, center) {
  poolTimer -= dt; if (poolTimer <= 0) { poolTimer = 0.4; assignPool(center); }
  for (const p of pool) {
    const c = p.civ; if (!c) continue; const g = p.inst.group;
    g.position.set(c.x, 0, c.z);
    let yawT = c.yaw; if (c.st === 1) yawT = Math.atan2(P.pos.x - c.x, P.pos.z - c.z);
    let d = yawT - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += d * Math.min(1, dt * 8);
    const a = c.st === 1 ? (p.inst.actions.dance && p.phase > 1.5 ? 'dance' : 'cheer') : c.st === 2 ? 'run' : (c.speed > 0.3 ? 'walk' : 'idle');
    playAct(p.inst, a, 0.3, { speed: a === 'walk' ? c.speed / 1.35 : 1 });
    const dist2 = (c.x - center.x) ** 2 + (c.z - center.z) ** 2;
    if (dist2 < 90 * 90 || (civFrame & 1)) p.inst.mixer.update(dist2 < 90 * 90 ? dt : dt * 2);
  }
}

// perch marker (web-zip point)
const perchEl = document.createElement('div'); perchEl.id = 'perchMark'; perchEl.innerHTML = '<i></i><b>R</b>'; document.body.appendChild(perchEl);
const _pm = new V3();
function drawPerchMark() {
  if (!perchT) { perchEl.style.opacity = 0; return; }
  _pm.copy(perchT); _pm.y += 0.4; _pm.project(camera); if (_pm.z > 1) { perchEl.style.opacity = 0; return; }
  perchEl.style.opacity = 1; perchEl.style.transform = `translate(${(_pm.x * 0.5 + 0.5) * innerWidth}px,${(-_pm.y * 0.5 + 0.5) * innerHeight}px)`;
}
// ================= POST-PROCESSING =================
let composer = null, bloomPass = null, finalPass = null;
const FinalShader = {
  uniforms: { tDiffuse: { value: null }, uSpeed: { value: 0 }, uTime: { value: 0 }, uHurt: { value: 0 }, uOD: { value: 0 }, uWarm: { value: 1 }, uSun: { value: new THREE.Vector2(0.5, 0.5) }, uSunVis: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uSpeed,uTime,uHurt,uOD,uSunVis,uWarm; uniform vec2 uSun; varying vec2 vUv;
  vec3 aces(vec3 x){ x*=0.62; const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }
  vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c,vec3(1.0/2.4))-0.055, step(0.0031308,c)); }
  float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
  void main(){
    vec2 dir=vUv-0.5; float r=length(dir);
    vec3 col=vec3(0.0); float tot=0.0; float bl=uSpeed*0.035*smoothstep(0.15,0.6,r);
    for(int i=0;i<8;i++){ float t=float(i)/7.0; float w=1.0-t*0.6; vec2 uv=vUv-dir*bl*t;
      vec3 s; s.r=texture2D(tDiffuse,uv+dir*0.0025*uSpeed).r; s.g=texture2D(tDiffuse,uv).g; s.b=texture2D(tDiffuse,uv-dir*0.0025*uSpeed).b; col+=s*w; tot+=w; }
    col/=tot;
    if(uSunVis>0.01){ vec2 dd=(vUv-uSun)*(0.85/20.0); vec2 su=vUv; float dec=1.0; vec3 sh=vec3(0.0);
      for(int i=0;i<20;i++){ su-=dd; vec3 s=texture2D(tDiffuse,clamp(su,0.001,0.999)).rgb; float b=max(dot(s,vec3(0.3,0.5,0.2))-1.1,0.0); sh+=s*min(b,4.0)*dec; dec*=0.92; }
      col+=sh*0.05*uSunVis*vec3(1.0,0.78,0.5); }
    col=aces(col*1.06);
    float l=dot(col,vec3(0.299,0.587,0.114));
    col=mix(vec3(l),col,0.92);                                   // slightly muted like late-afternoon haze
    col*=mix(vec3(1.0), mix(vec3(0.93,0.95,1.02), vec3(1.07,1.0,0.86), smoothstep(0.0,0.7,l)), uWarm); // cool shadows, warm highlights
    col=col*0.96+0.025*vec3(1.0,0.85,0.65);                      // lifted warm blacks
    col=pow(col,vec3(1.03));
    col=toSRGB(col);
    col*=1.0-smoothstep(0.45,0.95,r)*0.42;
    col=mix(col, col*vec3(1.2,0.5,0.45), uHurt*smoothstep(0.2,0.8,r));
    col+=vec3(1.0,0.6,0.2)*uOD*smoothstep(0.35,0.9,r)*0.25;
    col+=(h(vUv*vec2(1920.0,1080.0)+uTime)-0.5)*0.025;
    gl_FragColor=vec4(col,1.0);
  }`
};
function setupComposer() {
  const W = innerWidth, H = innerHeight;
  if (S.quality === 'low' || !renderer.capabilities.isWebGL2) { composer = null; renderer.toneMapping = THREE.ACESFilmicToneMapping; return; }
  const rt = new THREE.WebGLRenderTarget(W * renderer.getPixelRatio(), H * renderer.getPixelRatio(), { type: THREE.HalfFloatType, samples: S.quality === 'ultra' ? 8 : S.quality === 'high' ? 4 : 2 });
  composer = new EffectComposer(renderer, rt); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }', fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c=texture2D(tDiffuse,vUv); if(any(isnan(c.rgb))||any(isinf(c.rgb))) c.rgb=vec3(0.0); float l=max(c.r,max(c.g,c.b)); if(l>6.0) c.rgb*=6.0/l; gl_FragColor=vec4(max(c.rgb,0.0),1.0); }' }));
  const bs = S.quality === 'ultra' ? 1 : 0.5; bloomPass = new UnrealBloomPass(new THREE.Vector2(W * bs, H * bs), 0.5, 0.6, 0.95); composer.addPass(bloomPass);
  finalPass = new ShaderPass(FinalShader); finalPass.material.toneMapped = false; composer.addPass(finalPass);
}
let fpsAvg = 60, perfT = 0, prScale = 1;
function maxPR() { const base = S.quality === 'ultra' ? Math.max(1.5, Math.min(devicePixelRatio * 1.25, 2.5)) : S.quality === 'high' ? Math.min(devicePixelRatio, 2) : S.quality === 'medium' ? Math.min(devicePixelRatio, 1.25) : 0.85; return base * (S.scale || 100) / 100; }
let slowFor = 0;
function perfTune(dt) {
  fpsAvg = lerp(fpsAvg, 1 / Math.max(dt, 1e-3), 0.05); perfT += dt; if (perfT < 1.5 || !playing) return; perfT = 0;
  // still slow at the lowest render scale? step the graphics preset down
  if (fpsAvg < 36 && prScale <= 0.6) slowFor += 1.5; else slowFor = Math.max(0, slowFor - 1.5);
  if (slowFor >= 4.5 && S.autoScale !== false) { const order = ['ultra', 'high', 'medium', 'low']; const i = order.indexOf(S.quality); if (i >= 0 && i < order.length - 1) { S.quality = order[i + 1]; saveSettings(); applyQuality(); ui.notice('Graphics lowered to ' + S.quality + ' for smoother play'); slowFor = 0; return; } }
  let next = prScale; if (fpsAvg < 48) next = Math.max(0.5, prScale - 0.1); else if (fpsAvg > 58 && prScale < 1) next = Math.min(1, prScale + 0.05);
  if (S.autoScale === false) next = 1;
  if (next !== prScale) { prScale = next; const pr = Math.max(0.55, maxPR() * prScale); renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight); if (composer) { composer.setPixelRatio(pr); composer.setSize(innerWidth, innerHeight); } }
}
const ATMOS = {
  morning: { name: 'Morning', clock: '9:10 AM · MORNING', sun: [0.45, 0.62, 0.5], sunCol: 0xfff1dc, sunI: 2.6, hemiS: 0xbcd6ff, hemiG: 0x6a6455, hemiI: 0.9, fog: 0xb4c9e2, fogD: 0.00026, zen: [0.09, 0.27, 0.72], mid: [0.42, 0.6, 0.86], sunAmt: 0.45, night: 0, water: [0.55, 0.7, 0.85], exp: 1.0, warm: 0.15 },
  golden: { name: 'Golden Hour', clock: '6:52 PM · GOLDEN HOUR', sun: [0.62, 0.2, -0.76], sunCol: 0xffc68a, sunI: 2.7, hemiS: 0xc8c4d8, hemiG: 0x7a5a40, hemiI: 0.8, fog: 0xdcb48c, fogD: 0.00036, zen: [0.10, 0.21, 0.46], mid: [0.52, 0.45, 0.45], sunAmt: 1, night: 0, water: [0.85, 0.56, 0.36], exp: 1.02, warm: 1 },
  evening: { name: 'Evening', clock: '8:05 PM · EVENING', sun: [0.7, 0.05, -0.7], sunCol: 0xff8f86, sunI: 1.5, hemiS: 0x9c86cc, hemiG: 0x463650, hemiI: 0.75, fog: 0x8c6c9e, fogD: 0.0004, zen: [0.10, 0.06, 0.28], mid: [0.46, 0.28, 0.52], sunAmt: 0.8, night: 0.4, water: [0.5, 0.32, 0.55], exp: 1.05, warm: 0.35 },
  night: { name: 'Night', clock: '11:40 PM · NIGHT', sun: [-0.35, 0.55, 0.45], sunCol: 0x9fb4ff, sunI: 0.45, hemiS: 0x2c3c6a, hemiG: 0x12141c, hemiI: 0.5, fog: 0x161e33, fogD: 0.00034, zen: [0.006, 0.012, 0.035], mid: [0.03, 0.045, 0.09], sunAmt: 0, night: 1, water: [0.08, 0.1, 0.18], exp: 1.15, warm: 0 },
};
function applyAtmos(key) {
  const A = ATMOS[key] || ATMOS.golden; S.atmo = key in ATMOS ? key : 'golden'; saveSettings();
  SUN_DIR.set(...A.sun).normalize(); sun.color.setHex(A.sunCol); sun.intensity = A.sunI; hemi.color.setHex(A.hemiS); hemi.groundColor.setHex(A.hemiG); hemi.intensity = A.hemiI;
  scene.fog.color.setHex(A.fog); scene.fog.density = A.fogD; skyMat.uniforms.zen.value.setRGB(...A.zen); skyMat.uniforms.midc.value.setRGB(...A.mid); skyMat.uniforms.sunAmt.value = A.sunAmt; skyMat.uniforms.night.value = A.night;
  waterMat.uniforms.uSkyC.value.setRGB(...A.water); waterMat.uniforms.uNight.value = A.night; NIGHT_U.value = A.night; renderer.toneMappingExposure = A.exp;
  if (finalPass) finalPass.uniforms.uWarm.value = A.warm; FinalShader.uniforms.uWarm.value = A.warm;
  document.querySelectorAll('.clock').forEach(e => e.textContent = A.clock);
  document.querySelectorAll('.tSub').forEach(e => e.textContent = A.name.toUpperCase());
  if (ready) { const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(100, 48, 24), skyMat)); if (scene.environment) scene.environment.dispose(); scene.environment = pm.fromScene(es, 0.02).texture; pm.dispose(); }
  document.querySelectorAll('.atmo').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === S.atmo)));
  if ($('sAtmo')) $('sAtmo').value = S.atmo;
}
function buildAtmoChips() { for (const host of document.querySelectorAll('.atmos')) { host.innerHTML = ''; for (const k in ATMOS) { const b = document.createElement('button'); b.className = 'atmo'; b.dataset.k = k; b.textContent = ATMOS[k].name; b.onclick = () => { applyAtmos(k); sfx.ui(); }; host.appendChild(b); } } }
function applyQuality() {
  camera.far = S.quality === 'low' ? 2600 : S.quality === 'medium' ? 4500 : 9000; camera.updateProjectionMatrix(); if (S.quality === 'low') scene.fog.density = Math.max(scene.fog.density, 0.0006);
  const q = S.quality; prScale = 1; renderer.setPixelRatio(maxPR()); DETAIL_U.value = q === 'low' ? 0 : 1;
  const sh = q !== 'low'; if (renderer.shadowMap.enabled !== sh) { renderer.shadowMap.enabled = sh; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); }
  sun.castShadow = sh; const ms = q === 'ultra' ? 4096 : q === 'high' ? 2048 : 1024; { const c = sun.shadow.camera, e = q === 'ultra' ? 200 : 130; if (c.right !== e) { c.left = -e; c.right = e; c.top = e; c.bottom = -e; c.updateProjectionMatrix(); } sun.shadow.radius = q === 'ultra' ? 2 : 1; } if (sun.shadow.mapSize.x !== ms) { sun.shadow.mapSize.set(ms, ms); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  renderer.setSize(innerWidth, innerHeight); setupComposer();
}

// ================= FX =================
const fx = (() => {
  const parts = []; const geo = new THREE.SphereGeometry(1, 6, 4);
  function spawn(p, color, n, speed, size, life, grav = 1) { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true })); m.position.copy(p); m.scale.setScalar(size * rr(0.5, 1)); scene.add(m); parts.push({ m, v: new V3(rr(-1, 1), rr(0, 1.2), rr(-1, 1)).normalize().multiplyScalar(speed * rr(0.4, 1)), life, max: life, grav }); } }
  const rings = [];
  return {
    spark(p, c = 0xffe7b0) { spawn(p, c, 10, 9, 0.06, 0.35, 0.5); },
    dust(p, imp) { const m = new THREE.Mesh(new THREE.RingGeometry(0.6, 1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xd8c8b0, transparent: true, opacity: 0.6, depthWrite: false })); m.position.copy(p).add(tA.set(0, 0.08, 0)); scene.add(m); rings.push({ m, t: 0, max: 0.6, s: 2 + imp * 0.12 }); spawn(p.clone().add(tA.set(0, 0.2, 0)), 0xcbbba4, 14, 5, 0.15, 0.6, 0.2); },
    splash(p) { spawn(new V3(p.x, -1.4, p.z), 0xffffff, 30, 10, 0.2, 0.9, 1); sfx.land(1); },
    ripple(p) { const m = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false })); m.position.set(p.x, -1.45, p.z); scene.add(m); rings.push({ m, t: 0, max: 1.2, s: 4 }); },
    burst(p, c, r) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5, wireframe: true })); m.position.copy(p); scene.add(m); rings.push({ m, t: 0, max: 0.4, s: r }); spawn(p, c, 16, 10, 0.1, 0.5, 0.3); },
    update(dt) {
      for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life -= dt; q.v.y -= 15 * q.grav * dt; q.m.position.addScaledVector(q.v, dt); q.m.material.opacity = q.life / q.max; if (q.life <= 0) { scene.remove(q.m); q.m.material.dispose(); parts.splice(i, 1); } }
      for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const k = r.t / r.max; r.m.scale.setScalar(1 + k * r.s); r.m.material.opacity = 0.6 * (1 - k); if (k >= 1) { scene.remove(r.m); rings.splice(i, 1); } }
    }
  };
})();
const fxCanvas = document.getElementById('fx'), fxg = fxCanvas.getContext('2d');
const streaks = []; for (let i = 0; i < 60; i++) streaks.push({ a: rng() * 6.283, r: rng(), s: rr(0.6, 1.4) });
function drawSpeedLines(spd, dt) {
  const W = fxCanvas.width = innerWidth, H = fxCanvas.height = innerHeight; const k = clamp((spd - 34) / 40, 0, 1); if (k <= 0) return;
  fxg.strokeStyle = `rgba(255,248,235,${0.22 * k})`; fxg.lineWidth = 1.5; const cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy);
  for (const s of streaks) { s.r += dt * s.s * (1 + k * 2); if (s.r > 1) { s.r = 0.35 + rng() * 0.2; s.a = rng() * 6.283; } const r0 = s.r * R, r1 = r0 + R * 0.12 * k; fxg.beginPath(); fxg.moveTo(cx + Math.cos(s.a) * r0, cy + Math.sin(s.a) * r0); fxg.lineTo(cx + Math.cos(s.a) * r1, cy + Math.sin(s.a) * r1); fxg.stroke(); }
}

// ================= AUDIO =================
const sfx = (() => {
  let ac = null, master = null, noiseBuf = null; const B = {}; const loops = {};
  const SND = (window.MODEL_BASE || 'models/').replace('models', 'sounds');
  const FILES = ['web', 'whoosh1', 'whoosh2', 'whoosh3', 'hit1', 'hit2', 'hit3', 'hitbig', 'land', 'shot', 'boom', 'wind', 'traffic', 'engine', 'ui_achievement', 'ui_check', 'ui_back', 'ui_error'];
  function init() {
    if (ac) return; try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = S.volume / 100; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    for (const f of FILES) fetch(SND + f + '.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status)).then(x => ac.decodeAudioData(x)).then(buf => { B[f] = buf; if (f === 'wind' || f === 'traffic' || f === 'engine') startLoop(f); }).catch(() => { });
  }
  function startLoop(name) { const s = ac.createBufferSource(); s.buffer = B[name]; s.loop = true; const g = ac.createGain(); g.gain.value = 0; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 20000; s.connect(f).connect(g).connect(master); s.start(0, Math.random() * B[name].duration * 0.5); loops[name] = { s, g, f }; }
  function play(name, vol = 1, rate = 1, pan = 0) { if (!ac || !B[name]) return false; const s = ac.createBufferSource(); s.buffer = B[name]; s.playbackRate.value = rate; const g = ac.createGain(); g.gain.value = vol; let n = s.connect(g); if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); n = n.connect(p); } n.connect(master); s.start(); return true; }
  const rnd = (...n) => n[Math.floor(Math.random() * n.length)];
  function noise(dur, f0, f1, gain, type = 'bandpass', q = 2) { if (!ac) return; const s = ac.createBufferSource(); s.buffer = noiseBuf; const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, ac.currentTime); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), ac.currentTime + dur); const g = ac.createGain(); g.gain.setValueAtTime(gain, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur); s.connect(f).connect(g).connect(master); s.start(); s.stop(ac.currentTime + dur + 0.05); }
  function tone(f0, f1, dur, gain, type = 'sine', delay = 0) { if (!ac) return; const t0 = ac.currentTime + delay; const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur); const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur); o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + 0.05); }
  function panOf(x, z) { const dx = x - camera.position.x, dz = z - camera.position.z; const r = tA.set(dx, 0, dz).normalize().dot(camR); return r * 0.8; }
  function distGain(x, z, R) { return clamp(1 - Math.hypot(x - camera.position.x, z - camera.position.z) / R, 0, 1); }
  return {
    init, setVol(v) { if (master) master.gain.value = v; }, ctx: () => ac, out: () => master,
    train(k, sp) { if (!ac) return; if (!loops.trainN) { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160; const g = ac.createGain(); g.gain.value = 0; s.connect(f).connect(g).connect(master); s.start(); loops.trainN = { g, f, clk: 0 }; }
      const L = loops.trainN; L.g.gain.value = damp(L.g.gain.value, k * 0.9, 4, 1 / 60); L.f.frequency.value = 120 + sp * 6;
      L.clk -= 1 / 60; if (k > 0.05 && sp > 3 && L.clk <= 0) { L.clk = 15.8 / sp / 2; tone(70, 50, 0.08, 0.25 * k, 'square'); noise(0.05, 2200, 900, 0.12 * k); } },
    wind(spd) { const L = loops.wind; if (!L) return; const k = clamp((spd - 8) / 70, 0, 1); L.g.gain.value = damp(L.g.gain.value, k * 0.9, 6, 1 / 60); L.s.playbackRate.value = 0.75 + k * 0.6; L.f.frequency.value = 900 + k * 9000; },
    city(height, near, minD, minV) {
      const T = loops.traffic, E = loops.engine; const low = clamp(1 - (height - 4) / 140, 0.08, 1);
      if (T) T.g.gain.value = damp(T.g.gain.value, clamp(near / 14, 0.15, 1) * low * 0.55, 3, 1 / 60);
      if (E) { const k = clamp(1 - minD / 30, 0, 1) * clamp(minV / 8, 0.25, 1) * low; E.g.gain.value = damp(E.g.gain.value, k * 0.22, 5, 1 / 60); E.s.playbackRate.value = 0.45 + minV * 0.025; E.f.frequency.value = 900; }
    },
    thwip(k = 1) { if (!play('web', 0.6 * Math.min(k, 1.2), 0.96 + Math.random() * 0.08 + (k - 1) * 0.1)) noise(0.13, 4200 * k, 900, 0.3); },
    whoosh(k = 1) { if (!play(rnd('whoosh1', 'whoosh2', 'whoosh3'), 0.5 * Math.min(1.2, k + 0.2), 0.7 + 0.3 / Math.max(k, 0.3))) noise(0.35 * k + 0.1, 300, 1400, 0.25 * k, 'bandpass', 0.8); },
    land(k) { if (!play('land', clamp(k, 0.15, 1) * 0.9, 0.9 + Math.random() * 0.2)) tone(110, 40, 0.25, 0.4 * clamp(k, 0.1, 1)); },
    hit(big) { if (!play(big ? 'hitbig' : rnd('hit1', 'hit2', 'hit3'), big ? 0.9 : 0.75, 0.9 + Math.random() * 0.2)) { tone(big ? 90 : 140, 40, 0.15, 0.5); noise(0.08, 2500, 600, 0.35); } },
    parry() { tone(1500, 1450, 0.4, 0.16, 'triangle'); tone(2250, 2200, 0.3, 0.07, 'sine'); play('hit2', 0.5, 1.6); },
    hurt() { if (!play('hitbig', 0.7, 0.75)) tone(220, 80, 0.25, 0.3, 'sawtooth'); },
    shot() { if (!play('shot', 0.45, 0.95 + Math.random() * 0.1)) noise(0.12, 3000, 300, 0.4, 'lowpass'); },
    level() { if (!play('ui_achievement', 0.6)) { tone(660, 660, 0.12, 0.12, 'triangle'); tone(990, 990, 0.2, 0.12, 'triangle', 0.11); } },
    good() { if (!play('ui_check', 0.6)) sfx.level(); },
    mech() { for (let i = 0; i < 4; i++) setTimeout(() => { play('hit3', 0.4, 1.4 + i * 0.1); tone(400 + i * 120, 200, 0.1, 0.08, 'square'); }, i * 70); },
    lash() { play('whoosh2', 0.8, 0.55); play('whoosh3', 0.6, 0.7); },
    od() { play('boom', 0.6, 0.8); tone(80, 400, 0.6, 0.2, 'sawtooth'); },
    boom() { play('boom', 0.7, 1.1); },
    ui() { if (!play('ui_back', 0.35, 1.2)) tone(900, 900, 0.04, 0.06, 'triangle'); },
    horn(x, z) { if (!ac) return; const g = distGain(x, z, 160); if (g <= 0.02) return; const p = panOf(x, z); const t0 = ac.currentTime, dur = 0.25 + Math.random() * 0.35;
      const out = ac.createGain(); out.gain.setValueAtTime(0.0001, t0); out.gain.linearRampToValueAtTime(0.16 * g, t0 + 0.02); out.gain.setValueAtTime(0.16 * g, t0 + dur); out.gain.exponentialRampToValueAtTime(0.001, t0 + dur + 0.08);
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800; let n = out; if (ac.createStereoPanner) { const pn = ac.createStereoPanner(); pn.pan.value = p; out.connect(pn); n = pn; } f.connect(out); n.connect(master);
      for (const fr of [405, 510]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr * (0.97 + Math.random() * 0.06); o.connect(f); o.start(t0); o.stop(t0 + dur + 0.1); } },
    carHit() { play('hitbig', 0.8, 0.6); play('land', 0.7, 0.7); noise(0.3, 3000, 400, 0.25, 'bandpass', 0.7); },
  };
})();

// ================= SKILLS =================
const SKILLS = [
  ['Traversal', 'swing1', 'Momentum Weave', 'Swing pumps 30% harder.', null], ['Traversal', 'swing2', 'Release Kick', 'Bigger boost when you let go at the top of an arc.', 'swing1'],
  ['Traversal', 'zip', 'Quick Zip', 'Web Zip recharges 40% faster.', null], ['Traversal', 'loop', 'Centrifuge', 'Loop-the-loops fling you out 30% faster.', 'swing1'],
  ['Traversal', 'wings1', 'Thermal Rider', 'Updrafts lift Web-Wings 35% harder; faster dives.', null], ['Traversal', 'wings2', 'Tunnel Racer', 'Wind tunnels push 50% harder.', 'wings1'],
  ['Traversal', 'sling', 'Overdraw', 'Slingshot charges faster and launches 30% farther.', null], ['Traversal', 'wall', 'Wall Sprinter', 'Wall-run 30% faster.', null],
  ['Combat', 'guard', 'Iron Guard', 'Parry window 45% wider, including bullets.', null], ['Combat', 'counter', 'Counter Surge', 'Parries stun longer and give more focus.', 'guard'],
  ['Combat', 'heavy', 'Heavy Hands', 'Strikes deal 20% more damage.', null], ['Combat', 'wallthrash', 'Wall Thrash', 'Web-Yank wall slams deal double and stun nearby thugs.', 'heavy'],
  ['Combat', 'od2', 'Long Overdrive', 'Overdrive lasts 15 seconds instead of 10.', 'heavy'],
  ['Gadgets', 'bomb2', 'Bomb Pouch', 'Carry 3 Web Bombs.', null], ['Gadgets', 'mech2', 'Mech-Arms Mk II', 'Mech-Arms recharge 35% faster with a wider sweep.', null],
  ['Gadgets', 'lash2', 'Long Lash', 'Ink Lash reaches 50% farther.', 'mech2'], ['Gadgets', 'webcart', 'Dense Cartridges', 'Web shots cocoon thugs in two hits.', null],
];
function renderSkills() {
  const el = document.getElementById('trees'); el.innerHTML = ''; document.getElementById('spLine').textContent = `${P.sp} skill point${P.sp === 1 ? '' : 's'} available · each skill costs 1 · earn more by leveling up`;
  for (const tree of ['Traversal', 'Combat', 'Gadgets']) {
    const col = document.createElement('div'); col.className = 'tree'; col.innerHTML = `<h3>${tree}</h3>`;
    for (const [t, id, name, desc, req] of SKILLS) { if (t !== tree) continue;
      const own = SK(id), locked = req && !SK(req); const b = document.createElement('button'); b.className = 'skill' + (own ? ' own' : locked ? ' lock' : '');
      b.innerHTML = `<b>${name}</b><span>${desc}</span><i>${own ? 'OWNED' : locked ? 'NEEDS ' + SKILLS.find(s => s[1] === req)[2].toUpperCase() : P.sp > 0 ? 'UNLOCK · 1' : '1 POINT'}</i>`;
      b.onclick = () => { if (own || locked || P.sp <= 0) return; P.sp--; P.skills[id] = true; saveProgress(); sfx.level(); renderSkills(); };
      col.appendChild(b); }
    el.appendChild(col);
  }
}

// ================= HUD / UI =================
const $ = id => document.getElementById(id);
const ui = (() => {
  let noticeT = 0, distT = 0, lastDist = '', flashT = 0; const markers = new Map();
  return {
    trick(name, sub, big) { const d = document.createElement('div'); d.className = 'tk' + (big ? ' big' : ''); d.innerHTML = `${name}${sub ? `<small>${sub}</small>` : ''}`; const box = $('tricks'); box.appendChild(d); while (box.children.length > 4) box.firstChild.remove(); setTimeout(() => d.remove(), 1700); },
    notice(t, good) { const n = $('notice'); n.textContent = t; n.className = 'notice on' + (good ? ' good' : ''); noticeT = 3.5; },
    flash() { flashT = 0.5; }, hint(html) { const h = $('hint'); if (html) { h.innerHTML = html; h.classList.add('on'); } else h.classList.remove('on'); },
    dead() { $('fade').style.opacity = 0.85; ui.notice('Down for the count · back on a rooftop in a moment'); setTimeout(() => { P.dead = false; P.hp = 100; respawn(); $('fade').style.opacity = 0; }, 2500); },
    addMarker(c) { const m = document.createElement('div'); m.className = 'marker'; m.innerHTML = '<i></i>'; $('markers').appendChild(m); markers.set(c, m); },
    bossBar(e) { const el = $('bossBar'); if (!e) { el.classList.remove('on'); return; } const d = BOSS_DEFS[e.boss]; el.classList.add('on'); $('bossName').textContent = d.name; $('bossTitle').textContent = d.title; $('bossFill').style.transform = `scaleX(${Math.max(0, e.hp / d.hp)})`; },
    removeMarker(c) { const m = markers.get(c); if (m) m.remove(); markers.delete(c); },
    update(dt) {
      const spd = P.vel.length();
      $('spd').textContent = Math.round(spd * 3.6); const sup = supportHeight(P.pos.x, P.pos.z, P.pos.y + 0.2); $('alt').textContent = Math.max(0, Math.round(P.pos.y));
      $('mode').textContent = P.dead ? 'DOWN' : P.sling ? 'SLINGSHOT' : P.glide ? 'WEB-WINGS' : P.loop ? 'LOOP' : (P.ropes.L || P.ropes.R) ? 'SWINGING' : P.zip ? 'WEB ZIP' : P.mode === 'wall' ? 'WALL-RUN' : P.mode === 'swim' ? 'SWIMMING' : P.mode === 'ground' ? (nearEnemy(14) ? 'COMBAT' : P.pos.y > 4 ? 'ROOFTOP' : 'STREET') : P.dive ? 'DIVING' : 'AIRBORNE';
      $('hpFill').style.transform = `scaleX(${P.hp / 100})`; $('foFill').style.transform = `scaleX(${P.od > 0 ? P.od / (SK('od2') ? 15 : 10) : P.focus / 100})`;
      $('foBar').classList.toggle('full', P.focus >= 100 && P.od <= 0); $('odReady').style.opacity = P.focus >= 100 && P.od <= 0 ? 1 : 0;
      const ab = (id, cd, max, extra) => { const e = $(id); e.querySelector('em').style.transform = `scaleY(${clamp(cd / max, 0, 1)})`; e.querySelector('.ct').textContent = extra ?? (cd > 0 ? Math.ceil(cd) : ''); };
      ab('ab1', abil.mech, SK('mech2') ? 8 : 12); ab('ab2', abil.lash, 9); ab('ab3', abil.bombs > 0 ? 0 : 15 - abil.bomb, 15, '×' + abil.bombs); ab('abZ', P.od > 0 ? 0 : 100 - P.focus, 100, P.od > 0 ? Math.ceil(P.od) : '');
      const c = $('combo'); if (P.combo >= 3) { c.style.opacity = 1; c.innerHTML = `×${P.combo}<small>STYLE${P.combo >= 5 ? ' · ' + (1 + Math.floor(P.combo / 5) * 0.5) + 'X XP' : ''}</small>`; } else c.style.opacity = 0;
      const need = 250 + P.level * 150; $('lvl').textContent = 'LV ' + P.level; $('xpFill').style.transform = `scaleX(${P.xp / need})`; $('sp').textContent = P.sp > 0 ? `${P.sp} SKILL POINT${P.sp > 1 ? 'S' : ''} · TAB` : '';
      if (noticeT > 0) { noticeT -= dt; if (noticeT <= 0) $('notice').classList.remove('on'); }
      flashT -= dt; $('flash').style.opacity = clamp(flashT * 2, 0, 1) + (P.hp < 30 ? 0.35 : 0);
      distT -= dt; if (distT <= 0) { distT = 0.5; const dn = districtAt(P.pos.x, P.pos.z); if (dn !== lastDist) { lastDist = dn; $('distName').textContent = dn; const el = $('district'); el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 3200); } }
      for (const [cr, m] of markers) { const p = tA.copy(cr.pos).add(tB.set(0, 3, 0)).project(camera); let x = (p.x * 0.5 + 0.5) * innerWidth, y = (-p.y * 0.5 + 0.5) * innerHeight; if (p.z > 1) { x = innerWidth - x; y = innerHeight - 40; } x = clamp(x, 40, innerWidth - 40); y = clamp(y, 60, innerHeight - 60); m.style.left = x + 'px'; m.style.top = y + 'px'; m.firstChild.textContent = Math.round(cr.pos.distanceTo(P.pos)) + ' M'; }
      let h = null; if (P.mode === 'ground' && P.pos.y > 30 && !nearEnemy(20) && P.airT === 0 && gameTime < 25) h = 'Hold <kbd>LMB</kbd> or <kbd>RMB</kbd> to swing · <kbd>Space</kbd> to jump off';
      else if (P.mode === 'air' && !P.glide && P.vel.y < -25 && gameTime < 60) h = '<kbd>G</kbd> deploys Web-Wings · <kbd>Space</kbd> Web Zip';
      else if (nearEnemy(10) && P.mode === 'ground' && gameTime < 400) h = '<kbd>LMB</kbd> strike · <kbd>RMB</kbd> web · <kbd>Q</kbd> parry the ring · <kbd>C</kbd> dodge · <kbd>T</kbd> yank';
      ui.hint(h);
    }
  };
})();
// minimap
const miniCv = $('mini'), mg = miniCv.getContext('2d'); const MAP_S = 0.5;
const mapImg = (() => { const x0 = -360, z0 = -1560, W = 1650 * MAP_S, H = 2600 * MAP_S; const c = makeCanvas(W, H), g = c.getContext('2d'); const draw = () => { g.fillStyle = '#16303e'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#4b4a48'; for (const L of LANDS) g.fillRect((L.x0 - x0) * MAP_S, (L.z0 - z0) * MAP_S, (L.x1 - L.x0) * MAP_S, (L.z1 - L.z0) * MAP_S);
  g.fillStyle = '#4f6b3a'; for (const r of parkRects) g.fillRect((r[0] - x0) * MAP_S, (r[2] - z0) * MAP_S, (r[1] - r[0]) * MAP_S, (r[3] - r[2]) * MAP_S);
  for (const b of boxes) { if (b.y1 < 4 || b.tag === 3) continue; const l = clamp(110 + b.y1 * 0.5, 110, 235); g.fillStyle = `rgb(${l},${l - 6},${l - 14})`; g.fillRect((b.x0 - x0) * MAP_S, (b.z0 - z0) * MAP_S, Math.max(1, (b.x1 - b.x0) * MAP_S), Math.max(1, (b.z1 - b.z0) * MAP_S)); }
  g.strokeStyle = '#ff9f1c'; g.lineWidth = 5; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo((RAIL.x + sx * RAIL.gap - x0) * MAP_S, (RAIL.z0 - z0) * MAP_S); g.lineTo((RAIL.x + sx * RAIL.gap - x0) * MAP_S, (RAIL.z1 - z0) * MAP_S); g.stroke(); }
  }; draw(); return { c, x0, z0, draw }; })();
function redrawMap() { mapImg.draw(); }
function drawMini() {
  const S2 = miniCv.width, c = S2 / 2; mg.save(); mg.clearRect(0, 0, S2, S2); mg.beginPath(); mg.arc(c, c, c, 0, Math.PI * 2); mg.clip(); mg.fillStyle = '#16303e'; mg.fillRect(0, 0, S2, S2);
  const zoom = 1.25; mg.translate(c, c); mg.rotate(yaw); mg.scale(zoom, zoom); mg.drawImage(mapImg.c, -(P.pos.x - mapImg.x0) * MAP_S, -(P.pos.z - mapImg.z0) * MAP_S);
  const W = (x, z) => [(x - P.pos.x) * MAP_S, (z - P.pos.z) * MAP_S];
  mg.fillStyle = 'rgba(143,216,255,.85)'; for (const u of updrafts) { const [x, y] = W(u.x, u.z); if (Math.abs(x) < 150 && Math.abs(y) < 150) { mg.beginPath(); mg.arc(x, y, 2.4, 0, 7); mg.fill(); } }
  for (const t of TRAINS) { let [x, y] = W(t.x, t.c); const d = Math.hypot(x, y), m = c / zoom - 8; if (d > m) { x *= m / d; y *= m / d; } mg.fillStyle = '#ff9f1c'; mg.strokeStyle = '#111'; mg.lineWidth = 1.5; mg.beginPath(); mg.arc(x, y, 4.5, 0, 7); mg.fill(); mg.stroke(); }
  for (const cr of crimes) { let [x, y] = W(cr.pos.x, cr.pos.z); const d = Math.hypot(x, y), m = c / zoom - 8; if (d > m) { x *= m / d; y *= m / d; } mg.save(); mg.translate(x, y); mg.rotate(-yaw + Math.PI / 4); mg.fillStyle = '#ea2a3d'; mg.fillRect(-5, -5, 10, 10); mg.restore(); }
  mg.restore(); mg.save(); mg.translate(c, c); mg.fillStyle = '#f7efe2'; mg.beginPath(); mg.moveTo(0, -11); mg.lineTo(8, 9); mg.lineTo(0, 4); mg.lineTo(-8, 9); mg.closePath(); mg.fill(); mg.restore();
  mg.fillStyle = 'rgba(247,239,226,.8)'; mg.font = '700 20px Archivo, sans-serif'; mg.textAlign = 'center'; const nx = -Math.sin(-yaw) * (c - 18), ny = -Math.cos(-yaw) * (c - 18); mg.fillText('N', c + nx, c + ny + 7);
}

// ================= MENUS & INPUT =================
let menuMode = 'menu', menuT = 0;
function buildSuitCards() {
  for (const host of [$('suitsMenu'), $('suitsPause')]) { host.innerHTML = '';
    if (!window.HIDE_BUILTIN) SUITS.forEach((s, i) => { const b = document.createElement('button'); b.className = 'suit'; b.dataset.i = i; b.innerHTML = `<span class="sw"><i style="background:#${s.red.toString(16).padStart(6, '0')}"></i><i style="background:#${s.blue.toString(16).padStart(6, '0')}"></i><i class="em" style="background:#${s.emb.toString(16).padStart(6, '0')}"></i></span><b>${s.name}</b><small>${s.blurb}</small>`; b.onclick = () => { (typeof wearBuiltIn === 'function' ? wearBuiltIn : applySuit)(i); setSuitButtons(); sfx.ui(); }; host.appendChild(b); });
    for (const m of (typeof customModels !== 'undefined' ? customModels : [])) { const b = document.createElement('button'); b.className = 'suit custom'; b.dataset.key = m.key; b.innerHTML = `<span class="sw"><i style="background:linear-gradient(135deg,#333,#777)"></i></span><b>${m.name.replace(/\.(glb|gltf)$/i, '')}</b><small>Your model · its own textures</small>`; b.onclick = () => { wearCustom(m.key); sfx.ui(); }; host.appendChild(b); }
  }
  setSuitButtons();
}
function setSuitButtons() { const ck = typeof customActive !== 'undefined' ? customActive : null; document.querySelectorAll('.suit').forEach(b => b.setAttribute('aria-pressed', String(ck ? b.dataset.key === ck : (b.dataset.i !== undefined && +b.dataset.i === suitIdx)))); }
function leaveTitle() { if (menuMode !== 'title') return; sfx.init(); music.start(sfx.ctx(), sfx.out()); menuMode = 'menu'; $('title').classList.add('out'); setTimeout(() => { $('title').hidden = true; $('menu').hidden = false; }, 450); }
addEventListener('keydown', e => { if (menuMode === 'title' && ready) { e.preventDefault(); leaveTitle(); } }, true);
addEventListener('pointerdown', () => { if (menuMode === 'title' && ready) leaveTitle(); }, true);
function startGame() {
  sfx.init(); music.fadeOut(2.5); $('menu').hidden = true; $('hud').classList.add('on'); playing = true; paused = false; menuMode = 'play';
  if (!startGame.done) { startGame.done = true; const r = P._menuR; P.pos.set(r.x, r.y + 0.1, r.z); P.mode = 'ground'; P.vel.set(0, 0, 0); P.facing.copy(P._titleD); yaw = Math.atan2(-P.facing.x, -P.facing.z); pitch = -0.05; camPos.copy(P.pos).add(new V3(0, 2.5, 6)); if (window.__pole) window.__pole.visible = false; }
  lockPointer();
}
function lockPointer() { if (document.body.classList.contains('touch')) return; try { const p = renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
function pauseGame(on) {
  if (menuMode === 'menu' || menuMode === 'title') return; paused = on; $('pause').hidden = !on; if (on) { renderSkills(); syncSettings(); for (const h in P.ropes) { P.ropes[h] = null; P.pending[h] = null; } } else lockPointer();
}
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && playing && !paused && menuMode === 'play') pauseGame(true); });
$('play').onclick = startGame; $('resume').onclick = () => pauseGame(false); $('respawnBtn').onclick = () => { respawn(); pauseGame(false); };
$('openSet').onclick = () => { $('menuSet').hidden = !$('menuSet').hidden; };
document.querySelectorAll('.tab').forEach(t => t.onclick = () => { document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-selected', String(x === t))); for (const id of ['suits', 'skills', 'settings', 'controls', 'credits']) $('tab-' + id).hidden = id !== t.dataset.tab; sfx.ui(); });
function syncSettings() { S.scale = S.scale || 100; const map = { sAssist: 'assist', sFall: 'fall', sSens: 'sens', sFov: 'fov', sVol: 'volume', sScale: 'scale' }; $('sAuto').value = S.autoScale === false ? '0' : '1'; for (const id in map) { const el = $(id); el.value = S[map[id]]; $('o' + id.slice(1)).textContent = S[map[id]]; } $('sQual').value = S.quality; $('sInv').value = S.invertY ? '1' : '0'; }
for (const [id, key] of [['sAssist', 'assist'], ['sFall', 'fall'], ['sSens', 'sens'], ['sFov', 'fov'], ['sVol', 'volume'], ['sScale', 'scale']]) $(id).addEventListener('input', e => { S[key] = +e.target.value; $('o' + id.slice(1)).textContent = S[key]; if (key === 'volume') sfx.setVol(S.volume / 100); saveSettings(); });
$('sScale').addEventListener('change', () => applyQuality()); $('sAuto').onchange = e => { S.autoScale = e.target.value === '1'; saveSettings(); applyQuality(); };
$('sAtmo').onchange = e => applyAtmos(e.target.value);
$('sQual').onchange = e => { S.quality = e.target.value; saveSettings(); applyQuality(); }; $('sInv').onchange = e => { S.invertY = e.target.value === '1'; saveSettings(); };
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault()); document.addEventListener('contextmenu', e => { if (playing) e.preventDefault(); });
renderer.domElement.addEventListener('mousedown', e => { if (!playing || paused) return; if (!document.pointerLockElement) lockPointer(); if (e.button === 0) fireWeb('L'); else if (e.button === 2) fireWeb('R'); });
addEventListener('mouseup', e => { if (e.button === 0) releaseWeb('L'); else if (e.button === 2) releaseWeb('R'); });
addEventListener('mousemove', e => { if (!playing || paused) return; if (!document.pointerLockElement && !(e.buttons)) return; if (Math.abs(e.movementX) > 220 || Math.abs(e.movementY) > 220) return; const s = 0.0004 + S.sens / 100 * 0.004; yaw -= e.movementX * s; pitch -= e.movementY * s * (S.invertY ? -1 : 1); pitch = clamp(pitch, -1.35, 1.2); lastLook = gameTime; });
addEventListener('keydown', e => {
  if (e.code === 'Tab' || e.code === 'Escape') { e.preventDefault(); if (playing) pauseGame(!paused); return; }
  if (!playing || paused) return; if (['Space', 'ShiftLeft', 'KeyQ', 'KeyF'].includes(e.code)) e.preventDefault();
  if (e.repeat) return; keys[e.code] = true;
  switch (e.code) {
    case 'KeyR': perchZip(); break;
    case 'Space': if (P.mode === 'ground') P.jumpCharge = 0; else if (P.mode === 'wall') wallJump(); else webZip(); break;
    case 'KeyG': if (P.mode === 'air' && !P.ropes.L && !P.ropes.R) setGlide(!P.glide); break;
    case 'KeyF': startSling(); break; case 'KeyE': doTrick(); break; case 'KeyQ': parry(); break; case 'KeyC': dodge(); break; case 'KeyT': webYank(); break;
    case 'Digit1': useAbility(1); break; case 'Digit2': useAbility(2); break; case 'Digit3': useAbility(3); break; case 'KeyZ': useAbility(4); break;
  }
});
addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'Space') jumpRelease(); if (e.code === 'KeyF') releaseSling(); });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; releaseWeb('L'); releaseWeb('R'); });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); if (composer) { composer.setSize(innerWidth, innerHeight); } });

// ================= MAIN LOOP =================
const FIXED = 1 / 120; let acc = 0, last = performance.now(), ready = false;
function menuCamera(dt) {
  menuT += dt;
  if (!P._menuSet) { P._menuSet = true;
    const nycR = roofTops.filter(r => r.bld && r.y > 40 && r.w > 14 && Math.abs(r.x) < 200 && r.z > -400 && r.z < 300).sort((a, b) => b.y - a.y); const r = nycR[0] || roofTops.filter(r => r.y > 120 && r.y < 330 && r.w > 9 && r.x < -40 && r.z > 60 && r.z < 440).sort((a, b) => b.y - a.y)[0] || roofTops[0];
    const d = new V3(LANDMARK.x - r.x, 0, LANDMARK.z - r.z).normalize(); const rt = new V3(-d.z, 0, d.x);
    const edge = new V3(r.x + d.x * (r.w / 2 - 0.6), r.y, r.z + d.z * (r.d / 2 - 0.6));
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 9, 12).translate(0, 4.5, 0), new THREE.MeshStandardMaterial({ color: 0x3b4046, metalness: 0.8, roughness: 0.35, map: TEX.metal }));
    pole.position.copy(edge).addScaledVector(rt, 0.5); pole.castShadow = true; scene.add(pole); window.__pole = pole;
    P._menuR = r; P._titleD = d.clone(); P._titleRt = rt; P._polePos = pole.position.clone();
    P.pos.copy(edge).add(new V3(0, 2.6, 0)); P.mode = 'ground'; P.facing.copy(d).negate().addScaledVector(rt, -0.7).normalize();
  }
  const d = P._titleD, rt = P._titleRt; const sway = Math.sin(menuT * 0.15) * 0.25;
  if (window.__closeup) { const f = P.facing; const ch = window.__closeup === 2, bk = window.__closeup === 3 ? -1 : 1; camera.position.set(P.pos.x + bk * f.x * (ch ? 0.7 : 1.6), P.pos.y + (ch ? 1.7 : 1.35), P.pos.z + bk * f.z * (ch ? 0.7 : 1.6)); camera.lookAt(P.pos.x, P.pos.y + (ch ? 1.68 : 1.15), P.pos.z); camera.fov = 45; camera.updateProjectionMatrix(); }
  else {
    camera.position.copy(P.pos).addScaledVector(d, -4.2).addScaledVector(rt, -1.5 + sway).add(new V3(0, 0.55 + Math.sin(menuT * 0.2) * 0.08, 0));
    const k = innerWidth > 900 ? 1 : 0.2; const look = P.pos.clone().addScaledVector(d, 12).addScaledVector(rt, -5.5 * k).add(new V3(0, 2.6, 0));
    camera.lookAt(look); camera.fov = 52; camera.updateProjectionMatrix();
  }
  hero.group.position.copy(P.pos); basisQ(UP, P.facing, heroQ); hero.group.quaternion.copy(heroQ); playAct(hero, 'idle', 0.3); hero.mixer.update(dt);
  const pt = P._polePos.clone().add(new V3(0, P.pos.y - P._polePos.y + 2.4, 0));
  const hl = handWorld('L', new V3()), hr = handWorld('R', new V3()); const leftNear = hl.distanceTo(P._polePos) < hr.distanceTo(P._polePos);
  const aim = pt.clone().sub(leftNear ? hl : hr).normalize();
  applyHeroPose({ pose: POSES.cling, w: { spine: 1, armL: 1, armR: 1, legs: 1, hips: 1 }, rate: 6, [leftNear ? 'aimL' : 'aimR']: aim }, dt); updateCatPack(dt);
}
function frame(now) {
  requestAnimationFrame(frame); const realDt = Math.min(0.05, (now - last) / 1000); last = now; if (!ready) return;
  if (slowT > 0) { slowT -= realDt; if (slowT <= 0) slowTarget = 1; }
  const tsTarget = P.sling && P.mode === 'air' ? 0.3 : slowTarget; timeScale = damp(timeScale, tsTarget, 12, realDt);
  const dt = realDt * timeScale; windTime.value += dt; skyMat.uniforms.time.value += dt; waterMat.uniforms.time.value += realDt;
  if (playing && !paused) {
    gameTime += dt; updateCamVectors(); acc += dt; let n = 0;
    while (acc >= FIXED && n < 8) { playerStep(FIXED); acc -= FIXED; n++; } if (n === 8) acc = 0;
    updatePlayerAct(dt); updateFinisher(dt); updateEnemies(dt); updateBossFX(dt); updateShots(dt); updateAbilities(dt); updateCrimes(dt);
    if (!P.dead && gameTime - P.lastHurt > 6 && P.hp < 100) P.hp = Math.min(100, P.hp + 8 * dt);
    updateHeroVisual(dt); updateCamera(dt, realDt); ui.update(realDt); drawMini(); drawSpeedLines(P.vel.length(), realDt); sfx.wind(P.vel.length()); sfx.city(camera.position.y, trafficInfo.near, trafficInfo.minD, trafficInfo.minV);
    if (Math.random() < realDt * 0.12 && trafficInfo.near > 6 && camera.position.y < 60) { const c = vehicles[Math.floor(Math.random() * vehicles.length)]; if (c.x !== undefined && Math.hypot(c.x - camera.position.x, c.z - camera.position.z) < 150) sfx.horn(c.x, c.z); }
  } else if (menuMode === 'menu' || menuMode === 'title') menuCamera(realDt);
  const focus = playing ? P.pos : camera.position;
  updateTraffic(dt); updateTrains(dt); if (playing) trainSound(); simCivs(dt, focus); updatePool(dt, camera.position); updateCrowd(dt); updateBuildings(); if (playing) { findPerch(dt); drawPerchMark(); } fx.update(dt);
  if (window._ferris) { const f = window._ferris; f.group.rotation.z += dt * 0.05; for (const gnd of f.gondolas) { const a = gnd.userData.a; gnd.position.set(Math.cos(a) * ferris.r, Math.sin(a) * ferris.r - 1.6, 0); gnd.rotation.z = -f.group.rotation.z; } }
  { const ts = (sun.shadow.camera.right * 2) / sun.shadow.mapSize.x * 4; tC.set(Math.round(focus.x / ts) * ts, Math.round(focus.y / ts) * ts, Math.round(focus.z / ts) * ts); sun.position.copy(tC).addScaledVector(SUN_DIR, 500); sun.target.position.copy(tC); } sky.position.copy(camera.position);
  if (composer) { finalPass.uniforms.uSpeed.value = playing ? clamp((P.vel.length() - 30) / 50, 0, 1) : 0; finalPass.uniforms.uTime.value = now * 0.001; finalPass.uniforms.uHurt.value = playing ? clamp(1 - P.hp / 60, 0, 1) : 0; finalPass.uniforms.uOD.value = suitU.uOD.value;
    { const sp = tA.copy(camera.position).addScaledVector(SUN_DIR, 3000).project(camera); const facing = camera.getWorldDirection(tB).dot(SUN_DIR); finalPass.uniforms.uSun.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5); finalPass.uniforms.uSunVis.value = sp.z < 1 ? smooth(0.2, 0.7, facing) * (1 - smooth(0.9, 1.4, Math.max(Math.abs(sp.x), Math.abs(sp.y)))) : 0; }
    composer.render(realDt); perfTune(realDt); }
  else { renderer.render(scene, camera); perfTune(realDt); }
}
async function boot() {
  const bar = $('loadFill'), txt = $('loadTxt');
  try {
    await loadAllChars(p => { bar.style.transform = `scaleX(${0.2 + p * 0.7})`; txt.textContent = `Loading rigged characters · ${Math.round(p * 100)}%`; });
    txt.textContent = 'Filling the streets'; await Promise.all([loadCrowd().catch(e => console.warn('crowd', e)), loadProps().catch(e => console.warn('props', e)), loadBuildings().catch(e => console.warn('buildings', e))]);
    txt.textContent = 'Parking the traffic'; await loadVehicles().catch(e => console.warn('vehicles', e));
    txt.textContent = 'Fitting the suit';
    buildAtmoChips(); applyAtmos(S.atmo || 'golden');
    { const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(100, 48, 24), skyMat)); scene.environment = pm.fromScene(es, 0.02).texture; hemi.intensity = 0.45; facadeMats.forEach(m => m.envMapIntensity = 0.5); suitMat.envMapIntensity = 1.0; }
    buildHero(); buildPool(); buildSuitCards(); loadSuitList(); syncSettings(); applyQuality(); renderSkills();
    bar.style.transform = 'scaleX(1)'; ready = true; menuMode = 'title'; $('menu').hidden = true; $('title').hidden = false; setTimeout(() => { $('loading').classList.add('gone'); }, 300);
  } catch (err) { console.error(err); txt.textContent = 'Could not load the characters: ' + err.message; }
}
requestAnimationFrame(frame); boot();
window.__dbg = () => ({ pos: P.pos.toArray().map(v => +v.toFixed(1)), vel: +P.vel.length().toFixed(1), mode: P.mode, ropes: !!(P.ropes.L || P.ropes.R), glide: P.glide, pool: pool.filter(p => p.civ).length, crowd: crowd.meshes.reduce((a, m) => a + m.count, 0), enemies: enemies.length, calls: renderer.info.render.calls, tris: renderer.info.render.triangles });
window.applySuit = applySuit;
