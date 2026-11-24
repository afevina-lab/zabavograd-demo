import {SelectControl,selectIcon} from './design-system/SelectControl.tsx';
import {Field} from './visual/primitives/Field.tsx';
import type {ReactNode} from 'react';
const classes={root:'game-choice',label:'field-label',description:''};
export function GameSelect({label,value,onChange,children,ariaLabel,choiceClassName='',hideLabel=false}:{label:string;value:string;onChange:(value:string)=>void;children:ReactNode;ariaLabel?:string;choiceClassName?:string;hideLabel?:boolean}){
 return <Field label={label} hideLabel={hideLabel} className={choiceClassName} classNames={classes}>{id=><SelectControl icon={selectIcon(label)} id={id} aria-label={ariaLabel||label} value={value} onChange={event=>onChange(event.target.value)}>{children}</SelectControl>}</Field>;
}
