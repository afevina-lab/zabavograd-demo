import type {ReactNode,Ref} from 'react';
import {SelectionActions} from './SelectionActions.tsx';
export type PickerDialogClasses={root:string;scroll:string;actions:string;confirm:string;cancel:string};
const classes:PickerDialogClasses={root:'v-picker-dialog v-surface--panel',scroll:'v-picker-scroll',actions:'v-picker-actions',confirm:'',cancel:''};
export type PickerDialogProps={label:string;children:ReactNode;ref?:Ref<HTMLDialogElement>;scrollRef?:Ref<HTMLDivElement>;actionsLeading?:ReactNode;submitFormId?:string;onConfirm:()=>void;onCancel:()=>void;onDismiss?:()=>void;confirmDisabled?:boolean;confirmLabel?:string;className?:string;scrollClassName?:string;classNames?:PickerDialogClasses};
/** The caller owns transactional selection; native dialog owns modal focus and Escape. */
export function PickerDialog({label,children,ref,scrollRef,actionsLeading,submitFormId,onConfirm,onCancel,onDismiss,confirmDisabled=false,confirmLabel='Готово',className='',scrollClassName='',classNames=classes}:PickerDialogProps){
 return <dialog ref={ref} className={[classNames.root,className].filter(Boolean).join(' ')} aria-label={label} onCancel={()=>onDismiss?.()}>
  <div ref={scrollRef} className={[classNames.scroll,scrollClassName].filter(Boolean).join(' ')}>{children}</div>
  <SelectionActions classNames={classNames} onConfirm={onConfirm} onCancel={onCancel} disabled={confirmDisabled} label={confirmLabel} submitFormId={submitFormId} leading={actionsLeading}/>
 </dialog>;
}

