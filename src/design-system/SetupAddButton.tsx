import {AddAction} from '../visual/primitives/AddAction.tsx';
import type {ComponentProps} from 'react';
const classes={root:'setup-add-rule',label:'setup-add-label',well:'control-well'};
export function SetupAddButton(props:Omit<ComponentProps<typeof AddAction>,'classNames'>){return <AddAction {...props} classNames={classes}/>}
