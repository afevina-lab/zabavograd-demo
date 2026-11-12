#!/usr/bin/env node
'use strict';
// Reproducible, independently authored, sense-disambiguated semantic pairs.
// One canonical edge; reverse reading is derived by semantic-review.cjs.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {validateExport}=require('./semantic-review.cjs');
const source='scripts/data/curated-relations-20261109.json';
const lib='outputs/library-v2.json';
const report='outputs/SEMANTIC_RELATIONS_REPORT.md';
const roleReport='outputs/ACTION_ROLE_LINKS_REVIEW.json';
const spec=JSON.parse(fs.readFileSync(source,'utf8'));
const db=JSON.parse(fs.readFileSync(lib,'utf8'));
assert.equal(spec.schema,'zabavograd_curated_relations_v1');
assert.equal(spec.revision,'v2-obvious-relations-20261109-v1');
const oldIds=new Set(db.relations.map(e=>e.id));
const oldGenus=db.relations.filter(e=>e.type==='is_a').length;
const oldFamilies=db.relations.filter(e=>e.type==='animal_family').length;
const byLemma=new Map(),byId=new Map();
for(const e of db.entries){
 assert(!byId.has(e.id),'Duplicate dictionary ID '+e.id);
 byId.set(e.id,e);
 const a=byLemma.get(e.lemma)||[];a.push(e);byLemma.set(e.lemma,a);
}
const inverse={
 part_of:'has_part',antonym:'antonym',contrasts_with:'contrasts_with',
 synonym:'synonym',same_root:'same_root',used_for:'purpose_of',
 made_of:'material_of',made_from:'ingredient_for',produces:'produced_by',
 typically_contains:'typically_found_in',dwells_in:'dwelling_of',form_of:'has_form'
};
const symmetric=new Set(['antonym','contrasts_with','synonym','same_root']);
const pairKey=(type,s,o)=>type+'|'+(symmetric.has(type)?[s,o].sort().join('|'):s+'|'+o);
const pairs=new Set(),desired=new Set();
for(const e of db.relations){
 const sub=e.subject?.id||e.child?.id,ob=e.object?.id||e.parent?.id;
 if(sub&&ob)pairs.add(pairKey(e.type,sub,ob));
}
function resolve(text){
 const [lemma,hint,...rest]=String(text).split('@');
 assert(!rest.length,'Only one sense selector allowed: '+text);
 const all=byLemma.get(lemma)||[];
 const matches=hint?all.filter(e=>
   String(e.meaning||'').toLocaleLowerCase('ru').includes(hint.toLocaleLowerCase('ru'))||
   (e.categories||[]).some(c=>c.path.toLocaleLowerCase('ru').includes(hint.toLocaleLowerCase('ru')))
 ):all;
 assert.equal(matches.length,1,'Expected one exact sense for '+text+'; got '+matches.length);
 return matches[0];
}
const stats={},examples={},newEdges=[];
function add(type,rawS,rawO){
 assert(inverse[type],'Unsupported relationship '+type);
 const s=resolve(rawS),o=resolve(rawO);
 assert.notEqual(s.id,o.id,'Self reference '+type+': '+rawS);
 if(type==='antonym'||type==='synonym'||type==='contrasts_with'){
  const pos=e=>e.part_of_speech||e.legacy_source?.raw?.part_of_speech||null;
  const sp=pos(s),op=pos(o);
  if(sp&&op)assert.equal(sp,op,'Part of speech mismatch in '+type+': '+rawS+'/'+rawO);
 }
 const k=pairKey(type,s.id,o.id);
 desired.add(k);
 if(pairs.has(k))return;
 pairs.add(k);
 const id='semantic-editorial-'+crypto.createHash('sha256').update(k).digest('hex').slice(0,22);
 assert(!oldIds.has(id),'Collision '+id);
 oldIds.add(id);
 const row={
  id,type,subject:{id:s.id,lemma:s.lemma},object:{id:o.id,lemma:o.lemma},
  inverse_type:inverse[type],
  approval:{
   status:'verified',usable_for_generation:true,sense_checked:true,
   typical_for_children:true,review_method:'independent_explicit_pair',
   checked_by:'assistant_editorial_pass',human_reviewed:false
  },
  provenance:{
   source:'zabavograd_editorial',authorship:'independent',
   revision:spec.revision,reference:source,
   source_method:'explicit_named_senses_plus_dictionary_id_check'
  }
 };
 db.relations.push(row);
 newEdges.push(row);
 stats[type]=(stats[type]||0)+1;
 (examples[type]??=[]).push(s.lemma+' — '+type+' → '+o.lemma);
}
for(const [type,raw] of Object.entries(spec.pairs)){
 for(const item of raw.split(';').map(s=>s.trim()).filter(Boolean)){
  const parts=item.split('>');assert.equal(parts.length,2,'Bad pair: '+item);
  add(type,parts[0],parts[1]);
 }
}
for(const line of spec.same_root_groups){
 const group=line.split('|').map(s=>s.trim()).filter(Boolean);
 assert(group.length>=2,'Empty word family '+line);
 const ids=group.map(resolve).map(e=>e.id);
 assert.equal(new Set(ids).size,ids.length,'Duplicate in word family '+line);
 for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++)add('same_root',group[i],group[j]);
}
const retired=db.relations.filter(e=>e.provenance?.revision===spec.revision&&
 !desired.has(pairKey(e.type,e.subject.id,e.object.id)));
