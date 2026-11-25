import {SettingsTitle} from './SettingsTitle.tsx';
import {visualClasses} from '../primitives/classNames.ts';
import {useId,useState,type ReactNode} from 'react';

export type SettingsSlots={title:string;headerActions?:ReactNode;leading?:ReactNode;primary:ReactNode;secondary?:ReactNode;appearance?:ReactNode;footer:ReactNode;supplementary?:ReactNode};
export type SettingsClasses={backdrop:string;frame:string;heading:string;actions:string;workspace:string;content:string;columns:string;column:string;notes:string;appearance:string;toggle:string;appearanceScroll:string;expanded:string;footer:string};
const classes:SettingsClasses={backdrop:'v-settings-backdrop',frame:'v-settings v-surface--panel',heading:'v-settings-heading',actions:'v-action-row',workspace:'v-settings-workspace',content:'v-settings-scroll',columns:'v-settings-columns',column:'v-stack',notes:'v-settings-notes',appearance:'v-settings-appearance',toggle:'v-appearance-toggle',appearanceScroll:'v-appearance-scroll',expanded:'is-expanded',footer:'v-settings-footer'};
export type SettingsLayoutProps=SettingsSlots&{classNames?:SettingsClasses;heading?:ReactNode;contentAs?:'main'|'div'|'aside'|'section';contentClassName?:string;overlay?:ReactNode};

/** One structure for production and the replacement entry; adapters only name legacy classes. */
export function SettingsLayout({title,headerActions,heading,leading,primary,secondary,appearance,footer,supplementary,classNames=classes,contentAs:Content='div',contentClassName='',overlay}:SettingsLayoutProps){
 classNames=visualClasses(classes,classNames);
 const [expanded,setExpanded]=useState(false),appearanceId=useId(),titleId=useId();
 return <div className={classNames.backdrop}>
  <section className={classNames.frame} role="dialog" aria-modal="true" aria-label={heading?'Настройки: '+title:undefined} aria-labelledby={heading?undefined:titleId}>
   <header className={classNames.heading}>
    {heading||<div id={titleId}><SettingsTitle title={title}/></div>}
    <div className={classNames.actions}>{headerActions}</div>
   </header>
   <div className={classNames.workspace}>
    <Content className={[contentClassName,classNames.content].filter(Boolean).join(' ')}>
     {leading}<div className={classNames.columns}><div className={classNames.column}>{primary}</div>{secondary!=null&&<div className={classNames.column}>{secondary}</div>}</div>
     {supplementary&&<div className={classNames.notes}>{supplementary}</div>}
    </Content>
    {appearance!=null&&<aside className={classNames.appearance} aria-label="Оформление игры">
     <button type="button" className={classNames.toggle} aria-expanded={expanded} aria-controls={appearanceId} onClick={()=>setExpanded(value=>!value)}>Оформление <span aria-hidden="true">{expanded?'▴':'▾'}</span></button>
     <div id={appearanceId} className={classNames.appearanceScroll+(expanded?' '+classNames.expanded:'')} data-expanded={expanded}>{appearance}</div>
    </aside>}
   </div>
   <footer className={classNames.footer}>{footer}</footer>
  </section>
  {overlay}
 </div>;
}

