import assert from 'node:assert/strict';
import {inspectSettingsLayout} from './settings-layout-contract.mjs';
import {runBrowserProbe} from './browser-probe.mjs';
import {writeFileSync} from 'node:fs';
const theme=process.env.UI_THEME||'neutral',report=[];
await runBrowserProbe({theme,rootDirectory:'dist-visual',outputDirectory:'.build-tools/production-review/'+theme},async({cmd,evaluate,until,screenshot,origin,themeIndex})=>{
 for(const [width,height] of [[1440,900],[320,480],[320,640],[390,844],[844,390]])for(const game of ['memory','sorting','matching','conveyor','transformations']){
  await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700||height<500});
  await cmd('Page.navigate',{url:origin+'?game='+game});await until("!!document.querySelector('.v-settings')");
  await evaluate("document.querySelectorAll('.v-theme-choice button')["+themeIndex+"]?.click()");await evaluate('document.fonts.ready');
  const layout=await evaluate('('+inspectSettingsLayout.toString()+')()');assert(Object.values(layout).every(Boolean),game+' '+width+' '+JSON.stringify(layout));
  await screenshot(game+'-'+width);
  report.push(await evaluate("(()=>{const e=document.querySelector('.v-settings'),r=e.getBoundingClientRect(),s=e.querySelector('.v-settings-scroll'),f=e.querySelector('.v-settings-footer').getBoundingClientRect();return {game:"+JSON.stringify(game)+",width:innerWidth,height:innerHeight,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,horizontalOverflow:s.scrollWidth>s.clientWidth+1,footerInside:f.bottom<=r.bottom+1}})()"));
 }
});
writeFileSync('.build-tools/production-review/'+theme+'/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
