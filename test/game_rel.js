const {chromium}=require('playwright');
const out='/tmp/claude-0/-home-user/50c5464f-9282-5f08-afd6-23c5c4c5bccb/scratchpad/';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:+(process.env.VW||960),height:+(process.env.VH||540)}}); await p.addInitScript(q=>{try{localStorage.setItem('webline.settings',JSON.stringify({quality:q.split(':')[0],atmo:q.split(':')[1]||'golden'}))}catch(e){}}, process.env.Q||'low');
const errs=[]; p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.type()+': '+m.text().slice(0,300))}); p.on('pageerror',e=>errs.push('PAGEERR '+e.message+' '+(e.stack||'').split('\n')[1]));
await p.goto('http://localhost:8765/reldev.html');
try{ await p.waitForFunction(()=>document.getElementById('loading').classList.contains('gone'),null,{timeout:180000}); }catch(e){ errs.push('LOAD TIMEOUT '+await p.$eval('#loadTxt',e=>e.textContent)); }
await p.waitForTimeout(1500); console.log('ERRS-EARLY\n'+[...new Set(errs)].slice(0,15).join('\n')); await p.screenshot({path:out+'g_title.png',timeout:120000}); await p.keyboard.press('Enter'); await p.waitForTimeout(1500); await p.screenshot({path:out+'g_menu.png',timeout:120000});
const steps=process.argv.slice(2);
if(steps.includes('street')){ await p.click('#play'); await p.waitForTimeout(500); await p.evaluate(()=>window.__eval("const b=DIST[0].blocks[150]; P.pos.set(b.bx0-4,0.1,b.bz0+10); P.mode='ground'; yaw=0.0; pitch=-0.12; camPos.copy(P.pos).add(new V3(0,2.5,6));")); await p.waitForTimeout(2500); await p.screenshot({path:out+'street.png',timeout:120000});
 await p.evaluate(()=>window.__eval("P.pos.set(37.5,400.2,275); P.mode='ground'; yaw=0.25; pitch=-0.18; camPos.copy(P.pos).add(new V3(1,3,6));")); await p.waitForTimeout(2500); await p.screenshot({path:out+'pier.png',timeout:120000}); }
if(steps.includes('train')){ await p.keyboard.press('Enter'); await p.waitForTimeout(800); await p.click('#play'); await p.waitForTimeout(500); await p.evaluate(()=>window.__eval("const t=TRAINS[0]; P.pos.set(612,24,t.c+30); P.mode='air'; P.vel.set(0,0,0); yaw=Math.PI*0.85; pitch=-0.25; camPos.set(618,26,t.c+40);")); await p.waitForTimeout(3000); await p.screenshot({path:out+'train.png',timeout:120000}); console.log(await p.evaluate(()=>window.__eval("JSON.stringify(TRAINS.map(t=>({c:t.c.toFixed(1),v:t.v.toFixed(1),dir:t.dir,stop:t.stop.toFixed(1)})))"))); }
if(steps.includes('suits')){ await p.evaluate((cu)=>{window.__closeup=cu;document.getElementById('menu').hidden=true;},+(process.env.CU||1)); for(const i of (process.env.SUITS||'0,1,2').split(',').map(Number)){ await p.evaluate(([i,b])=>{applySuit(i); window.__eval('P.facing.set('+(b?'-1,0,0.35':'1,0,-0.35')+').normalize()');},[i,!!process.env.BACK]).catch(e=>errs.push('eval '+e.message)); await p.waitForTimeout(1500); await p.screenshot({path:out+'suit'+i+'.png',timeout:120000}); } }
if(steps.includes('play')){
 await p.click('#play'); await p.waitForTimeout(800);
 await p.keyboard.down('KeyW'); await p.keyboard.down('ShiftLeft'); await p.waitForTimeout(700); await p.keyboard.up('ShiftLeft');
 await p.keyboard.down('Space'); await p.waitForTimeout(300); await p.keyboard.up('Space'); await p.waitForTimeout(500);
 await p.mouse.move(640,360); await p.mouse.down({button:'left'}); await p.waitForTimeout(1200); await p.screenshot({path:out+'g_swing.png',timeout:120000});
 await p.mouse.up({button:'left'}); await p.mouse.down({button:'right'}); await p.waitForTimeout(1000); await p.mouse.up({button:'right'});
 await p.keyboard.press('KeyG'); await p.waitForTimeout(1200); await p.screenshot({path:out+'g_glide.png',timeout:120000});
 console.log(JSON.stringify(await p.evaluate(()=>window.__dbg&&window.__dbg())));
}
console.log('ERRS-END\n'+[...new Set(errs)].slice(0,15).join('\n')); await b.close();})();
