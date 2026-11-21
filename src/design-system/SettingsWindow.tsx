import {Children,cloneElement,isValidElement,type ReactNode} from 'react';
import {Icon} from '../GameUI.tsx';
/** The single settings shell for every game. Only its content varies. */
export function SettingsWindow({game,children}:{game:string;children:ReactNode}){
 const child=Children.only(children);
 function arrange(content:ReactNode){
  const nodes=Children.toArray(content),left:ReactNode[]=[],right:ReactNode[]=[],footer:ReactNode[]=[],intro:ReactNode[]=[];
  let section=0,seenSection=false;
  function place(node:ReactNode,fieldsetDisabled?:boolean){
   if(isValidElement<{className?:string;children?:ReactNode;disabled?:boolean;'data-setup-section'?:string}>(node)&&node.type==='fieldset'&&Children.toArray(node.props.children).some(child=>isValidElement<{className?:string}>(child)&&child.type==='section'&&child.props.className?.includes('settings-block'))){
    Children.forEach(node.props.children,child=>place(child,node.props.disabled));return;
   }
   if(isValidElement<{className?:string;children?:ReactNode;'data-setup-section'?:string}>(node)&&node.type==='section'&&node.props.className?.includes('settings-block')){
    seenSection=true;
    const purpose=node.props['data-setup-section'];
    const preview=purpose==='preview'||(!purpose&&Children.toArray(node.props.children).some(c=>isValidElement<{className?:string}>(c)&&c.props.className==='material-head'));
    const element=preview?cloneElement(node,{className:[node.props.className,'setup-material-preview'].filter(Boolean).join(' ')}):node;
    const item=fieldsetDisabled?<fieldset className="setup-section-fieldset" disabled={fieldsetDisabled}>{element}</fieldset>:element;
    if(preview)footer.push(item);
    else if(purpose==='material'||purpose==='rules')left.push(item);
    else if(purpose==='task'||purpose==='appearance')right.push(item);
    else (section++%2?right:left).push(item);
   }else if(!seenSection)intro.push(node);
   else footer.push(node);
  }
  nodes.forEach(node=>place(node));
  return <>{intro}<div className="setup-columns"><div className="setup-column">{left}</div><div className="setup-column">{right}</div></div><div className="setup-footer">{footer}</div></>;
 }
 return <div className="settings-shade"><section className="settings-frame shared-settings-window" role="dialog" aria-modal="true" aria-label={'Настройки: '+game}>
 <header className="settings-window-heading"><div className="settings-adventure-title"><span className="settings-adventure-emblem" aria-hidden="true"><Icon name="Star"/></span><div><p className="settings-eyebrow">Забавоград · пора играть</p><h2>{game}</h2><span>Подготовка к игре</span></div></div><a className="icon-button" href={import.meta.env.BASE_URL+'home.html'} aria-label="Домой" title="На главную"><Icon name="Home1"/></a></header>
 {isValidElement<{className?:string;children?:ReactNode}>(child)?cloneElement(child,{className:(child.props.className||'')+' settings unified-settings-content'},/matching-setup|conveyor-settings|transformation-setup|sort-settings|^settings\b/.test(child.props.className||'')?arrange(child.props.children):child.props.children):child}
 </section></div>;
}
