const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader']}); for(const v of ['0','1']){ const p=await b.newPage({viewport:{width:1280,height:720}}); p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:8765/test/cat.html?v='+v); await p.waitForFunction(()=>document.title==='done',null,{timeout:300000}); if(v==='0') console.log(JSON.stringify(await p.evaluate(()=>window.INFO)));
await p.screenshot({path:'/tmp/claude-0/-home-user/50c5464f-9282-5f08-afd6-23c5c4c5bccb/scratchpad/cat'+v+'.png'}); await p.close(); } await b.close();})();
