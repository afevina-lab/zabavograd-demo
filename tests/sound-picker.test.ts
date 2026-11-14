import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmSoundSelection,initialLearning,defaultOpposition} from '../src/learning.ts';
test('one target retains automation defaults; multiple targets exclude neither target',()=>{
 const one=confirmSoundSelection({...initialLearning,sounds:['р']});
 assert.equal(one.mode,'automation');assert.deepEqual(one.excludedSounds,defaultOpposition('р'));
 const many=confirmSoundSelection({...initialLearning,sounds:['р','л'],excludedSounds:['р','л','ш']});
 assert.equal(many.mode,'differentiation');assert.deepEqual(many.excludedSounds,['ш']);
});
test('confirmation removes rules for deselected sounds without mutating draft',()=>{
 const draft={...initialLearning,sounds:[],rules:{р:{positions:['начало'],clusters:null}}};
 assert.deepEqual(confirmSoundSelection(draft).rules,{});
 assert(draft.rules.р);
});
