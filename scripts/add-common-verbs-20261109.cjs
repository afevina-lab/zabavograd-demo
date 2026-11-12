#!/usr/bin/env node
'use strict';
/**
 * Однократное, идемпотентное авторское пополнение частотных глаголов.
 * Сохраняет существующие ID, значения, изображения и связи.
 * Не импортирует чужие лингвистические таблицы.
 */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path='outputs/library-v2.json';
const db=JSON.parse(fs.readFileSync(path,'utf8'));
const revision='verbs-20261109-v1';
if(db.provenance.action_lexicon?.revision===revision){
 console.log('Already applied: '+revision); process.exit(0);
}
assert.equal(db.entries.length,1290,'Unexpected source length: re-audit before applying');
const groups=[
  [
    "Действия/Движение и положение тела/Передвижение",
    "идти100 ходить100 бежать100 бегать100 гулять100 ехать100 ездить70 лететь70 летать70 плыть70 плавать70 ползти70 ползать50 шагать70 прыгать100 скакать50 кататься70 догонять70 убегать70 приходить70 уходить70 входить50 выходить70 подниматься70 спускаться50 торопиться50"
  ],
  [
    "Действия/Движение и положение тела/Положение и движения тела",
    "стоять100 сидеть100 лежать100 садиться100 вставать100 ложиться100 падать70 поворачиваться70 наклоняться50 качаться70 кружиться50 приседать50 тянуться70 подпрыгивать50 топать70"
  ],
  [
    "Действия/Повседневные действия/Действия с предметами",
    "брать100 взять100 держать100 нести100 носить70 давать100 отдавать70 получать70 приносить70 уносить70 передавать70 поднимать100 опускать70 бросать70 кидать70 ловить70 искать100 находить70 терять50 прятать70 доставать100 класть100 ставить100 открывать100 закрывать100 включать70 выключать70 нажимать70 тянуть70 толкать70 двигать70 катить50 катать70 переворачивать70 собирать100 разбирать70 складывать70 упаковывать50 раскладывать70"
  ],
  [
    "Действия/Повседневные действия/Еда и питьё",
    "есть100 кушать70 пить100 жевать70 глотать70 кусать70 откусывать70 пробовать70 угощать70 наливать100 кормить100"
  ],
  [
    "Действия/Повседневные действия/Самообслуживание и гигиена",
    "умываться100 мыться100 купаться100 мыть100 вытираться70 расчёсываться70 расчёсывать70 причёсываться70 чистить100 одеваться100 раздеваться100 обуваться70 разуваться70 надевать100 снимать100 застёгивать70 расстёгивать70 завязывать70 развязывать70 сморкаться50"
  ],
  [
    "Действия/Повседневные действия/Сон и отдых",
    "спать100 засыпать100 просыпаться100 отдыхать70 дремать50 лежать100"
  ],
  [
    "Действия/Речь и общение",
    "говорить100 сказать100 рассказывать100 спрашивать100 отвечать100 звать70 называть70 повторять70 шептать70 кричать70 объяснять70 здороваться100 прощаться70 благодарить70 просить100 разговаривать100 спорить50 молчать70 слушать100"
  ],
  [
    "Действия/Восприятие и внимание",
    "смотреть100 видеть100 слышать100 слушать100 замечать70 рассматривать70 наблюдать50 трогать100 щупать50 нюхать70 чувствовать70 пробовать70"
  ],
  [
    "Действия/Мышление и обучение",
    "думать100 знать100 понимать100 помнить70 забывать70 узнавать70 учить70 учиться100 считать100 сравнивать70 проверять70 решать70 выбирать70 угадывать70 читать100 писать100 запоминать50"
  ],
  [
    "Действия/Эмоции и реакции",
    "радоваться100 смеяться100 улыбаться100 плакать100 бояться100 пугаться70 сердиться70 удивляться70 обижаться50 скучать70 любить100 нравиться70 хотеть100 волноваться50"
  ],
  [
    "Действия/Игры и творчество",
    "играть100 рисовать100 лепить100 клеить70 вырезать70 раскрашивать70 мастерить70 строить70 собирать70 петь100 танцевать100 читать100 писать100 сочинять50 шить50 вязать50 прятаться70 догонять70 ловить70"
  ],
  [
    "Действия/Забота и отношения",
    "помогать100 заботиться70 ухаживать70 обнимать100 целовать70 встречать70 провожать70 дарить70 делиться70 приглашать50 спасать50 дружить100 жалеть50 защищать50 кормить100"
  ],
  [
    "Действия/Природа и растения",
    "расти100 цвести70 сажать100 поливать100 выращивать70 копать70 собирать100 созревать50 рыхлить50 ухаживать70"
  ],
  [
    "Действия/Поведение и голоса животных",
    "лаять100 мяукать100 мычать70 хрюкать70 рычать70 чирикать70 кукарекать70 квакать70 пищать70 клевать70 щипать50 пастись50"
  ],
  [
    "Действия/Изменение состояния и явления",
    "ломаться70 разбиваться70 пачкаться70 намокать70 высыхать70 таять70 замерзать70 гореть70 светить70 течь70 дуть70 шуметь70 болеть70 выздоравливать50 сохнуть70"
  ],
  [
    "Действия/Общие действия",
    "делать100 начинать70 заканчивать70 продолжать50 ждать100 готовиться70 успевать50 пытаться50 мочь100 становиться70 работать100"
  ],
  [
    "Действия/Приготовление пищи",
    "мешать70 резать100 нарезать70 чистить70 солить70 посыпать50 добавлять70 месить50 кипятить70 разливать50 варить100 взбивать70 готовить100 жарить100 запекать70 измельчать50 наливать100 перемешивать70 печь70 раскатывать70 разогревать70 тушить70"
  ],
  [
    "Действия/Уборка",
    "протирать70 мыть100 полоскать70 вытирать100 подметать70 пылесосить70 убирать100 раскладывать70 собирать100 чистить70"
  ],
  [
    "Действия/Стирка и уход за одеждой",
    "зашивать50 пришивать50 отжимать70 развешивать70 складывать70 сушить70 стирать100 гладить70"
  ],
  [
    "Действия/Ремонт",
    "вкручивать50 откручивать50 прибивать70 измерять70 ремонтировать70 приклеивать50 забивать70 закручивать70 пилить70 красить70 ломать70 сверлить70 чинить100 строить100 стучать70"
  ]
];
const parse=s=>s.split(' ').filter(Boolean).map(t=>{
 const m=/^([а-яё-]+?)(100|70|50|30|20|10)$/u.exec(t);
 assert(m,'Bad action '+t);return {lemma:m[1],weight:Number(m[2])};
});
const plan=new Map();
for(const [category,words] of groups){
 for(const {lemma,weight} of parse(words)){
  if(!plan.has(lemma))plan.set(lemma,{weight,categories:[]});
  const item=plan.get(lemma);
  assert(!item.categories.includes(category),'Duplicate action category');
  item.categories.push(category);item.weight=Math.max(item.weight,weight);
 }
}
const existing=new Map(db.entries.filter(e=>e.part_of_speech==='verb'||e.legacy_source?.raw?.part_of_speech==='verb').map(e=>[e.lemma,e]));
assert.equal(existing.size,44);
assert([...existing.keys()].every(lemma=>plan.has(lemma)));
const categoryPaths=new Set(db.categories.map(c=>c.path));
let createdCategories=0;
function ensureCategory(p){
 if(categoryPaths.has(p))return;
 const parent=p.includes('/')?p.slice(0,p.lastIndexOf('/')):null;
 if(parent)ensureCategory(parent);
 db.categories.push({path:p,parent_paths:parent?[parent]:[]});
 categoryPaths.add(p);createdCategories++;
}
for(const [p]of groups)ensureCategory(p);
let reclassified=0;
const broad=new Set(['Действия/Прочее','Действия/Повседневные действия']);
for(const [lemma,e]of existing){
 const p=plan.get(lemma),before=JSON.stringify(e.categories);
 const categories=e.categories.filter(c=>!broad.has(c.path)).map(c=>({...c}));
 for(const category of p.categories)if(!categories.some(c=>c.path===category))
  categories.push({path:category,default_selection:false});
 if(e.categories.some(c=>c.default_selection && broad.has(c.path))){
  const first=categories.find(c=>c.path===p.categories[0]);
  if(first)first.default_selection=true;
 }
 e.categories=categories;
 if(JSON.stringify(categories)!==before)reclassified++;
 e.selection.task_overrides??={};
 e.selection.task_overrides.action_generation=p.weight;
}
const missing=[...plan.keys()].filter(x=>!existing.has(x)).sort((a,b)=>a.localeCompare(b,'ru'));
const idSet=new Set(db.entries.map(e=>e.id));
function add(lemma,weight,categories,meaning=null,id=null,note=null){
 const newId=id||'ru-action-20261109-'+String(db.entries.filter(e=>e.id.startsWith('ru-action-20261109-')).length+1).padStart(4,'0');
 assert(!idSet.has(newId),'Duplicate '+newId);idSet.add(newId);
 db.entries.push({
  id:newId,lemma,language:'ru',meaning,kind:'word',
  selection:{base_weight:0,scope:'general',task_overrides:{action_generation:weight},weight_source:'action_lexicon_editorial_draft_20261109'},
  categories:categories.map(path=>({path,default_selection:false})),
  phonetic_tags:{status:'pending_automatic_analysis',data:null},
  morphology:{status:'pending_automatic_analysis',data:null},
  illustrations:{policy:null,planned_variants:null,art_status:'not_assigned',senses:[]},
  metadata_completion:{speech:'pending_automatic_analysis',forms:'pending_automatic_analysis',lexical:'editorial_draft'},
  legacy_source:null,
  editorial:{source:'Авторская подборка глаголов для Забавограда, 2026-11-09',status:'suggested',
   note:note||'Начальная форма, предварительный педагогический приоритет. Управление, фонетика, словоформы и типичные участники ожидают проверки.'},
  part_of_speech:'verb',lexical_eligible_by_default:false
 });
}
for(let i=0;i<missing.length;i++){
 const lemma=missing[i],p=plan.get(lemma);
 add(lemma,p.weight,p.categories,lemma==='есть'?'принимать пищу':lemma==='мочь'?'быть в состоянии выполнить действие':null,
  'ru-action-20261109-'+String(i+1).padStart(4,'0'));
}
add('гладить',70,['Действия/Забота и отношения'],'поглаживать рукой человека или животное',
 'ru-action-20261109-gladit-stroke','Не смешивать с глажением белья утюгом; отдельное значение.');
