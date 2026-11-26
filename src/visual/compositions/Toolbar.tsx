import {visualClasses} from '../primitives/classNames.ts';
import type {ReactNode} from 'react';
export type ToolbarClasses={root:string;navigation:string;status:string;task:string;counters:string;view:string;hint:string};
const classes:ToolbarClasses={root:'v-toolbar',navigation:'v-toolbar-navigation',status:'v-toolbar-status',task:'v-toolbar-task',counters:'v-toolbar-counters',view:'v-toolbar-view',hint:'v-toolbar-hint'};
export type ToolbarProps={pause:ReactNode;sound:ReactNode;hint:ReactNode;task:ReactNode;counters?:ReactNode;fullscreen:ReactNode;help?:ReactNode;classNames?:ToolbarClasses};
export function Toolbar({pause,sound,hint,task,counters,fullscreen,help,classNames=classes}:ToolbarProps){
 classNames=visualClasses(classes,classNames);
 return <header className={classNames.root}>
  <nav className={classNames.navigation} aria-label="Управление игрой">{pause}{sound}{hint}</nav>
  <div className={classNames.status}><strong className={classNames.task}>{task}</strong><div className={classNames.counters}>{counters}</div></div>
  <div className={classNames.view}>{fullscreen}</div>
  {help&&<p className={classNames.hint+' v-surface--panel'} role="status">{help}</p>}
 </header>;
}
