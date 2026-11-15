import {useId} from 'react';
export function QuantitySlider({label,value,min,max,onChange}:{label:string;value:number;min:number;max:number;onChange:(value:number)=>void}){
 const id=useId(),change=(next:number)=>{if(Number.isFinite(next))onChange(Math.max(min,Math.min(max,Math.round(next))));};
 return <div className="quantity-slider"><label htmlFor={id}>{label}<output>{value}</output></label><div><button type="button" aria-label={'Уменьшить: '+label} disabled={value<=min} onClick={()=>change(value-1)}>−</button><input id={id} type="range" min={min} max={max} value={value} onChange={e=>change(+e.target.value)}/><button type="button" aria-label={'Увеличить: '+label} disabled={value>=max} onClick={()=>change(value+1)}>+</button><input type="number" aria-label={label+' — точное количество'} min={min} max={max} value={value} onChange={e=>{if(e.target.value)change(+e.target.value)}}/></div></div>;
}
