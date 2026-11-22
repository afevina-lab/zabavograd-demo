import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,existsSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,extname,sep} from 'node:path';
import {createServer} from 'node:http';

const selectedTheme=process.env.UI_THEME||'forest';
assert(['neutral','forest','space'].includes(selectedTheme),'Unknown UI_THEME');
const themeIndex=['neutral','forest','space'].indexOf(selectedTheme);
const root=resolve('dist');
const output=resolve(selectedTheme==='forest'?'ui-smoke/dialogs':'ui-smoke/'+selectedTheme+'/dialogs');
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
async function choose(selector,value){await evaluate("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e)throw Error('Missing select');e.value="+JSON.stringify(value)+";e.dispatchEvent(new Event('change',{bubbles:true}))})()");await sleep(100)}
async function setup(game,{timed=false}={}){
 await cmd('Page.navigate',{url:origin+'?game='+game});await until("!!document.querySelector('.unified-settings-content')");
 await evaluate("document.querySelectorAll('.themes button')["+themeIndex+"]?.click()");
 if(game==='sorting'){
 for(let i=0;i<2;i++){
 await evaluate("(()=>{const e=document.querySelectorAll('.sort-group-settings>.settings-block')["+i+"].querySelector('select[aria-label=\"Учебная задача\"]');e.value='lexical';e.dispatchEvent(new Event('change',{bubbles:true}))})()");
 await sleep(150);
 await evaluate("document.querySelectorAll('.sort-group-settings>.settings-block')["+i+"].querySelector('.category-picker-trigger').click()");
 await until("[...document.querySelectorAll('.category-picker[open] .category-grid>li summary')].some(e=>e.textContent.includes("+JSON.stringify(i?'Дом и быт':'Животный мир')+"))");
 await evaluate("(()=>{const d=document.querySelector('.category-picker[open]');d.querySelectorAll('input:checked').forEach(e=>e.click());const nodes=[...d.querySelectorAll('.category-grid>li')];const n=nodes.find(e=>e.querySelector('summary')?.textContent.includes('"+(i?'Дом и быт':'Животный мир')+"'));if(!n)throw Error('Category missing');n.querySelector('details').open=true;n.querySelector('input').click()})()");
 await sleep(100);await evaluate("document.querySelector('.category-picker[open] .primary').click()");await sleep(200);
 }
 }
 if(game==='matching')await choose('select[aria-label="Учебная задача"]','math');
 await evaluate("(()=>{const d=document.querySelector('.challenge');d.open=true;const label=[...d.querySelectorAll('label')].find(e=>e.textContent==='5 жизней');const e=label.querySelector('input');if(!e.checked)e.click()})()");
 if(timed)await evaluate("(()=>{const d=document.querySelector('.challenge');const label=[...d.querySelectorAll('label')].find(e=>e.textContent==='На время');if(!label)throw Error('Missing timer toggle');const e=label.querySelector('input');if(!e.checked)e.click()})()");
 await until("!![...document.querySelectorAll('.setup-footer button')].find(e=>e.textContent.startsWith('Начать')&&!e.disabled)");
 await evaluate("[...document.querySelectorAll('.setup-footer button')].find(e=>e.textContent.startsWith('Начать')&&!e.disabled).click()");
 await until("!!document.querySelector('.app.game-active')");
}
for(const [width,height] of [[1440,900],[390,844],[844,390]]){
 await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600||width===844});
 await cmd('Emulation.setTouchEmulationEnabled',{enabled:width<=844,maxTouchPoints:1});
 for(const game of ['memory','sorting','matching','conveyor','transformations']){
 await setup(game);
 if(width<=844){
  const compact=await evaluate("(()=>{const bar=document.querySelector('.play-toolbar.shared-toolbar'),left=[...bar.querySelectorAll('.toolbar-left>button,.toolbar-left>a')],right=[...bar.querySelectorAll('.toolbar-right>button,.toolbar-right>a')],shown=e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0,counters=bar.querySelector('.toolbar-centre>.counters'),lives=counters.querySelector('.life-controls'),pause=left.filter(shown),view=right.filter(shown),b=bar.getBoundingClientRect();return {pause:pause.map(e=>e.getAttribute('aria-label')),view:view.map(e=>e.getAttribute('aria-label')),hasLives:!!lives&&shown(lives),hasTimer:!!counters.querySelector('.toolbar-timer'),row:getComputedStyle(counters).flexDirection,scroll:getComputedStyle(bar.querySelector('.toolbar-left')).overflowX,within:b.left>=0&&b.right<=innerWidth+1,overlap:(()=>{const p=pause[0]?.getBoundingClientRect(),v=view[0]?.getBoundingClientRect(),l=lives?.getBoundingClientRect();return !!p&&!!v&&!!l&&(p.right>l.left+1||l.right>v.left+1||p.right>v.left+1)})()}})()");
  assert.deepEqual(compact.pause,['Пауза'],'Compact toolbar must show only pause: '+game+' '+width);
  assert.deepEqual(compact.view,['Полный экран'],'Compact toolbar must show only fullscreen: '+game+' '+width);
  assert(compact.hasLives&&!compact.hasTimer,'Only enabled lives should appear: '+game+' '+width);
  assert.equal(compact.row,'row','Mobile counter layout must remain horizontal: '+game+' '+width);
  assert.notEqual(compact.scroll,'auto','No toolbar scrolling: '+game+' '+width);
  assert(compact.within&&!compact.overlap,'Mobile toolbar elements overflow or overlap: '+game+' '+width);
  await screenshot(game+'-toolbar-'+width);
 }else{
  const desktop=await evaluate("(()=>{const bar=document.querySelector('.play-toolbar.shared-toolbar'),center=bar.querySelector('.toolbar-centre'),counts=center.querySelector('.counters'),r=center.getBoundingClientRect(),b=bar.getBoundingClientRect();return {row:getComputedStyle(counts).flexDirection,inside:r.left>=b.left&&r.right<=b.right+1,life:!!counts.querySelector('.life-controls'),fullscreen:!!bar.querySelector('.toolbar-right .toolbar-mobile-fullscreen')}})()");
  assert(desktop.row==='row'&&desktop.inside&&desktop.life&&desktop.fullscreen,'Desktop counter contract failed '+game+': '+JSON.stringify(desktop));
  await screenshot(game+'-toolbar-desktop-'+width);
 }
 assert(await evaluate("!document.querySelector('.play-toolbar .lesson-tag')&&document.querySelectorAll('.life-controls .icon-button').length===0"),'Toolbar clutter remains');
 await until("!!document.querySelector('button[aria-label=Пауза]')");
 await evaluate("document.querySelector('button[aria-label=Пауза]').click()");await until("!!document.querySelector('.overlay')");await sleep(350);assert(await evaluate("(()=>{const e=document.querySelector('.play-toolbar .garden-icon'),b=e.closest('button,a');return getComputedStyle(e).backgroundColor!==getComputedStyle(b).backgroundColor})()"),'Toolbar icon contrast');await screenshot(game+'-pause-'+width);
 assert(await evaluate("(()=>{const e=document.querySelector('.overlay>div'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1})()"),'Pause overflow '+game);
 await evaluate("[...document.querySelectorAll('.overlay button')].find(e=>e.textContent==='Продолжить').click()");await until("!document.querySelector('.overlay')");

 if(game==='memory'||game==='sorting'){
 await evaluate("document.querySelector('button[aria-label=Настройки]').click()");await until("!!document.querySelector('.modal.gui-panel')");await screenshot(game+'-active-settings-'+width);
 assert(await evaluate("(()=>{const r=document.querySelector('.modal.gui-panel').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1})()"),'Settings confirmation overflow');
 await evaluate("[...document.querySelectorAll('.modal.gui-panel button')].find(e=>e.textContent.startsWith('Продолжить')).click()");await until("!document.querySelector('.modal.gui-panel')");
 }

 const fullLifeLabel=await evaluate("document.querySelector('button.hearts').getAttribute('aria-label')");
 for(const key of ['F8','F9']){
 await cmd('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:key==='F8'?119:120});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:key==='F8'?119:120});
 await until("document.querySelector('button.hearts').getAttribute('aria-label')"+(key==='F8'?'!==':'===')+JSON.stringify(fullLifeLabel));
 }
 for(let i=0;i<10;i++){await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'F8',code:'F8',windowsVirtualKeyCode:119});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'F8',code:'F8',windowsVirtualKeyCode:119});await sleep(60)}
 await until("!!document.querySelector('.overlay')");await until("getComputedStyle(document.querySelector('.overlay')).opacity==='1'");await sleep(600);await screenshot(game+'-ended-'+width);
 assert(await evaluate("document.querySelector('.overlay').textContent.includes('Жизни')||document.querySelector('.overlay').textContent.includes('жизни')"),'Loss result missing '+game);
 await evaluate("document.querySelector('button[aria-label=Настройки]').click()");
 await until("!!document.querySelector('.modal,.settings-shade')");await screenshot(game+'-settings-'+width);
 report.push({game,width,pause:true,ended:true,settings:true});
 }
}
// Real Chromium render check: timer and lives must coexist in the centre for every game.
await cmd('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
for(const game of ['memory','sorting','matching','conveyor','transformations']){
 await setup(game,{timed:true});
 await until("!!document.querySelector('.play-toolbar .toolbar-timer')");
 const measured=await evaluate("(()=>{const bar=document.querySelector('.play-toolbar.shared-toolbar'),timer=bar.querySelector('.toolbar-timer'),life=bar.querySelector('.life-controls'),pause=bar.querySelector('.toolbar-mobile-pause'),full=bar.querySelector('.toolbar-mobile-fullscreen'),counters=bar.querySelector('.toolbar-centre .counters'),visible=e=>!!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0;const rects=[pause,timer,life,full].map(e=>e?.getBoundingClientRect());return {visible:[pause,timer,life,full].every(visible),inOrder:rects.every((r,i)=>r&&r.left>=0&&r.right<=innerWidth+1&&(i===0||rects[i-1].right<=r.left+1)),row:getComputedStyle(counters).flexDirection}})()");
 assert(measured.visible&&measured.inOrder&&measured.row==='row','Compact timed toolbar geometry failed '+game+': '+JSON.stringify(measured));
 await screenshot(game+'-toolbar-timed-844');
}
// A genuine completed memory round, separate from the life-limit endings.
await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await cmd('Emulation.setTouchEmulationEnabled',{enabled:false});
await setup('memory');await until("!!document.querySelector('.card:not(:disabled)')",20000);
const pairs=await evaluate("(()=>{const m={};for(const e of document.querySelectorAll('[data-card-key]')){const k=e.dataset.cardKey,id=k.slice(0,k.lastIndexOf(':'));(m[id]||=[]).push(k)}return Object.values(m)})()");
for(const pair of pairs){for(const key of pair){await evaluate("document.querySelector('[data-card-key=\""+key+"\"]').click()");await sleep(80)}await until("document.querySelector('[data-card-key=\""+pair[0]+"\"]').classList.contains('found')")}
await until("!!document.querySelector('.overlay.result')");await until("getComputedStyle(document.querySelector('.overlay.result')).opacity==='1'");await sleep(1000);await screenshot('memory-completed');
assert(await evaluate("(()=>{const b=[...document.querySelectorAll('.overlay.result>div>.panel-scroll>button')].map(e=>e.getBoundingClientRect());return b.length===2&&Math.abs(b[0].width-b[1].width)<1&&Math.abs(b[0].height-b[1].height)<1})()"),'Result buttons differ in size');
assert(await evaluate("(()=>{const r=document.querySelector('.overlay.result>div').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})()"),'Completion panel overflow');

// Complete Transformations through its visible controls.
await setup('transformations');
for(let i=0;i<10;i++){
 await evaluate("[...document.querySelectorAll('.transformation-actions button')].find(e=>/^Показать/.test(e.textContent)).click()");
 await until("[...document.querySelectorAll('.transformation-actions button')].some(e=>e.textContent==='Пропустить анимацию'||e.textContent==='Следующая карточка'||e.textContent==='Завершить')");
 await evaluate("[...document.querySelectorAll('.transformation-actions button')].find(e=>e.textContent==='Пропустить анимацию')?.click()");
 await until("[...document.querySelectorAll('.transformation-actions button')].some(e=>e.textContent==='Следующая карточка'||e.textContent==='Завершить')");
 await evaluate("[...document.querySelectorAll('.transformation-actions button')].find(e=>e.textContent==='Следующая карточка'||e.textContent==='Завершить').click()");
}
await until("document.querySelector('.game-dialog')?.textContent.includes('Игра завершена')");await sleep(250);await screenshot('transformations-completed');
assert(await evaluate("![...document.querySelectorAll('.game-dialog button')].some(e=>e.textContent==='Продолжить')"),'Completed transformation must not resume');
await evaluate("[...document.querySelectorAll('.game-dialog button')].find(e=>e.textContent==='К настройкам').click()");await until("!!document.querySelector('.unified-settings-content')");
// Exercise the real native customizable picker with pointer and keyboard input.
await cmd('Page.navigate',{url:origin+'?game=matching'});await until("!!document.querySelector('select[aria-label=\"Режим карточек\"]')");
const rect=await evaluate("(()=>{const r=document.querySelector('select[aria-label=\"Режим карточек\"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
await cmd('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...rect});await cmd('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...rect});
await sleep(250);await screenshot('matching-open-select');
if(await evaluate("CSS.supports('appearance','base-select')"))assert(await evaluate("!!document.querySelector('select:open')"),'Customizable native picker did not open');
for(const key of ['ArrowDown','Enter']){await cmd('Input.dispatchKeyEvent',{type:'keyDown',key,code:key});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key,code:key});}
await until("!document.querySelector('select:open')");
assert(await evaluate("document.querySelector('select[aria-label=\"Режим карточек\"]').value==='word-word'"),'Keyboard selection failed');

