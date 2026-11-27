#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const os=require('node:os');
const ROOT=path.resolve(__dirname,'..');
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
  if(r.command==='sqlite'){
   if(own(r,'operations'))throw Error('SQLite is read-only');
   if(own(r,'source_sha256')&&(typeof r.source_sha256!=='string'||!/^[a-f0-9]{64}$/.test(r.source_sha256)))throw Error('Invalid source_sha256');
   const o=r.options??{};keys(o,['id','lemma','prefix','weight','kind','pos','category','default_category','lexical_default','phonetic_status','morphology_status','has_image','stored_phonetics','syllable_type','sounds','exclude_sounds','position','cluster','min_occurrences','form_key','form_origin','relation_type','relation_status','limit','offset']);
   if(own(o,'limit')&&(!Number.isInteger(o.limit)||o.limit<1||o.limit>40))throw Error('Invalid limit');
   if(own(o,'offset')&&(!Number.isInteger(o.offset)||o.offset<0||o.offset>100000))throw Error('Invalid offset');
   return {sqlite:{...o,limit:o.limit??20}};
  }
  if(!QUERY.includes(r.command)||own(r,'operations'))throw Error('Invalid query request');
  if(own(r,'source_sha256')&&(typeof r.source_sha256!=='string'||!/^[a-f0-9]{64}$/.test(r.source_sha256)))throw Error('Invalid source_sha256');
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
 throw Error('Read-only request; use library-modular-request.cjs for edits');
}
function invoke(args){
 const r=spawnSync(process.execPath,[path.join(ROOT,'scripts/library-toolkit.cjs'),...args],{cwd:ROOT,encoding:'utf8',maxBuffer:2*1024*1024});
 if(r.error||r.status!==0)throw Error('Toolkit rejected request: '+String(r.error||r.stderr||r.stdout).slice(0,8192));
 return JSON.parse(r.stdout);
}
function write(file,obj){const body=JSON.stringify(obj,null,2)+'\n';if(Buffer.byteLength(body)>96*1024)throw Error('Result exceeds 96 KiB; reduce limit or projected fields');fs.writeFileSync(file,body,{flag:'wx'});}
function sqliteQuery(options,expected){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'library-remote-sqlite-'));
 try{
  const db=path.join(tmp,'index.sqlite'),request=path.join(tmp,'query.json');
  fs.writeFileSync(request,JSON.stringify(options),{flag:'wx'});
  const call=(...args)=>{
   const r=spawnSync(process.execPath,[path.join(ROOT,'scripts/library-sqlite.cjs'),...args],{cwd:ROOT,encoding:'utf8',maxBuffer:2*1024*1024,timeout:90000});
   if(r.error||r.status!==0)throw Error('SQLite rejected request: '+String(r.error||r.stderr||r.stdout).slice(0,8192));
   return JSON.parse(r.stdout);
  };
  const built=call('build',db);
  if(built.source_sha256!==expected)throw Error('Source changed during index build');
  const result=call('query',db,request);
  if(result.source_sha256!==expected)throw Error('Source changed during search');
  return {...result,rows:result.rows.map(({metadata_json,normalized,...row})=>row)};
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
function run(requestFile,resultFile){
 if(fs.existsSync(resultFile))throw Error('Result already exists');
 const raw=fs.readFileSync(requestFile);
 if(raw.length>64*1024)throw Error('Request exceeds 64 KiB');
 const r=JSON.parse(raw),v=validate(r);
 const source=require('./library-source.cjs'),s=source.readSource(),before=s.sha256;
 if(r.mode==='query'){
  if(r.source_sha256&&r.source_sha256!==before)throw Error('Stale source_sha256; restart query');
  const result=v.sqlite?sqliteQuery(v.sqlite,before):invoke(v.args);
  if(result.source_sha256!==before||source.readSource().sha256!==before)throw Error('Source changed during query');
  write(resultFile,{request_sha256:sha(raw),mode:r.mode,command:r.command,source_mode:s.mode,...result});return;
 }
 throw Error('Read-only request');
}
module.exports={validate,run};
if(require.main===module)try{
 const [request,result,...extra]=process.argv.slice(2);
 if(!request||!result||extra.length)throw Error('Usage: node scripts/library-request.cjs REQUEST RESULT');
 run(request,result);
}catch(e){console.error(e.message);process.exitCode=1;}
