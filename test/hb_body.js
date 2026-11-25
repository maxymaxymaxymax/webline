const r=new THREE.WebGLRenderer({antialias:true}); r.setSize(1200,600); document.body.appendChild(r.domElement); r.outputEncoding=THREE.sRGBEncoding;
const s=new THREE.Scene(); s.background=new THREE.Color(0x8899aa); s.add(new THREE.HemisphereLight(0xffffff,0x444444,1.2)); const dl=new THREE.DirectionalLight(0xffffff,1.6); dl.position.set(1,2,3); s.add(dl);
const cam=new THREE.PerspectiveCamera(30,2,0.1,100); cam.position.set(3,1.1,7); cam.lookAt(3,0.95,0);
for(const k of ['hb1','hb2','hb3']) CHAR_DEFS[k]={file:k,yaw:0,h:1.82}; await loadAllChars(); for(const k of ['hb1','hb2','hb3']) retarget('hero','idle',k,'idle'); ['hero','hb1','hb2','hb3'].forEach((k,i)=>{const it=makeInstance(k); it.group.position.set(i*2,0,0); s.add(it.group); playAct(it,'idle',0); for(let j=0;j<10;j++) it.mixer.update(0.05);});
r.render(s,cam); document.title='done';
