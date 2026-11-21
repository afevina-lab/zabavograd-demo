import test from 'node:test';
import assert from 'node:assert/strict';
import {startConveyor,stepConveyor,answerConveyor,conveyorTarget,conveyorSpeed,conveyorErrorCount,arithmeticDeck,corruptWord} from '../src/conveyor.ts';
const deck=arithmeticDeck(4,10,true,()=>.3);
test('easy stops at centre until teacher answers; rejected condition can be correct',()=>{
 const rejected=deck.find(card=>!card.expected);assert(rejected);
 let s=startConveyor([rejected]);for(let i=0;i<200;i++)s=stepConveyor(s,[rejected],'easy',.1);
 assert.equal(s.cards[0].position,.5);assert(conveyorTarget(s));s=answerConveyor(s,false,true);assert.equal(s.correct,1);assert.equal(answerConveyor(s,true,true).marked,1);
});
test('moving levels spawn at centre and cap acceleration at fifty percent',()=>{
 let s=startConveyor(deck);for(let i=0;i<150;i++)s=stepConveyor(s,deck,'medium',.1);assert.equal(s.next,2);
 assert(conveyorSpeed('hard',1000)<=.065*1.5+.00001);
});
test('word corruption never mutates source or produces another known word',()=>{
 const source='кот';const altered=corruptWord(source,1,'omit',new Set(['кот','от']),()=>.5);assert(altered&&altered!=='кот'&&altered!=='от');assert.equal(source,'кот');
});

test('answers are accepted before centre, accelerate exit, and only correct answers score',()=>{let s=startConveyor(deck);assert(conveyorTarget(s));s=answerConveyor(s,false,false);assert.equal(s.correct,0);assert.equal(s.marked,1);const moved=stepConveyor(s,deck,'easy',.1,false);assert(moved.cards[0].exitSpeed!>.25);assert.equal(conveyorSpeed('medium',1,false),conveyorSpeed('medium',1,true)*2);assert.equal(conveyorSpeed('hard',1,true),.065*1.5);});

test('error count follows word length and phrases are never corrupted as a single word',()=>{for(const word of ['да','кот','машина'])assert.equal(conveyorErrorCount(word),1);assert.equal(conveyorErrorCount('машинка'),2);assert.equal(corruptWord('два слова',1,'mixed',new Set()),null);});

test('final score can be four of twelve: wrong marks never increment it',()=>{const cards=arithmeticDeck(12,10,false,()=>.3);let state=startConveyor(cards);for(let i=0;i<12;i++){state=answerConveyor(state,i<4,false);for(let frame=0;frame<200&&!state.finished&&!conveyorTarget(state);frame++)state=stepConveyor(state,cards,'easy',.1,false);}assert.equal(state.correct,4);assert.equal(state.marked,12);assert(state.finished);});

test('Conveyor multiplication and division always have correct integer results through 1000',()=>{
 const multiplication=arithmeticDeck(12,1000,true,()=>.42,{add:false,subtract:false,multiply:true,divide:false,includeZero:false});
 const division=arithmeticDeck(12,1000,true,()=>.42,{add:false,subtract:false,multiply:false,divide:true,includeZero:false});
 assert(multiplication.every(card=>card.text.includes('×')));
 assert(division.every(card=>card.text.includes('÷')));
 for(const c of [...multiplication,...division]){
  const [a,b]=c.text.split(/[×÷]/).map(part=>Number(part.trim().split(' ')[0]));
  if(c.text.includes('×'))assert.equal(a*b,Number(c.original));
  if(c.text.includes('÷'))assert.equal(a/b,Number(c.original));
  assert(Number(c.original)<=1000);
 }
});
