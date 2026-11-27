import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import sqlite from '../scripts/library-sqlite.cjs';
import store from '../scripts/library-store.cjs';
import toolkit from '../scripts/library-toolkit.cjs';
import remote from '../scripts/library-request.cjs';
import {SOURCE_REF,validateEnvelope} from './modular-bridge.mjs';
const scope='canonical_main_snapshot',commitHash=/^[a-f0-9]{40}$/;
const MAX=32*1024*1024;
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const gitBlob=x=>crypto.createHash('sha1').update('blob '+x.length+'\0').update(x).digest('hex');
const fail=(message,status=502)=>{throw Object.assign(Error(message),{status})};
const require=(ok,message,status)=>{if(!ok)fail(message,status)};
// Keep only the verified bytes of the previous module generation. A change
// to one shard downloads that shard and manifest, not all unchanged blobs.
const modulePath=/^(manifest|metadata|categories|entry-order|relation-order)\.json$|^(entries\/(?:core|phonetics|morphology|semantics|syllables|translations|illustrations|machine|archive|shared)|relations)\/[a-f0-9]{2}\.json$/;
const isBlob=x=>x?.type==='blob'&&x.mode==='100644'&&commitHash.test(x.sha)&&Number.isSafeInteger(x.size)&&x.size>=0&&x.size<=MAX;
export function makePinnedLoader({fetchImpl=fetch}={}){
 let previous=new Map();
 return async function fetchSnapshot({request,repo,source}){
  require(commitHash.test(source.source_commit)&&commitHash.test(source.tree),'Invalid source revision');
  require(/^[\w.-]+\/[\w.-]+$/.test(repo),'Invalid repository');
  const api='/repos/'+repo+'/git/trees/';
  async function tree(id,recursive=false){
   require(commitHash.test(id),'Invalid tree ID');
   const r=await request(api+id+(recursive?'?recursive=1':''));
   require(Array.isArray(r.tree)&&!r.truncated&&new Set(r.tree.map(x=>x.path)).size===r.tree.length,'Incomplete or duplicate Git tree');
   return r.tree;
  }
  const next=new Map();
  async function blob(file,relative,reuse=false){
   require(isBlob(file),'Invalid catalogue blob');
   let raw=reuse?previous.get(file.sha):undefined;
   if(!raw){
    const r=await fetchImpl('https://raw.githubusercontent.com/'+repo+'/'+source.source_commit+'/'+relative,{signal:AbortSignal.timeout(20000),redirect:'error'});
    require(r.ok&&r.body,'Catalogue fetch failed');
    const reader=r.body.getReader(),parts=[];let size=0;
    try{for(;;){const x=await reader.read();if(x.done)break;size+=x.value.byteLength;require(size<=file.size&&size<=MAX,'Catalogue exceeds expected size');parts.push(Buffer.from(x.value));}}
    finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
    raw=Buffer.concat(parts);
   }
   require(raw.length===file.size&&gitBlob(raw)===file.sha,'Catalogue blob fingerprint mismatch');
   if(reuse)next.set(file.sha,raw);
   return raw;
  }
  const root=await tree(source.tree);
  const outputs=root.find(x=>x.path==='outputs'),editorial=root.find(x=>x.path==='editorial');
  require(outputs?.type==='tree','Missing outputs tree');
  const out=await tree(outputs.sha);
  require(!editorial||editorial.type==='tree','Invalid editorial tree');
  const policy=editorial?(await tree(editorial.sha)).find(x=>x.path==='library-source-mode.json'):undefined;
  const legacy=out.find(x=>x.path==='library-v2.json'),modules=out.find(x=>x.path==='library-modules');
  if(!policy){
   require(!modules,'Unmarked module generation; refuse fallback');
   require(legacy,'Missing legacy catalogue');
   const raw=await blob(legacy,'outputs/library-v2.json');previous=new Map();return raw;
  }
  require(!legacy&&modules?.type==='tree','Two potential canonical sources or missing modules');
  require(policy.size<=4096,'Oversized source policy');
  const p=JSON.parse((await blob(policy,'editorial/library-source-mode.json')).toString('utf8'));
  require(p?.version===1&&p.mode==='modules'&&p.directory==='outputs/library-modules'&&Object.keys(p).length===3,'Invalid canonical library source policy');
  const files=(await tree(modules.sha,true)).filter(x=>x.type!=='tree');
  require(files.length>0&&files.length<=400&&files.every(x=>isBlob(x)&&modulePath.test(x.path)),'Unexpected module path or mode');
  require(files.reduce((n,x)=>n+x.size,0)<=MAX,'Module generation exceeds size limit');
  const manifest=files.find(x=>x.path==='manifest.json');
  require(manifest&&manifest.size<=1024*1024,'Missing or oversized module manifest');
  const data=new Map();
  // Verify manifest first, then download in bounded batches, no checkout or
  // execution of any code from the remote snapshot.
  data.set(manifest.path,(await blob(manifest,'outputs/library-modules/'+manifest.path,true)).toString('utf8'));
  const m=JSON.parse(data.get(manifest.path));
  require(m.files&&typeof m.files==='object'&&!Array.isArray(m.files),'Invalid module manifest');
  const expected=['manifest.json',...Object.keys(m.files)].sort();
  require(JSON.stringify(files.map(x=>x.path).sort())===JSON.stringify(expected),'Missing or extra module files');
  const shards=files.filter(x=>x!==manifest);
  for(let i=0;i<shards.length;i+=8)await Promise.all(shards.slice(i,i+8).map(async f=>{
   require(m.files[f.path]?.bytes===f.size,'Module size differs from manifest');
   data.set(f.path,(await blob(f,'outputs/library-modules/'+f.path,true)).toString('utf8'));
  }));
  const loaded=store.loadFiles(data.keys(),name=>data.get(name));
  const raw=Buffer.from(store.snapshot(loaded.db));
  require(raw.length<=MAX,'Reconstructed catalogue exceeds size limit');
  previous=next;
  return raw;
 };
}
export async function fetchPinnedSnapshot({fetchImpl=fetch,...args}){
 return makePinnedLoader({fetchImpl})(args);
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
export function makeReadCache({repo,loadSnapshot=makePinnedLoader(),clock=Date.now,ttl=15000,tempRoot=os.tmpdir()}){
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
   try{sqlite.build(db,file,{source_sha256:fingerprint,source_mode:'cached_canonical_snapshot'});}
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
