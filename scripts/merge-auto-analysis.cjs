#!/usr/bin/env node
'use strict';
/**
 * Copy machine-generated *candidates* into the canonical V2 cards.
 *
 * Never overwrite manually curated fields. A candidate is not a verified fact:
 * no wordform is enabled for exercises and no semantic relation is inferred.
 * Run after analyze-pending-words.py and annotate-analysis.cjs.
 */
const fs=require('node:fs');
const assert=require('node:assert/strict');

const LIB='outputs/library-v2.json';
const PROPOSALS='outputs/library-v2-auto-analysis.json';
const REPORT='outputs/METADATA_ENRICHMENT.md';
const d=JSON.parse(fs.readFileSync(LIB,'utf8'));
const analysis=JSON.parse(fs.readFileSync(PROPOSALS,'utf8'));
assert(Array.isArray(d.entries)&&Array.isArray(d.relations));
assert(Array.isArray(analysis.entries)&&analysis.status==='DRAFT_ONLY_NOT_APPROVED');
const byId=new Map(analysis.entries.map(x=>[x.id,x]));
assert.equal(byId.size,analysis.entries.length,'Duplicate analysis IDs');
const allIds=new Set(d.entries.map(x=>x.id));
assert.equal(allIds.size,d.entries.length,'Duplicate library IDs');
for(const id of byId.keys())assert(allIds.has(id),'Unknown analysis ID '+id);

const stat={words:d.entries.length,phonetic_candidates:0,morphology_candidates:0,
 phonetic_needs_review:0,morphology_needs_review:0,
 protected_curated:0,not_applicable:0,unreviewed_semantic_relations:0};
