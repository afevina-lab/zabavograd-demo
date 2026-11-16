import type {Word} from './material-types.ts';
export type Family={id:string;male_id:string|null;female_id:string|null;offspring_id:string|null};
export type Appearance='original'|'silhouette'|'outline'|'word';
export type MatchElement={id:string;word:Word;appearance:Appearance};
export type MatchGroup={id:string;elements:MatchElement[]};
export const inTopic=(w:Word,topic:string)=>(w.categories||[]).some(p=>p===topic||p.startsWith(topic+'/'));
export function familyGroups(words:Word[],families:Family[],topic:string,size:number):MatchGroup[]{
 if(!topic||![2,3].includes(size))return [];
 const byId=new Map(words.map(w=>[w.id,w]));
 return families.flatMap(f=>{
 const male=byId.get(f.male_id||''),female=byId.get(f.female_id||''),child=byId.get(f.offspring_id||'');
 const adult=[female,male].find(w=>w&&inTopic(w,topic));
 const members=size===2?[adult,child]:[male,female,child];
 if(!adult||members.some(w=>!w))return [];
 return [{id:f.id,elements:members.map((w,i)=>({id:f.id+':'+i,word:w!,appearance:'original' as const}))}];
 });
}
export function visualGroups(words:Word[],topic:string,appearance:Appearance):MatchGroup[]{
 return words.filter(w=>w.weight>0&&inTopic(w,topic)&&w.variants?.length).map(w=>({id:w.id,elements:[{id:w.id+':0',word:w,appearance:'original'},{id:w.id+':1',word:w,appearance}]}));
}
export function validateGroups(groups:MatchGroup[],size:number):string{
 if(size<2||size>5)return 'В группе должно быть от 2 до 5 элементов.';
 if(!groups.length)return 'Нет полных групп. Измените тему или составьте группы вручную.';
 const ids=new Set<string>();
 for(const g of groups){
 if(g.elements.length!==size)return 'Заполните все места каждой группы.';
 for(const e of g.elements){if(ids.has(e.id))return 'Элементы должны иметь разные идентификаторы.';ids.add(e.id);}
 }
 return '';
}
export function accepts(group:MatchGroup,element:MatchElement){return group.elements.slice(1).some(e=>e.word.id===element.word.id&&e.appearance===element.appearance);}
export function shuffled<T>(values:T[],random= Math.random):T[]{const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function checkMatching(groups:MatchGroup[],placements:Record<string,string[]>):Record<string,boolean>{
 const bank=new Map(groups.flatMap(g=>g.elements.slice(1)).map(e=>[e.id,e]));
 const verdict:Record<string,boolean>={};
 const used=new Set<string>();
 for(const g of groups){const expected=g.elements.slice(1).map(e=>e.word.id+'|'+e.appearance);
 for(const id of placements[g.id]||[]){const e=bank.get(id),key=e?e.word.id+'|'+e.appearance:'',i=expected.indexOf(key);verdict[id]=!!e&&i>=0&&!used.has(id);if(verdict[id])expected.splice(i,1);used.add(id);}
 }return verdict;
}
