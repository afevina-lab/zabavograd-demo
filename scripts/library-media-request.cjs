#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {validate}=require('./library-modular-request.cjs');
const {run}=require('./library-media-package.cjs');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const PREFIX='editorial/requests/';
const file=PREFIX+'library-media.json',media=PREFIX+'media/';
function envelope(raw){
 assert(Buffer.isBuffer(raw)&&raw.length<=64*1024,'Media envelope exceeds 64 KiB');
 const r=JSON.parse(raw);
 assert(r&&typeof r==='object'&&!Array.isArray(r)&&r.version===1,'Expected media request v1');
 assert.deepEqual(Object.keys(r).sort(),(r.request?.mode==='candidate'?['media_preview_sha256','request','version']:['request','version']).sort(),'Unexpected media envelope fields');
 validate(r.request);
 assert(r.request.import_operations?.length&&!r.request.operations.length&&!r.request.semantic_operations?.length&&!r.request.review_decisions?.length,'Expected separate import operations');
 if(r.request.mode==='candidate')assert(typeof r.media_preview_sha256==='string'&&/^[a-f0-9]{64}$/.test(r.media_preview_sha256),'Media preview pin required');
 const names=r.request.import_operations.filter(o=>o.type==='link_webp').map(o=>media+path.basename(o.src));
 assert(names.length>0&&new Set(names).size===names.length,'Expected unique WebP files');
 return {r,names:[file,...names].sort()};
}
function parseTree(raw){
 const records=raw.toString('utf8').split('\0').filter(Boolean);
 return records.map(row=>{
  const m=/^100644 blob ([a-f0-9]{40}) +([0-9]+)\t([a-zA-Z0-9_./-]+)$/.exec(row);
  assert(m,'Unexpected Git file type or path');
  const size=Number(m[2]);assert(Number.isSafeInteger(size)&&size>=0,'Invalid blob size');
  return {sha:m[1],size,path:m[3]};
 });
}
function extract(commit,dir,git=(args,max)=>execFileSync('git',args,{maxBuffer:max,timeout:30000})){
 assert(typeof commit==='string'&&/^[a-f0-9]{40}$/.test(commit),'Exact request commit required');
 const rows=parseTree(git(['ls-tree','-r','-l','-z',commit,'--',file,media],64*1024));
 const entry=rows.find(x=>x.path===file);assert(entry&&entry.size<=64*1024,'Missing or oversized media envelope');
 function blob(row,limit){assert(row.size<=limit,'Blob exceeds limit');const raw=git(['cat-file','blob',row.sha],limit+1);assert(raw.length===row.size,'Blob size mismatch');return raw;}
 const raw=blob(entry,64*1024),{r,names}=envelope(raw);
 assert.deepEqual(rows.map(x=>x.path).sort(),names,'Missing or unexpected request files');
 let total=0;const imageDir=path.join(dir,'images');fs.mkdirSync(imageDir);
 for(const row of rows.filter(x=>x.path!==file)){
  const b=blob(row,2*1024*1024);total+=b.length;assert(total<=24*1024*1024,'Media packet exceeds 24 MiB');
  const op=r.request.import_operations.find(o=>o.type==='link_webp'&&media+path.basename(o.src)===row.path);
  assert.equal(sha(b),op.sha256,'Request image hash differs');
  fs.writeFileSync(path.join(imageDir,path.basename(row.path)),b,{flag:'wx'});
 }
 const request=path.join(dir,'request.json');fs.writeFileSync(request,JSON.stringify(r.request,null,2)+'\n',{flag:'wx'});
 return {request,imageDir,pin:r.media_preview_sha256,request_sha256:sha(raw)};
}
function execute(source,commit,output){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'media-request-'));
 try{
  const e=extract(commit,dir),report=run(source,e.request,e.imageDir,output,e.pin);
  return {...report,request_sha256:e.request_sha256};
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
module.exports={envelope,parseTree,extract,execute};
if(require.main===module)try{
 const [source,commit,output,...extra]=process.argv.slice(2);
 assert(source&&commit&&output&&!extra.length,'Usage: library-media-request.cjs SOURCE_MODULES REQUEST_COMMIT NEW_OUTPUT');
 const report=execute(source,commit,output);
 fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,media_preview_sha256:report.media_preview_sha256,library_preview_sha256:report.library_preview_sha256,assets:report.assets},null,2));
}catch(e){console.error(e.stack);process.exitCode=1;}
