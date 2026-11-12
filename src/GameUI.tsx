import React from 'react';
import {Effects} from './Effects.tsx';
import {THEMES,THEME_IDS,type ThemeId} from './design-system/themes.ts';
import {SceneLayers} from './design-system/SceneLayers.tsx';
import {MOTION} from './design-system/motion.ts';
const iconFiles:Record<string,string> = {
 Settings:'settings.svg',Pause:'pause.svg',RightArrow1:'arrow-right.svg',
 Home1:'house.svg',Question:'question-mark.svg',Star:'star.svg',
 X:'cross.svg',Sight:'expand.svg',Return1:'refresh.svg',
 Sound:'volume.svg',SoundOff:'mute.svg',Heart:'heart.svg'
};
export function Icon({name}:{name:string}){
 const src=import.meta.env.BASE_URL+'assets/icons-new/'+(iconFiles[name]||'star.svg');
 return <span className="garden-icon" aria-hidden="true" style={{maskImage:`url("${src}")`,WebkitMaskImage:`url("${src}")`}}/>;
}
/** Single result-award illustration: same timing and shape in every game. */
export function ScoreStars({value}:{value:number}){
 const score=Math.max(0,Math.min(3,Math.round(value)));
 return <span className="victory-stars">{[0,1,2].map(i=>
  <span key={i} style={{animationDelay:String(MOTION.awardDelayMs+i*MOTION.awardStaggerMs)+'ms'}}>
   <span className={'victory-star'+(i<score?'':' victory-star-empty')}><Icon name="Star"/></span>
  </span>)}</span>;
}
export function ThemePicker({theme,setTheme}:{theme:ThemeId;setTheme:(v:ThemeId)=>void}){
 return <div className="theme-section"><label className="field-label">Оформление</label><div className="themes">{THEME_IDS.map(id=><button key={id} onClick={()=>setTheme(id)} className={theme===id?'selected':''} aria-pressed={theme===id}><i className={id} style={{backgroundColor:THEMES[id].palette.accent}}/>{THEMES[id].label}</button>)}</div></div>;
}
export function Scenery({theme,celebrate=false}:{theme:ThemeId;celebrate?:boolean}){
 return <><SceneLayers theme={theme}/><Effects theme={theme} celebrate={celebrate}/></>;
}
export function Challenges({timed,setTimed,seconds,setSeconds,lives,setLives}:{timed:boolean;setTimed:(v:boolean)=>void;seconds:number;setSeconds:(v:number)=>void;lives:boolean;setLives:(v:boolean)=>void}){return <details className="filter-details challenge"><summary>Время и жизни <span>по желанию</span></summary><label className="check"><input type="checkbox" checked={timed} onChange={e=>setTimed(e.target.checked)}/>На время</label>{timed&&<label>Лимит<select value={seconds} onChange={e=>setSeconds(+e.target.value)}>{[60,120,180,300].map(n=><option key={n} value={n}>{n/60} мин.</option>)}</select></label>}<label className="check"><input type="checkbox" checked={lives} onChange={e=>setLives(e.target.checked)}/>5 жизней</label><p className="hint">Жизни снимает педагог: F8 — половинка сердца, F9 — отменить. Ошибки не отнимают жизни.</p></details>}
