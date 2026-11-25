import {visualClasses} from './classNames.ts';
import type {ButtonHTMLAttributes,ReactNode} from 'react';
import {ControlWell} from './ControlWell.tsx';
const classes={root:'v-add-action',label:'v-add-action-label',well:''};
export function AddAction({children,classNames=classes,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{children:ReactNode;classNames?:typeof classes}){
 classNames=visualClasses(classes,classNames);
 return <button {...props} type="button" className={[classNames.root,props.className].filter(Boolean).join(' ')}><span className={classNames.label}>{children}</span><ControlWell symbol="plus" className={classNames.well}/></button>;
}
