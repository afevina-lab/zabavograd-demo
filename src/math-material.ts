import type {Word} from './material-types.ts';
export type MathSettings={includeZero?:boolean;answerOnly?:boolean;kind:'composition'|'examples';target:number;add:boolean;subtract:boolean;multiply?:boolean;divide?:boolean};
export const defaultMath:MathSettings={includeZero:true,kind:'examples',target:10,add:true,subtract:true,multiply:false,divide:false};
/** Ordered curriculum stops for the numeric slider, not a linear 1–1000 scale. */
export const MATH_STOPS=[1,2,...Array.from({length:18},(_,i)=>i+3),25,30,35,40,45,50,60,70,80,90,100,200,300,400,500,1000];
export const maxMathTarget=1000;
export function mathMaterial(options:Partial<MathSettings>={}):Word[]{
 const o={...defaultMath,...options},limit=Math.max(1,Math.min(maxMathTarget,Number.isFinite(o.target)?Math.trunc(o.target):defaultMath.target));
 const includeZero=o.includeZero!==false,rows:Array<[string,number]>=[];
 if(o.kind==='composition'){
  for(let a=includeZero?0:1;a<=limit-(includeZero?0:1);a++)rows.push([limit+' = '+a+' + ?',limit-a]);
 }else{
  if(!o.add&&!o.subtract&&!o.multiply&&!o.divide)return [];
  // Bounded generation: 1000 squared combinations must never block the UI.
  for(let result=includeZero?0:1;result<=limit;result++){
   const half=Math.floor(result/2);
   if(o.add){
    const a=includeZero?half:Math.max(1,half),b=result-a;
    if(includeZero||a>0&&b>0)rows.push([a+' + '+b,result]);
   }
   if(o.subtract){
    const b=includeZero?Math.min(result,Math.floor((limit-result)/2)):Math.min(Math.max(1,Math.floor((limit-result)/2)),limit-result);
    if((includeZero||b>0)&&result+b<=limit)rows.push([(result+b)+' − '+b,result]);
   }
   if(o.multiply){
    if(result===0){if(includeZero)rows.push(['0 × 2',0]);}
    else {
     let factor=1;
     for(let d=Math.min(12,Math.floor(Math.sqrt(result)));d>=2;d--)if(result%d===0){factor=d;break;}
     rows.push([factor+' × '+(result/factor),result]);
    }
   }
   if(o.divide){
    const divisor= result===0?2:Math.min(12,Math.floor(limit/result));
    if(divisor>=1&&(includeZero||result>0))rows.push([(result*divisor)+' ÷ '+divisor,result]);
   }
  }
 }
 const filtered=rows.filter(([label,answer])=>includeZero||answer!==0&&!/(^|\D)0(\D|$)/.test(label));
 const byAnswer=new Map<number,Array<[string,number]>>();
 for(const row of filtered){const group=byAnswer.get(row[1])||[];group.push(row);byAnswer.set(row[1],group);}
 const distinct=o.answerOnly&&o.kind==='examples'?[...byAnswer.values()].flat().filter(row=>row[1]===limit):[...byAnswer.values()].map(group=>group[Math.floor(group.length/2)]);
 return distinct.map(([label,answer])=>({id:'math:'+label,label,answer:String(answer),topic:null,subcategory:null,position:'',type:null,opposition:[],weight:50,images:0}));
}
