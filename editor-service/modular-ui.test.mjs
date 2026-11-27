import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {searchOptions,parseDraft,draftStorageKey,prepareImportedDraft,verifyDraftOperations} from '../public/editor/modular-ui.mjs';
test('bounded indexed search translates visible filters without full source',()=>{
 assert.deepEqual(searchOptions({text:' кот ',category:'Животные',kind:'word',missing:'images',page:2}),{limit:36,offset:72,prefix:'кот',category:'Животные',kind:'word',has_image:false});
 assert.deepEqual(searchOptions({text:'id:ru-a',missing:'phonetic_tags'}),{limit:36,offset:0,id:'ru-a',stored_phonetics:false});
 assert.throws(()=>searchOptions({text:'id:'}),/ID/);
});

test('experimental editor uses cached pages, exact fields, and explicit two-phase save',async()=>{
 const {startModularEditor}=await import('../public/editor/modular-ui.mjs');
 class El{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.value='';this.hidden=false;this.open=false;this.textContent='';this.classList={toggle(){}};}
  append(e){this.children.push(e)}
  replaceChildren(){this.children=[]}
  closest(){return null}
  setAttribute(){}
  querySelector(){return new El('p')}
  querySelectorAll(selector){const all=[];const walk=e=>{for(const c of e.children){if(selector==='input,select'&&['input','select'].includes(c.tagName)||selector==='[data-id]'&&c.dataset.id)all.push(c);walk(c)}};walk(this);return all}
  showModal(){this.open=true}
  close(){this.open=false}
 }
 const ids=new Map(),aside=new El(),nav=new El(),hint=new El();
 const document={getElementById:id=>{if(!ids.has(id))ids.set(id,new El());return ids.get(id)},createElement:tag=>new El(tag),querySelector:s=>s==='aside'?aside:s==='nav'?nav:hint,querySelectorAll:()=>[]};
 const $=id=>document.getElementById(id),calls=[],source='a'.repeat(64),pin='b'.repeat(64);
 let latest='',pending=null,failRead=false;const row={id:'a',lemma:'кот',fields:{'/selection/base_weight':{exists:true,value:100}}};
 const client={
  state:()=>({source_sha256:source}),
  cachedQuery:async(command,options)=>{calls.push([command,options]);if(failRead)throw Object.assign(Error('Источник изменился'),{status:409});latest=command;return {report:command==='inventory'?{entries:1,categories:1,relations:0,category_paths:['Животные'],kinds:['word']}:command==='inspect'?{source_sha256:source,rows:[row]}:{source_sha256:source,total:1,rows:[{id:'a',lemma:'кот',weight:100,illustrations:1}]}}},
  operation:(r,path,value)=>{assert.equal(latest,'inspect');assert.equal(r,row);return {id:r.id,path,expect:{exists:true,value:100},value}},
  requestPreview:async r=>{calls.push(['preview',r]);pending='preview';return {ticket:'preview-ticket'}},
  collect:async ticket=>{calls.push(['collect',ticket]);return {status:'result_available',report:{status:pending==='preview'?'preview_not_validated_or_approved':'validated_candidate_not_approved',preview_sha256:pin,changes:[]}}},
  requestCandidate:async p=>{assert.equal(p,pin);calls.push(['candidate',p]);pending='candidate';return {ticket:'candidate-ticket'}}
 };
 const alerts=[];const window={alert:s=>alerts.push(s),confirm:()=>true};
 const connection={service:'https://example.invalid',session:'session',api:async route=>{assert.equal(route,'/health');return {modular_rehearsal:true,cached_read:true}}};
 await startModularEditor({document,window,connection,client});
 assert.deepEqual(calls.map(x=>x[0]),['inventory','sqlite']);
 await $('cards').children[0].onclick();
 const select=$('fields').querySelectorAll('input,select')[0];select.value='70';select.onchange();
 assert.equal($('save').disabled,false);await $('save').onclick();
 assert.equal(calls.at(-1)[0],'preview');assert.equal(calls.at(-1)[1].operations[0].value,70);
 await $('save').onclick();assert.equal($('review').open,true);assert.equal($('submit').disabled,false);
 await $('submit').onclick();assert.equal(calls.at(-1)[0],'candidate');
 await $('save').onclick();assert.equal($('submit').disabled,true);
 assert.equal(alerts.length,0);
 // A failed read must not leave a previous card editable.
 failRead=true;await $('search').onchange();assert.equal($('detail').hidden,true);assert.equal($('save').disabled,false); // already collected report remains accessible
 const count=calls.length;await $('cards').children[0].onclick();assert.equal(calls.length,count);assert.equal($('submit').disabled,true);assert.equal(alerts.length,1);
});

