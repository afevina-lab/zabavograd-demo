import {visualClasses} from './classNames.ts';
import type {CSSProperties} from 'react';
import {MOTION} from '../../design-system/motion.ts';
export type ScoreStarClasses={root:string;star:string;empty:string;shining:string};
const classes:ScoreStarClasses={root:'v-score-stars',star:'v-score-star',empty:'v-score-star-empty',shining:'v-score-star-shining'};
/** Single result-award illustration: same timing and shape in every game. */
export function ScoreStars({value,classNames=classes}:{value:number;classNames?:ScoreStarClasses}){
 classNames=visualClasses(classes,classNames);
 const score=Math.max(0,Math.min(3,Math.round(value)));
 return <span className={classNames.root} role="img" aria-label={score+' из 3 звёзд'}>{[0,1,2].map(i=>
  <span key={i} data-emphasis={i===1} style={{'--v-award-fly-duration':MOTION.awardFlyMs+'ms','--zg-award-delay':String(MOTION.awardDelayMs+i*MOTION.awardStaggerMs)+'ms','--zg-star-launch-x':`${(1-i)*96}px`} as CSSProperties}>
   <span aria-hidden="true" className={classNames.star+(i<score?'':' '+classNames.empty)+(i<score?' '+classNames.shining:'')}/>
  </span>)}</span>;
}


