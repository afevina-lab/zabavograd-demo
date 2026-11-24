import {MaterialSaveDialog,type MaterialSaveAppearance} from './MaterialSaveDialog.tsx';
import {MaterialPresetContext} from './MaterialPresetContext.tsx';
import {useMaterialPresets} from './useMaterialPresets.tsx';
import {SettingsLayout,type SettingsLayoutProps} from '../visual/compositions/SettingsLayout.tsx';
import {IconButton,IconLink} from '../visual/primitives/Buttons.tsx';
/** One settings controller and one save dialog for all games and the visual entry. */
export function MaterialSettingsShell({onHome,actionClassName='',saveAppearance,...slots}:Omit<SettingsLayoutProps,'headerActions'|'overlay'>&{onHome?:()=>void;actionClassName?:string;saveAppearance?:MaterialSaveAppearance}){
 const controller=useMaterialPresets();
 return <MaterialPresetContext.Provider value={controller.bridge}>
  <SettingsLayout {...slots} headerActions={<>
   <IconButton size="heading" className={actionClassName} ref={controller.saveTrigger} label="Сохранить набор" icon="Save" onClick={controller.openSave}/>
   {onHome?<IconButton size="heading" className={actionClassName} label="Домой" icon="Home1" onClick={onHome}/>:<IconLink size="heading" className={actionClassName} label="Домой" icon="Home1" href={import.meta.env.BASE_URL+'home.html'}/>}
  </>} overlay={<MaterialSaveDialog controller={controller} appearance={saveAppearance}/>}/>
 </MaterialPresetContext.Provider>;
}
