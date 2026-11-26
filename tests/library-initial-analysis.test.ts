import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {plan}=require('../scripts/library-initial-analysis.cjs');
const db={entries:[{id:'a',lemma:'лук',meaning:'овощ',kind:'word',part_of_speech:'noun',phonetic_tags:{status:'pending_automatic_analysis',data:{}},morphology:{status:'pending_automatic_analysis',data:{}}}],relations:[],categories:[]};
const m={status:'candidate_needs_review',analyzer:'pymorphy3',lemma:'лук',part_of_speech:'NOUN',tag:'NOUN,inan,masc sing,nomn',score:1,forms:{nomn_sing:'лук',gent_sing:'лука'},countability_unverified:true};
const p={status:'candidate_needs_review',analyzer:'nsu-ai/russian_g2p',sound_tokens:['л','у','к'],stress_syllable:1,syllables:1,stressed_vowel:'у'};
const draft={schema_version:1,status:'DRAFT_ONLY_NOT_APPROVED',source:{sha256:'source'},entries:[{id:'a',lemma:'лук',meaning:'овощ',morphology:m,phonetic:p}]};
test('initial candidate preserves identity, no form activation, no original mutation',()=>{
 const r=plan(db,draft,'source');assert.equal(r.stats.changed,1);
 assert.equal(r.stats.phonetic_candidates,1);assert.equal(r.stats.morphology_candidates,1);
 assert.equal(r.db.entries[0].morphology.data.automatic_proposal.usable_for_generation,false);
 assert.deepEqual(r.db.entries[0].phonetic_tags.data.sound_tokens,p.sound_tokens);
 assert.equal(db.entries[0].morphology.status,'pending_automatic_analysis');
 assert.equal(plan(r.db,draft,'source').stats.changed,0);
});
test('rejects stale draft, wrong sense, duplicates and invalid V phoneme',()=>{
 assert.throws(()=>plan(db,draft,'stale'),/Stale/);
 const d=structuredClone(draft);d.entries[0].meaning='оружие';assert.throws(()=>plan(db,d,'source'),/meaning differs/);
 const dup=structuredClone(draft);dup.entries.push(dup.entries[0]);assert.throws(()=>plan(db,dup,'source'),/Duplicate/);
 const bad=structuredClone(draft);bad.entries[0].phonetic.sound_tokens=['V','у','к'];assert.equal(plan(db,bad,'source').stats.phonetic_candidates,0);
});
test('legacy history and existing proposals are not overwritten',()=>{
 const orig=structuredClone(db);orig.entries[0].legacy_source={raw:{grammar:{x:1}}};
 orig.entries[0].morphology.data={x:1};
 const r=plan(orig,draft,'source');
 assert.deepEqual(r.db.entries[0].legacy_source,orig.entries[0].legacy_source);
 assert.deepEqual(r.db.entries[0].morphology.data,{x:1});
 assert.equal(r.db.entries[0].machine_analysis.morphology.usable_for_generation,false);
 const protectedDb=structuredClone(db);protectedDb.entries[0].morphology.data.automatic_proposal={forms:{nomn_sing:'лук'}};
 assert.equal(plan(protectedDb,draft,'source').stats.morphology_candidates,0);
});
