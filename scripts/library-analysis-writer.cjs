#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const {load,create,delta}=require('./library-store.cjs');
const {validateLibrary}=require('./validate-library-contract.cjs');
const {verifyArchive}=require('./library-archive-guard.cjs');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const baseline=require('../editorial/library-archive-baseline.json');
const own=(o,k)=>Object.hasOwn(o,k);
const candidateStatuses=new Set(['pending_automatic_analysis','automatic_candidate_needs_review']);
function equal(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function fail(msg){throw Error(msg);}
function projection(e){
 const c=structuredClone(e);
 // Only unapproved morphology proposals may be extended. All active forms,
 // semantic fields, statuses, phonetics, media and historical data stay intact.
 for(const p of [c.morphology?.data?.automatic_proposal,c.machine_analysis?.morphology]){
  if(p&&p.status==='suggested'&&p.source==='pymorphy3'&&p.usable_for_generation===false){
   delete p.forms;delete p.extended_by;
  }
 }
 return c;
}
function verifyExtension(before,after){
 assert(Array.isArray(before.entries)&&Array.isArray(after.entries));
 const {entries:b,...btop}=before,{entries:a,...atop}=after;
 assert(equal(btop,atop),'Top-level data changed');
 assert.equal(b.length,a.length,'Entry count changed');
 let changed=0,addedForms=0;
 for(let i=0;i<b.length;i++){
  const old=b[i],next=a[i];
  assert.equal(next.id,old.id,'Entry order or ID changed');
  if(equal(old,next))continue;
  assert(candidateStatuses.has(old.morphology?.status),'Protected morphology '+old.id);
  assert(equal(projection(old),projection(next)),'Non-proposal data changed '+old.id);
  for(const [p,q] of [[old.morphology?.data?.automatic_proposal,next.morphology?.data?.automatic_proposal],[old.machine_analysis?.morphology,next.machine_analysis?.morphology]]){
   if(equal(p,q))continue;
   assert(p?.status==='suggested'&&p.source==='pymorphy3'&&p.usable_for_generation===false,'Not an unapproved proposal '+old.id);
   assert(q?.status==='suggested'&&q.source==='pymorphy3'&&q.usable_for_generation===false,'Proposal approval changed '+old.id);
   assert(p.forms&&q.forms&&typeof p.forms==='object'&&typeof q.forms==='object'&&!Array.isArray(p.forms)&&!Array.isArray(q.forms),'Invalid forms '+old.id);
   for(const [k,v] of Object.entries(p.forms))assert(own(q.forms,k)&&equal(q.forms[k],v),'Existing form changed '+old.id+' '+k);
   let n=0;
   for(const [k,v] of Object.entries(q.forms))if(!own(p.forms,k)){
    assert(/^[a-z0-9_]+$/.test(k)&&typeof v==='string'&&v.trim()===v&&v.length>0&&!/\s/.test(v),'Invalid additional form '+old.id);n++;
   }
   assert(n>0,'Proposal change without additional forms '+old.id);
   assert.equal(q.extended_by,'pymorphy3-expanded-paradigms-20261123-v1','Unexpected provenance '+old.id);
   addedForms+=n;
  }
  changed++;
 }
 return {changed,addedForms};
}
function stage({source,expected,next,dest}){
 const current=load(source);
 assert.equal(current.source_sha256,expected,'Stale modular source; rerun analyzer');
 const stats=verifyExtension(current.db,next);
 return stageVerified(current,next,dest,stats);
}
// Shared finalization for internally generated, independently restricted candidates.
function stageVerified(current,next,dest,stats){
 const expected=current.source_sha256;
 verifyArchive(next,baseline);validateLibrary(next);
 if(!stats.changed)return {...stats,status:'no_changes'};
 const m=create(dest,next);
 try{
  const p=spawnSync(process.execPath,[path.join(ROOT,'scripts/check-library-v2.cjs')],{cwd:ROOT,env:{...process.env,ZABAVOGRAD_LIBRARY_MODULES:path.resolve(dest)},encoding:'utf8',maxBuffer:8*1024*1024});
  if(p.error||p.status!==0)fail('Candidate rejected by full validator: '+(p.error||p.stderr||p.stdout));
 }catch(e){fs.rmSync(dest,{recursive:true,force:true});throw e;}
 return {...stats,status:'validated_candidate_not_approved',source_sha256:expected,result_source_sha256:m.source_sha256,delta:delta(current.manifest,m)};
}
module.exports={verifyExtension,stage,stageVerified};
if(require.main===module)try{
 const [source,expected,input,dest,...extra]=process.argv.slice(2);
 if(!source||!expected||!input||!dest||extra.length)fail('Usage: library-analysis-writer.cjs SOURCE_DIR SHA256 PROPOSED_JSON NEW_DIR');
 console.log(JSON.stringify(stage({source,expected,next:JSON.parse(fs.readFileSync(input,'utf8')),dest}),null,2));
}catch(e){console.error(e.stack);process.exitCode=1;}
