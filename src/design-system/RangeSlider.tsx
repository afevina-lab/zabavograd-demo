import {useId,type CSSProperties} from 'react';

/** One shared track with two independently accessible endpoints. */
export function RangeSlider({label,min,max,from,to,onChange,disabled=false}:{label:string;min:number;max:number;from:number;to:number;onChange:(from:number,to:number)=>void;disabled?:boolean}){
 const id=useId();
 const lower=Math.max(min,Math.min(max,from));
 const upper=Math.max(lower,Math.min(max,to));
 const span=Math.max(1,max-min);
 const style={'--range-start':(lower-min)/span*100+'%','--range-end':(upper-min)/span*100+'%'} as CSSProperties;
 return <div className="range-slider" style={style} role="group" aria-label={label}>
  <div className="range-slider-heading"><strong>{label}</strong><output aria-live="off">{lower}–{upper}</output></div>
  <div className="range-slider-track" onPointerDown={event=>{
   if(disabled||min>=max||event.target!==event.currentTarget)return;
   const rect=event.currentTarget.getBoundingClientRect();
   if(!rect.width)return;
   const next=Math.max(min,Math.min(max,Math.round(min+(event.clientX-rect.left)/rect.width*(max-min))));
   if(next<=lower)onChange(next,upper);
   else if(next>=upper)onChange(lower,next);
   else if(next-lower<=upper-next)onChange(next,upper);
   else onChange(lower,next);
  }}>
   <input id={id+'-from'} type="range" min={min} max={max} step={1} value={lower} disabled={disabled||min>=max} aria-label={label+': от'} aria-valuetext={'От '+lower} onChange={event=>onChange(Math.min(+event.target.value,upper),upper)}/>
   <input id={id+'-to'} type="range" min={min} max={max} step={1} value={upper} disabled={disabled||min>=max} aria-label={label+': до'} aria-valuetext={'До '+upper} onChange={event=>onChange(lower,Math.max(+event.target.value,lower))}/>
  </div>
  <div className="range-slider-ends"><span>{min}</span><span>{max}</span></div>
 </div>;
}
