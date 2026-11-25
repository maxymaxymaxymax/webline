// ================= CITY =================
const boxes = []; const GRID = 40; const grid = new Map(); let QID = 1;
const gkey = (gx, gz) => gx * 65536 + gz;
function addBox(x0, y0, z0, x1, y1, z1, tag) {
  const b = { x0, y0, z0, x1, y1, z1, q: 0, tag: tag || 0 }; boxes.push(b);
  const gx0 = Math.floor(x0 / GRID), gx1 = Math.floor(x1 / GRID), gz0 = Math.floor(z0 / GRID), gz1 = Math.floor(z1 / GRID);
  for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) { const k = gkey(gx, gz); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(b); }
  return b;
}
function forBoxesNear(x0, z0, x1, z1, fn) {
  const q = ++QID;
  for (let gx = Math.floor(x0 / GRID); gx <= Math.floor(x1 / GRID); gx++) for (let gz = Math.floor(z0 / GRID); gz <= Math.floor(z1 / GRID); gz++) {
    const a = grid.get(gkey(gx, gz)); if (!a) continue;
    for (const b of a) { if (b.q === q) continue; b.q = q; fn(b); }
  }
}
function rayBox(o, d, b) {
  let tmin = -Infinity, tmax = Infinity;
  for (const ax of ['x', 'y', 'z']) {
    const lo = b[ax + '0'], hi = b[ax + '1'];
    if (Math.abs(d[ax]) < 1e-9) { if (o[ax] < lo || o[ax] > hi) return -1; }
    else { let t1 = (lo - o[ax]) / d[ax], t2 = (hi - o[ax]) / d[ax]; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return -1; }
  }
  if (tmax < 0) return -1; return tmin >= 0 ? tmin : -1;
}
function boxNormal(b, p) {
  const e = [[Math.abs(p.x - b.x0), -1, 0, 0], [Math.abs(p.x - b.x1), 1, 0, 0], [Math.abs(p.y - b.y0), 0, -1, 0], [Math.abs(p.y - b.y1), 0, 1, 0], [Math.abs(p.z - b.z0), 0, 0, -1], [Math.abs(p.z - b.z1), 0, 0, 1]];
  let m = e[0]; for (const x of e) if (x[0] < m[0]) m = x; return new V3(m[1], m[2], m[3]);
}
function raycast(o, d, maxD) {
  let best = maxD, hb = null; const q = ++QID; const step = GRID * 0.5;
  for (let t = 0; t <= maxD + step; t += step) {
    if (hb && best < t - GRID) break;
    const tt = Math.min(t, maxD); const gx = Math.floor((o.x + d.x * tt) / GRID), gz = Math.floor((o.z + d.z * tt) / GRID);
    for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) {
      const a = grid.get(gkey(gx + ox, gz + oz)); if (!a) continue;
      for (const b of a) { if (b.q === q) continue; b.q = q; const r = rayBox(o, d, b); if (r >= 0 && r < best) { best = r; hb = b; } }
    }
  }
  if (!hb) return null;
  const p = new V3().copy(d).multiplyScalar(best).add(o);
  return { t: best, point: p, normal: boxNormal(hb, p), box: hb };
}
function boxAt(x, y, z, pad = 0) { let found = null; forBoxesNear(x - 1, z - 1, x + 1, z + 1, b => { if (!found && x >= b.x0 - pad && x <= b.x1 + pad && z >= b.z0 - pad && z <= b.z1 + pad && y >= b.y0 - pad && y <= b.y1 + pad) found = b; }); return found; }
function supportHeight(x, z, maxY) { let h = onLand(x, z) ? 0 : -1.5; forBoxesNear(x, z, x, z, b => { if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && b.y1 <= maxY + 0.01 && b.y1 > h) h = b.y1; }); return h; }

const LANDS = [];
function onLand(x, z) { for (const r of LANDS) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return true; return false; }

// ---------- building lists ----------
const bInst = [[], [], []], plainInst = [];
const PAL = {
  glass: [0x8b98a6, 0x6d7d8c, 0xa69d8b, 0x5b6a78, 0x9aa7b0, 0x7c8a8f, 0xb3a58c],
  brick: [0x9c5c46, 0x87563f, 0xb08a6a, 0xc9b79a, 0x7b4a38, 0xa8705a, 0xd3c4a8, 0x8f6f5a],
  conc: [0xc9c2b6, 0xd8d1c4, 0x9f9d98, 0xbfb4a1, 0xe0d6c2, 0xa8a49a]
};
const darker = (c, f) => new Col(c).multiplyScalar(f).getHex();
function seg(x, y, z, w, h, d, style, c) { bInst[style].push({ x, y, z, w, h, d, c }); return addBox(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, 1); }
function plain(x, y, z, w, h, d, c, collide = true) { plainInst.push({ x, y, z, w, h, d, c }); if (collide) return addBox(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, 2); }
const roofTops = [], wtList = [], acList = [], antList = [], bbList = [], treeList = [], lampList = [];

// ---------- real building models (Sketchfab, CC-BY) placed on lots; a facade box stands in far away ----------
const BLD_ON = true;
const BLD_DEF = { // [x0,x1,y0,y1,z0,z1] model bounds, target height (m), far-LOD facade style
  brown: [-0.093, -0.065, 0, 0.067, -0.068, -0.009, 22, 1], fireesc: [-5.961, 5.091, -0.048, 19.938, -4.707, 4.692, 22, 1], modular: [-2.41, 5.41, 0, 12.159, -0.41, 8.41, 26, 1],
  bg1: [-46.757, -24.772, 0.399, 41.25, -26.806, -4.866, 46, 1], oldnyc: [-2.523, 50.291, 1.674, 118.276, -83.79, 11.346, 60, 2], whitehall: [-31.217, 29.146, -1.603, 90.952, -11.434, 12.512, 88, 2],
  annex: [-19.249, 18.204, -0.166, 131.802, -43.017, 26.095, 125, 2], hirise: [-2604.071, 2390.008, 3.6, 14376.985, -2315.437, 2312.805, 150, 2],
  chrysler: [-13.501, 13.4, 0, 179.7, -13.9, 13.8, 300, 0], park432: [-5.876, 5.842, 0.084, 151.253, -12.002, 8.264, 360, 2], cpt: [-44.25, 9.75, -147.995, 34.806, 140.366, 166.175, 380, 0],
  fifth: [12.253, 52.5, 0, 231.6, -14.003, 15.994, 290, 0], park270: [-23.007, 12.414, -70.534, 79.266, 63.66, 80.324, 230, 0] };
