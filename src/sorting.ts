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
 return groups.map(g=>learningPool(words,g.filters,{...g.learning,exclusions:[...(g.learning.exclusions||[]),...exclusions]}).filter(w=>!banned.has(w.id)&&hasMaterial(w,pictures)));
}
export function makeSorting(pools:Word[][],counts:number[],rng=Math.random):SortItem[]{
 if(pools.some((p,i)=>p.length<counts[i]))throw Error('Недостаточно материала в одной из групп. Измените правила или количество элементов.');
 for(let i=0;i<pools.length;i++)for(let j=0;j<i;j++)if(pools[i].length===pools[j].length&&pools[i].every(w=>pools[j].some(v=>v.id===w.id)))throw Error('Группы '+(j+1)+' и '+(i+1)+' имеют одинаковый состав. Уточните их характеристики.');
 const shuffled=pools.map(p=>p.map(w=>({w,key:rng()})).sort((a,b)=>a.key-b.key).map(x=>x.w));
 const slots=counts.flatMap((n,g)=>Array.from({length:n},()=>g)),owners=new Map<string,number>(),assigned=new Map<number,Word>();
 function place(slot:number,seen:Set<string>):boolean{
  for(const w of shuffled[slots[slot]]){if(seen.has(w.id))continue;seen.add(w.id);const prior=owners.get(w.id);if(prior===undefined||place(prior,seen)){owners.set(w.id,slot);assigned.set(slot,w);return true;}}return false;
 }
 for(let i=0;i<slots.length;i++)if(!place(i,new Set()))throw Error('Не хватает разных элементов на все группы: подборки пересекаются. Уменьшите количество или уточните правила.');
 return [...assigned.values()].map(word=>({word,accepted:pools.flatMap((p,i)=>p.some(w=>w.id===word.id)?[i]:[])})).map(item=>({item,key:rng()})).sort((a,b)=>a.key-b.key).map(x=>x.item);
}

export function starsForScore(correct:number,total:number){const percent=total?Math.round(correct/total*100):0;return percent>=81?3:percent>=51?2:percent>=30?1:0;}
export function changeCount(groups:SortGroup[],index:number,count:number){return groups.map((g,i)=>i===index?{...g,count,edited:[...new Set([...g.edited,'count'])]}:g.edited.includes('count')?g:{...g,count});}
export function groupTitle(g:SortGroup){
 if(g.edited.includes('name'))return g.name;
 const l=g.learning;
 if(l.mode==='lexical')return (l.categoryPaths||[]).map(p=>p.split('/').at(-1)).join(', ')||'Выберите тему';
 if(l.sounds.length){const position=l.rules[l.sounds[0]]?.positions||[];const names:Record<string,string>={'начало':'в начале слова','середина':'в середине слова','конец':'в конце слова'};return 'Звук '+l.sounds.map(s=>s.toUpperCase()).join(', ')+(position.length===1?' '+(names[position[0]]||position[0]):'');}
 return l.mode==='reading'?'Чтение':l.mode==='structure'?'Слоговая структура':g.name;
}
