import {visualClasses} from '../primitives/classNames.ts';
import type {HTMLAttributes,ReactNode} from 'react';
const classes={root:'v-sort-group',target:'v-sort-target',cards:'v-sort-placed'};
export function SortingGroup({title,children,onPlace,targetDisabled=false,classNames=classes,className='',...props}:Omit<HTMLAttributes<HTMLElement>,'title'>&{title:string;children:ReactNode;onPlace:()=>void;targetDisabled?:boolean;classNames?:typeof classes}){
 classNames=visualClasses(classes,classNames);
 return <section {...props} className={[classNames.root,className].filter(Boolean).join(' ')}><button type="button" className={classNames.target} disabled={targetDisabled} onClick={event=>{event.stopPropagation();onPlace()}}><h3 title={title}>{title}</h3></button><div className={classNames.cards}>{children}</div></section>;
}