const bldLots = [], lodInst = [[], [], []];
function pickBld(w, d, h) {
  let best = null, bs = 1e9;
  for (const n in BLD_DEF) { const B = BLD_DEF[n]; const s = B[6] / (B[3] - B[2]); const fw = (B[1] - B[0]) * s, fd = (B[5] - B[4]) * s;
    for (const rot of [0, 1]) { const W = rot ? fd : fw, D = rot ? fw : fd; const f = Math.min(1.15, w / W, d / D); if (f < 0.55) continue; const fill = (W * f * D * f) / (w * d); if (fill < 0.35) continue;
      const sc = Math.abs(Math.log(B[6] * f / Math.max(h, 12))) + (1 - fill) * 0.8 + rng() * 0.5; if (sc < bs) { bs = sc; best = { n, rot, f, s, fw, fd }; } } }
  return best;
}
function tower(x, z, w, d, h, style, c) {
  if (BLD_ON) { const m = pickBld(w, d, h); if (m) { const B = BLD_DEF[m.n]; const S2 = m.s * m.f; const H = B[6] * m.f; const W = (m.rot ? m.fd : m.fw) * m.f, D = (m.rot ? m.fw : m.fd) * m.f;
      const yaw = (m.rot ? Math.PI / 2 : 0) + (rng() < 0.5 ? Math.PI : 0); bldLots.push({ n: m.n, x, z, yaw, s: S2, H, W, D });
      if (B[7] === 0) { for (const [y0, y1, k] of [[0, 0.6, 1], [0.6, 0.8, 0.72], [0.8, 0.9, 0.45]]) addBox(x - W * k / 2, H * y0, z - D * k / 2, x + W * k / 2, H * y1, z + D * k / 2, 1); }
      else addBox(x - W / 2, 0, z - D / 2, x + W / 2, H * 0.995, z + D / 2, 1); lodInst[B[7]].push({ x, y: 0, z, w: W * 0.98, h: H * (B[7] === 0 ? 0.62 : 0.98), d: D * 0.98, c: B[7] === 1 ? 0x9a5a44 : B[7] === 2 ? 0xc9c2b6 : 0x7f93a6 });
      if (B[7] !== 0) roofTops.push({ x, y: H * 0.995 + 1, z, w: W, d: D, bld: true }); return H; } }
  let y = 0, cw = w, cd = d;
  const tiers = h > 85 && rng() < 0.55 ? ri(2, 4) : 1;
  for (let t = 0; t < tiers; t++) {
    const rem = h - y; const th = t === tiers - 1 ? rem : rem * rr(0.35, 0.55);
    seg(x, y, z, cw, th, cd, style, c);
    if (style !== 0 && th > 8) { const pc = darker(c, 0.82); for (const sx of [-1, 1]) for (const sz of [-1, 1]) plain(x + sx * (cw / 2 - 0.3), y, z + sz * (cd / 2 - 0.3), 1.2, th, 1.2, pc, false); }
    if (style === 0 && h > 60 && th > 20) { const fc = darker(c, 0.7); const n = Math.floor(cw / 4.5); for (let k = 1; k < n; k++) { const fx = x - cw / 2 + k * cw / n; plain(fx, y, z + cd / 2 + 0.2, 0.18, th, 0.45, fc, false); plain(fx, y, z - cd / 2 - 0.2, 0.18, th, 0.45, fc, false); } }
    if (style === 1) plain(x, y + th, z, cw + 0.9, 0.9, cd + 0.9, darker(c, 0.8));
    else plain(x, y + th, z, cw + 0.3, 1.1, cd + 0.3, darker(c, 0.7));
    y += th; if (t < tiers - 1) { cw *= rr(0.66, 0.84); cd *= rr(0.66, 0.84); }
  }
  if (h > 12) { const pc = darker(style === 1 ? c : 0xc9c2b4, 0.82), t = 0.5, ph = 1.15, py = y + (style === 1 ? 0.9 : 1.1); plain(x, py, z - cd / 2 + t / 2, cw, ph, t, pc); plain(x, py, z + cd / 2 - t / 2, cw, ph, t, pc); plain(x - cw / 2 + t / 2, py, z, t, ph, cd - 2 * t, pc); plain(x + cw / 2 - t / 2, py, z, t, ph, cd - 2 * t, pc); }
  roofDetails(x, y + 1, z, cw, cd, h, style, c);
  roofTops.push({ x, y: y + 1, z, w: cw, d: cd });
  return y;
}
function roofDetails(x, y, z, w, d, h, style, c) {
  if (h < 90 && w > 9 && d > 9 && rng() < 0.42) { const px = x + rr(-w / 4, w / 4), pz = z + rr(-d / 4, d / 4); wtList.push([px, y, pz]); addBox(px - 2.4, y, pz - 2.4, px + 2.4, y + 8.6, pz + 2.4, 3); }
  const n = ri(0, w * d > 300 ? 4 : 2);
  for (let i = 0; i < n; i++) acList.push([x + rr(-w / 2 + 2, w / 2 - 2), y, z + rr(-d / 2 + 2, d / 2 - 2), rng() < .5 ? 0 : Math.PI / 2]);
  if (w > 10 && rng() < 0.5) plain(x + rr(-w / 5, w / 5), y, z + rr(-d / 5, d / 5), rr(4, 7), rr(3, 4.5), rr(4, 7), darker(c, 0.75));
  if (h > 140 && rng() < 0.5) { const ah = rr(18, 45); antList.push([x, y, z, ah]); addBox(x - 0.5, y, z - 0.5, x + 0.5, y + ah, z + 0.5, 3); }
  else if (h > 110 && style === 0 && rng() < 0.4) { seg(x, y, z, w * 0.55, rr(8, 14), d * 0.55, 0, c); }
  if (h > 18 && h < 70 && rng() < 0.07 && w > 12) bbList.push({ x, y, z, w, d, rot: rng() < .5 ? 0 : Math.PI / 2, v: ri(0, 3) });
}
function plaza(x0, x1, z0, z1) {
  plainInst.push({ x: (x0 + x1) / 2, y: 0, z: (z0 + z1) / 2, w: x1 - x0, h: 0.2, d: z1 - z0, c: 0xb9b0a0 });
  const n = Math.floor((x1 - x0) * (z1 - z0) / 160);
  for (let i = 0; i < n; i++) treeList.push([rr(x0 + 3, x1 - 3), 0, rr(z0 + 3, z1 - 3), rr(0.8, 1.3)]);
}
function park(x0, x1, z0, z1) {
  parkRects.push([x0 - 3, x1 + 3, z0 - 3, z1 + 3]);
  const n = Math.floor((x1 - x0) * (z1 - z0) / 70);
  for (let i = 0; i < n; i++) treeList.push([rr(x0, x1), 0, rr(z0, z1), rr(0.9, 1.6)]);
}
const parkRects = [];

// ---------- districts ----------
const DIST = [
  { id: 'mid', name: 'MIDTOWN', x0: -300, x1: 300, z0: -1500, z1: 430, cw: 75, cd: 50, road: 14, kind: 'mid', blocks: [] },
  { id: 'east', name: 'EASTBANK', x0: 390, x1: 1150, z0: -1500, z1: -330, cw: 70, cd: 56, road: 12, kind: 'east', blocks: [] },
  { id: 'south', name: 'SOUTHPORT', x0: 390, x1: 1150, z0: -250, z1: 610, cw: 72, cd: 48, road: 12, kind: 'south', blocks: [] },
];
const SEA = { id: 'sea', name: 'SEABREEZE PIER', x0: 320, x1: 1220, z0: 690, z1: 1000 };
const NYC_ON = false;
const NYC = NYC_ON ? { x0: -248, x1: 248, z0: -540, z1: 246 } : { x0: 1e6, x1: 1e6, z0: 1e6, z1: 1e6 };
const inNYC = (x0, x1, z0, z1) => x1 > NYC.x0 && x0 < NYC.x1 && z1 > NYC.z0 && z0 < NYC.z1;
const LANDMARK = { x: 37.5, z: 275 }, DECO = { x: -37.5, z: -775 };

