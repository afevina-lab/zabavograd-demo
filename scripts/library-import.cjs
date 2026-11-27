'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..','public');
const PREFIX='modular-noun-',REVISION='modular-import-v1';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const normalize=s=>s.normalize('NFC').toLocaleLowerCase('ru').replaceAll('ё','е').replace(/\s+/g,' ').trim();
const nounId=lemma=>PREFIX+hash(normalize(lemma)).slice(0,24);
const txt=(s,n)=>typeof s==='string'&&s.trim()===s&&s.length>0&&s.length<=n;
const srcPattern=/^\/assets\/words\/[a-z0-9][a-z0-9_-]*\.webp$/;
function keys(x,allowed){assert(x&&typeof x==='object'&&!Array.isArray(x),'Expected import operation');assert.deepEqual(Object.keys(x).sort(),allowed.sort(),'Unknown import fields');}
function validate(o){
 if(o?.type==='create_noun'){
  keys(o,['type','lemma','meaning','categories','proposed_weight','reason']);
  assert(txt(o.lemma,100)&&/^[а-яё]+(?:[ -][а-яё]+)*$/u.test(o.lemma),'Expected lowercase Russian noun');
  assert(txt(o.meaning,300),'Explicit meaning required');
  assert(Array.isArray(o.categories)&&o.categories.length>=1&&o.categories.length<=8&&new Set(o.categories).size===o.categories.length&&o.categories.every(x=>txt(x,300)),'Invalid categories');
  assert([10,20,30,50,70,100].includes(o.proposed_weight),'Invalid proposed weight');
 }else if(o?.type==='link_webp'){
  keys(o,['type','entry_id','lemma','meaning','src','sha256','reviewed','reason']);
  assert(txt(o.entry_id,256)&&txt(o.lemma,160)&&(o.meaning===null||txt(o.meaning,500)),'Exact sense required');
  assert(typeof o.src==='string'&&srcPattern.test(o.src),'Invalid WebP asset path');
  assert(/^[a-f0-9]{64}$/.test(o.sha256||''),'Exact asset SHA required');
  assert(o.reviewed===true,'Explicit visual review required');
 }else assert.fail('Unsupported import operation');
 assert(txt(o.reason,500)&&o.reason.length>=5,'Import reason required');return o;
}
function assetRoot(src,publicDir=root,overlay){
 if(!overlay||!srcPattern.test(src))return publicDir;
 const staged=path.join(overlay,src),existing=path.join(publicDir,src);
 if(fs.existsSync(staged)){assert(!fs.existsSync(existing),'Staged asset shadows existing file '+src);return overlay;}
 return publicDir;
}
function verifyAsset(src,expected,publicDir=root,overlay){
 publicDir=assetRoot(src,publicDir,overlay);
 assert(srcPattern.test(src),'Invalid WebP asset path');
 let f=publicDir;for(const p of src.slice(1).split('/')){f=path.join(f,p);const s=fs.lstatSync(f);assert(f.endsWith('.webp')?s.isFile():s.isDirectory(),'Nonregular asset path');}
 const size=fs.statSync(f).size;assert(size>=20&&size<=2*1024*1024,'WebP size out of bounds');
 const b=fs.readFileSync(f);assert.equal(hash(b),expected,'Asset SHA differs');
 assert.equal(b.toString('ascii',0,4),'RIFF','Not RIFF');assert.equal(b.toString('ascii',8,12),'WEBP','Not WebP');
 assert.equal(b.readUInt32LE(4)+8,b.length,'Invalid RIFF length');
 let image=0;
 for(let i=12;i<b.length;){assert(i+8<=b.length,'Truncated WebP chunk');const type=b.toString('ascii',i,i+4),n=b.readUInt32LE(i+4);assert(i+8+n+(n%2)<=b.length,'Truncated WebP payload');assert(!['ANIM','ANMF'].includes(type),'Animated asset forbidden');if(type==='VP8 '||type==='VP8L')image++;i+=8+n+(n%2);}
 assert.equal(image,1,'Expected single still WebP payload');
 return {sha256:expected,bytes:b.length};
}
function plan(db,ops,publicDir=root,overlay){
 assert(Array.isArray(ops)&&ops.length>=1&&ops.length<=30,'1..30 import operations');
 const out=structuredClone(db),ids=new Map(out.entries.map(e=>[e.id,e])),cats=new Set(out.categories.map(c=>c.path)),changes=[];
 for(const o of ops){
  validate(o);
  if(o.type==='create_noun'){
   assert(!out.entries.some(e=>normalize(e.lemma)===normalize(o.lemma)),'Existing spelling or ё/е variant; inspect before adding sense');
   assert(o.categories.every(c=>cats.has(c)),'Unknown category');
   const id=nounId(o.lemma);assert(!ids.has(id),'ID collision');
   const e={id,lemma:o.lemma,meaning:o.meaning,language:'ru',kind:'word',part_of_speech:'noun',selection:{base_weight:0,scope:'general',weight_source:REVISION},lexical_eligible_by_default:false,categories:o.categories.map(p=>({path:p,default_selection:false})),phonetic_tags:{status:'pending_automatic_analysis',data:{}},morphology:{status:'pending_automatic_analysis',data:{}},illustrations:{policy:'illustration_planned',planned_variants:1,art_status:'not_assigned',senses:[]},legacy_source:null,editorial:{source:REVISION,status:'needs_review',proposed_weight:o.proposed_weight,note:o.reason}};
   out.entries.push(e);ids.set(id,e);
   changes.push({id,lemma:e.lemma,action:'create_noun',active_weight:0,proposed_weight:o.proposed_weight});
  }else{
   const e=ids.get(o.entry_id);assert(e&&e.kind==='word'&&!e.same_lexical_meaning_as,'Unknown or alias word');
   assert.equal(e.lemma,o.lemma,'Lemma differs');assert.equal(e.meaning??null,o.meaning,'Meaning differs');
   assert(!e.id.startsWith('ru-noun-20261109-'),'Historical noun image policy requires separate review');
   assert(Array.isArray(e.illustrations?.senses)&&e.illustrations.senses.length===0,'Existing sense requires dedicated variant operation');
   for(const x of out.entries)for(const s of x.illustrations?.senses||[])for(const v of s.variants||[]){
    assert(v.src!==o.src&&v.sha256!==o.sha256,'Image already linked (path or known digest)');
   }
   verifyAsset(o.src,o.sha256,publicDir,overlay);
   const sid=e.id+'-modular-sense',vid='modular-image-'+hash(e.id+'\0'+o.src).slice(0,24);
   assert(!out.entries.some(x=>x.illustrations?.senses?.some(s=>s.id===sid||s.variants?.some(v=>v.id===vid))),'Image identity collision');
   e.illustrations={...e.illustrations,art_status:'assigned',planned_variants:Math.max(1,e.illustrations.planned_variants??0),senses:[{id:sid,word_id:e.id,label:e.lemma,meaning:e.meaning??e.lemma,topic:null,subcategory:null,variants:[{id:vid,src:o.src,label:e.lemma,sha256:o.sha256,format:'webp',source:REVISION,review_note:o.reason}]}]};
   changes.push({id:e.id,lemma:e.lemma,action:'link_webp',sense_id:sid,variant_id:vid,src:o.src,sha256:o.sha256});
  }
 }
 assert.deepEqual(out.relations,db.relations);assert.deepEqual(out.categories,db.categories);
 const created=out.entries.filter(e=>e.id.startsWith(PREFIX)).map(e=>e.id);
 out.provenance??={};
 if(created.length)out.provenance.modular_import={revision:REVISION,created:created.length,created_ids:created};
 return {db:out,changes};
}
function verifyImports(db,publicDir=root,overlay){
 const added=db.entries.filter(e=>e.id.startsWith(PREFIX)),p=db.provenance?.modular_import;
 assert.equal(p?.created??0,added.length,'New noun count mismatch');
 if(p){assert.equal(p.revision,REVISION);assert.deepEqual(p.created_ids,added.map(e=>e.id));}
 for(const e of added){assert.equal(e.id,nounId(e.lemma));assert.equal(e.part_of_speech,'noun');assert.equal(e.editorial?.source,REVISION);}
 for(const e of db.entries)for(const s of e.illustrations?.senses||[])for(const v of s.variants||[])if(v.source===REVISION){
  assert.equal(s.id,e.id+'-modular-sense');assert.equal(s.word_id,e.id);assert.equal(v.id,'modular-image-'+hash(e.id+'\0'+v.src).slice(0,24));
  verifyAsset(v.src,v.sha256,publicDir,overlay);
 }
 return added.length;
}
function projectRegistry(db,registry){
 const out=structuredClone(registry),byId=new Map(out.senses.map(s=>[s.id,s]));
 for(const e of db.entries)for(const s of e.illustrations?.senses||[])if(s.variants?.some(v=>v.source===REVISION)){
  if(byId.has(s.id))assert.deepEqual(byId.get(s.id),s,'Existing registry sense differs');
  else{out.senses.push(structuredClone(s));byId.set(s.id,s);}
 }
 return out;
}
module.exports={validate,plan,nounId,verifyAsset,verifyImports,projectRegistry,assetRoot,srcPattern};
