import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
const require=createRequire(import.meta.url);
const {validateCandidates}=require('../scripts/check-speech-frame-candidates.cjs');
function fixture(){return {entries:[
  {id:'v',lemma:'резать',part_of_speech:'verb'},
  {id:'p',lemma:'яблоко',part_of_speech:'noun'},
  {id:'t',lemma:'нож',part_of_speech:'noun'}
],speech_frame_candidates:[{
  id:'frame-candidate-20261109-fixture',
  verb_id:'v',semantic_intent:'резать продукт',example:'Мама режет яблоко ножом.',
  status:'suggested',usable_for_generation:false,
  provenance:{source:'zabavograd_editorial',authorship:'independent'},
  review:{author_approved:false,grammar_approved:false},
  roles:[
   {role:'agent',case:'nom',preposition:'',required:true,allowed_entry_ids:['p']},
   {role:'instrument',case:'ins',preposition:'',required:false,allowed_entry_ids:['t']}
  ]
}]};}
test('draft frame preserves separate grammatical roles without enabling production use',()=>{
 const a=fixture();assert.equal(validateCandidates(a).candidates,1);
 assert.equal(validateCandidates(a).role_links,2);
});
test('pending author approval cannot be disguised as verified',()=>{
 const a=fixture();a.speech_frame_candidates[0].usable_for_generation=true;
 assert.throws(()=>validateCandidates(a),/must never be usable/);
});
test('broken participant ID is rejected',()=>{
 const a=fixture();a.speech_frame_candidates[0].roles[1].allowed_entry_ids=['missing'];
 assert.throws(()=>validateCandidates(a),/Unresolved participant/);
});
test('duplicated role is rejected',()=>{
 const a=fixture();a.speech_frame_candidates[0].roles[1].role='agent';
 assert.throws(()=>validateCandidates(a),/Duplicate role/);
});
