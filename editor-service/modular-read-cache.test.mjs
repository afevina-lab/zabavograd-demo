import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import store from '../scripts/library-store.cjs';
import {makeReadCache,fetchPinnedSnapshot,makePinnedLoader} from './modular-read-cache.mjs';
const c1='a'.repeat(40),c2='b'.repeat(40),tree='c'.repeat(40);
const source=weight=>Buffer.from(JSON.stringify({schema_version:2,entries:[{id:'a',lemma:'кот',kind:'word',selection:{base_weight:weight},categories:[],phonetic_tags:{status:'filled_with_explicit_extended_cases',data:{sound_tokens:['к','о','т']}},illustrations:{senses:[]}}],categories:[],relations:[]}));
test('cache reuses index, binds exact source, refreshes only after TTL and fails closed',async()=>{
 let now=0,head=c1,loads=0,checks=0,broken=false;
 const request=async()=>{checks++;if(broken)throw Error('offline');return {sha:head,commit:{tree:{sha:tree}}}};
 const cache=makeReadCache({repo:'owner/repo',clock:()=>now,ttl:10,loadSnapshot:async({source:s})=>{loads++;return source(s.source_commit===c1?100:70)}});
 const q={version:1,mode:'query',command:'sqlite',options:{sounds:['к'],limit:10}};
 try{
  const [a,b]=await Promise.all([cache.query(request,q),cache.query(request,q)]);
  assert.equal(a.report.total,1);assert.equal(b.report.rows[0].weight,100);assert.equal(loads,1);assert.equal(checks,1);
  const pin=a.report.source_sha256;
  const field=await cache.query(request,{version:1,mode:'query',command:'inspect',source_sha256:pin,options:{id:'a',fields:['/selection/base_weight']}});
  assert.deepEqual(field.report.rows[0].fields['/selection/base_weight'],{exists:true,value:100});
  assert.equal(checks,1);now=11;await cache.query(request,q);assert.equal(checks,2);assert.equal(loads,1);
  now=22;head=c2;await assert.rejects(()=>cache.query(request,{...q,source_sha256:pin}),e=>e.status===409);
  const next=await cache.query(request,q);assert.equal(next.report.rows[0].weight,70);assert.equal(loads,2);
  now=33;broken=true;await assert.rejects(()=>cache.query(request,q),/offline/);
  await assert.rejects(()=>cache.query(request,{...q,options:{sql:'DROP TABLE word'}}),/Unexpected key/);
  await assert.rejects(()=>cache.query(request,{version:1,mode:'query',command:'inspect',options:{id:'a',full:true}}),/Full cards/);
 }finally{cache.close()}
});
test('immutable source bytes must match Git tree blob',async()=>{
 const raw=source(100),blob=crypto.createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex');
 const request=async p=>({tree:p.endsWith(tree)?[{path:'outputs',type:'tree',sha:c2}]:[{path:'library-v2.json',type:'blob',mode:'100644',sha:blob,size:raw.length}]});
 const args={repo:'owner/repo',request,source:{source_commit:c1,tree},fetchImpl:async url=>{assert(url.includes(c1));return new Response(raw)}};
 assert.deepEqual(await fetchPinnedSnapshot(args),raw);
 const bad=Buffer.from(raw);bad[bad.length-1]=32;
 await assert.rejects(()=>fetchPinnedSnapshot({...args,fetchImpl:async()=>new Response(bad)}),/fingerprint mismatch/);
});

