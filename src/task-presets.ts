import {syllableStructureDescriptions} from './syllable-structure.ts';
import {initialLearning,defaultSoundRule,confirmSoundSelection,groups,type Learning} from './learning.ts';
import {alphabet,type ContentKind} from './reading.ts';
import {defaultFilters} from './model.ts';
import type {Filters,Word} from './material-types.ts';
export type TaskPreset={id:string;title:string;description:string;kind?:'topic'|'phonetic'|'structure'|'math';letter?:string;filters?:Filters;learning:Learning;presentation:'pictures'|'words';count:number;sorting?:{name:string;learning:Learning;count:number;filters?:Filters}[]};
const normalize=(value:string)=>value.toLocaleLowerCase('ru').replaceAll('ё','е').replaceAll('’',"'").trim();
const settings=(types:number[],untyped=false):Filters=>({...defaultFilters,types,untyped});
export function buildTaskPresets(words:Word[]):TaskPreset[]{
 const index=new Map<string,{paths:Set<string>;ids:Set<string>;pictures:Set<string>}>();
 for(const word of words)for(const leaf of word.categories||[]){const parts=leaf.split('/');for(let n=1;n<=parts.length;n++){const path=parts.slice(0,n).join('/'),node=index.get(path)||{paths:new Set<string>(),ids:new Set<string>(),pictures:new Set<string>()};node.paths.add(leaf);node.ids.add(word.id);if(word.variants?.length)node.pictures.add(word.id);index.set(path,node)}}
 const presets:TaskPreset[]=[];
 for(const [path,node] of index){if(!path.includes('/')||node.ids.size<3)continue;const title=path.split('/').at(-1)!,paths=[...node.paths],picture=node.pictures.size>=3,count=Math.min(8,picture?node.pictures.size:node.ids.size),learning:Learning={...initialLearning,mode:'lexical',categoryPaths:paths};
  const children=[...index].filter(([p,n])=>p.startsWith(path+'/')&&p.split('/').length===path.split('/').length+1&&n.pictures.size>=2);
  const peers=[...index].filter(([p,n])=>p!==path&&p.split('/').slice(0,-1).join('/')===path.split('/').slice(0,-1).join('/')&&n.pictures.size>=2);
  const bins=children.length>=2?children.slice(0,4):node.pictures.size>=2&&peers.length?[[path,node],peers[0]] as typeof children:[];
  const sorting=bins.map(([name,n])=>({name:name.split('/').at(-1)!,learning:{...initialLearning,mode:'lexical' as const,categoryPaths:[...n.paths]},count:Math.min(4,n.pictures.size)}));
  presets.push({id:'category:'+path,kind:'topic',title,description:path.split('/').slice(0,-1).join(' › ')+' · '+(picture?'Картинки':'Слова')+' · '+(picture?node.pictures.size:node.ids.size),learning,filters:{...defaultFilters},presentation:picture?'pictures':'words',count,...(sorting.length>=2?{sorting}:{} )});
  presets.push({id:'reading:'+path,kind:'topic',title:title+' · чтение',description:'Чтение слов по подтеме',learning:{...learning},filters:{...defaultFilters},presentation:'words',count:Math.min(8,node.ids.size)});
 }
 const sounds=[...new Set(Object.values(groups).flat())];
 for(const letter of alphabet){const variants=sounds.filter(s=>s[0]===letter);if(!variants.length){for(const kind of (['ь','ъ'].includes(letter)?['words']:['words','syllables']) as ContentKind[])presets.push({id:'letter:'+letter+':'+kind,kind:'phonetic',letter,title:letter.toUpperCase()+' чтение в '+(kind==='words'?'словах':'слогах'),description:'Чтение с буквой '+letter.toUpperCase(),learning:{...initialLearning,mode:'reading',contentKinds:[kind],reading:{available:alphabet,required:[letter]},...(kind==='syllables'?{syllablePatterns:['CV','VC']}:{} )},filters:{...defaultFilters},presentation:'words',count:6});continue;}
  for(const sound of variants)for(const kind of ['words','syllables'] as ContentKind[])for(const mode of ['automation','reading'] as const){
   const automation:Learning=confirmSoundSelection({...initialLearning,mode:'automation',sounds:[sound],rules:{[sound]:defaultSoundRule('automation')},contentKinds:[kind],...(kind==='syllables'?{syllablePatterns:sound.endsWith("'")?['CV','CVC']:['CV','VC'] as Learning['syllablePatterns']}:{})});
   const soft=sound.endsWith("'"),available=kind==='syllables'?[letter,...(soft?[...'яёюие']:[...'аоуыэ'])]:alphabet;
   const learning:Learning=mode==='automation'?automation:{...initialLearning,mode:'reading',contentKinds:[kind],reading:{available,required:[letter]},...(kind==='syllables'?{syllablePatterns:soft?['CV']:['CV','VC']}:{sounds:[sound],rules:{[sound]:defaultSoundRule('automation')},excludedSounds:automation.excludedSounds,exclusionsEdited:false})};
   presets.push({id:'phonetic:'+sound+':'+mode+':'+kind,kind:'phonetic',letter:sound,title:sound.toUpperCase()+' '+(mode==='automation'?'автоматизация':'чтение')+' в '+(kind==='words'?'словах':'слогах'),description:'Звук '+sound.toUpperCase()+' · '+(mode==='automation'?'Автоматизация':'Чтение'),learning,filters:{...defaultFilters},presentation:'words',count:kind==='syllables'&&soft?5:6});
  }
 }
 Object.entries(syllableStructureDescriptions).forEach(([key,description])=>{const type=Number(key),pool=words.filter(w=>w.type===type),images=pool.filter(w=>w.variants?.length);presets.push({id:'structure:'+type,kind:'structure',title:'Слоговая структура · '+type+' тип',description,learning:{...initialLearning,mode:'structure'},filters:settings([type]),presentation:images.length>=3?'pictures':'words',count:Math.max(3,Math.min(6,images.length>=3?images.length:pool.length))})});
 for(const target of [3,4,5,6,7,8,9,10])presets.push({id:'math:composition:'+target,kind:'math',title:'Состав числа '+target,description:'Состав · дополнение до '+target,learning:{...initialLearning,mode:'math',math:{kind:'composition',target,add:true,subtract:false}},filters:{...defaultFilters},presentation:'words',count:Math.min(6,target+1)});
 for(const [id,label,operations] of [['add','Сложение',{add:true,subtract:false}],['subtract','Вычитание',{add:false,subtract:true}],['mixed','Сложение и вычитание',{add:true,subtract:true}],['multiply','Умножение',{add:false,subtract:false,multiply:true}],['divide','Деление',{add:false,subtract:false,divide:true}]] as const)for(const target of [10,5,20])presets.push({id:'math:'+id+':'+target,kind:'math',title:label+' до '+target,description:'Примеры · '+label+' в пределах '+target,learning:{...initialLearning,mode:'math',math:{kind:'examples',target,...operations}},filters:{...defaultFilters},presentation:'words',count:6});
 return presets;
}
export function findTaskPresets(presets:TaskPreset[],query:string){
 const raw=query.toLocaleLowerCase('ru').replaceAll('’',"'").trim(),q=normalize(raw);if(!q)return [];
 if(/^[а-яё](?:')?$/.test(raw))return presets.filter(p=>p.kind==='phonetic'&&(raw.endsWith("'")?p.letter===raw:p.letter?.[0]===raw)).slice(0,8);
 const tokens=q.split(/\s+/),plainWord=/^[а-яё]+$/.test(q);
 return presets.filter(p=>(!plainWord||p.kind!=='phonetic')&&tokens.every(token=>normalize(p.title+(p.kind==='topic'?'':' '+p.description)).includes(token))).map((preset,index)=>({preset,index})).sort((a,b)=>Number(normalize(b.preset.title)===q)-Number(normalize(a.preset.title)===q)||(a.preset.kind==='topic'&&b.preset.kind==='topic'?a.preset.title.localeCompare(b.preset.title,'ru'):a.index-b.index)).slice(0,8).map(p=>p.preset);
}
