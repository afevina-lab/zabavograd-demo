import {PickerTrigger as Trigger,type PickerTriggerProps} from '../visual/primitives/PickerTrigger.tsx';
const classes={root:'category-picker-trigger',icon:'setup-action-icon',copy:'setup-action-copy',well:'control-well'};
export function PickerTrigger(props:Omit<PickerTriggerProps,'classNames'>){return <Trigger {...props} classNames={classes}/>}