function hMid(x, z) {
  const core = 78 + 150 * Math.exp(-(((z + 760) / 240) ** 2)) + 180 * Math.exp(-(((z - 210) / 165) ** 2)) + 45 * Math.exp(-(((z + 300) / 200) ** 2));
  return core * (1 - 0.42 * smooth(150, 300, Math.abs(x)));
}
function blockMid(x0, x1, z0, z1) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  if (cx > -230 && cx < 230 && cz > -1260 && cz < -1000) { park(x0, x1, z0, z1); return; }
  if (Math.abs(cx - LANDMARK.x) < 5 && Math.abs(cz - LANDMARK.z) < 5) { plaza(x0, x1, z0, z1); return; }
  if (Math.abs(cx - DECO.x) < 5 && Math.abs(cz - DECO.z) < 5) return;
  let H = hMid(cx, cz) * rr(0.55, 1.25); if (rng() < 0.06) H *= 1.5; H = clamp(H, 48, 330);
  if (rng() < 0.035) { plaza(x0, x1, z0, z1); return; }
  const w = x1 - x0, d = z1 - z0;
  if (H > 115 && rng() < 0.7) {
    const style = rng() < 0.65 ? 0 : 2; const col = pick(style ? PAL.conc : PAL.glass);
    if (rng() < 0.5) { seg(cx, 0, cz, w, rr(10, 18), d, 2, pick(PAL.conc)); tower(cx + rr(-4, 4), cz, w * rr(0.5, 0.72), d * rr(0.7, 0.88), H, style, col); }
    else tower(cx, cz, w * rr(0.8, 0.95), d * rr(0.86, 0.96), H, style, col);
    return;
  }
  const nx = ri(1, 3), nz = rng() < 0.5 ? 1 : 2; const lw = w / nx, ld = d / nz;
  for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
    const h = clamp(H * rr(0.5, 1.15), 10, 300);
    const style = h > 70 ? (rng() < 0.55 ? 0 : 2) : (rng() < 0.62 ? 1 : 2);
    const m = rr(0.3, 1.6);
    tower(x0 + lw * (a + 0.5), z0 + ld * (b + 0.5), lw - m, ld - m, h, style, pick(style === 0 ? PAL.glass : style === 1 ? PAL.brick : PAL.conc));
  }
}
function blockEast(x0, x1, z0, z1) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
  if (rng() < 0.05) { plaza(x0, x1, z0, z1); return; }
  if (rng() < (cx < 700 ? 0.55 : 0.4)) { const st = rng() < .55 ? 0 : 2; tower(cx, cz, w * rr(0.6, 0.85), d * rr(0.7, 0.9), rr(60, 210), st, pick(st ? PAL.conc : PAL.glass)); return; }
  if (rng() < 0.06) { tower(cx, cz, w * 0.95, d * 0.92, rr(10, 16), 2, pick(PAL.conc)); return; } // warehouse
  const nx = ri(2, 3), nz = ri(1, 2), lw = w / nx, ld = d / nz;
  for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
    const h = rr(22, 60); const style = rng() < 0.6 ? 1 : 2;
    tower(x0 + lw * (a + 0.5), z0 + ld * (b + 0.5), lw - rr(0.3, 1.5), ld - rr(0.3, 1.5), h, style, pick(style === 1 ? PAL.brick : PAL.conc));
  }
}
function blockSouth(x0, x1, z0, z1) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
  if (rng() < 0.04) { park(x0, x1, z0, z1); return; }
  if (rng() < (cx < 650 ? 0.6 : 0.42)) { tower(cx, cz, w * rr(0.6, 0.9), d * rr(0.7, 0.9), rr(60, 190), rng() < .6 ? 0 : 2, pick(PAL.glass)); return; }
  const nx = ri(3, 5), lw = w / nx;
  for (let b = 0; b < 2; b++) for (let a = 0; a < nx; a++) {
    const h = rr(14, 28); const ld = d / 2;
    tower(x0 + lw * (a + 0.5), z0 + ld * (b + 0.5), lw - 0.2, ld - rr(1, 3), h, 1, pick(PAL.brick));
  }
  if (rng() < 0.5) for (let k = 0; k < 4; k++) treeList.push([x0 + rr(0, w), 0, z0 - 1.6, rr(0.7, 1)]);
}
const BLOCKGEN = { mid: blockMid, east: blockEast, south: blockSouth };

for (const d of DIST) {
  d.nx = Math.round((d.x1 - d.x0) / d.cw); d.nz = Math.round((d.z1 - d.z0) / d.cd);
  d.x1 = d.x0 + d.nx * d.cw; d.z1 = d.z0 + d.nz * d.cd;
  LANDS.push({ x0: d.x0, z0: d.z0, x1: d.x1, z1: d.z1 });
  for (let i = 0; i < d.nx; i++) for (let j = 0; j < d.nz; j++) {
    const bx0 = d.x0 + i * d.cw + d.road / 2 + 3, bx1 = d.x0 + (i + 1) * d.cw - d.road / 2 - 3;
    const bz0 = d.z0 + j * d.cd + d.road / 2 + 3, bz1 = d.z0 + (j + 1) * d.cd - d.road / 2 - 3;
    if (d.id === 'mid' && inNYC(bx0 - 8, bx1 + 8, bz0 - 8, bz1 + 8)) continue;
    d.blocks.push({ bx0, bx1, bz0, bz1, cx: (bx0 + bx1) / 2, cz: (bz0 + bz1) / 2, d });
    BLOCKGEN[d.kind](bx0, bx1, bz0, bz1);
    if (rng() < (d.kind === 'mid' ? 0.45 : 0.7)) { const n = ri(2, 6); for (let k = 0; k < n; k++) { const side = ri(0, 3), t = rr(0.1, 0.9); const tx = side < 2 ? lerp(bx0, bx1, t) : (side === 2 ? bx0 - 1.7 : bx1 + 1.7), tz = side < 2 ? (side === 0 ? bz0 - 1.7 : bz1 + 1.7) : lerp(bz0, bz1, t); treeList.push([tx, 0, tz, rr(0.75, 1.15)]); } }
    if ((i + j) % 2 === 0) { lampList.push([bx0 - 1.2, bz0 - 1.2, Math.PI * 1.25]); lampList.push([bx1 + 1.2, bz1 + 1.2, Math.PI * 0.25]); }
  }
}
LANDS.push({ x0: SEA.x0, z0: SEA.z0, x1: SEA.x1, z1: SEA.z1 });

// ---------- landmarks ----------
const landmarkMeshes = [];
{ // Meridian Spire: tapered glass obelisk
  const H = 400, r0 = 20, r1 = 6; const g = new THREE.CylinderGeometry(r1, r0, H, 4, 1, false); g.rotateY(Math.PI / 4); g.translate(0, H / 2, 0);
  const m = new THREE.Mesh(g, makeFacadeMat(0, 0x8ea2b4)); m.position.set(LANDMARK.x, 0, LANDMARK.z); m.castShadow = m.receiveShadow = true; landmarkMeshes.push(m);
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 2.6, 70, 8).translate(0, H + 35, 0), new THREE.MeshStandardMaterial({ color: 0xcfd6dd, metalness: 0.9, roughness: 0.25 }));
  sp.position.copy(m.position); landmarkMeshes.push(sp);
  for (let k = 0; k < 12; k++) { const y0 = k * H / 12, y1 = (k + 1) * H / 12; const hw = lerp(r0, r1, (k + 0.5) / 12) * 0.7071; addBox(LANDMARK.x - hw, y0, LANDMARK.z - hw, LANDMARK.x + hw, y1, LANDMARK.z + hw, 1); }
  addBox(LANDMARK.x - 1.5, H, LANDMARK.z - 1.5, LANDMARK.x + 1.5, H + 70, LANDMARK.z + 1.5, 3);
  roofTops.push({ x: LANDMARK.x, y: H, z: LANDMARK.z, w: r1 * 1.4, d: r1 * 1.4 });
}
{ // Sterling Tower: art-deco setbacks + needle
  const c = 0xd2c8b4, x = DECO.x, z = DECO.z;
  const tiers = [[28, 120], [22, 80], [16, 45], [11, 30], [7, 18]]; let y = 0;
  for (const [w, h] of tiers) { seg(x, y, z, w, h, w, 1, c); plain(x, y + h, z, w + 1.2, 1.2, w + 1.2, darker(c, 0.8)); y += h + 1.2; }
  for (let k = 0; k < 4; k++) { const s = 6 - k * 1.3; plain(x, y, z, s, 3, s, 0xbfb6a2); y += 3; }
  const nd = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 1.4, 55, 8).translate(0, y + 27.5, 0), new THREE.MeshStandardMaterial({ color: 0xd9dee2, metalness: 0.95, roughness: 0.2 }));
  nd.position.set(x, 0, z); landmarkMeshes.push(nd); addBox(x - 1, y, z - 1, x + 1, y + 55, z + 1, 3);
}

