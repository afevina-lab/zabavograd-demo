import type {Word} from './model.ts';
type Node={path:string;name:string;children:Node[]};
export function CategoryPicker({words,selected,onChange}:{words:Word[];selected:string[];onChange:(paths:string[])=>void}){
 const paths=[...new Set(words.flatMap(w=>w.categories||[]))].sort((a,b)=>a.localeCompare(b,'ru'));
 const roots:Node[]=[];
 for(const path of paths){let nodes=roots;let prefix='';for(const name of path.split('/')){prefix=prefix?prefix+'/'+name:name;let node=nodes.find(n=>n.path===prefix);if(!node){node={path:prefix,name,children:[]};nodes.push(node);}nodes=node.children;}}
 function render(node:Node){const descendants=paths.filter(p=>p===node.path||p.startsWith(node.path+'/'));const count=descendants.filter(p=>selected.includes(p)).length;
 const checkbox=<label className="check"><input type="checkbox" checked={count===descendants.length} ref={el=>{if(el)el.indeterminate=count>0&&count<descendants.length}} onChange={e=>onChange(e.target.checked?[...new Set([...selected,...descendants])]:selected.filter(p=>!descendants.includes(p)))}/>{node.children.length?'Выбрать всё':node.name}</label>;
 return <li key={node.path}>{node.children.length?<details><summary>{node.name}{count>0?' · '+count:''}</summary>{checkbox}<ul>{node.children.map(render)}</ul></details>:checkbox}</li>;
 }
 return <details className="filter-details category-picker"><summary>Темы: {selected.length?'выбрано '+selected.length:'выберите'}</summary><ul>{roots.map(render)}</ul></details>;
}
