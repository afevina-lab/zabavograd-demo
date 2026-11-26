import assert from 'node:assert/strict';
import {runBrowserProbe} from './browser-probe.mjs';
import {createGameSetup} from './browser-game-setup.mjs';
const theme=process.env.UI_THEME||'neutral';
await runBrowserProbe({theme,rootDirectory:process.env.UI_DIST_ROOT||'dist-visual',outputDirectory:'.build-tools/compact-toolbar/'+theme},async api=>{
 const {cmd,evaluate,screenshot}=api,setup=createGameSetup(api);
 for(const [width,lives] of [[320,5],[320,10],[390,10],[600,10],[844,10],[1024,10],[1440,10]])for(const game of ['memory','sorting','matching','conveyor','transformations']){
  await cmd('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  await setup(game,{timed:true,lives});
  const geometry=await evaluate(`(()=>{
   const bar=document.querySelector('.v-toolbar'),status=bar.querySelector('.v-toolbar-status'),r=bar.getBoundingClientRect(),s=status.getBoundingClientRect();
   const rects=[...bar.querySelectorAll('.v-icon-button,.v-toolbar-counters>*,.v-toolbar-task')].map(e=>e.getBoundingClientRect()).filter(e=>e.width>0);
   return {inside:rects.every(e=>e.top>=r.top-1&&e.bottom<=r.bottom+1&&e.left>=r.left&&e.right<=r.right+1),oneRow:rects.every(e=>Math.abs(e.top+e.height/2-r.top-r.height/2)<1),centred:Math.abs(s.top+s.height/2-r.top-r.height/2)<1,counterOverflow:status.querySelector('.v-toolbar-counters').scrollWidth>status.clientWidth+1};
  })()`);
  assert(geometry.inside&&geometry.oneRow&&geometry.centred&&!geometry.counterOverflow,'Compact header '+game+' '+width+' '+JSON.stringify(geometry));
  await screenshot(game+'-'+width+'-'+lives);
 }
});
console.log('Compact toolbar: 5 games × 320/390/600/844/1024/1440 px, timer and lives, centred and contained.');
