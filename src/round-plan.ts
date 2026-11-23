export type RoundMaterial='memory'|'sorting'|'matching'|'conveyor'|'transformations';
export function splitRounds<T>(items:T[],rounds:number,key?:(item:T)=>string){
 const count=Math.max(1,Math.min(items.length||1,Math.floor(rounds)||1));
 const chunks:T[][]=Array.from({length:count},()=>[]);
 if(key){const groups=new Map<string,T[]>();for(const item of items){const k=key(item);groups.set(k,[...(groups.get(k)||[]),item]);}for(const group of groups.values())group.forEach((item,i)=>chunks[i%count].push(item));}
 else for(let i=0,offset=0;i<count;i++){const length=Math.ceil((items.length-offset)/(count-i));chunks[i]=items.slice(offset,offset+length);offset+=length;}
 return chunks.filter(c=>c.length);
}
export function suggestedRounds(total:number,material:RoundMaterial,width:number,height:number,options:{text?:boolean;groupSize?:number;maxRounds?:number}={}){
 const columns=Math.max(1,Math.floor((width-24)/(options.text?140:112)));
 const rows=Math.max(1,Math.floor((height-180)/128));
 const capacity=material==='memory'?Math.max(3,Math.floor(columns*rows/2)):material==='matching'?Math.max(1,Math.floor(columns*rows/(options.groupSize||2))):material==='sorting'?Math.max(3,columns*Math.max(1,Math.floor(rows/2))):options.text?12:8;
 return Math.max(1,Math.min(options.maxRounds??10,Math.ceil(total/capacity)));
}

export function roundNoun(count:number){return count%100>=11&&count%100<=14?'раундов':count%10===1?'раунд':count%10>=2&&count%10<=4?'раунда':'раундов';}
