const r=new THREE.WebGLRenderer({antialias:true}); r.setSize(1600,600); document.body.appendChild(r.domElement); r.outputEncoding=THREE.sRGBEncoding;
const s=new THREE.Scene(); s.background=new THREE.Color(0x8899aa); s.add(new THREE.HemisphereLight(0xffffff,0x444444,1.2)); const dl=new THREE.DirectionalLight(0xffffff,1.6); dl.position.set(1,2,3); s.add(dl);
const cam=new THREE.PerspectiveCamera(28,1600/600,0.1,100); cam.position.set(9,1.4,15); cam.lookAt(9,0.9,0);
await loadAllChars();
const keys=Object.keys(CHAR_DEFS); const insts=[];
const anim=new URLSearchParams(location.search).get('a')||'walk';
keys.forEach((k,i)=>{const it=makeInstance(k); it.group.position.set(i*2,0,0); s.add(it.group); const a=playAct(it, it.actions[anim]?anim:'idle',0); insts.push(it);});
for(let i=0;i<20;i++) insts.forEach(it=>it.mixer.update(0.031));
r.render(s,cam); window.RESULT=keys.map(k=>k+':'+Object.keys(CHARS[k].clips).join(',')); document.title='done';
