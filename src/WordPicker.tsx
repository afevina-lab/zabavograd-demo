import {useRef,useState} from 'react';
import type {Word} from './material-types.ts';
export function WordPicker({words,selected,onConfirm}:{words:Word[];selected:string[];onConfirm:(ids:string[])=>void}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [draft,setDraft]=useState<string[]>([]),[search,setSearch]=useState('');
 const close=()=>{dialog.current?.close();trigger.current?.focus()};
 return <><button type="button" ref={trigger} onClick={()=>{setDraft([...selected]);setSearch('');dialog.current?.showModal()}}>Выбрать карточки · {selected.length}</button><dialog className="sound-picker-dialog" ref={dialog} aria-label="Выбор карточек" onCancel={()=>trigger.current?.focus()}><h2>Карточки занятия</h2><label>Поиск<input value={search} onChange={e=>setSearch(e.target.value)}/></label><p>Выбрано: {draft.length}</p><div>{words.filter(w=>w.label.toLocaleLowerCase('ru').includes(search.toLocaleLowerCase('ru'))).map(w=><label className="check" key={w.id}><input type="checkbox" checked={draft.includes(w.id)} onChange={e=>setDraft(ids=>e.target.checked?[...ids,w.id]:ids.filter(id=>id!==w.id))}/>{w.label}</label>)}</div><div className="sound-picker-actions"><button className="primary" disabled={!draft.length} onClick={()=>{onConfirm(draft);close()}}>ОК</button><button onClick={close}>Отмена</button></div></dialog></>;
}
