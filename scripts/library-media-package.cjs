#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {load}=require('./library-store.cjs');
const {prepare,validate}=require('./library-modular-request.cjs');
const {stageVerified}=require('./library-analysis-writer.cjs');
const importer=require('./library-import.cjs');
const ROOT=path.resolve(__dirname,'..'),PUBLIC=path.join(ROOT,'public'),REGISTRY=path.join(ROOT,'outputs/image-library.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const json=x=>JSON.stringify(x,null,2)+'\n';
function read(file,max){
 const s=fs.lstatSync(file);assert(s.isFile()&&s.size<=max,'Nonregular or oversized input '+file);
 return fs.readFileSync(file);
}
function outside(parent,target){const rel=path.relative(parent,target);return rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel);}
function stageAssets(ops,input,media,registry){
 assert(fs.lstatSync(input).isDirectory(),'Input must be a real directory');
 const links=ops.filter(o=>o.type==='link_webp'),wanted=new Map(links.map(o=>[path.basename(o.src),o]));
 assert(wanted.size===links.length&&wanted.size>0,'Expected distinct image links');
 const names=fs.readdirSync(input).sort();
 assert.deepEqual(names,[...wanted.keys()].sort(),'Missing or unexpected input WebP files');
 const known=registry.senses.flatMap(s=>s.variants||[]);
 const hashes=new Set(known.map(v=>v.sha256).filter(Boolean)),paths=new Set(known.map(v=>v.src));
 const dest=path.join(media,'public/assets/words');fs.mkdirSync(dest,{recursive:true});
 const rows=[];let total=0;
 for(const name of names){
  const o=wanted.get(name);assert(importer.srcPattern.test(o.src),'Unsafe asset path');
  assert(!fs.existsSync(path.join(PUBLIC,o.src))&&!paths.has(o.src),'Asset path already exists');
  const raw=read(path.join(input,name),2*1024*1024);
  assert.equal(sha(raw),o.sha256,'Asset SHA differs');assert(!hashes.has(o.sha256),'Duplicate image digest');
  total+=raw.length;assert(total<=24*1024*1024,'Media packet exceeds 24 MiB');
  hashes.add(o.sha256);paths.add(o.src);
  const target=path.join(dest,name);fs.writeFileSync(target,raw,{flag:'wx'});
  importer.verifyAsset(o.src,o.sha256,path.join(media,'public'));
  rows.push({src:o.src,sha256:o.sha256,bytes:raw.length});
 }
 // Full pixel decode, limits and meaningful transparent/visible areas;
 // human visual approval remains a separate explicit request field.
 const py=spawnSync('python3',['-c',[
  'import sys,json',
  'from PIL import Image',
  'Image.MAX_IMAGE_PIXELS=4194304',
  'out=[]',
  'for f in sys.argv[1:]:',
  ' with Image.open(f) as im:',
  '  if im.format!="WEBP" or im.n_frames!=1: raise ValueError("Expected static WebP")',
  '  if not (1<=im.width<=2048 and 1<=im.height<=2048): raise ValueError("Image dimensions out of range")',
  '  im.load()',
  '  a=im.convert("RGBA").getchannel("A")',
  '  lo,hi=a.getextrema()',
  '  if lo!=0 or hi==0: raise ValueError("Transparent background and visible content required")',
  '  out.append({"width":im.width,"height":im.height})',
  'print(json.dumps(out))'
 ].join('\n'),...names.map(n=>path.join(dest,n))],{encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
 assert(!py.error&&py.status===0,'WebP decode/alpha check failed: '+String(py.error||py.stderr));
 const sizes=JSON.parse(py.stdout);return rows.map((r,i)=>({...r,...sizes[i]}));
}
function run(source,request,input,output,expectedMediaPreview){
 const src=fs.realpathSync(source),inp=fs.realpathSync(input),parent=fs.realpathSync(path.dirname(path.resolve(output))),target=path.join(parent,path.basename(output));
 assert(outside(src,target)&&outside(inp,target)&&outside(ROOT,target),'Package output must be outside source, inputs and repository');
 assert(!fs.existsSync(target),'Output exists');
 const raw=read(request,64*1024),r=validate(JSON.parse(raw));
 assert(r.import_operations?.length&&!r.operations.length&&!r.semantic_operations?.length&&!r.review_decisions?.length,'Separate media import request required');
 assert(r.mode==='preview'?!expectedMediaPreview:/^[a-f0-9]{64}$/.test(expectedMediaPreview||''),'Candidate requires independently reviewed media preview');
 const current=load(src),registryRaw=read(REGISTRY,8*1024*1024),registry=JSON.parse(registryRaw);
 const tmp=fs.mkdtempSync(path.join(parent,'.media-stage-'));
 try{
  const media=path.join(tmp,'media');fs.mkdirSync(media);
  const assets=stageAssets(r.import_operations,inp,media,registry);
  const p=prepare(current,r,{assetDir:path.join(media,'public')});
  const projected=importer.projectRegistry(p.planned.db,registry),registryText=json(projected);
  const preview={version:1,library_preview_sha256:p.preview_sha256,source_sha256:current.source_sha256,result_source_sha256:p.preview.result_source_sha256,registry_source_sha256:sha(registryRaw),registry_result_sha256:sha(registryText),assets,changes:p.preview.changes,delta:p.preview.delta,import_operations:r.import_operations};
  const media_preview_sha256=sha(JSON.stringify(preview));
  const report={...preview,media_preview_sha256,status:'media_preview_not_validated_or_approved'};
  const publish=path.join(tmp,'publish');fs.mkdirSync(publish);
  if(r.mode==='candidate'){
   assert.equal(expectedMediaPreview,media_preview_sha256,'Media preview differs; inspect again');
   fs.writeFileSync(path.join(media,'image-library.json'),registryText,{flag:'wx'});
   const generation=path.join(tmp,'generation');
   const result=stageVerified(current,p.planned.db,generation,{changed:p.planned.changes.length},{mediaDir:media});
   assert.equal(result.result_source_sha256,preview.result_source_sha256);
   const dir=path.join(publish,'delta');fs.mkdirSync(dir);
   fs.copyFileSync(path.join(generation,'manifest.json'),path.join(dir,'manifest.json'));
   for(const f of [...preview.delta.added,...preview.delta.modified]){const to=path.join(dir,f);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(generation,f),to);}
   fs.renameSync(media,path.join(publish,'media'));
   report.status='validated_media_candidate_not_approved';
   report.bundle={manifest:'delta/manifest.json',changed_files:[...preview.delta.added,...preview.delta.modified],removed_files:preview.delta.removed,registry:'media/image-library.json',assets:assets.map(a=>'media/public'+a.src)};
  }
  assert.equal(load(src).source_sha256,current.source_sha256,'Source changed');
  assert.equal(sha(read(REGISTRY,8*1024*1024)),preview.registry_source_sha256,'Image registry changed');
  assert(!fs.existsSync(target),'Output exists');
  fs.writeFileSync(path.join(publish,'result.json'),json(report),{flag:'wx'});
  fs.renameSync(publish,target);return report;
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
module.exports={run,stageAssets};
if(require.main===module)try{
 const [source,request,input,output,pin,...extra]=process.argv.slice(2);
 assert(source&&request&&input&&output&&!extra.length,'Usage: library-media-package.cjs SOURCE REQUEST INPUT_WEBP_DIR NEW_OUTPUT_DIR [MEDIA_PREVIEW_SHA256]');
 const r=run(source,request,input,output,pin);
 console.log(JSON.stringify({status:r.status,media_preview_sha256:r.media_preview_sha256,library_preview_sha256:r.library_preview_sha256,assets:r.assets},null,2));
}catch(e){console.error(e.stack);process.exitCode=1;}
