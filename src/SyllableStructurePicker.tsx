import {useRef,useState} from 'react';
import {PickerTrigger} from './design-system/PickerTrigger.tsx';
import {PickerDialog} from './design-system/PickerDialog.tsx';
import {Choice} from './visual/primitives/Choice.tsx';
import {defaultFilters,type Filters,type Word} from './model.ts';

/** Transactional lexical syllable-structure selection: no large inline grid. */
function showHelp(button:HTMLButtonElement,x?:number,y?:number){const tip=button.querySelector<HTMLElement>('[popover]');if(!tip)return;tip.showPopover();const r=button.getBoundingClientRect(),t=tip.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(innerWidth-t.width-8,(x??(r.x+r.width/2))-t.width/2))+'px';tip.style.top=Math.max(8,Math.min(innerHeight-t.height-8,(y??r.bottom)+8+t.height<=innerHeight-8?(y??r.bottom)+8:(y??r.y)-t.height-8))+'px';}
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
 const open=()=>{setTypes([...filters.types]);setUntyped(filters.untyped);dialog.current?.showModal();requestAnimationFrame(()=>{const active=document.activeElement;if(active instanceof HTMLButtonElement&&active.classList.contains('syllable-type-option'))showHelp(active)})};
 const close=()=>{dialog.current?.close();trigger.current?.focus()};
 return <>
  <PickerTrigger className="syllable-picker-trigger" ref={trigger} onClick={open} title="Выберите слоговую структуру" description={filters.types.length===defaultFilters.types.length&&filters.untyped?'Слова любой слоговой структуры':`Выбрано типов: ${filters.types.length}`} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6"/></svg>}/>
  <PickerDialog ref={dialog} className="syllable-picker-dialog" scrollClassName="syllable-picker-scroll" label="Выбор слоговой структуры" onDismiss={()=>trigger.current?.focus()} onConfirm={()=>{onChange({types,untyped});close()}} onCancel={close}>
   <div className="syllable-picker-body"><h2>Слоговая структура</h2>
    <Choice className="check" label="Выбрать всё" checked={types.length===defaultFilters.types.length&&untyped} onChange={checked=>{setTypes(checked?[...defaultFilters.types]:[]);setUntyped(checked)}}/>
    <div className="types syllable-picker-grid">{defaultFilters.types.map(n=>{
     const description=descriptions[n]||'Тип слоговой структуры '+n;
     const examples=words.filter(w=>w.type===n).slice(0,3).map(w=>w.label).join(', ');
     const selected=types.includes(n);
     return <button type="button" key={n} className="syllable-type-option" aria-pressed={selected} onMouseEnter={e=>showHelp(e.currentTarget,e.clientX,e.clientY)} onMouseMove={e=>showHelp(e.currentTarget,e.clientX,e.clientY)} onMouseLeave={e=>hideHelp(e.currentTarget)} onFocus={e=>showHelp(e.currentTarget)} onBlur={e=>hideHelp(e.currentTarget)} aria-label={`Тип ${n}: ${description}`} onClick={()=>setTypes(v=>selected?v.filter(x=>x!==n):[...v,n])}>{n}<span popover="manual" className="syllable-type-tooltip" role="tooltip">{description}{examples&&<small>Например: {examples}</small>}</span></button>;
    })}</div>
    <button type="button" className="syllable-type-option syllable-untyped" aria-pressed={untyped} onClick={()=>setUntyped(v=>!v)}>Без категории</button>
   </div>
  </PickerDialog>
 </>;
}

