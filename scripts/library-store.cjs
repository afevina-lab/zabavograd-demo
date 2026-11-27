#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {split,restore,pack,unpack}=require('./library-storage-codec.cjs');
const {patches}=require('./library-toolkit.cjs');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const snapshot=db=>JSON.stringify(db,null,2)+'\n';
const fingerprint=db=>sha(snapshot(db));
const groups=['core','phonetics','morphology','semantics','syllables','translations','illustrations','machine','archive','shared'];
const counts=Object.freeze(Object.fromEntries([...groups.map(g=>['entries/'+g,32]),['relations',32]]));
const ENCODING='immutable-shared-values-v1';
function build(db){
 const packed=pack(db),base=split(packed.db,fingerprint(db),counts);
 const manifest={...base.manifest,encoding:ENCODING};
 const restored=unpack(restore(manifest,f=>base.files.get(f)));
 assert.equal(snapshot(restored),snapshot(db),'Lossy modular encoding');
 return {...base,manifest};
}
function filesIn(dir){
 const walk=(d,p='')=>fs.readdirSync(d,{withFileTypes:true}).flatMap(x=>{
  const f=p+x.name;
  if(x.isDirectory())return walk(path.join(d,x.name),f+'/');
  assert(x.isFile(),'Nonregular module '+f);return [f];
 });
 return walk(dir).sort();
}
function loadFiles(names,read){
 const m=JSON.parse(read('manifest.json'));
 assert.equal(m.encoding,ENCODING,'Unknown storage encoding');
 assert.deepEqual(m.shard_counts,counts,'Unknown shard layout');
 assert.deepEqual([...names].sort(),['manifest.json',...Object.keys(m.files)].sort(),'Missing or extra module files');
 const db=unpack(restore(m,read));
 assert.equal(fingerprint(db),m.source_sha256,'Logical library fingerprint mismatch');
 return {db,manifest:m,source_sha256:m.source_sha256};
}
function load(dir){return loadFiles(filesIn(dir),f=>fs.readFileSync(path.join(dir,f),'utf8'));}
function create(dir,db){
 assert(!fs.existsSync(dir),'Destination already exists');
 const built=build(db);
 // Construct and verify an independent generation; never overwrite active source.
 const tmp=fs.mkdtempSync(path.join(path.dirname(path.resolve(dir)),'.library-stage-'));
 try{
  for(const [f,s] of built.files){const target=path.join(tmp,f);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,s,{flag:'wx'});}
  fs.writeFileSync(path.join(tmp,'manifest.json'),JSON.stringify(built.manifest,null,2)+'\n',{flag:'wx'});
  assert.equal(snapshot(load(tmp).db),snapshot(db),'Staged source mismatch');
  assert(!fs.existsSync(dir),'Destination already exists');
  fs.renameSync(tmp,dir);
  return built.manifest;
 }finally{if(fs.existsSync(tmp))fs.rmSync(tmp,{recursive:true,force:true});}
}
function planPatch(current,packet){
 assert(packet&&packet.version===1&&packet.source_sha256===current.source_sha256,'Stale or missing logical fingerprint; query modules again');
 const r=patches(current.db,{version:1,operations:packet.operations});
 // Archive and IDs are independently checked as an invariant, not only protected paths.
 assert.deepEqual(r.db.entries.map(e=>[e.id,e.legacy_source]),current.db.entries.map(e=>[e.id,e.legacy_source]));
 assert.deepEqual(r.db.relations,current.db.relations);
 assert.deepEqual(r.db.categories,current.db.categories);
 return r;
}
function delta(a,b){
 const x=a.files,y=b.files;
 return {added:Object.keys(y).filter(k=>!Object.hasOwn(x,k)),removed:Object.keys(x).filter(k=>!Object.hasOwn(y,k)),modified:Object.keys(y).filter(k=>Object.hasOwn(x,k)&&x[k].sha256!==y[k].sha256)};
}
function main(){
 const [cmd,...a]=process.argv.slice(2);
 if(cmd==='init'&&a.length===2){
  const db=JSON.parse(fs.readFileSync(a[0],'utf8')),m=create(a[1],db);
  console.log(JSON.stringify({source_sha256:m.source_sha256,files:Object.keys(m.files).length+1,entries:m.entries}));
 }else if(cmd==='export'&&a.length===2){
  fs.writeFileSync(a[1],snapshot(load(a[0]).db),{flag:'wx'});
 }else if(cmd==='inspect'&&a.length===1){
  const m=load(a[0]);console.log(JSON.stringify({source_sha256:m.source_sha256,entries:m.manifest.entries,relations:m.manifest.relations,files:Object.keys(m.manifest.files).length+1}));
 }else if(cmd==='patch'&&a.length===3){
  const current=load(a[0]),r=planPatch(current,JSON.parse(fs.readFileSync(a[1],'utf8')));
  assert(r.changes.length,'No changes');
  // Schema/media integrity is checked before creating the candidate. Domain
  // acceptance and full validation remain an explicit separate gate.
  require('./validate-library-contract.cjs').validateLibrary(r.db);
  const m=create(a[2],r.db);
  console.log(JSON.stringify({changed:r.changes.length,source_sha256:m.source_sha256,delta:delta(current.manifest,m),status:'candidate_requires_full_validation'},null,2));
 }else throw Error('Usage: library-store.cjs init SOURCE NEW_DIR | export DIR NEW_JSON | inspect DIR | patch DIR PACKET NEW_DIR');
}
module.exports={build,create,load,loadFiles,planPatch,delta,fingerprint,snapshot};
if(require.main===module)try{main();}catch(e){console.error(e.stack);process.exitCode=1;}
