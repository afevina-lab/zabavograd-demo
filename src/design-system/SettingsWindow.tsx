import {Children,cloneElement,isValidElement,useState,type ReactNode} from 'react';
import {MaterialPresetContext} from './MaterialPresetContext.tsx';
import {useMaterialPresets} from './useMaterialPresets.tsx';
import {Icon,ThemePicker} from '../GameUI.tsx';
import {SetupPreview} from './SetupPreview.tsx';
/** The single settings shell for every game. Only its content varies. */
export function SettingsWindow({game,children}:{game:string;children:ReactNode}){
 const child=Children.only(children);
 const [themeOpen,setThemeOpen]=useState(false);
 const {bridge,candidates,saveName,setSaveName,saveSource,setSaveSource,saveError,manualWordIds,saveDialog,saveTrigger,openSave,closeSave,saveNow}=useMaterialPresets();
 function arrange(content:ReactNode){
  const nodes=Children.toArray(content),left:ReactNode[]=[],right:ReactNode[]=[],footer:ReactNode[]=[],intro:ReactNode[]=[],appearance:ReactNode[]=[],extras:ReactNode[]=[];
  let section=0,seenSection=false;
  function place(node:ReactNode,fieldsetDisabled?:boolean){
   if(isValidElement(node)&&node.type===SetupPreview){seenSection=true;footer.push(node);return;}

   if(isValidElement<{className?:string;children?:ReactNode;disabled?:boolean;'data-setup-section'?:string}>(node)&&node.type==='fieldset'&&Children.toArray(node.props.children).some(child=>isValidElement<{className?:string}>(child)&&child.type==='section'&&child.props.className?.includes('settings-block'))){
    Children.forEach(node.props.children,child=>place(child,node.props.disabled));return;
   }
   if(isValidElement<{className?:string;children?:ReactNode;'data-setup-section'?:string}>(node)&&node.type==='section'&&node.props.className?.includes('settings-block')){
    seenSection=true;
    const purpose=node.props['data-setup-section'];
    const item=fieldsetDisabled?<fieldset className="setup-section-fieldset" disabled={fieldsetDisabled}>{node}</fieldset>:node;
    if(purpose==='material'||purpose==='rules') (purpose==='rules'&&game==='Конвейер'?right:left).push(item);
    else if(purpose==='task') (game==='Конвейер'?left:right).push(item);
    else if(purpose==='appearance'){
     // Only the theme picker belongs in the independent side rail.
     // Other presentation controls remain in the main task column in every game.
     const parts=Children.toArray(node.props.children);
     const themeParts=parts.filter(part=>isValidElement(part)&&(part.type===ThemePicker||part.type==='h2'));
     const presentationParts=parts.filter(part=>!isValidElement(part)||(part.type!==ThemePicker&&part.type!=='h2'));
     if(presentationParts.length)right.push(<section className="settings-block setup-presentation-options">{presentationParts}</section>);
     appearance.push(cloneElement(node,{},...themeParts));
    }
    else (section++%2?right:left).push(item);
   }else if(!seenSection)intro.push(node);
   else if(isValidElement<{className?:string}>(node)&&node.type==='button'&&node.props.className?.split(/\s+/).some(name=>name==='primary'||name==='start'))footer.push(node);
   else extras.push(node);
  }
  nodes.forEach(node=>place(node));
  return {body:<>{intro}<div className="setup-columns"><div className="setup-column">{left}</div><div className="setup-column">{right}</div></div>{extras.length>0&&<div className="setup-extra-notes">{extras}</div>}</>,
   theme:<aside className="setup-theme-rail" aria-label="Оформление игры">
    <button type="button" className="setup-theme-toggle" aria-expanded={themeOpen} aria-controls="setup-theme-list" onClick={()=>setThemeOpen(v=>!v)}>Оформление <span aria-hidden="true">{themeOpen?'▴':'▾'}</span></button>
    <div className={'setup-theme-scroll'+(themeOpen?' is-expanded':'')} id="setup-theme-list">{appearance}</div>
   </aside>,
   footer:<div className="setup-footer">{footer}</div>};
 }
 const assembled=isValidElement<{className?:string;children?:ReactNode}>(child)?arrange(child.props.children):null;
 return <MaterialPresetContext.Provider value={bridge}><div className="settings-shade"><section className="settings-frame shared-settings-window" role="dialog" aria-modal="true" aria-label={'Настройки: '+game}>
 <header className="settings-window-heading"><div className="settings-adventure-title"><span className="settings-adventure-emblem" aria-hidden="true"><Icon name="Star"/></span><div><p className="settings-eyebrow">Забавоград · пора играть</p><h2>{game}</h2><span>Подготовка к игре</span></div></div><div className="settings-header-actions">
 <button type="button" ref={saveTrigger} className="icon-button" aria-label="Сохранить набор" title="Сохранить учебный набор" onClick={openSave}><Icon name="Save"/></button>
 <a className="icon-button" href={import.meta.env.BASE_URL+'home.html'} aria-label="Домой" title="На главную"><Icon name="Home1"/></a>
 </div></header>
 {assembled&&isValidElement<{className?:string;children?:ReactNode}>(child)?<><div className="setup-workspace">{cloneElement(child,{className:(child.props.className||'')+' settings unified-settings-content'},assembled.body)}{assembled.theme}</div>{assembled.footer}</>:child}
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
