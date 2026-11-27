#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {load,planPatch,build,delta,fingerprint}=require('./library-store.cjs');
const {stageVerified}=require('./library-analysis-writer.cjs');
const phoneticReview=require('./library-phonetic-review.cjs');
const semanticReview=require('./library-semantic-proposals.cjs');
const editorialDecisions=require('./library-editorial-decisions.cjs');
const importer=require('./library-import.cjs');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const digest=x=>sha(JSON.stringify(x));
const weights=new Set([0,10,20,30,50,70,100]);
const textFields=new Set(['/morphology/data/diminutive','/morphology/data/plural_nominative']);
function keys(x,allowed){
 assert(x&&typeof x==='object'&&!Array.isArray(x),'Expected object');
 for(const k of Object.keys(x))assert(allowed.includes(k),'Unexpected key '+k);
}
function validate(r){
 keys(r,['version','mode','source_sha256','operations','semantic_operations','review_decisions','import_operations','preview_sha256']);
 assert(r.version===1&&['preview','candidate'].includes(r.mode),'Expected preview or candidate request v1');
 assert(/^[a-f0-9]{64}$/.test(r.source_sha256||''),'Exact source fingerprint required');
 if(r.mode==='candidate')assert(/^[a-f0-9]{64}$/.test(r.preview_sha256||''),'Candidate requires preview fingerprint');
 else assert(!Object.hasOwn(r,'preview_sha256'),'Preview must not carry preview fingerprint');
 assert(Array.isArray(r.operations),'operations must be an array');
 const semantic=r.semantic_operations??[];assert(Array.isArray(semantic),'semantic_operations must be an array');
 const decisions=r.review_decisions??[];assert(Array.isArray(decisions),'review_decisions must be an array');
 const imports=r.import_operations??[];assert(Array.isArray(imports),'import_operations must be an array');
 assert(!imports.length||(!r.operations.length&&!semantic.length&&!decisions.length),'Import requires a separate request');
 for(const o of imports)importer.validate(o);
 assert(!decisions.length||(!r.operations.length&&!semantic.length),'Decisions require a separate request on existing proposals');
 assert(r.operations.length+semantic.length+decisions.length+imports.length>=1&&r.operations.length+semantic.length+decisions.length+imports.length<=30,'1..30 operations required');
 for(const d of decisions)editorialDecisions.validate(d);
 for(const op of semantic)semanticReview.validateOperation(op);
 for(const o of r.operations){
  keys(o,['id','path','expect','value']);keys(o.expect,['exists','value']);
  assert(typeof o.id==='string'&&o.id.length>0&&o.id.length<=256,'Invalid ID');
  assert(typeof o.expect.exists==='boolean'&&o.expect.exists===Object.hasOwn(o.expect,'value'),'Exact prior value required');
  if(o.path==='/selection/base_weight')assert(weights.has(o.value),'Invalid weight');
  else if(textFields.has(o.path))assert(typeof o.value==='string'&&o.value.trim()===o.value&&o.value.length>0&&o.value.length<=160,'Invalid morphology text');
  else if(o.path===phoneticReview.PROPOSAL_PATH){assert(o.expect.exists===false,'Existing review cannot be overwritten');phoneticReview.validateProposal(o.value);}
  else assert.fail('Path not enabled for remote modular edits: '+o.path);
 }
 return r;
}
function prepare(current,r,{assetDir}={}){
 validate(r);
 assert.equal(r.source_sha256,current.source_sha256,'Stale source; query again');
 const byId=new Map(current.db.entries.map(e=>[e.id,e]));
 const reviews=r.operations.filter(o=>o.path===phoneticReview.PROPOSAL_PATH).map(o=>{const e=byId.get(o.id);assert(e,'Unknown word ID '+o.id);return phoneticReview.inspect(e,o.value);});
 let planned=r.operations.length?planPatch(current,{version:1,source_sha256:r.source_sha256,operations:r.operations}):{db:current.db,changes:[]};
 if(r.semantic_operations?.length){const next=semanticReview.plan(planned.db,r.semantic_operations);planned={db:next.db,changes:[...planned.changes,...next.changes]};}
 if(r.review_decisions?.length){const next=editorialDecisions.plan(planned.db,r.review_decisions);planned={db:next.db,changes:next.changes};}
 if(r.import_operations?.length)planned=importer.plan(current.db,r.import_operations,undefined,assetDir);
 const newManifest=build(planned.db).manifest,changes=planned.changes;
 const diff=delta(current.manifest,newManifest),target=fingerprint(planned.db);
 const preview={version:1,source_sha256:current.source_sha256,result_source_sha256:target,operations:r.operations,changes,delta:diff};
 if(reviews.length)preview.phonetic_reviews=reviews;
 if(r.semantic_operations?.length)preview.semantic_operations=r.semantic_operations;
 if(r.review_decisions?.length)preview.review_decisions=r.review_decisions;
 if(r.import_operations?.length)preview.import_operations=r.import_operations;
 const preview_sha256=digest(preview);
 if(r.mode==='candidate')assert.equal(r.preview_sha256,preview_sha256,'Preview mismatch; generate a new preview');
 return {planned,preview,preview_sha256,newManifest};
}
function run(source,request,output){
 const raw=fs.readFileSync(request);assert(raw.length<=64*1024,'Request too large');
 const r=validate(JSON.parse(raw)),current=load(source),p=prepare(current,r);
 assert(!fs.existsSync(output),'Output exists');
 const report={mode:r.mode,request_sha256:sha(raw),preview_sha256:p.preview_sha256,...p.preview,status:r.mode==='preview'?'preview_not_validated_or_approved':'no_changes'};
 const body=()=>JSON.stringify(report,null,2)+'\n';
 assert(Buffer.byteLength(body())<=90*1024,'Result too large');
 const temp=fs.mkdtempSync(path.join(path.dirname(path.resolve(output)),'.remote-edit-'));
 try{
  const publish=path.join(temp,'publish');fs.mkdirSync(publish);
  if(r.mode==='candidate'&&p.planned.changes.length){
   const dest=path.join(temp,'candidate');
   const verified=stageVerified(current,p.planned.db,dest,{changed:p.planned.changes.length});
   assert.equal(verified.result_source_sha256,p.preview.result_source_sha256,'Candidate hash differs');
   const d=p.preview.delta;
   const dir=path.join(publish,'delta');fs.mkdirSync(dir);
   fs.copyFileSync(path.join(dest,'manifest.json'),path.join(dir,'manifest.json'));
   for(const rel of [...d.added,...d.modified]){
    const target=path.join(dir,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(dest,rel),target);
   }
   report.status='validated_candidate_not_approved';
   report.bundle={manifest:'delta/manifest.json',changed_files:[...d.added,...d.modified],removed_files:d.removed};
  }
  assert.equal(load(source).source_sha256,current.source_sha256,'Source changed during edit');
  assert(Buffer.byteLength(body())<=96*1024,'Result too large');
  fs.writeFileSync(path.join(publish,'result.json'),body(),{flag:'wx'});
  assert(!fs.existsSync(output),'Output exists');fs.renameSync(publish,output);
  return report;
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
module.exports={validate,prepare,run};
if(require.main===module)try{
 const [source,request,output,...rest]=process.argv.slice(2);
 assert(source&&request&&output&&!rest.length,'Usage: library-modular-request.cjs MODULES REQUEST NEW_OUTPUT_DIR');
 const r=run(source,request,output);
 console.log(JSON.stringify({status:r.status,changed:r.changes.length,preview_sha256:r.preview_sha256,result_source_sha256:r.result_source_sha256,delta:r.delta},null,2));
}catch(e){console.error(e.stack);process.exitCode=1;}
