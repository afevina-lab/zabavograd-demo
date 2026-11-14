import test from 'node:test';
import assert from 'node:assert/strict';
import {transformationResult,transformationWords,transformationAnswer,transformationEligibility} from '../src/transformations.ts';
import type {Word} from '../src/material-types.ts';
test('transformation never substitutes lemma phonetics or an unverified answer form',()=>{
 const word={label:'кот',variants:[{id:'cat',src:'/assets/cat.webp'}]} as Word;
 assert.equal(transformationEligibility(word,'small','any'),'unverified-form');
 const reviewed={...word,verifiedForms:{diminutive:'котик',plural:'коты'}};
 assert.equal(transformationAnswer(reviewed,'small'),'котик');
 assert.equal(transformationEligibility(reviewed,'small','lexical'),'eligible');
 assert.equal(transformationEligibility(reviewed,'many','automation'),'missing-form-phonetics');
 assert.equal(transformationEligibility(reviewed,'reading','automation'),'eligible');
 assert.equal(transformationAnswer({...word,verifiedForms:{plural:'  '}},'many'),null);
});
test('small keeps one illustration at exactly half size',()=>{assert.equal(transformationResult('small',false).scale,1);assert.equal(transformationResult('small',true).scale,.5);assert.equal(transformationResult('small',true).count,1)});
test('many creates exactly five copies only in answer',()=>{assert.equal(transformationResult('many',false).count,1);assert.equal(transformationResult('many',true).count,5)});
test('reading reveals image after word',()=>{assert.equal(transformationResult('reading',false).kind,'word');assert.equal(transformationResult('reading',true).kind,'image')});

