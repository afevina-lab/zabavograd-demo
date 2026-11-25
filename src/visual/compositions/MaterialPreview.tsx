import {visualClasses} from '../primitives/classNames.ts';
import type {ReactNode} from 'react';
import {FitCopy} from '../primitives/FitCopy.tsx';
export type MaterialPreviewClasses={root:string;meta:string;actions:string;message:string;well:string;text:string};
const classes:MaterialPreviewClasses={root:'v-material-preview',meta:'v-preview-meta',actions:'v-preview-actions',message:'v-preview-message',well:'v-fit-copy',text:'v-fit-copy-text'};
export function MaterialPreview({actions,children,message,classNames=classes}:{actions?:ReactNode;children?:ReactNode;message?:ReactNode;classNames?:MaterialPreviewClasses}){
 classNames=visualClasses(classes,classNames);
 return <section className={classNames.root} data-setup-section="preview">
  <div className={classNames.meta}><h2>В этой игре</h2>{actions&&<div className={classNames.actions}>{actions}</div>}</div>
  <FitCopy classNames={{root:classNames.well,text:classNames.text}}>{message?<p className={classNames.message} role="status">{message}</p>:children}</FitCopy>
 </section>;
}
