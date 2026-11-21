import {mathMaterial} from './math-material.ts';
import type {Word} from './material-types.ts';
import {alphabet} from './reading.ts';
import {balancedPick,containsExcludedSound,typicalConfusions,defaultConveyorOpposition,type Learning} from './learning.ts';
import {distinctCaptions} from './material-policy.ts';
export type ConveyorLevel='easy'|'medium'|'hard';
export type ConveyorCard={id:string;text:string;word?:Word;expected:boolean;original?:string};
export type MovingCard={card:ConveyorCard;position:number;answered:boolean;correct?:boolean;feedbackLeft?:number;exitSpeed?:number};
export type ConveyorState={cards:MovingCard[];next:number;finished:boolean;correct:number;marked:number;missed:number};
export function conveyorSpeed(level:ConveyorLevel,progress:number,conditional=true){return (level==='easy'?.09:level==='medium'?.035:.065)*(conditional?1:2)*(level==='easy'?1:1+Math.min(.5,Math.max(0,progress)*.5));}
export function startConveyor(deck:ConveyorCard[]):ConveyorState{return {cards:deck.length?[{card:deck[0],position:0,answered:false}]:[],next:Math.min(1,deck.length),finished:!deck.length,correct:0,marked:0,missed:0};}
export function stepConveyor(state:ConveyorState,deck:ConveyorCard[],level:ConveyorLevel,seconds:number,conditional=true):ConveyorState{
 if(state.finished)return state;
 const speed=conveyorSpeed(level,deck.length<=1?0:(state.next-1)/(deck.length-1),conditional),delta=Math.max(0,Math.min(seconds,.1))*speed;
 let crossed=false,missed=state.missed;
 const cards:MovingCard[]=state.cards.map(item=>{const dt=Math.max(0,Math.min(seconds,.1));const feedbackLeft=Math.max(0,(item.feedbackLeft||0)-dt);const exitSpeed=item.answered?(item.exitSpeed||.25)+dt*3:0;let position=item.position+(item.answered?(feedbackLeft>0?0:dt*exitSpeed):delta);if(!item.answered&&item.position<.5&&position>=.5)crossed=true;if(level==='easy'&&!item.answered)position=Math.min(.5,position);return {...item,position,exitSpeed,feedbackLeft};}).filter(item=>{if(item.position>1.15){if(!item.answered)missed++;return false}return true});
 let next=state.next;
 if(next<deck.length&&((level!=='easy'&&(crossed||!cards.some(item=>!item.answered&&item.position<.5)))||(level==='easy'&&!cards.length))){cards.push({card:deck[next++],position:0,answered:false});}
 return {...state,cards,next,missed,finished:next===deck.length&&!cards.length};
}
export function conveyorTarget(state:ConveyorState){return state.cards.find(item=>!item.answered);}
export function answerConveyor(state:ConveyorState,yes:boolean,conditional:boolean,feedbackSeconds=0):ConveyorState{
 const target=conveyorTarget(state);if(!target)return state;
 const right=conditional?yes===target.card.expected:yes;
 return {...state,cards:state.cards.map(item=>item===target?{...item,answered:true,correct:right,feedbackLeft:feedbackSeconds,exitSpeed:.25}:item),marked:state.marked+1,correct:state.correct+Number(right)};
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
/** Negative answers are at most 40% of Conveyor cards. */
export function conveyorIncorrectCount(count:number){return Math.floor(Math.max(0,count)*.4);}
export function conveyorConditions(count:number,conditional:boolean,rng=Math.random):boolean[]{
 const invalid=conditional?conveyorIncorrectCount(count):0;
 const flags=Array.from({length:count},(_,i)=>i>=invalid);
 for(let i=flags.length-1;i>0;i--){const j=Math.min(i,Math.floor(rng()*(i+1)));[flags[i],flags[j]]=[flags[j],flags[i]];}
 return flags;
}
/** A sound-presence question is not an automation-eligibility test.
 * Check the actual phoneme, including occurrences marked not approved or in clusters.
 * Hard and soft consonants remain distinct.
 */
export function conveyorHasTargetSound(word:Word,targetSounds:string[]):boolean{
 return targetSounds.some(sound=>Boolean(word.phonemes?.includes(sound)||word.sounds?.[sound]?.length));
}
/** Sound-check Conveyor deliberately excludes mixed target/opposition words.
 * Other sound exclusions are also barred from positive material, while
 * NO cards must contain an explicitly selected opposition without the target.
 * null means the word is not eligible for this round at all.
 */
export type ConveyorOppositionRule={mode:'sounds'|'lexical';sounds?:string[];categories?:string[]};
/** The opposing rule is independent of therapy exclusions; lexical opposition
 * means a word in the selected category with no target phoneme.
 */
export function classifyConveyorSoundWord(word:Word,learning:Learning,rule:ConveyorOppositionRule={mode:'sounds'}):boolean|null{
 if(!word.phonemes?.length||!learning.sounds.length)return null;
 const target=conveyorHasTargetSound(word,learning.sounds);
 const exclusions=[...new Set(learning.excludedSounds||[])].filter(s=>!learning.sounds.includes(s));
 const hasExcluded=exclusions.some(s=>containsExcludedSound(word,s));
 if(target)return hasExcluded?null:true;
 return false;
}
export function isPreferredConveyorDistractor(word:Word,learning:Learning,rule?:ConveyorOppositionRule):boolean{
 if(rule?.mode==='lexical')return Boolean(rule.categories?.some(category=>word.categories?.some(path=>path===category||path.startsWith(category+'/'))));
 if(rule?.mode==='sounds'){
  const oppositions=rule.sounds??learning.sounds.flatMap(defaultConveyorOpposition);
  return oppositions.some(s=>!learning.sounds.includes(s)&&containsExcludedSound(word,s));
 }
 return isCloseConveyorDistractor(word,learning);
}
export function isCloseConveyorDistractor(word:Word,learning:Learning):boolean{
 if(['automation','differentiation','search'].includes(learning.mode)){
  const confusions=[...new Set(learning.sounds.flatMap(typicalConfusions))].filter(s=>!learning.sounds.includes(s));
  return confusions.some(s=>containsExcludedSound(word,s));
 }
 if(learning.mode==='lexical'){
  const targets=learning.categoryPaths?.length?learning.categoryPaths:(learning.topics||[]);
  const paths=word.categories?.length?word.categories:(word.topic?[word.topic]:[]);
  return paths.some(path=>targets.some(target=>path!==target&&path.split('/')[0]===target.split('/')[0]));
 }
 return false;
}
/** At least 80% of the negative slots when possible come from close contrasts when available.
 * Positive and negative items cannot repeat an ID or displayed caption.
 */
export function materialConveyorDeck(positives:Word[],negatives:Word[],count:number,learning:Learning,rng=Math.random,preferredRule?:ConveyorOppositionRule):ConveyorCard[]{
 const yes=distinctCaptions(positives),no=distinctCaptions(negatives);
 const targetNegatives=conveyorIncorrectCount(count);
 let invalid=Math.min(targetNegatives,no.length);
 if(yes.length<count-invalid)invalid=Math.max(invalid,count-yes.length);
 if(invalid>targetNegatives||no.length<invalid||yes.length<count-invalid)throw Error('Недостаточно подходящих карточек для Конвейера.');
 const valid=balancedPick(yes,count-invalid,learning,rng);
 const validLabels=new Set(valid.map(w=>w.label.toLocaleLowerCase('ru')));
 const wrongPool=no.filter(w=>!validLabels.has(w.label.toLocaleLowerCase('ru')));
 if(wrongPool.length<invalid)throw Error('Недостаточно разных неподходящих карточек для Конвейера.');
 const near=wrongPool.filter(w=>isPreferredConveyorDistractor(w,learning,preferredRule));
 const mixedLearning:Learning={...learning,mode:'any',sounds:[]};
 const closeCount=Math.min(Math.round(invalid*.8),near.length);
 const chosenClose=balancedPick(near,closeCount,mixedLearning,rng);
 const closeIds=new Set(chosenClose.map(w=>w.id));
 const other=balancedPick(wrongPool.filter(w=>!closeIds.has(w.id)),invalid-closeCount,mixedLearning,rng);
 const incorrect=[...chosenClose,...other];
 const flags=Array.from({length:count},(_,i)=>i>=invalid);
 for(let i=flags.length-1;i>0;i--){const j=Math.min(i,Math.floor(rng()*(i+1)));[flags[i],flags[j]]=[flags[j],flags[i]];}
 let good=0,bad=0;
 return flags.map((expected,i)=>{const word=expected?valid[good++]:incorrect[bad++];return {id:'word-'+i,text:word.label,word,original:word.label,expected};});
}
export function arithmeticDeck(count:number,max:number,conditional:boolean,rng=Math.random,operations:{add:boolean;subtract:boolean;includeZero?:boolean}={add:true,subtract:true}):ConveyorCard[]{
 if(operations.includeZero===false){const pool=mathMaterial({target:max,add:operations.add,subtract:operations.subtract,includeZero:false});if(!pool.length)throw Error('Для выбранных условий нет примеров. Увеличьте число или включите 0.');const flags=conveyorConditions(count,conditional,rng);return flags.map((expected,i)=>{const w=pool[Math.floor(rng()*pool.length)],result=Number(w.answer);return {id:'math-'+i,text:conditional?w.label+' = '+(expected?result:result+1):w.label,original:w.answer,expected}});}
 const flags=conveyorConditions(count,conditional,rng);
 return Array.from({length:count},(_,i)=>{const a=Math.floor(rng()*(max+1)),b=Math.floor(rng()*(max-a+1));const subtract=operations.subtract&&(!operations.add||rng()<.5);const result=subtract?a:a+b;const expression=subtract?`${a+b} − ${b}`:`${a} + ${b}`;const expected=flags[i];return {id:'math-'+i,text:conditional?`${expression} = ${expected?result:result+1}`:expression,original:String(result),expected};});
}

export function compositionDeck(count:number,target:number,includeZero=true):ConveyorCard[]{if(!includeZero&&target<2)throw Error('Состав числа без нуля доступен от 2.');return Array.from({length:count},(_,i)=>{const a=includeZero?i%(target+1):1+i%(target-1);return {id:'composition-'+i,text:target+' = '+a+' + ?',original:String(target-a),expected:true}})}
