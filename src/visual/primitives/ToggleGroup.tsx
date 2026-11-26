import type {ReactNode} from 'react';
export type ToggleOption<T>={value:T;label:ReactNode;disabled?:boolean};
const classes={root:'v-toggle-group',button:'v-control-button v-button v-button--secondary v-toggle-choice',selected:'is-selected'};
export function ToggleGroup<T extends string|number>({label,options,value,onChange,disabled=false,classNames=classes}:{label:string;options:readonly ToggleOption<T>[];value:T;onChange:(value:T)=>void;disabled?:boolean;classNames?:typeof classes}){
 return <div className={classNames.root} role="group" aria-label={label}>{options.map(option=><button type="button" key={option.value} aria-pressed={value===option.value} disabled={disabled||option.disabled} className={[classNames.button,value===option.value?classNames.selected:''].filter(Boolean).join(' ')||undefined} onClick={()=>onChange(option.value)}>{option.label}</button>)}</div>;
}
