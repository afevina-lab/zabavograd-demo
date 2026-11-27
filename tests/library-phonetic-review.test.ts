import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {stored,validateProposal,inspect,PROPOSAL_PATH}=require('../scripts/library-phonetic-review.cjs');
const {build,fingerprint}=require('../scripts/library-store.cjs');
const {prepare}=require('../scripts/library-modular-request.cjs');
const e={id:'a',kind:'word',lemma:'кот',phonetic_tags:{status:'filled_with_explicit_extended_cases',data:{sound_tokens:['к','о','т']}},legacy_source:{raw:{speech:{sound_tokens:['к','о','т']}}}};
const p={source:'editorial_review',status:'suggested',usable_for_generation:false,base:stored(e),sound_tokens:['к','о','т'],stress_syllable:1,syllable_count:1,stressed_vowel:'о',reason:'Проверка ударения'};
test('phonetic proposal is separate from active and archive values; diagnostic cannot approve it',()=>{
 const db={entries:[e],relations:[],categories:[]},current={db,manifest:build(db).manifest,source_sha256:fingerprint(db)};
 const req={version:1,mode:'preview',source_sha256:current.source_sha256,operations:[{id:'a',path:PROPOSAL_PATH,expect:{exists:false},value:p}]};
 const out=prepare(current,req);
 assert.deepEqual(out.planned.db.entries[0].phonetic_tags.data,e.phonetic_tags.data);
 assert.deepEqual(out.planned.db.entries[0].legacy_source,e.legacy_source);
 assert.deepEqual(out.planned.db.entries[0].phonetic_tags.review_proposal,p);
 assert(!Object.hasOwn(e.phonetic_tags,'review_proposal'));
 assert.equal(out.preview.phonetic_reviews[0].status,'review_only_not_generation_eligible');
 assert.equal(out.preview.phonetic_reviews[0].after['к'][0].eligibility,'not_approved');
});
test('phonetic review rejects invalid phonemes, stress, stale prior, active status and existing proposal',()=>{
 assert.throws(()=>validateProposal({...p,sound_tokens:['V','о','т']}),/Invalid phoneme/);
 assert.throws(()=>validateProposal({...p,syllable_count:2}),/Syllable count/);
 assert.throws(()=>validateProposal({...p,stressed_vowel:'а'}),/Stressed vowel/);
 assert.throws(()=>validateProposal({...p,usable_for_generation:true}),/unapproved/);
 assert.throws(()=>inspect(e,{...p,base:{...p.base,sound_tokens:['к','а','т']}}),/Stored phonetics changed/);
 assert.throws(()=>inspect({...e,phonetic_tags:{...e.phonetic_tags,review_proposal:p}},p),/already exists/);
});
