import {orderedWords} from './word-choice-order.ts';
import {Icon} from './GameUI.tsx';
import {useRef,useState} from 'react';
import type {Word} from './material-types.ts';
export function WordChoices({words,selected,onChange,search,setSearch,max=Infinity,eligibleIds}:{words:Word[];selected:string[];onChange:(ids:string[])=>void;search:string;setSearch:(s:string)=>void;max?:number;eligibleIds?:string[]}){
 return <div className="word-selection"><input type="search" className="settings-search-field" aria-label="Поиск" placeholder="Поиск" value={search} onChange={e=>setSearch(e.target.value)}/><div className="word-picker">{orderedWords(words,selected,eligibleIds).filter(w=>w.label.toLocaleLowerCase('ru').includes(search.trim().toLocaleLowerCase('ru'))).map(w=><label className="check" key={w.id}><input type="checkbox" disabled={!selected.includes(w.id)&&selected.length>=max} checked={selected.includes(w.id)} onChange={e=>onChange(e.target.checked?[...selected,w.id]:selected.filter(id=>id!==w.id))}/><span>{w.label}</span></label>)}</div></div>;
}
export function WordPicker({words,selected,onConfirm,max=100,eligibleIds}:{words:Word[];selected:string[];onConfirm:(ids:string[])=>void;max?:number;eligibleIds?:string[]}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [draft,setDraft]=useState<string[]>([]),[search,setSearch]=useState('');
 const close=()=>{dialog.current?.close();trigger.current?.focus()};
 return <><button type="button" className="icon-button" aria-label="Выбрать слова вручную" title="Выбрать слова вручную" ref={trigger} onClick={()=>{setDraft([...selected]);setSearch('');dialog.current?.showModal()}}><Icon name="Settings"/></button><dialog className="sound-picker-dialog word-selection-dialog" ref={dialog} aria-label="Выбор карточек" onCancel={()=>trigger.current?.focus()}><div className="panel-scroll"><h2>Карточки занятия</h2><p>Выбрано: {draft.length}</p><WordChoices words={words} selected={draft} onChange={setDraft} search={search} setSearch={setSearch} max={max} eligibleIds={eligibleIds}/><div className="sound-picker-actions"><button className="primary" disabled={!draft.length||draft.length>max} onClick={()=>{onConfirm(draft);window.dispatchEvent(new CustomEvent('zg:manual-word-selection',{detail:{ids:draft}}));close()}}>ОК</button><button type="button" className="secondary" onClick={close}>Отмена</button></div></div></dialog></>;
}
