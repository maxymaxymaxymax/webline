const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader']}); const p=await b.newPage({viewport:{width:960,height:540}});
await p.addInitScript(()=>{localStorage.setItem('webline.settings',JSON.stringify({quality:'low'}))});
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERR '+e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text().slice(0,200)); });
await p.goto('http://localhost:8765/dev.html'); await p.waitForFunction(()=>document.getElementById('loading').classList.contains('gone'),null,{timeout:300000});
await p.waitForTimeout(6000);
console.log(await p.evaluate(()=>window.__eval("JSON.stringify({active:customActive, heroKey:hero.key, clips:Object.keys(hero.actions), cards:[...document.querySelectorAll('#suitsMenu .suit b')].map(b=>b.textContent)})")));
console.log(errs.filter(e=>!/GLTFLoader/.test(e)).slice(0,5).join('\n')); await b.close();})();
