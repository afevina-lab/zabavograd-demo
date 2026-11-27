'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {relationPolicy}=require('./semantic-review.cjs');
const FIELD='semantic_review_proposals';
const sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
function keys(x,expected){assert(object(x),'Expected semantic review object');assert.deepEqual(Object.keys(x).sort(),expected.slice().sort(),'Unexpected semantic review fields');}
function canonical(type,s,o){
 const policy=relationPolicy(type);assert(policy,'Unsupported relation type '+type);
 if(type==='has_part'){type='part_of';[s,o]=[o,s];}
 if(policy.symmetric&&s>o)[s,o]=[o,s];
 return [type,s,o];
}
function pairKey(type,s,o){return JSON.stringify(canonical(type,s,o));}
function reference(e){return {id:e.id,lemma:e.lemma,meaning:e.meaning??null};}
function validateOperation(op){
 keys(op,['type','subject','object','reason']);
 assert(typeof op.type==='string'&&relationPolicy(op.type),'Unsupported relation type');
 for(const end of [op.subject,op.object]){
  keys(end,['id','lemma','meaning']);
  assert(typeof end.id==='string'&&end.id.length>0&&end.id.length<=256,'Invalid sense ID');
  assert(typeof end.lemma==='string'&&end.lemma.length>0&&end.lemma.length<=160,'Invalid lemma');
  assert(end.meaning===null||typeof end.meaning==='string'&&end.meaning.length<=500,'Invalid sense meaning');
 }
 assert(op.subject.id!==op.object.id,'Self relation');
 assert(typeof op.reason==='string'&&op.reason.trim()===op.reason&&op.reason.length>=5&&op.reason.length<=500,'Review reason required');
 return op;
}
function graphState(db){
 const entries=new Map(db.entries.map(e=>[e.id,e])),pairs=new Set(),edges=new Map(),ids=new Set();
 assert.equal(entries.size,db.entries.length,'Duplicate entry ID');
 function add(type,s,o){
  const [t,a,b]=canonical(type,s,o);pairs.add(pairKey(t,a,b));
  if(['is_a','part_of'].includes(t)){
   if(!edges.has(t))edges.set(t,new Map());
   const g=edges.get(t);if(!g.has(a))g.set(a,new Set());g.get(a).add(b);
  }
 }
 for(const r of db.relations){
  const s=r.subject?.id??r.child?.id,o=r.object?.id??r.parent?.id;
  if(s&&o&&relationPolicy(r.type))add(r.type,s,o);
 }
 for(const e of db.entries)for(const p of e[FIELD]||[]){
  assert(p.status==='suggested'&&p.usable_for_generation===false,'Unexpected stored semantic proposal status');
  assert.equal(p.subject?.id,e.id,'Semantic proposal stored under wrong subject');
  assert(entries.has(p.subject.id)&&entries.has(p.object?.id),'Unknown stored proposal endpoint');
  assert(!ids.has(p.id),'Duplicate semantic proposal ID');ids.add(p.id);
  add(p.type,p.subject.id,p.object.id);
 }
 return {entries,pairs,edges,ids,add};
}
function reaches(g,start,target){
 const seen=new Set(),pending=[start];
 while(pending.length){const x=pending.pop();if(x===target)return true;if(seen.has(x))continue;seen.add(x);for(const y of g?.get(x)||[])pending.push(y);}
 return false;
}
function plan(db,ops){
 assert(Array.isArray(ops)&&ops.length>=1&&ops.length<=30,'1..30 semantic proposals required');
 const out=structuredClone(db),g=graphState(out),changes=[];
 for(const op of ops){
  validateOperation(op);
  for(const ref of [op.subject,op.object]){
   const e=g.entries.get(ref.id);assert(e,'Unknown sense ID '+ref.id);
   assert.deepEqual(reference(e),ref,'Sense snapshot differs '+ref.id);
   assert(e.kind==='word'&&!e.same_lexical_meaning_as,'Pilot requires non-alias word entries');
  }
  const [type,s,o]=canonical(op.type,op.subject.id,op.object.id),sub=g.entries.get(s),obj=g.entries.get(o),key=pairKey(type,s,o);
  assert(!g.pairs.has(key),'Duplicate active or proposed semantic edge '+key);
  if(['is_a','part_of'].includes(type))assert(!reaches(g.edges.get(type),o,s),'Cyclic '+type+' hierarchy');
  if(type==='is_a')assert(obj.generalization?.is_generalizing_word===true,'Genus must be an approved generalizing entry');
  if(['antonym','synonym','contrasts_with'].includes(type)){
   const pos=e=>e.part_of_speech??e.legacy_source?.raw?.part_of_speech??null;
   if(pos(sub)&&pos(obj))assert.equal(pos(sub),pos(obj),'Part of speech mismatch');
  }
  const id='semantic-proposal-'+sha([type,s,o]).slice(0,24);
  assert(!g.ids.has(id),'Proposal ID collision');g.ids.add(id);
  const p={id,type,subject:reference(sub),object:reference(obj),inverse_type:relationPolicy(type).inverse,status:'suggested',usable_for_generation:false,source:'zabavograd_editorial',reason:op.reason};
  const previous=sub[FIELD]??[];
  assert(Array.isArray(previous),'Invalid stored proposals');
  sub[FIELD]=[...previous,p];g.add(type,s,o);
  changes.push({id:sub.id,lemma:sub.lemma,path:'/'+FIELD,before:{exists:previous.length>0,value:previous},after:{exists:true,value:sub[FIELD]},proposal_id:id});
 }
 assert.deepEqual(out.relations,db.relations,'Active relation graph changed');
 assert.deepEqual(out.entries.map(e=>[e.id,e.legacy_source]),db.entries.map(e=>[e.id,e.legacy_source]),'Archive changed');
 return {db:out,changes};
}
function counts(db){
 const result=new Map();
 for(const e of db.entries)for(const p of e[FIELD]||[])if(p.status==='suggested'&&p.usable_for_generation===false){
  for(const id of [p.subject.id,p.object.id])result.set(id,(result.get(id)||0)+1);
 }
 return result;
}
module.exports={FIELD,reference,validateOperation,plan,counts,pairKey};
