import {visualClasses} from '../primitives/classNames.ts';
import type {ReactNode} from 'react';
import {Button} from '../primitives/Buttons.tsx';
export type SelectionActionClasses={actions:string;confirm:string;cancel:string};
const classes:SelectionActionClasses={actions:'v-picker-actions',confirm:'',cancel:''};
export function SelectionActions({onConfirm,onCancel,disabled=false,label='Готово',submitFormId,leading,classNames=classes}:{onConfirm:()=>void;onCancel:()=>void;disabled?:boolean;label?:ReactNode;submitFormId?:string;leading?:ReactNode;classNames?:SelectionActionClasses}){
 classNames=visualClasses(classes,classNames);
 return <div className={classNames.actions}>
  {leading}
  <Button className={classNames.confirm} disabled={disabled} type={submitFormId?'submit':'button'} form={submitFormId} onClick={submitFormId?undefined:onConfirm}>{label}</Button>
  <Button className={classNames.cancel} tone="secondary" onClick={onCancel}>Отмена</Button>
 </div>;
}

