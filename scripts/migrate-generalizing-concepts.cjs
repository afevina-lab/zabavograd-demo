#!/usr/bin/env node
'use strict';
// Approved generalizing concepts (2026-11-14).
// Run: node scripts/migrate-generalizing-concepts.cjs
// Re-running is safe; existing entry IDs, meanings, and semantic links remain intact.
const fs=require('node:fs');
const path='outputs/library-v2.json';
const db=JSON.parse(fs.readFileSync(path,'utf8'));
const target='Обобщающие понятия';
const forms=new Map(Object.entries({
 'рыба':'рыбы','продукты':'продукты','фрукт':'фрукты',
 'игрушка':'игрушки','транспорт':'транспорт','человек':'люди',
 'дерево':'деревья','цветок':'цветы','растение':'растения',
 'овощ':'овощи','ягода':'ягоды','гриб':'грибы',
 'животное':'животные','птица':'птицы','насекомое':'насекомые',
 'мебель':'мебель','посуда':'посуда','одежда':'одежда',
 'обувь':'обувь','игра':'игра'
}));
const updated=[];
for(const e of db.entries){
 if(!forms.has(e.lemma))continue;
 if(e.lemma==='цветок'&&e.meaning?.includes('часть растения'))continue;
 const original=e.generalization?.related_category_paths || e.categories.map(c=>c.path);
 e.generalization={
  ...(e.generalization||{}),
  is_generalizing_word:true,
  base_form:e.lemma,
  default_lexical_form:forms.get(e.lemma),
  form_source:'approved_editorial_20261114',
  related_category_paths:original,
  lexical_drill_excluded:true
 };
 e.categories=[{path:target,default_selection:false}];
 e.lexical_eligible_by_default=false;
 updated.push(e.lemma);
}
if(updated.length!==forms.size)throw Error('Missing or ambiguous concepts: '+[...forms.keys()].filter(w=>!updated.includes(w)).join(', '));
if(!db.categories.some(c=>c.path===target))db.categories.push({path:target,parent_paths:[]});
const ids=db.entries.map(e=>e.id);
if(new Set(ids).size!==ids.length)throw Error('Duplicate word IDs');
const valid=new Set(ids);
for(const r of db.relations.filter(r=>r.type==='is_a')){
 if(!valid.has(r.child?.id)||!valid.has(r.parent?.id))throw Error('Broken relation '+r.id);
}
fs.writeFileSync(path,JSON.stringify(db,null,2)+'\n');
console.log('Migrated '+updated.length+' approved generalizing concepts; IDs and relations preserved.');
