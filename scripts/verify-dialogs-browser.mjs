import {createGameSetup} from './browser-game-setup.mjs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,existsSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,extname,sep} from 'node:path';
import {createServer} from 'node:http';

const selectedTheme=process.env.UI_THEME||'forest';
assert(['neutral','forest','space','children-room'].includes(selectedTheme),'Unknown UI_THEME');
const themeIndex=['neutral','forest','space','children-room'].indexOf(selectedTheme);
const root=resolve(process.env.UI_DIST_ROOT||'dist');
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
const proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--disable-dev-shm-usage','--no-first-run','--no-proxy-server','--proxy-bypass-list=<-loopback>','--no-default-browser-check','--remote-allow-origins=*',`--user-data-dir=${profile}`,'--remote-debugging-port=0','--window-size=1440,900','about:blank'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
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
  // Keep focus events deterministic when several headless checks run together.
  await cmd('Emulation.setFocusEmulationEnabled',{enabled:true});
  const failures=[];
  ws.addEventListener('message',e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.method==='Network.responseReceived'&&m.params?.response?.status>=400&&!m.params.response.url.endsWith('/favicon.ico'))failures.push(m.params.response.url+' HTTP '+m.params.response.status)});
  async function until(predicate,timeoutMs=20000){let last;for(let i=0;i<timeoutMs/150;i++){try{last=await evaluate(predicate);if(last)return last;}catch{}await sleep(150)}throw Error('Timed out waiting for '+predicate.slice(0,150)+'; last='+last)}
  async function screenshot(name){const out=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(output,name+'.png'),Buffer.from(out.data,'base64'))}


