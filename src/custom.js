// ================= YOUR OWN CHARACTER MODELS (.glb picked from the player's computer) =================
const customModels = []; let customActive = null;
const DB = (() => { let db = null; const open = () => new Promise((res, rej) => { if (db) return res(db); try { const r = indexedDB.open('webline-models', 1); r.onupgradeneeded = () => r.result.createObjectStore('m'); r.onsuccess = () => { db = r.result; res(db); }; r.onerror = () => rej(r.error); } catch (e) { rej(e); } });
  return {
    async all() { try { const d = await open(); return await new Promise(res => { const out = []; const tx = d.transaction('m').objectStore('m').openCursor(); tx.onsuccess = e => { const c = e.target.result; if (c) { out.push({ name: c.key, buf: c.value }); c.continue(); } else res(out); }; tx.onerror = () => res(out); }); } catch (e) { return []; } },
    async put(name, buf) { try { const d = await open(); d.transaction('m', 'readwrite').objectStore('m').put(buf, name); } catch (e) { } },
    async del(name) { try { const d = await open(); d.transaction('m', 'readwrite').objectStore('m').delete(name); } catch (e) { } },
  };
})();
function parseGLB(buf) { return new Promise((res, rej) => gltfLoader.parse(buf, '', res, rej)); }
async function addCustomModel(name, buf, save) {
  name = String(name);
  const key = 'custom_' + name.replace(/[^a-z0-9]+/gi, '_');
  if (!CHARS[key]) {
    CHAR_DEFS[key] = { file: name, yaw: 0, h: 1.82 };
    const g = await parseGLB(buf.slice(0));
    setupChar(key, g);
    for (const n of ['idle', 'walk', 'run', 'agree']) retarget('xbot', n, key, n);
    retarget('bearded', 'fight_idle', key, 'fight_idle');
  }
  if (!customModels.find(m => m.key === key)) customModels.push({ key, name });
  buildSuitCards();
  return key;
}
function wearCustom(key) {
  const old = hero; const inst = makeInstance(key);
  inst.model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } }); // keeps the model's own materials and textures
  inst.group.position.copy(old.group.position); inst.group.quaternion.copy(old.group.quaternion);
  scene.remove(old.group); scene.add(inst.group);
  hero = inst; for (const n in heroRest) delete heroRest[n]; for (const n in hero.bones) heroRest[n] = hero.bones[n].quaternion.clone();
  playAct(hero, 'idle', 0); customActive = key; lsSet('webline.custom', key);
  if (catPack) catPack.visible = false; if (hoodMesh) hoodMesh.visible = false;
  setSuitButtons();
}
function wearBuiltIn(i) {
  if (customActive) { const old = hero; const inst = makeInstance('hero'); inst.model.traverse(o => { if (o.isMesh) { o.material = suitMat; o.castShadow = true; } });
    inst.group.position.copy(old.group.position); inst.group.quaternion.copy(old.group.quaternion); scene.remove(old.group); scene.add(inst.group);
    hero = inst; for (const n in heroRest) delete heroRest[n]; for (const n in hero.bones) heroRest[n] = hero.bones[n].quaternion.clone(); playAct(hero, 'idle', 0); customActive = null; lsSet('webline.custom', ''); }
  applySuit(i); setSuitButtons();
}
// Suit models listed by the game's author in suits/suits.json, e.g.
// { "hideBuiltIn": true, "suits": [ { "name": "Fresh Day", "file": "fresh_day.glb" } ] }
// Each file must be a rigged .glb (Mixamo skeleton); it is shown with its own materials and textures.
async function loadSuitList() {
  const base = (window.MODEL_BASE || 'models/').replace('models', 'suits');
  let list = null; try { const r = await fetch(base + 'suits.json', { cache: 'no-cache' }); if (r.ok) list = JSON.parse((await r.text()).replace(/,\s*([\]}])/g, '$1')); } catch (e) { console.warn('suits.json has a mistake in it', e); ui.notice && ui.notice('suits/suits.json has a typo - loading every .glb in the suits folder instead'); }
  // auto-discover: any .glb dropped into suits/ shows up, even if suits.json is empty or broken
  if (!list || !(list.suits || []).length) {
    let files = [];
    try { const r = await fetch(base + '__list.json', { cache: 'no-cache' }); if (r.ok) files = await r.json(); } catch (e) { }
    if (!files.length) try { const r = await fetch(base, { cache: 'no-cache' }); if (r.ok) { const t = await r.text(); files = [...t.matchAll(/href="([^"]+\.(glb|gltf))"/gi)].map(m => decodeURIComponent(m[1]).split('/').pop()); } } catch (e) { }
    files = [...new Set(files)];
    if (files.length) list = { hideBuiltIn: list ? list.hideBuiltIn !== false : true, suits: files.map(f => ({ name: f.replace(/\.(glb|gltf)$/i, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).slice(0, 28), file: f })) };
  }
  if (!list) return;
  window.HIDE_BUILTIN = !!list.hideBuiltIn && (list.suits || []).length > 0;
  for (const s of list.suits || []) {
    try { const r = await fetch(base + s.file); if (!r.ok) throw new Error('file not found'); const key = await addCustomModel(s.name || s.file, await r.arrayBuffer(), false); }
    catch (e) { console.warn('suit', s.file, e); ui.notice('Suit "' + (s.name || s.file) + '" could not load: ' + (e.message || e)); }
  }
  const want = lsGet('webline.custom'); const pickKey = customModels.find(m => m.key === want) ? want : (window.HIDE_BUILTIN && customModels[0] ? customModels[0].key : null);
  if (pickKey && hero) wearCustom(pickKey);
  buildSuitCards();
}
