import {useState,type ReactNode} from 'react';
import {MaterialPresetContext} from './MaterialPresetContext.tsx';
import {useMaterialPresets} from './useMaterialPresets.tsx';
import {Icon} from '../GameUI.tsx';
export type ExplicitSettingsSlots={primary:ReactNode;secondary:ReactNode;appearance:ReactNode;footer:ReactNode;intro?:ReactNode;supplementary?:ReactNode;contentClassName?:string;contentAs?:'main'|'div'|'aside'|'section'};
/** Explicit settings slots for every game; no child inspection or game-name routing. */
export function SettingsGroup({disabled,children}:{disabled:boolean;children:ReactNode}){return disabled?<fieldset className="setup-section-fieldset" disabled>{children}</fieldset>:<>{children}</>}
export function SettingsWindow({game,layout}:{game:string;layout:ExplicitSettingsSlots}){
 const [themeOpen,setThemeOpen]=useState(false);
 const {bridge,candidates,saveName,setSaveName,saveSource,setSaveSource,saveError,manualWordIds,saveDialog,saveTrigger,openSave,closeSave,saveNow}=useMaterialPresets();
 function renderAppearance(appearance:ReactNode){return <aside className="setup-theme-rail" aria-label="Оформление игры">
    <button type="button" className="setup-theme-toggle" aria-expanded={themeOpen} aria-controls="setup-theme-list" onClick={()=>setThemeOpen(v=>!v)}>Оформление <span aria-hidden="true">{themeOpen?'▴':'▾'}</span></button>
    <div className={'setup-theme-scroll'+(themeOpen?' is-expanded':'')} id="setup-theme-list">{appearance}</div>
   </aside>;}
 const Content=layout.contentAs||'div';
 const assembled={
  body:<>{layout.intro}<div className="setup-columns"><div className="setup-column">{layout.primary}</div><div className="setup-column">{layout.secondary}</div></div>{layout.supplementary&&<div className="setup-extra-notes">{layout.supplementary}</div>}</>,
  theme:renderAppearance(layout.appearance),footer:<div className="setup-footer">{layout.footer}</div>
 };
 return <MaterialPresetContext.Provider value={bridge}><div className="settings-shade"><section className="settings-frame shared-settings-window" role="dialog" aria-modal="true" aria-label={'Настройки: '+game}>
 <header className="settings-window-heading"><div className="settings-adventure-title"><span className="settings-adventure-emblem" aria-hidden="true"><Icon name="Star"/></span><div><p className="settings-eyebrow">Забавоград · пора играть</p><h2>{game}</h2><span>Подготовка к игре</span></div></div><div className="settings-header-actions">
 <button type="button" ref={saveTrigger} className="icon-button" aria-label="Сохранить набор" title="Сохранить учебный набор" onClick={openSave}><Icon name="Save"/></button>
 <a className="icon-button" href={import.meta.env.BASE_URL+'home.html'} aria-label="Домой" title="На главную"><Icon name="Home1"/></a>
 </div></header>
 <div className="setup-workspace"><Content className={(layout.contentClassName||'')+' settings unified-settings-content'}>{assembled.body}</Content>{assembled.theme}</div>{assembled.footer}
 </section>
 <dialog ref={saveDialog} className="sound-picker-dialog material-save-dialog" aria-label="Сохранить набор" onCancel={()=>saveTrigger.current?.focus()}>
  <div className="panel-scroll">
   <h2>Сохранить учебный набор</h2>
   <label>Название набора<input value={saveName} maxLength={80} placeholder="Например, З — начало слова" autoFocus onChange={e=>setSaveName(e.target.value)}/></label>
   {candidates.length>1&&<label>Учебный материал<select value={saveSource} onChange={e=>setSaveSource(Number(e.target.value))}>{candidates.map((src,i)=><option key={i} value={i}>{src.label} · {i+1}</option>)}</select></label>}
   <p>Будут сохранены параметры отбора и выбранные вручную слова, если они есть. Наборы хранятся только в этом браузере; при очистке данных сайта они могут исчезнуть. Не указывайте личные данные детей.</p>
   {manualWordIds&&manualWordIds.length>0&&<p>Сохранится вручную выбранных слов: {manualWordIds.length}.</p>}
   {saveError&&<p role="alert">{saveError}</p>}
  </div>
  <div className="sound-picker-actions"><button className="secondary" type="button" onClick={saveNow}>Сохранить</button><button className="secondary" type="button" onClick={closeSave}>Отмена</button></div>
 </dialog>
 </div></MaterialPresetContext.Provider>;
}
