#!/usr/bin/env node
'use strict';
/**
 * One-time value reconciliation after ID-level consolidation.
 * Preserve all 1,899 immutable source IDs, but route images from
 * 12 exact-meaning duplicates to the existing editorial word.
 * Leave the 13th same-label pair ("кость") separate: different meanings.
 */
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const save=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
const db=read('outputs/library-v2.json'), reg=read('outputs/image-library.json');
const aliases=db.entries.filter(e=>e.selection?.weight_source==='public_release_consolidation_20261112');
const originals=db.entries.filter(e=>e.selection?.weight_source!=='public_release_consolidation_20261112');
assert.equal(aliases.length,25);
assert.equal(new Set(db.entries.map(e=>e.id)).size,1899);
const registry=new Map(reg.senses.map(s=>[s.id,s]));
let matched=0,linked=0;
const ambiguous=[];
for(const alias of aliases){
 const exact=originals.filter(e=>e.lemma===alias.lemma &&
  (e.meaning||null)===(alias.meaning||null) && e.kind===alias.kind);
 if(exact.length>1){ambiguous.push({id:alias.id,lemma:alias.lemma,count:exact.length});continue}
 if(exact.length===0)continue;
 const canonical=exact[0];
 const variants=(alias.illustrations?.senses||[]).flatMap(s=>s.variants||[]);
 assert(variants.length>0,'No approved published image for matching ID '+alias.id);
 alias.same_lexical_meaning_as=canonical.id;
 alias.editorial??={};
 alias.editorial.alias_explanation='Совпадающее значение; исходный публичный ID и WebP сохранены; для автоматической выдачи используется редакторская карточка.';
 canonical.illustrations??={policy:'illustration_planned',senses:[]};
 canonical.illustrations.senses??=[];
 const id=canonical.id+'-published-alias-'+alias.id;
 if(!canonical.illustrations.senses.some(s=>s.id===id)){
  const sense={id,word_id:canonical.id,label:canonical.lemma,
   meaning:canonical.meaning||canonical.lemma,topic:null,subcategory:null,
   variants:variants.map(v=>({...v,source_alias_id:alias.id}))};
  canonical.illustrations.senses.push(sense);
  assert(!registry.has(id),'Image sense collision '+id);
  reg.senses.push(structuredClone(sense));registry.set(id,sense);linked++;
 }
 matched++;
}
assert.deepEqual(ambiguous,[],'Ambiguous duplicates must be reviewed');
assert.equal(matched,12,'Review changed same-value matches before publication');
assert.equal(linked,12,'Expected 12 original images to be linked to editorial records');
const bone=aliases.find(x=>x.lemma==='кость');
assert(bone?.meaning==='кость для собаки' && !bone.same_lexical_meaning_as,
 'Dog bone and anatomical bone must remain separate meanings');
db.provenance.public_value_reconciliation_20261112={
 exact_meaning_aliases:matched,original_public_ids_retained:25,
 images_added_to_editorial_values:linked,
 dog_bone_meaning_kept_separate:true,
 rule:'Exact lemma, sense and kind only; other homographs need explicit approval.'};
save('outputs/library-v2.json',db);save('outputs/image-library.json',reg);
console.log(JSON.stringify({result:'PASS',ids:db.entries.length,aliases:matched,
  canonical_image_links:linked,distinct_bone_sense:bone.id}));
