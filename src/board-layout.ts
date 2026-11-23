export function memoryLayout(count:number,width:number,height:number){
 return Array.from({length:Math.max(1,Math.min(count,10)-1)},(_,i)=>i+2).map(cols=>{
  const rows=Math.ceil(count/cols);
  return {cols,width:Math.max(0,Math.min((width-36-(cols-1)*12)/cols,(height-36-(rows-1)*12)/rows*1.05))};
 }).sort((a,b)=>b.width-a.width)[0];
}
export function sortingLayout(width:number,height:number,tray:number,groups:number[]){
 const columns=Math.max(1,Math.min(groups.length,width<700?2:groups.length));
 const inner=Math.max(1,width-24),binWidth=(inner-(columns-1)*8)/columns;
 // The bank stays readable; placed cards yield space first. Overflow scrolls locally.
 const card=Math.max(96,Math.min(180,Math.floor(height*.4-16),Math.floor((inner-16)/Math.min(3,Math.max(1,tray)))));
 const binRows=Math.ceil(groups.length/columns),available=Math.max(64,(height*.55)/binRows-52);
 let placedCard=Math.min(card,96);
 while(placedCard>48){const perRow=Math.max(1,Math.floor((binWidth-16+6)/(placedCard+6)));if(Math.ceil(Math.max(...groups,1)/perRow)*(placedCard+6)<=available)break;placedCard--;}
 return {card,placedCard,columns};
}
