// ================= HERO: rigged body, suit shader, pose layer =================
const SUITS_PRIVATE = [
  { id: 'classic', name: 'Fresh Day', blurb: 'Crimson and royal blue with a small, sharp black spider on the chest.', red: 0xa50b22, blue: 0x18307e, emb: 0x0b0b0e, embMetal: 0.1, embRough: 0.5, embScale: 0.62, embGlow: 0 },
  { id: 'gold', name: 'Gold Spider', blurb: 'Red and blue with a polished gold spider across chest and back.', red: 0xa50b22, blue: 0x18307e, emb: 0xf2b53a, embMetal: 1.0, embRough: 0.22, embScale: 1.0, embGlow: 0.12 },
  { id: 'white', name: 'White Spider', blurb: 'Red and blue with a bold white spider across chest and back.', red: 0xa50b22, blue: 0x18307e, emb: 0xf4f6f8, embMetal: 0.0, embRough: 0.35, embScale: 1.08, embGlow: 0.05 },
  { id: 'cat', name: 'Corner Store Cat', blurb: 'Street-black with red panels and a white spider. Comes with a tabby riding in the backpack.', red: 0x17181c, blue: 0xa8101d, emb: 0xf2f2f2, embMetal: 0, embRough: 0.4, embScale: 0.9, embGlow: 0.04, cat: true },
  { id: 'noir', name: 'Black Suit', blurb: 'Charcoal and black with a silver spider. Made for rooftops at dusk.', red: 0x2b2b30, blue: 0x0b0b0d, emb: 0x9a9aa2, embMetal: 0.9, embRough: 0.3, embScale: 0.95, embGlow: 0, lines: 0.5 },
];
// Public-release suit set: original hero design (no spider emblem, slit visor) to keep clear of existing characters.
const SUITS_RELEASE = [
  { id: 'classic', name: 'Classic', blurb: 'Crimson and royal blue with a small black web emblem.', red: 0xa50b22, blue: 0x18307e, emb: 0x0b0b0e, embMetal: 0.1, embRough: 0.5, embScale: 0.7, embGlow: 0, lens: 0xf4f7fa },
  { id: 'gold', name: 'Gold Web', blurb: 'Red and blue with a polished gold web emblem across chest and back.', red: 0xa50b22, blue: 0x18307e, emb: 0xf2b53a, embMetal: 1.0, embRough: 0.22, embScale: 1.0, embGlow: 0.12, lens: 0xfff1d0 },
  { id: 'white', name: 'White Web', blurb: 'Red and blue with a bold white web emblem across chest and back.', red: 0xa50b22, blue: 0x18307e, emb: 0xf4f6f8, embMetal: 0.0, embRough: 0.35, embScale: 1.08, embGlow: 0.05, lens: 0xf4f7fa },
  { id: 'tide', name: 'Tidewire', blurb: 'Deep teal and charcoal with an orange web emblem.', red: 0x0f6672, blue: 0x17191e, emb: 0xff8a1c, embMetal: 0.2, embRough: 0.4, embScale: 0.9, embGlow: 0.15, lens: 0x7ff3ff },
  { id: 'ember', name: 'Ember', blurb: 'Charcoal with burnt-orange panels and a gold web emblem.', red: 0x24262b, blue: 0xb4501a, emb: 0xf2b53a, embMetal: 1.0, embRough: 0.22, embScale: 1.0, embGlow: 0.12, lens: 0xffc46b },
  { id: 'frost', name: 'Frostline', blurb: 'Snow white and slate grey with an ice-blue web emblem.', red: 0xd9dde2, blue: 0x3a414b, emb: 0x47c4ff, embMetal: 0.1, embRough: 0.35, embScale: 1.0, embGlow: 0.2, lens: 0x9fe6ff },
  { id: 'cat', name: 'Corner Store Cat', blurb: 'Street-black and olive with a white web emblem. Comes with a tabby riding in the backpack.', red: 0x17181c, blue: 0x4d5a2a, emb: 0xf2f2f2, embMetal: 0, embRough: 0.4, embScale: 0.9, embGlow: 0.04, cat: true, lens: 0xfff1b0 },
  { id: 'noir', name: 'Noir', blurb: 'Charcoal and black with a silver web emblem. Made for rooftops at dusk.', red: 0x2b2b30, blue: 0x0b0b0d, emb: 0x9a9aa2, embMetal: 0.9, embRough: 0.3, embScale: 0.95, embGlow: 0, lines: 0.5, lens: 0xe8e8ee },
  { id: 'cosmic', name: 'Cosmic', blurb: 'Deep violet with a starfield through the dark panels and a gold web emblem.', red: 0x2a1660, blue: 0x070a20, emb: 0xf2d16b, embMetal: 0.8, embRough: 0.25, embScale: 1.0, embGlow: 0.25, stars: 1, lens: 0xd9b8ff },
  { id: 'iron', name: 'Gunmetal', blurb: 'Armored gunmetal plating with gold trim and a gold web emblem.', red: 0x4a5058, blue: 0xb98a2c, emb: 0xf0c050, embMetal: 1.0, embRough: 0.2, embScale: 1.0, embGlow: 0.1, metal: 0.75, lens: 0xffe08a },
];
const SUITS = window.RELEASE ? SUITS_RELEASE : SUITS_PRIVATE;
let suitIdx = 0; try { suitIdx = clamp(parseInt(lsGet('webline.suit') || '0') || 0, 0, SUITS.length - 1); } catch (e) { }
const suitU = {
  uRed: { value: new Col() }, uBlue: { value: new Col() }, uEmb: { value: new Col() }, uEmbMetal: { value: 0 }, uEmbRough: { value: 0.5 }, uEmbScale: { value: 1 }, uEmbGlow: { value: 0 },
  uOrigin: { value: new V3() }, uUp: { value: new V3() }, uSide: { value: new V3() }, uFwd: { value: new V3() }, uH: { value: 1 },
  uEyeL: { value: new V3() }, uEyeR: { value: new V3() }, uChest: { value: new V3() }, uNeckY: { value: 0.3 }, uWristX: { value: 0.4 }, uFootY: { value: -0.5 }, uOD: { value: 0 }, uTime: windTime, uHoodie: { value: 0 }, uBodyMetal: { value: 0 }, uStars: { value: 0 }, uLineK: { value: 1 }, uRelease: { value: window.RELEASE ? 1 : 0 }, uLens: { value: new Col(0xffffff) },
};
function applySuit(i) {
  suitIdx = i; const s = SUITS[i]; lsSet('webline.suit', String(i));
  suitU.uRed.value.setHex(s.red); suitU.uBlue.value.setHex(s.blue); suitU.uEmb.value.setHex(s.emb);
  suitU.uEmbMetal.value = s.embMetal; suitU.uEmbRough.value = s.embRough; suitU.uEmbScale.value = s.embScale; suitU.uEmbGlow.value = s.embGlow;
  suitU.uLens.value.setHex(s.lens || 0xf4f7fa); suitU.uHoodie.value = s.cat ? 1 : 0; if (typeof hoodMesh !== 'undefined' && hoodMesh) hoodMesh.visible = !!s.cat; suitU.uBodyMetal.value = s.metal || 0; suitU.uStars.value = s.stars || 0; suitU.uLineK.value = s.lines ?? 1; if (typeof catPack !== 'undefined' && catPack) catPack.visible = !!s.cat;
}
function makeSuitMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.05 });
  m.customProgramCacheKey = () => 'suit';
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, suitU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBP; varying vec3 vBN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBP=position; vBN=normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vBP; varying vec3 vBN;
      uniform vec3 uRed,uBlue,uEmb,uOrigin,uUp,uSide,uFwd,uEyeL,uEyeR,uChest; uniform float uRelease; uniform float uHoodie; uniform vec3 uLens; uniform float uEmbMetal,uEmbRough,uEmbScale,uEmbGlow,uH,uNeckY,uWristX,uFootY,uOD,uTime,uBodyMetal,uStars,uLineK;
      float SM=0.0, SR=0.5, SE=0.0, SH=0.0; vec3 SEC=vec3(0.0);
      float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h); }
      float hexLine(vec2 p){ p*=vec2(1.0,1.1547); vec2 q=vec2(p.x+p.y*0.5,p.y); vec2 pi=floor(q), pf=fract(q); float v=mod(pi.x+pi.y,3.0);
        float ca=step(1.0,v), cb=step(2.0,v); vec2 ma=step(pf.xy,pf.yx); float e=dot(ma,1.0-pf.yx+ca*(pf.x+pf.y-1.0)+cb*(pf.yx-2.0*pf.xy));
        return e; }
      float webEm(vec2 p){ // web emblem: 8 spokes and straight-edged rings, inside a soft circle
        p.y*=0.9; float r=length(p); float a=atan(p.y,p.x); float seg=6.2831853/8.0;
        float ang=mod(a+seg*0.5,seg)-seg*0.5;
        float d=max(abs(r*sin(ang))-0.032, r-0.98);
        float pr=r*cos(ang); for(int i=1;i<=4;i++){ d=min(d, max(abs(pr-float(i)*0.23)-0.026, r-0.98)); }
        return d; }
      float sigil(vec2 p){ // original web-knot sigil: diamond ring, spine and swept wings
        vec2 a=vec2(abs(p.x),p.y);
        float d=abs(a.x*0.9+abs(p.y)*0.62-0.42)-0.07;
        d=min(d, sdSeg(p,vec2(0.0,-0.85),vec2(0.0,0.85))-0.055);
        d=min(d, sdSeg(a,vec2(0.42,0.05),vec2(0.95,0.32))-0.05);
        d=min(d, sdSeg(a,vec2(0.36,-0.12),vec2(0.78,-0.45))-0.045);
        return d; }
      float spider(vec2 p){ // original angular spider emblem, p in emblem units (~-1..1)
        float d=length((p-vec2(0.0,0.18))*vec2(1.6,1.15))-0.2;              // thorax
        d=min(d,length((p-vec2(0.0,-0.28))*vec2(1.35,0.9))-0.28);          // abdomen
        d=min(d,length((p-vec2(0.0,0.46))*vec2(1.9,1.9))-0.11);            // head
        vec2 a=vec2(abs(p.x),p.y);
        d=min(d,min(sdSeg(a,vec2(0.08,0.28),vec2(0.42,0.62)),sdSeg(a,vec2(0.42,0.62),vec2(0.5,1.0)))-0.038);
        d=min(d,min(sdSeg(a,vec2(0.1,0.18),vec2(0.6,0.34)),sdSeg(a,vec2(0.6,0.34),vec2(0.78,0.66)))-0.038);
        d=min(d,min(sdSeg(a,vec2(0.1,0.08),vec2(0.6,-0.1)),sdSeg(a,vec2(0.6,-0.1),vec2(0.8,-0.5)))-0.038);
        d=min(d,min(sdSeg(a,vec2(0.08,-0.02),vec2(0.4,-0.42)),sdSeg(a,vec2(0.4,-0.42),vec2(0.46,-0.95)))-0.038);
        return d; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      {
        vec3 d=vBP-uOrigin; vec3 q=vec3(dot(d,uSide),dot(d,uUp),dot(d,uFwd))/uH;
        vec3 n=normalize(vec3(dot(vBN,uSide),dot(vBN,uUp),dot(vBN,uFwd)));
        float ax=abs(q.x);
        vec3 col=uRed; float rough=0.48;
        bool head=q.y>uNeckY; bool arm=ax>0.13 && q.y>0.1; bool leg=q.y<-0.03;
        float blue=0.0;
        if(!head){
          if(arm){ blue=step(n.y,-0.15); if(ax>uWristX) blue=0.0; }
          else if(leg){ blue=step(0.45,n.x*sign(q.x)) + step(n.z,-0.55); blue=min(blue,1.0); if(q.y<uFootY+0.06) blue=0.0; }
          else { float side=smoothstep(0.55,0.62,abs(n.x)); float yoke=step(0.27,q.y)*step(n.z,0.2); blue=max(side,yoke*0.0); blue=max(blue,step(0.0,-0.02-q.y)*0.0); }
        }
        col=mix(col,uBlue,blue);
        float HOOD=0.0;
        if(uHoodie>0.5 && !head){ bool torso=q.y>-0.07 && ax<0.16; bool upperArm=arm && ax<0.3; if(torso||upperArm){ HOOD=1.0;
          float fab=0.85+0.15*fract(sin(dot(floor(q.xy*900.0),vec2(12.9898,78.233)))*43758.5453);
          col=vec3(0.075,0.078,0.085)*fab;
          if(torso && q.y<-0.03) col*=0.7+0.3*step(0.5,fract(q.x*180.0));          // ribbed hem
          if(upperArm && ax>0.27) col*=0.7+0.3*step(0.5,fract(q.y*180.0));         // ribbed cuffs
          if(torso && n.z>0.3 && abs(q.x)<0.075 && q.y>-0.02 && q.y<0.08){ float e=min(min(abs(abs(q.x)-0.075),abs(q.y+0.02)),abs(q.y-0.08)); col=mix(col,col*0.55,1.0-smoothstep(0.0,0.004,e)); } // pocket seam
        } }
        // hex web lines (triplanar)
        vec3 w=abs(n); w/=w.x+w.y+w.z; float sc=26.0;
        float hx=hexLine(q.zy*sc)*w.x+hexLine(q.xz*sc)*w.y+hexLine(q.xy*sc)*w.z;
        float line=(1.0-smoothstep(0.035,0.09,hx))*(1.0-smoothstep(0.08,0.35,fwidth(hx)));
        line*=uLineK*(1.0-HOOD); col=mix(col,col*0.42,line*0.8); rough=mix(rough,0.3,line); SH=line*(head?0.6:1.0);
        float starG=0.0; if(uStars>0.5){ vec2 sp=floor(q.xy*vec2(220.0,220.0)+q.z*97.0); float h=fract(sin(dot(sp,vec2(12.9898,78.233)))*43758.5453); starG=step(0.985,h)*(0.6+0.4*sin(uTime*3.0+h*40.0))*blue + step(0.995,h)*(1.0-blue)*0.5; }
        // seams between red and blue
        // lenses
        if(head){
          vec2 e1=(q.xy-uEyeL.xy)/uH; vec2 e2=(q.xy-uEyeR.xy)/uH;
        }
        // emblem front and back
        vec2 ec=vec2(q.x, q.y-uChest.y);
        float front=step(0.25,n.z), back=step(0.25,-n.z);
        float es=0.095*uEmbScale; float sd=(uRelease>0.5?webEm(ec/es):spider(ec/es))*es;
        float sdb=(uRelease>0.5?webEm((ec+vec2(0.0,0.02))/(es*1.25)):spider((ec+vec2(0.0,0.02))/(es*1.25)))*es*1.25;
        float emb=max(front*(1.0-smoothstep(0.0,0.0025,sd)), back*(1.0-smoothstep(0.0,0.0025,sdb)));
        emb*=step(q.y,uNeckY)*step(-0.12,q.y)*step(ax,0.2);
        rough=mix(rough,0.92,HOOD); col=mix(col,uEmb,emb); rough=mix(rough,uEmbRough,emb); SM=max(uEmbMetal*emb, uBodyMetal*(1.0-emb)); if(uBodyMetal>0.0) rough=mix(rough,0.28,1.0-emb); SE=uEmbGlow*emb; SEC=uEmb*SE+vec3(0.85,0.9,1.0)*starG*1.5;
        // lenses: angular teardrops
        if(head && n.z>0.2 && uRelease>0.5){ // sharp round lenses with a thick black rim
          for(int i=0;i<2;i++){
            vec3 eye=i==0?uEyeL:uEyeR; float sx=i==0?1.0:-1.0;
            vec2 e=vec2(q.x-sx*max(abs(eye.x),0.022), q.y-eye.y-0.001);
            float lens=length(e*vec2(1.0,0.92))-0.0152; float frame=lens-0.0042; float aa=max(fwidth(lens),1e-5);
            float fm=1.0-smoothstep(-aa,aa,frame), lm=1.0-smoothstep(-aa,aa,lens);
            col=mix(col,vec3(0.012),fm); col=mix(col,uLens,lm); rough=mix(rough,0.08,fm); SEC+=uLens*lm*0.3;
          }
        }
        else if(head && n.z>0.2){
          for(int i=0;i<2;i++){
            vec3 eye=i==0?uEyeL:uEyeR; float s=i==0?1.0:-1.0;
            vec2 e=vec2((q.x-eye.x)*s, q.y-eye.y);
            vec2 r=vec2(e.x*0.8+e.y*0.6, -e.x*0.6+e.y*0.8);
            float lens=length(r*vec2(0.85,1.5))-0.0168;
            lens=max(lens, -(r.x+0.0105));
            lens=max(lens, dot(r, normalize(vec2(0.5,1.0)))-0.0115);
            float frame=lens-0.0045; float aa=max(fwidth(lens),1e-5);
            float fm=1.0-smoothstep(-aa,aa,frame), lm=1.0-smoothstep(-aa,aa,lens);
            if(fm>0.0){ col=mix(col,vec3(0.012),fm); col=mix(col,vec3(0.97,0.98,1.0),lm); rough=mix(rough,0.1,fm); SE=max(SE,lm*0.3); SEC=mix(SEC,vec3(0.92,0.96,1.0)*0.3,lm); }
          }
        }
        // overdrive glow along hex lines
        SEC+=vec3(1.0,0.55,0.15)*line*uOD*(0.6+0.4*sin(uTime*10.0+q.y*30.0));
        diffuseColor.rgb=col; SR=rough;
      }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=SR;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor=max(metalnessFactor,SM);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=SEC;');
  };
  return m;
}
const suitMat = makeSuitMaterial();
function setupSuitSpace() {
  const C = CHARS.hero; let sk = null; C.root.traverse(o => { if (o.isSkinnedMesh && !sk) sk = o; });
  const bindInv = sk.bindMatrix.clone().invert();
  const bp = (name) => { const b = C.bones[name]; const i = sk.skeleton.bones.indexOf(b); const m = sk.skeleton.boneInverses[i].clone().invert(); return new V3().setFromMatrixPosition(m).applyMatrix4(bindInv); };
  const hips = bp('Hips'), head = bp('Head'), neck = bp('Neck'), lh = bp('LeftHand'), rh = bp('RightHand'), sp2 = bp('Spine2'), lf = bp('LeftFoot');
  const top = C.bones.HeadTop_End ? bp('HeadTop_End') : head.clone().add(new V3(0, 0.2, 0));
  let eyeL, eyeR; if (C.bones.LeftEye && C.bones.RightEye) { eyeL = bp('LeftEye'); eyeR = bp('RightEye'); } else { const e = head.clone().add(head.clone().sub(bp('Neck')).multiplyScalar(0.95)); eyeL = e.clone(); eyeR = e.clone(); }
  const up = head.clone().sub(hips).normalize(); const side = lh.clone().sub(rh); side.addScaledVector(up, -side.dot(up)).normalize(); const fwd = new V3().crossVectors(side, up).normalize();
  const H = head.clone().sub(lf).dot(up) * 1.13;
  const loc = v => { const d = v.clone().sub(hips); return new V3(d.dot(side) / H, d.dot(up) / H, d.dot(fwd) / H); };
  suitU.uOrigin.value.copy(hips); suitU.uUp.value.copy(up); suitU.uSide.value.copy(side); suitU.uFwd.value.copy(fwd); suitU.uH.value = H;
  const nl = loc(neck), hl = loc(head), el = loc(eyeL), er = loc(eyeR), cl = loc(sp2), wl = loc(lh), fl = loc(lf);
  suitU.uNeckY.value = nl.y + (hl.y - nl.y) * 0.25;
  const eyeY = el.y - 0.004; el.y = eyeY; er.y = eyeY; el.x = Math.abs(el.x) > 0.005 ? el.x : 0.02; er.x = Math.abs(er.x) > 0.005 ? er.x : -0.02;
  el.x = Math.max(0.0175, Math.abs(el.x)); er.x = -Math.max(0.0175, Math.abs(er.x)); el.y += 0.006; er.y += 0.006;
  suitU.uEyeL.value.copy(el); suitU.uEyeR.value.copy(er);
  suitU.uChest.value.set(0, cl.y + 0.035, 0); suitU.uWristX.value = Math.abs(wl.x) - 0.02; suitU.uFootY.value = fl.y;
}

