import {inspectSettingsLayout} from './settings-layout-contract.mjs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,existsSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,extname,sep} from 'node:path';
import {createServer} from 'node:http';

const selectedTheme=process.env.UI_THEME||'forest';
assert(['neutral','forest','space'].includes(selectedTheme),'Unknown UI_THEME');
const themeIndex=['neutral','forest','space'].indexOf(selectedTheme);
const root=resolve(process.env.UI_DIST_ROOT||'dist');
const output=resolve(selectedTheme==='forest'?'ui-smoke':'ui-smoke/'+selectedTheme);
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

const scope=process.env.CI_PLAN_FILE?JSON.parse(readFileSync(process.env.CI_PLAN_FILE,'utf8')):null;
const report=[];
for(const [width,height] of (scope?.sizes||[[1440,900],[1024,768],[768,1024],[390,844],[844,390]])){
await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
for(const game of (scope?.games||['memory','sorting','matching','conveyor','transformations'])){
await cmd('Page.navigate',{url:origin+'?game='+game});await until("!!document.querySelector(':is(.v-settings-scroll,.unified-settings-content)')");await evaluate("document.querySelectorAll(':is(.v-theme-choice,.themes) button')["+themeIndex+"]?.click()");await sleep(800);
// Regression: an opaque themed backdrop must completely cover the legacy
// game page, including its titles/cards, in every game's settings screen.
const backdrop=await evaluate("(()=>{const e=document.querySelector(':is(.v-settings-backdrop,.settings-shade):has(:is(.v-settings,.shared-settings-window))'),s=getComputedStyle(e),app=getComputedStyle(document.querySelector('.app[data-theme]')),scene=app.getPropertyValue('--zg-stage-image'),file=scene.match(/assets\\/[^\\\"')]+/),b=e.getBoundingClientRect(),color=s.backgroundColor;return {opaque:/^rgb\\(/.test(color),sceneMatches:!!file&&s.backgroundImage.includes(file[0]),noBlur:s.backdropFilter==='none'&&(!s.webkitBackdropFilter||s.webkitBackdropFilter==='none'),backdropFilter:s.backdropFilter,webkitBackdropFilter:s.webkitBackdropFilter,coversViewport:b.left<=1&&b.top<=1&&b.right>=innerWidth-1&&b.bottom>=innerHeight-1,bounds:b.toJSON(),viewport:[innerWidth,innerHeight],color,backgroundImage:s.backgroundImage}})()");
assert(backdrop.opaque&&backdrop.sceneMatches&&backdrop.noBlur&&backdrop.coversViewport,'Settings background leaks obsolete page content: '+game+' '+selectedTheme+' '+width+' '+JSON.stringify(backdrop));
const setupGeometry=await evaluate("(()=>{const grid=document.querySelector(':is(.v-settings-columns,.setup-columns)'),cols=[...grid?.querySelectorAll(':scope>:is(.v-stack,.setup-column)')||[]],footer=document.querySelector(':is(.v-settings-footer,.setup-footer)'),preview=footer?.querySelector(':scope>:is(.v-material-preview,.setup-material-preview)'),start=[...footer?.children||[]].find(e=>e.matches('button:is(.v-button--primary,.primary),button.start')),body=document.querySelector(':is(.v-settings-scroll,.unified-settings-content)');if(!grid&&document.querySelector('.v-sort-material')){const m=document.querySelector('.v-sort-material'),c=document.querySelector('.group-count-choice'),o=document.querySelector('.v-sort-settings-options'),r=document.querySelector('.v-settings-appearance');return {ok:!!c&&!!o&&!!footer&&!!preview&&!!start&&c.getBoundingClientRect().top<=m.getBoundingClientRect().top&&m.getBoundingClientRect().top<=o.getBoundingClientRect().top,sortingFlow:true,sections:[['material','rules'],['task']],themeSections:[...r.querySelectorAll('[data-setup-section]')].map(e=>e.dataset.setupSection),notOverflowing:body.scrollWidth<=body.clientWidth+2}}if(!grid||cols.length!==2||!footer||!preview||!start)return {ok:false,reason:'missing shared sections or material preview / start'};const sections=cols.map(c=>[...c.querySelectorAll('[data-setup-section]')].map(e=>e.dataset.setupSection)),rail=document.querySelector(':is(.v-settings-appearance,.setup-theme-rail)'),themeSections=[...rail?.querySelectorAll('[data-setup-section]')||[]].map(e=>e.dataset.setupSection);const twoColumns=getComputedStyle(grid).gridTemplateColumns.split(' ').length===2;return {ok:JSON.stringify(sections)===JSON.stringify([['material','rules'],['task']])&&JSON.stringify(themeSections)===JSON.stringify(['appearance']),sections,themeSections,twoColumns,notOverflowing:body.scrollWidth<=body.clientWidth+2}})()");
const expectedColumns=game==='conveyor'?[['material','task'],['rules']]:[['material','rules'],['task']];
const sectionsCorrect=JSON.stringify(setupGeometry.sections)===JSON.stringify(expectedColumns);
assert(game==='conveyor'?(sectionsCorrect&&JSON.stringify(setupGeometry.themeSections)===JSON.stringify(['appearance'])):setupGeometry.ok,'Unified setup sections: '+game+' '+width+' '+JSON.stringify(setupGeometry));
assert(setupGeometry.notOverflowing,'Shared settings horizontally overflow: '+game+' '+width);
const responsiveLayout=await evaluate('('+inspectSettingsLayout.toString()+')()');
assert(Object.values(responsiveLayout).every(Boolean),'Responsive settings layout: '+game+' '+width+' '+JSON.stringify(responsiveLayout));
if(game==='sorting'){
 const appearanceSplit=await evaluate("(()=>({railHasPresentation:!!document.querySelector(':is(.v-settings-appearance,.setup-theme-rail) .card-presentation'),bodyHasPresentation:!!document.querySelector(':is(.v-settings-scroll,.unified-settings-content) .setup-presentation-options .card-presentation'),railThemeCount:document.querySelectorAll(':is(.v-settings-appearance,.setup-theme-rail) :is(.v-theme-choice,.themes) button').length}))()");
 assert(!appearanceSplit.railHasPresentation&&appearanceSplit.bodyHasPresentation&&appearanceSplit.railThemeCount>=3,'Non-theme presentation controls leaked into theme rail: '+width+' '+JSON.stringify(appearanceSplit));

 const headings=await evaluate("(()=>{const groups=[...document.querySelectorAll('.sort-group-settings>:is(.v-settings-section,.settings-block)')],presentation=document.querySelector('.setup-presentation-options .card-presentation'),picker=presentation?.querySelector(':is(.v-field,.game-choice)'),label=picker?.querySelector(':is(.v-field-label,.field-label)');return {singleGroupTitles:groups.length>=2&&groups.every(g=>g.querySelector('.group-title-edit strong')&&!g.querySelector('h3')),oneVisiblePresentationLabel:!!presentation?.querySelector('h3')&&!!label&&getComputedStyle(label).display==='none'}})()");
 assert(headings.singleGroupTitles&&headings.oneVisiblePresentationLabel,'Sorting repeats a group or card-type heading: '+width+' '+JSON.stringify(headings));

}


if(game==='conveyor'){
 const captionPosition=await evaluate("(()=>{const task=document.querySelector('[data-setup-section=task]'),mode=task?.querySelector('.setup-dependent-field :is(.v-field,.game-choice)'),caption=task?.querySelector('.setup-dependent-field label:is(.v-choice,.check)'),count=task?.querySelector(':is(.v-quantity,.quantity-slider)');if(!mode||!caption||!count)return {ok:false};const a=mode.getBoundingClientRect(),b=caption.getBoundingClientRect(),c=count.getBoundingClientRect();return {ok:b.top>=a.bottom&&b.bottom<=c.top,modeToCaption:b.top-a.bottom,captionToCounter:c.top-b.bottom,labelHidden:getComputedStyle(mode.querySelector(':is(.v-field-label,.field-label)')).display==='none'}})()");
 assert(captionPosition.ok&&captionPosition.modeToCaption>=5&&captionPosition.modeToCaption<=12&&captionPosition.captionToCounter>=5&&captionPosition.captionToCounter<=12&&captionPosition.labelHidden,'Conveyor caption toggle must follow card type with equal gaps: '+width+' '+JSON.stringify(captionPosition));
}
await screenshot('unified-setup-'+game+'-'+width);
if(game==='matching'){
 for(const value of ['word-word','word-image','image-word','image-image']){
 await evaluate("(()=>{const e=document.querySelector('select[aria-label=\"Режим карточек\"]');e.value='"+value+"';e.dispatchEvent(new Event('change',{bubbles:true}))})()");
 assert(await evaluate("!![...document.querySelectorAll('label')].find(e=>e.textContent==='Подписи к исходным картинкам')") === (value==='image-image'),'Caption visibility: '+value);
 }
}
assert(await evaluate("[...document.querySelectorAll(':is(.v-settings-scroll,.settings) select')].every(e=>e.closest(':is(.v-select,.select-control)'))"),'Unstyled native select');
assert(await evaluate("!document.querySelector('.setup-card-preview,.setup-preview-card')"),'Picture preview still present');
assert(await evaluate("(()=>{const nodes=[...document.querySelectorAll(':is(.v-select,.select-control),:is(.v-picker-trigger,.category-picker-trigger),:is(.v-disclosure,.settings-disclosure)>summary')];return nodes.every(e=>{const w=e.querySelector(':scope>:is(.v-control-well,.control-well)'),r=(e.matches('summary')?e.parentElement:e).getBoundingClientRect();if(!w||r.width===0)return true;return Math.abs(r.right-w.getBoundingClientRect().right-12)<=1})})()"),'Action well inset mismatch '+game+' '+width);
await screenshot('audit-'+game+'-'+width+'-top');
if(game==='matching'){
 assert(await evaluate("(()=>{const es=[...document.querySelectorAll(':is(.v-disclosure,.settings-disclosure)')];return es.length>=2&&es.every(e=>{e.querySelector('summary').click();const opened=e.open;e.querySelector('summary').click();return opened&&!e.open})})()"),'Disclosure interaction failed');
 await evaluate("document.querySelectorAll(':is(.v-disclosure,.settings-disclosure)').forEach(e=>e.open=true)");
 await screenshot('expanded-settings-'+width);
 assert(await evaluate("(()=>{const e=document.querySelector(innerWidth>=1180&&innerHeight>=560?'.v-settings-body':'.v-settings-scroll');return e.scrollWidth<=e.clientWidth+2})()"),'Expanded settings overflow');
 await evaluate("document.querySelectorAll(':is(.v-disclosure,.settings-disclosure)').forEach(e=>e.open=false)");
}
if(game==='sorting'){
 const before=await evaluate("document.querySelector('.group-count-choice button[aria-pressed=true]').textContent");
 await evaluate("document.querySelectorAll('.group-count-choice button')[1].click()");
 await until("document.querySelectorAll('.sort-group-settings>section').length===3");
 assert(await evaluate("(()=>{const buttons=[...document.querySelectorAll('.group-count-choice button')],on=buttons.find(e=>e.getAttribute('aria-pressed')==='true'),off=buttons.find(e=>e.getAttribute('aria-pressed')==='false');return on.textContent==='3'&&getComputedStyle(on).backgroundColor!==getComputedStyle(off).backgroundColor})()"),'Group count must visibly latch');
 assert(await evaluate("!!document.querySelector('.card-presentation select[aria-label=Карточки]')"),'Card mode must stay with display settings');
 await evaluate("[...document.querySelectorAll('.group-count-choice button')].find(e=>e.textContent==="+JSON.stringify(before)+").click()");
}
if(game==='conveyor'){
 const beforeCount=await evaluate("+document.querySelector(':is(.v-quantity,.quantity-slider) input[type=number]').value");
 await evaluate("document.querySelectorAll(':is(.v-quantity,.quantity-slider) button')[1].click()");
 await until("+document.querySelector(':is(.v-quantity,.quantity-slider) input[type=number]').value==="+(beforeCount+1));
 await evaluate("document.querySelectorAll(':is(.v-quantity,.quantity-slider) button')[0].click()");
 await until("+document.querySelector(':is(.v-quantity,.quantity-slider) input[type=number]').value==="+beforeCount);
 assert(await evaluate("[...document.querySelectorAll(':is(.v-quantity,.quantity-slider)')].every(e=>e.querySelectorAll('input[type=number]').length===1&&e.querySelectorAll('input[type=range]').length===1&&!e.querySelector('output')&&e.querySelector('input[type=number]').value===e.querySelector('input[type=range]').value)"),'Quantity display duplicated');
 await evaluate("document.querySelector(innerWidth>=1180&&innerHeight>=560?'.v-settings-body':'.v-settings-scroll').scrollTop=100000");await screenshot('ready-material-'+width);await evaluate("document.querySelector(innerWidth>=1180&&innerHeight>=560?'.v-settings-body':'.v-settings-scroll').scrollTop=0");
 assert(await evaluate("(()=>{const e=document.querySelector('input[role=switch]');if(!e)return false;const before=e.checked;e.click();const changed=e.checked!==before;e.click();return changed&&e.checked===before})()"),'Caption switch failed');
 await evaluate("(()=>{const e=[...document.querySelectorAll('select')].find(e=>[...e.options].some(o=>o.value==='lexical'));if(e){e.value='lexical';e.dispatchEvent(new Event('change',{bubbles:true}))}})()");await sleep(200);
 await evaluate("document.querySelector(':is(.v-picker-trigger,.category-picker-trigger)')?.click()");
 if(await evaluate("!!document.querySelector('.category-picker[open]')")){
 await evaluate("document.querySelectorAll('.category-picker details').forEach(e=>e.open=true)");
 assert(await evaluate("[...document.querySelectorAll(':is(.v-selection-tree,.category-grid) summary')].every(e=>e.querySelector(':is(.v-control-well,.control-well)')&&getComputedStyle(e).userSelect==='none')"),'Category rows must share arrows and prevent accidental text selection');
 const pickerLayout=await evaluate("(()=>{const d=document.querySelector('dialog.category-picker[open]'),scroll=d.querySelector(':scope>:is(.v-picker-scroll,.v-dialog-scroll,.v-selection-content,.panel-scroll)'),footer=d.querySelector(':scope>:is(.v-picker-actions,.sound-picker-actions)'),grid=d.querySelector(':is(.v-selection-tree,.category-grid)'),opened=[...grid.querySelectorAll(':scope>li:is(.v-tree-branch,.category-branch):has(>details[open])')],buttons=[...footer?.querySelectorAll('button')||[]],sr=scroll.getBoundingClientRect(),fr=footer?.getBoundingClientRect(),gr=grid.getBoundingClientRect();return {separate:!!footer&&footer.parentElement===d,nonOverlapping:!!fr&&sr.bottom<=fr.top+2,expanded:opened.length>0&&opened.every(e=>e.getBoundingClientRect().width>=gr.width*.90),equalButtons:buttons.length===2&&Math.abs(buttons[0].getBoundingClientRect().height-buttons[1].getBoundingClientRect().height)<1&&getComputedStyle(buttons[0]).borderRadius===getComputedStyle(buttons[1]).borderRadius,distinctColors:buttons.length===2&&getComputedStyle(buttons[0]).backgroundColor!==getComputedStyle(buttons[1]).backgroundColor}})()");
 assert(Object.values(pickerLayout).every(Boolean),'Category picker responsive tree/footer geometry: '+width+' '+JSON.stringify(pickerLayout));
 await screenshot('categories-'+width);
 await evaluate("document.querySelector('.category-picker[open]>:is(.v-picker-scroll,.v-dialog-scroll,.v-selection-content,.panel-scroll)').scrollTop=100000");
 assert(await evaluate("(()=>{const d=document.querySelector('.category-picker[open]'),s=d.querySelector(':is(.v-picker-scroll,.v-dialog-scroll,.v-selection-content,.panel-scroll)'),a=s.getBoundingClientRect(),b=d.getBoundingClientRect(),inset=parseFloat(getComputedStyle(d).getPropertyValue('--ui-frame-inset'));return d.scrollTop===0&&s.scrollTop>0&&b.right-a.right>=inset+8&&b.bottom-a.bottom>=inset+8})()"),'Dialog scrollbar overlaps frame');
 await screenshot('categories-'+width+'-bottom');
 assert(await evaluate("document.querySelector('.category-picker').scrollWidth<=document.querySelector('.category-picker').clientWidth+2"),'Category overflow');
 await evaluate("document.querySelector('.category-picker').close()");
 }
}
report.push(await evaluate("(()=>{const e=document.querySelector(innerWidth>=1180&&innerHeight>=560?'.v-settings-body':'.v-settings-scroll'),r=e.getBoundingClientRect();return {game:'"+game+"',width:innerWidth,height:innerHeight,scroll:e.scrollHeight,client:e.clientHeight,bottom:r.bottom,overflow:e.scrollWidth>e.clientWidth+2,buttons:[...document.querySelectorAll(':is(.v-settings-footer,.setup-footer) button')].filter(b=>b.textContent.startsWith('Начать')).map(b=>({text:b.textContent,disabled:b.disabled}))}})()"));
await evaluate("document.querySelector(innerWidth>=1180&&innerHeight>=560?'.v-settings-body':'.v-settings-scroll').scrollTop=100000");await screenshot('audit-'+game+'-'+width+'-bottom');
assert(await evaluate("(()=>{const frame=document.querySelector(':is(.v-settings,.settings-frame):is(.v-settings,.shared-settings-window)'),footer=frame.querySelector(':scope>:is(.v-settings-footer,.setup-footer)'),r=footer.getBoundingClientRect(),f=frame.getBoundingClientRect();return r.bottom<=f.bottom+1&&r.top>=f.top&&footer.querySelector(':scope>button:is(.v-button--primary,.primary)').getBoundingClientRect().bottom<=f.bottom+1})()"),'Footer must stay visible after settings scroll: '+game+' '+width);
assert(await evaluate("(()=>{const e=document.querySelector(innerWidth>=1180&&innerHeight>=560?'.v-settings-body':'.v-settings-scroll'),f=document.querySelector(':is(.v-settings,.settings-frame)'),a=e.getBoundingClientRect(),b=f.getBoundingClientRect();return a.bottom<=b.bottom-8&&a.right<=b.right&&e.scrollWidth<=e.clientWidth+2})()"),'Settings exceed frame: '+game+' '+width);
assert(await evaluate("(()=>{const e=document.querySelector(innerWidth>=1180&&innerHeight>=560?'.v-settings-body':'.v-settings-scroll'),f=document.querySelector(':is(.v-settings,.settings-frame)'),a=e.getBoundingClientRect(),b=f.getBoundingClientRect(),inset=parseFloat(getComputedStyle(f).getPropertyValue('--ui-frame-inset'));return b.right-a.right>=inset+8&&b.bottom-a.bottom>=inset+8})()"),'Settings scrollbar overlaps material frame: '+game+' '+width);
if(game==='transformations'){await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Начать игру')?.click()");await until("!!document.querySelector('.app.game-active')||!!document.querySelector('[aria-label^=\"Разделить игру на \"]')");if(await evaluate("!!document.querySelector('[aria-label^=\"Разделить игру на \"]')"))await evaluate("document.querySelector('[aria-label^=\"Разделить игру на \"] :is(.v-button--secondary,.secondary)').click()");await until("!!document.querySelector(':is(.v-transformation-chamber,.transformation-chamber)')");await sleep(500);await screenshot('audit-transformations-'+width+'-play');assert(await evaluate("(()=>{const e=document.querySelector(':is(.v-transformation-chamber,.transformation-chamber)');if(!e)return false;const r=e.getBoundingClientRect();const t=document.querySelector(':is(.v-transformation-word,.transformation-word)')?.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth+1&&(!t||(t.left>=r.left&&t.right<=r.right))})()"),'Transformation chamber cropped: '+width);}
}}

