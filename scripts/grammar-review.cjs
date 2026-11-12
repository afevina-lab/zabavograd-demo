'use strict';
/**
 * Editorial speech-frame approval: separately maps linguistic suggestions
 * into our own *authored* child-friendly role/grammar patterns.
 * Never copies source constructions/slots or examples into the game.
 */
const fs=require('node:fs'),crypto=require('node:crypto');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0,24);
const cases=new Set(['nom','gen','dat','acc','ins','prep','none']);
const sources=new Set(['constructicon','framebank','editorial']);
const roleNames=new Set(['agent','patient','instrument','material','food','recipient','location','companion','destination','source','result','theme','experiencer','other']);
function candidateKey(r){
 return [r.source,r.source_record_id,r.candidate_type,r.entry_id||r.anchor_lemma].map(v=>v||'').join('|');
}
function verifyFrame(frame, ids){
 if(!frame||!ids.has(frame.verb_id))throw Error('Unknown verb sense ID');
 if(typeof frame.id!=='string'||!frame.id.startsWith('frame-'))throw Error('Invalid frame ID');
 if(frame.status!=='verified'||frame.usable_for_generation!==true)throw Error('Frame not approved');
 if(!Array.isArray(frame.roles)||frame.roles.length<1||frame.roles.length>8)throw Error('Expected 1–8 roles');
 if(frame.review?.sense_checked!==true||frame.review?.typical_for_children!==true||frame.review?.grammar_checked!==true||frame.review?.independent_authoring!==true||frame.review?.publication_clearance!==true)throw Error('Explicit editorial and publication verification required');
 for(const role of frame.roles){
  if(!roleNames.has(role.role)||!cases.has(role.case))throw Error('Unknown semantic role or case');
  if(typeof role.preposition!=='string'||!/^[а-яё -]*$/i.test(role.preposition))throw Error('Invalid preposition');
  if(role.preposition&&role.case==='none')throw Error('Preposition requires case');
  if(typeof role.required!=='boolean')throw Error('Required flag missing');
  if(!Array.isArray(role.allowed_entry_ids)||role.allowed_entry_ids.some(id=>!ids.has(id)))throw Error('Unknown participant sense ID');
  if(role.allowed_entry_ids.length===0)throw Error('No verified typical participants');
  if(new Set(role.allowed_entry_ids).size!==role.allowed_entry_ids.length)throw Error('Duplicate role participants');
 }
 if(new Set(frame.roles.map(r=>r.role)).size!==frame.roles.length)throw Error('Duplicated role; use explicit separate role names');
 return true;
}
function prepare(db, suggestions, decisions){
 if(!Array.isArray(db.entries))throw Error('Missing V2 entries');
 const entries=new Map(db.entries.map(x=>[x.id,x])), ids=new Set(entries.keys());
 if(ids.size!==db.entries.length)throw Error('Duplicate dictionary sense IDs');
 const map=new Map();
 for(const bundle of suggestions){
  if(bundle.schema!=='linguistic_suggestions_v1'||bundle.purpose!=='review_only')throw Error('Invalid suggestions bundle');
  for(const r of bundle.records||[]){
   if(!sources.has(r.source)||r.review_status!=='suggested'||r.usable_for_generation!==false)throw Error('Unreviewed or unknown grammar source');
   if(!['valency_pattern','construction_anchor'].includes(r.candidate_type))continue;
   const k=candidateKey(r);
   if(map.has(k)&&JSON.stringify(map.get(k).r)!==JSON.stringify(r))throw Error('Conflicting source candidate');
   map.set(k,{r,bundle});
  }
 }
 if(decisions.schema!=='speech_frame_decisions_v1'||!Array.isArray(decisions.decisions))throw Error('Invalid decisions file');
 const updated=structuredClone(db);
 const frames=updated.speech_frames||[];
 const events=updated.speech_frame_review_history||[];
 const decisionKeys=new Set();
 for(const d of decisions.decisions){
  if(!d.key||!['accept','reject'].includes(d.action)||decisionKeys.has(d.key))throw Error('Invalid or duplicated frame decision');
  decisionKeys.add(d.key);
  const found=map.get(d.key);
  if(!found)throw Error('Missing original source candidate for decision '+d.key);
  const {r,bundle}=found;
  if(d.action==='reject'){
   const eventId=hash([d.key,d.action,d.reason||'']);
   if(!events.some(e=>e.id===eventId))events.push({id:eventId,key:d.key,action:'reject',reason:String(d.reason||'')});
   continue;
  }
  // Semantic and grammatical material in this structure is editorial input,
  // not a transformed copy of FrameBank or Constructicon tables.
  if(!ids.has(d.verb_id)||d.verb_id!==r.entry_id)throw Error('Ambiguous or mismatched verb meaning');
  if(entries.get(d.verb_id).part_of_speech!=='verb' && entries.get(d.verb_id).legacy_source?.raw?.part_of_speech!=='verb')
    throw Error('Anchor is not tagged as a verb');
  if(r.source==='framebank'&&(d.review?.independent_authoring!==true||d.review?.publication_clearance!==true))
    throw Error('FrameBank-informed models require independent authorship and explicit publication clearance');
  if(r.source==='constructicon'&&d.review?.publication_clearance!==true)
    throw Error('Constructicon license attribution and publication clearance required');
  const id='frame-'+hash([d.verb_id,d.semantic_intent||'',(d.roles||[]).map(x=>[x.role,x.case,x.preposition,x.allowed_entry_ids])]);
  const frame={id,verb_id:d.verb_id,semantic_intent:String(d.semantic_intent||''),
    roles:d.roles,status:'verified',usable_for_generation:true,
    review:{sense_checked:d.review?.sense_checked===true,grammar_checked:d.review?.grammar_checked===true,
      typical_for_children:d.review?.typical_for_children===true,independent_authoring:d.review?.independent_authoring===true,publication_clearance:d.review?.publication_clearance===true},
    attribution:{source:r.source,source_record_id:r.source_record_id,source_revision:bundle.source_revision,
      editorial_derivation:true},note:String(d.note||'')};
  verifyFrame(frame,ids);
  if(!frames.some(x=>x.id===id))frames.push(frame);
  const eventId=hash([d.key,'accept',id]);
  if(!events.some(e=>e.id===eventId))events.push({id:eventId,key:d.key,action:'accept',frame_id:id});
 }
 updated.speech_frames=frames;
 updated.speech_frame_review_history=events;
 validateFrames(updated);
 return updated;
}
function validateFrames(db){
 const ids=new Set(db.entries.map(x=>x.id)), seen=new Set();
 for(const frame of db.speech_frames||[]){
  verifyFrame(frame,ids);
  if(seen.has(frame.id))throw Error('Duplicate frame ID');
  seen.add(frame.id);
 }
 return {schema:'speech_frames_game_v1',
  frames:(db.speech_frames||[]).map(f=>({id:f.id,verb_id:f.verb_id,semantic_intent:f.semantic_intent,
    roles:f.roles.map(r=>({role:r.role,case:r.case,preposition:r.preposition,required:r.required,
      allowed_entry_ids:r.allowed_entry_ids}))}))};
}
if(require.main===module){
 const [command,master,proposals,decisions]=process.argv.slice(2);
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
 try{
  if(command==='apply'){
   if(!master||!proposals||!decisions)throw Error('Usage: apply MASTER.json SOURCE-SUGGESTIONS.json DECISIONS.json');
   const db=prepare(read(master),[read(proposals)],read(decisions));
   const temp=master+'.speech-frames.tmp';
   fs.writeFileSync(temp,JSON.stringify(db,null,2)+'\n');
   fs.renameSync(temp,master);
   console.log('Saved verified grammar frames',db.speech_frames.length);
  }else if(command==='export'){
   if(!master||!proposals)throw Error('Usage: export MASTER.json OUTPUT.json');
   fs.writeFileSync(proposals,JSON.stringify(validateFrames(read(master)))+'\n');
  }else throw Error('Choose apply or export');
 }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports={candidateKey,prepare,validateFrames};
