import {Children,isValidElement,type ReactNode,type SelectHTMLAttributes} from 'react';
import {SelectControl as SelectPrimitive,type SelectIcon} from '../visual/primitives/Select.tsx';
export type {SelectIcon} from '../visual/primitives/Select.tsx';
export function selectIcon(label:string):SelectIcon{return /слож|скорост/i.test(label)?'speed':/провер|услов/i.test(label)?'check':/груп|колич|элемент/i.test(label)?'group':/режим карточ|соотнест|задани/i.test(label)?'match':/карточ|материал/i.test(label)?'cards':/врем|секунд/i.test(label)?'time':/букв|слог|чтени/i.test(label)?'letters':/задач|темат/i.test(label)?'task':'choices'}
export function SelectControl({icon='choices',children,...props}:SelectHTMLAttributes<HTMLSelectElement>&{icon?:SelectIcon}){
 const options:{value:string;disabled?:boolean;label:string}[]=[];
 function collect(nodes:ReactNode){Children.forEach(nodes,node=>{if(!isValidElement<{value?:string|number;disabled?:boolean;children?:ReactNode}>(node))return;if(node.type==='option')options.push({value:String(node.props.value??node.props.children??''),disabled:node.props.disabled,label:String(node.props.children??'')});else if(node.props.children)collect(node.props.children)})}
 collect(children);
 const value=String(props.value??props.defaultValue??options[0]?.value??''),option=options.find(o=>o.value===value);
 const missing=!props.disabled&&(props['aria-invalid']===true||!!option?.disabled||(value===''&&(!!props.required||/выбер|не выбран/i.test(option?.label||''))));
 return <SelectPrimitive {...props} icon={icon} fieldState={missing?'required':'ready'} classNames={{root:'select-control',leading:'select-leading',caret:'select-caret'}} required={props.required||missing} aria-required={props.required||missing||undefined} aria-invalid={missing||props['aria-invalid']||undefined}>{children}</SelectPrimitive>;
}

