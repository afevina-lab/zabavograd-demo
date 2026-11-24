import {useId,type ButtonHTMLAttributes,type ReactNode,type CSSProperties,type Ref} from 'react';
import {Icon} from '../../GameUI.tsx';
export type ButtonSize='standard'|'stepper'|'launch';
export type IconButtonSize='standard'|'toolbar'|'heading';
export function Button({tone='primary',size='standard',children,className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{tone?:'primary'|'secondary'|'quiet';size?:ButtonSize}){
 return <button type="button" {...props} data-size={size} className={`v-control-button v-button v-button--${tone} ${className}`}>{children}</button>;
}
export function IconButton({label,icon,size='standard',...props}:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'aria-label'>&{label:string;icon:string;size?:IconButtonSize;ref?:Ref<HTMLButtonElement>}){
 return <button type="button" {...props} data-size={size} className={`v-control-button v-icon-button ${props.className||''}`} aria-label={label} title={label}><Icon name={icon}/></button>;
}
export function Surface({kind='panel',children,className=''}:{kind?:'panel'|'field';children:ReactNode;className?:string}){return <div className={`v-surface v-surface--${kind} ${className}`}>{children}</div>}
export function Field({label,children,description}:{label:string;children:(id:string)=>ReactNode;description?:string}){const id=useId();return <div className="v-field"><label htmlFor={id}>{label}</label>{children(id)}{description&&<p className="v-field-description">{description}</p>}</div>}
export function Select({label,value,onChange,options,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;options:readonly {value:string;label:string}[];disabled?:boolean}){return <Field label={label}>{id=><select className="v-input" id={id} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>}</Field>}
export function Disclosure({title,children,open}:{title:string;children:ReactNode;open?:boolean}){return <details className="v-disclosure" open={open}><summary>{title}</summary><div className="v-stack">{children}</div></details>}
export function Choice({label,checked,onChange,kind='checkbox',name,disabled=false}:{label:string;checked:boolean;onChange:(checked:boolean)=>void;kind?:'checkbox'|'radio'|'switch';name?:string;disabled?:boolean}){return <label className="v-choice"><input type={kind==='radio'?'radio':'checkbox'} role={kind==='switch'?'switch':undefined} name={name} checked={checked} disabled={disabled} onChange={e=>onChange(e.target.checked)}/><span>{label}</span></label>}
export function Chip({children,selected,onClick}:{children:ReactNode;selected:boolean;onClick:()=>void}){return <button type="button" className="v-chip" aria-pressed={selected} onClick={onClick}>{children}</button>}
export function Quantity({label,value,min,max,onChange,stops,disabled=false}:{label:string;value:number;min:number;max:number;onChange:(n:number)=>void;stops?:readonly number[];disabled?:boolean}){
 const id=useId(),values=stops?.filter(n=>n>=min&&n<=max),discrete=values&&values.length>0?values:undefined;
 const nearest=(n:number)=>discrete?discrete.reduce((best,v)=>Math.abs(v-n)<Math.abs(best-n)?v:best,discrete[0]):n;
 const change=(n:number)=>{if(Number.isFinite(n))onChange(nearest(Math.max(min,Math.min(max,Math.round(n)))))};
 const index=discrete?Math.max(0,discrete.indexOf(nearest(value))):value,lo=discrete?0:min,hi=discrete?discrete.length-1:max;
 return <div className="v-quantity"><label htmlFor={id}>{label}</label><div className="v-stepper"><Button size="stepper" aria-label={'Уменьшить: '+label} disabled={disabled||index<=lo} onClick={()=>change(discrete?discrete[index-1]:value-1)}>−</Button><input id={id} type="number" min={min} max={max} value={value} disabled={disabled} onChange={e=>{if(e.target.value)change(+e.target.value)}}/><Button size="stepper" disabled={disabled||index>=hi} aria-label={'Увеличить: '+label} onClick={()=>change(discrete?discrete[index+1]:value+1)}>+</Button></div><input type="range" min={lo} max={hi} value={index} disabled={disabled||hi<=lo} aria-label={label+' — ползунок'} aria-valuetext={String(value)} onChange={e=>change(discrete?discrete[+e.target.value]:+e.target.value)}/></div>;
}
export function Artwork({src,alt='',fit='contain'}:{src:string;alt?:string;fit?:'contain'|'cover'}){return <img className="v-artwork" src={src} alt={alt} style={{'--v-art-fit':fit} as CSSProperties}/>}
export function Card({children,label,selected=false,onClick}:{children:ReactNode;label:string;selected?:boolean;onClick?:()=>void}){return <button type="button" className="v-card" aria-label={label} aria-pressed={selected} onClick={onClick}>{children}</button>}
export function Tooltip({label,children}:{label:string;children:ReactNode}){const id=useId();return <span className="v-tooltip" tabIndex={0} aria-describedby={id}>{children}<span id={id} role="tooltip">{label}</span></span>}
