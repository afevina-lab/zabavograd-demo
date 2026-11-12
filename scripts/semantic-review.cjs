#!/usr/bin/env node
'use strict';
// Review-only proposals -> explicit editorial decisions -> canonical V2 relations.
// Never load restricted source data or unreviewed suggestions in a game build.
const fs=require('node:fs'),crypto=require('node:crypto');
const stable=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0,24);
const allowed=new Set(['is_a','instance_of','part_of','has_part','made_of','produces','used_for','antonym','synonym','same_root','contrasts_with','typically_contains','dwells_in','made_from','form_of','typically_has_property']);
const inverse={is_a:'has_instance',instance_of:'has_instance',part_of:'has_part',has_part:'part_of',made_of:'material_of',produces:'produced_by',used_for:'purpose_of',antonym:'antonym',synonym:'synonym',same_root:'same_root',contrasts_with:'contrasts_with',typically_contains:'typically_found_in',dwells_in:'dwelling_of',made_from:'ingredient_for',form_of:'has_form',typically_has_property:'typical_property_of'};
const symmetric=new Set(['antonym','synonym','same_root','contrasts_with']);
function key(r){return [r.source,r.source_record_id,r.candidate_type,r.subject_id,r.object_id,r.relation_type].map(x=>x||'').join('|');}
function catalog(db){if(!Array.isArray(db.entries)||!Array.isArray(db.relations))throw Error('Invalid V2 library');
 const entries=new Map(db.entries.map(x=>[x.id,x]));if(entries.size!==db.entries.length)throw Error('Duplicate dictionary IDs');return entries;}
