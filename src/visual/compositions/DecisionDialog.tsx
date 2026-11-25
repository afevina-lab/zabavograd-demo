import {useLayoutEffect,useRef,type ReactNode} from 'react';
import {Button} from '../primitives/Buttons.tsx';
export type DecisionAction={id:string;label:ReactNode;onClick:()=>void;tone?:'primary'|'secondary'|'quiet';disabled?:boolean};
const classes={root:'v-decision-dialog v-surface--panel',scroll:'v-decision-scroll',actions:'v-decision-actions',primary:'',secondary:'',quiet:''};
/** A shared modal decision with native focus containment and explicit actions. */
export function DecisionDialog({title,description,actions,onDismiss,classNames=classes}:{title:string;description?:string;actions:readonly DecisionAction[];onDismiss:()=>void;classNames?:typeof classes}){
 const dialog=useRef<HTMLDialogElement>(null);
 useLayoutEffect(()=>{const node=dialog.current,previous=document.activeElement;if(node&&!node.open)node.showModal();return()=>{node?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus()}},[]);
 return <dialog ref={dialog} className={classNames.root} aria-label={title} onCancel={event=>{event.preventDefault();onDismiss()}}>
  <div className={classNames.scroll}><h2>{title}</h2>{description&&<p>{description}</p>}<div className={classNames.actions}>{actions.map(action=><Button key={action.id} tone={action.tone||'primary'} className={classNames[action.tone||'primary']} disabled={action.disabled} onClick={action.onClick}>{action.label}</Button>)}</div></div>
 </dialog>;
}
