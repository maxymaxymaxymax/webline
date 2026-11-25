const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader']});const p=await b.newPage({viewport:{width:400,height:300}});
await p.addInitScript(()=>{localStorage.setItem('webline.settings',JSON.stringify({quality:'low'}))});
p.on('pageerror',e=>console.log('ERR',e.message)); p.on('console',m=>{if(m.type()==='error')console.log('CERR',m.text().slice(0,300))});
await p.goto('http://localhost:8765/release/index.html'); await p.waitForFunction(()=>document.getElementById('loading').classList.contains('gone'),null,{timeout:180000});
console.log(await p.evaluate(process.argv[2])); await b.close();})();