for(const game of ['memory','sorting','matching','conveyor','transformations']){
 await cmd('Page.navigate',{url:origin+'?game='+game});await until("!!document.querySelector(':is(.v-settings-scroll,.unified-settings-content)')");
 await evaluate("(()=>{const e=[...document.querySelectorAll(':is(.v-settings-scroll,.unified-settings-content) select')].find(e=>[...e.options].some(o=>o.textContent==='Чтение'));if(!e)throw Error('Task select missing');e.value=[...e.options].find(o=>o.textContent==='Чтение').value;e.dispatchEvent(new Event('change',{bubbles:true}))})()");await until("!!document.querySelector(':is(.v-reading-settings,.reading-settings)')");
 for(const label of ['Буквы','Слоги','Слова'])await evaluate("(()=>{const e=[...document.querySelectorAll(':is(.v-reading-settings,.reading-settings) :is(.v-reading-kinds,.reading-kinds) label')].find(e=>e.textContent==='"+label+"')?.querySelector('input');if(!e)throw Error('Missing reading kind');if(!e.checked)e.click()})()");
 assert(await evaluate("[...document.querySelectorAll(':is(.v-reading-settings,.reading-settings) :is(.v-reading-kinds,.reading-kinds)')][0].querySelectorAll('input:checked').length===3"),'Mixed reading unavailable in '+game);
 assert(await evaluate("(()=>{const range=document.querySelector(':is(.v-reading-settings,.reading-settings) :is(.v-range,.range-slider)'),inputs=[...range?.querySelectorAll('input[type=range]')||[]],track=range?.querySelector(':is(.v-range-track,.range-slider-track)');if(!range||!track||inputs.length!==2||document.querySelector('.reading-length-range'))return false;const a=inputs[0].getBoundingClientRect(),b=inputs[1].getBoundingClientRect(),r=track.getBoundingClientRect();return a.width>0&&Math.abs(a.left-b.left)<1&&Math.abs(a.width-b.width)<1&&r.width>100&&inputs.every(e=>e.hasAttribute('aria-valuetext'))})()"),'Word length must use one accessible two-ended track: '+game);
 await screenshot('reading-mixed-'+game);
}

