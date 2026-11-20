import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,existsSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,extname,sep} from 'node:path';
import {createServer} from 'node:http';

const root=resolve('dist');
const output=resolve('ui-smoke');
mkdirSync(output,{recursive:true});
const contentTypes={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server=createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  const path=pathname==='/'?join(root,'index.html'):file;
  try{const content=readFileSync(path);res.writeHead(200,{'Content-Type':contentTypes[extname(path)]||'application/octet-stream','Cache-Control':'no-store'}).end(content)}catch{res.writeHead(404).end('Not found')}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}/`;
const chrome=process.env.CHROME_BIN||['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
if(!chrome)throw Error('Chrome/Chromium not available');
const profile=mkdtempSync(join(tmpdir(),'zabavograd-ui-'));
const proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--disable-dev-shm-usage','--no-first-run','--no-proxy-server','--proxy-bypass-list=<-loopback>','--no-default-browser-check','--remote-allow-origins=*',`--user-data-dir=${profile}`,'--remote-debugging-port=0','--window-size=1440,900','about:blank'],{stdio:['ignore','pipe','pipe']});
let stderr='';proc.stderr.on('data',d=>stderr+=String(d).slice(-2000));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ws=null;
try{
  const active=join(profile,'DevToolsActivePort');
  for(let i=0;i<450&&!existsSync(active);i++){if(proc.exitCode!==null)break;await sleep(100)}
  assert(existsSync(active),'Chromium startup failed after retry window; exit='+proc.exitCode+'; stderr='+stderr);
  const port=Number(readFileSync(active,'utf8').split('\n')[0]);
  let targets=[];
  for(let i=0;i<30;i++){targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());if(targets.some(x=>x.type==='page'))break;await sleep(100)}
  const target=targets.find(x=>x.type==='page');assert(target?.webSocketDebuggerUrl);
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
  let id=1;
  const pending=new Map();
  ws.addEventListener('message',e=>{
    let m;try{m=JSON.parse(e.data)}catch{return}
    if(m.id&&pending.has(m.id)){const [ok,fail]=pending.get(m.id);pending.delete(m.id);m.error?fail(Error(JSON.stringify(m.error))):ok(m.result)}
  });
  const cmd=(method,params={})=>new Promise((ok,fail)=>{const current=id++;pending.set(current,[ok,fail]);ws.send(JSON.stringify({id:current,method,params}));setTimeout(()=>{if(pending.has(current)){pending.delete(current);fail(Error(method+' timeout'))}},12000).unref()});
  const evaluate=async(expression)=>{
    const out=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(out.exceptionDetails)throw Error(`Evaluate failed: ${out.exceptionDetails.text} ${JSON.stringify(out.exceptionDetails.exception||{})}`);
    return out.result?.value;
  };
  await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Network.enable');
  const failures=[];
  ws.addEventListener('message',e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.method==='Network.responseReceived'&&m.params?.response?.status>=400&&!m.params.response.url.endsWith('/favicon.ico'))failures.push(m.params.response.url+' HTTP '+m.params.response.status)});
  async function until(predicate,timeoutMs=20000){let last;for(let i=0;i<timeoutMs/150;i++){try{last=await evaluate(predicate);if(last)return last;}catch{}await sleep(150)}throw Error('Timed out waiting for '+predicate.slice(0,150)+'; last='+last)}
  async function screenshot(name){const out=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(output,name+'.png'),Buffer.from(out.data,'base64'))}

const report=[];
for(const [width,height] of [[1440,900],[1024,768],[768,1024],[390,844],[844,390]]){
await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
for(const game of ['memory','sorting','matching','conveyor','transformations']){
await cmd('Page.navigate',{url:origin+'?game='+game});await until("!!document.querySelector('.unified-settings-content')");await evaluate("document.querySelectorAll('.themes button')[1]?.click()");await sleep(800);
if(game==='matching'){
 for(const value of ['word-word','word-image','image-word','image-image']){
 await evaluate("(()=>{const e=document.querySelector('select[aria-label=\"Режим карточек\"]');e.value='"+value+"';e.dispatchEvent(new Event('change',{bubbles:true}))})()");
 assert(await evaluate("!![...document.querySelectorAll('label')].find(e=>e.textContent==='Подписи к исходным картинкам')") === (value==='image-image'),'Caption visibility: '+value);
 }
}
await screenshot('audit-'+game+'-'+width+'-top');
if(game==='matching'){
 assert(await evaluate("(()=>{const es=[...document.querySelectorAll('.settings-disclosure')];return es.length>=2&&es.every(e=>{e.querySelector('summary').click();const opened=e.open;e.querySelector('summary').click();return opened&&!e.open})})()"),'Disclosure interaction failed');
 await evaluate("document.querySelectorAll('.settings-disclosure').forEach(e=>e.open=true)");
 await screenshot('expanded-settings-'+width);
 assert(await evaluate("(()=>{const e=document.querySelector('.unified-settings-content');return e.scrollWidth<=e.clientWidth+2})()"),'Expanded settings overflow');
 await evaluate("document.querySelectorAll('.settings-disclosure').forEach(e=>e.open=false)");
}
if(game==='conveyor'){
 assert(await evaluate("(()=>{const e=document.querySelector('input[role=switch]');if(!e)return false;const before=e.checked;e.click();const changed=e.checked!==before;e.click();return changed&&e.checked===before})()"),'Caption switch failed');
 await evaluate("(()=>{const e=[...document.querySelectorAll('select')].find(e=>[...e.options].some(o=>o.value==='lexical'));if(e){e.value='lexical';e.dispatchEvent(new Event('change',{bubbles:true}))}})()");await sleep(200);
 await evaluate("document.querySelector('.category-picker-trigger')?.click()");
 if(await evaluate("!!document.querySelector('.category-picker[open]')")){
 await evaluate("document.querySelectorAll('.category-picker details').forEach(e=>e.open=true)");
 await screenshot('categories-'+width);
 assert(await evaluate("document.querySelector('.category-picker').scrollWidth<=document.querySelector('.category-picker').clientWidth+2"),'Category overflow');
 await evaluate("document.querySelector('.category-picker').close()");
 }
}
report.push(await evaluate("(()=>{const e=document.querySelector('.unified-settings-content'),r=e.getBoundingClientRect();return {game:'"+game+"',width:innerWidth,height:innerHeight,scroll:e.scrollHeight,client:e.clientHeight,bottom:r.bottom,overflow:e.scrollWidth>e.clientWidth+2,buttons:[...e.querySelectorAll('button')].filter(b=>b.textContent.startsWith('Начать')).map(b=>({text:b.textContent,disabled:b.disabled}))}})()"));
await evaluate("document.querySelector('.unified-settings-content').scrollTop=100000");await screenshot('audit-'+game+'-'+width+'-bottom');
assert(await evaluate("(()=>{const e=document.querySelector('.unified-settings-content'),f=document.querySelector('.settings-frame'),a=e.getBoundingClientRect(),b=f.getBoundingClientRect();return a.bottom<=b.bottom-8&&a.right<=b.right&&e.scrollWidth<=e.clientWidth+2})()"),'Settings exceed frame: '+game+' '+width);
if(game==='transformations'){await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Начать игру')?.click()");await sleep(500);await screenshot('audit-transformations-'+width+'-play');assert(await evaluate("(()=>{const e=document.querySelector('.transformation-chamber');if(!e)return false;const r=e.getBoundingClientRect();const t=document.querySelector('.transformation-word')?.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth+1&&(!t||(t.left>=r.left&&t.right<=r.right))})()"),'Transformation chamber cropped: '+width);}
}}

for(const game of ['memory','sorting','matching','conveyor','transformations']){
 await cmd('Page.navigate',{url:origin+'?game='+game});await until("!!document.querySelector('.unified-settings-content')");
 await evaluate("(()=>{const e=[...document.querySelectorAll('.unified-settings-content select')].find(e=>[...e.options].some(o=>o.textContent==='Чтение'));if(!e)throw Error('Task select missing');e.value=[...e.options].find(o=>o.textContent==='Чтение').value;e.dispatchEvent(new Event('change',{bubbles:true}))})()");await until("!!document.querySelector('.reading-settings')");
 for(const label of ['Буквы','Слоги','Слова'])await evaluate("(()=>{const e=[...document.querySelectorAll('.reading-settings .reading-kinds label')].find(e=>e.textContent==='"+label+"')?.querySelector('input');if(!e)throw Error('Missing reading kind');if(!e.checked)e.click()})()");
 assert(await evaluate("[...document.querySelectorAll('.reading-settings .reading-kinds')][0].querySelectorAll('input:checked').length===3"),'Mixed reading unavailable in '+game);
 await screenshot('reading-mixed-'+game);
}
writeFileSync(join(output,'audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{ws?.close();proc.kill('SIGTERM');server.close();await Promise.race([new Promise(r=>proc.once('exit',r)),sleep(1500)]);try{rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100})}catch{}}
