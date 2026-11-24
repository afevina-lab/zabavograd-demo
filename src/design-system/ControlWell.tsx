import {ControlWell as Well} from '../visual/primitives/ControlWell.tsx';
import type {ComponentProps} from 'react';
export function ControlWell({className='',...props}:ComponentProps<typeof Well>){return <Well {...props} className={'control-well '+className}/>}
