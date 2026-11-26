import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {makeReadCache,fetchPinnedSnapshot} from './modular-read-cache.mjs';
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
 const request=async p=>({tree:p.endsWith(tree)?[{path:'outputs',type:'tree',sha:c2}]:[{path:'library-v2.json',type:'blob',sha:blob,size:raw.length}]});
 const args={repo:'owner/repo',request,source:{source_commit:c1,tree},fetchImpl:async url=>{assert(url.includes(c1));return new Response(raw)}};
 assert.deepEqual(await fetchPinnedSnapshot(args),raw);
 const bad=Buffer.from(raw);bad[bad.length-1]=32;
 await assert.rejects(()=>fetchPinnedSnapshot({...args,fetchImpl:async()=>new Response(bad)}),/fingerprint mismatch/);
});
