import type {CSSProperties} from 'react';
import {MOTION} from '../../design-system/motion.ts';
/** Single result-award illustration: same timing and shape in every game. */
export function ScoreStars({value}:{value:number}){
 const score=Math.max(0,Math.min(3,Math.round(value)));
 return <span className="victory-stars" role="img" aria-label={score+' из 3 звёзд'}>{[0,1,2].map(i=>
  <span key={i} style={{'--zg-award-delay':String(MOTION.awardDelayMs+i*MOTION.awardStaggerMs)+'ms','--zg-star-launch-x':`${(1-i)*96}px`} as CSSProperties}>
   <span aria-hidden="true" className={'victory-star'+(i<score?'':' victory-star-empty')+(i<score?' victory-star-shining':'')}/>
  </span>)}</span>;
}

