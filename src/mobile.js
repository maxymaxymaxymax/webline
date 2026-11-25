// ================= MOBILE / TOUCH CONTROLS =================
const IS_TOUCH = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
if (IS_TOUCH) {
  document.body.classList.add('touch');
  if (!lsGet('webline.settings')) { S.quality = 'low'; S.scale = 90; saveSettings(); }
  document.querySelectorAll('.tPress').forEach(e => e.innerHTML = '<span class="tKey">TAP</span> TAP TO START');
  const T = document.getElementById('touch');
  const key = (code, down) => dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
  const BTNS = [
    // [label, css class, onDown, onUp]
    ['WEB L', 'b-webL big', () => fireWeb('L'), () => releaseWeb('L')],
    ['WEB R', 'b-webR big', () => fireWeb('R'), () => releaseWeb('R')],
    ['JUMP', 'b-jump big', () => key('Space', true), () => key('Space', false)],
    ['DIVE', 'b-dive', () => { keys.ShiftLeft = true; }, () => { keys.ShiftLeft = false; }],
    ['WINGS', 'b-wings', () => key('KeyG', true), () => key('KeyG', false)],
    ['SLING', 'b-sling', () => key('KeyF', true), () => key('KeyF', false)],
    ['TRICK', 'b-trick', () => key('KeyE', true), () => key('KeyE', false)],
    ['PARRY', 'b-parry', () => key('KeyQ', true), () => key('KeyQ', false)],
    ['DODGE', 'b-dodge', () => key('KeyC', true), () => key('KeyC', false)],
    ['YANK', 'b-yank', () => key('KeyT', true), () => key('KeyT', false)],
    ['1', 'b-a1 sm', () => key('Digit1', true), () => key('Digit1', false)],
    ['2', 'b-a2 sm', () => key('Digit2', true), () => key('Digit2', false)],
    ['3', 'b-a3 sm', () => key('Digit3', true), () => key('Digit3', false)],
    ['Z', 'b-az sm', () => key('KeyZ', true), () => key('KeyZ', false)],
    ['II', 'b-pause sm', () => pauseGame(true), () => { }],
  ];
  for (const [label, cls, dn, up] of BTNS) {
    const b = document.createElement('button'); b.className = 'tb ' + cls; b.textContent = label; b.setAttribute('aria-label', label);
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); b.classList.add('on'); sfx.init(); dn(); });
    const end = e => { if (!b.classList.contains('on')) return; e.preventDefault(); b.classList.remove('on'); up(); };
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end); b.addEventListener('lostpointercapture', end);
    T.appendChild(b);
  }
  const stick = document.createElement('div'); stick.className = 'stick'; stick.innerHTML = '<i></i>'; T.appendChild(stick); const knob = stick.firstChild;
  let joyId = null, joyC = { x: 0, y: 0 }, lookId = null, lookP = { x: 0, y: 0 };
  T.addEventListener('pointerdown', e => {
    if (e.target !== T) return; e.preventDefault(); sfx.init();
    if (e.clientX < innerWidth * 0.42 && joyId === null) { joyId = e.pointerId; joyC = { x: e.clientX, y: e.clientY }; stick.style.left = e.clientX + 'px'; stick.style.top = e.clientY + 'px'; stick.classList.add('on'); joy.on = true; }
    else if (lookId === null) { lookId = e.pointerId; lookP = { x: e.clientX, y: e.clientY }; }
    T.setPointerCapture(e.pointerId);
  });
  T.addEventListener('pointermove', e => {
    if (e.pointerId === joyId) { let dx = e.clientX - joyC.x, dy = e.clientY - joyC.y; const L = Math.hypot(dx, dy), R = 56; if (L > R) { dx *= R / L; dy *= R / L; } knob.style.transform = `translate(${dx}px,${dy}px)`; joy.x = dx / R; joy.y = dy / R; keys.ShiftLeft = keys.ShiftLeft || false; joy.sprint = Math.hypot(joy.x, joy.y) > 0.95; }
    else if (e.pointerId === lookId) { const s = 0.0045 * (0.4 + S.sens / 80); yaw -= (e.clientX - lookP.x) * s; pitch = clamp(pitch - (e.clientY - lookP.y) * s * (S.invertY ? -1 : 1), -1.35, 1.2); lookP = { x: e.clientX, y: e.clientY }; lastLook = gameTime; }
  });
  const release = e => { if (e.pointerId === joyId) { joyId = null; joy.on = false; joy.x = joy.y = 0; joy.sprint = false; stick.classList.remove('on'); knob.style.transform = ''; } if (e.pointerId === lookId) lookId = null; };
  T.addEventListener('pointerup', release); T.addEventListener('pointercancel', release);
  setInterval(() => { T.hidden = !(playing && !paused && menuMode === 'play'); if (joy.sprint && P.mode === 'ground') keys.ShiftLeft = true; else if (!document.querySelector('.b-dive.on')) keys.ShiftLeft = false; }, 100);
  document.addEventListener('pointerdown', () => { if (menuMode === 'play' && !document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => { }); }, { once: false, passive: true });
}
