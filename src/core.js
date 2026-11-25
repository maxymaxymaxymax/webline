'use strict';
// ================= CORE =================
THREE.ColorManagement.legacyMode = false;
const V3 = THREE.Vector3, Qt = THREE.Quaternion, Col = THREE.Color;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rng = mulberry32(77031);
const rr = (a, b) => a + (b - a) * rng();
const ri = (a, b) => Math.floor(a + (b - a + 1) * rng());
const pick = a => a[Math.floor(rng() * a.length)];
const UP = new V3(0, 1, 0);
const tA = new V3(), tB = new V3(), tC = new V3(), tD = new V3(), tQ = new Qt(), tM = new THREE.Matrix4(), tCol = new Col(), tE = new THREE.Euler();

const DEFAULTS = { assist: 65, fall: 30, sens: 50, fov: 72, quality: 'medium', invertY: false, volume: 70, suitA: '#c4122a', suitB: '#12141c', lens: '#eef4fa' };
const S = Object.assign({}, DEFAULTS);
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
try { const s = JSON.parse(lsGet('webline.settings') || 'null'); if (s) Object.assign(S, s); } catch (e) { }
const saveSettings = () => lsSet('webline.settings', JSON.stringify(S));

const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
if (!lsGet('webline.settings')) { try { const gl = renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); const gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); if (/Intel|UHD|Iris|HD Graphics|SwiftShader|llvmpipe|Microsoft Basic|Mali|Adreno|PowerVR|Radeon\(TM\) Graphics/i.test(gpu)) { S.quality = 'low'; S.scale = 75; S.autoLow = gpu; } } catch (e) { } }
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(innerWidth, innerHeight);
stage.appendChild(renderer.domElement);
const MAX_ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xdcb48c, 0.00036);
scene.background = scene.fog.color;
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.45, 9000);
camera.position.set(0, 200, 400);
const SUN_DIR = new V3(0.62, 0.2, -0.76).normalize();
const NIGHT_U = { value: 0 }; const DETAIL_U = { value: 1 }; const LOD_U = { value: 330 };

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function canvasTex(c, srgb = true, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.encoding = THREE.sRGBEncoding;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = MAX_ANISO; return t;
}
function mergeGeos(list) {
  const pos = [], nor = [], col = [], uvs = [];
  for (const [g0, c] of list) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    const p = g.attributes.position.array, n = g.attributes.normal.array, uv = g.attributes.uv ? g.attributes.uv.array : null; const cc = new Col(c);
    for (let i = 0, j = 0; i < p.length; i += 3, j += 2) { pos.push(p[i], p[i + 1], p[i + 2]); nor.push(n[i], n[i + 1], n[i + 2]); col.push(cc.r, cc.g, cc.b); uvs.push(uv ? uv[j] : 0, uv ? uv[j + 1] : 0); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  out.computeBoundingSphere();
  return out;
}
const boxG = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
function heightToNormal(src, strength) {
  const w = src.width, h = src.height; const s = src.getContext('2d').getImageData(0, 0, w, h).data;
  const out = makeCanvas(w, h); const og = out.getContext('2d'); const img = og.createImageData(w, h); const d = img.data;
  const H = (x, y) => s[((((y + h) % h) * w) + ((x + w) % w)) * 4];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) / 255 * strength, dy = (H(x, y + 1) - H(x, y - 1)) / 255 * strength;
    const l = Math.hypot(dx, dy, 1); const i = (y * w + x) * 4;
    d[i] = (-dx / l * .5 + .5) * 255; d[i + 1] = (dy / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
  }
  og.putImageData(img, 0, 0); return out;
}

