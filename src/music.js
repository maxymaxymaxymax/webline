// ================= TITLE MUSIC: original heroic orchestral cue, synthesized live =================
// Key of D minor, 100 BPM. 16-bar loop: an 8-bar build, then the 8-bar horn theme over full orchestra.
const music = (() => {
  let ac = null, out = null, rev = null, timer = null, step = 0, nextT = 0, playing = false, bar = 0;
  const BPM = 100, SPB = 60 / BPM, S16 = SPB / 4;
  const N = n => 440 * Math.pow(2, (n - 69) / 12);
  // chords as MIDI notes (root position voicings)
  const CH = { Dm: [50, 53, 57], Bb: [46, 50, 53], F: [53, 57, 60], C: [48, 52, 55], Gm: [55, 58, 62], A: [45, 49, 52], Asus: [45, 50, 52] };
  const PROG = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'];
  // original horn theme for bars 8-15: [midi, startBeat, beats]
  const THEME = [
    [[69, 0, 1.5], [74, 1.5, 0.5], [76, 2, 1], [77, 3, 1]],
    [[79, 0, 2], [77, 2, 1], [74, 3, 1]],
    [[72, 0, 1.5], [77, 1.5, 0.5], [81, 2, 2]],
    [[79, 0, 1], [76, 1, 1], [72, 2, 2]],
    [[74, 0, 1], [77, 1, 1], [81, 2, 1.5], [79, 3.5, 0.5]],
    [[77, 0, 2], [74, 2, 2]],
    [[70, 0, 1], [74, 1, 1], [79, 2, 2]],
    [[76, 0, 2], [73, 2, 1], [69, 3, 1]],
  ];
  function impulse(sec) { const len = ac.sampleRate * sec, b = ac.createBuffer(2, len, ac.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); } return b; }
  function init(ctx, dest) {
    ac = ctx; out = ac.createGain(); out.gain.value = 0; out.connect(dest);
    rev = ac.createConvolver(); rev.buffer = impulse(3.2); const rg = ac.createGain(); rg.gain.value = 0.55; rev.connect(rg).connect(out);
  }
  function voice(t, freq, dur, { type = 'sawtooth', gain = 0.1, attack = 0.02, release = 0.2, cutoff = 2000, q = 0.7, detune = 0, wet = 0.4, env = 0 }) {
    const o = ac.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = detune;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = q; f.frequency.setValueAtTime(cutoff * (env ? 0.4 : 1), t); if (env) f.frequency.linearRampToValueAtTime(cutoff, t + attack + 0.05);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.setValueAtTime(gain, t + Math.max(attack, dur - release)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
    o.connect(f).connect(g); g.connect(out); const s = ac.createGain(); s.gain.value = wet; g.connect(s).connect(rev);
    o.start(t); o.stop(t + dur + release + 0.05);
  }
  function strings(t, notes, dur, gain) { for (const n of notes) for (const d of [-9, 0, 8]) voice(t, N(n), dur, { gain: gain / 3, attack: 0.5, release: 0.8, cutoff: 1900, detune: d, wet: 0.7 }); }
  function brass(t, n, dur, gain) { for (const d of [-6, 6]) voice(t, N(n), dur, { gain: gain / 2, attack: 0.06, release: 0.25, cutoff: 2600, q: 1.2, detune: d, env: 1, wet: 0.45 }); voice(t, N(n - 12), dur, { gain: gain * 0.35, attack: 0.06, release: 0.25, cutoff: 900, wet: 0.3 }); }
  function stab(t, n, gain) { voice(t, N(n), S16 * 1.6, { gain, attack: 0.005, release: 0.06, cutoff: 1500, wet: 0.25 }); }
  function timpani(t, n, gain) { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(N(n) * 1.6, t); o.frequency.exponentialRampToValueAtTime(N(n), t + 0.08); const g = ac.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.2); o.connect(g).connect(out); const s = ac.createGain(); s.gain.value = 0.35; g.connect(s).connect(rev); o.start(t); o.stop(t + 1.3); noiseHit(t, 0.1, 300, gain * 0.6); }
  function noiseHit(t, dur, fc, gain, hp) { const len = ac.sampleRate * dur, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = fc; const g = ac.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(f).connect(g).connect(out); s.start(t); }
  function swell(t, dur, gain) { const len = ac.sampleRate * dur, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5000; const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.95); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4); s.connect(f).connect(g); g.connect(out); const w = ac.createGain(); w.gain.value = 0.6; g.connect(w).connect(rev); s.start(t); }
  function schedule(t, st) {
    const b = Math.floor(st / 16) % 16, s16 = st % 16, chord = CH[PROG[b]], root = chord[0], full = b >= 8;
    if (s16 === 0) {
      strings(t, chord.map(n => n + 12), SPB * 4, full ? 0.07 : 0.05);
      voice(t, N(root - 12), SPB * 4, { gain: 0.11, attack: 0.15, release: 0.4, cutoff: 420, wet: 0.3 });
      if (b % 4 === 0) { timpani(t, root - 12, 0.5); noiseHit(t, 1.6, 900, full ? 0.25 : 0.14); }
      if (full) for (const n of chord) brass(t, n + 12, SPB * 0.9, 0.035);
    }
    if (s16 === 8) timpani(t, root - 12 + 7, b >= 4 ? 0.35 : 0.2);
    if (b >= 2) { const pat = [0, 12, 7, 12]; const n = root + 12 + pat[(s16 >> 1) % 4]; if (s16 % 2 === 0) stab(t, n, full ? 0.05 : 0.035); }
    if (b >= 4 && (s16 === 4 || s16 === 12)) noiseHit(t, 0.08, 2500, full ? 0.06 : 0.035, true);
    if (s16 === 14 && (b === 7 || b === 15)) for (let i = 0; i < 6; i++) timpani(t - S16 * 2 + i * S16 * 0.4, root - 12, 0.18 + i * 0.03);
    if (s16 === 0 && (b === 7 || b === 15)) swell(t, SPB * 3.8, 0.12);
    if (full && s16 % 4 === 0) { const bt = s16 / 4; for (const [n, st0, d] of THEME[b - 8]) if (Math.abs(st0 - bt) < 0.01 || (st0 > bt && st0 < bt + 1)) brass(t + (st0 - bt) * SPB, n, d * SPB * 0.95, 0.075); }
  }
  function tick() { while (nextT < ac.currentTime + 0.15) { schedule(nextT, step); step++; nextT += S16; } }
  return {
    start(ctx, dest) { if (!ctx) return; if (!ac) init(ctx, dest); if (playing) return; playing = true; step = 0; nextT = ac.currentTime + 0.1; out.gain.cancelScheduledValues(ac.currentTime); out.gain.setValueAtTime(out.gain.value, ac.currentTime); out.gain.linearRampToValueAtTime(0.9, ac.currentTime + 1.5); timer = setInterval(tick, 30); tick(); },
    fadeOut(sec = 2) { if (!ac || !playing) return; out.gain.cancelScheduledValues(ac.currentTime); out.gain.setValueAtTime(out.gain.value, ac.currentTime); out.gain.linearRampToValueAtTime(0.0001, ac.currentTime + sec); setTimeout(() => { if (out.gain.value < 0.01) { clearInterval(timer); playing = false; } }, sec * 1000 + 100); },
    get playing() { return playing; },
  };
})();
