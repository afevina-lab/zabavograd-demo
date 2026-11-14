import type {Word} from './material-types.ts';
import {alphabet} from './reading.ts';
export type ConveyorLevel='easy'|'medium'|'hard';
export type ConveyorCard={id:string;text:string;word?:Word;expected:boolean;original?:string};
export type MovingCard={card:ConveyorCard;position:number;answered:boolean;correct?:boolean;exitSpeed?:number};
export type ConveyorState={cards:MovingCard[];next:number;finished:boolean;correct:number;marked:number;missed:number};
export function conveyorSpeed(level:ConveyorLevel,progress:number,conditional=true){return (level==='easy'?.09:level==='medium'?.035:.065)*(conditional?1:2)*(level==='easy'?1:1+Math.min(.5,Math.max(0,progress)*.5));}
export function startConveyor(deck:ConveyorCard[]):ConveyorState{return {cards:deck.length?[{card:deck[0],position:0,answered:false}]:[],next:Math.min(1,deck.length),finished:!deck.length,correct:0,marked:0,missed:0};}
export function stepConveyor(state:ConveyorState,deck:ConveyorCard[],level:ConveyorLevel,seconds:number,conditional=true):ConveyorState{
 if(state.finished)return state;
 const speed=conveyorSpeed(level,deck.length<=1?0:(state.next-1)/(deck.length-1),conditional),delta=Math.max(0,Math.min(seconds,.1))*speed;
 let crossed=false,missed=state.missed;
 const cards:MovingCard[]=state.cards.map(item=>{const dt=Math.max(0,Math.min(seconds,.1));const exitSpeed=item.answered?(item.exitSpeed||.25)+dt*3:0;let position=item.position+(item.answered?dt*exitSpeed:delta);if(item.position<.5&&position>=.5)crossed=true;if(level==='easy'&&!item.answered)position=Math.min(.5,position);return {...item,position,exitSpeed};}).filter(item=>{if(item.position>1.15){if(!item.answered)missed++;return false}return true});
 let next=state.next;
 if(next<deck.length&&((level!=='easy'&&(crossed||!cards.some(item=>!item.answered&&item.position<.5)))||(level==='easy'&&!cards.length))){cards.push({card:deck[next++],position:0,answered:false});}
 return {...state,cards,next,missed,finished:next===deck.length&&!cards.length};
}
export function conveyorTarget(state:ConveyorState){return state.cards.find(item=>!item.answered);}
export function answerConveyor(state:ConveyorState,yes:boolean,conditional:boolean):ConveyorState{
 const target=conveyorTarget(state);if(!target)return state;
 const right=conditional?yes===target.card.expected:yes;
 return {...state,cards:state.cards.map(item=>item===target?{...item,answered:true,correct:right,exitSpeed:.25}:item),marked:state.marked+1,correct:state.correct+Number(right)};
}
export function conveyorErrorCount(word:string):1|2{return [...word].length>=7?2:1;}
function editDistance(a:string,b:string):number{
 let row=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+Number(a[i-1]!==b[j-1]));row=next;}
 return row[b.length];
}
export function corruptWord(word:string,edits:1|2,kind:'omit'|'insert'|'replace'|'mixed',known:Set<string>,rng=Math.random):string|null{
 if(!/^[а-яё]{2,}$/i.test(word))return null;
 const index=(n:number)=>Math.min(n-1,Math.floor(rng()*n));
 for(let attempt=0;attempt<30;attempt++){
  const letters=[...word];
  for(let i=0;i<edits;i++){
   const operation=kind==='mixed'?(['omit','insert','replace'] as const)[index(3)]:kind;
   if(operation==='omit'&&letters.length>1)letters.splice(index(letters.length),1);
   else if(operation==='insert')letters.splice(index(letters.length+1),0,alphabet[index(alphabet.length)]);
   else{const at=index(letters.length),choices=alphabet.filter(c=>c!==letters[at]);letters[at]=choices[index(choices.length)];}
  }
  const text=letters.join('');if(text!==word&&editDistance(word,text)===edits&&!known.has(text.toLocaleLowerCase('ru')))return text;
 }
 return null;
}
export function arithmeticDeck(count:number,max:number,conditional:boolean,rng=Math.random):ConveyorCard[]{
 return Array.from({length:count},(_,i)=>{const a=Math.floor(rng()*(max+1)),b=Math.floor(rng()*(max-a+1));const subtract=rng()<.5;const result=subtract?a:a+b;const expression=subtract?`${a+b} − ${b}`:`${a} + ${b}`;const expected=!conditional||i%2===0;return {id:'math-'+i,text:conditional?`${expression} = ${expected?result:result+1}`:expression,original:String(result),expected};});
}
