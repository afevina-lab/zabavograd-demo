import {visualClasses} from './classNames.ts';
import {useId,type CSSProperties} from 'react';
import {Button} from './Buttons.tsx';
import {numericScale} from './numericScale.ts';

export type QuantityProps={label:string;value:number;min:number;max:number;onChange:(value:number)=>void;disabled?:boolean;stops?:readonly number[]};
export type QuantityClasses={root:string;stepper:string};
const classes:QuantityClasses={root:'v-quantity',stepper:'v-stepper'};

/** Shared production renderer; adapters may supply classes while their CSS is migrated. */
export function Quantity({label,value,min,max,onChange,disabled=false,stops,classNames=classes}:{classNames?:QuantityClasses}&QuantityProps){
 classNames=visualClasses(classes,classNames);
 const id=useId(),scale=numericScale(min,max,stops),current=scale.index(value);
 const change=(next:number)=>{if(Number.isFinite(next))onChange(scale.clamp(next))};
 const style={'--quantity-fill':scale.percent(value)+'%'} as CSSProperties;
 return <div className={classNames.root} style={style}>
  <label htmlFor={id}>{label}</label>
  <div className={classNames.stepper}>
   <Button tone="secondary" size="stepper" aria-label={'Уменьшить: '+label} disabled={disabled||current<=scale.start} onClick={()=>change(scale.at(current-1))}>−</Button>
   <input type="number" disabled={disabled} aria-label={label+' — точное количество'} min={min} max={max} value={value} onChange={event=>{if(event.target.value)change(+event.target.value)}}/>
   <Button tone="secondary" size="stepper" aria-label={'Увеличить: '+label} disabled={disabled||current>=scale.end} onClick={()=>change(scale.at(current+1))}>+</Button>
  </div>
  <input id={id} type="range" aria-label={label+' — ползунок'} aria-valuetext={String(value)} disabled={disabled||scale.end<=scale.start} min={scale.start} max={scale.end} step={1} value={current} onChange={event=>change(scale.at(+event.target.value))}/>
 </div>;
}
