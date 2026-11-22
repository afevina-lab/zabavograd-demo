import {useContext,useEffect,useRef,useState} from 'react';
import {ControlWell} from './design-system/ControlWell.tsx';
import {MaterialPresetContext} from './design-system/MaterialPresetContext.tsx';
import type {Learning} from './learning.ts';
import type {Filters,Word} from './material-types.ts';
import {deleteMaterialSet,readMaterialSets,type SavedMaterialSet} from './saved-material-sets.ts';

/** Browser-local material bank: selection is transactional; no duplicate inline settings. */
export function SavedMaterialSets({words,learning,filters,setLearning,setFilters}:{
 words:Word[];learning:Learning;filters:Filters;
 setLearning:(value:Learning)=>void;setFilters:(value:Partial<Filters>)=>void;
}){
 const bridge=useContext(MaterialPresetContext);
 const [sets,setSets]=useState<SavedMaterialSet[]>([]);
 const [chosen,setChosen]=useState<string[]>([]);
 const [pendingDelete,setPendingDelete]=useState<string|null>(null);
 const [message,setMessage]=useState('');
 const picker=useRef<HTMLDialogElement>(null),confirmation=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const refresh=()=>{try{setSets(readMaterialSets())}catch(e){setMessage((e as Error).message)}};
 useEffect(()=>{refresh()},[bridge?.revision]);
 const close=()=>{picker.current?.close();trigger.current?.focus()};
 const open=()=>{refresh();setMessage('');picker.current?.showModal()};
 const apply=()=>{
  const selected=chosen.map(id=>sets.find(s=>s.id===id)).filter((s):s is SavedMaterialSet=>!!s);
  if(!selected.length){setMessage('Отметьте хотя бы один набор.');return;}
  const modes=new Set(selected.map(s=>s.learning.mode));
  if(modes.size>1){setMessage('Для объединения выберите наборы одной учебной задачи.');return;}
  const first=selected[0],other=selected.slice(1);
  const approved=[...new Set(selected.flatMap(s=>s.learning.approvedWordIds||[]))];
  const learningNext:Learning={...structuredClone(first.learning),
   additional:[...(first.learning.additional||[]),...other.map(s=>({learning:structuredClone(s.learning),filters:structuredClone(s.filters)}))],
   ...(approved.length?{approvedWordIds:approved,selectionMode:'approved' as const}:{})
  };
  setFilters(structuredClone(first.filters));setLearning(learningNext);close();
 };
 const askDelete=(id:string)=>{setPendingDelete(id);confirmation.current?.showModal()};
 const cancelDelete=()=>{confirmation.current?.close();setPendingDelete(null)};
 const confirmDelete=()=>{
  if(!pendingDelete)return;
  try{setSets(deleteMaterialSet(pendingDelete));setChosen(ids=>ids.filter(id=>id!==pendingDelete));setMessage('Набор удалён.');bridge?.refresh();cancelDelete();}
  catch(error){setMessage((error as Error).message);cancelDelete();}
 };
 return <div className="saved-set-picker">
  <button type="button" ref={trigger} className="category-picker-trigger saved-set-trigger" onClick={open}>
   <span className="setup-action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 5h16v15H4zM8 9h8M8 13h8M8 17h5"/></svg></span>
   <span className="setup-action-copy"><strong>Выберите набор</strong><small>{chosen.length?'Отмечено: '+chosen.length:'Мои сохранённые учебные наборы'}</small></span><ControlWell symbol="plus"/>
  </button>
  <dialog className="sound-picker-dialog saved-set-dialog" ref={picker} aria-label="Выбрать набор" onCancel={()=>trigger.current?.focus()}>
   <div className="panel-scroll"><h2>Выберите набор</h2>
    {sets.length===0?<p>Сохранённых наборов пока нет. Настройте учебный материал и нажмите кнопку сохранения в верхней панели.</p>:
    <div className="saved-set-list">{sets.map(set=><div className="saved-set-row" key={set.id}>
     <label className="check"><input type="checkbox" checked={chosen.includes(set.id)} onChange={e=>setChosen(ids=>e.target.checked?[...ids,set.id]:ids.filter(x=>x!==set.id))}/><span><strong>{set.name}</strong><small>{set.learning.approvedWordIds?.length?'Одобренных слов: '+set.learning.approvedWordIds.length+' · ':''}{new Date(set.updatedAt).toLocaleDateString('ru-RU')}</small></span></label>
     <button type="button" className="secondary saved-set-remove" aria-label={'Удалить набор '+set.name} onClick={()=>askDelete(set.id)}>Удалить</button>
    </div>)}</div>}
    {message&&<p role="status">{message}</p>}
    <p className="hint">Можно отметить несколько наборов одной учебной задачи. Содержимое хранится в браузере.</p>
   </div>
   <div className="sound-picker-actions"><button type="button" className="primary" disabled={!chosen.length} onClick={apply}>Применить · {chosen.length}</button><button type="button" className="secondary" onClick={close}>Отмена</button></div>
  </dialog>
  <dialog className="sound-picker-dialog saved-set-confirm" ref={confirmation} aria-label="Подтвердить удаление" onCancel={()=>setPendingDelete(null)}>
   <div className="panel-scroll"><h2>Удалить набор?</h2><p>Это действие удалит сохранённые настройки и список слов с этого устройства. Отменить его нельзя.</p></div>
   <div className="sound-picker-actions"><button type="button" className="primary" onClick={confirmDelete}>Удалить</button><button type="button" className="secondary" onClick={cancelDelete}>Отмена</button></div>
  </dialog>
 </div>;
}
