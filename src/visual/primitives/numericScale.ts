/** Native range inputs use indices when the available quantities are discrete. */
export function numericScale(min:number,max:number,values?:readonly number[]){
 const filtered=values?.filter(value=>Number.isFinite(value)&&value>=min&&value<=max);
 const stops=filtered?.length?Array.from(new Set(filtered)).sort((a,b)=>a-b):undefined;
 const nearest=(value:number)=>stops?stops.reduce((best,next)=>Math.abs(next-value)<Math.abs(best-value)?next:best,stops[0]):value;
 const clamp=(value:number)=>nearest(Math.max(min,Math.min(max,Math.round(value))));
 const index=(value:number)=>stops?stops.indexOf(nearest(value)):value;
 const at=(index:number)=>stops?stops[Math.max(0,Math.min(stops.length-1,Math.round(index)))]:index;
 const start=stops?0:min,end=stops?stops.length-1:max;
 const percent=(value:number)=>end<=start?0:Math.max(0,Math.min(100,(index(value)-start)/(end-start)*100));
 return {clamp,index,at,start,end,percent};
}
