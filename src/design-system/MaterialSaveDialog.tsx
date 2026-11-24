import {useId} from 'react';
import {MaterialSaveFields} from './MaterialSaveFields.tsx';
import type {useMaterialPresets} from './useMaterialPresets.tsx';
import {PickerDialog,type PickerDialogClasses} from '../visual/compositions/PickerDialog.tsx';
export type MaterialSaveAppearance={dialog?:PickerDialogClasses;field?:string;input?:string};
export function MaterialSaveDialog({controller,appearance={field:'v-field',input:'v-input'}}:{controller:ReturnType<typeof useMaterialPresets>;appearance?:MaterialSaveAppearance}){
 const formId=useId();
 return <PickerDialog ref={controller.saveDialog} className="material-save-dialog" classNames={appearance.dialog} label="Сохранить набор" confirmLabel="Сохранить" onConfirm={controller.saveNow} submitFormId={formId} onCancel={controller.closeSave} onDismiss={()=>controller.saveTrigger.current?.focus()}>
  <form id={formId} className="material-save-form" onSubmit={event=>{event.preventDefault();controller.saveNow()}}>
   <MaterialSaveFields state={controller} fieldClassName={appearance.field} inputClassName={appearance.input}/>
  </form>
 </PickerDialog>;
}
