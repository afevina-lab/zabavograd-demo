import {useId,type CSSProperties} from 'react';
export function QuantitySlider({label,value,min,max,onChange,disabled=false,values}:{label:string;value:number;min:number;max:number;onChange:(value:number)=>void;disabled?:boolean;values?:readonly number[]}){
 const id=useId();
 const stops=values?.length?values.filter(v=>v>=min&&v<=max):undefined;
 const nearest=(number:number)=>stops?.reduce((best,n)=>Math.abs(n-number)<Math.abs(best-number)?n:best,stops[0])??number;
 const change=(next:number)=>{if(Number.isFinite(next))onChange(nearest(Math.max(min,Math.min(max,Math.round(next)))))};
 const current=stops?Math.max(0,stops.indexOf(nearest(value))):value;
 const trackMax=stops?stops.length-1:max,trackMin=stops?0:min;
 return <div className="quantity-slider" style={{'--quantity-fill':(trackMax===trackMin?0:Math.max(0,Math.min(100,(current-trackMin)/(trackMax-trackMin)*100)))+'%'} as CSSProperties}>
  <label htmlFor={id}>{label}</label>
  <div className="quantity-stepper">
   <button type="button" aria-label={'Уменьшить: '+label} disabled={disabled||current<=trackMin} onClick={()=>change(stops?stops[Math.max(0,current-1)]:value-1)}>−</button>
   <input type="number" disabled={disabled} aria-label={label+' — точное количество'} min={min} max={max} value={value} onChange={e=>{if(e.target.value)change(+e.target.value)}}/>
   <button type="button" aria-label={'Увеличить: '+label} disabled={disabled||current>=trackMax} onClick={()=>change(stops?stops[Math.min(trackMax,current+1)]:value+1)}>+</button>
  </div>
  <input id={id} type="range" disabled={disabled||trackMax<=trackMin} min={trackMin} max={trackMax} step={1} value={current} onChange={e=>change(stops?stops[+e.target.value]:+e.target.value)}/>
 </div>;
}