// Required selections change their state immediately after a genuine choice.
for(const [width,height] of [[1440,900],[390,844]]){
 await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
 await cmd('Page.navigate',{url:origin+'?game=matching'});await until("!!document.querySelector(':is(.v-picker-trigger,.category-picker-trigger)')");
 assert(await evaluate("document.querySelector(':is(.v-picker-trigger,.category-picker-trigger)').dataset.fieldState==='required'&&document.querySelector('select[aria-label=\"Задание\"]').getAttribute('aria-invalid')==='true'"),'Missing required state');
 const requiredColor=await evaluate("getComputedStyle(document.querySelector(':is(.v-picker-trigger,.category-picker-trigger) :is(.v-control-well,.control-well)')).backgroundColor");
 await screenshot('required-empty-'+width);
 await evaluate("document.querySelector(':is(.v-picker-trigger,.category-picker-trigger)').click()");await until("document.querySelectorAll(':is(.v-selection-tree,.category-grid)>li').length>0");
 await evaluate("(()=>{const n=[...document.querySelectorAll(':is(.v-selection-tree,.category-grid)>li')].find(e=>e.querySelector('summary')?.textContent.includes('Животный мир'));n.querySelector('details').open=true;n.querySelector('input').click()})()");
 await evaluate("document.querySelector('.category-picker[open] :is(.v-button--primary,.primary)').click()");
 await until("document.querySelector(':is(.v-picker-trigger,.category-picker-trigger)').dataset.fieldState==='ready'&&document.querySelector('select[aria-label=\"Задание\"]').getAttribute('aria-invalid')!=='true'");
 assert(await evaluate("getComputedStyle(document.querySelector(':is(.v-picker-trigger,.category-picker-trigger) :is(.v-control-well,.control-well)')).backgroundColor!=="+JSON.stringify(requiredColor)),'Required color not cleared');
 await screenshot('required-filled-'+width);
 await cmd('Page.navigate',{url:origin+'?game=memory'});await until("!!document.querySelector('select[aria-label=\"Учебная задача\"]')");
 await evaluate("(()=>{const e=document.querySelector('select[aria-label=\"Учебная задача\"]');e.value='automation';e.dispatchEvent(new Event('change',{bubbles:true}))})()");
 await until("!!document.querySelector('.sound-selection>button[data-field-state=required]')");
 await evaluate("document.querySelector('.sound-selection>button').click()");await until("!!document.querySelector(':is(.v-sound-choice,.sound-chip)>button:not(:disabled)')");
 await evaluate("document.querySelector(':is(.v-sound-choice,.sound-chip)>button:not(:disabled)').click()");
 assert(await evaluate("(()=>{const e=document.querySelector(':is(.v-sound-choice,.sound-chip)>button[aria-pressed=true]'),s=getComputedStyle(e);return s.transform==='none'&&s.color!==s.backgroundColor})()"),'Selected sound must stay still with contrasting text');
 await evaluate("document.querySelector(':is(.v-sound-edit,.sound-gear)').click()");await sleep(400);
 assert(await evaluate("(()=>{const d=document.querySelector('.sound-workshop'),f=d.querySelector(':scope>:is(.v-picker-actions,.sound-picker-actions)'),r=f.getBoundingClientRect(),b=d.getBoundingClientRect();return !!f&&r.bottom<=b.bottom&&r.top>=b.top&&f.querySelector(':is(.v-button--primary,.primary)').textContent==='Готово'})()"),'Sound footer must remain separate from scrolling and use a concise action');
 const soundSpacing=await evaluate("(()=>{const editor=document.querySelector('.sound-editor'),labels=[...editor.querySelectorAll(':scope>label:is(.v-choice,.check)')].filter(e=>e.getBoundingClientRect().height>0),gaps=labels.slice(1).map((e,i)=>e.getBoundingClientRect().top-labels[i].getBoundingClientRect().bottom);return {gaps,compact:gaps.every(x=>x>=-1&&x<=12),centered:labels.every(e=>getComputedStyle(e).alignItems==='center'),checkboxMargins:labels.every(e=>{const input=e.querySelector('input');return !!input&&Math.abs(parseFloat(getComputedStyle(input).marginTop))<1})}})()");
 assert(soundSpacing.compact&&soundSpacing.centered&&soundSpacing.checkboxMargins,'Sound editor labels must use shared compact vertically centered rows: '+JSON.stringify(soundSpacing));
 await screenshot('sound-editor-fixed-footer-'+width);
 await evaluate("document.querySelector('.sound-workshop :is(.v-button--primary,.primary)').click()");
 await until("!!document.querySelector('.sound-selection>button[data-field-state=ready]')");
 assert(await evaluate("document.querySelector('.sound-selection>button').getAttribute('aria-invalid')!=='true'&&getComputedStyle(document.querySelector('.sound-selection>button')).borderColor!=='rgb(198, 59, 50)'"),'Sound selection required state did not clear');
}