function remoteModules(rawFiles){
 const outputs='d'.repeat(40),editorial='e'.repeat(40),modules='f'.repeat(40),urls=new Map(),calls=[];
 const policy=Buffer.from('{"version":1,"mode":"modules","directory":"outputs/library-modules"}');
 const blob=(name,data,base='outputs/library-modules/')=>{
  data=Buffer.from(data);urls.set(base+name,data);
  return {path:name,type:'blob',mode:'100644',size:data.length,sha:crypto.createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex')};
 };
 const mark=blob('library-source-mode.json',policy,'editorial/');
 const listing=[...rawFiles].map(([n,b])=>blob(n,b));
 let dual=false,missing=false,bad=false;
 const request=async u=>{
  if(u.endsWith('/commits/refactor%2Flibrary-modular-integration-20261126'))return {sha:c1,commit:{tree:{sha:tree}}};
  if(u.endsWith(tree))return {tree:[{path:'outputs',type:'tree',sha:outputs},{path:'editorial',type:'tree',sha:editorial}]};
  if(u.endsWith(outputs))return {tree:[{path:'library-modules',type:'tree',sha:modules},...(dual?[{path:'library-v2.json',type:'blob'}]:[])]};
  if(u.endsWith(editorial))return {tree:[mark]};
  if(u.endsWith(modules+'?recursive=1'))return {tree:missing?listing.slice(1):listing};
  throw Error('Unexpected request '+u);
 };
 const fetchImpl=async url=>{
  const relative=url.split('/').slice(6).join('/');calls.push(relative);
  const data=urls.get(relative);assert(data,'Unknown file '+relative);
  if(bad&&relative.endsWith('manifest.json'))return new Response(Buffer.alloc(data.length,32));
  return new Response(data);
 };
 return {request,fetchImpl,calls,setDual:()=>{dual=true},setMissing:()=>{missing=true},setBad:()=>{bad=true}};
}
function generation(db){
 const built=store.build(db);
 return new Map([...built.files,['manifest.json',JSON.stringify(built.manifest,null,2)+'\n']]);
}
test('canonical module loader restores exact snapshot and reuses unchanged Git blobs',async()=>{
 const db=JSON.parse(source(100)),a=remoteModules(generation(db));
 const loader=makePinnedLoader({fetchImpl:a.fetchImpl});
 const args={repo:'owner/repo',source:{source_commit:c1,tree},request:a.request};
 assert.equal((await loader(args)).toString(),store.snapshot(db));
 const first=a.calls.length;assert(first>3);
 await loader({...args,source:{source_commit:c2,tree}});
 assert.equal(a.calls.length-first,1,'Only source policy should be fetched again');
 const next=JSON.parse(source(70)),b=remoteModules(generation(next));
 // Use a new fixture transport through the same loader.
 const router={active:a};const reused=makePinnedLoader({fetchImpl:(...x)=>router.active.fetchImpl(...x)});
 await reused(args);router.active=b;
 assert.equal((await reused({...args,request:b.request,source:{source_commit:c2,tree}})).toString(),store.snapshot(next));
 assert(b.calls.length>1&&b.calls.length<first,'Only changed modules and policy should be fetched');
});
test('canonical module loader fails closed on dual master, missing shard and corrupt blob',async()=>{
 for(const [flag,pattern] of [['setDual',/Two potential/],['setMissing',/Missing or extra|manifest/],['setBad',/fingerprint mismatch/]]){
  const a=remoteModules(generation(JSON.parse(source(100))));a[flag]();
  await assert.rejects(()=>fetchPinnedSnapshot({repo:'owner/repo',source:{source_commit:c1,tree},request:a.request,fetchImpl:a.fetchImpl}),pattern);
 }
});
if(process.env.LIBRARY_REAL_MODULES_TEST==='1')test('real canonical modules yield identical cached SQLite result',async()=>{
 const dir=path.join(process.env.RUNNER_TEMP,'modules'),files=new Map();
 function walk(d,p=''){for(const ent of fs.readdirSync(d,{withFileTypes:true})){const rel=p+ent.name;if(ent.isDirectory())walk(path.join(d,ent.name),rel+'/');else files.set(rel,fs.readFileSync(path.join(d,ent.name)));}}
 walk(dir);
 const a=remoteModules(files),cache=makeReadCache({repo:'owner/repo',loadSnapshot:makePinnedLoader({fetchImpl:a.fetchImpl})});
 try{
  const q=JSON.parse(fs.readFileSync(path.join(process.env.RUNNER_TEMP,'remote-sqlite-request.json'))),expected=JSON.parse(fs.readFileSync(path.join(process.env.RUNNER_TEMP,'remote-sqlite-result.json')));
  const actual=(await cache.query(a.request,q)).report;
  assert.equal(actual.source_sha256,expected.source_sha256);assert.equal(actual.total,expected.total);assert.deepEqual(actual.rows,expected.rows);
 }finally{cache.close();}
});
