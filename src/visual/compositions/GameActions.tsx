import type {FieldsetHTMLAttributes,HTMLAttributes} from 'react';
export function GameActions({className='',...props}:HTMLAttributes<HTMLDivElement>){return <div {...props} className={['v-game-actions',className].filter(Boolean).join(' ')}/>}
export function ActionGroup({className='',...props}:FieldsetHTMLAttributes<HTMLFieldSetElement>){return <fieldset {...props} className={['v-game-action-group',className].filter(Boolean).join(' ')}/>}
