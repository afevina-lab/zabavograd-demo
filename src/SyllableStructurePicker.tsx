import {useRef,useState} from 'react';
import {ControlWell} from './design-system/ControlWell.tsx';
import {defaultFilters,type Filters} from './model.ts';

/** Transactional lexical syllable-structure selection: no large inline grid. */
export function SyllableStructurePicker({filters,onChange}:{filters:Filters;onChange:(update:Partial<Filters>)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [types,setTypes]=useState<number[]>(filters.types),[untyped,setUntyped]=useState(filters.untyped);
 const open=()=>{setTypes([...filters.types]);setUntyped(filters.untyped);dialog.current?.showModal()};
 const close=()=>{dialog.current?.close();trigger.current?.focus()};
 return <>
  <button type="button" className="category-picker-trigger syllable-picker-trigger" ref={trigger} onClick={open}>
   <span className="setup-action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6"/></svg></span>
   <span className="setup-action-copy"><strong>Выберите слоговую структуру</strong><small>{filters.types.length===defaultFilters.types.length&&filters.untyped?'Слова любой слоговой структуры':`Выбрано типов: ${filters.types.length}`}</small></span><ControlWell symbol="plus"/>
  </button>
  <dialog ref={dialog} className="sound-picker-dialog syllable-picker-dialog" aria-label="Выбор слоговой структуры" onCancel={()=>trigger.current?.focus()}>
   <div className="panel-scroll"><h2>Слоговая структура</h2>
    <label className="check"><input type="checkbox" checked={types.length===defaultFilters.types.length&&untyped} onChange={e=>{setTypes(e.target.checked?[...defaultFilters.types]:[]);setUntyped(e.target.checked)}}/>Выбрать всё</label>
    <div className="types syllable-picker-grid">{defaultFilters.types.map(n=><label className="check" key={n}><input type="checkbox" checked={types.includes(n)} onChange={e=>setTypes(v=>e.target.checked?[...v,n]:v.filter(x=>x!==n))}/>{n}</label>)}</div>
    <label className="check"><input type="checkbox" checked={untyped} onChange={e=>setUntyped(e.target.checked)}/>Без категории</label>
   </div>
   <div className="sound-picker-actions"><button className="primary" type="button" onClick={()=>{onChange({types,untyped});close()}}>Готово</button><button className="secondary" type="button" onClick={close}>Отмена</button></div>
  </dialog>
 </>;
}
