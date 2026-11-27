'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const proposals=require('./library-semantic-proposals.cjs');
const phonetics=require('./library-phonetic-review.cjs');
const {validateExport,relationPolicy}=require('./semantic-review.cjs');
const HISTORY='editorial_decision_history';
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function validate(d){
 assert(d&&typeof d==='object'&&!Array.isArray(d),'Expected decision object');
 const common=['domain','entry_id','proposal_sha256','action','reason'];
 const allowed=d.domain==='semantic'?common.concat('proposal_id',...(d.action==='accept'?['sense_checked','typical_for_children','independently_authored']:[])):common;
 assert.deepEqual(Object.keys(d).sort(),allowed.sort(),'Unexpected decision fields');
 assert(['semantic','phonetic'].includes(d.domain)&&['accept','reject'].includes(d.action),'Unsupported decision');
 assert(typeof d.entry_id==='string'&&d.entry_id.length>0&&d.entry_id.length<=256,'Invalid entry ID');
 assert(typeof d.proposal_sha256==='string'&&/^[a-f0-9]{64}$/.test(d.proposal_sha256),'Exact proposal hash required');
 assert(typeof d.reason==='string'&&d.reason.trim()===d.reason&&d.reason.length>=5&&d.reason.length<=500,'Decision reason required');
 if(d.domain==='semantic'){
  assert(typeof d.proposal_id==='string'&&/^semantic-proposal-[a-f0-9]{24}$/.test(d.proposal_id),'Invalid proposal ID');
  if(d.action==='accept')assert(d.sense_checked===true&&d.typical_for_children===true&&d.independently_authored===true,'Explicit sense, suitability and authorship confirmations required');
 }else assert(d.action==='reject','Phonetic activation deferred until derived-field reconciliation');
 return d;
}
function plan(db,decisions){
 assert(Array.isArray(decisions)&&decisions.length>=1&&decisions.length<=30,'1..30 decisions required');
 const out=structuredClone(db),byId=new Map(out.entries.map(e=>[e.id,e]));
 const history=out[HISTORY]??[];
 assert(Array.isArray(history),'Invalid decision history');
 const events=new Set(history.map(h=>h.id)),changes=[];
 for(const d of decisions){
  validate(d);
  const e=byId.get(d.entry_id);assert(e,'Unknown entry ID '+d.entry_id);
  let p,relation=null;
  if(d.domain==='semantic'){
   const list=e[proposals.FIELD];assert(Array.isArray(list),'No semantic proposals');
   const index=list.findIndex(x=>x.id===d.proposal_id);assert(index>=0,'Proposal missing or already resolved');
   p=list[index];assert.equal(digest(p),d.proposal_sha256,'Proposal changed; review again');
   assert(p.status==='suggested'&&p.usable_for_generation===false&&p.source==='zabavograd_editorial','Only independent open proposals supported');
   assert.equal(p.subject.id,e.id,'Wrong proposal owner');
   list.splice(index,1);if(!list.length)delete e[proposals.FIELD];
   if(d.action==='accept'){
    // Recheck current senses, other pending and active links, normalization and cycles.
    const rechecked=proposals.plan(out,[{type:p.type,subject:p.subject,object:p.object,reason:p.reason}]);
    assert.deepEqual(rechecked.db.entries.find(x=>x.id===e.id)[proposals.FIELD].at(-1),p,'Proposal no longer matches current policy');
    const rid='semantic-decision-'+digest([p.type,p.subject.id,p.object.id]).slice(0,24);
    assert(!out.relations.some(r=>r.id===rid),'Relation ID collision');
    relation={id:rid,type:p.type,subject:{id:p.subject.id,lemma:p.subject.lemma},object:{id:p.object.id,lemma:p.object.lemma},inverse_type:relationPolicy(p.type).inverse,
     approval:{status:'verified',usable_for_generation:true,sense_checked:true,typical_for_children:true,review_method:'explicit_modular_editorial_decision',human_reviewed:false},
     provenance:{source:'zabavograd_editorial',authorship:'independent',revision:'modular-editorial-decision-v1',proposal_sha256:d.proposal_sha256,decision_id:'decision-'+digest(d).slice(0,24)}};
    out.relations.push(relation);
   }
  }else{
   p=e.phonetic_tags?.review_proposal;assert(p,'Proposal missing or already resolved');
   phonetics.validateProposal(p);assert.equal(digest(p),d.proposal_sha256,'Proposal changed; review again');
   delete e.phonetic_tags.review_proposal;
  }
  const id='decision-'+digest(d).slice(0,24);assert(!events.has(id),'Duplicate decision');events.add(id);
  history.push({id,decision:structuredClone(d),proposal:structuredClone(p),relation_id:relation?.id??null});
  changes.push({id:e.id,lemma:e.lemma,path:d.domain==='semantic'?'/'+proposals.FIELD:phonetics.PROPOSAL_PATH,action:d.action,decision_id:id,proposal_sha256:d.proposal_sha256,relation_id:relation?.id??null});
 }
 out[HISTORY]=history;
 assert.deepEqual(out.entries.map(e=>[e.id,e.legacy_source]),db.entries.map(e=>[e.id,e.legacy_source]),'Archive changed');
 assert.deepEqual(out.categories,db.categories);
 assert.deepEqual(out.relations.slice(0,db.relations.length),db.relations,'Existing relations changed');
 validateExport(out);
 return {db:out,changes};
}
module.exports={HISTORY,digest,validate,plan};
