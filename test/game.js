const {chromium}=require('playwright');
const out='/tmp/claude-0/-home-user/50c5464f-9282-5f08-afd6-23c5c4c5bccb/scratchpad/';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:960,height:540}}); await p.addInitScript(()=>{  }); await p.addInitScript(q=>{try{localStorage.setItem('webline.settings',JSON.stringify({quality:q.split(':')[0],atmo:q.split(':')[1]||'golden'}))}catch(e){}}, process.env.Q||'low');
const errs=[]; p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.type()+': '+m.text().slice(0,300))}); p.on('pageerror',e=>errs.push('PAGEERR '+e.message+' '+(e.stack||'').split('\n')[1]));
await p.goto('http://localhost:8765/dev.html');
try{ await p.waitForFunction(()=>document.getElementById('loading').classList.contains('gone'),null,{timeout:180000}); }catch(e){ errs.push('LOAD TIMEOUT '+await p.$eval('#loadTxt',e=>e.textContent)); }
await p.waitForTimeout(1500); console.log('ERRS-EARLY\n'+[...new Set(errs)].slice(0,15).join('\n')); await p.screenshot({path:out+'g_title.png',timeout:120000}); await p.keyboard.press('Enter'); await p.waitForTimeout(1500); await p.screenshot({path:out+'g_menu.png',timeout:120000});
const steps=process.argv.slice(2);
if(steps.includes('street')){ await p.click('#play'); await p.waitForTimeout(500); await p.evaluate(()=>window.__eval("const b=DIST[0].blocks[150]; P.pos.set(b.bx0-4,0.1,b.bz0+10); P.mode='ground'; yaw=0.0; pitch=-0.12; camPos.copy(P.pos).add(new V3(0,2.5,6));")); await p.waitForTimeout(2500); await p.screenshot({path:out+'street.png',timeout:120000});
 await p.evaluate(()=>window.__eval("P.pos.set(37.5,400.2,275); P.mode='ground'; yaw=0.25; pitch=-0.18; camPos.copy(P.pos).add(new V3(1,3,6));")); await p.waitForTimeout(2500); await p.screenshot({path:out+'pier.png',timeout:120000}); }
if(steps.includes('train')){ await p.keyboard.press('Enter'); await p.waitForTimeout(800); await p.click('#play'); await p.waitForTimeout(500); await p.evaluate(()=>window.__eval("const t=TRAINS[0]; P.pos.set(612,24,t.c+30); P.mode='air'; P.vel.set(0,0,0); yaw=Math.PI*0.85; pitch=-0.25; camPos.set(618,26,t.c+40);")); await p.waitForTimeout(3000); await p.screenshot({path:out+'train.png',timeout:120000}); console.log(await p.evaluate(()=>window.__eval("JSON.stringify(TRAINS.map(t=>({c:t.c.toFixed(1),v:t.v.toFixed(1),dir:t.dir,stop:t.stop.toFixed(1)})))"))); }
if(steps.includes('cars')){ await p.keyboard.press('Enter'); await p.waitForTimeout(800); await p.click('#play'); await p.waitForTimeout(500);
  await p.evaluate(()=>window.__eval("const L=lanes.find(l=>l.axis===0&&l.cars.length>3&&l.d.id==='mid'); const c=L.cars[2]; P.pos.set(c.s+4, 0.1, L.c+5); P.mode='ground'; yaw=Math.atan2(-(c.s-P.pos.x), -(L.c-P.pos.z)); pitch=-0.15; camPos.copy(P.pos).add(new V3(3,2.2,4)); for(const l of lanes) for(const k of l.cars){k.vmax=0;k.v=0;}"));
  await p.waitForTimeout(3000); await p.screenshot({path:out+'cars.png',timeout:120000}); }
if(steps.includes('swim')){ await p.keyboard.press('Enter'); await p.waitForTimeout(800); await p.click('#play'); await p.waitForTimeout(500);
  await p.evaluate(()=>window.__eval("P.pos.set(345,-2.4,-500); P.mode='swim'; P.vel.set(0,0,0); P.facing.set(0,0,-1); yaw=0.5; pitch=-0.2; camPos.set(349,1,-494);"));
  await p.keyboard.down('KeyW'); await p.waitForTimeout(4000); await p.screenshot({path:out+'swim.png',timeout:120000}); console.log(await p.evaluate(()=>window.__eval("JSON.stringify({pitch:pitch.toFixed(2), yaw:yaw.toFixed(2), cam:camera.position.toArray().map(v=>+v.toFixed(1)), pos:P.pos.toArray().map(v=>+v.toFixed(1)), camF:camF.toArray().map(v=>+v.toFixed(2))})")));
  await p.keyboard.up('KeyW'); return void await b.close();
  await p.evaluate(()=>window.__eval("P.pos.set(500,0.1,100); P.mode='ground'; P.vel.set(0,0,0); yaw=2.4; pitch=0.05; camPos.set(504,2.5,104);"));
  await p.waitForTimeout(2500); await p.screenshot({path:out+'street2.png',timeout:120000});
  await p.evaluate(()=>window.__eval("P.pos.set(-150,0.3,-1100); P.mode='ground'; yaw=0.3; pitch=-0.05; camPos.set(-148,2.5,-1094);"));
  await p.waitForTimeout(2500); await p.screenshot({path:out+'park.png',timeout:120000}); }
