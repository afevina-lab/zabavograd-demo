import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {plan,validate}=require('../scripts/library-external-proposals.cjs');
test('external facts add only unapproved per-entry proposals and deduplicate',()=>{
 const db={entries:[{id:'a',lemma:'кот',language:'ru',kind:'word'},{id:'b',lemma:'кошка',language:'ru',kind:'word'}],relations:[]};
 const bundle={source:'ruwordnet',source_revision:'2.0',records:[{source_record_id:'X',subject_id:'a',object_id:'b',relation_type:'synonym'}]};
 const r=plan(db,bundle);assert.equal(r.stats.changed,1);assert.equal(r.stats.added_proposals,1);
 assert.equal(r.db.entries[0].external_linguistic_proposals[0].usable_for_generation,false);
 assert.equal(db.entries[0].external_linguistic_proposals,undefined);
 assert.equal(plan(r.db,bundle).stats.added_proposals,0);
 assert.deepEqual(r.db.relations,db.relations);validate(r.db);
});
