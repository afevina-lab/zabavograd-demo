import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {build,fingerprint}=require('../scripts/library-store.cjs');
const {prepare,validate}=require('../scripts/library-modular-request.cjs');
const db={entries:[{id:'a',lemma:'кот',selection:{base_weight:100},morphology:{data:{plural_nominative:'коты'}}}],relations:[],categories:[]};
const current={db,manifest:build(db).manifest,source_sha256:fingerprint(db)};
const r={version:1,mode:'preview',source_sha256:current.source_sha256,operations:[{id:'a',path:'/selection/base_weight',expect:{exists:true,value:100},value:70}]};
test('preview is deterministic and candidate is bound to exact old and new values',()=>{
 const p=prepare(current,r);
 assert.equal(p.preview.changes.length,1);assert.equal(p.preview.delta.modified.length,1);
 assert.equal(db.entries[0].selection.base_weight,100);
 assert.equal(prepare(current,{...r,mode:'candidate',preview_sha256:p.preview_sha256}).preview_sha256,p.preview_sha256);
 assert.throws(()=>prepare(current,{...r,mode:'candidate',preview_sha256:'0'.repeat(64)}),/Preview mismatch/);
 assert.throws(()=>prepare(current,{...r,source_sha256:'0'.repeat(64)}),/Stale/);
 assert.throws(()=>prepare(current,{...r,operations:[{...r.operations[0],expect:{exists:true,value:50}}]}),/Conflict/);
});
test('remote edits deny identity, approvals, archive, arbitrary keys and invalid weights',()=>{
 for(const path of ['/id','/legacy_source/raw','/morphology/status','/morphology/data/approved_form_subset','/arbitrary'])assert.throws(()=>validate({...r,operations:[{...r.operations[0],path}]}),/not enabled/);
 assert.throws(()=>validate({...r,operations:[{...r.operations[0],value:99}]}),/Invalid weight/);
 assert.throws(()=>validate({...r,mode:'candidate'}),/preview fingerprint/);
});
