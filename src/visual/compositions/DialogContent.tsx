import {visualClasses} from '../primitives/classNames.ts';
import type {ReactNode} from 'react';
export type DialogContentClasses={root:string;award:string;scroll:string};
const classes:DialogContentClasses={root:'v-dialog-content',award:'v-dialog-award',scroll:'v-dialog-scroll'};
/** Award and scrollable copy have a single owner in both dialog shells. */
export function DialogContent({title,titleId,description,award,actions,framed=false,classNames=classes}:{title:string;titleId?:string;description?:ReactNode;award?:ReactNode;actions:ReactNode;framed?:boolean;classNames?:DialogContentClasses}){
 classNames=visualClasses(classes,classNames);
 return <div className={classNames.root}>
  {award!=null&&<div className={classNames.award}>{award}</div>}
  <div className={['v-dialog-panel',framed?'v-surface--panel':''].filter(Boolean).join(' ')}><div className={classNames.scroll}><h2 id={titleId}>{title}</h2>{description!=null&&<p>{description}</p>}{actions}</div></div>
 </div>;
}
