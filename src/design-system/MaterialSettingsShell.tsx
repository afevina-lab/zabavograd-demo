import {MaterialSaveFields} from './MaterialSaveFields.tsx';
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
    <MaterialSaveFields state={{candidates,saveName,setSaveName,saveSource,setSaveSource,saveError,manualWordIds}} fieldClassName="v-field" inputClassName="v-input"/>
    <div className="v-dialog-actions"><Button type="submit">Сохранить</Button><Button tone="secondary" onClick={closeSave}>Отмена</Button></div>
   </form></Surface>
  </dialog>
 </MaterialPresetContext.Provider>;
}

