#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const SOURCE=path.join(ROOT,'outputs/library-v2.json');
const own=(x,k)=>Object.hasOwn(x,k);
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const QUERY=['find','inspect','select','gaps','inventory'];
function keys(o,allowed){
 if(!isObject(o))throw Error('Expected JSON object');
 for(const k of Object.keys(o))if(!allowed.includes(k))throw Error('Unexpected key: '+k);
}
function validate(r){
 keys(r,['version','mode','command','options','source_sha256','operations']);
 if(r.version!==1)throw Error('Request version 1 required');
 if(r.mode==='query'){
  if(!QUERY.includes(r.command)||own(r,'operations')||own(r,'source_sha256'))throw Error('Invalid query request');
  const o=r.options??{};
  keys(o,r.command==='inventory'?['fields']:['id','lemma','weight','category','field','equals','fields','limit','offset','full']);
  const args=[r.command];
  for(const [k,v] of Object.entries(o)){
   if(k==='full'){if(v!==true)throw Error('full must be true');args.push('--full');continue;}
   if(k==='fields'){if(!Array.isArray(v)||!v.length||v.length>12||v.some(s=>typeof s!=='string'||!s.startsWith('/')||s.includes(',')||s.length>256))throw Error('Invalid fields');args.push('--fields',v.join(','));continue;}
   if(k==='equals'){const s=JSON.stringify(v);if(s.length>4096)throw Error('equals too long');args.push('--equals',s);continue;}
   if(['weight','limit','offset'].includes(k)){if(!Number.isSafeInteger(v)||v<0||(k==='limit'&&(v<1||v>40))||(k==='offset'&&v>100000))throw Error('Invalid '+k);}
   else if(typeof v!=='string'||!v.length||v.length>512||v.startsWith('--'))throw Error('Invalid '+k);
   args.push('--'+k,String(v));
  }
  if(r.command!=='inventory'&&!own(o,'limit'))args.push('--limit','20');
  return {args};
 }
 if(!['preview','candidate'].includes(r.mode)||own(r,'command')||own(r,'options'))throw Error('Invalid mode');
 if(typeof r.source_sha256!=='string'||!/^[a-f0-9]{64}$/.test(r.source_sha256))throw Error('Exact source_sha256 from a fresh query is required');
 if(!Array.isArray(r.operations)||!r.operations.length||r.operations.length>30)throw Error('Remote patch requires 1..30 operations');
 for(const op of r.operations)keys(op,['id','path','expect','value']);
 return {packet:{version:1,operations:r.operations}};
}
function invoke(args){
 const r=spawnSync(process.execPath,[path.join(ROOT,'scripts/library-toolkit.cjs'),...args],{cwd:ROOT,encoding:'utf8',maxBuffer:2*1024*1024});
 if(r.error||r.status!==0)throw Error('Toolkit rejected request: '+String(r.error||r.stderr||r.stdout).slice(0,8192));
 return JSON.parse(r.stdout);
}
function write(file,obj){const body=JSON.stringify(obj,null,2)+'\n';if(Buffer.byteLength(body)>96*1024)throw Error('Result exceeds 96 KiB; reduce limit or projected fields');fs.writeFileSync(file,body,{flag:'wx'});}
function run(requestFile,resultFile,allowCandidate=false){
 const raw=fs.readFileSync(requestFile);
 if(raw.length>64*1024)throw Error('Request exceeds 64 KiB');
 const r=JSON.parse(raw),v=validate(r);
 const before=sha(fs.readFileSync(SOURCE));
 if(r.mode==='query'){const result=invoke(v.args);write(resultFile,{request_sha256:sha(raw),mode:r.mode,...result});return;}
 if(r.source_sha256!==before)throw Error('Stale source_sha256; make a fresh query and recheck expected values');
 if(r.mode==='candidate'&&!allowCandidate)throw Error('Candidate mode is disabled in this environment');
 // Request and output live in RUNNER_TEMP, never in the editable source tree.
 const packet=resultFile+'.packet.json';
 fs.writeFileSync(packet,JSON.stringify(v.packet),{flag:'wx'});
 try{
  const preview=invoke(['patch','--file',packet]);
  // Bound the report before any mutation. Full existing validation on apply.
  const base={request_sha256:sha(raw),source_sha256:before,mode:r.mode,changed:preview.changed,preview:preview.preview};
  if(Buffer.byteLength(JSON.stringify(base,null,2))>90*1024)throw Error('Preview too large; split the packet');
  if(r.mode==='candidate'&&preview.changed){
   const applied=invoke(['patch','--file',packet,'--apply']);
   if(applied.changed!==preview.changed)throw Error('Preview/application mismatch');
  }
  write(resultFile,{...base,result_source_sha256:sha(fs.readFileSync(SOURCE))});
 }finally{fs.unlinkSync(packet);}
}
module.exports={validate};
if(require.main===module)try{
 const [request,result,flag,...extra]=process.argv.slice(2);
 if(!request||!result||extra.length||(flag&&flag!=='--allow-candidate'))throw Error('Usage: node scripts/library-request.cjs REQUEST RESULT [--allow-candidate]');
 run(request,result,flag==='--allow-candidate');
}catch(e){console.error(e.message);process.exitCode=1;}
