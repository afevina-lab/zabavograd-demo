import {visualClasses} from './classNames.ts';
import {useId,type ReactNode} from 'react';
const classes={root:'v-field',label:'v-field-label',description:'v-field-description'};
export function Field({label,children,description,hideLabel=false,className='',classNames=classes}:{label:string;children:(id:string)=>ReactNode;description?:string;hideLabel?:boolean;className?:string;classNames?:typeof classes}){
 classNames=visualClasses(classes,classNames);
 const id=useId();
 return <div className={[classNames.root,className].filter(Boolean).join(' ')}><label className={classNames.label||undefined} htmlFor={id} hidden={hideLabel}>{label}</label>{children(id)}{description&&<p className={classNames.description}>{description}</p>}</div>;
}
