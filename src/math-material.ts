import type {Word} from './material-types.ts';
export type MathSettings={includeZero?:boolean;answerOnly?:boolean;kind:'composition'|'examples';target:number;add:boolean;subtract:boolean};
export const defaultMath:MathSettings={includeZero:true,kind:'examples',target:10,add:true,subtract:true};
export function mathMaterial(options:Partial<MathSettings>={}):Word[]{const o={...defaultMath,...options},limit=Math.max(1,Math.min(20,Number.isFinite(o.target)?Math.trunc(o.target):defaultMath.target));const rows:Array<[string,number]>=[];
 if(o.kind==='composition'){for(let a=0;a<=limit;a++)rows.push([limit+' = '+a+' + ?',limit-a]);}else for(let a=0;a<=(o.answerOnly?20:limit);a++)for(let b=0;b<=(o.answerOnly?20:limit);b++){if(o.add&&a+b<=limit)rows.push([a+' + '+b,a+b]);if(o.subtract&&a>=b)rows.push([a+' − '+b,a-b]);}
 // One visible answer per pool avoids indistinguishable answers with different IDs.
 const byAnswer=new Map<number,Array<[string,number]>>();for(const row of rows.filter(([label,answer])=>o.includeZero||(answer!==0&&!/(^|\D)0(\D|$)/.test(label)))){const group=byAnswer.get(row[1])||[];group.push(row);byAnswer.set(row[1],group);}
 const distinct=o.answerOnly&&o.kind==='examples'?[...byAnswer.values()].flat().filter(row=>row[1]===limit):[...byAnswer.entries()].map(([,group])=>group[Math.floor(group.length/2)]);
 return distinct.map(([label,answer])=>({id:'math:'+label,label,answer:String(answer),topic:null,subcategory:null,position:'',type:null,opposition:[],weight:50,images:0}));}
