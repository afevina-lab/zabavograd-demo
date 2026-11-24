import type {ReactNode,Ref} from 'react';
export type ChoiceProps={label:ReactNode;checked:boolean;onChange:(checked:boolean)=>void;kind?:'checkbox'|'radio'|'switch';name?:string;disabled?:boolean;className?:string;inputRef?:Ref<HTMLInputElement>};
/** Native input supplies focus, keyboard behavior and form semantics in every screen. */
export function Choice({label,checked,onChange,kind='checkbox',name,disabled=false,className='v-choice',inputRef}:ChoiceProps){
 return <label className={className}><input ref={inputRef} type={kind==='radio'?'radio':'checkbox'} role={kind==='switch'?'switch':undefined} name={name} checked={checked} disabled={disabled} onChange={event=>onChange(event.target.checked)}/><span>{label}</span></label>;
}
