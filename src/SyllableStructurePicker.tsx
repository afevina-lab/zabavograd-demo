import {useRef,useState} from 'react';
import {ControlWell} from './design-system/ControlWell.tsx';
import {defaultFilters,type Filters,type Word} from './model.ts';

/** Transactional lexical syllable-structure selection: no large inline grid. */
function showHelp(button:HTMLButtonElement){const tip=button.querySelector<HTMLElement>('[popover]');if(!tip)return;tip.showPopover();const r=button.getBoundingClientRect(),t=tip.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(innerWidth-t.width-8,r.x+(r.width-t.width)/2))+'px';tip.style.top=Math.max(8,Math.min(innerHeight-t.height-8,r.y>=t.height+12?r.y-t.height-8:r.bottom+8))+'px';}
function hideHelp(button:HTMLButtonElement){button.querySelector<HTMLElement>('[popover]')?.hidePopover();}
export function SyllableStructurePicker({filters,onChange,words=[]}:{filters:Filters;onChange:(update:Partial<Filters>)=>void;words?:Word[]}){
 const descriptions:Record<number,string>={
  1:'Двусложные слова из открытых слогов',2:'Трёхсложные слова из открытых слогов',
  3:'Односложные слова',4:'Двусложные слова с закрытым слогом',
  5:'Двусложные слова со стечением согласных в середине',
  6:'Двусложные слова с закрытым слогом и стечением',
  7:'Трёхсложные слова с закрытым слогом',
  8:'Трёхсложные слова со стечением в середине',
  9:'Трёхсложные слова со стечением и закрытым слогом',
  10:'Трёхсложные слова с двумя стечениями согласных',
  11:'Односложные слова со стечением согласных',
  12:'Двусложные слова с двумя стечениями',
  13:'Четырёхсложные слова из открытых слогов',
  14:'Четырёхсложные слова со сложной слоговой структурой'
 };
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
   <div className="panel-scroll syllable-picker-scroll"><div className="syllable-picker-body"><h2>Слоговая структура</h2>
    <label className="check"><input type="checkbox" checked={types.length===defaultFilters.types.length&&untyped} onChange={e=>{setTypes(e.target.checked?[...defaultFilters.types]:[]);setUntyped(e.target.checked)}}/>Выбрать всё</label>
    <div className="types syllable-picker-grid">{defaultFilters.types.map(n=>{
     const description=descriptions[n]||'Тип слоговой структуры '+n;
     const examples=words.filter(w=>w.type===n).slice(0,3).map(w=>w.label).join(', ');
     const selected=types.includes(n);
     return <button type="button" key={n} className="syllable-type-option" aria-pressed={selected} onMouseEnter={e=>showHelp(e.currentTarget)} onMouseLeave={e=>hideHelp(e.currentTarget)} onFocus={e=>showHelp(e.currentTarget)} onBlur={e=>hideHelp(e.currentTarget)} aria-label={`Тип ${n}: ${description}`} onClick={()=>setTypes(v=>selected?v.filter(x=>x!==n):[...v,n])}>{n}<span popover="manual" className="syllable-type-tooltip" role="tooltip">{description}{examples&&<small>Например: {examples}</small>}</span></button>;
    })}</div>
    <button type="button" className="syllable-type-option syllable-untyped" aria-pressed={untyped} onClick={()=>setUntyped(v=>!v)}>Без категории</button>
   </div></div>
   <div className="sound-picker-actions"><button className="primary" type="button" onClick={()=>{onChange({types,untyped});close()}}>Готово</button><button className="secondary" type="button" onClick={close}>Отмена</button></div>
  </dialog>
 </>;
}
