import {useId} from 'react';
import type {useMaterialPresets} from './useMaterialPresets.tsx';
type Controller=ReturnType<typeof useMaterialPresets>;
export type MaterialSaveState=Pick<Controller,'candidates'|'saveName'|'setSaveName'|'saveSource'|'setSaveSource'|'manualWordIds'|'saveError'>;
/** Both shells edit the same save state and explain the same storage contract. */
export function MaterialSaveFields({state,fieldClassName='',inputClassName=''}:{state:MaterialSaveState;fieldClassName?:string;inputClassName?:string}){
 const id=useId();
 const {candidates,saveName,setSaveName,saveSource,setSaveSource,manualWordIds,saveError}=state;
 return <>
  <h2>Сохранить учебный набор</h2>
  <label className={fieldClassName||undefined} htmlFor={id+'-name'}>Название набора<input id={id+'-name'} className={inputClassName||undefined} value={saveName} maxLength={80} placeholder="Например, З — начало слова" autoFocus onChange={event=>setSaveName(event.target.value)}/></label>
  {candidates.length>1&&<label className={fieldClassName||undefined} htmlFor={id+'-source'}>Учебный материал<select id={id+'-source'} className={inputClassName||undefined} value={saveSource} onChange={event=>setSaveSource(Number(event.target.value))}>{candidates.map((source,index)=><option key={index} value={index}>{source.label} · {index+1}</option>)}</select></label>}
  <p>Будут сохранены параметры отбора и выбранные вручную слова, если они есть. Наборы хранятся только в этом браузере; при очистке данных сайта они могут исчезнуть. Не указывайте личные данные детей.</p>
  {manualWordIds&&manualWordIds.length>0&&<p>Сохранится вручную выбранных слов: {manualWordIds.length}.</p>}
  {saveError&&<p role="alert">{saveError}</p>}
 </>;
}
