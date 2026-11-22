import {createContext,useContext,useEffect,useId} from 'react';
import type {Learning} from '../learning.ts';
import type {Filters} from '../material-types.ts';
export type PresetSource={label:string;learning:Learning;filters:Filters};
export type PresetContextValue={register:(id:string,getSource:()=>PresetSource)=>()=>void;revision:number;refresh:()=>void};
export const MaterialPresetContext=createContext<PresetContextValue|null>(null);
export function usePresetSource(source:PresetSource,enabled=true){
 const context=useContext(MaterialPresetContext),id=useId();
 useEffect(()=>{
  if(!enabled||!context)return;
  return context.register(id,()=>source);
 },[context,id,source.label,source.learning,source.filters,enabled]);
}
