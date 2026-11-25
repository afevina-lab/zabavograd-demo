import type {ReactNode} from 'react';
import {IconButton} from '../primitives/Buttons.tsx';
const classes={root:'v-material-rule',heading:'v-material-rule-heading',remove:''};
/** Presentation only: the caller owns nested material and removal. */
export function MaterialRule({title,removeLabel,onRemove,children,classNames=classes}:{title:string;removeLabel:string;onRemove:()=>void;children:ReactNode;classNames?:typeof classes}){
 return <div className={classNames.root}><div className={classNames.heading}><strong>{title}</strong><IconButton size="heading" className={classNames.remove} label={removeLabel} icon="Trash" onClick={onRemove}/></div>{children}</div>;
}
