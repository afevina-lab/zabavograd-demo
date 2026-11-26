import {useLayoutEffect,useRef,type ReactNode} from 'react';
/** Shared native modal for externally controlled windows. */
export function ModalWindow({label,onDismiss,children,className=''}:{label:string;onDismiss:()=>void;children:ReactNode;className?:string}){
 const ref=useRef<HTMLDialogElement>(null);
 useLayoutEffect(()=>{const node=ref.current,previous=document.activeElement;if(node&&!node.open)node.showModal();return()=>{node?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus()}},[]);
 return <dialog ref={ref} className={['v-modal-window v-surface--panel',className].filter(Boolean).join(' ')} aria-label={label} onCancel={event=>{event.preventDefault();onDismiss()}}>{children}</dialog>;
}
