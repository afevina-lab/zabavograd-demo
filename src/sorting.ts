import type {Word,Filters} from './material-types.ts';
import {defaultFilters} from './model.ts';
import {initialLearning,learningPool,type Learning} from './learning.ts';
import {hasMaterial} from './material-policy.ts';
export type SortGroup={name:string;count:number;learning:Learning;filters:Filters;edited:string[]};
export const newGroup=(index:number):SortGroup=>({name:'Группа '+(index+1),count:4,learning:structuredClone(initialLearning),filters:structuredClone(defaultFilters),edited:[]});
export function updateGroup(groups:SortGroup[],index:number,section:'learning'|'filters',part:Record<string,unknown>):SortGroup[]{
 return groups.map((g,i)=>{
  const data={...g[section]} as Record<string,unknown>,edited=[...g.edited];
  for(const [key,value] of Object.entries(part)){
   const path=section+'.'+key;
   if(i===index||!edited.includes(path)){data[key]=structuredClone(value);if(i===index&&!edited.includes(path))edited.push(path);}
  }
  return {...g,[section]:data,edited};
 });
}
export type SortItem={word:Word;accepted:number[]};
export function sortingPools(words:Word[],groups:SortGroup[],exclusions:{learning:Learning;filters:Filters}[],pictures:boolean){
 const banned=new Set(exclusions.flatMap(e=>learningPool(words,e.filters,e.learning,false).map(w=>w.id)));
 const pools=groups.map(g=>learningPool(words,g.filters,{...g.learning,exclusions:[...(g.learning.exclusions||[]),...exclusions]}).filter(w=>!banned.has(w.id)&&hasMaterial(w,pictures)));
 const soundGroup=(i:number)=>['automation','differentiation'].includes(groups[i].learning.mode)&&groups[i].learning.sounds.length>0;
 const membership=new Map<string,number[]>();
 pools.forEach((pool,i)=>{if(soundGroup(i))for(const word of pool)membership.set(word.id,[...(membership.get(word.id)||[]),i]);});
 return pools.map((pool,i)=>soundGroup(i)?pool.filter(word=>!(membership.get(word.id)||[]).some(j=>j!==i&&groups[j].learning.sounds.every(sound=>!groups[i].learning.sounds.includes(sound)))):pool);
}
export function makeSorting(pools:Word[][],counts:number[],rng=Math.random):SortItem[]{
 if(pools.some((p,i)=>p.length<counts[i]))throw Error('Недостаточно материала в одной из групп. Измените правила или количество элементов.');
 for(let i=0;i<pools.length;i++)for(let j=0;j<i;j++)if(pools[i].length===pools[j].length&&pools[i].every(w=>pools[j].some(v=>v.id===w.id)))throw Error('Группы '+(j+1)+' и '+(i+1)+' имеют одинаковый состав. Уточните их характеристики.');
 const shuffled=pools.map(p=>p.map(w=>({w,key:rng()})).sort((a,b)=>a.key-b.key).map(x=>x.w));
 // Each group gets approximately half words and half syllables when both
 // are enabled and available. Strict matching keeps all meaning IDs unique.
 const slots=counts.flatMap((n,g)=>{
  const syllables=pools[g].filter(w=>w.materialKind==='syllables').length;
  const words=pools[g].length-syllables;
  const mixed=syllables>0&&words>0;
  const desired=mixed?Math.min(syllables,Math.max(n-words,Math.round(n/2))):0;
  return Array.from({length:n},(_,i)=>({group:g,kind:mixed?(i<desired?'syllables':'words'):null}));
 });
 function assign(strict:boolean):Map<number,Word>|null{
  const owners=new Map<string,number>(),assigned=new Map<number,Word>();
  function place(slot:number,seen:Set<string>):boolean{
   const {group,kind}=slots[slot];
   for(const w of shuffled[group]){
    if(strict&&kind&&(w.materialKind==='syllables'?'syllables':'words')!==kind)continue;
    if(seen.has(w.id))continue;seen.add(w.id);
    const prior=owners.get(w.id);
    if(prior===undefined||place(prior,seen)){owners.set(w.id,slot);assigned.set(slot,w);return true;}
   }
   return false;
  }
  for(let i=0;i<slots.length;i++)if(!place(i,new Set()))return null;
  return assigned;
 }
 const assigned=assign(true)||assign(false);
 if(!assigned)throw Error('Не хватает разных элементов на все группы: подборки пересекаются. Уменьшите количество или уточните правила.');
 return [...assigned.values()].map(word=>({word,accepted:pools.flatMap((p,i)=>p.some(w=>w.id===word.id)?[i]:[])})).map(item=>({item,key:rng()})).sort((a,b)=>a.key-b.key).map(x=>x.item);
}

export {starsForScore} from './result-score.ts';
export function changeCount(groups:SortGroup[],index:number,count:number){return groups.map((g,i)=>i===index?{...g,count,edited:[...new Set([...g.edited,'count'])]}:g.edited.includes('count')?g:{...g,count});}
export function groupTitle(g:SortGroup){
 if(g.edited.includes('name'))return g.name;
 const l=g.learning;
 if(l.mode==='math')return (l.math?.kind==='composition'?'Состав числа ':'Ответ: ')+(l.math?.target??10);
 if(l.mode==='lexical')return (l.categoryPaths||[]).map(p=>p.split('/').at(-1)).join(', ')||'Выберите тему';
 if(l.sounds.length){const position=l.rules[l.sounds[0]]?.positions||[];const names:Record<string,string>={'начало':'в начале слова','середина':'в середине слова','конец':'в конце слова'};return 'Звук '+l.sounds.map(s=>s.toUpperCase()).join(', ')+(position.length===1?' '+(names[position[0]]||position[0]):'');}
 return l.mode==='reading'?'Чтение':l.mode==='structure'?'Слоговая структура':g.name;
}
