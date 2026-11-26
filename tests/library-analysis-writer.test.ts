import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {verifyExtension}=require('../scripts/library-analysis-writer.cjs');
const db={entries:[{id:'a',lemma:'лук',morphology:{status:'automatic_candidate_needs_review',data:{automatic_proposal:{source:'pymorphy3',status:'suggested',usable_for_generation:false,forms:{nomn_sing:'лук'}},approved_form_subset:{forms:{nomn_sing:'лук'}}}},legacy_source:{raw:{grammar:{}}}}],relations:[],categories:[]};
function candidate(){
 const r=structuredClone(db);
 const p=r.entries[0].morphology.data.automatic_proposal;
 p.forms.gent_sing='лука';p.extended_by='pymorphy3-expanded-paradigms-20261123-v1';
 return r;
}
test('extends only unapproved proposal without activation',()=>{
 assert.deepEqual(verifyExtension(db,candidate()),{changed:1,addedForms:1});
 assert.deepEqual(verifyExtension(db,db),{changed:0,addedForms:0});
});
test('rejects overwrite, approval, archive and unrelated mutations',()=>{
 let r=candidate();r.entries[0].morphology.data.automatic_proposal.forms.nomn_sing='луки';assert.throws(()=>verifyExtension(db,r),/Existing form changed/);
 r=candidate();r.entries[0].morphology.data.automatic_proposal.usable_for_generation=true;assert.throws(()=>verifyExtension(db,r));
 r=candidate();r.entries[0].morphology.data.approved_form_subset.forms.nomn_sing='луки';assert.throws(()=>verifyExtension(db,r));
 r=candidate();r.entries[0].legacy_source.raw.grammar={bad:1};assert.throws(()=>verifyExtension(db,r));
 r=candidate();r.relations.push({id:'new'});assert.throws(()=>verifyExtension(db,r));
});

test('safe subset changes only chosen exact proposals, never counting or previous approvals',()=>{
 const {verifySafeSubset}=require('../scripts/library-analysis-writer.cjs');
 const b={entries:[{id:'a',kind:'word',lemma:'сосна',part_of_speech:'noun',morphology:{status:'automatic_candidate_needs_review',data:{automatic_proposal:{source:'pymorphy3',status:'suggested',usable_for_generation:false,lemma:'сосна',flags:['countability_unverified'],forms:{nomn_sing:'сосна',gent_sing:'сосны',nomn_plur:'сосны'}}}}}],relations:[],categories:[]};
 const make=()=>{const a=structuredClone(b);a.entries[0].morphology.data.approved_form_subset={revision:'safe-local-morphology-modular-v1',status:'machine_checked',usable_for_generation:true,source:'pymorphy3_2.0.6_exact_lemma',review_method:'exact_pymorphy3_paradigm_matching',human_reviewed:false,automatic_counting_allowed:false,forms:{nomn_sing:'сосна',gent_sing:'сосны'}};return a};
 assert.deepEqual(verifySafeSubset(b,make(),['a']),{changed:1,addedForms:2});
 let a=make();a.entries[0].morphology.data.approved_form_subset.forms.nomn_plur='сосны';assert.throws(()=>verifySafeSubset(b,a,['a']),/Unverified plural/);
 a=make();a.entries[0].morphology.data.approved_form_subset.forms.gent_sing='сосной';assert.throws(()=>verifySafeSubset(b,a,['a']),/nonmatching/);
 a=make();a.entries[0].morphology.data.approved_form_subset.human_reviewed=true;assert.throws(()=>verifySafeSubset(b,a,['a']),/approval metadata/);
 a=make();a.entries[0].meaning='другое';assert.throws(()=>verifySafeSubset(b,a,['a']),/Unrelated/);
 assert.throws(()=>verifySafeSubset(b,make(),['b']),/Unknown entry/);
});
