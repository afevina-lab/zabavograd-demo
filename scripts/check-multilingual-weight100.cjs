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
  assert.deepEqual(Object.keys(p.language_details||{}).sort(),['de','en','es','fr']);
  for(const lang of ['en','fr','es','de']){
   const detail=p.language_details[lang];
   assert.equal(detail.part_of_speech,'noun');
   assert(['suggested','partial','not_imported'].includes(detail.morphology_status));
   assert(['suggested','not_imported'].includes(detail.pronunciation_status));
   if(detail.morphology_status==='suggested'||detail.morphology_status==='partial'){
    assert.equal(detail.feature_review_status,'suggested');
    if(detail.morphology_status==='suggested')assert(typeof detail.indefinite_article_form==='string'&&detail.indefinite_article_form);
    if(detail.morphology_status==='partial')assert(typeof detail.citation_form==='string'||typeof detail.indefinite_article_form==='string','Partial paradigm needs a citation or article form');
    if(detail.morphology_status==='suggested')assert(typeof detail.plural_form==='string'&&detail.plural_form);
    assert(lang==='en'?detail.grammatical_gender===null:(detail.morphology_status==='partial'&&detail.grammatical_number==='plural'&&detail.grammatical_gender===null)||['m','f','n'].includes(detail.grammatical_gender));
   }
   for(const pronunciation of detail.pronunciations){
    assert.equal(pronunciation.review_status,'suggested');
    assert(pronunciation.ipa&&pronunciation.source?.startsWith('https://'));
   }
  }
 }
 assert.equal(reviewIds.size,live.length,'Unfilled weight-100 Russian entries');
 for(const e of live)assert(reviewIds.has(e.id),'Missing weight-100 Russian ID '+e.id);
 const byId=new Map(proposals.records.map(p=>[p.library_entry_id,p]));
 const animals=byId.get('ru-new-20261102-0321');
 const devices=byId.get('ru-new-20261102-0322');
 assert(animals&&devices,'Missing distinct mouse senses');
 assert.notEqual(animals.translations.en,devices.translations.en,'Mouse senses were collapsed');
 assert.equal(byId.get('ru-gen-20261104-furniture')?.translations.fr,'mobilier','Furniture must retain collective sense');
 assert.equal(byId.get('ru-sense-20261105-kist-tool')?.translations.en,'paintbrush','Painting brush must not be mapped to hand');
 // Targeted safeguards for previous false friends and mass-noun article errors.
 const get=(lemma,lang)=>proposals.records.find(p=>p.ru_lemma===lemma)?.language_details?.[lang];
 for(const [lemma,lang] of [['мебель','en'],['посуда','en'],['посуда','fr'],['зубная паста','en'],['мыло','en'],['шампунь','en']]){
  const detail=get(lemma,lang);
  assert(detail,'Missing audited word '+lemma+' '+lang);
  assert(!detail.indefinite_article_form,'Invalid indefinite article on mass noun '+lemma+' '+lang);
  assert.equal(detail.morphology_status,'partial','Countability not represented: '+lemma+' '+lang);
 }
 assert.equal(get('мебель','de')?.citation_form,'die Möbel','German collective furniture must be plural');
 assert.equal(get('мебель','de')?.grammatical_number,'plural');
 assert.equal(get('посуда','fr')?.citation_form,'la vaisselle');
 assert.equal(get('птица','es')?.grammatical_gender,'f');
 assert.equal(get('птица','es')?.indefinite_article_form,'un ave');

 return {weight100:live.length,reviewProposals:reviewIds.size,languageProposals:reviewIds.size*4};
}
if(require.main===module)console.log('PASS multilingual weight-100:',validate(read('editorial/review/multilingual-weight100-manifest.json'),read('editorial/review/multilingual-weight100-proposals.json'),read('outputs/library-v2.json')));
module.exports={validate};
