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

const report=[];
for(const [width,height] of [[1440,900],[1024,768],[768,1024],[390,844],[844,390]]){
await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
for(const game of ['memory','sorting','matching','conveyor','transformations']){
await cmd('Page.navigate',{url:origin+'?game='+game});await until("!!document.querySelector('.unified-settings-content')");await evaluate("document.querySelectorAll('.themes button')["+themeIndex+"]?.click()");await sleep(800);
// Regression: an opaque themed backdrop must completely cover the legacy
// game page, including its titles/cards, in every game's settings screen.
const backdrop=await evaluate("(()=>{const e=document.querySelector('.settings-shade:has(.shared-settings-window)'),s=getComputedStyle(e),app=getComputedStyle(document.querySelector('.app[data-theme]')),scene=app.getPropertyValue('--zg-stage-image'),file=scene.match(/assets\\/[^\\\"')]+/),b=e.getBoundingClientRect(),color=s.backgroundColor;return {opaque:/^rgb\\(/.test(color),sceneMatches:!!file&&s.backgroundImage.includes(file[0]),noBlur:s.backdropFilter==='none'&&(!s.webkitBackdropFilter||s.webkitBackdropFilter==='none'),backdropFilter:s.backdropFilter,webkitBackdropFilter:s.webkitBackdropFilter,coversViewport:b.left<=0&&b.top<=0&&b.right>=innerWidth&&b.bottom>=innerHeight,color,backgroundImage:s.backgroundImage}})()");
assert(backdrop.opaque&&backdrop.sceneMatches&&backdrop.noBlur&&backdrop.coversViewport,'Settings background leaks obsolete page content: '+game+' '+selectedTheme+' '+width+' '+JSON.stringify(backdrop));
const setupGeometry=await evaluate("(()=>{const grid=document.querySelector('.setup-columns'),cols=[...grid?.querySelectorAll(':scope>.setup-column')||[]],footer=document.querySelector('.setup-footer'),preview=footer?.querySelector(':scope>.setup-material-preview'),start=[...footer?.children||[]].find(e=>e.matches('button.primary,button.start')),body=document.querySelector('.unified-settings-content');if(!grid||cols.length!==2||!footer||!preview||!start)return {ok:false,reason:'missing shared sections or material preview / start'};const sections=cols.map(c=>[...c.querySelectorAll('[data-setup-section]')].map(e=>e.dataset.setupSection)),rail=document.querySelector('.setup-theme-rail'),themeSections=[...rail?.querySelectorAll('[data-setup-section]')||[]].map(e=>e.dataset.setupSection);const p=preview.getBoundingClientRect(),b=start.getBoundingClientRect(),twoColumns=getComputedStyle(grid).gridTemplateColumns.split(' ').length===2;return {ok:JSON.stringify(sections)===JSON.stringify([['material','rules'],['task']])&&JSON.stringify(themeSections)===JSON.stringify(['appearance']),sections,themeSections,twoColumns,aligned:Math.abs(p.top-b.top)<5,notOverflowing:body.scrollWidth<=body.clientWidth+2,previewWidth:p.width,buttonWidth:b.width}})()");
const expectedColumns=game==='conveyor'?[['material','task'],['rules']]:[['material','rules'],['task']];
const sectionsCorrect=JSON.stringify(setupGeometry.sections)===JSON.stringify(expectedColumns);
assert(game==='conveyor'?(sectionsCorrect&&JSON.stringify(setupGeometry.themeSections)===JSON.stringify(['appearance'])):setupGeometry.ok,'Unified setup sections: '+game+' '+width+' '+JSON.stringify(setupGeometry));
assert(setupGeometry.notOverflowing,'Shared settings horizontally overflow: '+game+' '+width);
const railLayout=await evaluate("(()=>{const workspace=document.querySelector('.setup-workspace'),body=workspace.querySelector('.unified-settings-content'),rail=workspace.querySelector('.setup-theme-rail'),scroll=rail.querySelector('.setup-theme-scroll'),themeButtons=[...scroll.querySelectorAll('.themes button')],toggle=rail.querySelector('.setup-theme-toggle'),w=workspace.getBoundingClientRect(),b=body.getBoundingClientRect(),r=rail.getBoundingClientRect(),wide=innerWidth>=1180&&innerHeight>=560;return {hasThemes:themeButtons.length>=3,railRight:!wide||r.left>=b.right-1,railNarrow:!wide||r.width>=155&&r.width<=230,ownScroll:!wide||getComputedStyle(scroll).overflowY==='auto',vertical:!wide||themeButtons[1].getBoundingClientRect().top>themeButtons[0].getBoundingClientRect().bottom,bodyInside:b.left>=w.left-1&&b.right<=w.right+1,toggleVisible:wide?getComputedStyle(toggle).display==='none':getComputedStyle(toggle).display!=='none'}})()");
assert(Object.values(railLayout).every(Boolean),'Shared theme rail layout failed '+game+' '+width+' '+JSON.stringify(railLayout));

if(width>=1180&&height>=560){
 const gutters=await evaluate("(()=>{const body=document.querySelector('.unified-settings-content'),cols=[...document.querySelectorAll('.setup-columns>.setup-column')],rail=document.querySelector('.setup-theme-rail'),b=body.getBoundingClientRect(),a=cols[0].getBoundingClientRect(),c=cols[1].getBoundingClientRect(),r=rail.getBoundingClientRect(),scrollbar=body.offsetWidth-body.clientWidth;return {left:a.left-b.left,middle:c.left-a.right,right:r.left-c.right-scrollbar,scrollbar}})()");
 assert(Math.abs(gutters.left-gutters.middle)<=2&&Math.abs(gutters.middle-gutters.right)<=2,'Wide layout must use identical gutters on both sides of its two columns: '+game+' '+JSON.stringify(gutters));
}


if(game==='sorting'){
 const appearanceSplit=await evaluate("(()=>({railHasPresentation:!!document.querySelector('.setup-theme-rail .card-presentation'),bodyHasPresentation:!!document.querySelector('.unified-settings-content .setup-presentation-options .card-presentation'),railThemeCount:document.querySelectorAll('.setup-theme-rail .themes button').length}))()");
 assert(!appearanceSplit.railHasPresentation&&appearanceSplit.bodyHasPresentation&&appearanceSplit.railThemeCount>=3,'Non-theme presentation controls leaked into theme rail: '+width+' '+JSON.stringify(appearanceSplit));

 const headings=await evaluate("(()=>{const groups=[...document.querySelectorAll('.sort-group-settings>.settings-block')],presentation=document.querySelector('.setup-presentation-options .card-presentation'),picker=presentation?.querySelector('.game-choice'),label=picker?.querySelector('.field-label');return {singleGroupTitles:groups.length>=2&&groups.every(g=>g.querySelector('.group-title-edit strong')&&!g.querySelector('h3')),oneVisiblePresentationLabel:!!presentation?.querySelector('h3')&&!!label&&getComputedStyle(label).display==='none'}})()");
 assert(headings.singleGroupTitles&&headings.oneVisiblePresentationLabel,'Sorting repeats a group or card-type heading: '+width+' '+JSON.stringify(headings));

}


const actualLayout=await evaluate("(()=>{const frame=document.querySelector('.settings-frame.shared-settings-window'),body=frame.querySelector('.unified-settings-content'),footer=frame.querySelector(':scope>.setup-footer'),button=footer?.querySelector(':scope>button.primary'),material=body.querySelector('[data-setup-section=material]'),choice=material?.querySelector('.game-choice'),b=body.getBoundingClientRect(),f=footer?.getBoundingClientRect(),r=frame.getBoundingClientRect(),c=choice?.getBoundingClientRect(),m=material?.getBoundingClientRect();return {outsideScroll:footer?.parentElement===frame,notOverlapping:!!f&&b.bottom<=f.top+1,visibleStart:!!button&&button.getBoundingClientRect().bottom<=r.bottom+1&&button.getBoundingClientRect().top>=0,opaqueFooter:getComputedStyle(footer).backgroundColor!=='rgba(0, 0, 0, 0)',fullWidthChoice:!choice||c.width>=m.width*.85,buttonName:button?.textContent,bodyClientHeight:body.clientHeight,footerHeight:f?.height,footerBottom:f?.bottom,frameBottom:r.bottom}})()");
assert(actualLayout.outsideScroll&&actualLayout.notOverlapping&&actualLayout.visibleStart&&actualLayout.opaqueFooter&&actualLayout.fullWidthChoice,'Shared footer/select geometry failed '+game+' '+width+' '+JSON.stringify(actualLayout));

const spacing=await evaluate("(()=>{const root=document.querySelector('.settings-frame.shared-settings-window'),cols=[...root.querySelectorAll('.setup-column')],fieldGroups=[...root.querySelectorAll('.setup-column>section.settings-block,.setup-section-fieldset>section.settings-block,.setup-material-fields,.setup-dependent-field')],gaps=fieldGroups.flatMap(group=>{if(getComputedStyle(group).display!=='flex')return [{bad:'not-flex',selector:group.className}];const visible=[...group.children].filter(e=>{const r=e.getBoundingClientRect();return r.height>0&&getComputedStyle(e).display!=='none'});return visible.slice(1).map((e,i)=>({value:Math.round((e.getBoundingClientRect().top-visible[i].getBoundingClientRect().bottom)*10)/10,selector:group.className})).filter(x=>x.value<5||x.value>12)}),sectionGaps=cols.flatMap(col=>{const blocks=[...col.children].filter(e=>e.getBoundingClientRect().height>0);return blocks.slice(1).map((e,i)=>Math.round((e.getBoundingClientRect().top-blocks[i].getBoundingClientRect().bottom)*10)/10).filter(n=>n<9||n>15)}),stepper=[...root.querySelectorAll('.quantity-stepper')].map(x=>{const buttons=[...x.querySelectorAll('button')],input=x.querySelector('input[type=number]');return {height:x.getBoundingClientRect().height,buttonWidth:buttons[0]?.getBoundingClientRect().width,countWidth:input?.getBoundingClientRect().width}}),preview=root.querySelector('.setup-preview'),p=preview.querySelector('.setup-preview-meta').getBoundingClientRect(),c=preview.querySelector('.setup-preview-content').getBoundingClientRect(),footer=root.querySelector(':scope>.setup-footer').getBoundingClientRect(),icons=[...preview.querySelectorAll('.setup-preview-actions .icon-button')].map(e=>e.getBoundingClientRect());return {fieldGaps:gaps,sectionGaps,steppersOk:stepper.every(x=>x.height<=34&&x.buttonWidth<=30&&x.countWidth<=39),previewGap:c.left-p.right,previewGapOk:c.left-p.right>=3&&c.left-p.right<=20,iconsContained:icons.every(x=>x.bottom<=footer.bottom-3)}})()");
assert(!spacing.fieldGaps.length&&!spacing.sectionGaps.length&&spacing.steppersOk&&spacing.previewGapOk&&spacing.iconsContained,'Shared spacing/stepper/preview geometry: '+game+' '+width+' '+JSON.stringify(spacing));
if(game==='conveyor'){
 const captionPosition=await evaluate("(()=>{const task=document.querySelector('[data-setup-section=task]'),mode=task?.querySelector('.setup-dependent-field .game-choice'),caption=task?.querySelector('.setup-dependent-field label.check'),count=task?.querySelector('.quantity-slider');if(!mode||!caption||!count)return {ok:false};const a=mode.getBoundingClientRect(),b=caption.getBoundingClientRect(),c=count.getBoundingClientRect();return {ok:b.top>=a.bottom&&b.bottom<=c.top,modeToCaption:b.top-a.bottom,captionToCounter:c.top-b.bottom,labelHidden:getComputedStyle(mode.querySelector('.field-label')).display==='none'}})()");
 assert(captionPosition.ok&&captionPosition.modeToCaption>=5&&captionPosition.modeToCaption<=12&&captionPosition.captionToCounter>=5&&captionPosition.captionToCounter<=12&&captionPosition.labelHidden,'Conveyor caption toggle must follow card type with equal gaps: '+width+' '+JSON.stringify(captionPosition));
}
const previewLayout=await evaluate("(()=>{const footer=document.querySelector('.settings-frame.shared-settings-window>.setup-footer'),preview=footer.querySelector(':scope>.setup-preview'),meta=preview?.querySelector('.setup-preview-meta'),title=meta?.querySelector('h2'),actions=meta?.querySelector('.setup-preview-actions'),content=preview?.querySelector('.setup-preview-content'),icons=[...actions?.querySelectorAll('.icon-button')||[]],h=title?.getBoundingClientRect(),a=actions?.getBoundingClientRect(),c=content?.getBoundingClientRect(),p=preview?.getBoundingClientRect(),lineHeight=parseFloat(getComputedStyle(content).lineHeight)||16;return {exists:!!preview&&!!title&&!!actions&&!!content,title:title?.textContent==='В этой игре',controlsBelow:!!a&&a.top>=h.bottom-1,wordsOnRight:!!c&&c.left>=h.right-2,twoLines:!!c&&c.height<=lineHeight*2.8,iconsEqual:icons.length<2||icons.every(e=>Math.abs(e.getBoundingClientRect().height-icons[0].getBoundingClientRect().height)<1),statusInside:!footer.querySelector(':scope>p[role=status]')&&[...footer.querySelectorAll('[role=status]')].every(e=>!!e.closest('.setup-preview-content')),contained:!!p&&p.width>0&&p.height<=70}})()");
assert(Object.values(previewLayout).every(Boolean),'Shared preview layout failed '+game+' '+width+' '+JSON.stringify(previewLayout));

const previewPolish=await evaluate("(()=>{const footer=document.querySelector('.setup-footer'),preview=footer.querySelector('.setup-preview'),well=preview.querySelector('.setup-preview-content'),fit=well.querySelector('.setup-preview-fit'),start=footer.querySelector(':scope>button.primary'),r=preview.getBoundingClientRect(),w=well.getBoundingClientRect(),b=start.getBoundingClientRect(),style=getComputedStyle(well),font=parseFloat(getComputedStyle(fit).fontSize),sliders=[...document.querySelectorAll('.quantity-slider')],clearances=sliders.map(s=>s.getBoundingClientRect().bottom-s.querySelector(':scope>input[type=range]').getBoundingClientRect().bottom);return {wordWell:!!fit&&w.height>=48&&w.width>70,framed:style.borderTopStyle==='solid'&&style.backgroundColor!=='rgba(0, 0, 0, 0)',fontWithinRange:font>=12&&font<=18,launchCentered:Math.abs(b.top+b.height/2-(r.top+r.height/2))<=4,centerDelta:(b.top+b.height/2)-(r.top+r.height/2),previewTop:r.top,previewHeight:r.height,buttonTop:b.top,buttonHeight:b.height,footerHeight:footer.getBoundingClientRect().height,buttonAlign:getComputedStyle(start).alignSelf,slidersPadded:clearances.every(v=>v>=12)}})()");
assert(previewPolish.wordWell&&previewPolish.framed&&previewPolish.fontWithinRange&&previewPolish.launchCentered&&previewPolish.slidersPadded,'Preview well, adaptive text, slider clearance or start alignment: '+game+' '+width+' '+JSON.stringify(previewPolish));
if(game==='sorting'){
 assert(await evaluate("!!document.querySelector('[data-setup-section=rules] .setup-add-rule .control-well')"),'Sorting exclusion action must use shared plus-icon control');
}


if(width===844&&height===390)assert(actualLayout.bodyClientHeight>=120&&actualLayout.footerHeight<=105,'Landscape footer hides the learning settings: '+game+' '+JSON.stringify(actualLayout));
assert(actualLayout.footerHeight<=84,'Shared footer too tall: '+game+' '+width+' '+JSON.stringify(actualLayout));
if(width>=900)assert(setupGeometry.twoColumns&&setupGeometry.aligned,'Preview and Start must share one footer row: '+game+' '+width+' '+JSON.stringify(setupGeometry));
await screenshot('unified-setup-'+game+'-'+width);
if(game==='matching'){
 for(const value of ['word-word','word-image','image-word','image-image']){
 await evaluate("(()=>{const e=document.querySelector('select[aria-label=\"Режим карточек\"]');e.value='"+value+"';e.dispatchEvent(new Event('change',{bubbles:true}))})()");
 assert(await evaluate("!![...document.querySelectorAll('label')].find(e=>e.textContent==='Подписи к исходным картинкам')") === (value==='image-image'),'Caption visibility: '+value);
 }
}
assert(await evaluate("[...document.querySelectorAll('.settings select')].every(e=>e.closest('.select-control'))"),'Unstyled native select');
assert(await evaluate("!document.querySelector('.setup-card-preview,.setup-preview-card')"),'Picture preview still present');
assert(await evaluate("(()=>{const nodes=[...document.querySelectorAll('.select-control,.category-picker-trigger,.settings-disclosure>summary')];return nodes.every(e=>{const w=e.querySelector(':scope>.control-well'),r=e.getBoundingClientRect();if(!w||r.width===0)return true;return Math.abs(r.right-w.getBoundingClientRect().right-8)<1})})()"),'Action well inset mismatch '+game+' '+width);
await screenshot('audit-'+game+'-'+width+'-top');
if(game==='matching'){
 assert(await evaluate("(()=>{const es=[...document.querySelectorAll('.settings-disclosure')];return es.length>=2&&es.every(e=>{e.querySelector('summary').click();const opened=e.open;e.querySelector('summary').click();return opened&&!e.open})})()"),'Disclosure interaction failed');
 await evaluate("document.querySelectorAll('.settings-disclosure').forEach(e=>e.open=true)");
 await screenshot('expanded-settings-'+width);
 assert(await evaluate("(()=>{const e=document.querySelector('.unified-settings-content');return e.scrollWidth<=e.clientWidth+2})()"),'Expanded settings overflow');
 await evaluate("document.querySelectorAll('.settings-disclosure').forEach(e=>e.open=false)");
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
 const beforeCount=await evaluate("+document.querySelector('.quantity-slider input[type=number]').value");
 await evaluate("document.querySelectorAll('.quantity-slider button')[1].click()");
 await until("+document.querySelector('.quantity-slider input[type=number]').value==="+(beforeCount+1));
 await evaluate("document.querySelectorAll('.quantity-slider button')[0].click()");
 await until("+document.querySelector('.quantity-slider input[type=number]').value==="+beforeCount);
 assert(await evaluate("[...document.querySelectorAll('.quantity-slider')].every(slider=>slider.querySelectorAll('input[type=number]').length===1&&!slider.querySelector('output'))"),'Quantity display duplicated within a slider');
 await evaluate("document.querySelector('.unified-settings-content').scrollTop=100000");await screenshot('ready-material-'+width);await evaluate("document.querySelector('.unified-settings-content').scrollTop=0");
 assert(await evaluate("(()=>{const e=document.querySelector('input[role=switch]');if(!e)return false;const before=e.checked;e.click();const changed=e.checked!==before;e.click();return changed&&e.checked===before})()"),'Caption switch failed');
 await evaluate("(()=>{const e=[...document.querySelectorAll('select')].find(e=>[...e.options].some(o=>o.value==='lexical'));if(e){e.value='lexical';e.dispatchEvent(new Event('change',{bubbles:true}))}})()");await sleep(200);
 await evaluate("document.querySelector('.category-picker-trigger')?.click()");
 if(await evaluate("!!document.querySelector('.category-picker[open]')")){
 await evaluate("document.querySelectorAll('.category-picker details').forEach(e=>e.open=true)");
 assert(await evaluate("[...document.querySelectorAll('.category-grid summary')].every(e=>e.querySelector('.control-well')&&getComputedStyle(e).userSelect==='none')"),'Category rows must share arrows and prevent accidental text selection');
 const pickerLayout=await evaluate("(()=>{const d=document.querySelector('dialog.category-picker[open]'),scroll=d.querySelector(':scope>.panel-scroll'),footer=d.querySelector(':scope>.sound-picker-actions'),grid=d.querySelector('.category-grid'),opened=[...grid.querySelectorAll(':scope>li.category-branch:has(>details[open])')],buttons=[...footer?.querySelectorAll('button')||[]],sr=scroll.getBoundingClientRect(),fr=footer?.getBoundingClientRect(),gr=grid.getBoundingClientRect();return {separate:!!footer&&footer.parentElement===d,nonOverlapping:!!fr&&sr.bottom<=fr.top+2,expanded:opened.length>0&&opened.every(e=>e.getBoundingClientRect().width>=gr.width*.90),equalButtons:buttons.length===2&&Math.abs(buttons[0].getBoundingClientRect().height-buttons[1].getBoundingClientRect().height)<1&&getComputedStyle(buttons[0]).borderRadius===getComputedStyle(buttons[1]).borderRadius,distinctColors:buttons.length===2&&getComputedStyle(buttons[0]).backgroundColor!==getComputedStyle(buttons[1]).backgroundColor}})()");
 assert(Object.values(pickerLayout).every(Boolean),'Category picker responsive tree/footer geometry: '+width+' '+JSON.stringify(pickerLayout));
 await screenshot('categories-'+width);
 await evaluate("document.querySelector('.category-picker[open]>.panel-scroll').scrollTop=100000");
 assert(await evaluate("(()=>{const d=document.querySelector('.category-picker[open]'),s=d.querySelector('.panel-scroll'),a=s.getBoundingClientRect(),b=d.getBoundingClientRect(),inset=parseFloat(getComputedStyle(d).getPropertyValue('--ui-frame-inset'));return d.scrollTop===0&&s.scrollTop>0&&b.right-a.right>=inset+8&&b.bottom-a.bottom>=inset+8})()"),'Dialog scrollbar overlaps frame');
 await screenshot('categories-'+width+'-bottom');
 assert(await evaluate("document.querySelector('.category-picker').scrollWidth<=document.querySelector('.category-picker').clientWidth+2"),'Category overflow');
 await evaluate("document.querySelector('.category-picker').close()");
 }
}
report.push(await evaluate("(()=>{const e=document.querySelector('.unified-settings-content'),r=e.getBoundingClientRect();return {game:'"+game+"',width:innerWidth,height:innerHeight,scroll:e.scrollHeight,client:e.clientHeight,bottom:r.bottom,overflow:e.scrollWidth>e.clientWidth+2,buttons:[...document.querySelectorAll('.setup-footer button')].filter(b=>b.textContent.startsWith('Начать')).map(b=>({text:b.textContent,disabled:b.disabled}))}})()"));
await evaluate("document.querySelector('.unified-settings-content').scrollTop=100000");await screenshot('audit-'+game+'-'+width+'-bottom');
assert(await evaluate("(()=>{const frame=document.querySelector('.settings-frame.shared-settings-window'),footer=frame.querySelector(':scope>.setup-footer'),r=footer.getBoundingClientRect(),f=frame.getBoundingClientRect();return r.bottom<=f.bottom+1&&r.top>=f.top&&footer.querySelector(':scope>button.primary').getBoundingClientRect().bottom<=f.bottom+1})()"),'Footer must stay visible after settings scroll: '+game+' '+width);
assert(await evaluate("(()=>{const e=document.querySelector('.unified-settings-content'),f=document.querySelector('.settings-frame'),a=e.getBoundingClientRect(),b=f.getBoundingClientRect();return a.bottom<=b.bottom-8&&a.right<=b.right&&e.scrollWidth<=e.clientWidth+2})()"),'Settings exceed frame: '+game+' '+width);
assert(await evaluate("(()=>{const e=document.querySelector('.unified-settings-content'),f=document.querySelector('.settings-frame'),a=e.getBoundingClientRect(),b=f.getBoundingClientRect(),inset=parseFloat(getComputedStyle(f).getPropertyValue('--ui-frame-inset'));return b.right-a.right>=inset+8&&b.bottom-a.bottom>=inset+8})()"),'Settings scrollbar overlaps material frame: '+game+' '+width);
if(game==='transformations'){await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Начать игру')?.click()");await sleep(500);await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Оставить как есть')?.click()");await until("!!document.querySelector('.transformation-chamber')");await screenshot('audit-transformations-'+width+'-play');assert(await evaluate("(()=>{const e=document.querySelector('.transformation-chamber');if(!e)return false;const r=e.getBoundingClientRect();const t=document.querySelector('.transformation-word')?.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth+1&&(!t||(t.left>=r.left&&t.right<=r.right))})()"),'Transformation chamber cropped: '+width);}
}}

