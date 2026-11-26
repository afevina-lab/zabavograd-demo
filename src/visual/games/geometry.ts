import type {CSSProperties} from 'react';
import {BOARD_METRICS} from '../foundation/geometry.ts';
export function memoryLayout(count:number,width:number,height:number){
 return Array.from({length:Math.max(1,Math.min(count,10)-1)},(_,i)=>i+2).map(cols=>{
  const rows=Math.ceil(count/cols);
  return {cols,width:Math.max(0,Math.min((width-36-(cols-1)*12)/cols,(height-36-(rows-1)*12)/rows))};
 }).sort((a,b)=>b.width-a.width)[0];
}
export function sortingLayout(width:number,height:number,tray:number,groups:number[]){
 const columns=Math.max(1,Math.min(groups.length,width<700?2:groups.length));
 const inner=Math.max(1,width-24),binWidth=(inner-(columns-1)*8)/columns;
 // The bank stays readable; placed cards yield space first. Every item is fitted to the measured field.
 const card=Math.max(BOARD_METRICS.bankMinimum,Math.min(180,Math.floor(height*.4-16),Math.floor((inner-16)/Math.min(3,Math.max(1,tray)))));
 const binRows=Math.ceil(groups.length/columns),available=Math.max(64,(height*.55)/binRows-52);
 let placedCard=Math.min(card,96);
 while(placedCard>BOARD_METRICS.placedMinimum){const perRow=Math.max(1,Math.floor((binWidth-16+6)/(placedCard+6)));if(Math.ceil(Math.max(...groups,1)/perRow)*(placedCard+6)<=available)break;placedCard--;}
 return {card,placedCard,columns};
}

/** Center incomplete rows without assigning meaning to card order. */
export function balancedGrid(count:number,width:number,card:number){
 const gap=BOARD_METRICS.gap;
 const capacity=Math.max(1,Math.floor((width+gap)/(card+gap)));
 const columns=Math.max(1,Math.ceil(count/Math.max(1,Math.ceil(count/capacity))));
 return {columns,width:Math.min(width,columns*(card+gap))};
}
export function balancedGridStyle(count:number,width:number,card:number):CSSProperties{
 const grid=balancedGrid(count,width,card);
 return {display:'grid',gridTemplateColumns:'repeat('+grid.columns*2+',minmax(0,1fr))',width:grid.width+'px',maxWidth:'100%',marginInline:'auto',columnGap:0};
}
export function balancedCardStyle(index:number,count:number,width:number,card:number):CSSProperties{
 const {columns}=balancedGrid(count,width,card),row=Math.floor(index/columns),length=Math.min(columns,count-row*columns);
 return {gridColumn:(columns-length)+(index%columns)*2+1+' / span 2',gridRow:row+1,justifySelf:'center'};
}


/** Largest equal square layout within both field dimensions. No minimum can force overflow. */
export function fittedGrid(count:number,width:number,height:number,preferred=320,groups=false){
 const total=Math.max(1,count),gap=8,w=Math.max(1,width),h=Math.max(1,height);let columns=1,size=0;
 for(let cols=1;cols<=total;cols++){const rows=Math.ceil(total/cols),candidate=Math.min((w-gap*(cols-1))/cols,(h-gap*(rows-1))/rows*(groups?1.35:1));if(candidate>size){columns=cols;size=candidate;}}
 return {columns,rows:Math.ceil(total/columns),size:Math.max(1,Math.min(preferred,size))};
}
