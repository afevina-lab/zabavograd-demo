'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {convert,validateCandidates,importJsonl}=require('../scripts/import-multilingual-kaikki.cjs');
const meta={sourceUrl:'https://kaikki.org/dictionary/',license:'CC BY-SA 4.0 (verify against selected source dump)',retrievedAt:'2026-11-22'};
test('supports all four languages with isolated suggested senses',()=>{
 for(const [lang,word] of [['en','cat'],['fr','chat'],['es','gato'],['de','Katze']]){
  const e=convert({lang_code:lang,word,pos:'noun',senses:[{glosses:['animal']}],forms:[{form:word+'s',tags:['plural']}],sounds:[{ipa:'/test/'}]},meta);
  assert.equal(e.language,lang);assert.equal(e.review_status,'suggested');
  assert.equal(e.meanings[0].links.length,0);assert.equal(e.forms[0].review_status,'suggested');
  assert.equal(e.pronunciations[0].review_status,'suggested');
 }
});
test('does not equate meanings solely by identical spelling',()=>{
 const row={lang_code:'en',word:'bat',pos:'noun',senses:[{glosses:['flying mammal']},{glosses:['sports implement']}]};
 const e=convert(row,meta);
 assert.equal(e.meanings.length,2);assert.notEqual(e.meanings[0].sense_id,e.meanings[1].sense_id);
 assert.deepEqual(e.meanings.map(s=>s.links),[[],[]]);
});
test('skips unsupported languages and POS',()=>{
 assert.equal(convert({lang_code:'ru',word:'кошка',pos:'noun',senses:[{}]},meta),null);
 assert.equal(convert({lang_code:'en',word:'cat',pos:'suffix',senses:[{}]},meta),null);
});
test('post-processing merges duplicate lemma POS without approving records',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'zabavograd-multi-'));
 const file=path.join(folder,'sample.jsonl');
 try{
  fs.writeFileSync(file,[
   {lang_code:'en',word:'bat',pos:'noun',senses:[{glosses:['animal']}]},
   {lang_code:'en',word:'bat',pos:'noun',senses:[{glosses:['sport equipment']}]},
   {lang_code:'fr',word:'chat',pos:'noun',senses:[{glosses:['animal']}]},
   {lang_code:'xx',word:'bad',pos:'noun',senses:[{glosses:['skip']}]}
  ].map(x=>JSON.stringify(x)).join('\\n'));
  const {result,report}=await importJsonl(file,meta);
  assert.equal(report.staged,2);assert.equal(report.approved,0);
  assert.equal(result.records.find(e=>e.lemma==='bat').meanings.length,2);
  assert.equal(validateCandidates(result),true);
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('refuses unlicensed data and invented approved links',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'zabavograd-multi-'));
 const file=path.join(folder,'one.jsonl');
 try{
  fs.writeFileSync(file,JSON.stringify({lang_code:'de',word:'Haus',pos:'noun',senses:[{glosses:['house']}]}));
  await assert.rejects(importJsonl(file,{...meta,license:''}));
  const {result}=await importJsonl(file,meta);
  result.records[0].meanings[0].links.push({relation:'exact',target:{library_entry_id:'fake'},review_status:'verified'});
  assert.throws(()=>validateCandidates(result));
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
