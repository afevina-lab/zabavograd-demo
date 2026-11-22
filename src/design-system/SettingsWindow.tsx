import {Children,cloneElement,isValidElement,useState,type ReactNode} from 'react';
import {Icon,ThemePicker} from '../GameUI.tsx';
import {SetupPreview} from './SetupPreview.tsx';
/** The single settings shell for every game. Only its content varies. */
export function SettingsWindow({game,children}:{game:string;children:ReactNode}){
 const child=Children.only(children);
 const [themeOpen,setThemeOpen]=useState(false);
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
 return <div className="settings-shade"><section className="settings-frame shared-settings-window" role="dialog" aria-modal="true" aria-label={'Настройки: '+game}>
 <header className="settings-window-heading"><div className="settings-adventure-title"><span className="settings-adventure-emblem" aria-hidden="true"><Icon name="Star"/></span><div><p className="settings-eyebrow">Забавоград · пора играть</p><h2>{game}</h2><span>Подготовка к игре</span></div></div><a className="icon-button" href={import.meta.env.BASE_URL+'home.html'} aria-label="Домой" title="На главную"><Icon name="Home1"/></a></header>
 {assembled&&isValidElement<{className?:string;children?:ReactNode}>(child)?<><div className="setup-workspace">{cloneElement(child,{className:(child.props.className||'')+' settings unified-settings-content'},assembled.body)}{assembled.theme}</div>{assembled.footer}</>:child}
 </section></div>;
}