// ---------- Sky ----------
const NOISE_GLSL = `
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vnoise(p);p*=2.03;a*=.5;}return v;}`;
const skyMat = new THREE.ShaderMaterial({
  uniforms: { sunDir: { value: SUN_DIR }, horizon: { value: scene.fog.color }, time: { value: 0 }, zen: { value: new Col(0.10, 0.21, 0.46) }, midc: { value: new Col(0.52, 0.45, 0.45) }, sunAmt: { value: 1 }, night: { value: 0 } },
  side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vDir; void main(){ vDir=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0); p.z=p.w*0.99999; gl_Position=p; }`,
  fragmentShader: `uniform vec3 sunDir; uniform vec3 horizon; uniform float time; uniform vec3 zen; uniform vec3 midc; uniform float sunAmt; uniform float night; varying vec3 vDir; ${NOISE_GLSL}
  void main(){
    vec3 d=normalize(vDir); float h=d.y;
    vec3 mid=midc;
    vec3 col=mix(horizon, mid, smoothstep(0.0,0.22,h));
    col=mix(col, zen, smoothstep(0.18,0.85,h));
    col=mix(col, horizon*0.82, smoothstep(0.0,-0.15,h));
    float sd=max(dot(d,sunDir),0.0);
    col+=(vec3(1.0,0.55,0.22)*pow(sd,6.0)*0.55 + vec3(1.0,0.8,0.5)*pow(sd,48.0)*1.1)*sunAmt + mix(vec3(1.0,0.95,0.85),vec3(0.8,0.85,1.0),night)*smoothstep(0.9990,0.9996,sd)*mix(24.0,6.0,night);
    if(night>0.5 && h>0.0){ vec3 sd3=floor(d*420.0); float hs=fract(sin(dot(sd3,vec3(12.9898,78.233,37.719)))*43758.5453); col+=vec3(0.9,0.92,1.0)*step(0.9975,hs)*smoothstep(0.0,0.25,h)*(0.6+0.4*sin(time*2.0+hs*50.0))*1.5; }
    if(h>0.0){
      vec2 uv=d.xz/(h+0.1)*0.9+vec2(time*0.003,time*0.001);
      float c=fbm(uv*1.6); c=smoothstep(0.52,0.85,c)*smoothstep(0.0,0.12,h)*(1.0-smoothstep(0.6,0.95,h));
      vec3 cc=mix(vec3(0.95,0.6,0.42), vec3(1.0,0.86,0.66), pow(sd,3.0)); cc*=0.75+0.7*pow(sd,5.0);
      col=mix(col,cc,c*0.7);
    }
    gl_FragColor=vec4(col,1.0);
    #include <tonemapping_fragment>
    #include <encodings_fragment>
  }`
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(8000, 48, 24), skyMat);
sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

// ---------- Water ----------
const waterMat = new THREE.ShaderMaterial({
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { sunDir: { value: SUN_DIR }, time: { value: 0 }, uSkyC: { value: new Col(0.85, 0.56, 0.36) }, uNight: { value: 0 } }]),
  fog: true,
  vertexShader: `#include <fog_pars_vertex>
  varying vec3 vWP; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vWP=wp.xyz; vec4 mvPosition=viewMatrix*wp; gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
  }`,
  fragmentShader: `uniform vec3 sunDir; uniform float time; uniform vec3 uSkyC; uniform float uNight; varying vec3 vWP;
  #include <fog_pars_fragment>
  ${NOISE_GLSL}
  void main(){
    vec2 p=vWP.xz;
    vec3 n=normalize(vec3(
      sin(p.x*0.05+time*0.8)*0.05+sin(p.y*0.13+time*1.3)*0.035+sin((p.x+p.y)*0.37+time*2.1)*0.02+sin((p.x*1.3-p.y)*0.9+time*3.)*0.01,
      1.0,
      cos(p.y*0.07+time*0.9)*0.05+cos(p.x*0.17+time*1.1)*0.035+cos((p.x-p.y)*0.29+time*1.7)*0.02+cos((p.x+p.y*1.2)*0.8+time*2.7)*0.01));
    vec3 v=normalize(cameraPosition-vWP);
    float fres=pow(1.0-max(dot(n,v),0.0),4.0);
    vec3 deep=vec3(0.02,0.07,0.085)*(1.0-0.7*uNight), skyc=uSkyC*0.75;
    float ff=fbm(p*0.08+time*0.05); vec3 col=mix(deep*(0.85+0.3*ff),skyc,0.06+0.5*fres);
    vec3 r=reflect(-v,n); float sd=max(dot(r,sunDir),0.0);
    col+=vec3(1.0,0.78,0.45)*pow(sd,90.0)*2.6 + vec3(1.0,0.62,0.3)*pow(sd,14.0)*0.35;
    gl_FragColor=vec4(col,1.0);
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    #include <fog_fragment>
  }`
});
const water = new THREE.Mesh(new THREE.PlaneGeometry(16000, 16000).rotateX(-Math.PI / 2), waterMat);
water.position.set(450, -1.5, -250); scene.add(water);

// ---------- Lights ----------
const hemi = new THREE.HemisphereLight(0xc8c4d8, 0x7a5a40, 0.8); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffc68a, 2.7);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
{ const c = sun.shadow.camera; c.left = -130; c.right = 130; c.top = 130; c.bottom = -130; c.near = 10; c.far = 1000; }
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.5;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0x8fa8d8, 0.35); fill.position.set(-0.6, 0.5, 0.7); scene.add(fill);

// ---------- Facade material (procedural windows in world space) ----------
function makeFacadeMat(style, color, lod) {
  const m = new THREE.MeshStandardMaterial({ color: color || 0xffffff, roughness: 0.82, metalness: 0.05 });
  m.defines = { STYLE: style };
  m.customProgramCacheKey = () => 'facade' + style + (lod ? 'L' : '');
  m.onBeforeCompile = (sh) => {
    sh.uniforms.sunDir = { value: SUN_DIR }; sh.uniforms.uNightF = NIGHT_U; sh.uniforms.uDetail = DETAIL_U; sh.uniforms.uLodR = LOD_U; sh.uniforms.uBrick = { value: window.__brickTex || null }; sh.uniforms.uConc = { value: window.PHOTO_C || null }; sh.uniforms.uRoof = { value: window.PHOTO_R || null };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <project_vertex>', `#include <project_vertex>
      vec4 wp4=vec4(transformed,1.0); vec3 wn=objectNormal;
      #ifdef USE_INSTANCING
        wp4=instanceMatrix*wp4; wn=mat3(instanceMatrix)*wn;
      #endif
      wp4=modelMatrix*wp4; vWP=wp4.xyz; vWN=normalize(mat3(modelMatrix)*wn);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP; varying vec3 vWN; uniform vec3 sunDir; uniform sampler2D uBrick; uniform sampler2D uConc; uniform sampler2D uRoof; uniform float uNightF; uniform float uDetail; uniform float uLodR;
      float fh21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
      float WIN=0.0; float LIT=0.0;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      ${lod ? 'if(distance(vWP.xz,cameraPosition.xz)<uLodR) discard;' : ''}
      {
        vec3 N=normalize(vWN); vec3 base=diffuseColor.rgb;
        if(abs(N.y)>0.6){
          float n2=fh21(floor(vWP.xz*0.25)); vec3 rt=texture2D(uRoof,vWP.xz/4.0).rgb;
          diffuseColor.rgb=mix(base*0.55,rt*0.85,0.7)*(0.9+0.2*n2);
        } else {
          vec2 t=normalize(vec2(-N.z,N.x)); float u=dot(vWP.xz,t); float y=vWP.y;
          float fh, fw;
          #if STYLE==0
            fh=3.9; fw=1.55; float fy=fract(y/fh), fx=fract(u/fw);
            float xL=0.07,xR=0.93,yB=0.2,yT=0.97; vec3 frC=vec3(0.16,0.17,0.18); float tr=0.42;
            float ax=fwidth(u/fw)*1.5+1e-4, ay=fwidth(y/fh)*1.5+1e-4; WIN=smoothstep(0.07-ax,0.07+ax,fx)*smoothstep(0.93+ax,0.93-ax,fx)*smoothstep(0.2-ay,0.2+ay,fy)*smoothstep(0.97+ay,0.97-ay,fy);
          #elif STYLE==1
            fh=3.4; fw=2.7; float fy=fract(y/fh), fx=fract(u/fw);
            float xL=0.27,xR=0.73,yB=0.22,yT=0.8; vec3 frC=vec3(0.86,0.84,0.78); float tr=0.51;
            float ax=fwidth(u/fw)*1.5+1e-4, ay=fwidth(y/fh)*1.5+1e-4; WIN=smoothstep(0.27-ax,0.27+ax,fx)*smoothstep(0.73+ax,0.73-ax,fx)*smoothstep(0.22-ay,0.22+ay,fy)*smoothstep(0.8+ay,0.8-ay,fy);
            float sill=step(0.16,fy)*step(fy,0.22)*step(0.22,fx)*step(fx,0.78);
            vec3 bt=texture2D(uBrick,vec2(u/2.2,y/2.2)).rgb; float bl=dot(bt,vec3(0.3,0.5,0.2));
            base=mix(base*bl*2.0, bt*1.1, 0.6);
            base=mix(base,base*1.25,sill);
          #else
            fh=3.7; fw=4.4; float fy=fract(y/fh), fx=fract(u/fw);
            float xL=0.1,xR=0.62,yB=0.12,yT=0.9; vec3 frC=vec3(0.22,0.23,0.24); float tr=-1.0;
            float ax=fwidth(u/fw)*1.5+1e-4, ay=fwidth(y/fh)*1.5+1e-4; WIN=smoothstep(0.1-ax,0.1+ax,fx)*smoothstep(0.62+ax,0.62-ax,fx)*smoothstep(0.12-ay,0.12+ay,fy)*smoothstep(0.9+ay,0.9-ay,fy);
          #endif
          float fpx=max(fwidth(u/fw),fwidth(y/fh)); float far=smoothstep(0.25,0.9,fpx); WIN=mix(WIN, ${style === 0 ? '0.78' : style === 1 ? '0.25' : '0.42'}, far);
          #if STYLE!=1
          { float cl=dot(texture2D(uConc,vec2(u/3.0,y/3.0)).rgb,vec3(0.33)); base*=mix(1.0,cl*1.9,0.55); }
          #endif
          vec2 cell=vec2(floor(u/fw),floor(y/fh));
          float rnd=fh21(cell+floor(vWP.xz/60.0)*7.13);
          if(y<4.8){ float sf=fract(u/5.5); float sm=fract(u/1.375); WIN=step(0.06,sf)*step(sf,0.94)*step(0.35,y)*step(y,3.7)*step(0.025,sm)*step(sm,0.975)*(1.0-step(abs(y-2.75),0.04)); base*=0.55; }
          float ao=mix(0.5,1.0,smoothstep(0.0,22.0,y));
          vec3 glass=mix(vec3(0.05,0.065,0.09),vec3(0.12,0.13,0.15),rnd);
          // interior mapping: look into a room behind each window
          if(WIN>0.01 && fpx<0.6 && uDetail>0.5){
            vec3 T3=vec3(t.x,0.0,t.y); vec3 Vd=normalize(vWP-cameraPosition);
            vec3 rd=vec3(dot(Vd,T3), dot(Vd,vec3(0.0,1.0,0.0)), -dot(Vd,N)); rd.z=max(rd.z,0.05);
            vec2 pos=vec2(fx,fy)*2.0-1.0; float depth=1.6;
            float tx=(sign(rd.x)-pos.x)/rd.x, ty=(sign(rd.y)-pos.y)/rd.y, tz=depth/rd.z; float tm=min(min(abs(tx),abs(ty)),tz);
            vec3 hit=vec3(pos,0.0)+rd*tm; float d01=clamp(hit.z/depth,0.0,1.0);
            vec3 wallC=mix(vec3(0.55,0.48,0.40),vec3(0.42,0.46,0.5),fract(rnd*7.3));
            vec3 room = tm==tz ? wallC*0.85 : (tm==abs(ty) ? (rd.y<0.0 ? vec3(0.32,0.25,0.19) : vec3(0.75,0.72,0.66)) : wallC*0.7);
            if(tm==tz && fract(rnd*13.1)>0.55){ float fx2=abs(hit.x-(fract(rnd*3.7)-0.5)); if(fx2<0.35 && hit.y<-0.2) room*=0.45; }   // furniture silhouette
            room*=mix(1.0,0.45,d01);
            float lit = step(0.94-0.6*uNightF, rnd);
            vec3 interior = room*(0.22 + 1.4*lit*uNightF + 0.25*(1.0-uNightF));
            glass = mix(glass, interior, 0.75*(1.0-smoothstep(0.25,0.6,fpx)));
          }
          if(y<4.8){ glass=mix(vec3(0.03,0.028,0.026),vec3(0.3,0.26,0.2),smoothstep(0.3,3.4,y)*0.6)*(0.55+0.9*rnd); }
          float WINg=WIN;
          if(y>=4.8){
            float nearF=1.0-smoothstep(0.06,0.3,fpx);
            float inW=step(xL,fx)*step(fx,xR)*step(yB,fy)*step(fy,yT);
            float ex=min(fx-xL,xR-fx)*fw, ey=min(fy-yB,yT-fy)*fh;               // distance to window edge in metres
            float frame=inW*(1.0-step(0.07,min(ex,ey)));                          // window frame
            float mull=inW*max(step(abs(fy-tr)*fh,0.035), step(abs(fx-0.5*(xL+xR))*fw,0.03));
            float fr=max(frame,mull)*nearF;
            float revT=inW*(1.0-smoothstep(0.0,0.32,(yT-fy)*fh));                 // shadow under the lintel (recess)
            float revS=inW*(1.0-smoothstep(0.0,0.14,ex));
            glass*=1.0-0.55*revT*nearF-0.3*revS*nearF;
            glass=mix(glass,frC*(0.75+0.25*clamp(dot(N,sunDir)*2.0+0.5,0.0,1.0)),fr);
            WINg=WIN*(1.0-fr);
            #if STYLE==1
              float lin=step(yT,fy)*step(fy,yT+0.075)*step(xL-0.03,fx)*step(fx,xR+0.03);
              float key=lin*step(abs(fx-0.5),0.035);
              base=mix(base,vec3(0.66,0.62,0.55)*(0.85+0.3*fh21(cell)),lin*nearF); base*=1.0-0.15*key*nearF;
            #endif
            // rain streaks below sills and grime
            float below=step(xL+0.05,fx)*step(fx,xR-0.05)*step(fy,yB);
            float st=fh21(vec2(floor(u*9.0),cell.y))*below*(fy/yB);
            base*=1.0-0.22*st*nearF;
          }
          { float bt=fh21(floor(vWP.xz/37.0)+3.1); base*=0.88+0.24*bt; }        // per-building variation
          base*=mix(0.82,1.0,smoothstep(0.0,9.0,y));                              // street-level grime
          diffuseColor.rgb=mix(base*ao,glass,WIN);
          WIN=WINg; LIT=WIN*step(0.94-0.6*uNightF,rnd)*(0.55+1.6*uNightF)*mix(1.0,0.6+0.8*fh21(cell*3.7),uNightF) + (y<4.8?WIN*(0.06+1.2*uNightF):0.0);
        }
      }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,0.1,WIN);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,0.35,WIN);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        vec3 Nn=normalize(vWN); vec3 Vv=normalize(cameraPosition-vWP); vec3 R=reflect(-Vv,Nn);
        float sd=max(dot(R,sunDir),0.0);
        vec3 skyR=mix(vec3(0.95,0.56,0.3),vec3(0.3,0.45,0.72),smoothstep(-0.02,0.55,R.y));
        if(R.y<0.0) skyR=vec3(0.22,0.18,0.16);
        float fr=0.28+0.72*pow(1.0-max(dot(Vv,Nn),0.0),3.0);
        float refl = ${style === 0 ? '0.55' : '0.3'} * (1.0-0.85*uNightF);
        totalEmissiveRadiance += WIN*(skyR*refl*fr + vec3(1.0,0.78,0.5)*pow(sd,24.0)*1.1) + vec3(1.0,0.7,0.38)*LIT;
      }`);
  };
  return m;
}
const facadeMats = [makeFacadeMat(0), makeFacadeMat(1), makeFacadeMat(2)], lodMats = [makeFacadeMat(0, 0, 1), makeFacadeMat(1, 0, 1), makeFacadeMat(2, 0, 1)];
{ const L = new THREE.TextureLoader(), base = (window.MODEL_BASE || 'models/').replace('models', 'textures'); for (const [k, f] of [['PHOTO_C', 'concrete_wall_003'], ['PHOTO_R', 'gravel_concrete_03']]) { const t = L.load(base + f + '.jpg'); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = MAX_ANISO; window[k] = t; } }
const plainMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.05 });
const vcolMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.1 });
const vcolShiny = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.45 });
