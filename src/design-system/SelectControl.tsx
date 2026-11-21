import {ControlWell} from './ControlWell.tsx';
import {Children,isValidElement,type ReactNode,type SelectHTMLAttributes} from 'react';
export type SelectIcon='task'|'cards'|'check'|'speed'|'group'|'match'|'time'|'letters'|'choices';
const paths:Record<SelectIcon,string>={task:'M5 4h14v16H5Z M8 8h8 M8 12h5 M8 16h7',cards:'M7 5h13v15H7Z M4 17H2V2h13',check:'M4 12l5 5L20 6',speed:'M4 19v-5h3v5Z M11 19V9h3v10Z M18 19V4h3v15Z',group:'M3 3h7v7H3Z M14 3h7v7h-7Z M3 14h7v7H3Z M14 14h7v7h-7Z',match:'M3 7h16m-4-4 4 4-4 4 M21 17H5m4-4-4 4 4 4',time:'M9 2h6 M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16 M12 9v5l3 2',letters:'M3 19 9 4l6 15 M5 14h8 M17 9h4 M19 9v10',choices:'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6'};
export function selectIcon(label:string):SelectIcon{return /слож|скорост/i.test(label)?'speed':/провер|услов/i.test(label)?'check':/груп|колич|элемент/i.test(label)?'group':/режим карточ|соотнест|задани/i.test(label)?'match':/карточ|материал/i.test(label)?'cards':/врем|секунд/i.test(label)?'time':/букв|слог|чтени/i.test(label)?'letters':/задач|темат/i.test(label)?'task':'choices'}
export function SelectControl({icon='choices',children,...props}:SelectHTMLAttributes<HTMLSelectElement>&{icon?:SelectIcon}){
 const options:{value:string;disabled?:boolean;label:string}[]=[];
 function collect(nodes:ReactNode){Children.forEach(nodes,node=>{if(!isValidElement<{value?:string|number;disabled?:boolean;children?:ReactNode}>(node))return;if(node.type==='option')options.push({value:String(node.props.value??node.props.children??''),disabled:node.props.disabled,label:String(node.props.children??'')});else if(node.props.children)collect(node.props.children)})}
 collect(children);
 const value=String(props.value??props.defaultValue??options[0]?.value??''),option=options.find(o=>o.value===value);
 const missing=!props.disabled&&(props['aria-invalid']===true||!!option?.disabled||(value===''&&(!!props.required||/выбер|не выбран/i.test(option?.label||''))));
 return <span data-field-state={missing?'required':'ready'} className={'select-control'+(props.disabled?' is-disabled':'')}><span className="select-leading" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={paths[icon]}/></svg></span><select {...props} required={props.required||missing} aria-required={props.required||missing||undefined} aria-invalid={missing||props['aria-invalid']||undefined}>{children}</select><ControlWell className="select-caret"/></span>;
}