if(steps.includes('tex')){ await p.keyboard.press('Enter'); await p.waitForTimeout(800); await p.click('#play'); await p.waitForTimeout(500);
  await p.evaluate(()=>window.__eval("P.pos.set(500,0.1,100); P.mode='ground'; P.vel.set(0,0,0); yaw=2.4; pitch=0.05; camPos.set(504,2.5,104);"));
  await p.waitForTimeout(2500); await p.screenshot({path:out+'street2.png',timeout:120000});
  await p.evaluate(()=>window.__eval("P.pos.set(-150,0.3,-1100); P.mode='ground'; yaw=0.3; pitch=-0.05; camPos.set(-148,2.5,-1094);"));
  await p.waitForTimeout(2500); await p.screenshot({path:out+'park.png',timeout:120000}); }
if(steps.includes('boss')){ await p.keyboard.press('Enter'); await p.waitForTimeout(800); await p.click('#play'); await p.waitForTimeout(500);
  const keysB=(process.env.BOSSES||'bulwark,overload,kite,hex').split(',');
  for (const k of keysB) { await p.evaluate((k)=>window.__eval(`for(const e of enemies.slice()){ if(e.acc) scene.remove(e.acc.g); scene.remove(e.inst.group);} enemies.length=0; const b=DIST[0].blocks[200]; P.pos.set(b.bx0-2,0.1,b.bz0-2); P.mode='ground'; P.vel.set(0,0,0); yaw=0; pitch=0.05; camPos.set(P.pos.x+1,P.pos.y+2.4,P.pos.z+5); const e=spawnBoss('${k}', new V3(P.pos.x+4.5, ${k==='kite'?5:0}, P.pos.z-6), null); e.met=true; e.bcd=99; if(window.NOACC){ e.acc.g.visible=false; }`),k);
    await p.waitForTimeout(2200); await p.screenshot({path:out+'boss_'+k+'.png',timeout:120000}); console.log(await p.evaluate(()=>window.__eval("JSON.stringify({dead:P.dead,hp:P.hp,mode:P.mode,pos:P.pos.toArray().map(v=>+v.toFixed(1)),cam:camera.position.toArray().map(v=>+v.toFixed(1)),fade:document.getElementById('fade').style.opacity, lost:renderer.getContext().isContextLost(), mats:(()=>{const a=enemies.find(e=>e.boss); const t=new Set(); a.inst.model.traverse(o=>{if(o.isMesh) t.add(o.material.type+':'+(o.material.map?1:0))}); return [...t]})(), boss:enemies.filter(e=>e.boss).map(e=>[e.boss,e.pos.toArray().map(v=>+v.toFixed(1)),e.bst])})"))); } }
if(steps.includes('nyc')){ await p.keyboard.press('Enter'); await p.waitForTimeout(800); await p.click('#play'); await p.waitForTimeout(500);
  await p.evaluate(()=>window.__eval("P.pos.set(0,95,320); P.mode='air'; P.vel.set(0,4,-34); yaw=0.05; pitch=-0.22; camPos.set(2,98,330); fireWeb('R');"));
  await p.waitForTimeout(1500); if(!process.env.NOSHOT) await p.screenshot({path:out+'nyc_swing.png',timeout:300000});
  console.log(await p.evaluate(()=>window.__eval("JSON.stringify({boxes:boxes.length, ropes:!!(P.ropes.L||P.ropes.R), mode:P.mode})")));
  await p.evaluate(()=>window.__eval("releaseWeb('R'); P.pos.set(-60,1,60); P.mode='ground'; P.vel.set(0,0,0); yaw=0.6; pitch=0.12; camPos.set(-57,3,66);"));
  await p.waitForTimeout(2000); if(!process.env.NOSHOT) await p.screenshot({path:out+'nyc_street.png',timeout:300000}); console.log(await p.evaluate(()=>window.__eval("JSON.stringify({mode:P.mode, y:P.pos.y.toFixed(1), lanes:lanes.length, cars:vehicles.length})"))); }
if(steps.includes('suits')){ await p.evaluate((cu)=>{window.__closeup=cu;document.getElementById('menu').hidden=true;},+(process.env.CU||1)); for(const i of (process.env.SUITS||'0,1,2').split(',').map(Number)){ await p.evaluate(([i,b])=>{applySuit(i); window.__eval('P.facing.set('+(b?'-1,0,0.35':'1,0,-0.35')+').normalize()');},[i,!!process.env.BACK]).catch(e=>errs.push('eval '+e.message)); await p.waitForTimeout(1500); await p.screenshot({path:out+'suit'+i+'.png',timeout:120000}); } }
if(steps.includes('play')){
 await p.click('#play'); await p.waitForTimeout(800);
 await p.keyboard.down('KeyW'); await p.keyboard.down('ShiftLeft'); await p.waitForTimeout(700); await p.keyboard.up('ShiftLeft');
 await p.keyboard.down('Space'); await p.waitForTimeout(300); await p.keyboard.up('Space'); await p.waitForTimeout(500);
 await p.mouse.move(640,360); await p.mouse.down({button:'left'}); await p.waitForTimeout(1200); await p.screenshot({path:out+'g_swing.png',timeout:120000});
 await p.mouse.up({button:'left'}); await p.waitForTimeout(400); await p.screenshot({path:out+'g_release.png',timeout:120000}); await p.mouse.down({button:'right'}); await p.waitForTimeout(1000); await p.mouse.up({button:'right'});
 await p.keyboard.press('KeyG'); await p.waitForTimeout(1200); await p.screenshot({path:out+'g_glide.png',timeout:120000});
 console.log(JSON.stringify(await p.evaluate(()=>window.__dbg&&window.__dbg())));
}
console.log('ERRS-END\n'+[...new Set(errs)].slice(0,15).join('\n')); await b.close();})();
