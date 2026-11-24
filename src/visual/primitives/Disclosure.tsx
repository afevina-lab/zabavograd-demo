import type {ReactNode} from 'react';
import {ControlWell} from './ControlWell.tsx';

export type DisclosureClasses={root:string;icon:string;copy:string;well:string;body:string};
const classes:DisclosureClasses={root:'v-disclosure',icon:'v-disclosure-icon',copy:'v-disclosure-copy',well:'v-disclosure-well',body:'v-disclosure-body'};
export type DisclosureProps={title:string;description?:string;icon?:ReactNode;children:ReactNode;open?:boolean;className?:string;classNames?:DisclosureClasses};

export function Disclosure({title,description,icon,children,open,className='',classNames=classes}:DisclosureProps){
 return <details className={classNames.root+' '+className} open={open}>
  <summary>
   {icon&&<span className={classNames.icon} aria-hidden="true">{icon}</span>}
   <span className={classNames.copy}><strong>{title}</strong>{description&&<small>{description}</small>}</span>
   <ControlWell className={classNames.well}/>
  </summary>
  <div className={classNames.body}>{children}</div>
 </details>;
}
