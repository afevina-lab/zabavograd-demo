import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import sqlite from '../scripts/library-sqlite.cjs';
import toolkit from '../scripts/library-toolkit.cjs';
import remote from '../scripts/library-request.cjs';
import {SOURCE_REF,validateEnvelope} from './modular-bridge.mjs';
const scope='integration_snapshot_not_live_main',commitHash=/^[a-f0-9]{40}$/;
const MAX=32*1024*1024;
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const gitBlob=x=>crypto.createHash('sha1').update('blob '+x.length+'\0').update(x).digest('hex');
const fail=(message,status=502)=>{throw Object.assign(Error(message),{status})};
const require=(ok,message,status)=>{if(!ok)fail(message,status)};
export async function fetchPinnedSnapshot({request,repo,source,fetchImpl=fetch}){
 require(commitHash.test(source.source_commit)&&commitHash.test(source.tree),'Invalid source revision');
 const api='/repos/'+repo+'/git/trees/';
 const root=await request(api+source.tree);
 const outputs=root.tree?.find(x=>x.path==='outputs'&&x.type==='tree');
 require(outputs&&commitHash.test(outputs.sha),'Missing outputs tree');
 const tree=await request(api+outputs.sha);
 const file=tree.tree?.find(x=>x.path==='library-v2.json'&&x.type==='blob');
 require(file&&commitHash.test(file.sha)&&Number.isInteger(file.size)&&file.size>0&&file.size<=MAX,'Missing or oversized catalogue');
 const r=await fetchImpl('https://raw.githubusercontent.com/'+repo+'/'+source.source_commit+'/outputs/library-v2.json',{signal:AbortSignal.timeout(20000),redirect:'error'});
 require(r.ok&&r.body,'Catalogue fetch failed');
 const reader=r.body.getReader(),parts=[];let size=0;
 try{
  for(;;){const x=await reader.read();if(x.done)break;size+=x.value.byteLength;require(size<=file.size&&size<=MAX,'Catalogue exceeds expected size');parts.push(Buffer.from(x.value));}
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 const raw=Buffer.concat(parts);
 require(raw.length===file.size&&gitBlob(raw)===file.sha,'Catalogue blob fingerprint mismatch');
 return raw;
}
function readQuery(snapshot,r){
 const v=remote.validate(r),o=r.options??{};
 if(v.sqlite){
  const db=new DatabaseSync(snapshot.file,{readOnly:true});
  try{const result=sqlite.query(db,v.sqlite,snapshot.sha);return {...result,rows:result.rows.map(({metadata_json,normalized,...row})=>row)};}finally{db.close();}
 }
 if(r.command==='inventory')return {...toolkit.inventory(snapshot.db,o.fields??[]),category_paths:snapshot.db.categories.map(c=>c.path).sort((a,b)=>a.localeCompare(b,'ru')),kinds:[...new Set(snapshot.db.entries.map(e=>e.kind).filter(k=>typeof k==='string'))].sort()};
 require(!o.full,'Full cards disabled in cached API; request exact fields',400);
 require(r.command!=='find'||o.id||o.lemma,'Find requires ID or lemma',400);
 require(r.command!=='inspect'||o.id&&o.fields?.length,'Inspect requires ID and fields',400);
 require(o.weight===undefined||[0,10,20,30,50,70,100].includes(o.weight),'Invalid weight',400);
 return toolkit.select(snapshot.db,{...o,limit:o.limit??20,offset:o.offset??0,gaps:r.command==='gaps'});
}
export function makeReadCache({repo,loadSnapshot=fetchPinnedSnapshot,clock=Date.now,ttl=15000,tempRoot=os.tmpdir()}){
 require(Number.isInteger(ttl)&&ttl>=0&&ttl<=60000,'Invalid cache TTL');
 let cached=null,refresh=null,closed=false;
 const dir=fs.mkdtempSync(path.join(tempRoot,'zg-read-cache-'));
 async function get(request){
  require(!closed,'Cache closed',503);
  if(cached&&clock()-cached.checked<ttl)return cached;
  if(!refresh)refresh=(async()=>{
   const c=await request('/repos/'+repo+'/commits/'+encodeURIComponent(SOURCE_REF));
   require(commitHash.test(c.sha)&&commitHash.test(c.commit?.tree?.sha),'Invalid source commit');
   const source={source_commit:c.sha,tree:c.commit.tree.sha};
   if(cached?.commit===c.sha){cached.checked=clock();return cached;}
   const raw=await loadSnapshot({request,repo,source});
   const db=JSON.parse(raw.toString('utf8'));
   require(db.schema_version===2&&Array.isArray(db.entries)&&Array.isArray(db.categories)&&Array.isArray(db.relations),'Invalid catalogue shape');
   // The modular logical fingerprint is canonical pretty JSON plus newline.
   const fingerprint=sha(JSON.stringify(db,null,2)+'\n');
   require(!closed,'Cache closed',503);
   if(cached?.sha===fingerprint){cached.commit=c.sha;cached.checked=clock();return cached;}
   const file=path.join(dir,c.sha+'.sqlite');
   try{sqlite.build(db,file,{source_sha256:fingerprint,source_mode:'cached_integration_snapshot'});}
   catch(e){fs.rmSync(file,{force:true});throw e;}
   const old=cached;cached={db,file,sha:fingerprint,commit:c.sha,checked:clock()};
   if(old)fs.rmSync(old.file,{force:true});
   return cached;
  })().finally(()=>{refresh=null;});
  return refresh;
 }
 async function query(request,r){
  validateEnvelope('query',r);
  require(!Object.hasOwn(r.options??{},'full'),'Full cards disabled in cached API; request exact fields',400);
  try{remote.validate(r);}catch(e){fail(e.message,400);}
  const packet=structuredClone(r),s=await get(request);
  require(!packet.source_sha256||packet.source_sha256===s.sha,'Source changed; restart search',409);
  let result;try{result=readQuery(s,packet);}catch(e){fail(e.message,e.status??400);}
  const report={...result,mode:'query',command:packet.command,source_sha256:s.sha,source_commit:s.commit,scope,request_sha256:sha(JSON.stringify(packet,null,2)+'\n'),cache_age_ms:Math.max(0,clock()-s.checked)};
  require(Buffer.byteLength(JSON.stringify(report))<=96*1024,'Result exceeds 96 KiB; reduce fields or limit',413);
  return {status:'cached_result',report};
 }
 function close(){closed=true;cached=null;fs.rmSync(dir,{recursive:true,force:true});}
 return {query,close};
}
