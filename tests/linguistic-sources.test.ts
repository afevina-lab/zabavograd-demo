import {createRequire} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {parseDelimited,constructiconProposals,framebankProposals,wikidataProposals,dedupe,collect}=require('../scripts/linguistic-sources.cjs');

test('CSV multiline quoted fields are parsed without shifted columns',()=>{
 const rows=parseDelimited('ID Number,Anchor words,Name\n42,"делать, знать","тест, пример"\n43,"играть","строка\nдва"\n');
 assert.equal(rows.length,2);assert.equal(rows[0].Name,'тест, пример');assert.equal(rows[1].Name,'строка\nдва');
});
test('Constructicon exports suggestions only, not approved relations',()=>{
 const csv='ID Number,Anchor words,Name UD,Morphology\n42,"забивать, играть","V NP-Acc",VP\n';
 const out=constructiconProposals(csv,[{id:'v1',lemma:'забивать'},{id:'v2',lemma:'играть'}]);
 assert.equal(out.length,2);assert(out.every((x:any)=>x.review_status==='suggested'&&x.usable_for_generation===false));
 assert(out.every((x:any)=>x.candidate_type==='construction_anchor'));
});
test('Homonyms cannot be silently mapped by spelling',()=>{
 const rows=constructiconProposals('ID Number,Anchor words\n12,мышь\n',[{id:'animal',lemma:'мышь'},{id:'device',lemma:'мышь'}]);
 assert.equal(rows[0].entry_id,null);assert.equal(rows[0].entry_candidates.length,2);
});
test('FrameBank captures roles but not corpus sample texts',()=>{
 const dict='ConstrIndex\tConstrPattern\tExample\tKeyLexemes\n3239\tSnom V Sacc\tкорпусный пример\tзабивать,забить\n';
 const slots='ConstrIndex\tPlace\tForm\tRole\tRank\tSemClass\n3239\t1\tSnom\tагенс\tСубъект\tлицо\n3239\t2\tSacc\tпациенс\tОбъект\tнеодушевленный\n';
 const out=framebankProposals(dict,slots,[{id:'z',lemma:'забивать'}]);
 assert.equal(out.length,1);assert.equal(out[0].slots.length,2);assert(!JSON.stringify(out).includes('корпусный пример'));
});
test('Wikidata only matches explicitly reviewed unique QIDs',()=>{
 const entities={entities:{Q1:{claims:{P279:[{rank:'normal',mainsnak:{datavalue:{value:{id:'Q2'}}}},{rank:'deprecated',mainsnak:{datavalue:{value:{id:'Q3'}}}}]}}}};
 const out=wikidataProposals(entities,[{qid:'Q1',entry_id:'z'},{qid:'Q2',entry_id:'class'},{qid:'Q3',entry_id:'wrong'}]);
 assert.equal(out.length,1);assert.equal(out[0].object_id,'class');assert.equal(out[0].review_status,'suggested');
 assert.equal(wikidataProposals(entities,[{qid:'Q1',entry_id:'z'},{qid:'Q2',entry_id:'class'},{qid:'Q2',entry_id:'other'}]).length,0);
});
test('Duplicate proposals collapse deterministically',()=>{
 const a={source:'framebank',source_record_id:'1',entry_id:'x'};
 assert.equal(dedupe([a,{...a}]).length,1);
});

test('cached linguistic proposals use canonical module source without a monolith',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'linguistic-source-'));
 const store=require('../scripts/library-store.cjs');
 const db={schema_version:2,entries:[{id:'v1',lemma:'играть',kind:'word'}],categories:[],relations:[]};
 const master=path.join(root,'outputs/library-v2.json'),modules=path.join(root,'outputs/library-modules');
 try{
  fs.mkdirSync(path.dirname(master),{recursive:true});
  fs.mkdirSync(path.join(root,'editorial'));
  fs.mkdirSync(path.join(root,'.cache/linguistic-sources'),{recursive:true});
  fs.writeFileSync(path.join(root,'.cache/linguistic-sources/constructicon-database.csv'),'ID Number,Anchor words\n1,играть\n');
  fs.writeFileSync(master,store.snapshot(db));
  await assert.rejects(()=>collect({source:'constructicon',root}),/Canonical source policy required/);
  store.create(modules,db);
  fs.writeFileSync(path.join(root,'editorial/library-source-mode.json'),JSON.stringify({version:1,mode:'modules',directory:'outputs/library-modules'}));
  await assert.rejects(()=>collect({source:'constructicon',root}),/Two potential/);
  fs.unlinkSync(master);
  const modular=await collect({source:'constructicon',root});
  assert.equal(modular.library_source.mode,'modules');

  assert.equal(modular.records[0].entry_id,'v1');
  assert.equal(modular.records[0].usable_for_generation,false);
  assert.equal(store.load(modules).source_sha256,modular.library_source.sha256);
  assert(!fs.existsSync(master));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
