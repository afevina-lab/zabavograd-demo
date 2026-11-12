#!/usr/bin/env node
'use strict';
// One-time, idempotent editorial import. Run after noun/verb enrichment.
const fs=require('node:fs'), assert=require('node:assert/strict');
const filename='outputs/library-v2.json';
const spec=JSON.parse(fs.readFileSync('scripts/data/attribute-lexicon-20261109.json','utf8'));
const db=JSON.parse(fs.readFileSync(filename,'utf8'));
if(db.provenance.attribute_lexicon_20261109){
 console.log('Attribute expansion already present; nothing to repeat.');
 process.exit(0);
}
const byWord=new Map();
for(const e of db.entries)byWord.set(e.lemma,[...(byWord.get(e.lemma)||[]),e]);
const categories=new Set(db.categories.map(c=>c.path));
const originalEntries=db.entries.length, originalRelations=db.relations.length;
const created=[], reused=[], skipped=[];
function nominative(word){
 const stem=word.slice(0,-2),suffix=word.slice(-2),c=stem.slice(-1);
 const special=/[гкхжчшщ]/.test(c), hissing=/[жчшщ]/.test(c);
 assert(['ый','ий','ой'].includes(suffix),'Adjective lemma ending: '+word);
 return {masculine:word,
  feminine:stem+(suffix==='ий'&&!special?'яя':'ая'),
  neuter:stem+(suffix==='ий'?(hissing?'ее':special?'ое':'ее'):'ое'),
  plural:stem+(suffix==='ий'||special?'ие':'ые')};
}
for(const group of spec.groups){
 const root=group.path.split('/')[0];
 if(!categories.has(root)){db.categories.push({path:root,parent_paths:[]});categories.add(root);}
 if(!categories.has(group.path)){db.categories.push({path:group.path,parent_paths:[root]});categories.add(group.path);}
 for(const lemma of group.words){
  const weight=spec.weight_overrides[lemma]||spec.default_priority;
  assert([100,70,50,30,20,10].includes(weight),'Selection priority: '+lemma);
  const hits=byWord.get(lemma)||[], adj=group.part_of_speech==='adjective';
  const task=adj?'attribute_generation':'adverb_generation';
  assert(hits.length<=1,'Ambiguous existing spelling: '+lemma);
  if(hits.length){
   const e=hits[0];
   assert(!e.part_of_speech||e.part_of_speech===group.part_of_speech,'POS mismatch: '+lemma);
   e.part_of_speech=group.part_of_speech;
   e.selection.task_overrides={...(e.selection.task_overrides||{}),[task]:weight};
   if(!e.categories.some(c=>c.path===group.path))e.categories.push({path:group.path,default_selection:false});
   reused.push(e);
   continue;
  }
  const id='ru-attr-20261109-'+String(created.length+1).padStart(3,'0');
  const e={
   id,lemma,language:'ru',meaning:spec.meaning_overrides?.[lemma]||null,kind:'word',
   selection:{base_weight:0,scope:'general',published_weight:1,weight_source:'attribute_editorial_20261109',task_overrides:{[task]:weight}},
   categories:[{path:group.path,default_selection:false}],phonetic_tags:{status:'pending',data:{}},
   morphology:{status:'editorial_draft',data:adj?
    {lemma,part_of_speech:'ADJF',grammemes:'ADJF masc,sing,nomn',agreement:{gender:['masculine','feminine','neuter'],number:['singular','plural'],case:['nominative','genitive','dative','accusative','instrumental','prepositional']},nominative_forms:nominative(lemma),review_status:'editorial_draft',full_inflection:'requires_pymorphy3_and_exception_review',usable_for_generation:false}:
    {lemma,part_of_speech:'ADVB',indeclinable:true,base_form:lemma,review_status:'editorial_draft',comparative_form:'not_assigned',usable_for_generation:false}},
   illustrations:{policy:null,planned_variants:null,art_status:'not_assigned',senses:[]},
   metadata_completion:{speech:'pending',forms:'editorial_draft',lexical:'editorial_draft'},
   legacy_source:null,editorial:{source:'zabavograd_attribute_expansion_20261109',status:'editorial_draft',note:'Лемма и учебное использование отобраны; фонетика и полная парадигма требуют проверки.'},
   part_of_speech:group.part_of_speech,lexical_eligible_by_default:false};
  assert(!db.entries.some(x=>x.id===id),'Duplicate generated ID '+id);
  db.entries.push(e);byWord.set(lemma,[e]);created.push(e);
 }
}
const symmetric=new Set(['antonym','synonym','same_root','contrasts_with']);
const key=(type,a,b)=>type+'|'+(symmetric.has(type)?[a,b].sort().join('|'):a+'|'+b);
const existing=new Set(db.relations.filter(x=>x.subject&&x.object).map(x=>key(x.type,x.subject.id,x.object.id)));
const links=[];
function link(type,name1,name2){
 const aa=byWord.get(name1)||[],bb=byWord.get(name2)||[];
 if(aa.length!==1||bb.length!==1){skipped.push([type,name1,name2,aa.length,bb.length]);return;}
 const [a,b]=[aa[0],bb[0]],k=key(type,a.id,b.id);
 if(a.id===b.id||existing.has(k))return;
 const inverse={antonym:'antonym',same_root:'same_root',typically_has_property:'typical_property_of'}[type];
 assert(inverse,'Unknown relation type '+type);
 const r={id:'semantic-attribute-20261109-'+String(links.length+1).padStart(3,'0'),
  type,subject:{id:a.id,lemma:a.lemma},object:{id:b.id,lemma:b.lemma},inverse_type:inverse,
  approval:{status:'verified',usable_for_generation:true,sense_checked:true,typical_for_children:true,review_method:'independent_explicit_pair',checked_by:'assistant_editorial_pass',human_reviewed:false},
  provenance:{source:'zabavograd_editorial',authorship:'independent',revision:'v2-attribute-relations-20261109-v1',reference:'scripts/data/attribute-lexicon-20261109.json',source_method:'independent_curated_common_lexical_pairs'}};
 db.relations.push(r);links.push(r);existing.add(k);
}
for(const [a,b] of spec.antonyms)link('antonym',a,b);
for(const [a,b] of spec.same_root)link('same_root',a,b);
for(const [a,b] of spec.typical_properties)link('typically_has_property',a,b);
const expected=spec.groups.reduce((n,g)=>n+g.words.length,0);
assert.equal(created.length+reused.length,expected);
assert.equal(new Set(db.entries.map(x=>x.id)).size,db.entries.length);
assert(created.length>170&&links.length>80,'Unexpectedly low import size');
db.provenance.attribute_lexicon_20261109={
 revision:'attributes-20261109-v1',source:'scripts/data/attribute-lexicon-20261109.json',
 created:created.length,reused:reused.length,
 adjectives:created.filter(x=>x.part_of_speech==='adjective').length,
 adverbs:created.filter(x=>x.part_of_speech==='adverb').length,
 created_relations:links.length,skipped_ambiguous_pairs:skipped,
 authorial_review:'assistant_editorial_pass_not_human_verified',
 phonetic_and_full_paradigms:'pending'
};
assert.equal(db.entries.length,originalEntries+created.length);
assert.equal(db.relations.length,originalRelations+links.length);
fs.writeFileSync(filename,JSON.stringify(db,null,2)+'\n');
console.log(JSON.stringify({total_entries:db.entries.length,added:created.length,reused:reused.map(x=>x.lemma),total_relations:db.relations.length,added_relations:links.length,skipped_pairs:skipped},null,2));
