import {Icon} from './GameUI.tsx';
import {useRef,useState} from 'react';
import type {Word} from './material-types.ts';
export function WordPicker({words,selected,onConfirm,max=100}:{words:Word[];selected:string[];onConfirm:(ids:string[])=>void;max?:number}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [draft,setDraft]=useState<string[]>([]),[search,setSearch]=useState('');
 const close=()=>{dialog.current?.close();trigger.current?.focus()};
 return <><button type="button" className="icon-button" aria-label="Выбрать слова вручную" title="Выбрать слова вручную" ref={trigger} onClick={()=>{setDraft([...selected]);setSearch('');dialog.current?.showModal()}}><Icon name="Settings"/></button><dialog className="sound-picker-dialog" ref={dialog} aria-label="Выбор карточек" onCancel={()=>trigger.current?.focus()}><div className="panel-scroll"><h2>Карточки занятия</h2><label>Поиск<input value={search} onChange={e=>setSearch(e.target.value)}/></label><p>Выбрано: {draft.length}</p><div>{words.filter(w=>w.label.toLocaleLowerCase('ru').includes(search.toLocaleLowerCase('ru'))).map(w=><label className="check" key={w.id}><input type="checkbox" disabled={!draft.includes(w.id)&&draft.length>=max} checked={draft.includes(w.id)} onChange={e=>setDraft(ids=>e.target.checked?[...ids,w.id]:ids.filter(id=>id!==w.id))}/>{w.label}</label>)}</div><div className="sound-picker-actions"><button className="primary" disabled={!draft.length||draft.length>max} onClick={()=>{onConfirm(draft);close()}}>ОК</button><button type="button" className="secondary" onClick={close}>Отмена</button></div></div></dialog></>;
}
