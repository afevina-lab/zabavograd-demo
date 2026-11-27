import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createModularClient} from '../public/editor/modular-client.mjs';
const source='a'.repeat(64),other='b'.repeat(64),sha='c'.repeat(64),target='d'.repeat(64),commit='e'.repeat(40);
const scope='canonical_main_snapshot';
const row={id:'a',lemma:'кот',weight:100,fields:{'/selection/base_weight':{exists:true,value:100}}};
function fixture(){
 const calls=[],jobs=new Map();let n=0,ready=false,mutate=r=>r;
 const c=createModularClient(async(route,body)=>{
  calls.push({route,body});
  if(body){
   const kind=route.endsWith('/edit')?'edit':'query',ticket=kind+'/web-'+(++n).toString(16).padStart(24,'0')+'-'+commit.slice(0,12);
   jobs.set(ticket,structuredClone(body));return {status:'submitted',scope,ticket,request_commit:commit};
  }
  const ticket=new URL('https://example.test'+route).searchParams.get('ticket'),b=jobs.get(ticket);
  if(!ready)return {status:'result_not_available',ticket};
  const base={scope,source_commit:commit,request_commit:commit,request_sha256:crypto.createHash('sha256').update(JSON.stringify(b,null,2)+'\n').digest('hex'),source_sha256:b.source_sha256??source,mode:b.mode};
  const report=b.mode==='query'?{...base,command:b.command,rows:[row]}:{...base,operations:b.operations,semantic_operations:b.semantic_operations,review_decisions:b.review_decisions,preview_sha256:sha,result_source_sha256:target,status:b.mode==='preview'?'preview_not_validated_or_approved':'validated_candidate_not_approved'};
  return {status:'result_available',ticket,report:mutate(report)};
 });
 return {c,calls,ready:()=>ready=true,mutate:f=>mutate=f};
}
test('bounded inspection, explicit preview and candidate; no source switch',async()=>{
 const f=fixture(),c=f.c;
 const t=await c.inspect('a');assert.equal(c.state().source_sha256,null);
 assert.equal((await c.collect(t.ticket)).status,'result_not_available');
 f.ready();await c.collect(t.ticket);assert.equal(c.state().source_sha256,source);
 const op=c.operation(row,'/selection/base_weight',70);
 assert.deepEqual(op,{id:'a',path:'/selection/base_weight',expect:{exists:true,value:100},value:70});
 await assert.rejects(()=>c.requestCandidate(sha),/preview/);
 const p=await c.requestPreview({operations:[op]});await c.collect(p.ticket);
 await assert.rejects(()=>c.requestCandidate(other),/preview/);
 const k=await c.requestCandidate(sha);await c.collect(k.ticket);
 assert.equal(c.state().source_sha256,source);
 assert.equal(f.calls.find(x=>x.body?.mode==='candidate').body.preview_sha256,sha);
 assert(!f.calls.some(x=>x.route==='/api/save'||x.route==='/api/library'));
});
test('rejects stale or mismatched result and retains pending request',async()=>{
 const f=fixture(),c=f.c;f.ready();await c.collect((await c.inspect('a')).ticket);
 const t=await c.query('sqlite',{offset:20,limit:20});
 assert.equal(f.calls.at(-1).body.source_sha256,source);
 f.mutate(r=>({...r,source_sha256:other}));
 await assert.rejects(()=>c.collect(t.ticket),/версия источника/);
 c.abandon(t.ticket);
 f.mutate(r=>({...r,request_sha256:other}));
 const q=await c.query('sqlite',{},true);
 await assert.rejects(()=>c.collect(q.ticket),/не соответствует/);
 assert.equal(c.state().source_sha256,null);
});
test('rejects unsupported operations, stale rows and excess pagination',async()=>{
 const f=fixture(),c=f.c;f.ready();await c.collect((await c.inspect('a')).ticket);
 assert.throws(()=>c.operation({...row,id:'b'},'/selection/base_weight',70),/последнего просмотра/);
 assert.throws(()=>c.operation(row,'/legacy_source',{}),/недоступно/);
 assert.throws(()=>c.operation(row,'/selection/base_weight',99),/вес/);
 await assert.rejects(()=>c.query('sqlite',{limit:41}),/Лимит/);
 await assert.rejects(()=>c.requestPreview({operations:Array(31).fill({})}),/30 операций/);
});

test('cached read pins result and supports exact-field operations without ticket',async()=>{
 const client=createModularClient(async(route,body)=>{assert.equal(route,'/api/modular/read');return {status:'cached_result',report:{scope,mode:'query',command:body.command,source_commit:commit,source_sha256:source,request_sha256:crypto.createHash('sha256').update(JSON.stringify(body,null,2)+'\n').digest('hex'),rows:[row]}}});
 await client.cachedQuery('inspect',{id:'a',fields:['/selection/base_weight']});
 assert.equal(client.state().source_sha256,source);assert.equal(client.operation(row,'/selection/base_weight',70).value,70);assert.equal(client.state().pending.length,0);
});

test('checkpoint reload verifies original ticket and re-fetches preview before candidate',async()=>{
 const f=fixture(),c=f.c;f.ready();await c.collect((await c.inspect('a')).ticket);
 const op=c.operation(row,'/selection/base_weight',70),p=await c.requestPreview({operations:[op]});
 await c.collect(p.ticket);
 const saved=c.checkpoint();
 assert.equal(saved.job.ticket,p.ticket);assert(!Object.hasOwn(saved,'preview'));
 const api=async(route,body)=>{
  assert(!body,'Restoring and collecting do not send edits');
  const b=saved.job.body;
  return {status:'result_available',ticket:p.ticket,report:{scope,source_commit:commit,request_commit:commit,request_sha256:crypto.createHash('sha256').update(JSON.stringify(b,null,2)+'\n').digest('hex'),source_sha256:source,mode:'preview',operations:b.operations,preview_sha256:sha,result_source_sha256:target,status:'preview_not_validated_or_approved'}};
 };
 const resumed=createModularClient(api);await resumed.restore(saved);
 await assert.rejects(()=>resumed.requestCandidate(sha),/preview/);
 await resumed.collect(p.ticket);assert.equal(resumed.state().preview.preview_sha256,sha);
 const corrupt=structuredClone(saved);corrupt.job.body.operations[0].value=50;
 const damaged=createModularClient(api);await damaged.restore(corrupt);
 await assert.rejects(()=>damaged.collect(p.ticket),/не соответствует/);
 const invalid=createModularClient(api);await assert.rejects(()=>invalid.restore({...saved,job:{...saved.job,ticket:'wrong'}}),/билет/);
});
