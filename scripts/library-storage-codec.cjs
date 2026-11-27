'use strict';
// Canonical lossless library encoding: sharding, key order and immutable shared content.
const crypto=require('node:crypto'),assert=require('node:assert/strict');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const own=(x,k)=>Object.hasOwn(x,k);
const obj=xs=>Object.fromEntries(xs);
const bucket=(id,count=256)=>{assert([16,32,64,128,256].includes(count),'Unsupported shard count');return (parseInt(hash(id).slice(0,2),16)%count).toString(16).padStart(2,'0');};
const domains={
 phonetics:['phonetic_tags','phonetics'],
 morphology:['morphology','grammar','word_forms','forms','word_formation','derivation'],
 semantics:['semantic_review_proposals','semantic_tags','semantics','semantic_properties','semantic_roles','grammar_frames','speech_frames'],
 syllables:['syllable_structure','syllable_tags'],
 translations:['translations','multilingual','foreign_languages'],
 illustrations:['illustrations'],
 machine:['machine_analysis'],
 archive:['legacy_source'],
 shared:['__storage_shared_values']
};
const domain=new Map(Object.entries(domains).flatMap(([g,keys])=>keys.map(k=>[k,g])));
function ids(rows,label){
 assert(Array.isArray(rows),label+' must be an array');
 const m=new Map();
 for(const r of rows){assert(r&&typeof r.id==='string'&&r.id.length,label+' invalid ID');assert(!m.has(r.id),label+' duplicate ID '+r.id);m.set(r.id,r);}
 return m;
}
function compactRows(rows){return '[\n'+rows.map(r=>JSON.stringify(r)).join(',\n')+'\n]\n';}
function split(db,sourceSha,counts={}){
 const count=g=>counts[g]??256;
 for(const [g,n] of Object.entries(counts)){assert(/^(entries\/[a-z]+|relations)$/.test(g));bucket('probe',n);}
 ids(db.entries,'entries');ids(db.relations,'relations');
 const shards=new Map(),entryOrder=[],relationOrder=[];
 const add=(group,id,row)=>{
  const f=group+'/'+bucket(id,count(group))+'.json';
  if(!shards.has(f))shards.set(f,[]);
  shards.get(f).push(row);
 };
 for(const e of db.entries){
  const groups=new Map();
  for(const [key,value] of Object.entries(e)){
   if(key==='id')continue;
   const g=domain.get(key)||'core';
   if(!groups.has(g))groups.set(g,[]);
   groups.get(g).push([key,value]);
  }
  // Preserve explicit null, missing fields, arbitrary unknown fields, and key order.
  entryOrder.push({id:e.id,keys:Object.keys(e)});
  for(const [g,fields] of groups)add('entries/'+g,e.id,{id:e.id,fields:obj(fields)});
 }
 for(const r of db.relations){relationOrder.push(r.id);add('relations',r.id,r);}
 const files=new Map();
 files.set('metadata.json',JSON.stringify(obj(Object.entries(db).filter(([k])=>!['entries','relations','categories'].includes(k))),null,2)+'\n');
 files.set('categories.json',compactRows(db.categories));
 files.set('entry-order.json',compactRows(entryOrder));
 files.set('relation-order.json',compactRows(relationOrder));
 for(const [file,rows] of [...shards].sort((a,b)=>a[0].localeCompare(b[0])))files.set(file,compactRows(rows));
 const manifest={version:1,shard_counts:counts,source_sha256:sourceSha,top_keys:Object.keys(db),entries:db.entries.length,relations:db.relations.length,categories:db.categories.length,files:obj([...files].map(([f,s])=>[f,{sha256:hash(s),bytes:Buffer.byteLength(s)}]))};
 return {manifest,files};
}
function restore(manifest,read){
 assert.equal(manifest.version,1);
 const data=new Map(),count=g=>manifest.shard_counts?.[g]??256;
 for(const [f,info] of Object.entries(manifest.files)){
  assert(/^(metadata|categories|entry-order|relation-order)\.json$|^(entries\/[a-z]+|relations)\/[a-f0-9]{2}\.json$/.test(f),'Invalid shard path '+f);
  const content=read(f);assert.equal(hash(content),info.sha256,'Corrupt shard '+f);assert.equal(Buffer.byteLength(content),info.bytes,'Shard size mismatch '+f);
  data.set(f,JSON.parse(content));
 }
 for(const f of ['metadata.json','categories.json','entry-order.json','relation-order.json'])assert(data.has(f),'Missing '+f);
 const order=ids(data.get('entry-order.json'),'entry order');
 const fields=new Map([...order.keys()].map(id=>[id,new Map([['id',id]])]));
 const relations=new Map();
 for(const [f,rows] of data){
  if(f.startsWith('entries/')){
   const g=f.split('/')[1];
   for(const r of rows){assert(fields.has(r.id),'Unknown entry '+r.id);assert.equal(f,'entries/'+g+'/'+bucket(r.id,count('entries/'+g))+'.json','Wrong shard '+r.id);const row=fields.get(r.id);
    for(const [k,v] of Object.entries(r.fields)){assert.equal(domain.get(k)||'core',g,'Wrong field group '+k);assert(!row.has(k),'Duplicate field '+r.id+' '+k);row.set(k,v);}
   }
  }else if(f.startsWith('relations/')){
   for(const r of rows){assert.equal(f,'relations/'+bucket(r.id,count('relations'))+'.json','Wrong relation shard');assert(!relations.has(r.id),'Duplicate relation '+r.id);relations.set(r.id,r);}
  }
 }
 const entries=[...order.values()].map(({id,keys})=>{
  const m=fields.get(id);assert.equal(new Set(keys).size,keys.length,'Duplicate order key');assert.equal(keys.length,m.size,'Entry field count differs '+id);
  return obj(keys.map(k=>{assert(m.has(k),'Missing field '+id+' '+k);return [k,m.get(k)];}));
 });
 const rOrder=data.get('relation-order.json');assert.equal(new Set(rOrder).size,rOrder.length);assert.equal(rOrder.length,relations.size);
 const rels=rOrder.map(id=>{assert(relations.has(id),'Missing relation '+id);return relations.get(id);});
 const top=new Map(Object.entries(data.get('metadata.json')));
 for(const [k,v] of [['entries',entries],['relations',rels],['categories',data.get('categories.json')]]){assert(!top.has(k),'Duplicate top key '+k);top.set(k,v);}
 assert.equal(new Set(manifest.top_keys).size,manifest.top_keys.length);assert.equal(manifest.top_keys.length,top.size);
 assert.equal(entries.length,manifest.entries);assert.equal(rels.length,manifest.relations);assert.equal(top.get('categories').length,manifest.categories);
 return obj(manifest.top_keys.map(k=>{assert(top.has(k),'Missing top key '+k);return [k,top.get(k)];}));
}
const reserved='__storage_shared_values',marker='__storage_ref';
const pairs=[['speech','phonetic_tags'],['grammar','morphology']];
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function pack(db){
 const out=structuredClone(db);
 let pairsShared=0,bytesShared=0;
 for(const e of out.entries){
  assert(!own(e,reserved),'Reserved field in source '+e.id);
  const raw=e.legacy_source?.raw,shared={};
  for(const [oldKey,newKey] of pairs){
   const active=e[newKey];
   if(!raw||!active||!own(raw,oldKey)||!own(active,'data'))continue;
   const a=raw[oldKey],b=active.data;
   if(!same(a,b))continue; // includes key order; do not collapse similar but different values
   const serialized=JSON.stringify(a),digest=hash(serialized);
   if(own(shared,digest))assert(same(shared[digest],a));
   else shared[digest]=a;
   raw[oldKey]={[marker]:digest};active.data={[marker]:digest};
   pairsShared++;bytesShared+=Buffer.byteLength(serialized);
  }
  if(Object.keys(shared).length)e[reserved]=shared;
 }
 return {db:out,pairsShared,bytesShared};
}
function unpack(db){
 const out=structuredClone(db);
 for(const e of out.entries){
  if(!own(e,reserved))continue;
  const pool=e[reserved],used=new Set();
  assert(pool&&typeof pool==='object'&&!Array.isArray(pool),'Invalid shared pool '+e.id);
  for(const [oldKey,newKey] of pairs){
   const raw=e.legacy_source?.raw,active=e[newKey];
   if(!raw||!active)continue;
   for(const [holder,key] of [[raw,oldKey],[active,'data']]){
    const v=holder[key];
    if(!v||typeof v!=='object'||!own(v,marker))continue;
    const digest=v[marker];
    assert.equal(Object.keys(v).length,1,'Malformed reference '+e.id);
    assert(typeof digest==='string'&&/^[a-f0-9]{64}$/.test(digest)&&own(pool,digest),'Missing content '+e.id);
    assert.equal(hash(JSON.stringify(pool[digest])),digest,'Shared content hash mismatch '+e.id);
    holder[key]=structuredClone(pool[digest]);used.add(digest);
   }
  }
  assert.equal(used.size,Object.keys(pool).length,'Unused content '+e.id);
  delete e[reserved];
 }
 return out;
}
module.exports={split,restore,bucket,pack,unpack};
