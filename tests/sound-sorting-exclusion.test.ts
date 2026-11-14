import test from 'node:test';
import assert from 'node:assert/strict';
import {containsExcludedSound,initialLearning,learningPool} from '../src/learning.ts';
import {defaultFilters} from '../src/model.ts';
import type {Word} from '../src/material-types.ts';
import {sortingPools,newGroup} from '../src/sorting.ts';
test('contextual softening cannot bypass a forbidden hard sound',()=>{
 const word={id:'soft-context',label:'пример',weight:100,type:null,opposition:[],phonemes:['р',"л'"],sounds:{р:[{position:'начало',before:null,after:null}],"л'":[{position:'середина',before:null,after:"н'",eligibility:'before_soft_consonant'}]}} as Word;
 assert(containsExcludedSound(word,'л'));
 assert.equal(learningPool([word],defaultFilters,{...initialLearning,mode:'automation',sounds:['р'],excludedSounds:['л']}).length,0);
});
test('a word fitting R and L is excluded from sound sorting, but not from the source',()=>{
 const word={id:'mirror',label:'зеркало',weight:100,type:null,opposition:[],phonemes:['р','л'],sounds:{р:[{position:'середина',before:null,after:null}],л:[{position:'середина',before:null,after:null}]}} as Word;
 const groups=['р','л'].map((sound,i)=>({...newGroup(i),learning:{...initialLearning,mode:'differentiation' as const,sounds:[sound]}}));
 assert.deepEqual(sortingPools([word],groups,[],false),[[],[]]);assert.equal(word.label,'зеркало');
});
