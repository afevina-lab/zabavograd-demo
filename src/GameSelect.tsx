import {useId,type ReactNode} from 'react';
export function GameSelect({label,value,onChange,children,ariaLabel,hideLabel=false}:{label:string;value:string;onChange:(value:string)=>void;children:ReactNode;ariaLabel?:string;choiceClassName?:string;hideLabel?:boolean}){
 const id=useId();
 return <div className="game-choice"><label className="field-label" htmlFor={id} hidden={hideLabel}>{label}</label><select id={id} aria-label={ariaLabel||label} value={value} onChange={event=>onChange(event.target.value)}>{children}</select></div>;
}
