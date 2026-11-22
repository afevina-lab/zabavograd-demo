#!/usr/bin/env node
'use strict';
// Read-only validation for weight-100 multilingual editorial proposals.
// Never changes the canonical library, game exports, or review statuses.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(require('node:path').join(root,p),'utf8'));
function validate(manifest,proposals,canonical){
 assert.equal(manifest.source,'outputs/library-v2.json');
 assert.equal(manifest.filter.base_weight,100);
 assert.equal(manifest.entries.length,manifest.count);
 const live=canonical.entries.filter(e=>e.selection?.base_weight===100);
 assert.equal(manifest.count,live.length,'Stale weight-100 snapshot: regenerate review report');
 const current=new Map(live.map(e=>[e.id,e]));
 const reviewIds=new Set();
 for(const e of manifest.entries){
  const item=current.get(e.id);assert(item,'Missing Russian ID '+e.id);
  assert.equal(e.lemma,item.lemma,'Russian lemma changed');
 }
 assert.deepEqual(proposals.languages,['en','fr','es','de']);
 assert.equal(proposals.review_status,'suggested');
 for(const p of proposals.records){
  assert(!reviewIds.has(p.library_entry_id),'Duplicated proposal for '+p.library_entry_id);
  reviewIds.add(p.library_entry_id);
  const e=current.get(p.library_entry_id);
  assert(e,'Unknown ID '+p.library_entry_id);
  assert.equal(p.ru_lemma,e.lemma);
  assert.equal(p.selection_weight,100);
  assert.equal(p.review_status,'suggested');
  assert.equal(p.source_type,'editorial_translation_proposal_not_external_import');
  const senses=new Set((e.illustrations?.senses||[]).map(s=>s.id));
  for(const id of p.library_sense_ids||[])assert(senses.has(id),'Invalid sense ID '+id);
  assert.deepEqual(Object.keys(p.translations).sort(),['de','en','es','fr']);
  for(const value of Object.values(p.translations))assert(typeof value==='string'&&value.trim(),'Empty translation');
 }
 return {weight100:live.length,reviewProposals:reviewIds.size,languageProposals:reviewIds.size*4};
}
if(require.main===module)console.log('PASS multilingual weight-100:',validate(read('editorial/review/multilingual-weight100-manifest.json'),read('editorial/review/multilingual-weight100-proposals.json'),read('outputs/library-v2.json')));
module.exports={validate};
