import test from 'node:test';
import assert from 'node:assert/strict';
import {learningPool,initialLearning,type Learning} from '../src/learning.ts';
import {defaultFilters,type Word} from '../src/model.ts';
const word=(id:string,topic:string,type:number|null,phonemes:string[]):Word=>({id,label:id,topic,subcategory:null,type,phonemes,sounds:{р:[{position:'начало',before:null,after:null}]},position:'начало',opposition:[],weight:1,images:1});
const words=[word('a','Фрукты',null,['р','а']),word('b','Ягоды',2,['р',"л'"]),word('c','Посуда',3,['р','о'])];
const lexical=(topics:string[]):Learning=>({...initialLearning,mode:'lexical',sounds:[],topics,excludedSounds:[]});
test('lexical themes form a union and ignore unrelated syllable settings',()=>{
 assert.deepEqual(learningPool(words,{...defaultFilters,types:[],untyped:false},lexical(['Фрукты','Ягоды'])).map(w=>w.id),['a','b']);
});
test('additional rules union then exclusions subtract globally',()=>{
 const l={...lexical(['Фрукты']),additional:[{learning:lexical(['Ягоды']),filters:defaultFilters}],excludedSounds:["л'"]};
 assert.deepEqual(learningPool(words,defaultFilters,l).map(w=>w.id),['a']);
 const exclusion={...lexical(['Фрукты','Ягоды']),exclusions:[{learning:lexical(['Ягоды']),filters:defaultFilters}]};
 assert.deepEqual(learningPool(words,defaultFilters,exclusion).map(w=>w.id),['a']);
});
test('target sound cannot exclude itself; unknown phonetics do not pass an explicit sound exclusion',()=>{
 const l={...initialLearning,mode:'automation' as const,sounds:['р'],excludedSounds:['р']};assert.equal(learningPool(words,defaultFilters,l).length,3);
 assert.equal(learningPool([{...words[0],phonemes:null}],defaultFilters,{...l,excludedSounds:["л'"]}).length,0);
});

test('default material is unrestricted and automation requires a chosen sound',()=>{assert.equal(initialLearning.mode,'any');assert.deepEqual(initialLearning.sounds,[]);assert.equal(learningPool(words,defaultFilters,initialLearning).length,3);assert.equal(learningPool(words,defaultFilters,{...initialLearning,mode:'automation'}).length,0);});
