import {visualClasses} from '../primitives/classNames.ts';
import type {CSSProperties} from 'react';
import {MOTION} from '../../design-system/motion.ts';
export type AmbientClasses={root:string;celebrate:string;star:string;shape:string;comet:string;cometOne:string;cometTwo:string};
const classes:AmbientClasses={root:'v-ambient-effects',celebrate:'is-celebrating',star:'v-ambient-star',shape:'v-ambient-star-shape',comet:'v-ambient-comet',cometOne:'v-comet-one',cometTwo:'v-comet-two'};
export function AmbientEffects({stars,comets,celebrate=false,classNames=classes}:{stars:number;comets:number;celebrate?:boolean;classNames?:AmbientClasses}){
 classNames=visualClasses(classes,classNames);
 if(stars===0&&comets===0)return null;
 const style={'--v-ambient-sway':MOTION.ambientSwayMs+'ms','--v-ambient-twinkle':MOTION.ambientTwinkleMs+'ms','--v-ambient-celebrate':MOTION.ambientCelebrateMs+'ms','--v-comet-one':MOTION.cometOneMs+'ms','--v-comet-two':MOTION.cometTwoMs+'ms','--v-comet-delay':MOTION.cometDelayMs+'ms'} as CSSProperties;
 return <div className={classNames.root+(celebrate?' '+classNames.celebrate:'')} style={style} aria-hidden="true">
  {Array.from({length:stars},(_,index)=><span key={index} className={classNames.star} style={{left:((index*37+7)%97)+'%',top:((index*53+11)%95)+'%',width:(index%3+1)*4+6+'px',animationDelay:-(index*.9)+'s','--twinkle-delay':index*.65+'s'} as CSSProperties}><i className={classNames.shape}/></span>)}
  {Array.from({length:comets},(_,index)=><span key={index} className={classNames.comet+' '+(index%2?classNames.cometTwo:classNames.cometOne)}/>)}
 </div>;
}

