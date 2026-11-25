import assert from 'node:assert/strict';
import {runBrowserProbe} from './browser-probe.mjs';

// Render the production card surface at fixed points of its real animations.
// Keeping the animation paused makes seams inspectable at fractional DPRs.
for(const theme of ['neutral','forest','space']){
 await runBrowserProbe({theme,rootDirectory:'dist-visual',outputDirectory:'.build-tools/card-motion/'+theme},async({cmd,evaluate,until,screenshot,origin,themeIndex})=>{
  await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await cmd('Page.navigate',{url:origin+'?game=matching'});
  await until("!!document.querySelector('.v-settings')");
  await evaluate("document.querySelectorAll('.v-theme-choice button')["+themeIndex+"].click()");
  await evaluate(`(()=>{
   const panel=document.createElement('div');panel.id='motion-review';
   Object.assign(panel.style,{position:'fixed',inset:'0',zIndex:'100',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'24px',padding:'32px',background:'#e7dbbb',alignContent:'start',justifyItems:'center',overflow:'auto'});
   for(const feedback of ['wrong','correct'])for(const progress of [.18,.5,.8]){
    const cell=document.createElement('div');cell.style.textAlign='center';
    const label=document.createElement('p');label.textContent=feedback+' · '+Math.round(progress*100)+'%';cell.append(label);
    const card=document.createElement('div');card.className='v-card-surface';card.dataset.feedback=feedback;
    card.style.width='180px';card.style.height='180px';card.style.aspectRatio='1';card.textContent='Пример';cell.append(card);panel.append(cell);
   }
   document.querySelector('.app').append(panel);
   panel.getBoundingClientRect();
   [...panel.querySelectorAll('.v-card-surface')].forEach((card,i)=>card.getAnimations().forEach(animation=>{animation.pause();animation.currentTime=Number(animation.effect.getTiming().duration)*[.18,.5,.8][i%3]}));
  })()`);
  for(const dpr of [1,1.25,2]){
   await cmd('Emulation.setDeviceMetricsOverride',{width:900,height:620,deviceScaleFactor:dpr,mobile:false});
   assert(await evaluate("[...document.querySelectorAll('#motion-review .v-card-surface')].every(e=>getComputedStyle(e).backgroundImage!=='none'&&getComputedStyle(e).borderImageSource==='none'&&e.getAnimations().every(a=>a.playState==='paused'))"),'Whole card surface or paused motion missing');
   await screenshot('frames-dpr-'+dpr);
  }
 });
}
console.log('Captured seamless card surfaces: 3 themes × 3 DPRs × 6 intermediate frames.');
