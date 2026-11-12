'use strict';
// Validate the review-only action models; never treat them as verified export.
const assert=require('node:assert/strict');
const cases=new Set(['nom','gen','dat','acc','ins','prep','none']);
const roles=new Set(['agent','patient','instrument','material','food','recipient','location','companion','destination','source','result','theme','experiencer','other']);
function validateCandidates(db){
 const nouns=new Map(db.entries.map(e=>[e.id,e]));
 const list=db.speech_frame_candidates||[];
 assert(Array.isArray(list),'Expected speech_frame_candidates array');
 const ids=new Set();
 for(const f of list){
  assert(/^frame-candidate-[a-z0-9-]+$/.test(f.id),'Bad candidate ID');
  assert(!ids.has(f.id),'Duplicate frame candidate ID');ids.add(f.id);
  assert(nouns.has(f.verb_id)&&nouns.get(f.verb_id).part_of_speech==='verb','Missing verb');
  assert(typeof f.semantic_intent==='string'&&f.semantic_intent.trim(),'Missing semantic intent');
  assert(typeof f.example==='string'&&f.example.trim(),'Missing child-friendly example');
  assert(f.status==='suggested'&&f.usable_for_generation===false,'Unreviewed candidates must never be usable');
  assert(f.review?.author_approved===false&&f.review?.grammar_approved===false,'False approval state');
  assert(f.provenance?.source==='zabavograd_editorial'&&f.provenance?.authorship==='independent','Non-original source in published draft');
  assert(Array.isArray(f.roles)&&f.roles.length>=1&&f.roles.length<=8,'Invalid role count');
  assert(f.roles[0].role==='agent'&&f.roles[0].case==='nom'&&f.roles[0].required===true,'First role must be nominative agent');
  const seen=new Set();
  for(const r of f.roles){
   assert(roles.has(r.role)&&cases.has(r.case),'Unrecognized role or case');
   assert(!seen.has(r.role),'Duplicate role in model '+f.id);seen.add(r.role);
   assert(typeof r.preposition==='string'&&/^[а-яё -]*$/i.test(r.preposition),'Invalid preposition');
   assert(!r.preposition||r.case!=='none','Preposition requires case');
   assert(typeof r.required==='boolean','Missing required marker');
   assert(Array.isArray(r.allowed_entry_ids)&&r.allowed_entry_ids.length>0,'Role without participants');
   assert(new Set(r.allowed_entry_ids).size===r.allowed_entry_ids.length,'Duplicate participants');
   for(const id of r.allowed_entry_ids){
    assert(nouns.has(id),'Unresolved participant ID '+id);
    assert(nouns.get(id).part_of_speech!=='verb','Action role should link to nominal senses: '+id);
   }
  }
 }
 return {candidates:list.length,role_links:list.flatMap(f=>f.roles).reduce((n,r)=>n+r.allowed_entry_ids.length,0)};
}
module.exports={validateCandidates};
