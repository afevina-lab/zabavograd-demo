import {MaterialSaveDialog} from './MaterialSaveDialog.tsx';
import {MaterialPresetContext} from './MaterialPresetContext.tsx';
import {useMaterialPresets} from './useMaterialPresets.tsx';
import {SettingsLayout,type SettingsLayoutProps} from '../visual/compositions/SettingsLayout.tsx';
import {IconButton,IconLink} from '../visual/primitives/Buttons.tsx';
export function MaterialSettingsShell({onHome,...slots}:Omit<SettingsLayoutProps,'headerActions'|'overlay'>&{onHome?:()=>void}){
 const controller=useMaterialPresets();
 return <MaterialPresetContext.Provider value={controller.bridge}>
  <SettingsLayout {...slots} headerActions={<><IconButton size="heading" ref={controller.saveTrigger} label="Сохранить набор" icon="Save" onClick={controller.openSave}/>{onHome?<IconButton size="heading" label="Домой" icon="Home1" onClick={onHome}/>:<IconLink size="heading" label="Домой" icon="Home1" href={import.meta.env.BASE_URL+'home.html'}/>}</>} overlay={<MaterialSaveDialog controller={controller}/>}/>
 </MaterialPresetContext.Provider>;
}
