import type {CSSProperties} from 'react';
import {THEMES,type ThemeId} from './design-system/themes.ts';
/** Ambient accents configured by each scene, no theme conditionals. */
export function Effects({theme,celebrate}:{theme:ThemeId;celebrate:boolean}){
 const {stars,comets}=THEMES[theme].scene.effects;
 if(stars===0&&comets===0)return null;
 return <div className={'effects sky-stars '+(celebrate?'sky-celebrate':'')} aria-hidden="true">
  {Array.from({length:stars},(_,i)=><span key={i} className="sky-star" style={{left:((i*37+7)%97)+'%',top:((i*53+11)%95)+'%',width:(i%3+1)*4+6+'px',animationDelay:-(i*.9)+'s','--twinkle-delay':i*.65+'s'} as CSSProperties}><i className="procedural-star"/></span>)}
  {Array.from({length:comets},(_,i)=><span key={i} className={'procedural-comet '+(i%2?'comet-two':'comet-one')}/>)}
 </div>;
}
