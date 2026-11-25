// ================= MATERIAL TEXTURES (asphalt, brick, oak, brushed metal) =================
const TEX = (() => {
  const R = mulberry32(4242), r = (a, b) => a + (b - a) * R();
  function asphalt() { const S = 512, c = makeCanvas(S, S), g = c.getContext('2d'); const img = g.createImageData(S, S), d = img.data;
    for (let i = 0; i < S * S; i++) { const n = R(); let v = 58 + (n < 0.5 ? n * 30 : n * n * 70); if (R() < 0.04) v += 70 * R(); if (R() < 0.03) v -= 30; d[i * 4] = v; d[i * 4 + 1] = v; d[i * 4 + 2] = v + 2; d[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0); g.globalAlpha = 0.08; for (let i = 0; i < 40; i++) { g.fillStyle = R() < 0.5 ? '#000' : '#fff'; g.beginPath(); g.arc(r(0, S), r(0, S), r(20, 90), 0, 7); g.fill(); } g.globalAlpha = 1;
    return canvasTex(c, true, true); }
  function brick() { const S = 512, c = makeCanvas(S, S), g = c.getContext('2d'); g.fillStyle = '#d6cbb9'; g.fillRect(0, 0, S, S);
    const rows = 8, cols = 4, bh = S / rows, bw = S / cols, m = 5;
    for (let y = 0; y < rows; y++) for (let x = -1; x < cols + 1; x++) { const ox = (y % 2) * bw / 2; const hue = r(8, 20), sat = r(45, 62), lit = r(36, 52);
      g.fillStyle = `hsl(${hue},${sat}%,${lit}%)`; g.fillRect(x * bw + ox + m / 2, y * bh + m / 2, bw - m, bh - m);
      for (let k = 0; k < 90; k++) { g.fillStyle = `hsla(${hue + r(-6, 6)},${sat}%,${lit + r(-14, 12)}%,.55)`; g.fillRect(x * bw + ox + m / 2 + r(0, bw - m - 3), y * bh + m / 2 + r(0, bh - m - 3), r(1, 4), r(1, 3)); } }
    const img = g.getImageData(0, 0, S, S), d = img.data; for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(img, 0, 0);
    return canvasTex(c, true, true); }
  function oak() { const W = 512, H = 512, c = makeCanvas(W, H), g = c.getContext('2d'); g.fillStyle = '#c99a62'; g.fillRect(0, 0, W, H);
    const planks = 6, ph = H / planks;
    for (let p = 0; p < planks; p++) { const base = r(-8, 8); g.fillStyle = `hsl(${30 + base * 0.3},${48 + base}%,${55 + base * 0.6}%)`; g.fillRect(0, p * ph, W, ph);
      for (let k = 0; k < 26; k++) { const y0 = p * ph + r(0, ph), a = r(2, 6), f = r(0.005, 0.02), ph0 = r(0, 6); g.strokeStyle = `hsla(${r(22, 32)},${r(35, 55)}%,${r(30, 48)}%,${r(0.15, 0.45)})`; g.lineWidth = r(0.6, 2.2); g.beginPath();
        for (let x = 0; x <= W; x += 8) { const y = y0 + Math.sin(x * f + ph0) * a + Math.sin(x * f * 3.1) * a * 0.3; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      g.fillStyle = 'rgba(60,35,15,.55)'; g.fillRect(0, p * ph, W, 2); const jx = r(0, W); g.fillRect(jx, p * ph, 2, ph); }
    return canvasTex(c, true, true); }
  function metal() { const S = 512, c = makeCanvas(S, S), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, S, 0); gr.addColorStop(0, '#9da2a7'); gr.addColorStop(0.3, '#d9dde0'); gr.addColorStop(0.55, '#aab0b5'); gr.addColorStop(0.8, '#e2e5e7'); gr.addColorStop(1, '#a3a8ad'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) { const y = r(0, S), l = r(30, 300), x = r(-50, S); g.strokeStyle = `rgba(${R() < 0.5 ? '255,255,255' : '40,45,50'},${r(0.03, 0.12)})`; g.lineWidth = r(0.5, 1.4); g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + r(-0.6, 0.6)); g.stroke(); }
    return canvasTex(c, true, true); }
  return { asphalt: asphalt(), brick: brick(), oak: oak(), metal: metal() };
})();
window.__brickTex = TEX.brick; facadeMats.concat(lodMats).forEach(m => m.needsUpdate = true);

// Real CC0 photo textures from Poly Haven (by Rob Tuytel and others), loaded on top of the procedural fallbacks above.
const PHOTO = (() => {
  const base = (window.MODEL_BASE || 'models/').replace('models', 'textures'); const L = new THREE.TextureLoader();
  const ld = (f) => { const t = L.load(base + f + '.jpg'); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = MAX_ANISO; return t; };
  return { brick: ld('red_brick_03'), concrete: ld('concrete_wall_003'), roof: ld('gravel_concrete_03'), asphalt: ld('asphalt_02'), grass: ld('leafy_grass'), sand: ld('sand_01'), planks: ld('weathered_brown_planks'), metal: ld('metal_plate') };
})();
TEX.asphalt = PHOTO.asphalt; TEX.metal = PHOTO.metal; TEX.oak = PHOTO.planks;
window.__brickTex = PHOTO.brick; facadeMats.concat(lodMats).forEach(m => m.needsUpdate = true);
