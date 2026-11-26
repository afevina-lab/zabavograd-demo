#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const SOURCE=path.join(ROOT,'outputs/library-v2.json');
const own=(o,k)=>o!==null&&typeof o==='object'&&Object.hasOwn(o,k);
const clone=x=>JSON.parse(JSON.stringify(x));
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const blocked=new Set(['__proto__','prototype','constructor']);
function pointer(s){
 if(typeof s!=='string'||!s.startsWith('/')||s.length<2)throw Error('Use nonempty JSON pointer /field/subfield');
 const parts=s.slice(1).split('/').map(x=>{if(/~(?![01])/u.test(x))throw Error('Invalid JSON pointer escape');return x.replace(/~1/g,'/').replace(/~0/g,'~');});
 if(parts.some(x=>!x||blocked.has(x)))throw Error('Unsafe path '+s);
 return parts;
}
function get(obj,parts){let v=obj;for(const p of parts){if(!own(v,p))return {exists:false};v=v[p];}return {exists:true,value:v};}
function empty(v){return !v.exists||v.value===null||v.value===''||(Array.isArray(v.value)&&!v.value.length)||(v.value&&typeof v.value==='object'&&!Object.keys(v.value).length);}
function match(a,b){try{assert.deepStrictEqual(a,b);return true;}catch{return false;}}
function index(db){
 if(!Array.isArray(db.entries))throw Error('Expected V2 entries');
 const map=new Map();
 for(const e of db.entries){if(typeof e.id!=='string'||map.has(e.id))throw Error('Invalid/duplicate ID '+e.id);map.set(e.id,e);}
 return map;
}
function page(rows,{limit=30,offset=0}={}){
 if(!Number.isSafeInteger(limit)||limit<1||limit>100||!Number.isSafeInteger(offset)||offset<0)throw Error('Limit 1..100, offset >= 0');
 return {total:rows.length,offset,limit,next_offset:offset+limit<rows.length?offset+limit:null,rows:rows.slice(offset,offset+limit)};
}
function select(db,o={}){
 const field=o.field?pointer(o.field):null;
 if((o.gaps||own(o,'equals'))&&!field)throw Error('Missing --field');
 if(o.gaps&&own(o,'equals'))throw Error('Choose gaps or equals');
 const paths=(o.fields||[]).map(p=>[p,pointer(p)]);
 let rows=[...index(db).values()].filter(e=>{
  if(o.id!==undefined&&e.id!==o.id)return false;
  if(o.lemma!==undefined&&e.lemma?.toLocaleLowerCase('ru')!==o.lemma.toLocaleLowerCase('ru'))return false;
  if(o.weight!==undefined&&e.selection?.base_weight!==o.weight)return false;
  if(o.category!==undefined&&!e.categories?.some(c=>c.path===o.category||c.path.startsWith(o.category+'/')))return false;
  const f=field?get(e,field):null;
  return (!o.gaps||empty(f))&&(!own(o,'equals')||(f.exists&&match(f.value,o.equals)));
 });
 rows.sort((a,b)=>(b.selection?.base_weight??-1)-(a.selection?.base_weight??-1)||a.id.localeCompare(b.id,'en'));
 return page(rows.map(e=>{
  const out={id:e.id,lemma:e.lemma,weight:e.selection?.base_weight,categories:e.categories?.map(c=>c.path)};
  if(o.full)out.entry=e;
  if(paths.length)out.fields=Object.fromEntries(paths.map(([p,parts])=>[p,get(e,parts)]));
  return out;
 }),o);
}
function inventory(db,fields=[]){
 const entries=[...index(db).values()],bytes={},coverage={};
 for(const e of entries)for(const [k,v] of Object.entries(e))bytes[k]=(bytes[k]||0)+Buffer.byteLength(JSON.stringify(v));
 for(const p of fields){
  const parts=pointer(p),counts={missing:0,empty:0,present:0},statuses=new Map();
  for(const e of entries){const v=get(e,parts);if(!v.exists)counts.missing++;else if(empty(v))counts.empty++;else counts.present++;
   const status=typeof v.value==='string'?v.value:v.value?.status;
   if(typeof status==='string')statuses.set(status,(statuses.get(status)||0)+1);
  }
  coverage[p]={...counts,statuses:Object.fromEntries(statuses)};
 }
 return {entries:entries.length,categories:db.categories?.length,relations:db.relations?.length,field_value_bytes:bytes,coverage};
}
// The first version edits existing entries only. IDs, membership, media and
// relationship graphs need domain-specific operations, not generic replacement.
const protectedRoots=new Set(['id','lemma','kind','categories','illustrations','legacy_source','relations','senses']);
const protectedKeys=new Set(['id','word_id','sense_id','image_id','relation_id','src']);
function noIdentity(v){
 if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){if(blocked.has(k)||protectedKeys.has(k))throw Error('Identity/resource keys require dedicated operation: '+k);noIdentity(x);}
}
function patches(db,packet){
 if(packet?.version!==1||!Array.isArray(packet.operations)||!packet.operations.length||packet.operations.length>500)throw Error('Patch version 1, 1..500 operations required');
 const result=clone(db),byId=index(result),changes=[],seen=new Map();
 for(const op of packet.operations){
  if(!op||typeof op.id!=='string'||!own(op,'value')||!op.expect||typeof op.expect.exists!=='boolean'||(op.expect.exists&&!own(op.expect,'value')))throw Error('Each operation requires id, path, value, expect.exists and previous value if present');
  const parts=pointer(op.path);
  if(protectedRoots.has(parts[0])||parts.some(p=>protectedKeys.has(p)||/^\d+$/.test(p)))throw Error('Protected path '+op.path);
  const canonical='/'+parts.map(p=>p.replace(/~/g,'~0').replace(/\//g,'~1')).join('/');
  const prior=seen.get(op.id)||[];
  if(prior.some(p=>p===canonical||p.startsWith(canonical+'/')||canonical.startsWith(p+'/')))throw Error('Overlapping patch paths '+op.id+' '+op.path);
  prior.push(canonical);seen.set(op.id,prior);
  const e=byId.get(op.id);if(!e)throw Error('Unknown word ID '+op.id);
  const old=get(e,parts);
  if(old.exists!==op.expect.exists||(old.exists&&!match(old.value,op.expect.value)))throw Error('Conflict '+op.id+' '+op.path+' (re-query current data)');
  if(old.exists&&old.value!==null&&typeof old.value==='object'&&!Array.isArray(old.value)&&!match(old.value,op.value))throw Error('Update object fields individually: '+op.path);
  noIdentity(op.value);if(old.exists)noIdentity(old.value);
  let parent=e;
  for(const p of parts.slice(0,-1)){
   if(!own(parent,p))throw Error('Missing parent; add its object as a separate nonoverlapping operation: '+op.path);
   parent=parent[p];if(!parent||typeof parent!=='object'||Array.isArray(parent))throw Error('Parent must be an object: '+op.path);
  }
  if(old.exists&&match(old.value,op.value))continue;
  parent[parts.at(-1)]=clone(op.value);
  changes.push({id:e.id,lemma:e.lemma,path:op.path,before:old,after:{exists:true,value:op.value}});
 }
 return {db:result,changes};
}
function read(){const raw=fs.readFileSync(SOURCE,'utf8');return {raw,db:JSON.parse(raw),sha256:digest(raw)};}
function writeAtomic(raw){
 const tmp=SOURCE+'.tmp-'+process.pid;
 try{fs.writeFileSync(tmp,raw,{flag:'wx'});fs.renameSync(tmp,SOURCE);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
}
function apply(raw,db,changes){
 if(!changes.length)return;
 // Lock cooperating CLI writers; stale lock after a hard interruption is
 // deliberately not cleared automatically. Do not edit the file concurrently.
 const lock=SOURCE+'.edit-lock';const fd=fs.openSync(lock,'wx');
 try{
  if(digest(fs.readFileSync(SOURCE))!==digest(raw))throw Error('Source changed since read');
  require('./validate-library-contract.cjs').validateLibrary(db);
  const candidate=JSON.stringify(db,null,2)+'\n';
  writeAtomic(candidate);
  try{
   const r=spawnSync(process.execPath,[path.join(ROOT,'scripts/check-library-v2.cjs')],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});
   if(r.error||r.status!==0)throw Error('Full library validation failed: '+(r.error||r.stderr||r.stdout));
  }catch(e){if(digest(fs.readFileSync(SOURCE))===digest(candidate))writeAtomic(raw);else throw Error('Validation failed and file changed concurrently; inspect git diff before rollback');throw e;}
 }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
function args(xs){
 const out={};const booleans=new Set(['full','apply']);
 for(let i=0;i<xs.length;i++){const k=xs[i];if(!k.startsWith('--'))throw Error('Unknown argument '+k);
  const name=k.slice(2);if(own(out,name)||blocked.has(name))throw Error('Duplicate/unsafe option '+k);
  if(booleans.has(name))out[name]=true;
  else {if(i+1===xs.length||xs[i+1].startsWith('--'))throw Error('Missing value '+k);out[name]=xs[++i];}
 }return out;
}
function main(){
 const [cmd,...rest]=process.argv.slice(2);
 if(!['find','inspect','select','gaps','inventory','patch'].includes(cmd))throw Error('Commands: find, inspect, select, gaps, inventory, patch. See docs/LIBRARY_TOOLKIT.md');
 const a=args(rest),allowed=cmd==='patch'?['file','apply']:cmd==='inventory'?['fields']:['id','lemma','weight','category','field','equals','fields','limit','offset','full'];
 for(const k of Object.keys(a))if(!allowed.includes(k))throw Error('Unknown option --'+k);
 const {raw,db,sha256}=read();let out;
 if(cmd==='patch'){
  if(!a.file)throw Error('Provide --file packet.json');
  const result=patches(db,JSON.parse(fs.readFileSync(a.file,'utf8')));
  if(a.apply)apply(raw,result.db,result.changes);
  out={mode:a.apply?'applied':'dry-run',source_sha256:sha256,changed:result.changes.length,preview:result.changes.slice(0,30),remaining:Math.max(0,result.changes.length-30)};
 }else if(cmd==='inventory')out={source_sha256:sha256,...inventory(db,a.fields?.split(',')||[])};
 else{
  if(cmd==='find'&&!a.lemma&&!a.id)throw Error('Provide --lemma or --id');
  if(cmd==='inspect'&&(!a.id||(!a.fields&&!a.full)))throw Error('Inspect requires --id and --fields or --full');
  if(a.full&&!a.id)throw Error('--full requires exact --id');
  const o={id:a.id,lemma:a.lemma,category:a.category,field:a.field,fields:a.fields?.split(',')||[],full:a.full,gaps:cmd==='gaps',limit:a.limit===undefined?30:Number(a.limit),offset:a.offset===undefined?0:Number(a.offset)};
  if(a.weight!==undefined){o.weight=Number(a.weight);if(![0,10,20,30,50,70,100].includes(o.weight))throw Error('Invalid weight');}
  if(own(a,'equals'))o.equals=JSON.parse(a.equals);
  out={source_sha256:sha256,...select(db,o)};
 }
 console.log(JSON.stringify(out,null,2));
}
module.exports={pointer,get,empty,index,select,inventory,patches};
if(require.main===module)try{main();}catch(e){console.error(e.message);process.exitCode=1;}