const ironing=existing.get('гладить');
if(!ironing.meaning)ironing.meaning='разглаживать одежду или бельё утюгом';
db.generated_at='2026-11-09';
db.provenance.action_lexicon={
 revision,date:'2026-11-09',created:missing.length+1,
 existing_verbs_reclassified:reclassified,existing_verbs_weighted:existing.size,
 new_category_nodes:createdCategories,verb_lemmas:plan.size,verb_senses:plan.size+1,
 priority_field:'selection.task_overrides.action_generation',
 notes:'Педагогическая оценка полезности 100/70/50, НЕ корпусная частотность. Новые глаголы без изображений имеют base_weight=0, пока не утверждены специальные грамматические задания.'
};
assert.equal(db.entries.length,1544);
assert.equal(plan.size,297);
assert.equal(db.entries.filter(e=>e.part_of_speech==='verb').length,298);
assert.equal(new Set(db.entries.map(e=>e.id)).size,db.entries.length);
assert.equal(db.entries.filter(e=>e.legacy_source?.raw).length,409);
assert.equal(db.entries.filter(e=>e.selection.weight_source==='public_reconciliation_20261105').length,301);
for(const e of db.entries)for(const c of e.categories)assert(categoryPaths.has(c.path),'Orphan entry category '+c.path);
const doc=[
 '# Глаголы и дерево действий','',
 '**Редакция:** 9 ноября 2026. **Статус:** словарные карточки внесены, грамматические модели и фонетика ещё не проверены.','',
 '297 лемм, 298 смысловых карточек (два значения «гладить»), 254 новые карточки и 44 существовавших глагола.',
 '',
 'Категории — дерево педагогических **тем**, а не связи \u0060is_a\u0060. Одно действие может относиться к нескольким темам без дублирования записи.','',
 'Приоритеты 100/70/50 — предварительная педагогическая оценка полезности для детских упражнений, а не корпусная частота. Хранятся в \u0060selection.task_overrides.action_generation\u0060. Новые глаголы имеют базовый вес 0 и выключены из обычных предметных заданий без изображений.','',
 'Фреймы управления, роли участников, падежи, предлоги, формы и фонетическую разметку нужно утверждать отдельно. Внешние лингвистические таблицы не копировались.','',
 '## Подгруппы'
];
for(const [p,raw]of groups){doc.push('','### '+p+' ('+parse(raw).length+')','',parse(raw).map(x=>x.lemma+' ('+x.weight+')').join(', ')+'.');}
doc.push('','## Разные значения','',
 '- «Гладить бельё утюгом» — прежняя карточка, уход за одеждой.',
 '- «Гладить кошку рукой» — новая самостоятельная карточка, забота и отношения.','');
fs.writeFileSync(path,JSON.stringify(db,null,2)+'\n');
fs.writeFileSync('outputs/ГЛАГОЛЫ-И-ДЕЙСТВИЯ.md',doc.join('\n'));
console.log('Created',missing.length+1,'records, categories',createdCategories,'previous verbs',existing.size);
