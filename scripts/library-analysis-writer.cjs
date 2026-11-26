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

const blockedFlags=new Set(['homograph_or_ambiguous_analysis','lemma_differs_from_card','part_of_speech_conflict','editorial_gender_conflict','grammatical_number_must_be_confirmed']);
const singleOnly=new Set(['бельё','шерсть','мука','мёд']);
const keysByPos={
 noun:/^(nomn|gent|datv|accs|ablt|loct)_(sing|plur)$/,
 adjective:/^(?:(?:masc|femn|neut)_(?:nomn|gent|datv|accs|ablt|loct)_sing|(?:nomn|gent|datv|accs|ablt|loct)_plur|(?:masc|neut)_accs_sing_(?:anim|inan)|accs_plur_(?:anim|inan))$/,
 verb:/^(?:(?:present|future)_[123](?:sg|pl)|past_(?:masc|femn|neut|plur)|imperative_2(?:sg|pl))$/
};
function verifySafeSubset(before,after,ids){
 assert(Array.isArray(ids)&&ids.length>=1&&ids.length<=30&&new Set(ids).size===ids.length,'Select 1..30 distinct IDs');
 const selected=new Set(ids),known=new Set(before.entries.map(e=>e.id));
 for(const id of selected)assert(known.has(id),'Unknown entry '+id);
 const {entries:b,...btop}=before,{entries:a,...atop}=after;
 assert.deepEqual(atop,btop,'Top-level data changed');assert.equal(a.length,b.length,'Entry count changed');
 let changed=0,addedForms=0;
 for(let i=0;i<b.length;i++){
  const old=b[i],next=a[i];assert.equal(next.id,old.id,'ID changed');
  if(equal(old,next))continue;
  assert(selected.has(old.id)&&old.kind==='word'&&!old.same_lexical_meaning_as&&!old.legacy_source?.raw,'Protected or unselected entry');
  assert.equal(old.morphology?.status,'automatic_candidate_needs_review');
  const data=old.morphology.data,p=data.automatic_proposal;
  assert(!own(data,'approved_form_subset'),'Existing approval protected');
  assert(p?.status==='suggested'&&p.source==='pymorphy3'&&p.usable_for_generation===false&&p.lemma===old.lemma,'Expected exact unapproved proposal');
  assert(Array.isArray(p.flags)&&!p.flags.some(f=>blockedFlags.has(f)),'Risk flags');
  const subset=next.morphology?.data?.approved_form_subset;
  assert(subset&&typeof subset.forms==='object'&&subset.forms!==null&&!Array.isArray(subset.forms),'Missing approved subset');
  assert.deepEqual(subset,{revision:'safe-local-morphology-modular-v1',status:'machine_checked',usable_for_generation:true,source:'pymorphy3_2.0.6_exact_lemma',review_method:'exact_pymorphy3_paradigm_matching',human_reviewed:false,automatic_counting_allowed:false,forms:subset.forms},'Incorrect approval metadata');
  const copy=structuredClone(next);delete copy.morphology.data.approved_form_subset;assert(equal(copy,old),'Unrelated data changed');
  const entries=Object.entries(subset.forms);assert(entries.length>0,'Empty subset');
  const pattern=keysByPos[old.part_of_speech];assert(pattern,'Unsupported part of speech');
  for(const [k,v] of entries){
   assert(pattern.test(k)&&typeof v==='string'&&v.length<=100&&v.length>0&&!/\s/.test(v)&&own(p.forms,k)&&p.forms[k]===v,'Invalid or nonmatching form '+k);
   if(old.part_of_speech==='noun'&&(singleOnly.has(old.lemma)||p.flags.includes('countability_unverified')))assert(k.endsWith('_sing'),'Unverified plural form');
  }
  changed++;addedForms+=entries.length;
 }
 return {changed,addedForms};
}
function stageSafe({source,expected,next,dest,ids}){
 const current=load(source);assert.equal(current.source_sha256,expected,'Stale modular source; rerun analyzer');
 return stageVerified(current,next,dest,verifySafeSubset(current.db,next,ids));
}

function stage({source,expected,next,dest}){
 const current=load(source);
 assert.equal(current.source_sha256,expected,'Stale modular source; rerun analyzer');
 const stats=verifyExtension(current.db,next);
 return stageVerified(current,next,dest,stats);
}
// Shared finalization for internally generated, independently restricted candidates.
function stageVerified(current,next,dest,stats,{mediaDir}={}){
 const expected=current.source_sha256;
 assert(!fs.existsSync(dest),'Destination exists');
 verifyArchive(next,baseline);validateLibrary(next,{assetDir:mediaDir?path.join(mediaDir,'public'):undefined});
 if(!stats.changed)return {...stats,status:'no_changes'};
 const m=create(dest,next);
 try{
  const p=spawnSync(process.execPath,[path.join(ROOT,'scripts/check-library-v2.cjs'),'--candidate-dir',path.resolve(dest),...(mediaDir?['--candidate-media',path.resolve(mediaDir)]:[])],{cwd:ROOT,env:process.env,encoding:'utf8',maxBuffer:8*1024*1024});
  if(p.error||p.status!==0)fail('Candidate rejected by full validator: '+(p.error||p.stderr||p.stdout));
 }catch(e){fs.rmSync(dest,{recursive:true,force:true});throw e;}
 return {...stats,status:'validated_candidate_not_approved',source_sha256:expected,result_source_sha256:m.source_sha256,delta:delta(current.manifest,m)};
}
module.exports={verifyExtension,verifySafeSubset,stage,stageSafe,stageVerified};
if(require.main===module)try{
 const [source,expected,input,dest,...extra]=process.argv.slice(2);
 if(!source||!expected||!input||!dest||(extra.length&&extra[0]!=='--safe-subset'))fail('Usage: library-analysis-writer.cjs SOURCE_DIR SHA256 PROPOSED_JSON NEW_DIR [--safe-subset ID...]');
 const packet={source,expected,next:JSON.parse(fs.readFileSync(input,'utf8')),dest};
 console.log(JSON.stringify(extra.length?stageSafe({...packet,ids:extra.slice(1)}):stage(packet),null,2));
}catch(e){console.error(e.stack);process.exitCode=1;}
