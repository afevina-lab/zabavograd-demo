import type {ReactNode} from 'react';
import {Choice} from '../primitives/Choice.tsx';
import {ControlWell} from '../primitives/ControlWell.tsx';
export type SelectionTreeNode={id:string;label:string;children:readonly SelectionTreeNode[];checked:boolean;partial:boolean;count:number;icon?:ReactNode};
export type SelectionTreeClasses={root:string;branch:string;leaf:string;name:string;count:string;children:string;choice:string;well:string};
const classes:SelectionTreeClasses={root:'v-selection-tree',branch:'v-tree-branch',leaf:'v-tree-leaf',name:'v-tree-name',count:'v-tree-count',children:'v-tree-children',choice:'v-choice',well:'v-tree-well'};
/** The caller supplies category relationships and selection state; this owns only the tree UI. */
export function SelectionTree({nodes,onChange,classNames=classes}:{nodes:readonly SelectionTreeNode[];onChange:(id:string,checked:boolean)=>void;classNames?:SelectionTreeClasses}){
 function render(node:SelectionTreeNode):ReactNode{
  const mark=(element:HTMLInputElement|null)=>{if(element)element.indeterminate=node.partial};
  return <li key={node.id} className={node.children.length?classNames.branch:classNames.leaf}>
   {node.children.length?<details>
    <summary>{node.icon}<span className={classNames.name}>{node.label}</span>{node.count>0&&<small className={classNames.count}>{node.count}</small>}
     <input type="checkbox" aria-label={'Выбрать весь раздел: '+node.label} checked={node.checked} ref={mark} onClick={event=>event.stopPropagation()} onChange={event=>onChange(node.id,event.target.checked)}/>
     <ControlWell className={classNames.well}/>
    </summary>
    <div className={classNames.children}><ul>{node.children.map(render)}</ul></div>
   </details>:<Choice className={classNames.choice} label={node.label} checked={node.checked} inputRef={mark} onChange={checked=>onChange(node.id,checked)}/>}
  </li>;
 }
 return <ul className={classNames.root}>{nodes.map(render)}</ul>;
}
