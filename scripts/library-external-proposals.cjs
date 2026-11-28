'use strict';
// External review candidates are additions to specific word records, not active game data.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const FIELD='external_linguistic_proposals';
const stable=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0,24);
const licenses={framebank:'GPL-3.0',ruwordnet:'CC-BY-SA-4.0',constructicon:'CC-BY-4.0'};
const types=new Set(['synonym','antonym','is_a','part_of','has_part','instance_of']);
const word=e=>e?.kind==='word'&&e.language==='ru'&&!e.same_lexical_meaning_as;
function validate(db){
 const by=new Map(db.entries.map(e=>[e.id,e])),ids=new Set();
 for(const e of db.entries){
  if(e[FIELD]===undefined)continue;
  assert(word(e)&&Array.isArray(e[FIELD]));
  for(const p of e[FIELD]){
   assert(p.id==='external-'+stable([p.source,p.source_record_id,e.id,p.object_id??null])&&!ids.has(p.id),'Invalid/duplicate external proposal');ids.add(p.id);
   assert.equal(p.status,'suggested');assert.equal(p.usable_for_generation,false);
   assert.equal(p.license,licenses[p.source]);assert.equal(p.entry_id,e.id);
   assert(typeof p.source_revision==='string'&&p.source_revision.length>0);
   assert(typeof p.source_record_id==='string'&&p.source_record_id.length>0);
   if(p.source==='ruwordnet'){
    assert(types.has(p.relation_type)&&word(by.get(p.object_id))&&p.object_id!==e.id);
    assert.equal(p.match_status,'unique_lemma_and_synset_requires_sense_review');
   }else{
    assert(p.match_status==='unique_lemma_requires_sense_review');
    assert(e.part_of_speech==='verb'||e.legacy_source?.raw?.part_of_speech==='verb');
    assert(Array.isArray(p.slots)&&p.slots.length>0);
    for(const s of p.slots)assert(typeof s.form==='string'&&typeof s.role==='string'&&s.form.length<=200&&s.role.length<=200);
   }
  }
 }
 return ids;
}
function plan(db,bundle){
 assert(licenses[bundle.source]&&Array.isArray(bundle.records),'Unknown external bundle');
 const out=structuredClone(db),by=new Map(out.entries.map(e=>[e.id,e])),ids=validate(out),changed=new Set();
 const active=new Set();
 for(const r of out.relations){
  const a=r.subject?.id??r.child?.id,b=r.object?.id??r.parent?.id;
  if(a&&b){
   active.add(JSON.stringify([r.type,a,b]));
   if(['synonym','antonym'].includes(r.type))active.add(JSON.stringify([r.type,b,a]));
   if(r.type==='part_of')active.add(JSON.stringify(['has_part',b,a]));
   if(r.type==='has_part')active.add(JSON.stringify(['part_of',b,a]));
  }
 }
 for(const e of out.entries)for(const p of e.semantic_review_proposals||[]){
  active.add(JSON.stringify([p.type,p.subject.id,p.object.id]));
  if(['synonym','antonym'].includes(p.type))active.add(JSON.stringify([p.type,p.object.id,p.subject.id]));
 }
 let added=0,skipped=0;
 for(const r of bundle.records){
  const e=by.get(r.entry_id??r.subject_id);
  if(!word(e)){skipped++;continue;}
  const common={source:bundle.source,source_revision:String(bundle.source_revision),source_record_id:String(r.source_record_id),
   license:licenses[bundle.source],entry_id:e.id,status:'suggested',usable_for_generation:false};
  let p;
  if(bundle.source==='ruwordnet'){
   if(!word(by.get(r.object_id))||e.id===r.object_id||!types.has(r.relation_type)||active.has(JSON.stringify([r.relation_type,e.id,r.object_id]))){skipped++;continue;}
   p={...common,relation_type:r.relation_type,object_id:r.object_id,match_status:'unique_lemma_and_synset_requires_sense_review'};
  }else{
   if(r.entry_candidates?.length!==1||r.anchor_lemma!==e.lemma||!(e.part_of_speech==='verb'||e.legacy_source?.raw?.part_of_speech==='verb')){skipped++;continue;}
   const slots=(r.slots||[]).filter(s=>typeof s.form==='string'&&s.form.length>0&&s.form.length<=200&&typeof s.role==='string'&&s.role.length>0&&s.role.length<=200).map(s=>({form:s.form,role:s.role}));
   if(!slots.length){skipped++;continue;}
   p={...common,slots,match_status:'unique_lemma_requires_sense_review'};
  }
  p.id='external-'+stable([p.source,p.source_record_id,e.id,p.object_id??null]);
  if(ids.has(p.id)){skipped++;continue;}
  ids.add(p.id);(e[FIELD]??=[]).push(p);changed.add(e.id);added++;
 }
 validate(out);
 return {db:out,stats:{changed:changed.size,added_proposals:added,skipped,source:bundle.source}};
}
module.exports={FIELD,validate,plan};
