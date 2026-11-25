import {useId} from 'react';
import {MaterialSaveFields} from './MaterialSaveFields.tsx';
import type {useMaterialPresets} from './useMaterialPresets.tsx';
import {PickerDialog} from '../visual/compositions/PickerDialog.tsx';
export function MaterialSaveDialog({controller}:{controller:ReturnType<typeof useMaterialPresets>}){
 const formId=useId();
 return <PickerDialog ref={controller.saveDialog} label="Сохранить набор" confirmLabel="Сохранить" onConfirm={controller.saveNow} submitFormId={formId} onCancel={controller.closeSave} onDismiss={()=>controller.saveTrigger.current?.focus()}>
  <form id={formId} className="material-save-form" onSubmit={event=>{event.preventDefault();controller.saveNow()}}><MaterialSaveFields state={controller} fieldClassName="v-field" inputClassName="v-input"/></form>
 </PickerDialog>;
}
