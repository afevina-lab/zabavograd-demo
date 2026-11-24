import {useId,type ReactNode} from 'react';
import {Field} from './Field.tsx';
export {Field} from './Field.tsx';
export {Surface} from './Surface.tsx';
import {SelectControl} from './Select.tsx';

export {Button,IconButton,IconLink,type ButtonSize,type IconButtonSize} from './Buttons.tsx';
export function Select({label,value,onChange,options,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;options:readonly {value:string;label:string}[];disabled?:boolean}){return <Field label={label}>{id=><SelectControl id={id} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</SelectControl>}</Field>}
export {Disclosure} from './Disclosure.tsx';
export {Choice} from './Choice.tsx';
export function Chip({children,selected,onClick}:{children:ReactNode;selected:boolean;onClick:()=>void}){return <button type="button" className="v-chip" aria-pressed={selected} onClick={onClick}>{children}</button>}
export {Quantity} from './Quantity.tsx';
export {Artwork,Card} from './Card.tsx';
export function Tooltip({label,children}:{label:string;children:ReactNode}){const id=useId();return <span className="v-tooltip" tabIndex={0} aria-describedby={id}>{children}<span id={id} role="tooltip">{label}</span></span>}