// Dependent lexical selection and supplementary-rule controls on a real setup screen.
await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await cmd('Page.navigate',{url:origin+'?game=conveyor'});
await until("!!document.querySelector('select[aria-label=\"Учебная задача\"]')");
await evaluate("(()=>{const e=document.querySelector('select[aria-label=\"Учебная задача\"]');e.value='lexical';e.dispatchEvent(new Event('change',{bubbles:true}))})()");
await until("!!document.querySelector(':is(.v-stack,.setup-column) [data-setup-section=material] :is(.v-picker-trigger,.category-picker-trigger)')");
const dependent=await evaluate("(()=>{const m=document.querySelector('[data-setup-section=material]'),a=m.querySelector('select[aria-label=\"Учебная задача\"]').getBoundingClientRect(),b=m.querySelector(':is(.v-picker-trigger,.category-picker-trigger)').getBoundingClientRect();return {below:b.top>=a.bottom-1,adjacent:b.top-a.bottom<=90,label:m.querySelector(':is(.v-picker-trigger,.category-picker-trigger) :is(.v-picker-trigger-copy,.v-disclosure-copy,.setup-action-copy) strong')?.textContent}})()");
assert(dependent.below&&dependent.adjacent&&dependent.label==='Выберите тему','Dependent picker is not immediately below learning task: '+JSON.stringify(dependent));

