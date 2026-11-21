import test from 'node:test';
import assert from 'node:assert/strict';
import {startConveyor,stepConveyor,answerConveyor,conveyorTarget,conveyorSpeed,conveyorErrorCount,arithmeticDeck,corruptWord,classifyConveyorSoundWord} from '../src/conveyor.ts';
import type {Word} from '../src/material-types.ts';
import {initialLearning,type Learning} from '../src/learning.ts';
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


test('Conveyor sound-opposition classification rejects mixed words and accepts Р without Л',()=>{
 const cfg:Learning={...initialLearning,mode:'automation',sounds:['р'],excludedSounds:["р'",'л',"л'","й'"]};
 const word=(label:string,phonemes:string[]):Word=>({id:label,label,phonemes,sounds:{},weight:100} as unknown as Word);
 assert.equal(classifyConveyorSoundWord(word('ракета',['р','а','к','э','т','а']),cfg),true);
 assert.equal(classifyConveyorSoundWord(word('компьютер',['к','а','м',"п'",'й','у',"т'",'э','р']),cfg),true);
 assert.equal(classifyConveyorSoundWord(word('лампа',['л','а','м','п','а']),cfg),false);
 assert.equal(classifyConveyorSoundWord(word('зеркало',["з'",'э','р','к','а','л','а']),cfg),null);
 assert.equal(classifyConveyorSoundWord(word('мак',['м','а','к']),cfg),null);
 assert.equal(classifyConveyorSoundWord(word('ряд',["р'",'а','т']),cfg),null);
 assert.equal(classifyConveyorSoundWord(word('сыр',['с','ы','р']),{...cfg,excludedSounds:['л']}),true);
 assert.equal(classifyConveyorSoundWord(word('зеркало',["з'",'э','р','к','а','л','а']),{...cfg,excludedSounds:[]}),true);
});

test('Conveyor excludes R from S distractors even if R is excluded in therapy',()=>{
 const cfg:Learning={...initialLearning,mode:'automation',sounds:['с'],excludedSounds:['р','ш']};
 const word=(label:string,phonemes:string[],categories:string[]=[]):Word=>({id:label,label,phonemes,categories,sounds:{}} as unknown as Word);
 assert.equal(classifyConveyorSoundWord(word('шар',['ш','а','р']),cfg),false);
 assert.equal(classifyConveyorSoundWord(word('рак',['р','а','к']),cfg),null);
 assert.equal(classifyConveyorSoundWord(word('саша',['с','а','ш','а']),cfg),null);
 assert.equal(classifyConveyorSoundWord(word('санки',['с','а','н','к',"и"]),cfg),true);
 assert.equal(classifyConveyorSoundWord(word('рак',['р','а','к']),cfg,{mode:'lexical',categories:['Транспорт']}),null);
 assert.equal(classifyConveyorSoundWord(word('автобус',['а','в','т','о','б','у','с'],['Транспорт']),cfg,{mode:'lexical',categories:['Транспорт']}),true);
 assert.equal(classifyConveyorSoundWord(word('машина',['м','а','ш','ы','н','а'],['Транспорт']),cfg,{mode:'lexical',categories:['Транспорт']}),false);
 assert.equal(classifyConveyorSoundWord(word('рак',['р','а','к']),cfg,{mode:'sounds',sounds:['р']}),false);
});
