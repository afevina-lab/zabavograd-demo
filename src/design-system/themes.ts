import type {CSSProperties} from 'react';
import {MOTION} from './motion.ts';

/** Themes are visual configuration, never game rules. */
export const THEME_IDS=['neutral','forest','space'] as const;
export type ThemeId=typeof THEME_IDS[number];
type Palette={accent:string;deep:string;pale:string;outline:string;text:string;paper:string;page:string;stageText:string};
export type SceneSprite={id:string;src:string;motion:'none'|'float'|'breathe'|'twinkle'|'sway'|'fall';width:string;left?:string;right?:string;top?:string;bottom?:string;opacity?:number;durationMs?:number;delayMs?:number;origin?:string};
type ThemeConfig={
 label:string;palette:Palette;skin:'blue'|'sage'|'lavender';toolbarArt:string|null;
 scene:{background:string|null;fill:string;motion:'drift'|'static';sprites:SceneSprite[];effects:{stars:number;comets:number}};
 cards:{kind:'watercolor'|'procedural';back:string|null;front:string|null};
 sounds:Partial<Record<'flip'|'match',string>>;
};
export const THEMES:Record<ThemeId,ThemeConfig>={
 neutral:{
  label:'Нейтральное',
  palette:{accent:'#77b0d6',deep:'#285174',pale:'#e4f2fa',outline:'#5d86a5',text:'#243d59',paper:'#fbf5e9',page:'#f8f1e8',stageText:'#5b5059'},
  skin:'blue',toolbarArt:null,scene:{background:'assets/neutral/approved-paper-4k.webp',fill:'#f9f2e7',motion:'drift',sprites:[],effects:{stars:0,comets:0}},
  cards:{kind:'watercolor',back:'assets/neutral/approved-back.webp',front:'assets/neutral/approved-front.webp'},sounds:{}
 },
 forest:{
  label:'Лес',
  palette:{accent:'#a8bc8c',deep:'#4a694c',pale:'#edf4e5',outline:'#7c9b72',text:'#304d38',paper:'#fffaf0',page:'#eef2e6',stageText:'#344a39'},
  skin:'sage',toolbarArt:'assets/themes/forest/header.webp',
  scene:{background:'assets/themes/forest/forest_background.webp',fill:'#d5e7bf',motion:'static',sprites:[
   {id:'tree-left',src:'assets/themes/forest/forest_tree_1.webp',motion:'sway',width:'clamp(180px,20vw,340px)',left:'-6%',bottom:'-7%',opacity:.92,durationMs:10500,origin:'50% 94%'},
   {id:'tree-right',src:'assets/themes/forest/forest_tree_2.webp',motion:'sway',width:'clamp(175px,20vw,330px)',right:'-5%',bottom:'-7%',opacity:.92,durationMs:12400,delayMs:-4500,origin:'50% 94%'},
   {id:'fern',src:'assets/themes/forest/forest_fern.webp',motion:'breathe',width:'clamp(105px,12vw,210px)',left:'3%',bottom:'-5%',opacity:.9,durationMs:26000},
   {id:'bush',src:'assets/themes/forest/forest_bush.webp',motion:'breathe',width:'clamp(110px,13vw,230px)',right:'3%',bottom:'-5%',opacity:.92,durationMs:30000},
   {id:'flowers',src:'assets/themes/forest/forest_flower_patch.webp',motion:'none',width:'clamp(200px,28vw,490px)',left:'35%',bottom:'-4%',opacity:.9},
   {id:'leaf-birch',src:'assets/themes/forest/forest_leaf_birch.webp',motion:'fall',width:'clamp(26px,3vw,44px)',left:'13%',top:'-12%',opacity:.8,durationMs:17000,delayMs:-2200},
   {id:'leaf-oak',src:'assets/themes/forest/forest_leaf_oak.webp',motion:'fall',width:'clamp(30px,3.2vw,49px)',left:'69%',top:'-11%',opacity:.85,durationMs:21500,delayMs:-9100},
   {id:'leaf-oval',src:'assets/themes/forest/forest_leaf_oval.webp',motion:'fall',width:'clamp(25px,2.8vw,43px)',left:'42%',top:'-13%',opacity:.8,durationMs:18800,delayMs:-13900}
  ],effects:{stars:0,comets:0}},
  cards:{kind:'watercolor',back:'assets/themes/forest/back.webp',front:'assets/themes/forest/front.webp'},sounds:{}
 },
 space:{
  label:'Космос',
  palette:{accent:'#ae97e1',deep:'#625095',pale:'#ebe5ff',outline:'#8a76c2',text:'#2e2855',paper:'#fbf5e9',page:'#1c2340',stageText:'#fff5e8'},
  skin:'lavender',toolbarArt:null,scene:{background:'assets/space/background.webp',fill:'#1c2340',motion:'static',
 sprites:[
  {id:'planet-blue',src:'assets/space/planet-blue.webp',motion:'float',width:'170px',left:'-35px',bottom:'1%',opacity:.8,durationMs:24000},
  {id:'purple-nebula',src:'assets/space/nebula-purple.webp',motion:'breathe',width:'45%',left:'0%',top:'0%',opacity:.16,durationMs:28000},
  {id:'blue-nebula',src:'assets/space/nebula-blue.webp',motion:'breathe',width:'45%',right:'0%',bottom:'0%',opacity:.16,durationMs:34000},
  ...Array.from({length:7},(_,i)=>({id:'star-'+i,src:'assets/space/star.webp',motion:'twinkle' as const,width:'42px',left:(8+i*13)+'%',top:(15+(i*23)%70)+'%',opacity:.2,durationMs:14000,delayMs:i*2000}))
 ],effects:{stars:30,comets:2}
},
  cards:{kind:'watercolor',back:'assets/space/card-back-v2.webp',front:'assets/space/card-front-v2.webp'},sounds:{flip:'flip-space.wav',match:'match-space.wav'}
 }
};
export const asThemeId=(x:unknown):ThemeId=>typeof x==='string'&&(THEME_IDS as readonly string[]).includes(x)?x as ThemeId:'space';
export const assetUrl=(p:string,base='/')=>base.replace(/\/?$/,'/')+p.replace(/^\//,'');
const url=(p:string|null,base:string)=>p?`url("${assetUrl(p,base)}")`:'none';
export function themeVars(id:ThemeId,base='/'):CSSProperties{
 const t=THEMES[id],p=t.palette,c=t.skin;
 const kit=(dir:string,name:string)=>url(`assets/theme-ui/${dir}/${name}.webp`,base);
 return {
  '--ui-accent':p.accent,'--ui-deep':p.deep,'--ui-pale':p.pale,
  '--ui-outline':p.outline,'--ui-text':p.text,'--ui-paper':p.paper,
  '--zg-page':p.page,'--zg-stage-fill':t.scene.fill,'--zg-stage-text':p.stageText,
  '--zg-stage-image':url(t.scene.background,base),
  '--zg-toolbar-image':url(t.toolbarArt,base),
  '--zg-card-back-image':url(t.cards.back,base),
  '--zg-card-front-image':url(t.cards.front,base),
  '--zg-award-stars-image':url('assets/neutral/approved-stars.webp',base),
  '--skin-panel':kit('panels',`panel-${c}-square-corners`),
  '--skin-large':kit('buttons/large',`button-large-${c}-normal`),
  '--skin-large-hover':kit('buttons/large',`button-large-${c}-hover`),
  '--skin-large-pressed':kit('buttons/large',`button-large-${c}-pressed`),
  '--skin-large-disabled':kit('buttons/large',`button-large-${c}-disabled`),
  '--skin-square':kit('buttons/square',`button-square-${c}-normal`),
  '--skin-square-hover':kit('buttons/square',`button-square-${c}-hover`),
  '--skin-square-pressed':kit('buttons/square',`button-square-${c}-pressed`),
  '--skin-pill':kit('buttons/pill',`button-pill-${c}-normal`),
  '--skin-pill-hover':kit('buttons/pill',`button-pill-${c}-hover`),
  '--skin-tab':kit('tabs',`tab-${c}-inactive`),
  '--skin-tab-active':kit('tabs',`tab-${c}-active`),
  '--skin-chip':kit('chips',`chip-${c}-normal`),
  '--skin-check-empty':kit('checkboxes',`checkbox-${c}-empty`),
  '--skin-check-checked':kit('checkboxes',`checkbox-${c}-checked`),
  '--skin-radio-empty':kit('radio',`radio-${c}-empty`),
  '--skin-radio-checked':kit('radio',`radio-${c}-checked`),
  '--skin-toggle-on':kit('toggles',`toggle-${c}-on`),
  '--skin-slider-thumb':kit('sliders',`slider-thumb-${c}-normal`),
  '--zg-deal-duration':`${MOTION.dealMs}ms`,
  '--zg-flip-duration':`${MOTION.flipMs}ms`,
  '--zg-mismatch-duration':`${MOTION.mismatchMs}ms`,
  '--zg-match-duration':`${MOTION.matchMs}ms`,
  '--zg-result-duration':`${MOTION.resultMs}ms`,
  '--zg-sort-wrong-duration':`${MOTION.sortWrongMs}ms`,
 } as CSSProperties;
}
export function themeAttributes(id:ThemeId){
 const t=THEMES[id];
 return {'data-theme':id,'data-card-style':t.cards.kind,'data-scene-motion':t.scene.motion,'data-toolbar-art':t.toolbarArt?'illustrated':'kit'} as const;
}
export function soundFile(id:ThemeId,event:string):string{
 const special=THEMES[id].sounds[event as 'flip'|'match'];
 return special||(['click','wrong','win','deal'].includes(event)?event+'.wav':event+'.ogg');
}
