#!/usr/bin/env node
'use strict';
// Add only the still-missing words from the public noun batch to master V2.
// Existing canonical words and IDs are kept verbatim.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const file='outputs/library-v2.json';
const d=JSON.parse(fs.readFileSync(file,'utf8'));
const manifest=JSON.parse(fs.readFileSync('outputs/nouns-public-20261109.json','utf8'));
const revision='public-nouns-sync-20261109-v1';
if(d.provenance.public_noun_additions_20261109?.revision===revision){
 console.log('Public noun additions already applied');process.exit(0);
}
assert.equal(manifest.entries.length,100);
const byLemma=new Map(d.entries.map(e=>[e.lemma.toLowerCase(),e]));
const byId=new Set(d.entries.map(e=>e.id));
const categories=new Set(d.categories.map(e=>e.path));
const allowed=new Set([100,70,50,30,20,10]);
let created=0,newCategories=0;
for(const e of manifest.entries){
 const known=byLemma.get(e.lemma.toLowerCase());
 if(known){
  assert.equal(known.id,e.id,'Public/canonical ID drift: '+e.lemma);
  continue;
 }
 assert(!byId.has(e.id),'ID collision '+e.id);
 assert(allowed.has(e.base_weight));
 for(const path of e.categories){
  if(categories.has(path))continue;
  const pieces=path.split('/');
  const parent_paths=pieces.slice(0,-1).map((_,i)=>pieces.slice(0,i+1).join('/'));
  assert(parent_paths.every(p=>categories.has(p)),'Unknown category ancestor '+path);
  d.categories.push({path,parent_paths}); categories.add(path);newCategories++;
 }
 const entry={
  id:e.id,lemma:e.lemma,language:'ru',meaning:e.meaning||null,kind:'word',
  selection:{base_weight:e.base_weight,scope:'general',weight_source:'public_noun_expansion_editorial_20261109'},
  categories:e.categories.map(path=>({path,default_selection:true})),
  phonetic_tags:{status:'pending_automatic_analysis',data:null},
  morphology:{status:'pending_automatic_analysis',data:null},
  illustrations:{policy:null,planned_variants:null,art_status:'not_assigned',senses:[]},
  metadata_completion:{speech:'pending_automatic_analysis',forms:'pending_automatic_analysis',lexical:'editorial_draft'},
  legacy_source:null,
  editorial:{source:'public_noun_expansion_20261109',status:'suggested',
   note:'Редакторские категория и вес; фонетика, грамматические формы и иллюстрации требуют проверки.'},
  part_of_speech:'noun',lexical_eligible_by_default:true
 };
 d.entries.push(entry);byId.add(e.id);byLemma.set(e.lemma.toLowerCase(),entry);created++;
}
assert.equal(created,49,'Expected to add 49 still-missing canonical nouns');
d.categories.sort((a,b)=>a.path.localeCompare(b.path,'ru'));
d.provenance.public_noun_additions_20261109={revision,date:'2026-11-09',created,category_count:newCategories,
 note:'100 new public nouns: 51 already in V2 and 49 appended here. Previously published-only image cards kept in gh-pages.'};
fs.writeFileSync(file,JSON.stringify(d,null,2)+'\n');
console.log('Added '+created+' canonical nouns and '+newCategories+' categories');