for(const game of ['memory','sorting','matching','conveyor','transformations']){
 await cmd('Page.navigate',{url:origin+'?game='+game});await until("!!document.querySelector('.unified-settings-content')");
 await evaluate("(()=>{const e=[...document.querySelectorAll('.unified-settings-content select')].find(e=>[...e.options].some(o=>o.textContent==='Чтение'));if(!e)throw Error('Task select missing');e.value=[...e.options].find(o=>o.textContent==='Чтение').value;e.dispatchEvent(new Event('change',{bubbles:true}))})()");await until("!!document.querySelector('.reading-settings')");
 for(const label of ['Буквы','Слоги','Слова'])await evaluate("(()=>{const e=[...document.querySelectorAll('.reading-settings .reading-kinds label')].find(e=>e.textContent==='"+label+"')?.querySelector('input');if(!e)throw Error('Missing reading kind');if(!e.checked)e.click()})()");
 assert(await evaluate("[...document.querySelectorAll('.reading-settings .reading-kinds')][0].querySelectorAll('input:checked').length===3"),'Mixed reading unavailable in '+game);
 assert(await evaluate("(()=>{const range=document.querySelector('.reading-settings .range-slider'),inputs=[...range?.querySelectorAll('input[type=range]')||[]],track=range?.querySelector('.range-slider-track');if(!range||!track||inputs.length!==2||document.querySelector('.reading-length-range'))return false;const a=inputs[0].getBoundingClientRect(),b=inputs[1].getBoundingClientRect(),r=track.getBoundingClientRect();return a.width>0&&Math.abs(a.left-b.left)<1&&Math.abs(a.width-b.width)<1&&r.width>100&&inputs.every(e=>e.hasAttribute('aria-valuetext'))})()"),'Word length must use one accessible two-ended track: '+game);
 await screenshot('reading-mixed-'+game);
}

