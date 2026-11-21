import type {CSSProperties} from 'react';
import {MOTION} from './motion.ts';

/** Themes are visual configuration, never game rules. */
export const THEME_IDS=['neutral','forest','space'] as const;
export type ThemeId=typeof THEME_IDS[number];
type Palette={accent:string;deep:string;pale:string;outline:string;text:string;paper:string;page:string;stageText:string};
export type SceneSprite={id:string;src:string;motion:'none'|'float'|'breathe'|'twinkle'|'sway'|'fall'|'cloud';width:string;left?:string;right?:string;top?:string;bottom?:string;opacity?:number;durationMs?:number;delayMs?:number;origin?:string;spinMs?:number;layer?:number};
type ThemeConfig={
 label:string;palette:Palette;skin:'blue'|'sage'|'lavender';toolbarArt:string|null;
 scene:{background:string|null;fill:string;motion:'drift'|'static';sprites:SceneSprite[];effects:{stars:number;comets:number}};
 cards:{kind:'watercolor'|'procedural';back:string|null;front:string|null};
 sounds:Partial<Record<'flip'|'match',string>>;
};
export const THEMES:Record<ThemeId,ThemeConfig>={
 neutral:{
  label:'Нейтральное',
  palette:{accent:'#9bb8d0',deep:'#4c6c8d',pale:'#edf3f8',outline:'#97a9b8',text:'#334559',paper:'#fffdf6',page:'#f4f0e8',stageText:'#5b5059'},
  skin:'blue',toolbarArt:null,scene:{background:'assets/neutral/approved-paper-4k.webp',fill:'#f9f2e7',motion:'drift',sprites:[],effects:{stars:0,comets:0}},
  cards:{kind:'watercolor',back:'assets/neutral/approved-back.webp',front:'assets/neutral/approved-front.webp'},sounds:{}
 },
 forest:{
  label:'Лес',
  palette:{accent:'#80b84c',deep:'#3f782f',pale:'#edf4e5',outline:'#7c9b72',text:'#304d38',paper:'#fffaf0',page:'#eef2e6',stageText:'#344a39'},
  skin:'sage',toolbarArt:'assets/themes/forest/header.webp',
  scene:{background:'assets/themes/forest/forest_background.webp',fill:'#d5e7bf',motion:'static',sprites:[
   {id:'tree-left',src:'assets/themes/forest/forest_tree_1.webp',motion:'sway',width:'min(100cqh,65cqw)',left:'-5%',bottom:'-4%',opacity:1,layer:2,durationMs:10500,origin:'50% 94%'},
   {id:'tree-right',src:'assets/themes/forest/forest_tree_2.webp',motion:'sway',width:'min(100cqh,65cqw)',right:'-5%',bottom:'-4%',opacity:1,layer:2,durationMs:12400,delayMs:-4500,origin:'50% 94%'},
   {id:'fern',src:'assets/themes/forest/forest_fern.webp',motion:'breathe',width:'clamp(105px,12vw,210px)',left:'3%',bottom:'-5%',opacity:.9,durationMs:26000},
   {id:'bush',src:'assets/themes/forest/forest_bush.webp',motion:'breathe',width:'clamp(110px,13vw,230px)',right:'3%',bottom:'-5%',opacity:.92,durationMs:30000},
   {id:'tree-far-left',src:'assets/themes/forest/forest_tree_2.webp',motion:'sway',width:'min(62cqh,40cqw)',left:'15%',bottom:'26%',opacity:1,layer:0,durationMs:15000,origin:'50% 94%'},
   {id:'tree-far-right',src:'assets/themes/forest/forest_tree_1.webp',motion:'sway',width:'min(56cqh,38cqw)',right:'18%',bottom:'32%',opacity:1,layer:0,durationMs:17000,origin:'50% 94%'},
   ...[0,1,2].map(i=>({id:'flowers-depth-'+i,src:'assets/themes/forest/forest_flower_patch.webp',motion:'none' as const,width:(12+i*2)+'cqw',left:(6+i*19)+'%',bottom:(25-i*5)+'%',opacity:.65+i*.06})),
   {id:'fern-mid',src:'assets/themes/forest/forest_fern.webp',motion:'breathe',width:'18cqw',left:'22%',bottom:'12%',opacity:1,layer:3,durationMs:23000},
   {id:'bush-mid',src:'assets/themes/forest/forest_bush.webp',motion:'breathe',width:'20cqw',right:'23%',bottom:'16%',opacity:1,layer:3,durationMs:28000},
   {id:'flowers',src:'assets/themes/forest/forest_flower_patch.webp',motion:'none',width:'min(32cqw,48cqh)',left:'30%',bottom:'-1%',opacity:.9},
   {id:'leaf-birch',src:'assets/themes/forest/forest_leaf_birch.webp',motion:'fall',width:'clamp(26px,3vw,44px)',left:'13%',top:'-12%',opacity:.8,durationMs:17000,delayMs:-2200},
   {id:'leaf-oak',src:'assets/themes/forest/forest_leaf_oak.webp',motion:'fall',width:'clamp(30px,3.2vw,49px)',left:'69%',top:'-11%',opacity:.85,durationMs:21500,delayMs:-9100},
   {id:'leaf-oval',src:'assets/themes/forest/forest_leaf_oval.webp',motion:'fall',width:'clamp(25px,2.8vw,43px)',left:'42%',top:'-13%',opacity:.8,durationMs:18800,delayMs:-13900}
  ],effects:{stars:0,comets:0}},
  cards:{kind:'watercolor',back:'assets/themes/forest/back.webp',front:'assets/themes/forest/front.webp'},sounds:{}
 },
 space:{
  label:'Космос',
  palette:{accent:'#93a7ed',deep:'#5050a8',pale:'#e0e6fb',outline:'#8b9cbf',text:'#29365a',paper:'#f5f8ff',page:'#111b35',stageText:'#f0f5ff'},
  skin:'lavender',toolbarArt:'assets/themes/space/header.webp',scene:{background:'assets/space/background.webp',fill:'#1c2340',motion:'drift',
 sprites:[
  {id:'planet-blue',src:'assets/space/planet-blue.webp',motion:'float',width:'min(120cqh,82cqw)',left:'-30cqh',bottom:'-20cqh',opacity:.9,durationMs:24000,spinMs:160000},
  {id:'planet-rings',src:'assets/space/planet.webp',motion:'float',width:'min(78cqh,52cqw)',right:'2%',top:'4%',opacity:.9,durationMs:30000,delayMs:-13000},
  {id:'purple-nebula',src:'assets/space/nebula-purple.webp',motion:'cloud',layer:2,width:'55%',left:'0%',top:'0%',opacity:.12,durationMs:18000},
  {id:'blue-nebula',src:'assets/space/nebula-blue.webp',motion:'breathe',width:'45%',right:'0%',bottom:'0%',opacity:.12,durationMs:22000},
  ...Array.from({length:7},(_,i)=>({id:'star-'+i,src:'assets/space/star.webp',motion:'twinkle' as const,width:'42px',left:(8+i*13)+'%',top:(15+(i*23)%70)+'%',opacity:.2,durationMs:14000,delayMs:i*2000}))
 ],effects:{stars:30,comets:2}
},
  cards:{kind:'watercolor',back:'assets/space/card-back-v2.webp',front:'assets/space/card-front-v2.webp'},sounds:{flip:'flip-space.wav',match:'match-space.wav'}
 }
};
export const asThemeId=(x:unknown):ThemeId=>typeof x==='string'&&(THEME_IDS as readonly string[]).includes(x)?x as ThemeId:'space';
export const assetUrl=(p:string,base='/')=>base.replace(/\/?$/,'/')+p.replace(/^\//,'');
const url=(p:string|null,base:string)=>p?`url("${assetUrl(p,base)}")`:'none';

/** Surface materials are presentation only; every game uses the same geometry. */
const warmSurface={
 '--ui-control-face':'linear-gradient(180deg,#fffdf5 0%,#fff4dc 44%,#f1dfb9 100%)','--ui-control-bottom':'#c6ad82','--ui-control-shadow':'#65451d24','--ui-control-ambient':'#65451d18','--ui-frame-inset':'13px','--ui-surface-texture':'none','--ui-frame-base':'#c28a48','--ui-frame-light':'#e7bc7d','--ui-frame-dark':'#79502c',
 '--ui-frame-texture':'repeating-linear-gradient(2deg,transparent 0 5px,#6d3e1710 6px,transparent 7px 13px)',
 '--ui-frame-fill':'linear-gradient(100deg,var(--ui-frame-light),var(--ui-frame-base) 24%,var(--ui-frame-light) 54%,var(--ui-frame-base))',
 '--ui-frame-glint':'#fff6d6','--ui-frame-shadow':'#53351f55','--ui-inner-edge':'#a97b43','--ui-inner-shadow':'#60361640',
 '--ui-surface-glint':'#fff5df','--ui-field-glint':'#fffdf0','--ui-surface-edge':'#cfb68c','--ui-field-edge':'#d2bb8d',
 '--ui-tray-edge':'#cbb58a','--ui-tray-shadow':'#d5c399','--ui-well-shadow':'#57452a20','--ui-well-shadow-strong':'#57452a25',
 '--ui-muted-text':'#8b8f81','--ui-button-inset':'#263c2220','--ui-button-inset-strong':'#17331a40','--ui-soft-shadow':'#49382012','--ui-icon-shadow':'#49382020','--ui-empty-edge':'#ba9d70',
 '--ui-thumb-edge':'#ba8b2c','--ui-thumb-base':'#b58a2c',
 '--ui-highlight':'#efba3e','--ui-icon-surface':'#f3d6b0','--ui-setup-paper':'#f5e9cc','--ui-setup-field':'#fff5df'
};
const setupSurfaces:Record<ThemeId,typeof warmSurface>={
 neutral:{...warmSurface,
 '--ui-control-face':'linear-gradient(180deg,#fffefb 0%,#faf6ec 45%,#eee6d6 100%)','--ui-control-bottom':'#c9bfaa','--ui-control-shadow':'#514b3e1a','--ui-control-ambient':'#514b3e12',
 '--ui-frame-base':'#c6bdad','--ui-frame-light':'#f7f1e5','--ui-frame-dark':'#9a9183','--ui-frame-texture':'none',
 '--ui-frame-fill':'linear-gradient(115deg,#fffaf0,#d7cdbb 35%,#f6efdf 60%,#c2b8a6)',
 '--ui-frame-glint':'#fffdf7','--ui-frame-shadow':'#625a4933','--ui-inner-edge':'#c2b7a1','--ui-inner-shadow':'#6f604126',
 '--ui-surface-glint':'#fffdf6','--ui-field-glint':'#ffffff','--ui-surface-edge':'#d5ccb9','--ui-field-edge':'#d4cbb7','--ui-tray-edge':'#d5ccb9','--ui-tray-shadow':'#ded5c3',
 '--ui-muted-text':'#687064','--ui-button-inset':'#53617118','--ui-button-inset-strong':'#33485e30','--ui-soft-shadow':'#514b3e10','--ui-icon-shadow':'#514b3e18','--ui-empty-edge':'#c4bba7',
 '--ui-thumb-edge':'#b7a173','--ui-thumb-base':'#ad986d','--ui-highlight':'#e4c996','--ui-icon-surface':'#e4e9ee','--ui-setup-paper':'#f6f0e3','--ui-setup-field':'#fffdf6'
 },forest:warmSurface,
 space:{
 '--ui-control-face':'linear-gradient(180deg,#ffffff 0%,#f2f6ff 38%,#d9e3f4 100%)','--ui-control-bottom':'#9aaccc','--ui-control-shadow':'#1b30502d','--ui-control-ambient':'#1b30501e','--ui-frame-inset':'13px','--ui-surface-texture':'none',
 '--ui-frame-base':'#8397b1','--ui-frame-light':'#e8f2ff','--ui-frame-dark':'#273c56',
 '--ui-frame-texture':'repeating-linear-gradient(0deg,#ffffff10 0 1px,transparent 1px 5px)',
 '--ui-frame-fill':'linear-gradient(105deg,#f9fcff 0%,#adbed4 10%,#617a98 22%,#dfe9f5 35%,#ffffff 44%,#7d93af 58%,#465e7e 73%,#dce8f5 86%,#98adc6 100%)',
 '--ui-frame-glint':'#ffffff','--ui-frame-shadow':'#08162966','--ui-inner-edge':'#647e9c','--ui-inner-shadow':'#182c4d60',
 '--ui-surface-glint':'#ffffff','--ui-field-glint':'#ffffff','--ui-surface-edge':'#93a6c0','--ui-field-edge':'#9aacc3',
 '--ui-tray-edge':'#9aacc3','--ui-tray-shadow':'#b4c3d7','--ui-well-shadow':'#1b355028','--ui-well-shadow-strong':'#1b355030',
 '--ui-muted-text':'#626f8e','--ui-button-inset':'#1a2d4c24','--ui-button-inset-strong':'#1c245540','--ui-soft-shadow':'#19375418','--ui-icon-shadow':'#19375422','--ui-empty-edge':'#91a8c4',
 '--ui-thumb-edge':'#268bac','--ui-thumb-base':'#287b9b',
 '--ui-highlight':'#64d1ed','--ui-icon-surface':'#ccd7ff','--ui-setup-paper':'#e4ebf6','--ui-setup-field':'#f7faff'
 }
};

export function themeVars(id:ThemeId,base='/'):CSSProperties{
 const t=THEMES[id],p=t.palette,c=t.skin;
 const kit=(dir:string,name:string)=>url(`assets/theme-ui/${dir}/${name}.webp`,base);
 return {
  '--ui-accent':p.accent,'--ui-deep':p.deep,'--ui-pale':p.pale,
  ...setupSurfaces[id],'--ui-required':'#c63b32','--ui-required-dark':'#86281f','--ui-outline':p.outline,'--ui-text':p.text,'--ui-paper':p.paper,
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

/** Scene art and presentation stay outside the game rules. All layers share a canvas. */
export const TRANSFORMATION_SCENES:Record<ThemeId,{kind:'flip'|'depth'|'rays';background?:string;back?:string;glass?:string;frame?:string}>={
 neutral:{kind:'flip',back:'assets/flashcards/neutral-back.webp',frame:'assets/flashcards/neutral-front.webp'},
 forest:{kind:'depth',frame:'assets/flashcards/tree-hollow.webp'},
 space:{kind:'rays',background:'assets/flashcards/space-laboratory.webp',back:'assets/flashcards/camera-back.webp',glass:'assets/flashcards/camera-glass.webp',frame:'assets/flashcards/camera-frame.webp'}
};

