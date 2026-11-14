import type {Word} from './material-types.ts';
import {alphabet} from './reading.ts';
export type ConveyorLevel='easy'|'medium'|'hard';
export type ConveyorCard={id:string;text:string;word?:Word;expected:boolean;original?:string};
export type MovingCard={card:ConveyorCard;position:number;answered:boolean};
export type ConveyorState={cards:MovingCard[];next:number;finished:boolean;correct:number;marked:number;missed:number};
export function conveyorSpeed(level:ConveyorLevel,entered:number){return level==='easy'?.09:(level==='medium'?.035:.065)*(1+Math.min(.2,entered*.005));}
export function startConveyor(deck:ConveyorCard[]):ConveyorState{return {cards:deck.length?[{card:deck[0],position:0,answered:false}]:[],next:Math.min(1,deck.length),finished:!deck.length,correct:0,marked:0,missed:0};}
export function stepConveyor(state:ConveyorState,deck:ConveyorCard[],level:ConveyorLevel,seconds:number):ConveyorState{
 if(state.finished)return state;
 const speed=conveyorSpeed(level,state.next),delta=Math.max(0,Math.min(seconds,.1))*speed;
 let crossed=false,missed=state.missed;
 const cards=state.cards.map(item=>{let position=item.position+delta;if(item.position<.5&&position>=.5)crossed=true;if(level==='easy'&&!item.answered)position=Math.min(.5,position);return {...item,position};}).filter(item=>{if(item.position>1.15){if(!item.answered)missed++;return false}return true});
 let next=state.next;
 if(next<deck.length&&((level!=='easy'&&crossed)||(level==='easy'&&!cards.length))){cards.push({card:deck[next++],position:0,answered:false});}
 return {...state,cards,next,missed,finished:next===deck.length&&!cards.length};
}
export function conveyorTarget(state:ConveyorState){return state.cards.find(item=>!item.answered&&item.position>=.5);}
export function answerConveyor(state:ConveyorState,yes:boolean,conditional:boolean):ConveyorState{
 const target=conveyorTarget(state);if(!target)return state;
 const right=conditional?yes===target.card.expected:yes;
 return {...state,cards:state.cards.map(item=>item===target?{...item,answered:true}:item),marked:state.marked+1,correct:state.correct+Number(right)};
}
export function corruptWord(word:string,edits:1|2,kind:'omit'|'insert'|'replace'|'mixed',known:Set<string>,rng=Math.random):string|null{
 const index=(n:number)=>Math.min(n-1,Math.floor(rng()*n));
 for(let attempt=0;attempt<30;attempt++){
  const letters=[...word];
  for(let i=0;i<edits;i++){
   const operation=kind==='mixed'?(['omit','insert','replace'] as const)[index(3)]:kind;
   if(operation==='omit'&&letters.length>1)letters.splice(index(letters.length),1);
   else if(operation==='insert')letters.splice(index(letters.length+1),0,alphabet[index(alphabet.length)]);
   else{const at=index(letters.length),choices=alphabet.filter(c=>c!==letters[at]);letters[at]=choices[index(choices.length)];}
  }
  const text=letters.join('');if(text!==word&&!known.has(text.toLocaleLowerCase('ru')))return text;
 }
 return null;
}
export function arithmeticDeck(count:number,max:number,conditional:boolean,rng=Math.random):ConveyorCard[]{
 return Array.from({length:count},(_,i)=>{const a=Math.floor(rng()*(max+1)),b=Math.floor(rng()*(max-a+1));const subtract=rng()<.5;const result=subtract?a:a+b;const expression=subtract?`${a+b} − ${b}`:`${a} + ${b}`;const expected=!conditional||i%2===0;return {id:'math-'+i,text:conditional?`${expression} = ${expected?result:result+1}`:expression,original:String(result),expected};});
}
