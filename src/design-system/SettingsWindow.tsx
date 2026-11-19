import {Children,cloneElement,isValidElement,type ReactNode} from 'react';
import {Icon} from '../GameUI.tsx';
/** The single settings shell for every game. Only its content varies. */
export function SettingsWindow({game,children}:{game:string;children:ReactNode}){
 const child=Children.only(children);
 return <div className="settings-shade"><section className="settings-frame shared-settings-window" role="dialog" aria-modal="true" aria-label={'Настройки: '+game}>
 <header className="settings-window-heading"><div><h2>Настроим игру</h2><span>{game}</span></div><a className="icon-button" href={import.meta.env.BASE_URL+'home.html'} aria-label="Домой" title="На главную"><Icon name="Home1"/></a></header>
 {isValidElement<{className?:string}>(child)?cloneElement(child,{className:(child.props.className||'')+' settings unified-settings-content'}):child}
 </section></div>;
}
