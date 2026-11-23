import type {Word} from './material-types.ts';
export function orderedWords(words:Word[],selected:string[],eligibleIds?:string[]){
 const chosen=new Set(selected),eligible=eligibleIds?new Set(eligibleIds):null;
 const rank=(w:Word)=>chosen.has(w.id)?0:!eligible||eligible.has(w.id)?1:2;
 return [...new Map(words.map(w=>[w.id,w])).values()].sort((a,b)=>rank(a)-rank(b)||a.label.localeCompare(b.label,'ru')||a.id.localeCompare(b.id));
}