const report=[];
if(!process.env.GEOMETRY_ONLY){
const setup=createGameSetup({cmd,evaluate,until,origin,themeIndex});
for(const [width,height] of [[1440,900],[390,844],[844,390]]){
 await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600||width===844});
 await cmd('Emulation.setTouchEmulationEnabled',{enabled:width<=844,maxTouchPoints:1});
 for(const game of ['memory','sorting','matching','conveyor','transformations']){
 const menuSkin=await setup(game);
 if(selectedTheme==='children-room'){
 await until("!!document.querySelector('.v-scene-layers svg [data-node]')");
 assert.equal(await evaluate("document.querySelector('.app').dataset.theme"),'children-room');
 if(game==='memory'&&width===1440){
 const transform=()=>evaluate("document.querySelector('.v-scene-layers [data-node=\"object-0b055aed-141c-455e-9b20-63de7d08f79b\"]').getAttribute('transform')");
 const before=await transform();await sleep(500);assert.notEqual(await transform(),before,'Ivy animation must advance in the real game');
 }
 }
 if(width===1440&&game!=='memory'){
  const before=await evaluate("document.querySelector('[aria-label=\"Прошло времени\"]').textContent");
  await sleep(1200);
  assert.notEqual(await evaluate("document.querySelector('[aria-label=\"Прошло времени\"]').textContent"),before,'Elapsed time advances in '+game);
 }
 if(width<=844){
  const compact=await evaluate("(()=>{const bar=document.querySelector(':is(.v-toolbar,.play-toolbar):is(.v-toolbar,.shared-toolbar)'),left=[...bar.querySelectorAll(':is(.v-toolbar-navigation,.toolbar-left)>button,:is(.v-toolbar-navigation,.toolbar-left)>a')],right=[...bar.querySelectorAll(':is(.v-toolbar-view,.toolbar-right)>button,:is(.v-toolbar-view,.toolbar-right)>a')],shown=e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0,counters=bar.querySelector(':is(.v-toolbar-status,.toolbar-centre)>:is(.v-toolbar-counters,.counters)'),lives=counters.querySelector(':is(.v-life-meter,.life-controls)'),pause=left.filter(shown),view=right.filter(shown),b=bar.getBoundingClientRect();return {pause:pause.map(e=>e.getAttribute('aria-label')),view:view.map(e=>e.getAttribute('aria-label')),hasLives:!!lives&&shown(lives),hasTimer:!!counters.querySelector('.toolbar-timer'),row:getComputedStyle(counters).flexDirection,scroll:getComputedStyle(bar.querySelector(':is(.v-toolbar-navigation,.toolbar-left)')).overflowX,within:b.left>=0&&b.right<=innerWidth+1,overlap:(()=>{const p=pause[0]?.getBoundingClientRect(),v=view[0]?.getBoundingClientRect(),l=lives?.getBoundingClientRect();return !!p&&!!v&&!!l&&(p.right>l.left+1||l.right>v.left+1||p.right>v.left+1)})()}})()");
  assert(width<=700?compact.pause.length===2:compact.pause.length>=2&&compact.pause.length<=3,'Shared toolbar must keep responsive actions: '+game+' '+width);assert.equal(compact.pause[0],'Пауза');assert(/звук/i.test(compact.pause[1]));if(compact.pause.length>2)assert(/подпис/i.test(compact.pause[2]));
  assert.deepEqual(compact.view,width<=700?[]:['Полный экран'],'Fullscreen visibility must follow available width: '+game+' '+width);
  assert(compact.hasLives&&!compact.hasTimer,'Only enabled lives should appear: '+game+' '+width);
  assert.equal(compact.row,'row','Mobile counter layout must remain horizontal: '+game+' '+width);
  assert.notEqual(compact.scroll,'auto','No toolbar scrolling: '+game+' '+width);
  assert(compact.within&&!compact.overlap,'Mobile toolbar elements overflow or overlap: '+game+' '+width);
  await screenshot(game+'-toolbar-'+width);
 }else{
  const desktop=await evaluate("(()=>{const bar=document.querySelector(':is(.v-toolbar,.play-toolbar):is(.v-toolbar,.shared-toolbar)'),center=bar.querySelector(':is(.v-toolbar-status,.toolbar-centre)'),counts=center.querySelector(':is(.v-toolbar-counters,.counters)'),r=center.getBoundingClientRect(),b=bar.getBoundingClientRect();return {row:getComputedStyle(counts).flexDirection,inside:r.left>=b.left&&r.right<=b.right+1,life:!!counts.querySelector(':is(.v-life-meter,.life-controls)'),fullscreen:!!bar.querySelector(':is(.v-toolbar-view,.toolbar-right) :is(.v-icon-button,.icon-button)')}})()");
  assert(desktop.row==='row'&&desktop.inside&&desktop.life&&desktop.fullscreen,'Desktop counter contract failed '+game+': '+JSON.stringify(desktop));
  await screenshot(game+'-toolbar-desktop-'+width);
 }
 assert(await evaluate("!document.querySelector(':is(.v-toolbar,.play-toolbar) .lesson-tag')&&document.querySelectorAll(':is(.v-life-meter,.life-controls) :is(.v-icon-button,.icon-button)').length===0"),'Toolbar clutter remains');
 assert(await evaluate("(()=>{const bar=document.querySelector(':is(.v-toolbar,.shared-toolbar)').getBoundingClientRect();return [...document.querySelectorAll(':is(.v-toolbar,.shared-toolbar) :is(.v-icon-button,.icon-button)')].filter(e=>e.getBoundingClientRect().width>0).every(e=>{const r=e.getBoundingClientRect();return Math.abs(r.height/bar.height-.6)<.02&&Math.abs(r.top+r.height/2-bar.top-bar.height/2)<1})})()"),'Header action size/centring '+game+' '+width+' '+JSON.stringify(await evaluate("(()=>({bar:document.querySelector('.v-toolbar').getBoundingClientRect().toJSON(),buttons:[...document.querySelectorAll('.v-toolbar .v-icon-button')].map(e=>({label:e.getAttribute('aria-label'),rect:e.getBoundingClientRect().toJSON()}))}))()")));
 await until("!!document.querySelector('button[aria-label=Пауза]')");
 await evaluate("document.querySelector('button[aria-label=Пауза]').click()");await until("!!document.querySelector('.overlay')");await sleep(350);assert(await evaluate("(()=>{const e=document.querySelector(':is(.v-toolbar,.play-toolbar) .garden-icon'),b=e.closest('button,a');return getComputedStyle(e).backgroundColor!==getComputedStyle(b).backgroundColor})()"),'Toolbar icon contrast');await screenshot(game+'-pause-'+width);
 assert.deepEqual(await evaluate("(()=>{const e=document.querySelector('.overlay .v-dialog-panel'),style=getComputedStyle(e);return Object.fromEntries(['borderTopWidth','borderTopStyle','borderTopColor','borderRadius','backgroundImage','backgroundColor','boxShadow'].map(key=>[key,style[key]]))})()"),menuSkin,'Game window must use the menu frame and material: '+game+' '+width);
 assert(await evaluate("(()=>{const e=document.querySelector('.overlay>div'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1})()"),'Pause overflow '+game);
 if(width===1440&&game!=='memory'){
  const frozen=await evaluate("document.querySelector('[aria-label=\"Прошло времени\"]').textContent");
  await sleep(1200);
  assert.equal(await evaluate("document.querySelector('[aria-label=\"Прошло времени\"]').textContent"),frozen,'Elapsed time freezes on pause in '+game);
 }
 await evaluate("document.querySelector('.overlay button[aria-label=Продолжить]').click()");await until("!document.querySelector('.overlay')");

 const fullLifeLabel=await evaluate("document.querySelector(':is(button.v-life-button,button.hearts)').getAttribute('aria-label')");
 for(const key of ['F8','F9']){
 await cmd('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:key==='F8'?119:120});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:key==='F8'?119:120});
 await until("document.querySelector(':is(button.v-life-button,button.hearts)').getAttribute('aria-label')"+(key==='F8'?'!==':'===')+JSON.stringify(fullLifeLabel));
 }
 for(let i=0;i<10;i++){await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'F8',code:'F8',windowsVirtualKeyCode:119});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'F8',code:'F8',windowsVirtualKeyCode:119});await sleep(60)}
 await until("!!document.querySelector('.overlay')");await until("getComputedStyle(document.querySelector('.overlay')).opacity==='1'");await sleep(600);await screenshot(game+'-ended-'+width);
 assert(await evaluate("document.querySelector('.overlay').textContent.includes('Жизни')||document.querySelector('.overlay').textContent.includes('жизни')"),'Loss result missing '+game);
 assert.equal(await evaluate("document.querySelectorAll(':is(.v-life-heart,.life-heart-art)>img:not(:is(.v-heart-leaving,.heart-leaving))').length"),0,'Spent hearts remain visible');
 await evaluate("document.querySelector('.overlay button[aria-label=Настройки]').click()");
 await until("!!document.querySelector('.modal,:is(.v-settings-backdrop,.settings-shade)')");await screenshot(game+'-settings-'+width);
 report.push({game,width,pause:true,ended:true,settings:true});
 }
}
// Real Chromium render check: timer and lives must coexist in the centre for every game.
await cmd('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
for(const game of ['memory','sorting','matching','conveyor','transformations']){
 await setup(game,{timed:true});
 await until("!!document.querySelector(':is(.v-toolbar,.play-toolbar) .toolbar-timer')");
 const measured=await evaluate("(()=>{const bar=document.querySelector(':is(.v-toolbar,.play-toolbar):is(.v-toolbar,.shared-toolbar)'),timer=bar.querySelector('.toolbar-timer'),life=bar.querySelector(':is(.v-life-meter,.life-controls)'),pause=bar.querySelector('button[aria-label=Пауза]'),full=bar.querySelector(':is(.v-toolbar-view,.toolbar-right) :is(.v-icon-button,.icon-button)'),counters=bar.querySelector(':is(.v-toolbar-status,.toolbar-centre) :is(.v-toolbar-counters,.counters)'),visible=e=>!!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0;const rects=[pause,timer,life,full].map(e=>e?.getBoundingClientRect());return {visible:[pause,timer,life,full].every(visible),inOrder:rects.every((r,i)=>r&&r.left>=0&&r.right<=innerWidth+1&&(i===0||rects[i-1].right<=r.left+1)),row:getComputedStyle(counters).flexDirection}})()");
 assert(measured.visible&&measured.inOrder&&measured.row==='row','Compact timed toolbar geometry failed '+game+': '+JSON.stringify(measured));
 await screenshot(game+'-toolbar-timed-844');
}
// A genuine completed memory round, separate from the life-limit endings.
await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await cmd('Emulation.setTouchEmulationEnabled',{enabled:false});
await setup('memory');await until("!!document.querySelector('.card:not(:disabled)')",20000);
const pairs=await evaluate("(()=>{const m={};for(const e of document.querySelectorAll('[data-card-key]')){const k=e.dataset.cardKey,id=k.slice(0,k.lastIndexOf(':'));(m[id]||=[]).push(k)}return Object.values(m)})()");
for(const pair of pairs){for(const key of pair){await evaluate("document.querySelector('[data-card-key=\""+key+"\"]').click()");await sleep(80)}await until("document.querySelector('[data-card-key=\""+pair[0]+"\"]').classList.contains('found')")}
await until("!!document.querySelector('.overlay.result')");await until("getComputedStyle(document.querySelector('.overlay.result')).opacity==='1'");await until("[...document.querySelectorAll('.v-score-stars>span')].every(e=>e.getAnimations().every(a=>a.playState==='finished'))");await screenshot('memory-completed');
assert(await evaluate("(()=>{const b=[...document.querySelectorAll('.overlay.result :is(.v-dialog-actions,.dialog-actions)>:is(button,a)')].map(e=>e.getBoundingClientRect());return b.length===3&&Math.abs(b[0].width-b[1].width)<1&&Math.abs(b[0].height-b[1].height)<1})()"),'Result buttons differ in size');
assert(await evaluate("(()=>{const r=document.querySelector('.overlay.result .v-dialog-panel').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})()"),'Completion panel overflow');

// Award and result frame must fit short screens, including the raised central star.
const resultViewport=await evaluate("({width:innerWidth,height:innerHeight})");
for(const [width,height] of [[320,480],[390,844],[844,390]]){
 await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
 await sleep(250);
 assert(await evaluate("(()=>{const frame=document.querySelector('.overlay.result .v-dialog-panel').getBoundingClientRect(),award=document.querySelector('.overlay.result :is(.v-dialog-award,.award)').getBoundingClientRect();return frame.left>=0&&frame.right<=innerWidth+1&&frame.bottom<=innerHeight+1&&award.top>=0})()"),'Responsive result overflow '+width);
 await screenshot('memory-completed-'+width);
}
await cmd('Emulation.setDeviceMetricsOverride',{...resultViewport,deviceScaleFactor:1,mobile:resultViewport.width<600});

// Two rounds are one session: no award or final dialog between fields.
await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await cmd('Emulation.setTouchEmulationEnabled',{enabled:false});
await setup('memory',{rounds:2});
for(let r=0;r<2;r++){
 await until("!!document.querySelector('.card:not(:disabled)')",20000);
 const pairs=await evaluate("(()=>{const m={};for(const e of document.querySelectorAll('[data-card-key]')){const k=e.dataset.cardKey,id=k.slice(0,k.lastIndexOf(':'));(m[id]||=[]).push(k)}return Object.values(m)})()");
 for(const pair of pairs){for(const key of pair){await until("!document.querySelector('[data-card-key=\""+key+"\"]').disabled");await evaluate("document.querySelector('[data-card-key=\""+key+"\"]').click()");}await until("document.querySelector('[data-card-key=\""+pair[0]+"\"]').classList.contains('found')")}
 if(r===0){assert(await evaluate("!document.querySelector('.overlay.result,:is(.v-score-stars,.victory-stars)')"),'Intermediate award leaked');await until("!!document.querySelector('.card:not(:disabled)')",20000);}
}
await until("!!document.querySelector('.overlay.result')");
assert(await evaluate("!document.querySelector('.overlay.result').textContent.includes('Раунд')"),'Redundant round count in result');
assert.equal(await evaluate("document.querySelectorAll('.overlay.result :is(.v-dialog-actions,.dialog-actions)>*').length"),3);
await screenshot('memory-two-rounds-completed');

// Complete Transformations through its visible controls.
await setup('transformations');
for(let i=0;i<10;i++){
 await evaluate("[...document.querySelectorAll('.transformation-actions button')].find(e=>/^Показать/.test(e.getAttribute('aria-label')||e.textContent)).click()");
 await until("[...document.querySelectorAll('.transformation-actions button')].some(e=>(e.getAttribute('aria-label')||e.textContent)==='Пропустить анимацию'||(e.getAttribute('aria-label')||e.textContent)==='Следующая карточка'||(e.getAttribute('aria-label')||e.textContent)==='Завершить')");
 await evaluate("[...document.querySelectorAll('.transformation-actions button')].find(e=>(e.getAttribute('aria-label')||e.textContent)==='Пропустить анимацию')?.click()");
 await until("[...document.querySelectorAll('.transformation-actions button')].some(e=>(e.getAttribute('aria-label')||e.textContent)==='Следующая карточка'||(e.getAttribute('aria-label')||e.textContent)==='Завершить')");
 await evaluate("[...document.querySelectorAll('.transformation-actions button')].find(e=>(e.getAttribute('aria-label')||e.textContent)==='Следующая карточка'||(e.getAttribute('aria-label')||e.textContent)==='Завершить').click()");
}
await until("document.querySelector('.overlay.result')?.textContent.includes('Игра завершена')");await sleep(250);await screenshot('transformations-completed');
assert(await evaluate("!document.querySelector('.overlay.result button[aria-label=Продолжить]')"),'Completed transformation must not resume');
await evaluate("document.querySelector('.overlay.result button[aria-label=Настройки]').click()");await until("!!document.querySelector(':is(.v-settings-scroll,.unified-settings-content)')");
// Exercise the real native customizable picker with pointer and keyboard input.
await cmd('Page.navigate',{url:origin+'?game=matching'});await until("!!document.querySelector('select[aria-label=\"Режим карточек\"]')");
const rect=await evaluate("(()=>{const r=document.querySelector('select[aria-label=\"Режим карточек\"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
await cmd('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...rect});await cmd('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...rect});
await sleep(250);await screenshot('matching-open-select');
if(await evaluate("CSS.supports('appearance','base-select')"))assert(await evaluate("!!document.querySelector('select:open')"),'Customizable native picker did not open');
for(const key of ['ArrowDown','Enter']){await cmd('Input.dispatchKeyEvent',{type:'keyDown',key,code:key});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key,code:key});}
await until("!document.querySelector('select:open')");
assert(await evaluate("document.querySelector('select[aria-label=\"Режим карточек\"]').value==='word-word'"),'Keyboard selection failed');

}
// Regression coverage for the teacher's reported dialog and help geometry.
await cmd('Emulation.setDeviceMetricsOverride',{width:1920,height:900,deviceScaleFactor:1,mobile:false});
await cmd('Page.navigate',{url:origin+'?game=matching'});
await until("!!document.querySelector('select[aria-label=\"Задание\"]')");
console.log(await evaluate("[document.querySelector(':is(.v-settings-footer,.setup-footer) :is(.v-fit-copy,.setup-preview-content)'),document.querySelector(':is(.v-settings-footer,.setup-footer)>button:is(.v-button--primary,.primary)')].map(e=>({rect:e.getBoundingClientRect().toJSON(),shadow:getComputedStyle(e).boxShadow,box:getComputedStyle(e).boxSizing}))"));
assert(await evaluate("(()=>{const a=document.querySelector(':is(.v-settings-footer,.setup-footer) :is(.v-fit-copy,.setup-preview-content)'),b=document.querySelector(':is(.v-settings-footer,.setup-footer)>button:is(.v-button--primary,.primary)');const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();const edges=e=>getComputedStyle(e).boxShadow.split(/,(?![^()]*\\))/).filter(s=>!s.includes('inset')).join(',');return Math.abs(ar.y+ar.height/2-br.y-br.height/2)<1&&ar.left>=0&&br.right<=innerWidth&&ar.height>=44&&br.height>=44})()"),'Preview and start must be vertically centred with readable bounds');
await screenshot('footer-equal-visible-edges');
await evaluate("(()=>{const s=document.querySelector('select[aria-label=\"Задание\"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'manual');s.dispatchEvent(new Event('change',{bubbles:true}))})()");
await until("[...document.querySelectorAll(':is(.v-add-action,.setup-add-rule)')].some(b=>b.textContent.includes('Настроить группы'))");
await evaluate("[...document.querySelectorAll(':is(.v-add-action,.setup-add-rule)')].find(b=>b.textContent.includes('Настроить группы')).click()");
await until("!!document.querySelector('dialog[open]')");
assert(await evaluate("(()=>{const r=document.querySelector('dialog[open]').getBoundingClientRect();return Math.abs(r.y+r.height/2-innerHeight/2)<3&&r.y>=0})()"),'Manual group dialog must be vertically centered');
await screenshot('manual-groups-centered');
await evaluate("document.querySelector('dialog[open]').close()");
await evaluate("(()=>{const s=[...document.querySelectorAll('select')].find(s=>[...s.options].some(o=>o.value==='structure'));Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'structure');s.dispatchEvent(new Event('change',{bubbles:true}))})()");
await until("!!document.querySelector('.syllable-picker-trigger')");
await evaluate("document.querySelector('.syllable-picker-trigger').click()");
await until("!!document.querySelector('.syllable-picker-dialog[open]')");
assert(await evaluate("[...document.querySelectorAll('.syllable-picker-grid>.syllable-type-option')].every(e=>{const r=e.getBoundingClientRect();return Math.abs(r.width-r.height)<1&&getComputedStyle(e,'::after').content==='none'})"),'Syllable tiles must be square and have no selection crosses');
console.log(await evaluate("(()=>{const e=document.querySelector('.syllable-picker-dialog[open]'),s=getComputedStyle(e);return {rect:e.getBoundingClientRect().toJSON(),inset:s.inset,margin:s.margin,position:s.position,height:s.height,transform:s.transform,viewport:[innerWidth,innerHeight]}})()"));
assert(await evaluate("(()=>{const r=document.querySelector('.syllable-picker-dialog[open]').getBoundingClientRect();return Math.abs(r.x+r.width/2-innerWidth/2)<3&&Math.abs(r.y+r.height/2-innerHeight/2)<3})()"),'Syllable dialog centered on both viewport axes');
await evaluate("document.querySelector('.syllable-picker-dialog input').focus()");
await evaluate("document.querySelector('.syllable-type-option').focus()");
await until("!!document.querySelector('.syllable-type-tooltip:popover-open')");
console.log(await evaluate("[document.querySelector('.syllable-type-option'),document.querySelector('.syllable-type-tooltip')].map(e=>({rect:e.getBoundingClientRect().toJSON(),open:e.matches(':popover-open'),style:e.getAttribute('style'),position:getComputedStyle(e).position,margin:getComputedStyle(e).margin,transform:getComputedStyle(e).transform,focus:e===document.activeElement}))"));
assert(await evaluate("(()=>{const e=document.querySelector('.syllable-type-tooltip:popover-open');if(!e)return false;const r=e.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})()"),'Syllable help stays inside viewport');
assert(await evaluate("(()=>{const t=document.querySelector('.syllable-type-tooltip:popover-open').getBoundingClientRect(),b=document.querySelector('.syllable-type-option').getBoundingClientRect();return Math.min(Math.abs(t.top-b.bottom),Math.abs(b.top-t.bottom))<20})()"),'Syllable tooltip stays adjacent to its tile');
await screenshot('syllable-help-unclipped');

writeFileSync(join(output,'dialogs.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{ws?.close();proc.kill('SIGTERM');server.close();await Promise.race([new Promise(r=>proc.once('exit',r)),sleep(1500)]);try{rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100})}catch{}}
