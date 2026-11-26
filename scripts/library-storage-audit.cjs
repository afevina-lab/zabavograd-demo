#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const MASTER=path.join(ROOT,'outputs/library-v2.json');
const DRAFT=path.join(ROOT,'outputs/library-v2-auto-analysis.json');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const bytes=x=>Buffer.byteLength(JSON.stringify(x));
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
function audit(db,draft,sourceBytes){
 const field=new Map(),archive={entries:0,raw_entries:0,value_bytes:0},overlap={};
 const check=(name,a,b)=>{if(a===undefined||b===undefined)return;const c=overlap[name]??={compared:0,equal:0,equal_value_bytes:0,different:0};c.compared++;try{assert.deepStrictEqual(a,b);c.equal++;c.equal_value_bytes+=bytes(b);}catch{c.different++;}};
 const draftMap=ids(draft.entries||[],'draft');
 for(const e of db.entries){
  for(const [k,v] of Object.entries(e)){if(!field.has(k))field.set(k,{entries:0,value_bytes:0,group:domain.get(k)||'core'});const s=field.get(k);s.entries++;s.value_bytes+=bytes(v);}
  if(e.legacy_source!==undefined&&e.legacy_source!==null){archive.entries++;archive.value_bytes+=bytes(e.legacy_source);if(e.legacy_source.raw!==undefined)archive.raw_entries++;}
  const legacy=e.legacy_source?.raw;
  check('legacy.speech vs phonetic_tags.data',legacy?.speech,e.phonetic_tags?.data);
  check('legacy.grammar vs morphology.data',legacy?.grammar,e.morphology?.data);
  const d=draftMap.get(e.id);
  if(d?.lemma!==e.lemma)continue;
  check('draft.phonetic.sound_tokens vs stored editor tokens',d.phonetic?.sound_tokens,e.phonetic_tags?.data?.sound_tokens);
  check('draft.phonetic.sound_tokens vs stored machine tokens',d.phonetic?.sound_tokens,e.machine_analysis?.phonetic?.sound_tokens);
  check('draft.morphology.forms vs stored machine forms',d.morphology?.forms,e.machine_analysis?.morphology?.forms);
 }
 return {source_bytes:sourceBytes,entries:db.entries.length,relations:db.relations.length,categories:db.categories.length,archive,overlap,fields:obj([...field].sort((a,b)=>b[1].value_bytes-a[1].value_bytes)),notes:['Exact value overlap is diagnostic only, not a deletion candidate.','Value bytes exclude keys, indentation and enclosing arrays.','Unknown fields remain in core.','No semantic equivalence inferred.']};
}
function verifyRuntime(db,original){
 const files=['public/library.json','public/semantic-graph.json','public/grammar-frames.json'];
 const saved=new Map(files.map(f=>{const p=path.join(ROOT,f);return [p,fs.existsSync(p)?fs.readFileSync(p):null];}));
 const exec=()=>{const p=spawnSync(process.execPath,[path.join(ROOT,'scripts/export-library.cjs')],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});if(p.error||p.status!==0)throw Error('Runtime export failed '+(p.error||p.stderr||p.stdout));return obj(files.map(f=>[f,hash(fs.readFileSync(path.join(ROOT,f)))]));};
 try{
  const before=exec();
  fs.writeFileSync(MASTER,JSON.stringify(db,null,2)+'\n');
  const after=exec();assert.deepStrictEqual(after,before,'Runtime output changed');
  return before;
 }finally{
  fs.writeFileSync(MASTER,original);
  for(const [p,raw] of saved)if(raw===null){if(fs.existsSync(p))fs.unlinkSync(p);}else fs.writeFileSync(p,raw);
 }
}
function main(){
 const [dest,flag,...extra]=process.argv.slice(2);
 if(!dest||extra.length||(flag&&flag!=='--verify-runtime'))throw Error('Usage: node scripts/library-storage-audit.cjs NEW_OUTPUT_DIR [--verify-runtime]');
 // Runtime verification temporarily writes source in a disposable checkout only.
 if(flag&&process.env.GITHUB_ACTIONS!=='true')throw Error('--verify-runtime only in disposable Actions checkout');
 const output=path.resolve(dest);assert(!fs.existsSync(output),'Output directory must not exist');
 const raw=fs.readFileSync(MASTER),db=JSON.parse(raw),draft=JSON.parse(fs.readFileSync(DRAFT));
 const {manifest,files}=split(db,hash(raw));
 fs.mkdirSync(output,{recursive:true});
 const layout=path.join(output,'layout');
 for(const [f,s] of files){const p=path.join(layout,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);}
 fs.writeFileSync(path.join(layout,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 const restored=restore(JSON.parse(fs.readFileSync(path.join(layout,'manifest.json'))),f=>fs.readFileSync(path.join(layout,f)));
 assert.deepStrictEqual(restored,db);assert.equal(JSON.stringify(restored),JSON.stringify(db),'Key/array order changed');
 const report=audit(db,draft,raw.length);
 report.source_sha256=hash(raw);
 report.layout={files:files.size+1,total_bytes:[...files.values()].reduce((n,s)=>n+Buffer.byteLength(s),0)+fs.statSync(path.join(layout,'manifest.json')).size,max_file_bytes:Math.max(...[...files.values()].map(s=>Buffer.byteLength(s)),fs.statSync(path.join(layout,'manifest.json')).size),roundtrip:'exact JSON values and key/array order'};
 if(flag)report.runtime_sha256=verifyRuntime(restored,raw);
 fs.writeFileSync(path.join(output,'audit.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({entries:report.entries,relations:report.relations,categories:report.categories,source_bytes:report.source_bytes,archive:report.archive,overlap:report.overlap,largest_fields:Object.entries(report.fields).slice(0,10),layout:report.layout,runtime_sha256:report.runtime_sha256},null,2));
}
module.exports={split,restore,audit,bucket,verifyRuntime};
if(require.main===module)try{main();}catch(e){console.error(e.stack);process.exitCode=1;}
