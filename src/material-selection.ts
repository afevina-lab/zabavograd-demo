import type {Word} from './material-types.ts';
import {canSelectAutomatically} from './material-policy.ts';
export function pickWords(words:Word[],count:number,rng=Math.random):Word[]{
 const pool=words.filter(canSelectAutomatically).slice(),result:Word[]=[];
 if(!Number.isInteger(count)||count<0||count>pool.length)throw new Error('Недостаточно слов для выбранного количества пар.');
 if(new Set(pool.map(w=>w.id)).size!==pool.length)throw new Error('Повторяющиеся слова.');
 while(result.length<count){let n=rng()*pool.reduce((sum,w)=>sum+w.weight,0);let i=pool.length-1;for(let j=0;j<pool.length;j++){n-=pool[j].weight;if(n<0){i=j;break;}}result.push(pool.splice(i,1)[0]);}return result;
}
