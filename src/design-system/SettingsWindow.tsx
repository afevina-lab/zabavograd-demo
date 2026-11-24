import {MaterialSaveFields} from './MaterialSaveFields.tsx';
import type {ReactNode} from 'react';
import {MaterialPresetContext} from './MaterialPresetContext.tsx';
import {useMaterialPresets} from './useMaterialPresets.tsx';
import {Icon} from '../visual/primitives/Icon.tsx';
import {IconButton,IconLink} from '../visual/primitives/Buttons.tsx';
import {SettingsLayout,type SettingsClasses} from '../visual/compositions/SettingsLayout.tsx';
export type ExplicitSettingsSlots={primary:ReactNode;secondary:ReactNode;appearance:ReactNode;footer:ReactNode;intro?:ReactNode;supplementary?:ReactNode;contentClassName?:string;contentAs?:'main'|'div'|'aside'|'section'};
const classes:SettingsClasses={backdrop:'settings-shade',frame:'settings-frame shared-settings-window',heading:'settings-window-heading',actions:'settings-header-actions',workspace:'setup-workspace',content:'settings unified-settings-content',columns:'setup-columns',column:'setup-column',notes:'setup-extra-notes',appearance:'setup-theme-rail',toggle:'setup-theme-toggle',appearanceScroll:'setup-theme-scroll',expanded:'is-expanded',footer:'setup-footer'};
export function SettingsGroup({disabled,children}:{disabled:boolean;children:ReactNode}){return disabled?<fieldset className="setup-section-fieldset" disabled>{children}</fieldset>:<>{children}</>}
/** Compatibility adapter; column order and rendering belong to SettingsLayout. */
export function SettingsWindow({game,layout}:{game:string;layout:ExplicitSettingsSlots}){
 const {bridge,candidates,saveName,setSaveName,saveSource,setSaveSource,saveError,manualWordIds,saveDialog,saveTrigger,openSave,closeSave,saveNow}=useMaterialPresets();
 return <MaterialPresetContext.Provider value={bridge}>
  <SettingsLayout title={game} classNames={classes} contentAs={layout.contentAs} contentClassName={layout.contentClassName} leading={layout.intro} primary={layout.primary} secondary={layout.secondary} appearance={layout.appearance} footer={layout.footer} supplementary={layout.supplementary}
   heading={<div className="settings-adventure-title"><span className="settings-adventure-emblem" aria-hidden="true"><Icon name="Star"/></span><div><p className="settings-eyebrow">Забавоград · пора играть</p><h2>{game}</h2><span>Подготовка к игре</span></div></div>}
   headerActions={<><IconButton size="heading" ref={saveTrigger} className="icon-button" label="Сохранить набор" icon="Save" onClick={openSave}/><IconLink size="heading" className="icon-button" href={import.meta.env.BASE_URL+'home.html'} label="Домой" icon="Home1"/></>}
   overlay={
 <dialog ref={saveDialog} className="sound-picker-dialog material-save-dialog" aria-label="Сохранить набор" onCancel={()=>saveTrigger.current?.focus()}>
  <div className="panel-scroll">
   <MaterialSaveFields state={{candidates,saveName,setSaveName,saveSource,setSaveSource,saveError,manualWordIds}}/>
  </div>
  <div className="sound-picker-actions"><button className="secondary" type="button" onClick={saveNow}>Сохранить</button><button className="secondary" type="button" onClick={closeSave}>Отмена</button></div>
 </dialog>   }
  />
 </MaterialPresetContext.Provider>;
}

