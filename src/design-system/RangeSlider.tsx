import {useId,type CSSProperties} from 'react';

/** One shared track with two independently accessible endpoints. */
export function RangeSlider({label,min,max,from,to,onChange,disabled=false,values}:{label:string;min:number;max:number;from:number;to:number;onChange:(from:number,to:number)=>void;disabled?:boolean;values?:readonly number[]}){
 const id=useId();
 const stops=values?.filter(v=>v>=min&&v<=max);
 const index=(v:number)=>stops?stops.reduce((best,n,i)=>Math.abs(n-v)<Math.abs(stops[best]-v)?i:best,0):v;
 const value=(v:number)=>stops?stops[v]:v;
 const trackMin=stops?0:min,trackMax=stops?stops.length-1:max;
 const lower=Math.max(min,Math.min(max,from));
 const upper=Math.max(lower,Math.min(max,to));
 const span=Math.max(1,trackMax-trackMin);
 const style={'--range-start':(index(lower)-trackMin)/span*100+'%','--range-end':(index(upper)-trackMin)/span*100+'%'} as CSSProperties;
 return <div className="range-slider" style={style} role="group" aria-label={label}>
  <div className="range-slider-heading"><strong>{label}</strong><output aria-live="off">{lower}–{upper}</output></div>
  <div className="range-slider-track" onPointerDown={event=>{
   if(disabled||min>=max||event.target!==event.currentTarget)return;
   const rect=event.currentTarget.getBoundingClientRect();
   if(!rect.width)return;
   const next=Math.max(min,Math.min(max,value(Math.round(trackMin+(event.clientX-rect.left)/rect.width*(trackMax-trackMin)))));
   if(next<=lower)onChange(next,upper);
   else if(next>=upper)onChange(lower,next);
   else if(next-lower<=upper-next)onChange(next,upper);
   else onChange(lower,next);
  }}>
   <input id={id+'-from'} type="range" min={trackMin} max={trackMax} step={1} value={index(lower)} disabled={disabled||min>=max} aria-label={label+': от'} aria-valuetext={'От '+lower} onChange={event=>onChange(Math.min(value(+event.target.value),upper),upper)}/>
   <input id={id+'-to'} type="range" min={trackMin} max={trackMax} step={1} value={index(upper)} disabled={disabled||min>=max} aria-label={label+': до'} aria-valuetext={'До '+upper} onChange={event=>onChange(lower,Math.max(value(+event.target.value),lower))}/>
  </div>
 </div>;
}
