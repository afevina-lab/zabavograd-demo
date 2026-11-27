import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {build,fingerprint}=require('../scripts/library-store.cjs');
const {prepare}=require('../scripts/library-modular-request.cjs');
const {verifyBundle}=require('../scripts/library-apply-bundle.cjs');
const db={entries:[{id:'a',lemma:'кот',selection:{base_weight:100}}],categories:[],relations:[]};
const current={db,manifest:build(db).manifest,source_sha256:fingerprint(db)};
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'delta-test-'));
 const p=prepare(current,{version:1,mode:'preview',source_sha256:current.source_sha256,operations:[{id:'a',path:'/selection/base_weight',expect:{exists:true,value:100},value:70}]});
 const expected=build(p.planned.db),changed=[...p.preview.delta.added,...p.preview.delta.modified];
 const report={mode:'candidate',status:'validated_candidate_not_approved',preview_sha256:p.preview_sha256,...p.preview,bundle:{manifest:'delta/manifest.json',changed_files:changed,removed_files:p.preview.delta.removed}};
 function put(rel,body){const f=path.join(dir,rel);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,body);}
 put('result.json',JSON.stringify(report));put('delta/manifest.json',JSON.stringify(expected.manifest));
 for(const f of changed)put('delta/'+f,expected.files.get(f));
 return {dir,p,changed,report,put,clean:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
test('bundle replay matches pinned preview and preserves source',()=>{
 const x=fixture();try{
  assert.equal(verifyBundle(current,x.dir,x.p.preview_sha256).planned.db.entries[0].selection.base_weight,70);
  assert.equal(current.db.entries[0].selection.base_weight,100);
  assert.throws(()=>verifyBundle(current,x.dir,'0'.repeat(64)),/preview differs/);
  assert.throws(()=>verifyBundle({...current,source_sha256:'0'.repeat(64)},x.dir,x.p.preview_sha256),/Stale source/);
 }finally{x.clean();}
});
test('corrupt, extra, missing, traversing or symlink bundle files rejected',()=>{
 const x=fixture();try{
  const f='delta/'+x.changed[0],original=fs.readFileSync(path.join(x.dir,f));
  x.put(f,'[]');assert.throws(()=>verifyBundle(current,x.dir,x.p.preview_sha256),/bytes differ/);x.put(f,original);
  x.put('extra.json','{}');assert.throws(()=>verifyBundle(current,x.dir,x.p.preview_sha256),/extra bundle/);fs.unlinkSync(path.join(x.dir,'extra.json'));
  fs.unlinkSync(path.join(x.dir,f));assert.throws(()=>verifyBundle(current,x.dir,x.p.preview_sha256),/extra bundle/);
  fs.symlinkSync(path.join(x.dir,'result.json'),path.join(x.dir,f));assert.throws(()=>verifyBundle(current,x.dir,x.p.preview_sha256),/Nonregular/);fs.unlinkSync(path.join(x.dir,f));x.put(f,original);
  x.report.bundle.changed_files=['../escape.json'];x.put('result.json',JSON.stringify(x.report));
  assert.throws(()=>verifyBundle(current,x.dir,x.p.preview_sha256),/file list differs/);
 }finally{x.clean();}
});
test('changed operations cannot be concealed by modifying target manifest',()=>{
 const x=fixture();try{
  x.report.operations[0].value=50;x.put('result.json',JSON.stringify(x.report));
  assert.throws(()=>verifyBundle(current,x.dir,x.p.preview_sha256),/Preview mismatch/);
 }finally{x.clean();}
});
