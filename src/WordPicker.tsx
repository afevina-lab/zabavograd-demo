import {SelectionPanel} from './visual/compositions/SelectionPanel.tsx';
import {PickerDialog} from './design-system/PickerDialog.tsx';
import {SelectionActions} from './visual/compositions/SelectionActions.tsx';
import {orderedWords} from './word-choice-order.ts';
import {IconButton} from './visual/primitives/Buttons.tsx';
import {SearchChoices} from './visual/compositions/SearchChoices.tsx';
import {useRef,useState} from 'react';
import type {Word} from './material-types.ts';
export function WordChoices({words,selected,onChange,search,setSearch,max=Infinity,eligibleIds}:{words:Word[];selected:string[];onChange:(ids:string[])=>void;search:string;setSearch:(s:string)=>void;max?:number;eligibleIds?:string[]}){
 return <SearchChoices items={orderedWords(words,selected,eligibleIds)} selected={selected} onChange={onChange} search={search} setSearch={setSearch} max={max} classNames={{root:'word-selection',search:'settings-search-field',list:'word-picker',choice:'check'}}/>;
}
export function WordSelectionBody({words,selected,onChange,search,setSearch,onConfirm,onCancel,max=100,eligibleIds,disabled=false}:{words:Word[];selected:string[];onChange:(ids:string[])=>void;search:string;setSearch:(s:string)=>void;onConfirm:()=>void;onCancel:()=>void;max?:number;eligibleIds?:string[];disabled?:boolean}){return <SelectionPanel content={<> <h2>Карточки</h2><p>Выбрано: {selected.length}</p><WordChoices words={words} selected={selected} onChange={onChange} search={search} setSearch={setSearch} max={max} eligibleIds={eligibleIds}/></>} actions={<SelectionActions classNames={{actions:"sound-picker-actions",confirm:"primary",cancel:"secondary"}} disabled={disabled||!selected.length||selected.length>max} onConfirm={onConfirm} onCancel={onCancel}/>}/>}
export function WordPicker({words,selected,onConfirm,max=100,eligibleIds}:{words:Word[];selected:string[];onConfirm:(ids:string[])=>void;max?:number;eligibleIds?:string[]}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [draft,setDraft]=useState<string[]>([]),[search,setSearch]=useState('');
 const close=()=>{dialog.current?.close();trigger.current?.focus()};
 const confirm=()=>{onConfirm(draft);window.dispatchEvent(new CustomEvent('zg:manual-word-selection',{detail:{ids:draft}}));close()};
 return <>
  <IconButton className="icon-button" label="Выбрать слова вручную" icon="Settings" ref={trigger} onClick={()=>{setDraft([...selected]);setSearch('');dialog.current?.showModal()}}/>
  <PickerDialog className="word-selection-dialog" ref={dialog} label="Карточки" onDismiss={()=>trigger.current?.focus()} onConfirm={confirm} onCancel={close} confirmDisabled={!draft.length||draft.length>max}>
   <h2>Карточки</h2><p>Выбрано: {draft.length}</p>
   <WordChoices words={words} selected={draft} onChange={setDraft} search={search} setSearch={setSearch} max={max} eligibleIds={eligibleIds}/>
  </PickerDialog>
 </>;
}