const detailSpacing=await evaluate("(()=>{const m=document.querySelector('[data-setup-section=material]'),a=m.querySelector(':is(.v-field,.game-choice)').getBoundingClientRect(),b=m.querySelector(':is(.v-picker-trigger,.category-picker-trigger)').getBoundingClientRect(),c=m.querySelector('.advanced-material').getBoundingClientRect();return {before:b.top-a.bottom,after:c.top-b.bottom}})()");
assert(Math.abs(detailSpacing.before-detailSpacing.after)<=2&&detailSpacing.before>=6&&detailSpacing.before<=12,'Material dependent actions must have equal gaps: '+JSON.stringify(detailSpacing));

await evaluate("document.querySelector('.advanced-material').open=true");
await evaluate("document.querySelector('.material-rule-group :is(.v-add-action,.setup-add-rule)').click()");
await until("!!document.querySelector(':is(.v-material-rule,.material-rule)')");
const ruleLayout=await evaluate("(()=>{const r=document.querySelector(':is(.v-material-rule,.material-rule)'),h=r.querySelector(':is(.v-material-rule-heading,.material-rule-heading)'),d=h.querySelector(':is(.v-material-rule-heading button,.rule-delete)'),f=r.querySelector(':is(.v-field,.game-choice)'),a=h.getBoundingClientRect(),b=f.getBoundingClientRect(),c=d.getBoundingClientRect();return {headed:!!h,notOverlapping:a.bottom<=b.top+1,deleteContained:c.left>=a.left&&c.right<=a.right+1,buttonHeight:c.height<=56,addIcon:!!document.querySelector(':is(.v-add-action,.setup-add-rule) :is(.v-control-well,.control-well)')}})()");
assert(Object.values(ruleLayout).every(Boolean),'Nested additional rule layout overlaps: '+JSON.stringify(ruleLayout));
await screenshot('conveyor-dependent-material-rule-editor');
writeFileSync(join(output,'audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{ws?.close();proc.kill('SIGTERM');server.close();await Promise.race([new Promise(r=>proc.once('exit',r)),sleep(1500)]);try{rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100})}catch{}}
