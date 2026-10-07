import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const label=process.argv[2]||'baseline';
const root=resolve(process.argv[4]||'dist');const output=resolve('docs/visual',label);await mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.JPG':'image/jpeg','.png':'image/png','.webp':'image/webp','.avif':'image/avif'};
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://fixture.invalid').pathname;let path=resolve(root,'.'+pathname);if(!path.startsWith(root+'/'))path=resolve(root,'index.html');if(!extname(path))path=resolve(root,'index.html');const body=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const sitePort=server.address().port;
const debugPort=9300+Number(process.argv[3]||0)+(label==='baseline'?0:2000);
const chrome=process.env.LTC_CHROMIUM||'/home/jjibrah/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser=spawn(chrome,['--headless','--no-sandbox','--disable-gpu',`--remote-debugging-port=${debugPort}`,`--user-data-dir=/tmp/ltc-visual-${label}-${process.argv[3]||'all'}`,'about:blank'],{stdio:'ignore'});
let ws;try{
 let target;for(let i=0;i<100;i++){try{target=(await(await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).find(t=>t.type==='page');if(target)break;}catch{}await new Promise(r=>setTimeout(r,100));}if(!target)throw new Error('Chromium did not start');
 ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let sequence=0;const pending=new Map();let errors=[];
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 ws.onmessage=async event=>{try { const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(new Error(m.error.message));else p.resolve(m.result);}else if(m.method==='Fetch.requestPaused'){
  const r=m.params;const url=new URL(r.request.url);if(url.port===String(sitePort))await send('Fetch.continueRequest',{requestId:r.requestId});else if(url.hostname==='localhost'||url.hostname==='127.0.0.1'){
   const body=url.pathname.includes('progress')?{total_collected:0,pledged_amount:0,currency:'usd',successful_payment_count:0,pledge_count:0}:url.pathname.includes('/session/')?{session_id:'fixture',status:'pending',amount:10,currency:'usd',frequency:'one_time'}:[];
   await send('Fetch.fulfillRequest',{requestId:r.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(JSON.stringify(body)).toString('base64')});
  }else await send('Fetch.failRequest',{requestId:r.requestId,errorReason:'BlockedByClient'});
 }else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);
 } catch(error) { if(!error.message.includes('Invalid InterceptionId')) errors.push(`Capture harness: ${error.message}`); } };
 await send('Page.enable');await send('Runtime.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
 const report=[];
 for(const width of (process.argv[3]?[Number(process.argv[3])]:[320,375,768,1024,1440]))for(const path of ['/','/about','/mission','/impact','/stories','/team','/donate','/mentor','/donation-success','/unsubscribe/fixture','/profile/submit/fixture']){
  errors=[];await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await send('Page.navigate',{url:`http://127.0.0.1:${sitePort}${path}`});await new Promise(r=>setTimeout(r,1300));await send('Runtime.evaluate',{expression:"document.fonts.ready",awaitPromise:true});
  await send('Runtime.evaluate',{expression:"document.documentElement.style.scrollBehavior='auto';window.scrollTo({top:document.body.scrollHeight,behavior:'instant'})"});await new Promise(r=>setTimeout(r,300));await send('Runtime.evaluate',{expression:"window.scrollTo({top:0,left:0,behavior:'instant'})"});await new Promise(r=>setTimeout(r,700));
  await send('Runtime.evaluate',{expression:"Promise.race([Promise.all(Array.from(document.images).map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});}))),new Promise(resolve=>setTimeout(resolve,5000))])",awaitPromise:true});
  const name=`${width}-${path.replace(/[^a-z0-9]/gi,'_')||'home'}`;const metrics=await send('Page.getLayoutMetrics');const size=metrics.cssContentSize;const shot=await send('Page.captureScreenshot',{captureBeyondViewport:true,fromSurface:true,clip:{x:0,y:0,width,height:Math.ceil(size.height),scale:1}});await writeFile(`${output}/${name}.png`,Buffer.from(shot.data,'base64'));
  const state=await send('Runtime.evaluate',{expression:"JSON.stringify({text:document.body.innerText,overflow:document.documentElement.scrollWidth>innerWidth})",returnByValue:true});report.push({path,width,errors,state:JSON.parse(state.result.value)});
 }
 await writeFile(`${output}/report-${process.argv[3]||"all"}.json`,JSON.stringify({conditions:'Chromium headless, local production build, empty synthetic API fixtures, external requests blocked (fonts/video unavailable)',pages:report},null,2));console.log(`Captured ${report.length} route/viewport screenshots to ${output}`);
}finally{ws?.close();browser.kill();await new Promise(r=>server.close(r));}
