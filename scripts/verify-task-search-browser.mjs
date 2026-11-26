import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {runBrowserProbe} from './browser-probe.mjs';
const report=[];
await runBrowserProbe({theme:'forest',rootDirectory:'dist',outputDirectory:'.build-tools/task-search-review'},async({cmd,evaluate,until,screenshot,origin})=>{
 for(const [width,height] of [[1440,900],[390,844]])for(const game of ['memory','sorting','matching','conveyor','transformations']){
  await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
  await cmd('Page.navigate',{url:origin+'?game='+game});await until("!!document.querySelector('input[aria-label=\"Поиск задачи\"]')");
  await evaluate("document.querySelectorAll('.v-theme-choice button')[1].click();document.querySelector('input[aria-label=\"Поиск задачи\"]').focus()");
  await cmd('Input.insertText',{text:'грибы'});await until("!!document.querySelector('.v-task-suggestions button')");
  const suggestion=await evaluate("(()=>{const e=document.querySelector('.v-task-suggestions'),r=e.getBoundingClientRect();return {inside:r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,first:e.querySelector('strong').textContent}})()");assert(suggestion.inside&&suggestion.first==='Грибы',JSON.stringify(suggestion));
  await screenshot(game+'-'+width+'-suggestions');
  await evaluate("document.querySelector('.v-task-suggestions button').click()");await until("document.querySelector('.v-task-search-notice').textContent==='Применено: Грибы'");
  assert(await evaluate("!document.querySelector('.v-task-suggestions')&&!document.querySelector('input[aria-label=\"Поиск задачи\"]').value"));
  await until("!!document.querySelector('.v-settings-footer>button:not(:disabled)')");
  if(game==='sorting')assert(await evaluate("!!document.querySelector('button[aria-label=\"Перемешать состав\"]:not(:disabled)')"));
  await evaluate("(()=>{const d=document.querySelector('.challenge');d.open=true;const e=[...d.querySelectorAll('label')].find(e=>e.textContent==='Жизни').querySelector('input');if(!e.checked)e.click()})()");
  await until("!!document.querySelector('select[aria-label=\"Списание жизней\"]')");
  await evaluate("(()=>{const e=document.querySelector('select[aria-label=\"Списание жизней\"]');e.value='mistakes';e.dispatchEvent(new Event('change',{bubbles:true}))})()");
  await screenshot(game+'-'+width+'-preset');
  await evaluate("document.querySelector('.v-settings-footer>button').click()");await until("!!document.querySelector('.app.game-active')||!!document.querySelector('[aria-label^=\"Разделить игру на \"]')");
  if(await evaluate("!!document.querySelector('[aria-label^=\"Разделить игру на \"]')"))await evaluate("document.querySelector('[aria-label^=\"Разделить игру на \"] .v-button--secondary').click()");
  await until("!!document.querySelector('.app.game-active .v-life-button')");
  assert(await evaluate("(()=>{const e=document.querySelector('.v-life-button');return e.disabled&&getComputedStyle(e).opacity==='1'})()"),'Automatic lives must stay opaque');
  await screenshot(game+'-'+width+'-play');report.push({game,width,preset:true,opaqueHearts:true});
 }
 await cmd('Page.navigate',{url:origin+'?game=memory'});await until("!!document.querySelector('input[aria-label=\"Поиск задачи\"]')");await evaluate("document.querySelector('input[aria-label=\"Поиск задачи\"]').focus()");await cmd('Input.insertText',{text:'сложение'});await until("!!document.querySelector('.v-task-suggestions button')");await evaluate("document.querySelector('.v-task-suggestions button').click()");await until("!!document.querySelector('.math-settings')");
 await evaluate("(()=>{const e=[...document.querySelectorAll('.math-settings label')].find(e=>e.textContent==='Сложение').querySelector('input');if(e.checked)e.click()})()");
 await until("document.querySelector('.math-settings .v-reading-kinds').dataset.fieldState==='required'");
 assert(await evaluate("document.querySelector('.v-settings-footer>button').disabled"),'Empty required operations prevent launch');await screenshot('required-operations');
});
writeFileSync('.build-tools/task-search-review/report.json',JSON.stringify(report,null,2));console.log('Task search and automatic hearts passed: '+report.length);
