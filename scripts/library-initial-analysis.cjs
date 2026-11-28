#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {load}=require('./library-store.cjs');
const {stageVerified}=require('./library-analysis-writer.cjs');
const pending='pending_automatic_analysis',candidate='automatic_candidate_needs_review';
const own=(o,k)=>Object.hasOwn(o,k);
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const str=x=>typeof x==='string'&&x.trim()===x&&x.length>0;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const canon=x=>String(x??'').normalize('NFC').toLocaleLowerCase('ru').trim();
const vowels=new Set(['а','о','у','ы','э','и']);
function morphology(e,m){
 if(m?.status!=='candidate_needs_review'||m.analyzer!=='pymorphy3'||!str(m.lemma)||!str(m.tag)||!str(m.part_of_speech)||!Number.isFinite(m.score)||!object(m.forms))return null;
 const expected=({noun:['NOUN'],verb:['INFN','VERB'],adjective:['ADJF','ADJS']})[e.part_of_speech||e.legacy_source?.raw?.part_of_speech];
 const gender=e.morphology?.data?.gender,machineGender=/\bmasc\b/.test(m.tag)?'м':/\bfemn\b/.test(m.tag)?'ж':/\bneut\b/.test(m.tag)?'ср':null;
 const flags=[...(m.ambiguous?['homograph_or_ambiguous_analysis']:[]),
  ...(canon(m.lemma)!==canon(e.lemma)?['lemma_differs_from_card']:[]),
  ...(expected&&!expected.includes(m.part_of_speech)?['part_of_speech_conflict']:[]),
  ...(gender&&machineGender&&gender!==machineGender?['editorial_gender_conflict']:[]),
  ...(e.morphology?.data?.lemma_number?['grammatical_number_must_be_confirmed']:[]),
  ...(m.countability_unverified?['countability_unverified']:[])];
 const forms={};
 for(const [k,v] of Object.entries(m.forms))if(/^[a-z0-9_]+$/.test(k)&&!['__proto__','constructor','prototype'].includes(k)&&str(v))forms[k]=v;
 if(!Object.keys(forms).length)return null;
 return {source:'pymorphy3',status:'suggested',usable_for_generation:false,lemma:m.lemma,part_of_speech:m.part_of_speech,grammemes:m.tag,score:m.score,forms,flags};
}
function phonetics(p){
 if(p?.status!=='candidate_needs_review'||p.analyzer!=='nsu-ai/russian_g2p'||!Array.isArray(p.sound_tokens)||!p.sound_tokens.length||!p.sound_tokens.every(t=>typeof t==='string'&&/^[а-яё](?:')?$/u.test(t)))return null;
 const n=p.sound_tokens.filter(t=>vowels.has(t)).length;
 if(n<1||n!==p.syllables||!Number.isInteger(p.stress_syllable)||p.stress_syllable<1||p.stress_syllable>n)return null;
 if(p.stressed_vowel!=null&&!vowels.has(p.stressed_vowel))return null;
 return {source:'nsu-ai/russian_g2p',status:'suggested',sound_tokens:p.sound_tokens.slice(),stress_syllable:p.stress_syllable,syllable_count:n,stressed_vowel:p.stressed_vowel??null,accented:str(p.accented)?p.accented:null,usable_for_generation:false};
}
function fill(e,field,proposal){
 const h=e[field],isPh=field==='phonetic_tags',key=isPh?'phonetic':'morphology',metaKey=isPh?'speech':'forms';
 if(h?.status!==pending||!(h.data===null||object(h.data))||!proposal)return false;
 // No replacing existing candidates or curated values, even if a status is stale.
 if(own(h.data??{},'automatic_proposal')||own(h.data??{},'approved_form_subset')||e.machine_analysis?.[key]!==undefined)return false;
 if(e.metadata_completion!=null&&!object(e.metadata_completion))return false;
 const prev=e.metadata_completion?.[metaKey];
 if(prev!=null&&prev!==pending&&prev!==candidate)return false;
 if(e.legacy_source?.raw){
  if(e.machine_analysis!=null&&!object(e.machine_analysis))return false;
  (e.machine_analysis??={})[key]=proposal;
 }else if(isPh){
  const values={sound_tokens:proposal.sound_tokens,stress_syllable:proposal.stress_syllable,syllable_count:proposal.syllable_count,stressed_vowel:proposal.stressed_vowel,automatic_proposal:{source:proposal.source,status:'suggested',accented:proposal.accented,usable_for_automatic_target_selection:'only_letter_aligned_and_not_before_soft_consonant',not_methodically_verified:true}};
  for(const [k,v] of Object.entries(values))if(own(h.data??{},k)&&h.data[k]!=null&&!(Array.isArray(h.data[k])&&!h.data[k].length)&&!same(h.data[k],v))return false;
  Object.assign(h.data??={},values);
 }else (h.data??={}).automatic_proposal=proposal;
 h.status=candidate;
 (e.metadata_completion??={})[metaKey]=candidate;
 return true;
}
function plan(db,draft,expected){
 assert(draft?.schema_version===1&&draft.status==='DRAFT_ONLY_NOT_APPROVED','Only draft analysis is accepted');
 assert(draft.source?.sha256===expected,'Stale or unbound draft; regenerate from exact source');
 assert(Array.isArray(draft.entries),'Missing draft entries');
 const out=structuredClone(db),byId=new Map(out.entries.map(e=>[e.id,e])),seen=new Set();
 assert.equal(byId.size,out.entries.length,'Duplicate source ID');
 const stats={changed:0,phonetic_candidates:0,morphology_candidates:0,protected_or_unusable:0};
 for(const row of draft.entries){
  assert(row&&typeof row.id==='string'&&!seen.has(row.id),'Duplicate/invalid draft ID');seen.add(row.id);
  const e=byId.get(row.id);assert(e,'Unknown draft ID '+row.id);
  assert.equal(row.lemma,e.lemma,'Draft lemma differs '+row.id);
  assert.deepEqual(row.meaning??null,e.meaning??null,'Draft meaning differs '+row.id);
  if(e.kind==='digit'||e.kind==='country'){stats.protected_or_unusable++;continue;}
  const m=fill(e,'morphology',morphology(e,row.morphology));
  const p=fill(e,'phonetic_tags',phonetics(row.phonetic));
  if(m)stats.morphology_candidates++;if(p)stats.phonetic_candidates++;
  if(m||p)stats.changed++;else stats.protected_or_unusable++;
 }
 return {db:out,stats};
}
function stage(source,doc,dest){
 const current=load(source),r=plan(current.db,doc,current.source_sha256);
 return stageVerified(current,r.db,dest,r.stats);
}
module.exports={plan,stage};
if(require.main===module)try{
 const [source,draft,dest,...rest]=process.argv.slice(2);
 if(!source||!draft||!dest||rest.length)throw Error('Usage: library-initial-analysis.cjs SOURCE_DIR DRAFT_JSON NEW_DIR');
 console.log(JSON.stringify(stage(source,JSON.parse(fs.readFileSync(draft,'utf8')),dest),null,2));
}catch(e){console.error(e.stack);process.exitCode=1;}
