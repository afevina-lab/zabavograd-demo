import {useId,type ReactNode,type CSSProperties} from 'react';
import {SelectControl} from './Select.tsx';

export {Button,IconButton,IconLink,type ButtonSize,type IconButtonSize} from './Buttons.tsx';
export function Surface({kind='panel',children,className=''}:{kind?:'panel'|'field';children:ReactNode;className?:string}){return <div className={`v-surface v-surface--${kind} ${className}`}>{children}</div>}
export function Field({label,children,description}:{label:string;children:(id:string)=>ReactNode;description?:string}){const id=useId();return <div className="v-field"><label htmlFor={id}>{label}</label>{children(id)}{description&&<p className="v-field-description">{description}</p>}</div>}
export function Select({label,value,onChange,options,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;options:readonly {value:string;label:string}[];disabled?:boolean}){return <Field label={label}>{id=><SelectControl id={id} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</SelectControl>}</Field>}
export {Disclosure} from './Disclosure.tsx';
export function Choice({label,checked,onChange,kind='checkbox',name,disabled=false}:{label:string;checked:boolean;onChange:(checked:boolean)=>void;kind?:'checkbox'|'radio'|'switch';name?:string;disabled?:boolean}){return <label className="v-choice"><input type={kind==='radio'?'radio':'checkbox'} role={kind==='switch'?'switch':undefined} name={name} checked={checked} disabled={disabled} onChange={e=>onChange(e.target.checked)}/><span>{label}</span></label>}
export function Chip({children,selected,onClick}:{children:ReactNode;selected:boolean;onClick:()=>void}){return <button type="button" className="v-chip" aria-pressed={selected} onClick={onClick}>{children}</button>}
export {Quantity} from './Quantity.tsx';
export function Artwork({src,alt='',fit='contain'}:{src:string;alt?:string;fit?:'contain'|'cover'}){return <img className="v-artwork" src={src} alt={alt} style={{'--v-art-fit':fit} as CSSProperties}/>}
export function Card({children,label,selected=false,onClick}:{children:ReactNode;label:string;selected?:boolean;onClick?:()=>void}){return <button type="button" className="v-card" aria-label={label} aria-pressed={selected} onClick={onClick}>{children}</button>}
export function Tooltip({label,children}:{label:string;children:ReactNode}){const id=useId();return <span className="v-tooltip" tabIndex={0} aria-describedby={id}>{children}<span id={id} role="tooltip">{label}</span></span>}