function review(db,proposalBundles,decisions){
 const entries=catalog(db),candidates=new Map();
 for(const bundle of proposalBundles){
  if(bundle.schema!=='linguistic_suggestions_v1'||!Array.isArray(bundle.records)||bundle.purpose!=='review_only')throw Error('Invalid suggestion bundle');
  for(const r of bundle.records){
   if(r.review_status!=='suggested'||r.usable_for_generation!==false)throw Error('Suggestion is not review-only');
   const k=key(r);
   if(candidates.has(k)&&JSON.stringify(candidates.get(k).record)!==JSON.stringify(r))throw Error('Conflicting candidate '+k);
   candidates.set(k,{record:r,license:bundle.license,source_revision:bundle.source_revision});
  }
 }
 if(decisions.schema!=='semantic_review_decisions_v1'||!Array.isArray(decisions.decisions))throw Error('Invalid decisions');
 const output=structuredClone(db),history=output.semantic_review_history||[];
 const uniqueDecisions=new Set();
 for(const d of decisions.decisions){
  if(!['accept','reject'].includes(d.action)||typeof d.key!=='string')throw Error('Invalid decision');
  if(uniqueDecisions.has(d.key))throw Error('Duplicate decision '+d.key);uniqueDecisions.add(d.key);
  const match=candidates.get(d.key);if(!match)throw Error('Decision does not match a supplied proposal: '+d.key);
  const r=match.record;
  if(r.candidate_type!=='semantic_relation'||!['wikidata','ruwordnet'].includes(r.source))throw Error('Unsupported semantic source');
  if(r.source==='wikidata'&&match.license!=='CC0')throw Error('Wikidata CC0 provenance required');
  const researchOnly=r.source==='ruwordnet';
  if(!allowed.has(r.relation_type)||!entries.has(r.subject_id)||!entries.has(r.object_id)||r.subject_id===r.object_id)throw Error('Invalid relation or unknown sense ID');
  if(r.source==='wikidata'&&(!/^Q[1-9]\d*$/.test(r.wikidata_subject)||!/^Q[1-9]\d*$/.test(r.wikidata_object)))throw Error('Missing verified Wikidata QIDs');
  if(r.source==='ruwordnet'&&(!r.ruwordnet_subject||!r.ruwordnet_object))throw Error('Missing explicitly mapped RuWordNet synset IDs');
  const id='semantic-'+stable([r.relation_type,r.subject_id,r.object_id]);
  const established=output.relations.some(x=>x.type===r.relation_type&&(
   (x.subject?.id===r.subject_id&&x.object?.id===r.object_id)||
   (x.type==='is_a'&&x.child?.id===r.subject_id&&x.parent?.id===r.object_id)
  ));
  const existing=output.relations.find(x=>x.id===id);
  if(existing && (!existing.subject||existing.subject.id!==r.subject_id||existing.object.id!==r.object_id||existing.type!==r.relation_type))throw Error('Relation ID collision');
  if(d.action==='accept'){
   if(d.subject_id!==r.subject_id||d.object_id!==r.object_id||d.relation_type!==r.relation_type)throw Error('Editor confirmation must match exact IDs and relation type');
   if(d.typical_for_children!==true||d.sense_checked!==true)throw Error('Explicit sense and pedagogical confirmations required');
   if(!existing&&!established)output.relations.push({
    id,type:r.relation_type,
    subject:{id:r.subject_id,lemma:entries.get(r.subject_id).lemma},
    object:{id:r.object_id,lemma:entries.get(r.object_id).lemma},
    inverse_type:inverse[r.relation_type],
    approval:{status:researchOnly?'verified_research_only':'verified',usable_for_generation:!researchOnly,sense_checked:true,typical_for_children:true},
    provenance:{source:r.source,source_record_id:r.source_record_id,source_revision:match.source_revision,license:match.license},
    editorial_note:String(d.note||'')
   });
  }else if(existing){
   // Explicit rejection of the same proposal revokes the corresponding accepted edge.
   if(existing.provenance?.source!==r.source||existing.provenance.source_record_id!==r.source_record_id)throw Error('Do not revoke an editorial link sourced elsewhere');
   output.relations=output.relations.filter(x=>x.id!==id);
  }
  const eventId=stable([d.key,d.action,JSON.stringify(d)]);
  if(!history.some(h=>h.id===eventId))history.push({id:eventId,key:d.key,action:d.action,relation_id:id,reason:String(d.reason||'')});
 }
 output.semantic_review_history=history;
 validateExport(output);
 return output;
}
function validateExport(db){
 const entries=catalog(db),relations=[],families=[],seen=new Set();
 for(const r of db.relations){
  if(r.type==='is_a'&&r.child&&r.parent){
   if(!entries.has(r.child.id)||!entries.has(r.parent.id))throw Error('Broken genus relation '+r.id);
   relations.push({id:r.id,type:'is_a',subject_id:r.child.id,object_id:r.parent.id,inverse_type:'has_instance',provenance:{source:'zabavograd_editorial'}});
  }else if(r.subject||r.object){
   if(!r.subject||!r.object||!allowed.has(r.type)||!inverse[r.type])throw Error('Invalid semantic edge');
   if(r.approval?.status==='verified_research_only'&&r.approval?.usable_for_generation===false&&r.provenance?.source==='ruwordnet')continue;
   if(!entries.has(r.subject.id)||!entries.has(r.object.id)||r.subject.id===r.object.id)throw Error('Unknown sense in semantic edge');
   if(r.approval?.status!=='verified'||r.approval?.usable_for_generation!==true||r.approval?.sense_checked!==true||r.approval?.typical_for_children!==true)throw Error('Unreviewed semantic edge');
   const clearedExternal=r.provenance?.source==='wikidata'&&r.provenance.license==='CC0';
   const originalEditorial=r.provenance?.source==='zabavograd_editorial'&&
    r.provenance.authorship==='independent'&&['v2-obvious-relations-20261109-v1','v2-attribute-relations-20261109-v1'].includes(r.provenance.revision)&&
    r.approval?.review_method==='independent_explicit_pair'&&r.approval?.typical_for_children===true;
   if(!clearedExternal&&!originalEditorial)throw Error('Non-cleared external relation');
   relations.push({id:r.id,type:r.type,subject_id:r.subject.id,object_id:r.object.id,inverse_type:inverse[r.type],provenance:r.provenance});
  }else{
   for(const field of ['male','female','offspring'])if(r[field]?.id&&!entries.has(r[field].id))throw Error('Broken family reference');
   families.push({id:r.id,type:r.type,male_id:r.male?.id||null,female_id:r.female?.id||null,offspring_id:r.offspring?.id||null,provenance:{source:'zabavograd_editorial'}});
  }
 }
 const pairs=new Set();
 for(const r of relations){
  if(!r.id||seen.has(r.id))throw Error('Duplicate or missing graph ID '+r.id);seen.add(r.id);
  const endpoints=symmetric.has(r.type)?[r.subject_id,r.object_id].sort():[r.subject_id,r.object_id];
  const pair=[r.type,...endpoints].join('|');
  if(pairs.has(pair))throw Error('Duplicate directed semantic edge '+pair);pairs.add(pair);
 }
 // Reject cyclic genus chains before a decision can alter the canonical V2.
 const parents=new Map();
 for(const edge of relations.filter(x=>x.type==='is_a')){
  const list=parents.get(edge.subject_id)||[];list.push(edge.object_id);parents.set(edge.subject_id,list);
 }
 const visiting=new Set(),visited=new Set();
 function visit(id){
  if(visiting.has(id))throw Error('Cyclic is-a hierarchy at '+id);
  if(visited.has(id))return;
  visiting.add(id);
  for(const parent of parents.get(id)||[])visit(parent);
  visiting.delete(id);visited.add(id);
 }
 for(const id of parents.keys())visit(id);
 // One canonical directed edge per fact. Both traversals are materialized by ID
 // for exercises and editor queries. Symmetric facts are never duplicated in storage.
 const by_entry={};
 function add(from,to,relationId,type,direction,extra={}){
  (by_entry[from]??=[]).push({relation_id:relationId,type,target_id:to,direction,...extra});
 }
 for(const r of relations){
  add(r.subject_id,r.object_id,r.id,r.type,'forward',{inverse_type:r.inverse_type});
  add(r.object_id,r.subject_id,r.id,r.inverse_type,'inverse',{inverse_type:r.type});
 }
 for(const r of families){
  for(const [adult,role] of [[r.male_id,'male'],[r.female_id,'female']]){
   if(!adult)continue;
   const other=role==='male'?r.female_id:r.male_id;
   if(other)add(adult,other,r.id,'family_partner','family',{family_role:role});
   if(r.offspring_id){
    add(adult,r.offspring_id,r.id,'family_parent','family',{family_role:role});
    add(r.offspring_id,adult,r.id,'family_offspring','family',{family_role:role});
   }
  }
 }
 for(const value of Object.values(by_entry))value.sort((a,b)=>
   a.type.localeCompare(b.type)||a.target_id.localeCompare(b.target_id)||a.relation_id.localeCompare(b.relation_id));
 return {schema:'semantic_game_graph_v1',relations,families,by_entry};
}
if(require.main===module){
 const [command,master,second,third]=process.argv.slice(2);
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
 try{
  if(command==='apply'){
   if(!master||!second||!third)throw Error('Usage: apply MASTER.json SUGGESTIONS.json DECISIONS.json');
   const db=review(read(master),[read(second)],read(third));
   const temp=master+'.semantic-review.tmp';
   fs.writeFileSync(temp,JSON.stringify(db,null,2)+'\n');
   fs.renameSync(temp,master);
   console.log('Saved V2:',db.relations.length,'relations,',db.semantic_review_history.length,'decisions');
  }else if(command==='export'){
   if(!master||!second)throw Error('Usage: export MASTER.json OUTPUT.json');
   const graph=validateExport(read(master));
   fs.writeFileSync(second,JSON.stringify(graph)+'\n');
   console.log('Exported',graph.relations.length,'links and',graph.families.length,'family records');
  }else throw Error('Choose apply or export');
 }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports={key,review,validateExport};
