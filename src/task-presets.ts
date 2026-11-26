import {initialLearning,defaultSoundRule,type Learning} from './learning.ts';
import {defaultFilters} from './model.ts';
import type {Word} from './material-types.ts';
export type TaskPreset={id:string;title:string;description:string;learning:Learning;presentation:'pictures'|'words';count:number;sorting?:{name:string;learning:Learning;count:number}[]};
const normalize=(value:string)=>value.toLocaleLowerCase('ru').replaceAll('ё','е').trim();
export function buildTaskPresets(words:Word[]):TaskPreset[]{
 const index=new Map<string,{paths:Set<string>;ids:Set<string>;pictures:Set<string>}>();
 for(const word of words)for(const leaf of word.categories||[]){const parts=leaf.split('/');for(let n=1;n<=parts.length;n++){const path=parts.slice(0,n).join('/'),node=index.get(path)||{paths:new Set<string>(),ids:new Set<string>(),pictures:new Set<string>()};node.paths.add(leaf);node.ids.add(word.id);if(word.variants?.length)node.pictures.add(word.id);index.set(path,node)}}
 const presets:TaskPreset[]=[];
 for(const [path,node] of index){if(node.ids.size<3)continue;const title=path.split('/').at(-1)!,paths=[...node.paths],picture=node.pictures.size>=3,count=Math.min(8,picture?node.pictures.size:node.ids.size),learning:Learning={...initialLearning,mode:'lexical',categoryPaths:paths};
  const children=[...index].filter(([p,n])=>p.startsWith(path+'/')&&p.split('/').length===path.split('/').length+1&&n.pictures.size>=2);
  const peers=[...index].filter(([p,n])=>p!==path&&p.split('/').slice(0,-1).join('/')===path.split('/').slice(0,-1).join('/')&&n.pictures.size>=2);
  const bins=children.length>=2?children.slice(0,4):node.pictures.size>=2&&peers.length?[[path,node],peers[0]] as typeof children:[];
  const sorting=bins.map(([name,n])=>({name:name.split('/').at(-1)!,learning:{...initialLearning,mode:'lexical' as const,categoryPaths:[...n.paths]},count:Math.min(4,n.pictures.size)}));
  presets.push({id:'category:'+path,title,description:(picture?'Картинки':'Слова')+' · '+(picture?node.pictures.size:node.ids.size)+' элементов',learning,presentation:picture?'pictures':'words',count,...(sorting.length>=2?{sorting}:{} )});
  presets.push({id:'reading:'+path,title:title+' · чтение',description:'Чтение слов по теме',learning:{...initialLearning,mode:'reading',contentKinds:['words'],additional:[{learning,filters:defaultFilters}]},presentation:'words',count:Math.min(8,node.ids.size)});
 }
 for(const sound of ['р','л','с','з','ш','ж',"ч'","щ'"])presets.push({id:'sound:'+sound,title:'Звук '+sound.toUpperCase(),description:'Автоматизация звука в словах',learning:{...initialLearning,mode:'automation',sounds:[sound],rules:{[sound]:defaultSoundRule('automation')},contentKinds:['words']},presentation:'words',count:6});
 for(const [id,title,math] of [['add','Сложение до 10',{add:true,subtract:false}],['subtract','Вычитание до 10',{add:false,subtract:true}],['composition','Состав числа 5',{kind:'composition' as const,target:5}] ] as const)presets.push({id:'math:'+id,title,description:'Готовое математическое задание',learning:{...initialLearning,mode:'math',math:{kind:'examples',target:10,add:true,subtract:false,...math}},presentation:'words',count:6});
 return presets;
}
export function findTaskPresets(presets:TaskPreset[],query:string){const q=normalize(query);if(!q)return [];const tokens=q.split(/\s+/);return presets.filter(p=>tokens.every(token=>normalize(p.title+' '+p.description).includes(token))).sort((a,b)=>Number(normalize(b.title)===q)-Number(normalize(a.title)===q)||a.title.localeCompare(b.title,'ru')).slice(0,8)}