// Regression coverage for the teacher's reported dialog and help geometry.
await cmd('Page.navigate',{url:origin+'?game=matching'});
await until("!!document.querySelector('select[aria-label=\"Задание\"]')");
await evaluate("(()=>{const s=document.querySelector('select[aria-label=\"Задание\"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'manual');s.dispatchEvent(new Event('change',{bubbles:true}))})()");
await until("[...document.querySelectorAll('.setup-add-rule')].some(b=>b.textContent.includes('Настроить группы'))");
await evaluate("[...document.querySelectorAll('.setup-add-rule')].find(b=>b.textContent.includes('Настроить группы')).click()");
await until("!!document.querySelector('dialog[open]')");
assert(await evaluate("(()=>{const r=document.querySelector('dialog[open]').getBoundingClientRect();return Math.abs(r.y+r.height/2-innerHeight/2)<3&&r.y>=0})()"),'Manual group dialog must be vertically centered');
await screenshot('manual-groups-centered');
await evaluate("document.querySelector('dialog[open]').close()");
await evaluate("(()=>{const s=[...document.querySelectorAll('select')].find(s=>[...s.options].some(o=>o.value==='structure'));Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'structure');s.dispatchEvent(new Event('change',{bubbles:true}))})()");
await until("!!document.querySelector('.syllable-picker-trigger')");
await evaluate("document.querySelector('.syllable-picker-trigger').click()");
await until("!!document.querySelector('.syllable-picker-dialog[open]')");
assert(await evaluate("(()=>{const r=document.querySelector('.syllable-picker-dialog[open]').getBoundingClientRect();return Math.abs(r.x+r.width/2-innerWidth/2)<3&&Math.abs(r.y+r.height/2-innerHeight/2)<3})()"),'Syllable dialog centered on both viewport axes');
await evaluate("document.querySelector('.syllable-type-option').focus()");
assert(await evaluate("(()=>{const e=document.querySelector('.syllable-type-tooltip:popover-open');if(!e)return false;const r=e.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})()"),'Syllable help stays inside viewport');
assert(await evaluate("(()=>{const t=document.querySelector('.syllable-type-tooltip:popover-open').getBoundingClientRect(),b=document.querySelector('.syllable-type-option').getBoundingClientRect();return Math.min(Math.abs(t.top-b.bottom),Math.abs(b.top-t.bottom))<20})()"),'Syllable tooltip stays adjacent to its tile');
await screenshot('syllable-help-unclipped');

writeFileSync(join(output,'dialogs.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{ws?.close();proc.kill('SIGTERM');server.close();await Promise.race([new Promise(r=>proc.once('exit',r)),sleep(1500)]);try{rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100})}catch{}}
