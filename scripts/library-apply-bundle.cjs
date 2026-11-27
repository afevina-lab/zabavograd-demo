#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {load,build,snapshot}=require('./library-store.cjs');
const {prepare}=require('./library-modular-request.cjs');
const {stageVerified}=require('./library-analysis-writer.cjs');
const hash=/^[a-f0-9]{64}$/;
const safePath=/^(metadata|categories|entry-order|relation-order)\.json$|^(entries\/[a-z]+|relations)\/[a-f0-9]{2}\.json$/;
function readRegular(root,rel,max){
 const pieces=rel.split('/');
 let target=root;
 for(const [i,p] of pieces.entries()){
  assert(p&&p!=='.'&&p!=='..','Unsafe bundle path');
  target=path.join(target,p);
  const s=fs.lstatSync(target);
  assert(i===pieces.length-1?s.isFile():s.isDirectory(),'Nonregular bundle path '+rel);
 }
 const s=fs.statSync(target);assert(s.size<=max,'Oversized bundle file '+rel);
 return fs.readFileSync(target);
}
function inventory(dir){
 assert(fs.lstatSync(dir).isDirectory(),'Bundle must be a real directory');
 const files=[],dirs=[];
 function walk(d,prefix=''){
  for(const e of fs.readdirSync(d,{withFileTypes:true})){
   const rel=prefix+e.name;
   if(e.isDirectory()){dirs.push(rel);walk(path.join(d,e.name),rel+'/');}
   else {assert(e.isFile(),'Nonregular bundle file '+rel);files.push(rel);}
  }
 }
 walk(dir);return {files:files.sort(),dirs:dirs.sort()};
}
function expectedDirs(files){
 const out=new Set();
 for(const f of files){const a=f.split('/');a.pop();while(a.length){out.add(a.join('/'));a.pop();}}
 return [...out].sort();
}
function verifyBundle(current,bundle,expectedPreview){
 assert(typeof expectedPreview==='string'&&hash.test(expectedPreview),'Independent preview fingerprint required');
 assert(fs.lstatSync(bundle).isDirectory(),'Bundle must be a real directory');
 const report=JSON.parse(readRegular(bundle,'result.json',100*1024));
 assert(report.mode==='candidate'&&report.status==='validated_candidate_not_approved','Only validated candidate bundles accepted');
 assert.equal(report.source_sha256,current.source_sha256,'Stale source; regenerate preview');
 assert.equal(report.preview_sha256,expectedPreview,'Bundle preview differs from approved preview');
 const req={version:report.version,mode:'candidate',source_sha256:report.source_sha256,preview_sha256:expectedPreview,operations:report.operations};
 for(const k of ['semantic_operations','review_decisions','import_operations'])if(Object.hasOwn(report,k))req[k]=report[k];
 // Replay known domain operations, rather than trusting a self-consistent edited manifest.
 const p=prepare(current,req);
 assert(p.planned.changes.length>0,'Empty candidate');
 for(const [k,v] of Object.entries(p.preview))assert.deepEqual(report[k],v,'Report differs from replay: '+k);
 const expected=build(p.planned.db);
 assert.deepEqual(expected.manifest,p.newManifest,'Replay manifest differs');
 const d=p.preview.delta,changed=[...d.added,...d.modified];
 for(const rel of [...changed,...d.removed])assert(safePath.test(rel),'Unsafe module path');
 assert.deepEqual(report.bundle,{manifest:'delta/manifest.json',changed_files:changed,removed_files:d.removed},'Bundle file list differs from replay');
 const names=['result.json','delta/manifest.json',...changed.map(f=>'delta/'+f)].sort();
 assert.deepEqual(inventory(bundle),{files:names,dirs:expectedDirs(names)},'Missing or extra bundle paths');
 const manifest=JSON.parse(readRegular(bundle,'delta/manifest.json',1024*1024));
 assert.deepEqual(manifest,expected.manifest,'Bundle manifest differs from replay');
 for(const rel of changed){
  const text=expected.files.get(rel);assert(typeof text==='string','Unknown changed module');
  const actual=readRegular(bundle,'delta/'+rel,Buffer.byteLength(text));
  assert(actual.equals(Buffer.from(text)),'Bundle module bytes differ from replay: '+rel);
 }
 return {report,planned:p.planned,manifest:expected.manifest,delta:d};
}
function outside(parent,target){
 const rel=path.relative(parent,target);
 return rel!==''&&(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel));
}
function apply(source,bundle,dest,expectedPreview){
 const src=fs.realpathSync(source),input=fs.realpathSync(bundle);
 assert(fs.lstatSync(source).isDirectory()&&fs.lstatSync(bundle).isDirectory(),'Source and bundle must be real directories');
 assert(!fs.existsSync(dest),'Destination exists');
 const parent=fs.realpathSync(path.dirname(path.resolve(dest))),target=path.join(parent,path.basename(dest));
 assert(outside(src,target)&&outside(input,target),'Destination must be outside source and bundle');
 const current=load(src),p=verifyBundle(current,input,expectedPreview);
 const tmp=fs.mkdtempSync(path.join(parent,'.library-apply-'));
 try{
  const next=path.join(tmp,'generation');
  const result=stageVerified(current,p.planned.db,next,{changed:p.planned.changes.length});
  const restored=load(next);
  assert.equal(restored.source_sha256,p.report.result_source_sha256,'Reconstructed source differs');
  assert.equal(snapshot(restored.db),snapshot(p.planned.db),'Reconstructed values differ');
  assert.deepEqual(restored.manifest,p.manifest,'Reconstructed manifest differs');
  assert.equal(load(src).source_sha256,current.source_sha256,'Source changed during validation');
  assert(!fs.existsSync(target),'Destination exists');
  fs.renameSync(next,target);
  return {...result,status:'staged_generation_validated_not_activated',preview_sha256:expectedPreview,destination:target};
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
module.exports={verifyBundle,apply,readRegular,inventory,expectedDirs};
if(require.main===module)try{
 const [source,bundle,dest,expected,...extra]=process.argv.slice(2);
 assert(source&&bundle&&dest&&expected&&!extra.length,'Usage: library-apply-bundle.cjs SOURCE_DIR BUNDLE_DIR NEW_DIR EXPECTED_PREVIEW_SHA256');
 console.log(JSON.stringify(apply(source,bundle,dest,expected),null,2));
}catch(e){console.error(e.stack);process.exitCode=1;}