test('draft serialization rejects unrecognized fields, duplicate operations and mismatched submitted package',()=>{
 const op={id:'a',path:'/selection/base_weight',expect:{exists:true,value:100},value:70};
 const d={format:'zabavograd-modular-draft-v2',controller:{source_sha256:'a'.repeat(64),job:null},operations:[op]};
 assert.deepEqual(parseDraft(JSON.stringify(d)),d);
 assert.throws(()=>parseDraft(JSON.stringify({...d,operations:[op,op]})),/Повторная/);
 assert.throws(()=>parseDraft(JSON.stringify({...d,operations:[{...op,path:'/lemma'}]})),/Неверная операция/);
 assert.throws(()=>parseDraft(JSON.stringify({...d,controller:{...d.controller,job:{body:{operations:[{...op,value:50}]}}}})),/не совпадает/);
 assert.notEqual(draftStorageKey('https://a.example'),draftStorageKey('https://b.example'));
});

test('import validates all old weights on pinned source without sending any edit',async()=>{
 const source='a'.repeat(64),op={id:'a',path:'/selection/base_weight',expect:{exists:true,value:100},value:70};
 const d={format:'zabavograd-modular-draft-v2',controller:{source_sha256:source,job:null},operations:[op]};
 let weight=100,current=source;const calls=[];
 const api=async(route,body)=>{
  assert.equal(route,'/api/modular/read');calls.push(body.command);
  if(body.source_sha256!==current)throw Object.assign(Error('Stale source'),{status:409});
  return {status:'cached_result',report:{scope:'canonical_main_snapshot',source_commit:'b'.repeat(40),source_sha256:current,mode:'query',command:body.command,request_sha256:crypto.createHash('sha256').update(JSON.stringify(body,null,2)+'\n').digest('hex'),rows:body.command==='inspect'?[{id:'a',fields:{'/selection/base_weight':{exists:true,value:weight}}}]:[]}};
 };
 const p=await prepareImportedDraft(JSON.stringify(d),api);
 assert.equal(p.waiting,null);assert.deepEqual(calls,['inventory','inspect']);assert.equal(p.client.state().source_sha256,source);
 weight=70;await assert.rejects(()=>prepareImportedDraft(JSON.stringify(d),api),e=>e.status===409&&/исходное значение/.test(e.message));
 current='c'.repeat(64);await assert.rejects(()=>prepareImportedDraft(JSON.stringify(d),api),e=>e.status===409);
});
test('import of submitted ticket makes no requests and requires independent report collection',async()=>{
 const source='a'.repeat(64),op={id:'a',path:'/selection/base_weight',expect:{exists:true,value:100},value:70},commit='b'.repeat(40),ticket='edit/web-'+'c'.repeat(24)+'-'+commit.slice(0,12);
 const d={format:'zabavograd-modular-draft-v2',controller:{source_sha256:source,job:{ticket,commit,body:{version:1,mode:'preview',source_sha256:source,operations:[op]}}},operations:[op]};
 const p=await prepareImportedDraft(JSON.stringify(d),async()=>{throw Error('No automatic requests');});
 assert.equal(p.waiting.ticket,ticket);assert.equal(p.client.state().preview,null);
 await assert.rejects(()=>p.client.requestCandidate('d'.repeat(64)),/preview/);
});
