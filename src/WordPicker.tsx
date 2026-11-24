import {orderedWords} from './word-choice-order.ts';
import {IconButton} from './visual/primitives/Buttons.tsx';
import {SearchChoices} from './visual/compositions/SearchChoices.tsx';
import {useRef,useState} from 'react';
import type {Word} from './material-types.ts';
export function WordChoices({words,selected,onChange,search,setSearch,max=Infinity,eligibleIds}:{words:Word[];selected:string[];onChange:(ids:string[])=>void;search:string;setSearch:(s:string)=>void;max?:number;eligibleIds?:string[]}){
 return <SearchChoices items={orderedWords(words,selected,eligibleIds)} selected={selected} onChange={onChange} search={search} setSearch={setSearch} max={max} classNames={{root:'word-selection',search:'settings-search-field',list:'word-picker',choice:'check'}}/>;
}
export function WordSelectionBody({words,selected,onChange,search,setSearch,onConfirm,onCancel,max=100,eligibleIds,disabled=false}:{words:Word[];selected:string[];onChange:(ids:string[])=>void;search:string;setSearch:(s:string)=>void;onConfirm:()=>void;onCancel:()=>void;max?:number;eligibleIds?:string[];disabled?:boolean}){return <div className="panel-scroll"><h2>Карточки</h2><p>Выбрано: {selected.length}</p><WordChoices words={words} selected={selected} onChange={onChange} search={search} setSearch={setSearch} max={max} eligibleIds={eligibleIds}/><div className="sound-picker-actions"><button type="button" className="primary" disabled={disabled||!selected.length||selected.length>max} onClick={onConfirm}>Готово</button><button type="button" className="secondary" onClick={onCancel}>Отмена</button></div></div>}
export function WordPicker({words,selected,onConfirm,max=100,eligibleIds}:{words:Word[];selected:string[];onConfirm:(ids:string[])=>void;max?:number;eligibleIds?:string[]}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [draft,setDraft]=useState<string[]>([]),[search,setSearch]=useState('');
 const close=()=>{dialog.current?.close();trigger.current?.focus()};
 return <><IconButton className="icon-button" label="Выбрать слова вручную" icon="Settings" ref={trigger} onClick={()=>{setDraft([...selected]);setSearch('');dialog.current?.showModal()}}/><dialog className="sound-picker-dialog word-selection-dialog" ref={dialog} aria-label="Карточки" onCancel={()=>trigger.current?.focus()}><WordSelectionBody words={words} selected={draft} onChange={setDraft} search={search} setSearch={setSearch} max={max} eligibleIds={eligibleIds} onConfirm={()=>{onConfirm(draft);window.dispatchEvent(new CustomEvent('zg:manual-word-selection',{detail:{ids:draft}}));close()}} onCancel={close}/></dialog></>;
}

