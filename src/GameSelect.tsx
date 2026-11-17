import {Children,isValidElement,type ReactNode} from 'react';
export function GameSelect({label,value,onChange,children,ariaLabel,choiceClassName='',hideLabel=false}:{label:string;value:string;onChange:(value:string)=>void;children:ReactNode;ariaLabel?:string;choiceClassName?:string;hideLabel?:boolean}){
 const options=Children.toArray(children).filter(isValidElement<{value?:string;disabled?:boolean;children:ReactNode}>);
 return <div className="game-choice"><span className="field-label" hidden={hideLabel}>{label}</span><select hidden aria-label={ariaLabel||label} value={value} onChange={event=>onChange(event.target.value)}>{children}</select><div className={"choice-tiles "+choiceClassName} role="group" aria-label={label}>{options.map((option,i)=>{const v=String(option.props.value??option.props.children);return <button type="button" key={v||i} disabled={option.props.disabled} aria-pressed={value===v} onClick={()=>onChange(v)}>{option.props.children}</button>})}</div></div>;
}
