const {chromium}=require('playwright');
const out='/home/user/webline/website/img/';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});
const atmo=process.argv[2]||'golden';
const p=await b.newPage({viewport:{width:1280,height:720}});
await p.addInitScript(a=>{try{localStorage.setItem('webline.settings',JSON.stringify({quality:'medium',atmo:a}))}catch(e){}},atmo);
p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.goto('http://localhost:8765/reldev.html'); await p.waitForFunction(()=>document.getElementById('loading').classList.contains('gone'),null,{timeout:300000});
const hideUI=()=>p.evaluate(()=>{for(const id of ['title','menu','hud','fx','pause']){const e=document.getElementById(id); if(e) e.style.visibility='hidden';}});
await p.waitForTimeout(1500); await hideUI(); await p.waitForTimeout(500); await p.screenshot({path:out+'scene_'+atmo+'.png',timeout:180000});
if(process.argv.includes('action')){
  await p.evaluate(()=>{document.getElementById('title').style.visibility='';}); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
  await p.evaluate(()=>{document.getElementById('menu').style.visibility='';}); await p.click('#play'); await p.waitForTimeout(600);
  // swing shot over midtown
  await p.evaluate(()=>window.__eval("P.pos.set(40,150,60); P.mode='air'; P.vel.set(0,6,-30); yaw=0.35; pitch=-0.12; camPos.set(46,152,70); fireWeb('R');"));
  await p.waitForTimeout(1600); await hideUI(); await p.waitForTimeout(300); await p.screenshot({path:out+'swing.png',timeout:180000});
  await p.evaluate(()=>window.__eval("releaseWeb('R'); P.pos.set(40,200,60); P.vel.set(0,0,-38); setGlide(true); yaw=0.1; pitch=-0.2; camPos.set(42,203,68);"));
  await p.waitForTimeout(1500); await p.screenshot({path:out+'glide.png',timeout:180000});
  await p.evaluate(()=>window.__eval("setGlide(false); const t=TRAINS[0]; P.pos.set(612,24,t.c+30); P.mode='air'; P.vel.set(0,0,0); yaw=Math.PI*0.85; pitch=-0.25; camPos.set(618,26,t.c+40);"));
  await p.waitForTimeout(2500); await p.screenshot({path:out+'train.png',timeout:180000});
}
await b.close();})();
