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
const proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-proxy-server','--proxy-bypass-list=<-loopback>','--no-default-browser-check','--remote-allow-origins=*',`--user-data-dir=${profile}`,'--remote-debugging-port=0','--window-size=1440,900','about:blank'],{stdio:['ignore','pipe','pipe']});
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
  async function scenario(theme,width,height){
    await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
    const navigation=await cmd('Page.navigate',{url:origin});if(navigation.errorText)throw Error('Browser navigation: '+navigation.errorText);
    await until(`!!document.querySelector('.app')`);
    await evaluate(`localStorage.setItem('zabavograd.preferences',JSON.stringify({pairs:7,theme:'${theme}',preview:false}))`);
    await cmd('Page.reload',{ignoreCache:true});
    await until(`!!document.querySelector('.app.${theme}')`);
    await until(`!!document.querySelector('.settings .start:not(:disabled)')`,32000);
    await evaluate(`document.querySelector('.settings .start:not(:disabled)').click()`);
    await until(`!!document.querySelector('.app.game-active .cards .card')`);
    await sleep(6800);
    const r=await evaluate(`(()=>{
      const el=s=>document.querySelector(s);
      const rect=s=>{let e=el(s);if(!e)return null;let r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};
      const app=el('.app'),stage=el('.stage'),card=el('.card .card-back'),toolbar=el('.play-toolbar'),btn=el('.icon-button');
      return {theme:'${theme}',viewport:[innerWidth,innerHeight],htmlScroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],app:rect('.app'),stage:rect('.stage'),toolbar:rect('.play-toolbar'),cards:el('.cards')?.children.length,cardBackground:card?getComputedStyle(card).backgroundImage:'',stageBackground:getComputedStyle(stage).backgroundImage,pan:getComputedStyle(el('.zg-scene-camera'),'::before').animationName,panImage:getComputedStyle(el('.zg-scene-camera'),'::before').backgroundImage,toolbarSkin:getComputedStyle(toolbar).borderImageSource,toolbarBackground:getComputedStyle(toolbar).backgroundImage,homeHref:el('.zg-home')?.getAttribute('href'),captionButton:!!el('.zg-caption-toggle'),spriteCount:document.querySelectorAll('.zg-scene-sprite').length,columns:Number(el('.cards')?.style.getPropertyValue('--columns')),cardBounds:[...el('.cards').children].map(c=>{const x=c.getBoundingClientRect();return {left:x.left,right:x.right,top:x.top,bottom:x.bottom}}),btnSkin:getComputedStyle(btn).borderImageSource,iconMask:getComputedStyle(btn?.querySelector('.garden-icon')).maskImage};
    })()`);
    assert.equal(r.theme,theme);
    assert.equal(r.cards,14);
    assert(r.cardBounds.every(b=>b.left>=r.stage.x-2&&b.right<=r.stage.right+2&&b.top>=r.stage.y-2&&b.bottom<=r.stage.bottom+2),'Card overflow: '+JSON.stringify(r));
    if(width>=1100&&r.cards===14)assert.equal(r.columns,7,'Wide memory board should use seven columns');
    assert(r.toolbar.width>=width-3,JSON.stringify(r));
    assert(r.stage.bottom>=height-3&&r.stage.bottom<=height+3,JSON.stringify(r));
    assert(r.htmlScroll[0]<=width+3,JSON.stringify(r));
    assert(r.htmlScroll[1]<=height+3,JSON.stringify(r));
    if(theme==='forest'){
      assert(r.toolbarBackground.includes('assets/themes/forest/header.webp'),JSON.stringify(r));
      assert.equal(r.spriteCount,8,JSON.stringify(r));
    }else assert(r.toolbarBackground.includes('linear-gradient'),JSON.stringify(r));
    assert(r.btnSkin.includes('theme-ui/buttons/square'),JSON.stringify(r));
    assert(r.homeHref?.endsWith('/home.html')&&r.captionButton,'Home/caption controls missing: '+JSON.stringify(r));
    assert(r.iconMask.includes('icons-new'),JSON.stringify(r));
    if(theme==='neutral'){
      assert(r.cardBackground.includes('approved-back.webp'),JSON.stringify(r));
      assert.equal(r.pan,'zg-background-drift',JSON.stringify(r));
      assert(r.panImage.includes('approved-paper-4k.webp'),JSON.stringify(r));
    }else if(theme==='space'){
      assert(r.panImage.includes('assets/space/background.webp'),JSON.stringify(r));
      assert(r.cardBackground.includes('assets/space/card-back-v2.webp'),JSON.stringify(r));
    }else{
      assert(r.panImage.includes('assets/themes/forest/forest_background.webp'),JSON.stringify(r));
      assert(r.cardBackground.includes('assets/themes/forest/back.webp'),JSON.stringify(r));
    }
    await screenshot(`${theme}-${width}x${height}`);
    if(width>=1100){
      // Check the *front* surface and the word illustration, not only card backs.
      await evaluate("document.querySelector('.app.game-active .card:not(:disabled)')?.click()");
      await until("!!document.querySelector('.app.game-active .card.flipped')");
      await sleep(750);
      const front=await evaluate(`(()=>{
        const card=document.querySelector('.app.game-active .card.flipped');
        const face=card?.querySelector('.card-front');
        return {skin:face?getComputedStyle(face).backgroundImage:'',picture:!!face?.querySelector('.picture-face img, .picture-face svg')};
      })()`);
      assert(front.skin.includes(theme==='forest'?'assets/themes/forest/front.webp':theme==='neutral'?'assets/neutral/approved-front.webp':'assets/space/card-front-v2.webp'),JSON.stringify(front));
      assert(front.picture,'Face-up card must show a library illustration');
      await screenshot(`${theme}-open-${width}x${height}`);
    }
    return r;
  }
  async function sortingScenario(theme,width,height){
    await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
    const nav=await cmd('Page.navigate',{url:origin+'?game=sorting'});
    if(nav.errorText)throw Error('Sort navigation: '+nav.errorText);
    await until("!!document.querySelector('.sort-settings')");
    // Simulate selecting a theme in the shared preferences before switching games.
    await evaluate("localStorage.setItem('zabavograd.preferences',JSON.stringify({...JSON.parse(localStorage.getItem('zabavograd.preferences')||'{}'),theme:"+JSON.stringify(theme)+"}))");
    await cmd('Page.reload',{ignoreCache:true});
    await until("!!document.querySelector('.sort-settings')");
    await until("!!document.querySelector('.app[data-theme="+JSON.stringify(theme)+"]')");
    // Sorting deliberately requires two DIFFERENT material groups. Configure
    // them through actual React select/checkbox handlers (not internal state).
    await until("document.querySelectorAll('.sort-group-settings>.settings-block').length===2");
    await evaluate(`(()=>{
      const group=document.querySelector('.sort-group-settings>.settings-block');
      const sel=group.querySelector('select[aria-label="Учебная задача"]');
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(sel,'lexical');
      sel.dispatchEvent(new Event('change',{bubbles:true}));
    })()`);
    await until("document.querySelectorAll('.sort-group-settings>.settings-block .category-picker').length===2");
    const pickCategory=async(groupIndex,name)=>{
      const chosen=await evaluate(`(()=>{
        const group=document.querySelectorAll('.sort-group-settings>.settings-block')[${groupIndex}];
        const roots=[...group.querySelectorAll('.category-picker>ul>li')];
        const item=roots.find(el=>el.querySelector(':scope>details>summary')?.textContent.startsWith(${JSON.stringify(name)}));
        if(!item)return false;
        const input=item.querySelector(':scope>details>label.check>input[type=checkbox]');
        if(!input)return false;
        input.click();
        return true;
      })()`);
      assert(chosen,'Missing category root '+name+' for group '+groupIndex);
      await sleep(250);
    };
    await pickCategory(0,'Животный мир');
    await pickCategory(1,'Животный мир'); // undo inherited category in group 2
    await pickCategory(1,'Растительный мир');
    const summary=await evaluate("document.querySelector('.sort-settings>[role=status]')?.textContent||document.querySelector('.sort-settings>p[role=status]')?.textContent");
    await until("!!document.querySelector('.sort-settings>.primary:not(:disabled)')",15000).catch(e=>{throw Error('Sorting default material configuration invalid: '+summary+'; '+e.message)});
    await evaluate("document.querySelector('.sort-settings>.primary:not(:disabled)').click()");
    await until("!!document.querySelector('.app.game-active .sorting-stage .sorting-tray .sort-card')");
    await sleep(800);
    const r=await evaluate(`(()=>{
      const el=s=>document.querySelector(s);
      const rect=x=>{const b=x.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height}};
      const stage=el('.sorting-stage'),toolbar=el('.play-toolbar'),app=el('.app'),cards=[...document.querySelectorAll('.sorting-tray .sort-card')];
      return {theme:app.dataset.theme,viewport:[innerWidth,innerHeight],htmlScroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
        stage:rect(stage),toolbar:rect(toolbar),bins:document.querySelectorAll('.sort-bin').length,cardCount:cards.length,
        cardRects:cards.map(rect),sortSkin:getComputedStyle(cards[0]).backgroundColor,binSkin:getComputedStyle(el('.sort-bin')).backgroundColor,
        toolbarSkin:getComputedStyle(toolbar).borderImageSource,toolbarBackground:getComputedStyle(toolbar).backgroundImage,
        homeHref:el('.zg-home')?.getAttribute('href'),captionButton:!!el('.zg-caption-toggle'),
        image:!!cards[0].querySelector('img, svg')};
    })()`);
    assert.equal(r.theme,theme);
    assert(r.bins>=2&&r.cardCount>=1,'Sorting board did not render: '+JSON.stringify(r));
    assert(r.image,'Sorting must use shared CardArtwork');
    assert(r.cardRects.every(b=>b.left>=r.stage.left-2&&b.right<=r.stage.right+2),'Sort card horizontal overflow: '+JSON.stringify(r));
    assert(r.htmlScroll[0]<=width+3,'Sorting horizontal viewport overflow: '+JSON.stringify(r));
    assert(r.toolbar.width>=width-3,'Sorting toolbar is clipped: '+JSON.stringify(r));
    assert(r.stage.bottom>=height-3&&r.stage.bottom<=height+3,'Sorting stage does not fill viewport: '+JSON.stringify(r));
    assert(theme==='forest'?r.toolbarBackground.includes('assets/themes/forest/header.webp'):r.toolbarBackground.includes('linear-gradient'),'Sorting must use shared toolbar');
    const groupOpacity=await evaluate("getComputedStyle(document.querySelector('.bin-target:disabled')).opacity");
    if(groupOpacity)assert.equal(Number(groupOpacity),1,'Disabled sorting group labels must remain fully opaque');
    assert(r.homeHref?.endsWith('/home.html')&&r.captionButton,'Sorting home/caption controls missing');
    await screenshot('sorting-'+theme+'-'+width+'x'+height);
    if(theme==='forest'&&width>=1100){
      await evaluate("document.querySelector('.zg-caption-toggle').click()");
      await until("!!document.querySelector('.sort-card.has-caption small')");
      assert(await evaluate("document.querySelector('.zg-caption-toggle').getAttribute('aria-pressed')")==='true');
    }
    return r;
  }
  async function winnerAndFeedback(){
    await cmd('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
    await cmd('Page.navigate',{url:origin});
    await until("!!document.querySelector('.app')");
    await evaluate("localStorage.setItem('zabavograd.preferences',JSON.stringify({pairs:3,theme:'forest',preview:false}))");
    await cmd('Page.reload',{ignoreCache:true});
    await until("!!document.querySelector('.app.forest')");
    await until("!!document.querySelector('.settings .start:not(:disabled)')",32000);
    await evaluate("document.querySelector('.settings .start:not(:disabled)').click()");
    await until("document.querySelectorAll('.app.game-active .cards .card').length===6");
    await sleep(600);
    const keys=await evaluate("[...document.querySelectorAll('.cards .card')].map(x=>x.dataset.cardKey)");
    const pairs=new Map();
    for(let i=0;i<keys.length;i++){
      const id=keys[i].slice(0,keys[i].lastIndexOf(':'));
      if(!pairs.has(id))pairs.set(id,[]);
      pairs.get(id).push(i);
    }
    assert.equal(pairs.size,3);
    for(const indexes of pairs.values()){
      assert.equal(indexes.length,2);
      await evaluate(`document.querySelectorAll('.cards .card')[${indexes[0]}].click()`);
      await until(`document.querySelectorAll('.cards .card')[${indexes[0]}].classList.contains('flipped')`);
      await evaluate(`document.querySelectorAll('.cards .card')[${indexes[1]}].click()`);
      await until(`document.querySelectorAll('.cards .card')[${indexes[0]}].classList.contains('found')&&document.querySelectorAll('.cards .card')[${indexes[1]}].classList.contains('found')`);
      const feedback=await evaluate(`(()=>{
        const a=[document.querySelectorAll('.cards .card')[${indexes[0]}],document.querySelectorAll('.cards .card')[${indexes[1]}]];
        return a.map(e=>({animation:getComputedStyle(e).animationName,start:e.getAnimations().find(z=>z.animationName==='zg-match')?.startTime,bloom:getComputedStyle(e,'::after').animationName}));
      })()`);
      assert(feedback.every(x=>x.animation==='zg-match'&&x.bloom==='zg-pigment-bloom'),JSON.stringify(feedback));
      const zoom=await evaluate(`(()=>{const e=document.querySelector('.zg-scene-camera');return {name:getComputedStyle(e).animationName,pan:e.style.getPropertyValue('--zg-camera-pan-x'),background:getComputedStyle(e,'::before').backgroundImage}})()`);
      assert(zoom.name==='zg-camera-zoom'&&zoom.pan.endsWith('px')&&zoom.background.includes('forest_background.webp'),'Whole illustrated scene must zoom to pair: '+JSON.stringify(zoom));
      if(indexes===pairs.values().next().value){await sleep(570);const scale=await evaluate("new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.zg-scene-camera')).transform).a");assert(scale>1.06,'Camera must visibly zoom toward matching cards: '+scale);await screenshot('forest-approved-camera-zoom-1280x800');}
      if(feedback.every(x=>typeof x.start==='number'))assert(Math.abs(feedback[0].start-feedback[1].start)<80,'Found pair must zoom synchronously');
    }
    await until("!!document.querySelector('.result .victory-stars')");
    assert.equal(await evaluate("document.querySelectorAll('.result .victory-stars>span').length"),3);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.result .victory-stars>span')).animationName"),'zg-award-fly');
    const reward=await evaluate(`(()=>{const stars=[...document.querySelectorAll('.result .victory-stars>span')];return stars.map(e=>({delay:parseFloat(getComputedStyle(e).animationDelay),art:getComputedStyle(e.querySelector('.victory-star')).backgroundImage,position:getComputedStyle(e.querySelector('.victory-star')).backgroundPositionX}))})()`);
    assert(reward.every(x=>x.art.includes('approved-stars.webp')),'Result must use existing watercolor artwork: '+JSON.stringify(reward));
    assert(reward[0].delay<reward[1].delay&&reward[1].delay<reward[2].delay,'Stars must launch with staggered delays: '+JSON.stringify(reward));
    assert(reward[0].position!==reward[1].position,'Centre award must use the shining star artwork: '+JSON.stringify(reward));
    await sleep(2510);
    const flight=await evaluate("[...document.querySelectorAll('.result .victory-stars>span')].map(e=>({opacity:+getComputedStyle(e).opacity,transform:getComputedStyle(e).transform}))");
    assert(flight[0].opacity>.1&&flight[2].opacity<.1,'Stars must fly out consecutively, not all together: '+JSON.stringify(flight));
    await screenshot('forest-watercolor-award-in-flight-1280x800');
    await sleep(1290);
    const finalCards=await evaluate("[...document.querySelectorAll('.cards .card.found')].map(e=>({opacity:+getComputedStyle(e).opacity,animation:getComputedStyle(e).animationName}))");
    assert(finalCards.length===6&&finalCards.every(x=>x.opacity<.01&&x.animation==='zg-match'),
      'Matched cards must disappear completely after pigment pop: '+JSON.stringify(finalCards));
    await screenshot('forest-watercolor-match-and-award-1280x800');
  }
  const results=[];
  for(const [t,w,h] of [['neutral',1440,900],['space',1440,900],['forest',1440,900],['neutral',390,844],['forest',390,844]])results.push(await scenario(t,w,h));
  const sorting=[];
  for(const [t,w,h] of [['neutral',1440,900],['space',1440,900],['forest',1440,900],['neutral',390,844],['space',390,844],['forest',390,844]])sorting.push(await sortingScenario(t,w,h));
  await winnerAndFeedback();
  await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const reduced=await evaluate("getComputedStyle(document.querySelector('.zg-scene-sprite')||document.querySelector('.sort-card')).animationName");
  assert.equal(reduced,'none','Reduced-motion preference was ignored');
  writeFileSync(join(output,'report.json'),JSON.stringify({memory:results,sorting,failedRequests:failures},null,2));
  assert.equal(failures.length,0,failures.join('\n'));
  console.log('Verified browser UI:',JSON.stringify(results.map(x=>({theme:x.theme,viewport:x.viewport,stage:x.stage,cardCount:x.cards})),null,2));
}finally{ws?.close();proc.kill('SIGTERM');server.close();await Promise.race([new Promise(r=>proc.once('exit',r)),sleep(1500)]);try{rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100})}catch{}}