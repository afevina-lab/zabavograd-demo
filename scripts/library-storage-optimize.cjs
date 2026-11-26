#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {split,restore,verifyRuntime}=require('./library-storage-audit.cjs');
const ROOT=path.resolve(__dirname,'..'),MASTER=path.join(ROOT,'outputs/library-v2.json');
const H=v=>crypto.createHash('sha256').update(v).digest('hex');
const own=(o,k)=>Object.hasOwn(o,k);
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
   const serialized=JSON.stringify(a),digest=H(serialized);
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
    assert.equal(H(JSON.stringify(pool[digest])),digest,'Shared content hash mismatch '+e.id);
    holder[key]=structuredClone(pool[digest]);used.add(digest);
   }
  }
  assert.equal(used.size,Object.keys(pool).length,'Unused content '+e.id);
  delete e[reserved];
 }
 return out;
}
function stats(x){
 const manifest=JSON.stringify(x.manifest,null,2)+'\n';
 const groups={};
 for(const [f,s] of x.files){const g=f.includes('/')?f.slice(0,f.lastIndexOf('/')):'metadata';const r=groups[g]??={files:0,bytes:0,max_bytes:0};const b=Buffer.byteLength(s);r.files++;r.bytes+=b;r.max_bytes=Math.max(r.max_bytes,b);}
 const sizes=[...x.files.values()].map(s=>Buffer.byteLength(s));
 return {files:x.files.size+1,total_bytes:sizes.reduce((a,b)=>a+b,Buffer.byteLength(manifest)),max_data_file_bytes:Math.max(...sizes),manifest_bytes:Buffer.byteLength(manifest),groups};
}
const groups=['core','phonetics','morphology','semantics','syllables','translations','illustrations','machine','archive','shared'];
const uniform=n=>Object.fromEntries([...groups.map(g=>['entries/'+g,n]),['relations',n]]);
const mixed={...uniform(32),'entries/morphology':64,'entries/archive':32,'entries/shared':64,'entries/core':64};
function experiment(db,raw){
 const packed=pack(db),sha=H(raw);
 const configs=[['original-256',{},false],['uniform-16',uniform(16),false],['uniform-32',uniform(32),false],['uniform-64',uniform(64),false],['mixed',mixed,false],['mixed-shared',mixed,true],['uniform-32-shared',uniform(32),true]];
 const results={},layouts=new Map();
 for(const [name,counts,dedup] of configs){
  const x=split(dedup?packed.db:db,sha,counts);
  let restored=restore(x.manifest,f=>x.files.get(f));
  if(dedup)restored=unpack(restored);
  assert.deepStrictEqual(restored,db,name+' values');
  assert.equal(JSON.stringify(restored),JSON.stringify(db),name+' order');
  results[name]={...stats(x),deduplicated:dedup};layouts.set(name,x);
 }
 // Choose by bounded *editable* shard size, not global ordering metadata.
 // The manifest and entry-order are generated metadata, read by program only.
 const fits=r=>Object.entries(r.groups).every(([g,s])=>g==='metadata'||s.max_bytes<=128*1024);
 const choices=Object.entries(results).filter(([k,r])=>r.deduplicated&&fits(r)).sort((a,b)=>a[1].files-b[1].files||a[1].total_bytes-b[1].total_bytes);
 const selected=choices[0]?.[0]??null;
 return {results,layouts,selected,shared:{pairs:packed.pairsShared,duplicated_value_bytes:packed.bytesShared}};
}
function main(){
 const [dest,...extra]=process.argv.slice(2);if(!dest||extra.length)throw Error('Usage: library-storage-optimize.cjs NEW_OUTPUT_DIR');
 const output=path.resolve(dest);assert(!fs.existsSync(output),'Output exists');
 const raw=fs.readFileSync(MASTER),db=JSON.parse(raw),x=experiment(db,raw);
 fs.mkdirSync(output,{recursive:true});
 const report={source_sha256:H(raw),entries:db.entries.length,shared:x.shared,selected:x.selected,results:x.results};
 if(x.selected){
  const layout=x.layouts.get(x.selected),dir=path.join(output,'layout');
  for(const [f,s] of layout.files){const p=path.join(dir,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);}
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({...layout.manifest,encoding:'immutable-shared-values-v1'},null,2)+'\n');
  const rebuilt=unpack(restore(JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'))),f=>fs.readFileSync(path.join(dir,f),'utf8')));
  assert.deepStrictEqual(rebuilt,db);assert.equal(JSON.stringify(rebuilt),JSON.stringify(db));
  if(process.env.GITHUB_ACTIONS==='true')report.runtime_sha256=verifyRuntime(rebuilt,raw);
 }
 fs.writeFileSync(path.join(output,'optimization.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({entries:report.entries,shared:x.shared,selected:x.selected,layouts:Object.fromEntries(Object.entries(x.results).map(([k,r])=>[k,{files:r.files,total_bytes:r.total_bytes,max_editable_shard_bytes:Math.max(...Object.entries(r.groups).filter(([g])=>g!=='metadata').map(([,s])=>s.max_bytes)),max_data_file_bytes:r.max_data_file_bytes,manifest_bytes:r.manifest_bytes}])),runtime_sha256:report.runtime_sha256},null,2));
}
module.exports={pack,unpack,experiment};
if(require.main===module)try{main();}catch(e){console.error(e.stack);process.exitCode=1;}
