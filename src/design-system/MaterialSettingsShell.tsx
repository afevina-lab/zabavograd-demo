import {MaterialPresetContext} from './MaterialPresetContext.tsx';
import {useMaterialPresets} from './useMaterialPresets.tsx';
import {SettingsLayout,type SettingsSlots} from '../visual/compositions/Layouts.tsx';
import {Surface} from '../visual/primitives/Controls.tsx';
import {Button,IconButton} from '../visual/primitives/Buttons.tsx';
/** Behavioral adapter; the visual composition never reads or saves dictionary data. */
export function MaterialSettingsShell({onHome,...slots}:Omit<SettingsSlots,'headerActions'>&{onHome?:()=>void}){
 const {bridge,candidates,saveName,setSaveName,saveSource,setSaveSource,saveError,manualWordIds,saveDialog,saveTrigger,openSave,closeSave,saveNow}=useMaterialPresets();
 return <MaterialPresetContext.Provider value={bridge}>
  <SettingsLayout {...slots} headerActions={<><IconButton size="heading" ref={saveTrigger} label="Сохранить набор" icon="Save" onClick={openSave}/><IconButton size="heading" label="Домой" icon="Home1" onClick={onHome||(()=>window.location.assign(import.meta.env.BASE_URL+'home.html'))}/></>}/>
  <dialog ref={saveDialog} className="v-game-dialog" aria-label="Сохранить набор" onCancel={()=>saveTrigger.current?.focus()}>
   <Surface><form className="v-dialog-scroll" onSubmit={e=>{e.preventDefault();saveNow()}}>
    <h2>Сохранить учебный набор</h2>
    <label className="v-field">Название набора<input className="v-input" value={saveName} maxLength={80} placeholder="Например, З — начало слова" autoFocus onChange={e=>setSaveName(e.target.value)}/></label>
    {candidates.length>1&&<label className="v-field">Учебный материал<select className="v-input" value={saveSource} onChange={e=>setSaveSource(Number(e.target.value))}>{candidates.map((source,i)=><option key={i} value={i}>{source.label} · {i+1}</option>)}</select></label>}
    <p>Наборы хранятся только в этом браузере. Не указывайте личные данные детей.</p>
    {manualWordIds&&manualWordIds.length>0&&<p>Сохранится вручную выбранных слов: {manualWordIds.length}.</p>}
    {saveError&&<p role="alert">{saveError}</p>}
    <div className="v-dialog-actions"><Button type="submit">Сохранить</Button><Button tone="secondary" onClick={closeSave}>Отмена</Button></div>
   </form></Surface>
  </dialog>
 </MaterialPresetContext.Provider>;
}
