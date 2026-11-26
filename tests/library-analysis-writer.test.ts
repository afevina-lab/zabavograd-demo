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
