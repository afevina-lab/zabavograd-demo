import {useId,type CSSProperties} from 'react';
import {numericScale} from './numericScale.ts';
export type RangeClasses={root:string;heading:string;track:string};
const classes:RangeClasses={root:'v-range',heading:'v-range-heading',track:'v-range-track'};

/** One shared track with two independently accessible endpoints. */
export function RangeControl({label,min,max,from,to,onChange,disabled=false,values,classNames=classes}:{label:string;min:number;max:number;from:number;to:number;onChange:(from:number,to:number)=>void;disabled?:boolean;values?:readonly number[];classNames?:RangeClasses}){
 const id=useId();
 const scale=numericScale(min,max,values);
 const {index,at:value,start:trackMin,end:trackMax}=scale;
 const lower=Math.max(min,Math.min(max,from));
 const upper=Math.max(lower,Math.min(max,to));
 const span=Math.max(1,trackMax-trackMin);
 const style={'--range-start':(index(lower)-trackMin)/span*100+'%','--range-end':(index(upper)-trackMin)/span*100+'%'} as CSSProperties;
 return <div className={classNames.root} style={style} role="group" aria-label={label}>
  <div className={classNames.heading}><strong>{label}</strong><output aria-live="off">{lower}–{upper}</output></div>
  <div className={classNames.track} onPointerDown={event=>{
   if(disabled||trackMax<=trackMin||event.target!==event.currentTarget)return;
   const rect=event.currentTarget.getBoundingClientRect();
   if(!rect.width)return;
   const next=Math.max(min,Math.min(max,value(Math.round(trackMin+(event.clientX-rect.left)/rect.width*(trackMax-trackMin)))));
   if(next<=lower)onChange(next,upper);
   else if(next>=upper)onChange(lower,next);
   else if(next-lower<=upper-next)onChange(next,upper);
   else onChange(lower,next);
  }}>
   <input id={id+'-from'} type="range" min={trackMin} max={trackMax} step={1} value={index(lower)} disabled={disabled||trackMax<=trackMin} aria-label={label+': от'} aria-valuetext={'От '+lower} onChange={event=>onChange(Math.min(value(+event.target.value),upper),upper)}/>
   <input id={id+'-to'} type="range" min={trackMin} max={trackMax} step={1} value={index(upper)} disabled={disabled||trackMax<=trackMin} aria-label={label+': до'} aria-valuetext={'До '+upper} onChange={event=>onChange(lower,Math.max(value(+event.target.value),lower))}/>
  </div>
 </div>;
}

