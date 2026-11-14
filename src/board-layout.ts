export function memoryLayout(count:number,width:number,height:number){
 return Array.from({length:Math.max(1,Math.min(count,10)-1)},(_,i)=>i+2).map(cols=>{
  const rows=Math.ceil(count/cols);
  return {cols,width:Math.max(0,Math.min((width-36-(cols-1)*12)/cols,(height-36-(rows-1)*12)/rows*1.05))};
 }).sort((a,b)=>b.width-a.width)[0];
}
export function sortingLayout(width:number,height:number,tray:number,groups:number[]){
 const columns=Math.max(1,Math.min(groups.length,width<700?2:groups.length));
 const inner=Math.max(1,width-24),binWidth=(inner-(columns-1)*8)/columns;
 for(let card=220;card>=16;card--){
  const cardHeight=card*1.08;
  const trayColumns=Math.max(1,Math.floor((inner+8)/(card+8)));
  const perBin=Math.max(1,Math.floor((binWidth-16+6)/(card+6)));
  let binsHeight=0;
  for(let i=0;i<groups.length;i+=columns)binsHeight+=Math.max(...groups.slice(i,i+columns).map(n=>44+Math.ceil(n/perBin)*(cardHeight+6)))+8;
  if(Math.ceil(tray/trayColumns)*(cardHeight+8)+binsHeight+48<=height)return {card,columns};
 }
 return {card:16,columns};
}
