import type {ReactNode,Ref} from 'react';
import {Button} from '../primitives/Buttons.tsx';
export type PickerDialogClasses={root:string;scroll:string;actions:string;confirm:string;cancel:string};
const classes:PickerDialogClasses={root:'v-picker-dialog v-surface--panel',scroll:'v-picker-scroll',actions:'v-picker-actions',confirm:'',cancel:''};
export type PickerDialogProps={label:string;children:ReactNode;ref?:Ref<HTMLDialogElement>;onConfirm:()=>void;onCancel:()=>void;onDismiss?:()=>void;confirmDisabled?:boolean;confirmLabel?:string;className?:string;scrollClassName?:string;classNames?:PickerDialogClasses};
/** The caller owns transactional selection; native dialog owns modal focus and Escape. */
export function PickerDialog({label,children,ref,onConfirm,onCancel,onDismiss,confirmDisabled=false,confirmLabel='Готово',className='',scrollClassName='',classNames=classes}:PickerDialogProps){
 return <dialog ref={ref} className={[classNames.root,className].filter(Boolean).join(' ')} aria-label={label} onCancel={()=>onDismiss?.()}>
  <div className={[classNames.scroll,scrollClassName].filter(Boolean).join(' ')}>{children}</div>
  <div className={classNames.actions}>
   <Button className={classNames.confirm} disabled={confirmDisabled} onClick={onConfirm}>{confirmLabel}</Button>
   <Button className={classNames.cancel} tone="secondary" onClick={onCancel}>Отмена</Button>
  </div>
 </dialog>;
}