// ---------- pose layer ----------
const v3 = (x, y, z) => new V3(x, y, z).normalize();
const CHAINS = [['Spine', 'Neck', 'spine'], ['Neck', 'HeadTop_End', 'head'], ['LeftArm', 'LeftForeArm', 'armL'], ['LeftForeArm', 'LeftHand', 'foreL'], ['RightArm', 'RightForeArm', 'armR'], ['RightForeArm', 'RightHand', 'foreR'],
['LeftUpLeg', 'LeftLeg', 'thighL'], ['LeftLeg', 'LeftFoot', 'shinL'], ['RightUpLeg', 'RightLeg', 'thighR'], ['RightLeg', 'RightFoot', 'shinR'], ['LeftFoot', 'LeftToeBase', 'footL'], ['RightFoot', 'RightToeBase', 'footR']];
const GROUP = { spine: 'spine', head: 'spine', armL: 'armL', foreL: 'armL', armR: 'armR', foreR: 'armR', thighL: 'legs', shinL: 'legs', thighR: 'legs', shinR: 'legs', footL: 'legs', footR: 'legs' };
const NEUTRAL = { spine: v3(0, 1, 0.05), head: v3(0, 1, 0.1), armL: v3(0.25, -1, 0), foreL: v3(0.15, -1, 0.2), armR: v3(-0.25, -1, 0), foreR: v3(-0.15, -1, 0.2), thighL: v3(0.08, -1, 0), shinL: v3(0.05, -1, -0.05), thighR: v3(-0.08, -1, 0), shinR: v3(-0.05, -1, -0.05), footL: v3(0, -0.5, 1), footR: v3(0, -0.5, 1) };
function mirror(p) { const o = {}; for (const k in p) { const m = k.endsWith('L') ? k.slice(0, -1) + 'R' : k.endsWith('R') ? k.slice(0, -1) + 'L' : k; o[m] = new V3(-p[k].x, p[k].y, p[k].z); } return o; }
const POSES = {
  air: { spine: v3(0, 1, 0.25), head: v3(0, 0.85, 0.5), armL: v3(0.75, -0.1, -0.65), foreL: v3(0.55, 0.3, -0.75), armR: v3(-0.4, 0.55, 0.7), foreR: v3(-0.3, 0.75, 0.6), thighL: v3(0.15, -0.2, 0.97), shinL: v3(0.05, -0.95, -0.25), thighR: v3(-0.1, -0.95, -0.25), shinR: v3(-0.05, -0.4, -0.92), footL: v3(0, -0.8, 0.5), footR: v3(0, -0.8, 0.5) },
  fall: { spine: v3(0, 1, -0.2), head: v3(0, 0.75, 0.65), armL: v3(1, 0.55, -0.15), foreL: v3(0.6, 0.9, 0.1), armR: v3(-1, 0.35, 0.1), foreR: v3(-0.7, 0.7, 0.3), thighL: v3(0.4, -0.85, 0.35), shinL: v3(0.2, -0.5, -0.85), thighR: v3(-0.3, -0.95, -0.1), shinR: v3(-0.1, -0.8, -0.6) },
  headDown: { spine: v3(0, 1, -0.15), head: v3(0, 0.6, 0.8), armL: v3(0.95, 0.3, -0.1), foreL: v3(0.8, 0.55, 0.15), armR: v3(-0.95, 0.3, -0.1), foreR: v3(-0.8, 0.55, 0.15), thighL: v3(0.25, -1, -0.25), shinL: v3(0.1, -0.6, -0.8), thighR: v3(-0.2, -1, 0.05), shinR: v3(-0.1, -0.95, -0.3), footL: v3(0, -0.6, -0.8), footR: v3(0, -1, -0.2) },
  cling: { spine: v3(0.15, 1, 0.2), head: v3(0.1, 0.9, 0.45), armL: v3(0.5, -0.85, 0.3), foreL: v3(0.35, -0.75, 0.55), armR: v3(-0.5, -0.85, 0.3), foreR: v3(-0.35, -0.75, 0.55), thighL: v3(0.45, 0.15, 0.88), shinL: v3(0.2, -0.95, 0.25), thighR: v3(-0.15, -0.95, 0.25), shinR: v3(-0.08, -0.9, -0.4), footL: v3(0, -0.6, 0.8), footR: v3(0, -1, 0.3) },
  swBack: { spine: v3(0, 1, 0.35), head: v3(0, 0.8, 0.6), armL: v3(0.75, -0.35, -0.55), foreL: v3(0.55, 0.1, -0.8), armR: v3(-0.75, -0.35, -0.55), foreR: v3(-0.55, 0.1, -0.8), thighL: v3(0.14, -0.55, -0.82), shinL: v3(0.08, 0.35, -0.94), thighR: v3(-0.12, -0.75, -0.65), shinR: v3(-0.06, 0.1, -0.99), footL: v3(0, 0.6, -0.8), footR: v3(0, 0.4, -0.9) },
  swBottom: { spine: v3(0, 1, 0.05), head: v3(0, 0.75, 0.66), armL: v3(0.55, -0.75, 0.1), foreL: v3(0.4, -0.6, 0.6), armR: v3(-0.55, -0.75, 0.1), foreR: v3(-0.4, -0.6, 0.6), thighL: v3(0.1, -0.95, 0.25), shinL: v3(0.06, -0.85, -0.5), thighR: v3(-0.1, -0.98, -0.05), shinR: v3(-0.05, -0.9, -0.4), footL: v3(0, -0.5, 0.85), footR: v3(0, -0.6, 0.8) },
  swFront: { spine: v3(0, 1, -0.2), head: v3(0, 0.7, 0.7), armL: v3(0.35, 0.55, 0.75), foreL: v3(0.25, 0.65, 0.7), armR: v3(-0.35, 0.55, 0.75), foreR: v3(-0.25, 0.65, 0.7), thighL: v3(0.12, -0.15, 0.99), shinL: v3(0.08, -0.55, 0.83), thighR: v3(-0.1, -0.45, 0.89), shinR: v3(-0.06, -0.95, 0.3), footL: v3(0, -0.2, 1), footR: v3(0, -0.6, 0.8) },
  swTop: { spine: v3(0, 1, 0.55), head: v3(0, 0.6, 0.8), armL: v3(0.4, -0.2, 0.9), foreL: v3(-0.1, 0.4, 0.9), armR: v3(-0.4, -0.2, 0.9), foreR: v3(0.1, 0.4, 0.9), thighL: v3(0.15, 0.55, 0.82), shinL: v3(0.06, -0.95, 0.3), thighR: v3(-0.15, 0.45, 0.88), shinR: v3(-0.06, -0.95, 0.25), footL: v3(0, -0.5, 0.85), footR: v3(0, -0.5, 0.85) },
  roll: { spine: v3(0, 1, 0.75), head: v3(0, 0.4, 0.9), armL: v3(0.3, -0.3, 0.9), foreL: v3(-0.2, -0.5, 0.85), armR: v3(-0.3, -0.3, 0.9), foreR: v3(0.2, -0.5, 0.85), thighL: v3(0.15, 0.45, 0.88), shinL: v3(0.05, -1, 0.05), thighR: v3(-0.15, 0.45, 0.88), shinR: v3(-0.05, -1, 0.05) },
  relArc: { spine: v3(0, 1, -0.4), head: v3(0, 0.9, 0.45), armL: v3(0.9, 0.15, -0.45), foreL: v3(0.75, 0.3, -0.55), armR: v3(-0.9, 0.15, -0.45), foreR: v3(-0.75, 0.3, -0.55), thighL: v3(0.06, -1, -0.3), shinL: v3(0.04, -0.85, -0.5), thighR: v3(-0.06, -1, -0.3), shinR: v3(-0.04, -0.85, -0.5), footL: v3(0, -1, -0.4), footR: v3(0, -1, -0.4) },
  relSuper: { spine: v3(0, 1, 0.1), head: v3(0, 0.8, 0.6), armR: v3(-0.15, 0.75, 0.65), foreR: v3(-0.1, 0.8, 0.6), armL: v3(0.35, -0.85, -0.4), foreL: v3(0.25, -0.9, -0.3), thighL: v3(0.1, -1, -0.15), shinL: v3(0.06, -0.95, -0.3), thighR: v3(-0.1, -0.9, 0.25), shinR: v3(-0.05, -0.8, -0.6) },
  relCork: { spine: v3(0, 1, 0), head: v3(0, 1, 0.2), armL: v3(0.25, -0.4, 0.85), foreL: v3(-0.6, 0.3, 0.6), armR: v3(-0.25, -0.4, 0.85), foreR: v3(0.6, 0.3, 0.6), thighL: v3(0.04, -1, 0.05), shinL: v3(0.03, -1, -0.05), thighR: v3(-0.04, -1, 0.05), shinR: v3(-0.03, -1, -0.05), footL: v3(0, -1, -0.3), footR: v3(0, -1, -0.3) },
  perch: { spine: v3(0, 1, 0.95), head: v3(0, 0.55, 0.85), armL: v3(0.35, -0.75, 0.55), foreL: v3(0.1, -1, 0.15), armR: v3(-0.2, -0.9, 0.4), foreR: v3(-0.05, -1, 0.1), thighL: v3(0.55, -0.05, 0.85), shinL: v3(0.15, -0.95, -0.25), thighR: v3(-0.55, -0.05, 0.85), shinR: v3(-0.15, -0.95, -0.25), footL: v3(0.2, -0.3, 1), footR: v3(-0.2, -0.3, 1) },
  swingFwd: { spine: v3(0, 1, 0.15), armL: v3(0.6, -0.5, -0.3), foreL: v3(0.5, -0.3, 0.3), armR: v3(-0.6, -0.5, -0.3), foreR: v3(-0.5, -0.3, 0.3), thighL: v3(0.15, -0.25, 0.97), shinL: v3(0.05, -0.95, -0.2), thighR: v3(-0.12, -0.7, 0.7), shinR: v3(-0.05, -0.75, -0.6) },
  swingBack: { spine: v3(0, 1, -0.1), armL: v3(0.8, -0.2, -0.5), foreL: v3(0.6, 0.2, -0.3), armR: v3(-0.8, -0.2, -0.5), foreR: v3(-0.6, 0.2, -0.3), thighL: v3(0.12, -0.85, 0.5), shinL: v3(0.05, -0.55, -0.85), thighR: v3(-0.1, -0.9, -0.42), shinR: v3(-0.05, -0.6, -0.8) },
  glide: { spine: v3(0, 1, -0.05), head: v3(0, 0.8, 0.6), armL: v3(1, 0.05, -0.15), foreL: v3(1, 0.1, -0.05), armR: v3(-1, 0.05, -0.15), foreR: v3(-1, 0.1, -0.05), thighL: v3(0.3, -1, -0.08), shinL: v3(0.32, -1, -0.12), thighR: v3(-0.3, -1, -0.08), shinR: v3(-0.32, -1, -0.12), footL: v3(0, -1, -0.3), footR: v3(0, -1, -0.3) },
  dive: { spine: v3(0, 1, 0), head: v3(0, 0.7, 0.7), armL: v3(0.25, -1, -0.3), foreL: v3(0.2, -1, -0.3), armR: v3(-0.25, -1, -0.3), foreR: v3(-0.2, -1, -0.3), thighL: v3(0.06, -1, -0.05), shinL: v3(0.04, -1, -0.1), thighR: v3(-0.06, -1, -0.05), shinR: v3(-0.04, -1, -0.1), footL: v3(0, -1, -0.2), footR: v3(0, -1, -0.2) },
  crouch: { spine: v3(0, 1, 0.5), head: v3(0, 0.8, 0.6), armL: v3(0.3, -0.9, 0.4), foreL: v3(0.1, -0.9, 0.5), armR: v3(-0.3, -0.9, 0.4), foreR: v3(-0.1, -0.9, 0.5), thighL: v3(0.25, -0.35, 0.9), shinL: v3(0.05, -0.85, -0.5), thighR: v3(-0.25, -0.35, 0.9), shinR: v3(-0.05, -0.85, -0.5) },
  land: { spine: v3(0, 1, 0.75), head: v3(0, 0.6, 0.8), armL: v3(0.9, 0.1, -0.5), foreL: v3(0.8, 0.3, -0.4), armR: v3(-0.25, -0.9, 0.35), foreR: v3(-0.1, -1, 0.2), thighL: v3(0.3, -0.25, 0.92), shinL: v3(0.05, -0.85, -0.5), thighR: v3(-0.3, -0.75, -0.6), shinR: v3(-0.05, -0.15, -0.99) },
  wall: { spine: v3(0, 1, 0.1), head: v3(0, 0.7, -0.7), armL: v3(0.6, 0.75, 0.25), foreL: v3(0.3, 0.9, 0.35), armR: v3(-0.7, -0.2, 0.4), foreR: v3(-0.3, 0.5, 0.8), thighL: v3(0.6, -0.5, 0.6), shinL: v3(0.45, -0.85, -0.2), thighR: v3(-0.6, -0.75, 0.3), shinR: v3(-0.4, -0.9, -0.2) },
  starfish: { spine: v3(0, 1, -0.15), armL: v3(1, 0.65, 0), foreL: v3(1, 0.7, 0), armR: v3(-1, 0.65, 0), foreR: v3(-1, 0.7, 0), thighL: v3(0.7, -0.75, 0), shinL: v3(0.75, -0.7, 0), thighR: v3(-0.7, -0.75, 0), shinR: v3(-0.75, -0.7, 0) },
  tuck: { spine: v3(0, 1, 0.6), head: v3(0, 0.5, 0.85), armL: v3(0.2, -0.3, 0.9), foreL: v3(-0.3, -0.6, 0.6), armR: v3(-0.2, -0.3, 0.9), foreR: v3(0.3, -0.6, 0.6), thighL: v3(0.15, 0.4, 0.9), shinL: v3(0.05, -1, 0), thighR: v3(-0.15, 0.4, 0.9), shinR: v3(-0.05, -1, 0) },
  zip: { spine: v3(0, 1, 0.2), armL: v3(0.2, 0.6, 0.75), foreL: v3(0.1, 0.6, 0.8), armR: v3(-0.2, 0.6, 0.75), foreR: v3(-0.1, 0.6, 0.8), thighL: v3(0.1, -0.7, 0.6), shinL: v3(0, -1, -0.3), thighR: v3(-0.1, -1, -0.2), shinR: v3(0, -0.6, -0.8) },
  sling: { spine: v3(0, 1, -0.3), armL: v3(0.35, 0.3, 0.9), foreL: v3(0.3, 0.3, 0.9), armR: v3(-0.35, 0.3, 0.9), foreR: v3(-0.3, 0.3, 0.9), thighL: v3(0.3, -0.4, 0.85), shinL: v3(0.05, -0.85, -0.5), thighR: v3(-0.3, -0.4, 0.85), shinR: v3(-0.05, -0.85, -0.5) },
  punchR: { spine: v3(0.15, 1, 0.25), armR: v3(-0.05, 0.1, 1), foreR: v3(0, 0.1, 1), armL: v3(0.4, -0.5, 0.6), foreL: v3(-0.1, 0.8, 0.5) },
  punchL: null, kickR: { spine: v3(-0.2, 1, -0.3), armL: v3(0.9, 0.1, 0.2), foreL: v3(0.8, 0.3, 0.3), armR: v3(-0.7, 0, -0.5), foreR: v3(-0.6, 0.3, -0.3), thighR: v3(-0.05, 0.2, 1), shinR: v3(-0.05, 0.25, 1), thighL: v3(0.1, -1, -0.1), shinL: v3(0.05, -1, -0.15) },
  upper: { spine: v3(0, 1, -0.2), armR: v3(-0.1, 1, 0.4), foreR: v3(-0.05, 1, 0.1), armL: v3(0.6, -0.6, 0.3), foreL: v3(0.2, 0.5, 0.7), thighL: v3(0.1, -0.8, 0.5), shinL: v3(0, -1, -0.2) },
  parry: { spine: v3(0, 1, 0.1), armL: v3(0.1, -0.2, 1), foreL: v3(-0.7, 0.6, 0.35), armR: v3(-0.1, -0.2, 1), foreR: v3(0.7, 0.6, 0.35) },
  webshotR: { armR: v3(-0.15, 0.1, 1), foreR: v3(-0.1, 0.1, 1) },
  mech: { spine: v3(0, 1, 0), armL: v3(1, 0.2, 0), foreL: v3(1, 0.4, 0), armR: v3(-1, 0.2, 0), foreR: v3(-1, 0.4, 0) },
  lash: { spine: v3(0, 1, 0.4), armL: v3(0.4, 0.1, 1), foreL: v3(0.2, 0.2, 1), armR: v3(-0.4, 0.1, 1), foreR: v3(-0.2, 0.2, 1) },
};
POSES.punchL = mirror(POSES.punchR); POSES.kickL = mirror(POSES.kickR);
function blendPose(a, b, t) { const o = {}; for (const k in NEUTRAL) { const va = a[k] || NEUTRAL[k], vb = b[k] || NEUTRAL[k]; o[k] = new V3().lerpVectors(va, vb, t).normalize(); } return o; }
function swayPose(p, t, amp) { const o = {}; let i = 0; for (const k in NEUTRAL) { const v = (p[k] || NEUTRAL[k]).clone(); i++; v.x += Math.sin(t * 2.3 + i * 1.7) * amp; v.y += Math.sin(t * 1.9 + i * 2.9) * amp * 0.6; v.z += Math.cos(t * 2.1 + i) * amp; o[k] = v.normalize(); } return o; }
const heroPose = { cur: {}, w: { spine: 0, armL: 0, armR: 0, legs: 0, hips: 0 } };
for (const k in NEUTRAL) heroPose.cur[k] = NEUTRAL[k].clone();
let hero = null; const heroRest = {};
function buildHero() {
  hero = makeInstance('hero');
  hero.model.traverse(o => { if (o.isMesh) { o.material = suitMat; o.castShadow = true; } });
  for (const n in hero.bones) heroRest[n] = hero.bones[n].quaternion.clone();
  scene.add(hero.group); catPack = buildCatPack(); hoodMesh = buildHood(); applySuit(suitIdx); setupSuitSpace();
  playAct(hero, 'idle', 0);
  return hero;
}
const _bp = new V3(), _cp = new V3(), _cur = new V3(), _des = new V3(), _bw = new Qt(), _pw = new Qt(), _rq = new Qt(), _gq = new Qt();
// target: {pose:{...}, w:{spine,armL,armR,legs,hips}, aimL?:V3 world, aimR?:V3 world}
function applyHeroPose(target, dt) {
  const rate = target.rate || 9;
  for (const k in heroPose.w) heroPose.w[k] = damp(heroPose.w[k], target.w[k] || 0, rate, dt);
  for (const k in NEUTRAL) { const t = (target.pose && target.pose[k]) || NEUTRAL[k]; heroPose.cur[k].lerp(t, 1 - Math.exp(-rate * dt)).normalize(); }
  const B = hero.bones; hero.group.updateMatrixWorld(true); hero.group.getWorldQuaternion(_gq);
  if (heroPose.w.hips > 0.01) B.Hips.quaternion.slerp(heroRest.Hips, heroPose.w.hips);
  B.Hips.updateWorldMatrix(true, true);
  for (const [a, b, key] of CHAINS) {
    const w = heroPose.w[GROUP[key]]; if (w < 0.01 || !B[a] || !B[b]) continue;
    const bone = B[a];
    bone.getWorldPosition(_bp); B[b].getWorldPosition(_cp); _cur.subVectors(_cp, _bp).normalize();
    const aim = key === 'armL' ? (target.aimUL || target.aimL) : key === 'foreL' ? target.aimL : key === 'armR' ? (target.aimUR || target.aimR) : key === 'foreR' ? target.aimR : key === 'head' ? target.look : null;
    if (aim) _des.copy(aim); else _des.copy(heroPose.cur[key]).applyQuaternion(_gq);
    _rq.setFromUnitVectors(_cur, _des); bone.getWorldQuaternion(_bw); _bw.premultiply(_rq);
    bone.parent.getWorldQuaternion(_pw); _pw.invert().multiply(_bw);
    bone.quaternion.slerp(_pw, w); bone.updateWorldMatrix(false, true);
  }
}
let catPack = null;
function buildCatPack() {
  const g = new THREE.Group(); const M = (c, r = 0.7) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const bag = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.2, 4, 12).scale(1.15, 1, 0.8), M(0x3a4630, 0.85)); g.add(bag);
  for (const s of [-1, 1]) { const strap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.02), M(0x1d2218, 0.8)); strap.position.set(s * 0.1, 0.02, 0.13); g.add(strap); }
  const flap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.05, 0.4, 0.8), M(0x263022, 0.85)); flap.position.y = 0.2; g.add(flap);
  const cat = new THREE.Group(); cat.position.set(0, 0.3, -0.03); cat.scale.setScalar(1.35); g.add(cat);
  const fur = M(0xd98a3a, 0.9), dark = M(0x8a4f1e, 0.9), white = M(0xf3eadb, 0.9), eye = new THREE.MeshStandardMaterial({ color: 0x9ccf3a, roughness: 0.2, emissive: 0x2a3a08 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 14).scale(1.1, 0.95, 1), fur); cat.add(head);
  const muz = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8).scale(1.2, 0.8, 1), white); muz.position.set(0, -0.025, -0.07); cat.add(muz);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.06, 4), fur); ear.position.set(s * 0.05, 0.08, 0); ear.rotation.z = -s * 0.25; ear.userData.ear = s; cat.add(ear);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), eye); e.position.set(s * 0.033, 0.012, -0.075); cat.add(e);
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.01), dark); st.position.set(s * 0.03, 0.06, -0.045); st.rotation.z = s * 0.3; cat.add(st);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), white); paw.position.set(s * 0.06, -0.06, -0.05); cat.add(paw); }
  const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0.1, -0.05, 0.04), new V3(0.17, 0.05, 0.06), new V3(0.15, 0.17, 0.05)]), 12, 0.018, 6), fur); g.add(tail);
  g.userData = { cat, tail }; g.visible = false; scene.add(g); return g;
}
let hoodMesh = null;
function buildHood() {
  const m = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.95, side: THREE.DoubleSide });
  const g = new THREE.Group();
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16, Math.PI * 0.18, Math.PI * 1.64, 0, Math.PI * 0.62).scale(1, 1.12, 1.08), m); hood.rotation.y = Math.PI; hood.position.set(0, 0.03, -0.015); g.add(hood);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.018, 8, 24, Math.PI * 1.3), m); rim.rotation.set(0.2, 0, Math.PI * 1.15 + Math.PI * 0.5); rim.position.set(0, 0.03, 0.06); g.add(rim);
  for (const s of [-1, 1]) { const str = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 5), new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.8 })); str.position.set(s * 0.04, -0.2, 0.11); g.add(str); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.visible = false; scene.add(g); return g;
}
function updateCatPack(dt) {
  if (hoodMesh && hoodMesh.visible) { hero.bones.Head.getWorldPosition(hoodMesh.position); hero.bones.Head.getWorldQuaternion(hoodMesh.quaternion); const hs = suitU.uH.value > 0 ? 1 : 1; hoodMesh.scale.setScalar(1); }
  if (!catPack || !catPack.visible) return; const B = hero.bones.Spine2 || hero.bones.Spine1;
  B.getWorldPosition(catPack.position); catPack.quaternion.copy(hero.group.quaternion);
  catPack.position.add(tA.set(0, -0.08, -0.24).applyQuaternion(hero.group.quaternion));
  const c = catPack.userData.cat; const sp = P.vel.length();
  c.rotation.x = Math.sin(gameTime * 2) * 0.1 - clamp(sp / 80, 0, 0.5); c.rotation.y = Math.sin(gameTime * 0.7) * 0.4;
  c.children.forEach(o => { if (o.userData.ear) o.rotation.x = -clamp(sp / 50, 0, 0.9) + Math.max(0, Math.sin(gameTime * 7 + o.userData.ear)) * 0.2; });
  catPack.userData.tail.rotation.z = Math.sin(gameTime * 3) * 0.25;
}
function handWorld(side, out) { return hero.bones[side === 'L' ? 'LeftHand' : 'RightHand'].getWorldPosition(out); }
