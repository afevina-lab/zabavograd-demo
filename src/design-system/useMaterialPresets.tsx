import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {PresetSource} from './MaterialPresetContext.tsx';
import {saveMaterialSet} from '../saved-material-sets.ts';
/** Shared settings behavior: both layouts register and save the same canonical material. */
export function useMaterialPresets(){
 const registry=useRef(new Map<string,()=>PresetSource>());
 const [revision,setRevision]=useState(0);
 const [candidates,setCandidates]=useState<PresetSource[]>([]);
 const [saveName,setSaveName]=useState('');
 const [saveSource,setSaveSource]=useState(0);
 const [saveError,setSaveError]=useState('');
 const [manualWordIds,setManualWordIds]=useState<string[]|null>(null);
 const saveDialog=useRef<HTMLDialogElement>(null);
 const saveTrigger=useRef<HTMLButtonElement>(null);
 const register=useCallback((id:string,getSource:()=>PresetSource)=>{
  registry.current.set(id,getSource);
  return ()=>{if(registry.current.get(id)===getSource)registry.current.delete(id)};
 },[]);
 const bridge=useMemo(()=>({register,revision,refresh:()=>setRevision(n=>n+1)}),[register,revision]);
 useEffect(()=>{
  const update=(event:Event)=>{
   const ids=(event as CustomEvent<{ids:string[]}>).detail?.ids;
   if(Array.isArray(ids))setManualWordIds([...new Set(ids)]);
  };
  window.addEventListener('zg:manual-word-selection',update);
  return ()=>window.removeEventListener('zg:manual-word-selection',update);
 },[]);
 const openSave=()=>{
  const current=[...registry.current.values()].map(getSource=>getSource());
  setCandidates(current);setSaveSource(0);setSaveName('');setSaveError('');
  saveDialog.current?.showModal();
 };
 const closeSave=()=>{saveDialog.current?.close();saveTrigger.current?.focus()};
 const saveNow=()=>{
  const source=candidates[saveSource];
  if(!source){setSaveError('Не найден учебный материал для сохранения.');return}
  try{
   const approvedIds=manualWordIds?.filter(id=>source.wordIds.includes(id))||[];
   const learning=approvedIds.length?{...source.learning,selectionMode:'approved' as const,approvedWordIds:approvedIds}:source.learning;
   saveMaterialSet({name:saveName,learning,filters:source.filters});
   bridge.refresh();closeSave();setManualWordIds(null);
  }catch(error){setSaveError((error as Error).message)}
 };
 return {bridge,candidates,saveName,setSaveName,saveSource,setSaveSource,saveError,manualWordIds,saveDialog,saveTrigger,openSave,closeSave,saveNow};
}
