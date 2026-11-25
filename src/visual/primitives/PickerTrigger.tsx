import {visualClasses} from './classNames.ts';
import type {ButtonHTMLAttributes,ReactNode,Ref} from 'react';
import {ControlWell} from './ControlWell.tsx';
export type PickerTriggerClasses={root:string;icon:string;copy:string;well:string};
const classes:PickerTriggerClasses={root:'v-picker-trigger',icon:'v-picker-trigger-icon',copy:'v-picker-trigger-copy',well:''};
export type PickerTriggerProps=Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'title'>&{title:string;description?:ReactNode;icon:ReactNode;ref?:Ref<HTMLButtonElement>;classNames?:PickerTriggerClasses};
export function PickerTrigger({title,description,icon,classNames=classes,className='',...props}:PickerTriggerProps){
 classNames=visualClasses(classes,classNames);
 return <button {...props} type="button" className={[classNames.root,className].filter(Boolean).join(' ')}>
  <span className={classNames.icon} aria-hidden="true">{icon}</span>
  <span className={classNames.copy}><strong>{title}</strong>{description&&<small>{description}</small>}</span>
  <ControlWell symbol="plus" className={classNames.well}/>
 </button>;
}
