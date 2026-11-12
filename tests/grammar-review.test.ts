import {createRequire} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {candidateKey,prepare,validateFrames}=require('../scripts/grammar-review.cjs');
const lib=()=>({entries:[
 {id:'verb',lemma:'забивать',part_of_speech:'verb'},
 {id:'object',lemma:'гвоздь',part_of_speech:'noun'},
 {id:'tool',lemma:'молоток',part_of_speech:'noun'},
 {id:'food',lemma:'каша',part_of_speech:'noun'},
 ],relations:[]});
const p=()=>({source:'constructicon',source_record_id:'18',candidate_type:'construction_anchor',
 entry_id:'verb',anchor_lemma:'забивать',review_status:'suggested',usable_for_generation:false});
const bundle=(record=p())=>({schema:'linguistic_suggestions_v1',source:record.source,
 purpose:'review_only',source_revision:'fixture',records:[record]});
const decision=(record=p())=>({schema:'speech_frame_decisions_v1',decisions:[{key:candidateKey(record),
 action:'accept',verb_id:'verb',semantic_intent:'забивать гвоздь инструментом',roles:[
 {role:'patient',case:'acc',preposition:'',required:true,allowed_entry_ids:['object']},
 {role:'instrument',case:'ins',preposition:'',required:false,allowed_entry_ids:['tool']}
 ],review:{sense_checked:true,grammar_checked:true,typical_for_children:true,independent_authoring:true,publication_clearance:true}}]});
test('approved frame exports only independent compact roles and IDs',()=>{
 const out=prepare(lib(),[bundle()],decision()), exportable=validateFrames(out);
 assert.equal(exportable.frames.length,1);
 assert.equal(exportable.frames[0].roles[1].role,'instrument');
 assert(!JSON.stringify(exportable).includes('constructicon'));
 assert.deepEqual(prepare(out,[bundle()],decision()),out);
});
test('unapproved candidates and ambiguous sense matches never enter the library',()=>{
 const empty={schema:'speech_frame_decisions_v1',decisions:[]};
 assert.equal(prepare(lib(),[bundle()],empty).speech_frames.length,0);
 const x=decision();x.decisions[0].verb_id='missing';
 assert.throws(()=>prepare(lib(),[bundle()],x),/Ambiguous or mismatched/);
});
test('separate instrument and food roles are not collapsed by shared instrumental case',()=>{
 const x=decision();x.decisions[0].roles.push({role:'food',case:'ins',preposition:'',required:false,allowed_entry_ids:['food']});
 assert.equal(prepare(lib(),[bundle()],x).speech_frames[0].roles.length,3);
});
test('FrameBank needs independent publication clearance',()=>{
 const r={...p(),source:'framebank',candidate_type:'valency_pattern'};
 const x=decision(r);x.decisions[0].review.publication_clearance=false;
 assert.throws(()=>prepare(lib(),[bundle(r)],x),/publication clearance/);
});
test('invalid governance, missing participant, duplicate roles and unsafe prepositions fail closed',()=>{
 const wrong=decision();wrong.decisions[0].roles[0].case='wrong';
 assert.throws(()=>prepare(lib(),[bundle()],wrong),/case/);
 const missing=decision();missing.decisions[0].roles[0].allowed_entry_ids=['fake'];
 assert.throws(()=>prepare(lib(),[bundle()],missing),/participant/);
 const duplicate=decision();duplicate.decisions[0].roles[1].role='patient';
 assert.throws(()=>prepare(lib(),[bundle()],duplicate),/Duplicated role/);
 const bad=decision();bad.decisions[0].roles[1].preposition='http://x';
 assert.throws(()=>prepare(lib(),[bundle()],bad),/preposition/);
});
