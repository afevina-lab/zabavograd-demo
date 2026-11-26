import {useId,useMemo,useState} from 'react';
import {buildTaskPresets,findTaskPresets,type TaskPreset} from './task-presets.ts';
import type {Word} from './material-types.ts';
import {Button} from './visual/primitives/Buttons.tsx';
export function TaskSearch({words,onPick,accept=()=>true,describe}:{describe?:(preset:TaskPreset)=>string;words:Word[];accept?:(preset:TaskPreset)=>boolean;onPick:(preset:TaskPreset)=>void}){
 const id=useId(),[query,setQuery]=useState(''),[open,setOpen]=useState(false),[active,setActive]=useState(0),[notice,setNotice]=useState('');
 const presets=useMemo(()=>buildTaskPresets(words),[words]),options=findTaskPresets(presets.filter(accept),query),visible=open&&query.trim().length>0;
 const choose=(preset:TaskPreset)=>{onPick(structuredClone(preset));setQuery('');setNotice('Применено: '+preset.title);setOpen(false)};
 return <div className="v-task-search" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOpen(false)}}>
  <input className="v-input" aria-label="Поиск задачи" placeholder="Поиск задачи" role="combobox" aria-autocomplete="list" aria-expanded={visible} aria-controls={id} aria-activedescendant={visible&&options[active]?id+'-'+active:undefined} value={query} onFocus={()=>setOpen(true)} onChange={e=>{setQuery(e.target.value);setActive(0);setOpen(true);setNotice('')}} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.stopPropagation()}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);setActive(i=>Math.max(0,Math.min(options.length-1,i+(e.key==='ArrowDown'?1:-1))))}if(e.key==='Enter'&&visible&&options[active]){e.preventDefault();choose(options[active])}}}/>
  {visible&&<div id={id} className="v-task-suggestions" role="listbox" aria-label="Готовые задачи">{options.length?options.map((preset,index)=><Button key={preset.id} id={id+'-'+index} role="option" aria-selected={active===index} tone="quiet" size="suggestion" onMouseEnter={()=>setActive(index)} onClick={()=>choose(preset)}><strong>{preset.title}</strong><small>{describe?describe(preset):preset.description}</small></Button>):<p>Подходящих задач нет. Попробуйте другую тему или звук.</p>}</div>}
  <span className="v-task-search-notice" role="status">{notice}</span>
 </div>;
}
