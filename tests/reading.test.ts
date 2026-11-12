import test from 'node:test';
import assert from 'node:assert/strict';
import {initialLearning,learningPool} from '../src/learning.ts';
import {defaultFilters,type Word} from '../src/model.ts';
import {generateCombinations,effectivePatterns,compatibleMemoryMode} from '../src/reading.ts';
const word=(label:string):Word=>({id:label,label,topic:null,subcategory:null,position:'',type:null,opposition:[],weight:100,images:0});
test('reading uses letters and requires all selected letters',()=>{
 const l={...initialLearning,mode:'reading' as const,reading:{available:[...'котсыр'],required:['к','о'],min:3,max:3}};
 assert.deepEqual(learningPool(['кот','ток','сыр','крот'].map(word),defaultFilters,l).map(w=>w.label),['кот','ток']);
});
test('cluster exclusion overrides patterns and filters words',()=>{
 const l={...initialLearning,mode:'reading' as const,contentKinds:['words','syllables'] as const as ('words'|'syllables')[],syllablePatterns:['CCV','VCC','VCV'] as ('CCV'|'VCC'|'VCV')[],reading:{available:[...'кат'],excludeClusters:true}};
 assert.deepEqual(effectivePatterns(l),['VCV']);
 assert.ok(generateCombinations(l).some(w=>w.label==='ака'));
 assert.ok(!learningPool([word('трактор')],defaultFilters,l).some(w=>w.label==='трактор'));
 assert.equal(compatibleMemoryMode('word-image',l),'word-word');
});
test('generated speech material follows target and excludes soft opposition',()=>{
 const l={...initialLearning,mode:'automation' as const,sounds:['р'],contentKinds:['syllables'] as ('syllables')[],excludedSounds:["р'"]};
 const pool=learningPool([],defaultFilters,l);
 assert.ok(pool.some(w=>w.label==='ра'));
 assert.ok(!pool.some(w=>w.label==='ри'));
 assert.ok(pool.every(w=>w.sounds?.['р']));
});
test('assimilation is opt-in and target slots constrain generated combinations',()=>{
 const w={...word('артист'),sounds:{р:[{position:'середина',before:null,after:"т'",eligibility:'before_soft_consonant'}]}};
 const l={...initialLearning,mode:'automation' as const,sounds:['р']};
 assert.equal(learningPool([w],defaultFilters,l).length,0);
 assert.equal(learningPool([w],defaultFilters,{...l,rules:{р:{positions:['стечения'],clusters:null,allowAssimilation:true}}}).length,1);
 const pool=learningPool([],defaultFilters,{...l,contentKinds:['syllables'],syllablePatterns:['CCV'],targetSlots:{CCV:[1]}});
 assert.ok(pool.length>0);
 assert.ok(pool.every(w=>w.phonemes?.[1]==='р'));
});