const unresolved=[],risks=[];
const safe=s=>typeof s==='string'&&s.length>0;
const canon=s=>String(s||'').normalize('NFC').toLocaleLowerCase('ru').trim();
const expectedPOS=e=>{
 const p=e.part_of_speech||e.legacy_source?.raw?.part_of_speech;
 return ({noun:'NOUN',verb:'INFN',adjective:'ADJF'})[p]||null;
};
const wordlike=e=>e.kind!=='digit'&&e.kind!=='country';
function storeIssue(entry,field,reason){
 entry.metadata_completion??={};
 const target=field==='phonetic'?'phonetic_tags':'morphology';
 const holder=entry[target];
 holder.analysis_issue=String(reason||'requires_manual_review');
 unresolved.push({lemma:entry.lemma,field,reason:holder.analysis_issue});
 stat[field+'_needs_review']++;
}
function filteredForms(m){
 const out={};
 for(const [key,val] of Object.entries(m.forms||{})){
  if(safe(val))out[key]=val;
 }
 return out;
}
for(const e of d.entries){
 const pendingPh=['pending_automatic_analysis','automatic_candidate_needs_review'].includes(e.phonetic_tags?.status);
 const pendingMorph=['pending_automatic_analysis','automatic_candidate_needs_review'].includes(e.morphology?.status);
 if(!pendingPh&&!pendingMorph){stat.protected_curated++;continue;}
 if(!wordlike(e)){stat.not_applicable++;continue;}
 const legacy=Boolean(e.legacy_source?.raw);
 const a=byId.get(e.id);
 if(!a||canon(a.lemma)!==canon(e.lemma)){
  if(pendingMorph)storeIssue(e,'morphology','no_current_analysis');
  if(pendingPh)storeIssue(e,'phonetic','no_current_analysis');
  continue;
 }
 const meta=e.metadata_completion??={};
 if(pendingMorph){
  const m=a.morphology||{};
  if(m.status==='candidate_needs_review'&&safe(m.lemma)&&safe(m.tag)){
   const base=(e.morphology.data&&typeof e.morphology.data==='object')?structuredClone(e.morphology.data):{};
   const expected=expectedPOS(e);
   const actual=m.part_of_speech;
   const posMatches=!expected||(expected==='INFN'?['INFN','VERB'].includes(actual):
     expected==='ADJF'?['ADJF','ADJS'].includes(actual):actual===expected);
   const lemmaMatches=canon(m.lemma)===canon(e.lemma);
   const suppliedGender=base.gender;
   const machineGender=/\bmasc\b/.test(m.tag)?'м':/\bfemn\b/.test(m.tag)?'ж':/\bneut\b/.test(m.tag)?'ср':null;
   const genderConflict=suppliedGender&&machineGender&&suppliedGender!==machineGender;
   const flags=[
    ...(m.ambiguous?['homograph_or_ambiguous_analysis']:[]),
    ...(!lemmaMatches?['lemma_differs_from_card']:[]),
    ...(!posMatches?['part_of_speech_conflict']:[]),
    ...(genderConflict?['editorial_gender_conflict']:[]),
    ...(base.lemma_number?['grammatical_number_must_be_confirmed']:[]),
    ...(m.countability_unverified?['countability_unverified']:[])
   ];
   base.automatic_proposal={
    source:'pymorphy3',status:'suggested',usable_for_generation:false,
    lemma:m.lemma,part_of_speech:actual,grammemes:m.tag,score:m.score,
    forms:filteredForms(m),flags
   };
   if(legacy){(e.machine_analysis??={}).morphology=base.automatic_proposal;}
   else e.morphology.data=base;
   e.morphology.status='automatic_candidate_needs_review';
   meta.forms='automatic_candidate_needs_review';
   stat.morphology_candidates++;
   if(flags.some(x=>x!=='countability_unverified'))risks.push({lemma:e.lemma,id:e.id,field:'forms',flags});
  }else storeIssue(e,'morphology',m.reason||m.status||'unrecognized_analysis');
 }
 if(pendingPh){
  const p=a.phonetic||{};
  const tokens=p.sound_tokens;
  const vowels=new Set(['а','о','у','ы','э','и']);
  const valid=Array.isArray(tokens)&&tokens.length>0&&tokens.every(t=>
    typeof t==='string'&&/^[а-яё](?:')?$/u.test(t)&&t!=='V');
  const syll=valid?tokens.filter(t=>vowels.has(t)).length:0;
  const consistent=valid&&syll>0&&syll===p.syllables&&
   Number.isInteger(p.stress_syllable)&&p.stress_syllable>=1&&p.stress_syllable<=syll;
  if(p.status==='candidate_needs_review'&&consistent){
   const base=(e.phonetic_tags.data&&typeof e.phonetic_tags.data==='object')?structuredClone(e.phonetic_tags.data):{};
   assert(!Array.isArray(base.sound_tokens)||base.sound_tokens.length===0||e.phonetic_tags?.status==='automatic_candidate_needs_review','Do not replace manually provided phonemes '+e.id);
   base.sound_tokens=tokens;
   base.stress_syllable=p.stress_syllable;
   base.stressed_vowel=p.stressed_vowel||null;
   base.syllable_count=syll;
   // Cluster runs and letter alignment are derived by sound-index.cjs, not duplicated in V2.
   delete base.clusters;
   delete base.occurrences;
   base.markova_type_candidate=p.markova_type_proposal??null;
   base.automatic_proposal={
    source:'nsu-ai/russian_g2p',status:'suggested',
    accented:p.accented||null,
    usable_for_automatic_target_selection:'only_letter_aligned_and_not_before_soft_consonant',
    not_methodically_verified:true
   };
   if(legacy){
    (e.machine_analysis??={}).phonetic={
     source:'nsu-ai/russian_g2p',status:'suggested',sound_tokens:tokens,
     stress_syllable:p.stress_syllable,syllable_count:syll,
     stressed_vowel:p.stressed_vowel||null,
     markova_type_candidate:p.markova_type_proposal??null,
     accented:p.accented||null,usable_for_generation:false
    };
   }else e.phonetic_tags.data=base;
   e.phonetic_tags.status='automatic_candidate_needs_review';
   meta.speech='automatic_candidate_needs_review';
   stat.phonetic_candidates++;
  }else storeIssue(e,'phonetic',p.reason||(!consistent?'invalid_or_incomplete_phoneme_sequence':p.status));
 }
}
for(const rel of d.relations){
 if(rel.approval?.status==='suggested')stat.unreviewed_semantic_relations++;
}
const unresolvedByField=unresolved.reduce((z,x)=>(z[x.field]=(z[x.field]||0)+1,z),{});
d.provenance.metadata_enrichment_20261109={
 revision:'source-tagged-auto-candidates-v1',source:'pymorphy3 + nsu-ai/russian_g2p',
 status:'unverified_machine_candidates',no_changes_to_curated_entries:true,
 phonetic_candidates:stat.phonetic_candidates,morphology_candidates:stat.morphology_candidates,
 phonetic_needs_review:stat.phonetic_needs_review,morphology_needs_review:stat.morphology_needs_review,
 semantic_relations_added:0
};
fs.writeFileSync(LIB,JSON.stringify(d,null,2)+'\n');
const lines=[
 '# Заполнение недостающих сведений библиотеки',
 '',
 'Автоматически сформированные **предложения** добавлены непосредственно в карточки V2,',
 'но не объявлены проверенными. Проверенные ранее редакторские данные не заменялись.',
 'Формы находятся в `morphology.data.automatic_proposal.forms`; у исторических',
 'карточек — в `machine_analysis.morphology.forms`. Тип парадигмы хранится',
 'в `grammemes`. Звуки — в `phonetic_tags.data.sound_tokens`; у исторических',
 'карточек — в `machine_analysis.phonetic.sound_tokens`. Все они имеют статус',
 '`automatic_candidate_needs_review`. Индексы вхождений звуков и стечения',
 'вычисляются из фонем, а не дублируются в каждой карточке. Генератор не использует',
 'непроверенные словоформы; целевые звуки допускаются только при точном соответствии',
 'исходной букве и отсутствии запретного контекста перед мягким согласным.',
 '',
 '## Сводка',
 '',
 ...Object.entries(stat).map(([k,v])=>'- '+k+': '+v),
 '',
 'Не добавлялись автоматически родо-видовые, часть–целое, антонимические и',
 'ролевые связи из тезаурусов: совпадение слова не доказывает совпадение значения.',
 'Действующие связи сохраняются в `relations` (двунаправленное представление',
 'выводится по типу отношения), кандидаты глагольных моделей — в',
 '`speech_frame_candidates`. Для новых связей необходим выбор значения и проверка',
 'типичности; материалы RuWordNet имеют дополнительные лицензионные ограничения.',
 '',
 '## Требуют ручного разбора (первые 100)',
 '',
 ...risks.slice(0,100).map(x=>'- '+x.lemma+' ['+x.field+']: '+x.flags.join(', ')),
 '',
 '## Не обработаны автоматически (первые 100)',
 '',
 ...unresolved.slice(0,100).map(x=>'- '+x.lemma+' ['+x.field+']: '+x.reason),
 '',
 'Полный список статусов сохраняется в соответствующих карточках. Причины',
 'недостатка данных **не заменяются выдуманными ответами**.',
 ''
];
fs.writeFileSync(REPORT,lines.join('\n'));
console.log(JSON.stringify({stat,unresolvedByField,risk_cases:risks.length,relation_count:d.relations.length},null,2));
