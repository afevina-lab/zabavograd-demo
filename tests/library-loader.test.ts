import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRuntimeLibrary} from '../src/library-loader.ts';
test('runtime boundary rejects duplicate IDs and invalid weights but preserves homonyms',()=>{
 const word={id:'one',label:'лук',weight:100,opposition:[]};
 assert.equal(validateRuntimeLibrary([word,{...word,id:'two'}]).length,2);
 assert.throws(()=>validateRuntimeLibrary([word,word]));
 assert.throws(()=>validateRuntimeLibrary([{...word,weight:Infinity}]));
 assert.throws(()=>validateRuntimeLibrary({entries:[word]}));
});
