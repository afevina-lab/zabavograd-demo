import {writeFileSync,mkdirSync} from 'node:fs';
import {runBrowserProbe} from './browser-probe.mjs';
import {createGameSetup} from './browser-game-setup.mjs';
const theme=process.env.UI_THEME||'neutral',directory=`ui-smoke/baseline/${theme}`;
const sizes=[[1440,900],[1024,768],[768,1024],[390,844],[844,390]],games=['memory','sorting','matching','conveyor','transformations'];
const measurements=[];
await runBrowserProbe({theme,outputDirectory:directory},async({cmd,evaluate,until,screenshot,origin,themeIndex})=>{
 await cmd('Page.addScriptToEvaluateOnNewDocument',{source:`let seed=17123;Math.random=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};localStorage.clear();`});
 const setup=createGameSetup({cmd,evaluate,until,origin,themeIndex});
 const capture=async(name)=>{
  await evaluate(`document.fonts.ready`);
  await evaluate(`(()=>{if(!document.getElementById('baseline-motion')){const s=document.createElement('style');s.id='baseline-motion';s.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';document.head.append(s)}})()`);
  await until("[...document.images].filter(e=>e.getBoundingClientRect().width>0).every(e=>e.complete&&e.naturalWidth>0)");
  measurements.push({name,theme,metrics:await evaluate(`(()=>{const selectors=['.shared-settings-window','.settings-window-heading','.setup-workspace','.setup-columns','.setup-theme-rail','.setup-footer','.setup-footer>.primary','.quantity-slider','.shared-toolbar','.toolbar-left','.toolbar-centre','.toolbar-right','.overlay>div','.transformation-chamber'];return selectors.flatMap(selector=>[...document.querySelectorAll(selector)].map((e,index)=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {selector,index,bounds:{x:r.x,y:r.y,width:r.width,height:r.height},styles:Object.fromEntries(['display','position','gap','padding','margin','fontFamily','fontSize','lineHeight','backgroundImage','borderImageSource','borderImageSlice','zIndex','overflow','maxHeight'].map(k=>[k,s[k]]))}}))})()`)});
  await screenshot(name);
 };
 for(const [width,height] of sizes){
  await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600||width===844});
  for(const game of games){
   const name=`${game}-${width}x${height}`;
   await cmd('Page.navigate',{url:origin+'?game='+game});await until("!!document.querySelector('.unified-settings-content')");
   await evaluate(`document.querySelectorAll('.themes button')[${themeIndex}].click()`);
   await capture(name+'-settings');
   await evaluate("document.querySelectorAll('.settings-disclosure').forEach(e=>e.open=true)");await capture(name+'-expanded');
   await setup(game);await capture(name+'-play');
   await evaluate("document.querySelector('button[aria-label=Пауза]').click()");await until("!!document.querySelector('.overlay')");await capture(name+'-pause');
   await evaluate("document.querySelector('.overlay button[aria-label=Продолжить]').click()");
   for(let i=0;i<10;i++){await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'F8',code:'F8',windowsVirtualKeyCode:119});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'F8',code:'F8',windowsVirtualKeyCode:119})}
   await until("!!document.querySelector('.overlay.result')");await capture(name+'-result');
  }
 }
});
mkdirSync(directory,{recursive:true});writeFileSync(directory+'/measurements.json',JSON.stringify(measurements,null,2));console.log(JSON.stringify({theme,combinations:25,screenshots:measurements.length}));
