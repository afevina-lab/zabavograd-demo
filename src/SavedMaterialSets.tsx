import {useEffect,useMemo,useRef,useState} from 'react';
import {SelectControl} from './design-system/SelectControl.tsx';
import {learningPool,type Learning} from './learning.ts';
import type {Filters,Word} from './material-types.ts';
import {deleteMaterialSet,readMaterialSets,saveMaterialSet,type SavedMaterialSet} from './saved-material-sets.ts';

/** One library of teacher presets, shared by every game's material settings. */
export function SavedMaterialSets({words,learning,filters,setLearning,setFilters}:{
 words:Word[];learning:Learning;filters:Filters;
 setLearning:(value:Learning)=>void;setFilters:(value:Partial<Filters>)=>void;
}){
 const [sets,setSets]=useState<SavedMaterialSet[]>([]);
 const [selected,setSelected]=useState(''),[name,setName]=useState('');
 const [status,setStatus]=useState(''),[deletePending,setDeletePending]=useState(false);
 const [draft,setDraft]=useState<string[]>([]),[search,setSearch]=useState(''),[pickedOnly,setPickedOnly]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),wordTrigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{try{setSets(readMaterialSets())}catch(error){setStatus((error as Error).message)}},[]);
 const approved=learning.approvedWordIds||[];
 const wordIds=useMemo(()=>new Set(words.map(w=>w.id)),[words]);
 // Do not offer transient generated syllables or maths IDs: saved word references
 // must resolve to stable canonical catalogue IDs across releases.
 const eligible=useMemo(()=>learning.mode==='math'?[]:learningPool(words,filters,{...learning,selectionMode:'automatic'},false)
  .filter(w=>wordIds.has(w.id)),[words,filters,learning,wordIds]);
 const eligibleIds=useMemo(()=>new Set(eligible.map(w=>w.id)),[eligible]);
 const catalogue=useMemo(()=>new Map(words.map(w=>[w.id,w])),[words]);
 const availableApproved=approved.filter(id=>eligibleIds.has(id)).length;
 const list=useMemo(()=>{
  const base=pickedOnly?draft.map(id=>catalogue.get(id)).filter((w):w is Word=>!!w):eligible;
  return base.filter(w=>w.label.toLocaleLowerCase('ru').includes(search.toLocaleLowerCase('ru')))
   .slice(0,120);
 },[eligible,catalogue,pickedOnly,draft,search]);
 const selectSet=(id:string)=>{setSelected(id);setName(sets.find(s=>s.id===id)?.name||'');setStatus('');setDeletePending(false)};
 const load=()=>{
  const item=sets.find(s=>s.id===selected);
  if(!item)return setStatus('Выберите сохранённый набор.');
  setFilters(structuredClone(item.filters));setLearning(structuredClone(item.learning));
  setName(item.name);setStatus('Набор «'+item.name+'» загружен.');
 };
 const save=(asNew:boolean)=>{
  try{
   const next=saveMaterialSet({name,learning,filters},asNew?undefined:selected||undefined);
   setSets(next);const saved=asNew||!selected?next[next.length-1]:next.find(s=>s.id===selected)!;
   setSelected(saved.id);setName(saved.name);setStatus('Набор сохранён в этом браузере.');
   setDeletePending(false);
  }catch(error){setStatus((error as Error).message)}
 };
 const remove=()=>{
  if(!selected)return;
  if(!deletePending){setDeletePending(true);setStatus('Нажмите «Подтвердить удаление», чтобы удалить набор.');return}
  try{setSets(deleteMaterialSet(selected));setSelected('');setName('');setStatus('Набор удалён.');setDeletePending(false)}
  catch(error){setStatus((error as Error).message)}
 };
 const openWords=()=>{setDraft([...approved]);setSearch('');setPickedOnly(false);dialog.current?.showModal()};
 const closeWords=()=>{dialog.current?.close();wordTrigger.current?.focus()};
 return <details className="filter-details saved-material-sets">
  <summary>Мои наборы · {sets.length} сохранено</summary>
  <div className="saved-material-sets-body">
   <p className="saved-material-sets-hint">Сохраните учебные правила и список одобренных слов. Наборы доступны в других играх на этом устройстве.</p>
   <label>Сохранённые наборы
    <SelectControl aria-label="Сохранённый набор" value={selected} onChange={e=>selectSet(e.target.value)}>
     <option value="">Новый набор</option>{sets.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
    </SelectControl>
   </label>
   <label>Название набора
    <input value={name} maxLength={80} placeholder="Например, С — начало слова" aria-label="Название набора" onChange={e=>setName(e.target.value)}/>
   </label>
   {learning.mode!=='math'&&<div className="saved-material-bank">
    <label className="check"><input type="checkbox" role="switch" checked={learning.selectionMode==='approved'}
      onChange={e=>setLearning({...learning,selectionMode:e.target.checked?'approved':'automatic'})}/>
     Только вручную одобренные слова
    </label>
    <button type="button" className="secondary" ref={wordTrigger} onClick={openWords}>Выбрать слова · {approved.length}</button>
    {approved.length>0&&<p>По текущим условиям подходят {availableApproved} из {approved.length}. Остальные сохраняются в наборе, но не выдаются.</p>}
   </div>}
   <div className="saved-material-actions">
    <button type="button" className="secondary" disabled={!selected} onClick={load}>Загрузить</button>
    <button type="button" className="primary" onClick={()=>save(false)}>{selected?'Обновить набор':'Сохранить набор'}</button>
    {selected&&<button type="button" className="secondary" onClick={()=>save(true)}>Как новый</button>}
    <button type="button" className="secondary" disabled={!selected} onClick={remove}>{deletePending?'Подтвердить удаление':'Удалить'}</button>
   </div>
   {status&&<p className="saved-material-status" role="status">{status}</p>}
   <p className="saved-material-sets-hint">Хранится в браузере, без регистрации. При очистке данных сайта наборы могут исчезнуть. Не используйте в названиях личные данные детей.</p>
  </div>
  <dialog className="sound-picker-dialog saved-words-dialog" ref={dialog} aria-label="Выбор одобренных слов" onCancel={()=>wordTrigger.current?.focus()}>
   <div className="panel-scroll">
    <h2>Одобренные слова</h2>
    <p>Отберите слова для своих занятий. В списке только материал из текущей библиотеки, подходящий под выбранные правила.</p>
    <label>Найти слово<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск по названию"/></label>
    <label className="check"><input type="checkbox" checked={pickedOnly} onChange={e=>setPickedOnly(e.target.checked)}/>Показывать только выбранные</label>
    <p>Выбрано: {draft.length}. {list.length===120?'Показаны первые 120 совпадений — уточните поиск.':''}</p>
    <div className="saved-words-list">{list.map(w=><label className="check" key={w.id}>
     <input type="checkbox" checked={draft.includes(w.id)}
       onChange={e=>setDraft(ids=>e.target.checked?[...ids,w.id]:ids.filter(id=>id!==w.id))}/>
     {w.label}{!eligibleIds.has(w.id)&&<small> · не подходит под текущие условия</small>}
    </label>)}</div>
    <div className="sound-picker-actions">
     <button type="button" className="primary" disabled={!draft.length} onClick={()=>{
      setLearning({...learning,approvedWordIds:[...new Set(draft)],selectionMode:'approved'});closeWords();
     }}>Применить · {draft.length}</button>
     <button type="button" className="secondary" onClick={()=>{setLearning({...learning,approvedWordIds:[],selectionMode:'automatic'});closeWords()}}>Сбросить список</button>
     <button type="button" className="secondary" onClick={closeWords}>Отмена</button>
    </div>
   </div>
  </dialog>
 </details>;
}
