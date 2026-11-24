import type {SelectHTMLAttributes} from 'react';
import {ControlWell} from './ControlWell.tsx';
export type SelectIcon='task'|'cards'|'check'|'speed'|'group'|'match'|'time'|'letters'|'choices';
const paths:Record<SelectIcon,string>={task:'M5 4h14v16H5Z M8 8h8 M8 12h5 M8 16h7',cards:'M7 5h13v15H7Z M4 17H2V2h13',check:'M4 12l5 5L20 6',speed:'M4 19v-5h3v5Z M11 19V9h3v10Z M18 19V4h3v15Z',group:'M3 3h7v7H3Z M14 3h7v7h-7Z M3 14h7v7H3Z M14 14h7v7h-7Z',match:'M3 7h16m-4-4 4 4-4 4 M21 17H5m4-4-4 4 4 4',time:'M9 2h6 M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16 M12 9v5l3 2',letters:'M3 19 9 4l6 15 M5 14h8 M17 9h4 M19 9v10',choices:'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6'};
export type SelectClasses={root:string;leading:string;caret:string};
const classes:SelectClasses={root:'v-select',leading:'v-select-leading',caret:'v-select-caret'};
/** Native select semantics; required state is explicit, never inferred from visible wording. */
export function SelectControl({icon='choices',children,classNames=classes,fieldState='ready',...props}:SelectHTMLAttributes<HTMLSelectElement>&{icon?:SelectIcon;classNames?:SelectClasses;fieldState?:'required'|'ready'}){
 return <span data-field-state={fieldState} className={classNames.root+(props.disabled?' is-disabled':'')}>
  <span className={classNames.leading} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={paths[icon]}/></svg></span>
  <select {...props}>{children}</select>
  <ControlWell className={classNames.caret}/>
 </span>;
}