if(retired.length){
 const oldCount=db.relations.length;
 db.relations=db.relations.filter(e=>!retired.includes(e));
 assert.equal(db.relations.length,oldCount-retired.length);
}
const curated=db.relations.filter(e=>e.provenance?.revision===spec.revision);
const totals={},allExamples={};
for(const row of curated){
 totals[row.type]=(totals[row.type]||0)+1;
 (allExamples[row.type]??=[]).push(row.subject.lemma+' — '+row.type+' → '+row.object.lemma);
}
const graph=validateExport(db);
assert.equal(db.relations.filter(x=>x.type==='is_a').length,oldGenus);
assert.equal(db.relations.filter(x=>x.type==='animal_family').length,oldFamilies);
assert.equal(db.entries.length,byId.size);
for(const rel of curated){
 const f=graph.by_entry[rel.subject.id]?.find(x=>x.relation_id===rel.id&&x.type===rel.type&&x.target_id===rel.object.id);
 const b=graph.by_entry[rel.object.id]?.find(x=>x.relation_id===rel.id&&x.type===rel.inverse_type&&x.target_id===rel.subject.id);
 assert(f&&b,'Missing direct or reverse traversal for '+rel.id);
 assert.equal(f.direction,'forward');
 assert.equal(b.direction,'inverse');
}
const draftRows=[],draftByEntry={};
function put(id,row){(draftByEntry[id]??=[]).push(row);}
for(const frame of db.speech_frame_candidates||[]){
 if(frame.status!=='suggested'||frame.usable_for_generation!==false)continue;
 const verb=byId.get(frame.verb_id);assert(verb,'Unresolved verb frame '+frame.id);
 for(const role of frame.roles){
  for(const id of role.allowed_entry_ids||[]){
   const participant=byId.get(id);assert(participant,'Unresolved frame participant '+id);
   const item={frame_id:frame.id,verb_id:verb.id,verb:verb.lemma,participant_id:id,
    participant:participant.lemma,role:role.role,grammatical_case:role.case,
    preposition:role.preposition,required:role.required,
    status:'suggested',usable_for_generation:false};
   draftRows.push(item);
   put(verb.id,{target_id:id,relation_type:'action_role',direction:'verb_to_participant',
    frame_id:frame.id,role:role.role,case:role.case,preposition:role.preposition});
   put(id,{target_id:verb.id,relation_type:'participates_in_action',direction:'participant_to_verb',
    frame_id:frame.id,role:role.role,case:role.case,preposition:role.preposition});
  }
 }
}
for(const x of Object.values(draftByEntry))x.sort((a,b)=>a.target_id.localeCompare(b.target_id)||a.frame_id.localeCompare(b.frame_id));
db.provenance.semantic_relations_20261109={
 revision:spec.revision,relation_count:curated.length,by_type:totals,
 original_count:db.relations.length-curated.length,semantic_graph_directionality:'single_fact_two_index_entries',
 word_family_policy:'explicit_transparent_roots_pairwise_complete_groups_not_automatic_suffix_matching',
 action_frame_role_links:draftRows.length,
 human_reviewed:false,
 note:'Assistant-authored and ID-matched simple pairs. Human editorial review of nontrivial relations may still correct them; research-only FrameBank/RuWordNet data not copied.'
};
fs.writeFileSync(lib,JSON.stringify(db,null,2)+'\n');
fs.writeFileSync(roleReport,JSON.stringify({
 schema:'zabavograd_action_roles_draft_v1',
 status:'review_only',source:'speech_frame_candidates',
 count:draftRows.length,rows:draftRows,by_entry:draftByEntry
},null,2)+'\n');
const countPairs=Object.entries(totals).sort((a,b)=>b[1]-a[1]);
const lines=[
 '# Типизированные связи библиотеки — '+spec.revision,'',
 'В основной V2 сохранено '+curated.length+' независимо составленных, проверенных по ID пар.',
 'Один факт хранится **один раз**. Для поиска по карточке экспорт создаёт',
 'обратную запись по роли в `public/semantic-graph.json → by_entry`.',
 'Это не означает, что словоформы или смысловые пары скопированы из чужого словаря.',
 '',
 '## Масштаб','',
 '- Карточек: '+db.entries.length,
 '- Старых отношений: '+(db.relations.length-curated.length),
 '- Новых отношений: '+curated.length,
 '- Всего отношений: '+db.relations.length,
 '- Структурных родовых: '+oldGenus,
 '- Семей животных: '+oldFamilies,
 '- Двусторонних индексных записей только для новых фактов: '+(curated.length*2),
 '- Кандидатов ролевых связей из 55 ранее созданных моделей действий: '+draftRows.length,
 '',
 '## Новые связи по типам','',
 ...countPairs.map(([name,count])=>'- '+name+': '+count),
 '',
 '## Контрольные примеры','',
 ...Object.entries(allExamples).map(([name,rows])=>'- '+name+': '+rows.slice(0,4).join('; ')),
 '',
 '## Правила и ограничения','',
 '- Для омонимов использованы значения и постоянные ID, а не только написание.',
 '- «Однокоренные» — отдельная связь, не грамматические словоформы.',
 '- Действия, инструменты и материалы разделены по типам. Валентные роли из',
 '  `speech_frame_candidates` остаются предложениями, с обратным поиском',
 '  в `outputs/ACTION_ROLE_LINKS_REVIEW.json`. Без проверки они не экспортируются в игру.',
 '- Часть–целое означает типичную составную часть; это не род–вид и не «содержится в».',
 '- «Обычно содержит» — педагогически типичная ситуация, а не обязательный физический факт.',
 '- Полный автоматический вывод **всех возможных** смысловых отношений из словарей',
 '  небезопасен: многозначность и контекст требуют редакторского выбора.',
 '- Проверка пар выполнена ассистентом, а не человеком-редактором. Для спорных',
 '  отношений сохранена возможность отдельной методической корректировки.',
 ''
];
fs.writeFileSync(report,lines.join('\n'));
console.log(JSON.stringify({entries:db.entries.length,old_relations:db.relations.length-curated.length,
 added_this_run:newEdges.length,retired_this_run:retired.length,curated_total:curated.length,counts:totals,total_relations:db.relations.length,
 action_roles_draft:draftRows.length,indexedEntries:Object.keys(graph.by_entry).length},null,2));
