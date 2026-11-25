import {PickerTrigger} from './design-system/PickerTrigger.tsx';
import {PickerDialog} from './design-system/PickerDialog.tsx';
import {SelectionTree,type SelectionTreeNode} from './visual/compositions/SelectionTree.tsx';
import {useRef,useState} from 'react';
import type {Word} from './model.ts';
type Node={path:string;name:string;children:Node[]};
const ordered=(nodes:Node[])=>[...nodes].sort((a,b)=>Number(!!b.children.length)-Number(!!a.children.length)||a.name.localeCompare(b.name,'ru'));
function CategoryIcon({name}:{name:string}){const path=/живот|птиц|рыб/i.test(name)?'M5 10 3 4l6 3h6l6-3-2 6v7l-7 4-7-4Z M8 12h1 M15 12h1 M10 16h4':/природ|растен|дерев/i.test(name)?'m12 2-7 8h3l-5 7h7v5h4v-5h7l-5-7h3Z':/врем|календар/i.test(name)?'M4 5h16v16H4Z M8 2v6 M16 2v6 M4 10h16 M8 14h3 M14 17h3':/человек|професс/i.test(name)?'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 22v-4a8 8 0 0 1 16 0v4':'M3 6h7l2 3h9v12H3Z';return <svg className="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path}/></svg>}
export function CategoryPicker({words,selected,onChange}:{words:Word[];selected:string[];onChange:(paths:string[])=>void}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);const [draft,setDraft]=useState(selected);
 const paths=[...new Set(words.flatMap(w=>w.categories||[]))].sort((a,b)=>a.localeCompare(b,'ru'));
 const roots:Node[]=[];
 for(const path of paths){let nodes=roots;let prefix='';for(const name of path.split('/')){prefix=prefix?prefix+'/'+name:name;let node=nodes.find(n=>n.path===prefix);if(!node){node={path:prefix,name,children:[]};nodes.push(node);}nodes=node.children;}}
 const descendants=(path:string)=>paths.filter(value=>value===path||value.startsWith(path+'/'));
 function treeNode(node:Node):SelectionTreeNode{
  const all=descendants(node.path),count=all.filter(path=>draft.includes(path)).length;
  return {id:node.path,label:node.name,children:ordered(node.children).map(treeNode),checked:count===all.length,partial:count>0&&count<all.length,count,icon:<CategoryIcon name={node.name}/>};
 }
 const changeBranch=(path:string,checked:boolean)=>{const all=descendants(path);setDraft(current=>checked?[...new Set([...current,...all])]:current.filter(value=>!all.includes(value)))};
 const close=()=>{dialog.current?.close();trigger.current?.focus()};
 return <>
  <PickerTrigger ref={trigger} title="Выберите тему" description={selected.length>0?('Выбрано: '+selected.length+' — '+selected.slice(0,2).map(path=>path.split('/').at(-1)).join(', ')+(selected.length>2?` +${selected.length-2}`:'')):undefined} data-field-state={selected.length?'ready':'required'} aria-invalid={!selected.length||undefined} aria-label="Выбрать лексические темы" onClick={()=>{setDraft([...selected]);dialog.current?.showModal()}} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5h7l2 3h9v12H3Z"/><path d="M7 12h10M7 16h6"/></svg>}/>
  <PickerDialog ref={dialog} className="category-picker" label="Лексические темы" onConfirm={()=>{onChange(draft);close()}} onCancel={close} onDismiss={()=>trigger.current?.focus()}>
   <h2>Выберите тему</h2><SelectionTree nodes={ordered(roots).map(treeNode)} onChange={changeBranch}/>
  </PickerDialog>
 </>;
}

