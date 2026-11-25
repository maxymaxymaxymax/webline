const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:1600,height:600}});
p.on('console',m=>{if(m.type()==='error')console.log('ERR',m.text())}); p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.goto('http://localhost:8765/test/'+(process.argv[3]||'models.html')+''); await p.waitForFunction(()=>document.title==='done',null,{timeout:120000});
console.log(JSON.stringify(await p.evaluate(()=>window.RESULT),null,0)); await p.screenshot({path:process.argv[2]||'/tmp/claude-0/-home-user/50c5464f-9282-5f08-afd6-23c5c4c5bccb/scratchpad/models.png'}); await b.close();})();
