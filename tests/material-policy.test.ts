import test from 'node:test';
import assert from 'node:assert/strict';
import {availableMaterial,materialWeight} from '../src/material-policy.ts';
import type {Word} from '../src/model.ts';

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
