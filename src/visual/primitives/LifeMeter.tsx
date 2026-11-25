import {visualClasses} from './classNames.ts';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {MOTION} from '../../design-system/motion.ts';
export type LifeMeterClasses={root:string;button:string;heart:string;full:string;half:string;leaving:string};
const classes:LifeMeterClasses={root:'v-life-meter',button:'v-life-button',heart:'v-life-heart',full:'v-heart-full',half:'v-heart-half',leaving:'v-heart-leaving'};
export function LifeMeter({lives,maximum=5,disabled,manual,onSpend,onUndo,classNames=classes}:{lives:number;maximum?:number;disabled:boolean;manual:boolean;onSpend:()=>void;onUndo:()=>void;classNames?:LifeMeterClasses}){
 classNames=visualClasses(classes,classNames);
 const previous=useRef(lives),[fading,setFading]=useState<{index:number;amount:number;key:number}[]>([]);
 useEffect(()=>{
  const before=previous.current;previous.current=lives;
  if(lives>=before){setFading([]);return;}
  setFading(Array.from({length:maximum},(_,index)=>({index,amount:Math.max(0,Math.min(1,before-index)),key:Date.now()})).filter(value=>value.amount>Math.max(0,Math.min(1,lives-value.index))));
  const timer=setTimeout(()=>setFading([]),MOTION.lifeLossMs);
  return ()=>clearTimeout(timer);
 },[lives,maximum]);
 const image=(amount:number)=>import.meta.env.BASE_URL+'assets/rewards/'+(amount===.5?'heart-half':'heart')+'.webp';
 return <span className={classNames.root}><button type="button" className={classNames.button} aria-label={'Жизни: '+lives+'; снять половину жизни'} disabled={disabled||!manual} title="Нажатие или F8 — снять половину жизни. F9 или контекстное меню — отменить." onContextMenu={event=>{event.preventDefault();onUndo()}} onClick={onSpend}>
  {Array.from({length:maximum},(_,index)=>{
   const amount=Math.max(0,Math.min(1,lives-index));
   return <span key={index} className={classNames.heart}>
    {amount>0&&<img alt="" className={amount===.5?classNames.half:classNames.full} src={image(amount)}/>}
    {fading.filter(value=>value.index===index).map(value=><img key={value.key} alt="" className={classNames.leaving+' '+(value.amount===.5?classNames.half:classNames.full)} style={{'--zg-life-loss-duration':MOTION.lifeLossMs+'ms'} as CSSProperties} src={image(value.amount)}/>)}
   </span>;
  })}
 </button></span>;
}
