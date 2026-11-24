import {createGameSetup} from './browser-game-setup.mjs';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {runBrowserProbe} from './browser-probe.mjs';
const plan=JSON.parse(readFileSync('ci-plan.json','utf8'));
const theme=process.env.UI_THEME||'neutral';
assert(plan.themes.includes(theme),'Theme outside selected plan');
const report=[];
await runBrowserProbe({theme,outputDirectory:`ui-smoke/critical/${theme}`},async({cmd,evaluate,until,screenshot,origin,themeIndex})=>{
 const setup=createGameSetup({cmd,evaluate,until,origin,themeIndex});
 for(const [width,height] of plan.sizes){
  await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
  for(const game of plan.games){
   await cmd('Page.navigate',{url:origin+'?game='+game});
   await until("!!document.querySelector('.unified-settings-content')");
   await evaluate(`document.querySelectorAll('.themes button')[${themeIndex}]?.click()`);
   await until("[...document.images].filter(e=>e.getBoundingClientRect().width>0).every(e=>e.complete&&e.naturalWidth>0)");
   assert(await evaluate("(()=>{const e=document.querySelector('.unified-settings-content');return e.clientWidth>0&&e.scrollWidth<=e.clientWidth+2&&document.documentElement.scrollWidth<=innerWidth+2})()"),'Settings overflow: '+game+' '+width);
   assert(await evaluate("!![...document.querySelectorAll('.setup-footer button')].find(e=>e.textContent.includes('Начать'))"),'Missing launch control: '+game);
   await screenshot(`${game}-${width}x${height}`);
   await setup(game);
   await until("!!document.querySelector('button[aria-label=Пауза]')");
   await evaluate("document.querySelector('button[aria-label=Пауза]').click()");
   await until("!!document.querySelector('.overlay button[aria-label=Продолжить]')");
   assert(await evaluate("(()=>{const r=document.querySelector('.overlay>div').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1})()"),'Pause overflow: '+game);
   await evaluate("document.querySelector('.overlay button[aria-label=Продолжить]').click()");
   await until("!document.querySelector('.overlay')&&!!document.querySelector('.app.game-active')");
   report.push({game,theme,width,height,route:true,visibleImages:true,settingsBounds:true,launchControl:true,startPauseResume:true});
  }
 }
});
writeFileSync(`ui-smoke/critical/${theme}/report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({mode:plan.mode,scenarios:report.length,report},null,2));
