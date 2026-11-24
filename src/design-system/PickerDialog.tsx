import {PickerDialog as Dialog,type PickerDialogProps} from '../visual/compositions/PickerDialog.tsx';
const classes={root:'sound-picker-dialog',scroll:'panel-scroll',actions:'sound-picker-actions',confirm:'primary',cancel:'secondary'};
export function PickerDialog(props:Omit<PickerDialogProps,'classNames'>){return <Dialog {...props} classNames={classes}/>}