// ---------- bridges ----------
const bridgeParts = { cables: [], hangers: [] };
function bridge(z, xA, xB, deckY, ax = 'x') {
  const len = xB - xA, w = 22, mid = (xA + xB) / 2;
  const P = (a, y, b) => ax === 'x' ? [a, y, b] : [b, y, a];
  const bx = (cx, y, cz, sx, sy, sz, col) => { const p = P(cx, y, cz); if (ax === 'x') plain(p[0], p[1], p[2], sx, sy, sz, col); else plain(p[0], p[1], p[2], sz, sy, sx, col); };
  bx(mid, deckY - 2, z, len, 2, w, 0x5d6066);
  bx(mid, deckY, z - w / 2 + 0.4, len, 1.1, 0.5, 0x8d9299); bx(mid, deckY, z + w / 2 - 0.4, len, 1.1, 0.5, 0x8d9299);
  const towers = [xA + len * 0.22, xB - len * 0.22], th = deckY + 78;
  for (const tx of towers) { for (const s of [-1, 1]) bx(tx, -2, z + s * (w / 2 + 1.5), 4, th + 2, 4, 0x9aa0a6); bx(tx, th - 6, z, 4, 4, w + 7, 0x9aa0a6); bx(tx, deckY - 12, z, 3, 3, w + 7, 0x9aa0a6); }
  for (const px of [xA + 8, xB - 8]) bx(px, -2, z, 5, deckY - 2, w - 6, 0x7d8187);
  for (const s of [-1, 1]) {
    const pts = []; const c = z + s * (w / 2 + 1.5);
    const curveY = (x) => { if (x < towers[0]) return lerp(deckY + 4, th - 2, (x - xA) / (towers[0] - xA)); if (x > towers[1]) return lerp(th - 2, deckY + 4, (x - towers[1]) / (xB - towers[1])); const t = (x - towers[0]) / (towers[1] - towers[0]); return deckY + 5 + (th - 7 - deckY) * (2 * t - 1) ** 2; };
    for (let i = 0; i <= 40; i++) { const x = xA + len * i / 40; pts.push(new V3(...P(x, curveY(x), c))); }
    bridgeParts.cables.push(new THREE.CatmullRomCurve3(pts));
    for (let x = towers[0] + 6; x < towers[1] - 3; x += 6) { const y = curveY(x); bridgeParts.hangers.push([...P(x, deckY, c), y - deckY]); }
  }
}
bridge(-1100, 270, 420, 32); bridge(-80, 270, 420, 34); bridge(340, 270, 420, 30); bridge(760, -340, -235, 18, 'z');
const archParts = [];
{ // red steel arch bridge across the Eastbank-Southport channel
  const x = 520, z0 = -345, z1 = -235, deck = 14, peak = 52, w = 18;
  plain(x, deck - 2, (z0 + z1) / 2, w, 2, z1 - z0, 0x5d6066);
  for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 30; i++) { const t = i / 30; const z = lerp(z0 + 6, z1 - 6, t); pts.push(new V3(x + s * w / 2, deck - 6 + (peak - deck + 6) * Math.sin(t * Math.PI), z)); } archParts.push(new THREE.CatmullRomCurve3(pts)); for (let i = 2; i < 30; i += 2) { const p = pts[i]; addBox(p.x - 1.2, p.y - 1.2, p.z - 1.2, p.x + 1.2, p.y + 1.2, p.z + 1.2, 3); } }
  for (const zz of [z0 + 4, z1 - 4]) plain(x, -2, zz, w + 6, deck - 2, 6, 0x8a847a);
}
const stacks = [];
{ const R = mulberry32(5); const east = DIST[1].blocks.filter(b => b.cx < 600); for (let k = 0; k < 9; k++) { const b = east[Math.floor(R() * east.length)]; const h = 50 + R() * 35; stacks.push([b.cx + (R() - 0.5) * 10, b.cz, h]); addBox(b.cx - 2.4, 0, b.cz - 2.4, b.cx + 2.4, h, b.cz + 2.4, 3); } }

// ---------- Seabreeze Pier ----------
const ferris = { x: 760, z: 790, r: 38, cy: 46 };
const coasterSupports = [];
{
  for (let i = 0; i < 26; i++) { // pavilions & stalls
    const x = rr(SEA.x0 + 20, SEA.x1 - 20), z = rr(SEA.z0 + 15, 840);
    if (Math.hypot(x - ferris.x, z - ferris.z) < 50 || (x > 900 && x < 1170 && z < 850)) continue;
    const w = rr(8, 22), d = rr(8, 18); tower(x, z, w, d, rr(5, 13), 2, pick([0xe8c39e, 0xd96c5b, 0x6aa2b8, 0xf0dcb0, 0x9bc58d]));
  }
  for (const s of [-1, 1]) { plain(ferris.x + s * 14, 0, ferris.z - 3, 2.5, ferris.cy, 2.5, 0xe9e4da); plain(ferris.x + s * 14, 0, ferris.z + 3, 2.5, ferris.cy, 2.5, 0xe9e4da); }
  addBox(ferris.x - 3, ferris.cy - 3, ferris.z - 4, ferris.x + 3, ferris.cy + 3, ferris.z + 4, 3);
  for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; const x = ferris.x + Math.cos(a) * ferris.r, y = ferris.cy + Math.sin(a) * ferris.r; addBox(x - 1.5, y - 1.5, ferris.z - 2, x + 1.5, y + 1.5, ferris.z + 2, 3); }
  plain(1080, 0, 760, 6, 72, 6, 0x3d6f9a); // drop tower
  for (let i = 0; i < 10; i++) treeList.push([rr(SEA.x0, SEA.x1), 0, rr(700, 840), 1]);
}
const coasterCurve = (() => {
  const pts = []; const cx = 1020, cz = 770;
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; const r = 60 + Math.sin(a * 3) * 18; pts.push(new V3(cx + Math.cos(a) * r * 1.4, 12 + Math.max(0, Math.sin(a * 2 + 0.6)) * 30 + Math.sin(a * 5) * 4 + (i === 3 ? 18 : 0), cz + Math.sin(a) * r * 0.75)); }
  return new THREE.CatmullRomCurve3(pts, true);
})();
for (let i = 0; i < 70; i++) { const p = coasterCurve.getPointAt(i / 70); coasterSupports.push(p); addBox(p.x - 1, p.y - 1, p.z - 1, p.x + 1, p.y + 0.6, p.z + 1, 3); addBox(p.x - 0.3, 0, p.z - 0.3, p.x + 0.3, p.y - 1, p.z + 0.3, 3); }