// Required selections change their state immediately after a genuine choice.
for(const [width,height] of [[1440,900],[390,844]]){
 await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
 await cmd('Page.navigate',{url:origin+'?game=matching'});await until("!!document.querySelector('.category-picker-trigger')");
 assert(await evaluate("document.querySelector('.category-picker-trigger').dataset.fieldState==='required'&&document.querySelector('select[aria-label=\"Задание\"]').getAttribute('aria-invalid')==='true'"),'Missing required state');
 const requiredColor=await evaluate("getComputedStyle(document.querySelector('.category-picker-trigger .control-well')).backgroundColor");
 await screenshot('required-empty-'+width);
 await evaluate("document.querySelector('.category-picker-trigger').click()");await until("document.querySelectorAll('.category-grid>li').length>0");
 await evaluate("(()=>{const n=[...document.querySelectorAll('.category-grid>li')].find(e=>e.querySelector('summary')?.textContent.includes('Животный мир'));n.querySelector('details').open=true;n.querySelector('input').click()})()");
 await evaluate("document.querySelector('.category-picker[open] .primary').click()");
 await until("document.querySelector('.category-picker-trigger').dataset.fieldState==='ready'&&document.querySelector('select[aria-label=\"Задание\"]').getAttribute('aria-invalid')!=='true'");
 assert(await evaluate("getComputedStyle(document.querySelector('.category-picker-trigger .control-well')).backgroundColor!=="+JSON.stringify(requiredColor)),'Required color not cleared');
 await screenshot('required-filled-'+width);
 await cmd('Page.navigate',{url:origin+'?game=memory'});await until("!!document.querySelector('select[aria-label=\"Учебная задача\"]')");
 await evaluate("(()=>{const e=document.querySelector('select[aria-label=\"Учебная задача\"]');e.value='automation';e.dispatchEvent(new Event('change',{bubbles:true}))})()");
 await until("!!document.querySelector('.sound-selection>button[data-field-state=required]')");
 await evaluate("document.querySelector('.sound-selection>button').click()");await until("!!document.querySelector('.sound-chip>button:not(:disabled)')");
 await evaluate("document.querySelector('.sound-chip>button:not(:disabled)').click()");
 assert(await evaluate("(()=>{const e=document.querySelector('.sound-chip>button[aria-pressed=true]'),s=getComputedStyle(e);return s.transform==='none'&&s.color!==s.backgroundColor})()"),'Selected sound must stay still with contrasting text');
 await evaluate("document.querySelector('.sound-gear').click()");await sleep(400);
 assert(await evaluate("(()=>{const d=document.querySelector('.sound-workshop'),f=d.querySelector(':scope>.sound-picker-actions'),r=f.getBoundingClientRect(),b=d.getBoundingClientRect();return !!f&&r.bottom<=b.bottom&&r.top>=b.top&&f.querySelector('.primary').textContent==='Готово'})()"),'Sound footer must remain separate from scrolling and use a concise action');
 const soundSpacing=await evaluate("(()=>{const editor=document.querySelector('.sound-editor'),labels=[...editor.querySelectorAll(':scope>label.check')].filter(e=>e.getBoundingClientRect().height>0),gaps=labels.slice(1).map((e,i)=>e.getBoundingClientRect().top-labels[i].getBoundingClientRect().bottom);return {gaps,compact:gaps.every(x=>x>=-1&&x<=12),centered:labels.every(e=>getComputedStyle(e).alignItems==='center'),checkboxMargins:labels.every(e=>{const input=e.querySelector('input');return !!input&&Math.abs(parseFloat(getComputedStyle(input).marginTop))<1})}})()");
 assert(soundSpacing.compact&&soundSpacing.centered&&soundSpacing.checkboxMargins,'Sound editor labels must use shared compact vertically centered rows: '+JSON.stringify(soundSpacing));
 await screenshot('sound-editor-fixed-footer-'+width);
 await evaluate("document.querySelector('.sound-workshop .primary').click()");
 await until("!!document.querySelector('.sound-selection>button[data-field-state=ready]')");
 assert(await evaluate("document.querySelector('.sound-selection>button').getAttribute('aria-invalid')!=='true'&&getComputedStyle(document.querySelector('.sound-selection>button')).borderColor!=='rgb(198, 59, 50)'"),'Sound selection required state did not clear');
}

