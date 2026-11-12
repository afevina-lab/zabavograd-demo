import {createRequire} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {parseDelimited,constructiconProposals,framebankProposals,wikidataProposals,dedupe}=require('../scripts/linguistic-sources.cjs');

test('CSV multiline quoted fields are parsed without shifted columns',()=>{
 const rows=parseDelimited('ID Number,Anchor words,Name\n42,"делать, знать","тест, пример"\n43,"играть","строка\nдва"\n');
 assert.equal(rows.length,2);assert.equal(rows[0].Name,'тест, пример');assert.equal(rows[1].Name,'строка\nдва');
});
test('Constructicon exports suggestions only, not approved relations',()=>{
 const csv='ID Number,Anchor words,Name UD,Morphology\n42,"забивать, играть","V NP-Acc",VP\n';
 const out=constructiconProposals(csv,[{id:'v1',lemma:'забивать'},{id:'v2',lemma:'играть'}]);
 assert.equal(out.length,2);assert(out.every((x:any)=>x.review_status==='suggested'&&x.usable_for_generation===false));
 assert(out.every((x:any)=>x.candidate_type==='construction_anchor'));
});
test('Homonyms cannot be silently mapped by spelling',()=>{
 const rows=constructiconProposals('ID Number,Anchor words\n12,мышь\n',[{id:'animal',lemma:'мышь'},{id:'device',lemma:'мышь'}]);
 assert.equal(rows[0].entry_id,null);assert.equal(rows[0].entry_candidates.length,2);
});
test('FrameBank captures roles but not corpus sample texts',()=>{
 const dict='ConstrIndex\tConstrPattern\tExample\tKeyLexemes\n3239\tSnom V Sacc\tкорпусный пример\tзабивать,забить\n';
 const slots='ConstrIndex\tPlace\tForm\tRole\tRank\tSemClass\n3239\t1\tSnom\tагенс\tСубъект\tлицо\n3239\t2\tSacc\tпациенс\tОбъект\tнеодушевленный\n';
 const out=framebankProposals(dict,slots,[{id:'z',lemma:'забивать'}]);
 assert.equal(out.length,1);assert.equal(out[0].slots.length,2);assert(!JSON.stringify(out).includes('корпусный пример'));
});
test('Wikidata only matches explicitly reviewed unique QIDs',()=>{
 const entities={entities:{Q1:{claims:{P279:[{rank:'normal',mainsnak:{datavalue:{value:{id:'Q2'}}}},{rank:'deprecated',mainsnak:{datavalue:{value:{id:'Q3'}}}}]}}}};
 const out=wikidataProposals(entities,[{qid:'Q1',entry_id:'z'},{qid:'Q2',entry_id:'class'},{qid:'Q3',entry_id:'wrong'}]);
 assert.equal(out.length,1);assert.equal(out[0].object_id,'class');assert.equal(out[0].review_status,'suggested');
 assert.equal(wikidataProposals(entities,[{qid:'Q1',entry_id:'z'},{qid:'Q2',entry_id:'class'},{qid:'Q2',entry_id:'other'}]).length,0);
});
test('Duplicate proposals collapse deterministically',()=>{
 const a={source:'framebank',source_record_id:'1',entry_id:'x'};
 assert.equal(dedupe([a,{...a}]).length,1);
});
