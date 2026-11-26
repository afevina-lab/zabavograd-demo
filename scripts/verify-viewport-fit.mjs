import assert from 'node:assert/strict';
import {runBrowserProbe} from './browser-probe.mjs';
import {createGameSetup} from './browser-game-setup.mjs';
import {inspectSettingsLayout} from './settings-layout-contract.mjs';
import {writeFileSync} from 'node:fs';
const report=[],theme=process.env.UI_THEME||'neutral';
await runBrowserProbe({theme,rootDirectory:'dist',outputDirectory:'.build-tools/viewport/'+theme},async api=>{
 const {cmd,evaluate,until,screenshot,origin}=api,setup=createGameSetup(api);
 for(const [width,height] of [[1920,1080],[1440,900],[390,844],[320,480],[844,390]])for(const game of ['memory','sorting','matching','conveyor','transformations']){
  await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
  await cmd('Page.navigate',{url:origin+'?game='+game});await until("!!document.querySelector('.v-settings')");
  const menu=await evaluate('('+inspectSettingsLayout.toString()+')()');assert(Object.values(menu).every(Boolean),game+' '+width+' menu '+JSON.stringify(menu));
  await screenshot(game+'-'+width+'-menu');
  await setup(game,{timed:true,maxMaterial:true});
  await new Promise(r=>setTimeout(r,650));
  const inspect=()=>{
   const stage=document.querySelector('.v-live-stage'),r=stage.getBoundingClientRect();
   const gaps=[...stage.querySelectorAll('.v-fitted-grid:not([data-groups=true])')].every(grid=>{const cells=[...grid.children].map(e=>e.getBoundingClientRect());return cells.every((a,i)=>!i||Math.abs(a.top-cells[i-1].top)>1||Math.abs(a.left-cells[i-1].right-8)<1)});
   const scrollers=[...stage.querySelectorAll('*')].filter(e=>['auto','scroll'].includes(getComputedStyle(e).overflowY)||['auto','scroll'].includes(getComputedStyle(e).overflowX)).map(e=>e.className);
   const clipped=[...stage.querySelectorAll('.v-fitted-grid-cell>.v-card,.v-fitted-grid-cell>.v-card-surface,.v-fitted-grid-cell>.v-card-slot')].filter(e=>{const a=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return a.left<b.left-1||a.right>b.right+1||a.top<b.top-1||a.bottom>b.bottom+1}).map(e=>({label:e.getAttribute('aria-label'),rect:e.getBoundingClientRect().toJSON(),cell:e.parentElement.getBoundingClientRect().toJSON()}));
   const memoryFits=[...stage.querySelectorAll('[data-card-key]')].every(e=>{const b=e.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1&&b.top>=r.top-1&&b.bottom<=r.bottom+1});
   return {memoryFits,stageInside:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,gaps,scrollers,clipped,hint:!!document.querySelector('.v-toolbar button:disabled[aria-label*=подпис]'),pages:!!stage.querySelector('nav'),cards:stage.querySelectorAll('.v-card').length};
  };
  if(game==='sorting')await evaluate("(async()=>{for(let n=0;n<20;n++){const card=document.querySelector('.v-sorting-bank .v-card:not(:disabled)');if(!card)break;card.click();await new Promise(r=>setTimeout(r,20));document.querySelector('.v-sort-target:not(:disabled)')?.click();await new Promise(r=>setTimeout(r,20));}})()");
  await new Promise(r=>setTimeout(r,1200));
  await evaluate("Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))");
  const field=await evaluate('('+inspect.toString()+')()');await screenshot(game+'-'+width+'-play');
  assert(field.memoryFits&&field.stageInside&&field.gaps&&!field.scrollers.length&&!field.clipped.length&&!field.hint&&!field.pages,game+' '+width+' field '+JSON.stringify(field));
  report.push({game,width,height,menu,field});
 }
});
writeFileSync('.build-tools/viewport/'+theme+'/report.json',JSON.stringify(report,null,2));
console.log('Viewport scenarios passed: '+report.length);
