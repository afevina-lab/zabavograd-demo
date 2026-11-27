import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBridge,validateEnvelope,SOURCE_REF} from './modular-bridge.mjs';
const h='a'.repeat(40),t='b'.repeat(40),c='c'.repeat(40),sha='d'.repeat(64);
const slug='web-'+'e'.repeat(24);
test('bounded request only; rejects arbitrary commands and direct writes',()=>{
 assert.throws(()=>validateEnvelope('query',{version:1,mode:'query',command:'patch'}));
 assert.throws(()=>validateEnvelope('query',{version:1,mode:'query',command:'sqlite',options:{limit:41}}));
 assert.throws(()=>validateEnvelope('edit',{version:1,mode:'candidate',source_sha256:sha,operations:[{}]}));
 assert.throws(()=>validateEnvelope('edit',{version:1,mode:'preview',source_sha256:sha,operations:[],data:{entries:[]}}));
});
test('submits only request file to isolated branch; no main or PR changes',async()=>{
 const calls=[];
 const bridge=makeBridge({repo:'owner/repo',random:()=> 'e'.repeat(24),request:async(p,b,m)=>{
  calls.push({p,b,m});
  if(p.includes('/commits/'))return {sha:h,commit:{tree:{sha:t}}};
  if(p.endsWith('/git/trees'))return {sha:t};
  if(p.endsWith('/git/commits'))return {sha:c};
  return {};
 }});
 const r=await bridge.submit('query',{version:1,mode:'query',command:'inspect',options:{id:'a',fields:['/selection/base_weight']}});
 assert.equal(r.ticket,'query/'+slug+'-'+c.slice(0,12));
 assert(calls[0].p.endsWith(encodeURIComponent(SOURCE_REF)));
 assert.equal(calls[1].b.tree[0].path,'editorial/requests/library-request.json');
 assert.equal(calls[3].b.ref,'refs/heads/library-sqlite-request/'+slug);
 assert.equal(calls[4].m,'PATCH');assert.equal(calls[4].b.force,false);
 assert(!calls.some(x=>x.p.includes('/pulls')||x.p.includes('/git/refs/heads/main')||x.b?.ref==='refs/heads/main'));
 assert.equal(calls[0].b,undefined,'Reading main must not send a mutation body');
});
test('result unavailable is not a success; exact request binding checked',async()=>{
 const ticket='edit/'+slug+'-'+c.slice(0,12);
 const missing=makeBridge({repo:'owner/repo',request:async()=>{throw Object.assign(Error('404'),{status:404})}});
 assert.equal((await missing.result(ticket)).status,'result_not_available');
 await assert.rejects(()=>missing.result('edit/../../main'));
 const report={source_commit:h,request_commit:c,scope:'canonical_main_snapshot',status:'validated_candidate_not_approved'};
 const raw=Buffer.from(JSON.stringify(report));
 const bridge=makeBridge({repo:'owner/repo',request:async()=>({type:'file',encoding:'base64',size:raw.length,content:raw.toString('base64')})});
 assert.deepEqual((await bridge.result(ticket)).report,report);
 await assert.rejects(()=>bridge.result('edit/'+slug+'-'+'f'.repeat(12)),/не соответствует/);
});

test('rejects invalid or oversized request before any GitHub operation',async()=>{
 let calls=0;
 const bridge=makeBridge({repo:'owner/repo',request:async()=>{calls++;throw Error('must not contact GitHub')}});
 const base={version:1,mode:'preview',source_sha256:sha,operations:[{}]};
 const oversized={...base,operations:[{data:Array(9000).fill('a')}]};
 assert(Buffer.byteLength(JSON.stringify(oversized))<64*1024,'Compact fixture must fit');
 assert(Buffer.byteLength(JSON.stringify(oversized,null,2)+'\n')>64*1024,'Serialized request must exceed limit');
 for(const body of [{...base,semantic_operations:null},{...base,review_decisions:[{}]},{...base,import_operations:[{}]},oversized]){
  await assert.rejects(()=>bridge.submit('edit',body),e=>[400,413].includes(e.status));
 }
 assert.equal(calls,0);
});
test('malformed result body fails as upstream error, not a valid result',async()=>{
 const ticket='edit/'+slug+'-'+c.slice(0,12);
 for(const raw of [Buffer.from('null'),Buffer.from('{broken')]){
  const bridge=makeBridge({repo:'owner/repo',request:async()=>({type:'file',encoding:'base64',size:raw.length,content:raw.toString('base64')})});
  await assert.rejects(()=>bridge.result(ticket),e=>e.status===502);
 }
});
