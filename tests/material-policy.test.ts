import test from 'node:test';
import assert from 'node:assert/strict';
import {availableMaterial,materialWeight,distinctCaptions} from '../src/material-policy.ts';
import type {Word} from '../src/model.ts';
import {learningPool,initialLearning} from '../src/learning.ts';
import {defaultFilters} from '../src/model.ts';
test('shared pedagogy preserves senses; caption matching applies its own ambiguity rule',()=>{
 const words=[{id:'vegetable',label:'лук',weight:100},{id:'weapon',label:'лук',weight:100}] as Word[];
 assert.equal(learningPool(words,defaultFilters,initialLearning).length,2);
 assert.equal(distinctCaptions(words).length,1);
 assert.equal(words.length,2);
});

test('manual choice retains zero weight while image availability stays mandatory',()=>{
 const words=[{id:'manual',weight:0,variants:[{id:'image',src:'image.webp'}]}, {id:'automatic',weight:1}, {id:'invalid',weight:Infinity}] as Word[];
 assert.deepEqual(availableMaterial(words,true,false).map(w=>w.id),['manual']);
 assert.deepEqual(availableMaterial(words).map(w=>w.id),['automatic']);
 assert.deepEqual(availableMaterial(words,true).map(w=>w.id),[]);
 assert.equal(words[0].weight,0);
});
test('lexical task weight preserves approved weight 1 and leaves base weights intact',()=>{
 const word={weight:100,taskWeights:{lexical_topic:1}} as Word;
 assert.equal(materialWeight(word,true),1);
 assert.equal(materialWeight(word),100);
 assert.equal(word.weight,100);
});

import {orderedWords} from '../src/word-choice-order.ts';
test('historical aliases never appear as separate cards in automatic or manual selection',()=>{
 const canonical={id:'sock',label:'носок',weight:100,opposition:[],type:null,variants:[{id:'same',src:'sock.webp'}]} as Word;
 const alias={...canonical,id:'old-sock',aliasOf:'sock',weight:0};
 const manual={...canonical,id:'manual',label:'редкое слово',weight:0};
 const homonym={...canonical,id:'different-sense'};
 const words=[canonical,alias,manual,homonym];
 assert.deepEqual(availableMaterial(words,true,false).map(w=>w.id),['sock','manual','different-sense']);
 assert.deepEqual(learningPool(words,defaultFilters,initialLearning,false).map(w=>w.id),['sock','manual','different-sense']);
 assert.equal(orderedWords(words,[]).some(w=>w.id===alias.id),false);
 assert.deepEqual(learningPool(words,defaultFilters,{...initialLearning,selectionMode:'approved',approvedWordIds:[alias.id]},false).map(w=>w.id),['sock']);
});
