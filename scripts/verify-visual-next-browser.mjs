import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {runBrowserProbe} from './browser-probe.mjs';
const theme=process.env.UI_THEME||'neutral',report=[],output=`ui-smoke/visual-next/${theme}`;
await runBrowserProbe({theme,outputDirectory:output,rootDirectory:'dist-visual'},async({cmd,evaluate,until,screenshot,origin})=>{
 await cmd('DOM.enable');await cmd('CSS.enable');
 for(const [width,height] of [[1440,900],[1024,768],[768,1024],[390,844],[844,390]]){
  await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600||width===844});
  for(const game of ['memory','sorting','matching','conveyor','transformations']){
   await cmd('Page.navigate',{url:origin+`visual-lab.html?theme=${theme}&game=${game}`});
   await until("!!document.querySelector('.v-settings')");
   await evaluate('document.fonts.ready');
   assert(await evaluate("(()=>{const e=document.querySelector('.v-settings'),r=e.getBoundingClientRect(),f=e.querySelector('.v-settings-footer').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&e.scrollWidth<=e.clientWidth+1&&f.bottom<=r.bottom&&f.top>=r.top})()"),'Settings or footer bounds '+game+' '+width);
   await evaluate("document.querySelector('button[aria-label=\"Увеличить: Количество элементов\"]').click()");
   await until("document.querySelector('.v-quantity input[type=number]').value==='9'");
   assert(await evaluate("document.querySelector('.v-quantity input[type=range]').value==='9'"),'Quantity range mismatch');
   await until("!!document.querySelector('[data-material-source-ready=true]')");
   const setName=`Архитектура ${game} ${width}`;
   await evaluate("document.querySelector('button[aria-label=\"Сохранить набор\"]').click()");
   await until("!!document.querySelector('dialog[open] form')");
   await evaluate("document.querySelector('dialog[open] button[type=submit]').click()");
   await until("document.querySelector('dialog[open] [role=alert]')?.textContent==='Введите название набора.'");
   await evaluate("document.querySelector('dialog[open] input').focus()");
   await cmd('Input.insertText',{text:setName});
   assert.equal(await evaluate("document.querySelector('dialog[open] input').value"),setName,'Keyboard input must reach save form');
   await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
   await until("!document.querySelector('dialog[open]')");
   assert(await evaluate("(()=>{const doc=JSON.parse(localStorage.getItem('zabavograd.material-sets.v1'));return doc.version===1&&doc.sets.some(s=>s.name==="+JSON.stringify(setName)+"&&s.id&&s.learning.mode==='any')&&document.activeElement?.getAttribute('aria-label')==='Сохранить набор'})()"),'Canonical saved set or restored focus missing');
   await evaluate("[...document.querySelectorAll('.v-disclosure>summary')].find(e=>e.textContent==='Правила игры').click()");
   assert(await evaluate("(()=>{const e=[...document.querySelectorAll('.v-range-track input')],a=e[0].getBoundingClientRect(),b=e[1].getBoundingClientRect();return e.length===2&&a.width>0&&Math.abs(a.left-b.left)<1&&Math.abs(a.top-b.top)<1&&Math.abs(a.width-b.width)<1})()"),'Range must use one shared track');
   await evaluate("document.querySelector('.v-range-track input').focus()");
   await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
   await until("document.querySelector('.v-range-track input').value==='2'");
   const {root:dom}=await cmd('DOM.getDocument');
   const {nodeId:quiet}=await cmd('DOM.querySelector',{nodeId:dom.nodeId,selector:'.v-button--quiet'});
   await cmd('CSS.forcePseudoState',{nodeId:quiet,forcedPseudoClasses:['active','hover']});
   assert(await evaluate("(()=>{const s=getComputedStyle(document.querySelector('.v-button--quiet'));return s.boxShadow==='none'&&s.transform==='none'})()"),'Quiet action must stay flat while active');
   await cmd('CSS.forcePseudoState',{nodeId:quiet,forcedPseudoClasses:[]});
   await screenshot(`${game}-${width}-settings`);
   await evaluate("[...document.querySelectorAll('button')].find(e=>e.textContent==='Начать игру').click()");await until("!!document.querySelector('.v-toolbar')");
   assert(await evaluate("(()=>{const bar=document.querySelector('.v-toolbar').getBoundingClientRect();return [...document.querySelectorAll('.v-toolbar .v-icon-button')].filter(e=>e.getBoundingClientRect().width>0).every(e=>{const r=e.getBoundingClientRect();return Math.abs(r.height/bar.height-.6)<.02&&Math.abs(r.top+r.height/2-bar.top-bar.height/2)<1&&r.left>=0&&r.right<=innerWidth})})()"),'Toolbar geometry '+game+' '+width);
   await until("[...document.images].every(e=>e.complete&&e.naturalWidth>0)");await screenshot(`${game}-${width}-play`);
   await evaluate("document.querySelector('button[aria-label=Пауза]').click()");await until("!!document.querySelector('dialog[open]')");
   assert(await evaluate("(()=>{const d=document.querySelector('dialog[open]'),r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&d.contains(document.activeElement)})()"),'Native dialog bounds/focus '+game+' '+width);
   await screenshot(`${game}-${width}-pause`);
   await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until("!document.querySelector('dialog[open]')");
   report.push({theme,game,width,height,settings:true,quantity:true,savedSet:true,toolbar:true,pauseFocus:true,escape:true});
  }
 }
});
writeFileSync(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({theme,scenarios:report.length}));
