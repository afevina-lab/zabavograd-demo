import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {validate}=require('../scripts/library-analysis-request.cjs');
const {plan}=require('../scripts/library-initial-analysis.cjs');
const r={version:1,source_sha256:'a'.repeat(64),mode:'initial',limit:10,domain:'both'};
test('request rejects arbitrary arguments and bad filters',()=>{
 assert.equal(validate(r),r);
 for(const patch of [{mode:'shell'},{limit:0},{limit:2501},{weight:5},{domain:'other'},{command:'ls'},{source_sha256:'bad'},{mode:'constructicon'}])assert.throws(()=>validate({...r,...patch}));
});
test('null pending data is filled, existing proposals remain protected',()=>{
 const db={entries:[{id:'a',lemma:'кот',kind:'word',meaning:null,part_of_speech:'noun',morphology:{status:'pending_automatic_analysis',data:null},phonetic_tags:{status:'pending_automatic_analysis',data:null}}],relations:[],categories:[]};
 const draft={schema_version:1,status:'DRAFT_ONLY_NOT_APPROVED',source:{sha256:r.source_sha256},entries:[{id:'a',lemma:'кот',meaning:null,morphology:{status:'candidate_needs_review',analyzer:'pymorphy3',lemma:'кот',part_of_speech:'NOUN',tag:'NOUN,anim,masc sing,nomn',score:1,forms:{nomn_sing:'кот'}},phonetic:{status:'candidate_needs_review',analyzer:'nsu-ai/russian_g2p',sound_tokens:['к','о','т'],stress_syllable:1,syllables:1,stressed_vowel:'о'}}]};
 const next=plan(db,draft,r.source_sha256);
 assert.equal(next.stats.morphology_candidates,1);assert.equal(next.stats.phonetic_candidates,1);
 assert.equal(db.entries[0].morphology.data,null);
 assert.equal(plan(next.db,draft,r.source_sha256).stats.changed,0);
});

test('external requests are narrowly scoped',()=>{
 for(const mode of ['framebank','ruwordnet']){
  const req={version:1,source_sha256:r.source_sha256,mode};assert.equal(validate(req),req);
  assert.throws(()=>validate({...req,limit:10}));
 }
});
