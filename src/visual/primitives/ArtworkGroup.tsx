import {visualClasses} from './classNames.ts';
import type {ReactNode} from 'react';
const classes={root:'v-artwork-group',item:'v-artwork-group-item'};
export function ArtworkGroup({label,children,count=7,classNames=classes}:{label:string;children:ReactNode;count?:number;classNames?:typeof classes}){
 classNames=visualClasses(classes,classNames);
 return <div className={classNames.root} role="img" aria-label={label}>{Array.from({length:count},(_,index)=><div className={classNames.item} key={index} aria-hidden="true">{children}</div>)}</div>;
}