// ---------- build meshes ----------
const unitBox = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
// Instances are split into 300 m chunks, each with its own bounds, so the camera skips chunks it can't see.
const CHUNK = 650;
function chunkedInstances(geo, mat, items, shadow) { // items: [{ m: Matrix4, c: hex|null, r: radius }]
  const groups = new Map();
  for (const it of items) { const p = tA.setFromMatrixPosition(it.m); const k = Math.floor(p.x / CHUNK) + ',' + Math.floor(p.z / CHUNK); let g = groups.get(k); if (!g) groups.set(k, g = []); g.push(it); }
  const root = new THREE.Group(); scene.add(root);
  for (const g of groups.values()) {
    const gg = geo.clone(); const m = new THREE.InstancedMesh(gg, mat, g.length);
    const box = new THREE.Box3();
    g.forEach((it, i) => { m.setMatrixAt(i, it.m); if (it.c !== null && it.c !== undefined) m.setColorAt(i, tCol.setHex(it.c)); const p = tB.setFromMatrixPosition(it.m); box.expandByPoint(tC.copy(p).addScalar(-it.r)); box.expandByPoint(tC.copy(p).addScalar(it.r)); });
    gg.boundingSphere = box.getBoundingSphere(new THREE.Sphere()); gg.boundingBox = box.clone();
    m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = true; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    root.add(m);
  }
  return root;
}
function instBoxes(list, mat, shadow = true) {
  return chunkedInstances(unitBox, mat, list.map(b => ({ m: new THREE.Matrix4().compose(new V3(b.x, b.y, b.z), new Qt(), new V3(b.w, b.h, b.d)), c: b.c, r: Math.max(b.w, b.h, b.d) })), shadow);
}
function instGeo(geo, mat, list, setter, opts = {}) {
  if (!geo.boundingSphere) geo.computeBoundingSphere(); const gr = geo.boundingSphere.radius + geo.boundingSphere.center.length();
  return chunkedInstances(geo, mat, list.map((it, i) => { const M = new THREE.Matrix4(); setter(it, M); const s = new V3().setFromMatrixScale(M); return { m: M, c: opts.color ? opts.color(it, i) : null, r: gr * Math.max(s.x, s.y, s.z) }; }), !!opts.shadow);
}
function roadTexture(cw, cd, road, sidewalk, lot) {
  const W = 512, H = Math.round(512 * cd / cw); const c = makeCanvas(W, H); const g = c.getContext('2d'); const px = W / cw;
  g.fillStyle = '#3a3b3f'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 5000; i++) { const v = rng() < .5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},0.05)`; g.fillRect(rng() * W, rng() * H, 1.6, 1.6); }
  const r2 = road / 2 * px, sw = 3 * px;
  g.fillStyle = sidewalk; g.fillRect(r2, r2, W - 2 * r2, H - 2 * r2);
  g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 1;
  for (let x = r2; x < W - r2; x += 1.6 * px) { g.beginPath(); g.moveTo(x, r2); g.lineTo(x, r2 + sw); g.moveTo(x, H - r2 - sw); g.lineTo(x, H - r2); g.stroke(); }
  for (let y = r2; y < H - r2; y += 1.6 * px) { g.beginPath(); g.moveTo(r2, y); g.lineTo(r2 + sw, y); g.moveTo(W - r2 - sw, y); g.lineTo(W - r2, y); g.stroke(); }
  g.strokeStyle = '#dcd6ca'; g.lineWidth = 2; g.strokeRect(r2, r2, W - 2 * r2, H - 2 * r2);
  g.fillStyle = lot; g.fillRect(r2 + sw, r2 + sw, W - 2 * (r2 + sw), H - 2 * (r2 + sw));
  g.fillStyle = '#e4b322'; const yl = 0.15 * px;
  g.fillRect(r2, 0, W - 2 * r2, yl); g.fillRect(r2, H - yl, W - 2 * r2, yl); g.fillRect(0, r2, yl, H - 2 * r2); g.fillRect(W - yl, r2, yl, H - 2 * r2);
  g.fillStyle = 'rgba(240,240,235,.75)'; const lq = road / 4 * px, dl = 3 * px;
  for (let x = r2 + px; x < W - r2 - dl; x += dl * 2) { g.fillRect(x, lq, dl, 0.15 * px); g.fillRect(x, H - lq, dl, 0.15 * px); }
  for (let y = r2 + px; y < H - r2 - dl; y += dl * 2) { g.fillRect(lq, y, 0.15 * px, dl); g.fillRect(W - lq, y, 0.15 * px, dl); }
  g.fillStyle = 'rgba(245,245,240,.85)';
  for (const sx of [r2 + 0.6 * px, W - r2 - 3.6 * px]) for (let y = 0.4 * px; y < r2 - 0.3 * px; y += px) { g.fillRect(sx, y, 3 * px, 0.5 * px); g.fillRect(sx, H - y - 0.5 * px, 3 * px, 0.5 * px); }
  for (const sy of [r2 + 0.6 * px, H - r2 - 3.6 * px]) for (let x = 0.4 * px; x < r2 - 0.3 * px; x += px) { g.fillRect(x, sy, 0.5 * px, 3 * px); g.fillRect(W - x - 0.5 * px, sy, 0.5 * px, 3 * px); }
  return canvasTex(c, true, true);
}
function noiseTex(base, spots, n, size = 256) { const c = makeCanvas(size, size), g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, size, size); for (let i = 0; i < n; i++) { g.fillStyle = pick(spots); g.globalAlpha = rr(0.05, 0.25); g.fillRect(rng() * size, rng() * size, rr(1, 3), rr(1, 3)); } g.globalAlpha = 1; return canvasTex(c, true, true); }
function groundPlane(x0, x1, z0, z1, tex, uw, ud, y = 0, detail = false, ox = x0, oz = z0) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - ox) / uw, (p.getZ(i) - oz) / ud);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, polygonOffset: y > 0.01, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  if (detail) { mat.customProgramCacheKey = () => 'ground'; mat.onBeforeCompile = sh => { sh.uniforms.uDet = { value: TEX.asphalt };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vGW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGW=(modelMatrix*vec4(position,1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vGW; uniform sampler2D uDet;').replace('#include <map_fragment>', '#include <map_fragment>\n{ vec3 dt=texture2D(uDet,vGW/3.5).rgb; float l=dot(dt,vec3(0.33)); diffuseColor.rgb*=mix(1.0,l*2.6,0.75); }'); }; }
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; scene.add(m); return m;
}
const seawallMat = new THREE.MeshStandardMaterial({ color: 0x8a847a, roughness: 0.95 });
for (const L of LANDS) { const m = new THREE.Mesh(boxG(L.x1 - L.x0 + 2, 6, L.z1 - L.z0 + 2, (L.x0 + L.x1) / 2, -3.35, (L.z0 + L.z1) / 2), seawallMat); m.receiveShadow = true; scene.add(m); }
const dTex = { mid: roadTexture(75, 50, 14, '#aaa499', '#8a867f'), east: roadTexture(70, 56, 12, '#a39c90', '#7f7a72'), south: roadTexture(72, 48, 12, '#b0a493', '#857b6e') };
for (const d of DIST) {
  if (d.id !== 'mid' || !NYC_ON) { groundPlane(d.x0, d.x1, d.z0, d.z1, dTex[d.id], d.cw, d.cd, 0, true); continue; }
  groundPlane(d.x0, d.x1, d.z0, NYC.z0, dTex.mid, d.cw, d.cd, 0, true, d.x0, d.z0); groundPlane(d.x0, d.x1, NYC.z1, d.z1, dTex.mid, d.cw, d.cd, 0, true, d.x0, d.z0);
  groundPlane(d.x0, NYC.x0, NYC.z0, NYC.z1, dTex.mid, d.cw, d.cd, 0, true, d.x0, d.z0); groundPlane(NYC.x1, d.x1, NYC.z0, NYC.z1, dTex.mid, d.cw, d.cd, 0, true, d.x0, d.z0);
}
{
  const grass = noiseTex('#5f7d3e', ['#46632b', '#7a9550', '#3b5225', '#8aa25c'], 4000);
  for (const r of parkRects) groundPlane(r[0], r[1], r[2], r[3], PHOTO.grass, 4, 4, 0.18);
  const pave = noiseTex('#a89a84', ['#8a7e6a', '#bfb29c', '#978a76'], 3000); groundPlane(SEA.x0, SEA.x1, SEA.z0, 850, pave, 12, 12);
  groundPlane(SEA.x0, SEA.x1, 850, 864, PHOTO.planks, 3, 3, 0.16);
  const sand = noiseTex('#c9ad7c', ['#b0966a', '#d6bd8f', '#bba072'], 5000); groundPlane(SEA.x0, SEA.x1, 864, SEA.z1, PHOTO.sand, 5, 5, 0.02);
}
// ---------- architectural detail pass: ledges, fire escapes, awnings, window AC units ----------
{
  const R = mulberry32(911); const det = [], boxC = new THREE.BoxGeometry(1, 1, 1);
  const _q = new Qt(), _ax = new V3();
  const add = (x, y, z, w, h, d, c, axis, ang) => { const q = axis ? _q.setFromAxisAngle(_ax.copy(axis), ang) : _q.identity(); det.push({ m: new THREE.Matrix4().compose(new V3(x, y, z), q.clone(), new V3(w, h, d)), c, r: Math.max(w, h, d) }); };
  const blocked = (px, py, pz) => { let hit = false; forBoxesNear(px - 0.5, pz - 0.5, px + 0.5, pz + 0.5, b => { if (!hit && b.tag === 1 && px > b.x0 && px < b.x1 && pz > b.z0 && pz < b.z1 && py > b.y0 && py < b.y1) hit = true; }); return hit; };
  const AWN = [0x2f5d3a, 0x7a1f24, 0x1f2f55, 0x5a2a3a, 0x2a2a2a, 0x8a5a1a];
  const METAL = 0x26231f;
  for (const style of [1, 2]) for (const b of bInst[style]) {
    const fh = style === 1 ? 3.4 : 3.7, lc = darker(b.c, style === 1 ? 0.78 : 0.86);
    // horizontal ledges / string courses (wrap the whole segment)
    const every = style === 1 ? 3 : 2;
    for (let k = Math.ceil((b.y + 5) / fh); k * fh < b.y + b.h - 2; k++) if (k % every === 0) add(b.x, k * fh + (style === 1 ? 0.62 : 0.3), b.z, b.w + 0.36, 0.24, b.d + 0.36, lc);
    if (b.y === 0) { add(b.x, 4.75, b.z, b.w + 0.5, 0.5, b.d + 0.5, darker(b.c, 0.62)); add(b.x, 0.4, b.z, b.w + 0.24, 0.8, b.d + 0.24, 0x6d675e); }
    const faces = [[1, 0, b.d], [-1, 0, b.d], [0, 1, b.w], [0, -1, b.w]];
    for (const [nx, nz, len] of faces) {
      const half = (nx ? b.w : b.d) / 2; const fx = b.x + nx * half, fz = b.z + nz * half; const tx = -nz, tz = nx;
      if (blocked(fx + nx * 2.5, b.y + Math.min(b.h, 10) / 2, fz + nz * 2.5)) continue;
      const nrm = new V3(nx, 0, nz), tan = new V3(tx, 0, tz);
      // storefront awnings
      if (b.y === 0 && R() < 0.55) { const n = 1 + Math.floor(R() * Math.min(3, len / 7)); for (let i = 0; i < n; i++) { const off = (R() - 0.5) * (len - 6), w = 3 + R() * 3; add(fx + nx * 0.75 + tx * off, 3.55, fz + nz * 0.75 + tz * off, nx ? 1.5 : w, 0.12, nx ? w : 1.5, AWN[Math.floor(R() * AWN.length)], tan, -0.38); } }
      // fire escapes on brick mid-rises
      if (style === 1 && b.y === 0 && b.h > 12 && b.h < 75 && len > 9 && R() < 0.5) {
        const fw = 2.7, uC = fx * tx + fz * tz; const off0 = (R() - 0.5) * (len - 7);
        const k0 = Math.round((uC + off0) / fw - 0.5); const off = (k0 + 0.5) * fw - uC + fw * 0.5;   // centre on a window pair
        const cx = fx + tx * off + nx * 0.7, cz = fz + tz * off + nz * 0.7, W = 5.2;
        for (let f = 1; f * fh < b.h - 2; f++) {
          const py = f * fh + 0.7;
          add(cx, py, cz, nx ? 1.4 : W, 0.07, nx ? W : 1.4, METAL);                                          // platform
          add(cx + nx * 0.68, py + 0.95, cz + nz * 0.68, nx ? 0.05 : W, 0.05, nx ? W : 0.05, METAL);           // top rail
          add(cx + nx * 0.68, py + 0.5, cz + nz * 0.68, nx ? 0.03 : W, 0.03, nx ? W : 0.03, METAL);            // mid rail
          for (const e of [-1, 1]) add(cx + nx * 0.68 + tx * e * W / 2, py + 0.48, cz + nz * 0.68 + tz * e * W / 2, 0.05, 0.95, 0.05, METAL);
          if ((f + 1) * fh < b.h - 2) { const dir = f % 2 ? 1 : -1; const ang = Math.atan2(fh, 3.6) * dir; add(cx + nx * 0.25, py + fh / 2, cz + nz * 0.25, nx ? 0.55 : 4.9, 0.05, nx ? 4.9 : 0.55, METAL, nrm, ang); }
        }
        add(cx + nx * 0.25 + tx * W / 2 * 0.8, fh * 0.5 + 0.7, cz + nz * 0.25 + tz * W / 2 * 0.8, 0.45, fh * 0.9, 0.05 + (nx ? 0.4 : 0), METAL);  // drop ladder
      }
      // window AC units on brick
      if (style === 1) {
        const fw = 2.7, uC = fx * tx + fz * tz; const k0 = Math.ceil((uC - len / 2 + 1) / fw), k1 = Math.floor((uC + len / 2 - 1) / fw) - 1;
        for (let j = Math.ceil((b.y + 5) / fh); (j + 1) * fh < b.y + b.h - 1; j++) for (let k = k0; k <= k1; k++) {
          if (R() > 0.07) continue; const off = (k + 0.5) * fw - uC; const py = (j + 0.22) * fh + 0.25;
          add(fx + tx * off + nx * 0.28, py, fz + tz * off + nz * 0.28, nx ? 0.56 : 0.72, 0.46, nx ? 0.72 : 0.56, R() < 0.5 ? 0xb9b5ac : 0x8e8a82);
        }
      }
    }
  }
  const dm = chunkedInstances(boxC, plainMat, det, S.quality === 'high' || S.quality === 'ultra');
  window.__detailCount = det.length;
}
const lodMeshes = lodInst.map((l, i) => instBoxes(l, lodMats[i], false));
const buildingMeshes = [instBoxes(bInst[0], facadeMats[0]), instBoxes(bInst[1], facadeMats[1]), instBoxes(bInst[2], facadeMats[2]), instBoxes(plainInst, plainMat)];
landmarkMeshes.forEach(m => { m.castShadow = true; m.receiveShadow = true; scene.add(m); });
const metalMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: TEX.metal, metalness: 0.75, roughness: 0.38 });
{ // rooftop details
  const wtGeo = mergeGeos([[new THREE.CylinderGeometry(2.2, 2.2, 3.8, 16).translate(0, 5.2, 0), 0x7a5a3e], [new THREE.ConeGeometry(2.45, 1.6, 16).translate(0, 7.9, 0), 0x4a3a2c],
  ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [new THREE.CylinderGeometry(0.12, 0.12, 3.4, 5).translate(a * 1.5, 1.7, b * 1.5), 0x333333]), [new THREE.CylinderGeometry(2.3, 2.3, 0.3, 16).translate(0, 3.35, 0), 0x3a3a3a]]);
  instGeo(wtGeo, vcolMat, wtList, (p, m) => m.makeTranslation(p[0], p[1], p[2]), { shadow: true });
  const acGeo = mergeGeos([[boxG(2, 1.2, 1.4, 0, 0.6, 0), 0xb9bcbf], [new THREE.CylinderGeometry(0.5, 0.5, 0.06, 12).translate(0.45, 1.22, 0), 0x2a2a2a], [new THREE.CylinderGeometry(0.5, 0.5, 0.06, 12).translate(-0.45, 1.22, 0), 0x2a2a2a]]);
  instGeo(acGeo, metalMat, acList, (p, m) => m.compose(tA.set(p[0], p[1], p[2]), tQ.setFromAxisAngle(UP, p[3]), tB.set(1, 1, 1)), { shadow: true });
  const antGeo = mergeGeos([[new THREE.CylinderGeometry(0.08, 0.35, 1, 6).translate(0, 0.5, 0), 0xcfcfcf]]);
  instGeo(antGeo, metalMat, antList, (p, m) => m.compose(tA.set(p[0], p[1], p[2]), tQ.identity(), tB.set(1, p[3], 1)));
  const lampGeo = mergeGeos([[new THREE.CylinderGeometry(0.09, 0.13, 8, 6).translate(0, 4, 0), 0x2d3136], [boxG(0.12, 0.12, 2.2, 0, 7.9, 1.0), 0x2d3136], [boxG(0.5, 0.18, 0.8, 0, 7.8, 2.0), 0xfff1c9]]);
  instGeo(lampGeo, metalMat, lampList, (p, m) => m.compose(tA.set(p[0], 0, p[1]), tQ.setFromAxisAngle(UP, p[2]), tB.set(1, 1, 1)));
  const tg = new THREE.IcosahedronGeometry(2.4, 1); { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const s = 1 + Math.sin(p.getX(i) * 3.1 + p.getZ(i) * 2.3) * 0.12; p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * 0.9, p.getZ(i) * s); } tg.computeVertexNormals(); tg.translate(0, 5.2, 0); }
  const blob = (r, x, y, z) => { const b = new THREE.IcosahedronGeometry(r, 1); const p = b.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + Math.sin(p.getX(i) * 4.1 + p.getY(i) * 3.3 + x) * 0.14; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.85, p.getZ(i) * k); } b.computeVertexNormals(); return b.translate(x, y, z); };
  const treeGeo = mergeGeos([[new THREE.CylinderGeometry(0.16, 0.3, 4, 6).translate(0, 2, 0), 0x4a3426], [blob(2.5, 0, 5.4, 0), 0x4c6b2a], [blob(1.9, 1.3, 6.6, 0.5), 0x5b7c33], [blob(1.8, -1.1, 6.3, -0.6), 0x557530], [blob(1.4, 0.2, 7.7, -0.2), 0x67893c]]);
  instGeo(treeGeo, vcolMat, treeList, (p, m) => m.compose(tA.set(p[0], p[1], p[2]), tQ.setFromAxisAngle(UP, p[0] * 13.7), tB.set(p[3], p[3], p[3])), { shadow: true, color: (p) => [0xffffff, 0xd9f0c0, 0xf2e6b0, 0xc8e0b0][Math.floor(Math.abs(p[0] * 7 + p[2] * 3)) % 4] });
  // billboards
  const bbTex = [['HARBOR COLA', 'TASTE THE TIDE', '#d4202a', '#fff'], ['SUNSET 98.4', 'THE SOUND OF THE CITY', '#1d2a5c', '#ffb54a'], ['KAIJU NOODLE', 'OPEN TIL 4AM', '#f6c33c', '#141414'], ['MERIDIAN BANK', 'BUILT ON BEDROCK', '#0f4c4a', '#eadfc8']].map(([a, b, bg, fg]) => {
    const c = makeCanvas(512, 220), g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 512, 220); g.fillStyle = fg; g.font = '900 82px Impact, Arial Narrow, sans-serif'; g.textAlign = 'center'; g.fillText(a, 256, 120); g.font = '700 26px Arial, sans-serif'; g.fillText(b, 256, 172); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(12, 12, 488, 196); return canvasTex(c);
  });
  for (const b of bbList) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshStandardMaterial({ map: bbTex[b.v], emissive: 0xffffff, emissiveMap: bbTex[b.v], emissiveIntensity: 0.35, roughness: 0.6, side: THREE.DoubleSide }));
    mesh.position.set(b.x, b.y + 7, b.z); mesh.rotation.y = b.rot; scene.add(mesh);
    const dx = b.rot ? 0 : 6, dz = b.rot ? 6 : 0; plain(b.x + dx, b.y, b.z + dz, 0.4, 4, 0.4, 0x333333); plain(b.x - dx, b.y, b.z - dz, 0.4, 4, 0.4, 0x333333);
    addBox(b.x - (b.rot ? 0.3 : 7), b.y + 4, b.z - (b.rot ? 7 : 0.3), b.x + (b.rot ? 0.3 : 7), b.y + 10, b.z + (b.rot ? 7 : 0.3), 3);
  }
  // bridge cables
  const cableMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, map: TEX.metal, metalness: 0.8, roughness: 0.35 });
  for (const c of bridgeParts.cables) { const m = new THREE.Mesh(new THREE.TubeGeometry(c, 80, 0.55, 8), cableMat); m.castShadow = true; scene.add(m); }
  instGeo(new THREE.CylinderGeometry(0.08, 0.08, 1, 4).translate(0, 0.5, 0), cableMat, bridgeParts.hangers, (h, m) => m.compose(tA.set(h[0], h[1], h[2]), tQ.identity(), tB.set(1, h[3], 1)));
  // arch bridge ribs and smokestacks
  const archMat = new THREE.MeshStandardMaterial({ color: 0xb8322a, roughness: 0.5, metalness: 0.4, map: TEX.metal });
  for (const c of archParts) { const m = new THREE.Mesh(new THREE.TubeGeometry(c, 60, 1.1, 8), archMat); m.castShadow = true; scene.add(m); }
  { const pts = archParts[0].getPoints(30); const hang = pts.filter((p, i) => i % 2 === 0 && p.y > 16).map(p => [p.x, 14, p.z, p.y - 14]); instGeo(new THREE.CylinderGeometry(0.12, 0.12, 1, 4).translate(0, 0.5, 0), archMat, hang.concat(hang.map(h => [h[0] - 18, h[1], h[2], h[3]])), (h, m) => m.compose(tA.set(h[0], h[1], h[2]), tQ.identity(), tB.set(1, h[3], 1))); }
  { const parts = []; for (let i = 0; i < 10; i++) parts.push([new THREE.CylinderGeometry(2.0 - i * 0.05, 2.05 - i * 0.05, 0.1, 16, 1, true).translate(0, i * 0.1 + 0.05, 0), i % 2 ? 0xeee8dc : 0xb03a2c]); parts.push([new THREE.CylinderGeometry(1.5, 2.05, 0.02, 16).translate(0, 1, 0), 0x2a2522]);
    const sg = mergeGeos(parts); instGeo(sg, vcolMat, stacks, (p, m) => m.compose(tA.set(p[0], 0, p[1]), tQ.identity(), tB.set(1, p[2], 1)), { shadow: true }); }
  // ferris wheel
  const fw = new THREE.Group(); fw.position.set(ferris.x, ferris.cy, ferris.z);
  const white = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.5, metalness: 0.3 });
  for (const s of [-2.2, 2.2]) { const t = new THREE.Mesh(new THREE.TorusGeometry(ferris.r, 0.45, 8, 96), white); t.position.z = s; fw.add(t); const t2 = new THREE.Mesh(new THREE.TorusGeometry(ferris.r * 0.55, 0.3, 6, 64), white); t2.position.z = s; fw.add(t2); }
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; for (const s of [-2.2, 2.2]) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, ferris.r, 4), white); sp.position.set(Math.cos(a) * ferris.r / 2, Math.sin(a) * ferris.r / 2, s); sp.rotation.z = a - Math.PI / 2; fw.add(sp); } }
  const gondolas = [];
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const gnd = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.4, 2.4, 10), new THREE.MeshStandardMaterial({ color: [0xe84a3a, 0xffc23a, 0x3aa0e8, 0x55c26a][i % 4], roughness: 0.45 })); gnd.userData.a = a; fw.add(gnd); gondolas.push(gnd); }
  fw.add(new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 6, 16).rotateX(Math.PI / 2), white));
  scene.add(fw); window._ferris = { group: fw, gondolas };
  // coaster
  const red = new THREE.MeshStandardMaterial({ color: 0xd8423a, roughness: 0.5, metalness: 0.3 });
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(coasterCurve, 400, 0.7, 8, true), red));
  instGeo(new THREE.CylinderGeometry(0.25, 0.3, 1, 6).translate(0, 0.5, 0), white, coasterSupports, (p, m) => m.compose(tA.set(p.x, 0, p.z), tQ.identity(), tB.set(1, Math.max(0.1, p.y - 0.7), 1)));
  // boardwalk lamps & umbrellas
  const umb = mergeGeos([[new THREE.ConeGeometry(1.8, 0.8, 10).translate(0, 2.6, 0), 0xffffff], [new THREE.CylinderGeometry(0.05, 0.05, 2.6, 4).translate(0, 1.3, 0), 0x777777]]);
  const ul = []; for (let i = 0; i < 90; i++) ul.push([rr(SEA.x0 + 10, SEA.x1 - 10), rr(880, 980)]);
  instGeo(umb, vcolMat, ul, (p, m) => m.makeTranslation(p[0], 0, p[1]), { color: (p, i) => [0xe84a3a, 0xffc23a, 0x3aa0e8, 0xf2f2f2, 0x55c26a][i % 5] });
}
function districtAt(x, z) { for (const d of DIST) if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d.name; if (x >= SEA.x0 && x <= SEA.x1 && z >= SEA.z0 && z <= SEA.z1) return SEA.name; return 'HARBOR WATERS'; }

// ---------- distant skylines across the water ----------
{
  const R = mulberry32(99); const list = []; const cx = 450, cz = -300;
  const shoreMat = new THREE.MeshStandardMaterial({ color: 0x5d5a52, roughness: 1 });
  for (const [a0, a1, r0] of [[-2.6, -0.9, 2600], [0.3, 1.5, 2300], [1.9, 2.5, 3000]]) {
    for (let a = a0; a < a1; a += 0.004) {
      const r = r0 + R() * 700; const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      const dense = Math.exp(-(((a - (a0 + a1) / 2) / ((a1 - a0) * 0.25)) ** 2));
      const h = 10 + R() * 40 + (R() < 0.25 * dense ? R() * 230 * dense : 0);
      list.push({ x, y: 0, z, w: 14 + R() * 30, h, d: 14 + R() * 30, c: [0x8d97a3, 0xa49c8f, 0x7f8a96, 0xb5ab9b][Math.floor(R() * 4)] });
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(r0 - 150, r0 + 900, 64, 1, a0, a1 - a0).rotateX(-Math.PI / 2).rotateY(0), shoreMat);
    ring.rotation.y = 0; ring.position.set(cx, 0.5, cz); ring.scale.z = -1; scene.add(ring);
  }
  const m = new THREE.InstancedMesh(unitBox, facadeMats[0], list.length);
  list.forEach((b, i) => { tM.compose(tA.set(b.x, b.y, b.z), tQ.identity(), tB.set(b.w, b.h, b.d)); m.setMatrixAt(i, tM); m.setColorAt(i, tCol.setHex(b.c)); });
  m.frustumCulled = false; scene.add(m);
}

// ---------- NYC downtown: four copies of a detailed CC-BY city block, with collisions built from its geometry ----------
async function loadNYC() {
  if (!NYC_ON) return;
  const g = await gltfLoader.loadAsync((window.MODEL_BASE || 'models/') + 'nyc' + (window.MODEL_EXT || '.glb'));
  const tpl = g.scene; tpl.updateMatrixWorld(true);
  const bb = new THREE.Box3(); const meshes = []; const hiQ = S.quality === 'high' || S.quality === 'ultra'; tpl.traverse(o => { if (o.isMesh) { meshes.push(o); o.castShadow = hiQ; o.receiveShadow = true; } });
  // height field (2 m cells) from every triangle, in the block's own space
  const CS = 2; let mnx = Infinity, mnz = Infinity, mxx = -Infinity, mxz = -Infinity; const v = new V3();
  for (const m of meshes) { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); mnx = Math.min(mnx, v.x); mxx = Math.max(mxx, v.x); mnz = Math.min(mnz, v.z); mxz = Math.max(mxz, v.z); } }
  const NX = Math.ceil((mxx - mnx) / CS), NZ = Math.ceil((mxz - mnz) / CS); const H = new Float32Array(NX * NZ);
  const a = new V3(), b2 = new V3(), c2 = new V3();
  for (const m of meshes) { const p = m.geometry.attributes.position, idx = m.geometry.index; const n = idx ? idx.count : p.count;
    for (let t = 0; t < n; t += 3) { const i0 = idx ? idx.getX(t) : t, i1 = idx ? idx.getX(t + 1) : t + 1, i2 = idx ? idx.getX(t + 2) : t + 2;
      a.fromBufferAttribute(p, i0).applyMatrix4(m.matrixWorld); b2.fromBufferAttribute(p, i1).applyMatrix4(m.matrixWorld); c2.fromBufferAttribute(p, i2).applyMatrix4(m.matrixWorld);
      const top = Math.max(a.y, b2.y, c2.y); if (top < 3) continue;
      const x0 = Math.floor((Math.min(a.x, b2.x, c2.x) - mnx) / CS), x1 = Math.floor((Math.max(a.x, b2.x, c2.x) - mnx) / CS), z0 = Math.floor((Math.min(a.z, b2.z, c2.z) - mnz) / CS), z1 = Math.floor((Math.max(a.z, b2.z, c2.z) - mnz) / CS);
      if ((x1 - x0 + 1) * (z1 - z0 + 1) > 400) continue; // skip huge ground-ish triangles
      for (let x = Math.max(0, x0); x <= Math.min(NX - 1, x1); x++) for (let z = Math.max(0, z0); z <= Math.min(NZ - 1, z1); z++) { const k = z * NX + x; if (top > H[k]) H[k] = top; } } }
  const W = mxx - mnx, D = mxz - mnz; const tiles = []; const rows = S.quality === 'low' ? [1, 2] : [0, 1, 2, 3];
  for (const tz of rows) for (const tx of [0, 1]) tiles.push([tx, tz, (tx + tz) % 2 ? Math.PI : 0]);
  for (const [tx, tz, rot] of tiles) {
    const cx0 = NYC.x0 + tx * W, cz0 = NYC.z0 + tz * D; const inst = tpl.clone(); inst.rotation.y = rot;
    if (rot === 0) inst.position.set(cx0 - mnx, 0, cz0 - mnz); else inst.position.set(cx0 + mxx, 0, cz0 + mxz);
    scene.add(inst);
    // merged colliders: runs of similar height along x
    for (let z = 0; z < NZ; z++) { let x = 0; while (x < NX) { const h = H[z * NX + x]; if (h < 3) { x++; continue; } let e = x + 1, hm = h; while (e < NX && H[z * NX + e] >= 3 && Math.abs(H[z * NX + e] - h) < 1.5) { hm = Math.max(hm, H[z * NX + e]); e++; }
      let lx0 = mnx + x * CS, lx1 = mnx + e * CS, lz0 = mnz + z * CS, lz1 = lz0 + CS;
      let wx0, wx1, wz0, wz1; if (rot === 0) { wx0 = lx0 + inst.position.x; wx1 = lx1 + inst.position.x; wz0 = lz0 + inst.position.z; wz1 = lz1 + inst.position.z; } else { wx0 = -lx1 + inst.position.x; wx1 = -lx0 + inst.position.x; wz0 = -lz1 + inst.position.z; wz1 = -lz0 + inst.position.z; }
      addBox(wx0, 0, wz0, wx1, hm, wz1, 1); if (hm > 40 && (e - x) > 6 && z % 6 === 0) roofTops.push({ x: (wx0 + wx1) / 2, y: hm, z: (wz0 + wz1) / 2, w: wx1 - wx0, d: wz1 - wz0, nyc: true }); x = e; } }
  }
  if (typeof redrawMap === 'function') redrawMap();
}
