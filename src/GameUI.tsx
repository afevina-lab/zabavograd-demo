import {SelectControl,selectIcon} from './design-system/SelectControl.tsx';
import {SettingsDisclosure} from './design-system/SettingsDisclosure.tsx';
import {QuantitySlider} from './QuantitySlider.tsx';
import type {LifeMode} from './life-policy.ts';
import React from 'react';
import {Effects} from './Effects.tsx';
import {THEMES,THEME_IDS,type ThemeId} from './design-system/themes.ts';
import {SceneLayers} from './design-system/SceneLayers.tsx';
import {MOTION} from './design-system/motion.ts';
const iconFiles:Record<string,string> = {
 Settings:'settings.svg',Save:'save.svg',Trash:'trash.svg',Pause:'pause.svg',RightArrow1:'arrow-right.svg',
 Home1:'house.svg',Question:'question-mark.svg',Star:'star.svg',
 X:'cross.svg',Check:'check.svg',Sight:'expand.svg',Return1:'refresh.svg',
 Sound:'volume.svg',SoundOff:'mute.svg',Heart:'heart.svg'
};
export function Icon({name}:{name:string}){
 const src=import.meta.env.BASE_URL+'assets/icons-new/'+(iconFiles[name]||'star.svg');
 return <span className="garden-icon" aria-hidden="true" style={{maskImage:`url("${src}")`,WebkitMaskImage:`url("${src}")`}}/>;
}
/** Single result-award illustration: same timing and shape in every game. */
export function ScoreStars({value}:{value:number}){
 const score=Math.max(0,Math.min(3,Math.round(value)));
 return <span className="victory-stars" role="img" aria-label={score+' из 3 звёзд'}>{[0,1,2].map(i=>
  <span key={i} style={{'--zg-award-delay':String(MOTION.awardDelayMs+i*MOTION.awardStaggerMs)+'ms','--zg-star-launch-x':`${(1-i)*96}px`} as React.CSSProperties}>
   <span aria-hidden="true" className={'victory-star'+(i<score?'':' victory-star-empty')+(i<score?' victory-star-shining':'')}/>
  </span>)}</span>;
}
export function ThemePicker({theme,setTheme}:{theme:ThemeId;setTheme:(v:ThemeId)=>void}){
 return <div className="theme-section"><div className="themes">{THEME_IDS.map(id=><button type="button" key={id} onClick={()=>setTheme(id)} className={theme===id?'selected':''} aria-pressed={theme===id}><i className={id} style={{backgroundColor:THEMES[id].palette.accent,backgroundImage:THEMES[id].scene.background?`url("${import.meta.env.BASE_URL+THEMES[id].scene.background}")`:undefined}}/>{THEMES[id].label}</button>)}</div></div>;
}
export function Scenery({theme,celebrate=false}:{theme:ThemeId;celebrate?:boolean}){
 return <><SceneLayers theme={theme}/><Effects theme={theme} celebrate={celebrate}/></>;
}
export function Challenges({timed,setTimed,seconds,setSeconds,lives,setLives,lifeMode='manual',setLifeMode}:{timed:boolean;setTimed:(v:boolean)=>void;seconds:number;setSeconds:(v:number)=>void;lives:boolean;setLives:(v:boolean)=>void;lifeMode?:LifeMode;setLifeMode?:(v:LifeMode)=>void}){return <SettingsDisclosure className="challenge" title="Время и жизни" description="" icon="Heart"><label className="check"><input type="checkbox" role="switch" checked={timed} onChange={e=>setTimed(e.target.checked)}/>На время</label>{timed&&<QuantitySlider label="Лимит времени, мин." value={Math.round(seconds/60)} min={1} max={5} onChange={minutes=>setSeconds(minutes*60)}/>} <label className="check"><input type="checkbox" role="switch" checked={lives} onChange={e=>setLives(e.target.checked)}/>5 жизней</label>{lives&&setLifeMode&&<label>Списание жизней<SelectControl icon={selectIcon("Списание жизней")} aria-label="Списание жизней" value={lifeMode} onChange={e=>setLifeMode(e.target.value as LifeMode)}><option value="manual">Вручную: кнопка, сердце или F8</option><option value="mistakes">За ошибочный ответ</option><option value="both">Вручную и за ошибки</option></SelectControl></label>}</SettingsDisclosure>}
