import {DecisionDialog} from '../visual/compositions/DecisionDialog.tsx';
import {useRef,useState} from 'react';
import {QuantitySlider} from '../QuantitySlider.tsx';
import {splitRounds,suggestedRounds,roundNoun,type RoundMaterial} from '../round-plan.ts';
export function useRoundPlan<T>(material:RoundMaterial){
 const [rounds,setRounds]=useState(1),[index,setIndex]=useState(0),[count,setCount]=useState(1),[award,setAward]=useState(0);
 const plan=useRef<T[][]>([]),position=useRef(0),scores=useRef<Map<number,number>>(new Map());
 const [pending,setPending]=useState<{count:number;accept:(count:number)=>void;original:number}|null>(null);
 function request(items:T[],launch:(first:T[])=>void,options:{text?:boolean;groupSize?:number;maxRounds?:number;key?:(item:T)=>string}={}){
  const configured=Math.max(1,Math.min(rounds,options.maxRounds??10,items.length||1));
  const begin=(number:number)=>{plan.current=splitRounds(items,number,options.key);position.current=0;scores.current.clear();setIndex(0);setCount(plan.current.length);setAward(0);setPending(null);launch(plan.current[0]||[])};
  const suggested=suggestedRounds(items.length,material,innerWidth,innerHeight,options);
  if(matchMedia('(max-width:700px), (pointer:coarse)').matches&&suggested>configured)setPending({count:suggested,accept:begin,original:configured});else begin(configured);
 }
 function repeat(launch:(first:T[])=>void){if(!plan.current.length)return;position.current=0;scores.current.clear();setIndex(0);setAward(0);setPending(null);launch(plan.current[0]);}
 function advance(stars:number){
  scores.current.set(position.current,stars);
  const weight=[...scores.current].reduce((n,[i,s])=>n+s*(plan.current[i]?.length||1),0),total=[...scores.current.keys()].reduce((n,i)=>n+(plan.current[i]?.length||1),0);setAward(Math.round(weight/Math.max(1,total)));
  if(position.current+1>=plan.current.length)return null;
  position.current++;setIndex(position.current);return plan.current[position.current];
 }
 return {rounds,setRounds,index,count,isLast:index+1>=count,award,request,advance,repeat,
  settings:(max=10)=><QuantitySlider label="Количество раундов" value={Math.min(rounds,max)} min={1} max={Math.max(1,max)} onChange={setRounds}/>,
  confirmation:pending&&<DecisionDialog title={`Разделить игру на ${pending.count} ${roundNoun(pending.count)}?`} description="Так карточки будут крупнее и удобнее на небольшом экране." onDismiss={()=>setPending(null)} classNames={{root:'modal gui-panel',scroll:'panel-scroll',actions:'round-plan-actions',primary:'primary',secondary:'secondary',quiet:'link'}} actions={[{id:'split',label:'Разделить',onClick:()=>pending.accept(pending.count)},{id:'keep',label:'Оставить как есть',tone:'secondary',onClick:()=>pending.accept(pending.original)},{id:'cancel',label:'Назад',tone:'quiet',onClick:()=>setPending(null)}]}/>};
}
