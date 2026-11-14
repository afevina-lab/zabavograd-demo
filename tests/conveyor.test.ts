import test from 'node:test';
import assert from 'node:assert/strict';
import {startConveyor,stepConveyor,answerConveyor,conveyorTarget,conveyorSpeed,arithmeticDeck,corruptWord} from '../src/conveyor.ts';
const deck=arithmeticDeck(4,10,true,()=>.3);
test('easy stops at centre until teacher answers; rejected condition can be correct',()=>{
 let s=startConveyor(deck.slice(1,2));for(let i=0;i<200;i++)s=stepConveyor(s,deck.slice(1,2),'easy',.1);
 assert.equal(s.cards[0].position,.5);assert(conveyorTarget(s));s=answerConveyor(s,false,true);assert.equal(s.correct,1);assert.equal(answerConveyor(s,true,true).marked,1);
});
test('moving levels spawn at centre and cap acceleration at twenty percent',()=>{
 let s=startConveyor(deck);for(let i=0;i<150;i++)s=stepConveyor(s,deck,'medium',.1);assert.equal(s.next,2);
 assert(conveyorSpeed('hard',1000)<=.065*1.2+.00001);
});
test('word corruption never mutates source or produces another known word',()=>{
 const source='кот';const altered=corruptWord(source,1,'omit',new Set(['кот','от']),()=>.5);assert(altered&&altered!=='кот'&&altered!=='от');assert.equal(source,'кот');
});
