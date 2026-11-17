export async function fillPrepared<T,R>(candidates:T[],count:number,prepare:(candidate:T)=>Promise<R|null>,cancelled:()=>boolean=()=>false,onChecked:(count:number)=>void=()=>{}){
 const result:R[]=[];let checked=0;
 for(const candidate of candidates){if(cancelled()||result.length>=count)break;const ready=await prepare(candidate);if(cancelled())return [];if(ready!==null)result.push(ready);onChecked(++checked);}
 return result;
}