// Dependent lexical selection and supplementary-rule controls on a real setup screen.
await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await cmd('Page.navigate',{url:origin+'?game=conveyor'});
await until("!!document.querySelector('select[aria-label=\"Учебная задача\"]')");
await evaluate("(()=>{const e=document.querySelector('select[aria-label=\"Учебная задача\"]');e.value='lexical';e.dispatchEvent(new Event('change',{bubbles:true}))})()");
await until("!!document.querySelector('.setup-column [data-setup-section=material] .category-picker-trigger')");
const dependent=await evaluate("(()=>{const m=document.querySelector('[data-setup-section=material]'),a=m.querySelector('select[aria-label=\"Учебная задача\"]').getBoundingClientRect(),b=m.querySelector('.category-picker-trigger').getBoundingClientRect();return {below:b.top>=a.bottom-1,adjacent:b.top-a.bottom<=90,label:m.querySelector('.category-picker-trigger .setup-action-copy strong')?.textContent}})()");
assert(dependent.below&&dependent.adjacent&&dependent.label==='Выберите тему','Dependent picker is not immediately below learning task: '+JSON.stringify(dependent));

const detailSpacing=await evaluate("(()=>{const m=document.querySelector('[data-setup-section=material]'),a=m.querySelector('.game-choice').getBoundingClientRect(),b=m.querySelector('.category-picker-trigger').getBoundingClientRect(),c=m.querySelector('.advanced-material').getBoundingClientRect();return {before:b.top-a.bottom,after:c.top-b.bottom}})()");
assert(Math.abs(detailSpacing.before-detailSpacing.after)<=2&&detailSpacing.before>=6&&detailSpacing.before<=12,'Material dependent actions must have equal gaps: '+JSON.stringify(detailSpacing));

await evaluate("document.querySelector('.advanced-material').open=true");
await evaluate("document.querySelector('.material-rule-group .setup-add-rule').click()");
await until("!!document.querySelector('.material-rule')");
const ruleLayout=await evaluate("(()=>{const r=document.querySelector('.material-rule'),h=r.querySelector('.material-rule-heading'),d=h.querySelector('.rule-delete'),f=r.querySelector('.game-choice'),a=h.getBoundingClientRect(),b=f.getBoundingClientRect(),c=d.getBoundingClientRect();return {headed:!!h,notOverlapping:a.bottom<=b.top+1,deleteContained:c.left>=a.left&&c.right<=a.right+1,buttonHeight:c.height<=56,addIcon:!!document.querySelector('.setup-add-rule .control-well')}})()");
assert(Object.values(ruleLayout).every(Boolean),'Nested additional rule layout overlaps: '+JSON.stringify(ruleLayout));
await screenshot('conveyor-dependent-material-rule-editor');
writeFileSync(join(output,'audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{ws?.close();proc.kill('SIGTERM');server.close();await Promise.race([new Promise(r=>proc.once('exit',r)),sleep(1500)]);try{rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100})}catch{}}
