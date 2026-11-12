#!/usr/bin/env node
'use strict';
/**
 * Одноразовое расширение общей библиотеки на 100 существительных.
 * Не удаляет и не перестраивает прежние записи, картинки, ID и связи.
 * Фонетику и словоформы оставляет на последующий проверяемый анализ.
 */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const file='outputs/library-v2.json';
const d=JSON.parse(fs.readFileSync(file,'utf8'));
const revision='nouns-20261109-v1';
if(d.provenance.noun_expansion_20261109?.revision===revision){
 console.log('Already applied: '+revision);process.exit(0);
}
const roots={
 clothes:'Человек/Одежда, обувь и аксессуары/Одежда',
 shoes:'Человек/Одежда, обувь и аксессуары/Обувь',
 accessories:'Человек/Одежда, обувь и аксессуары/Аксессуары',
 toys:'Игры, творчество и увлечения/Игрушки',
 sport:'Игры, творчество и увлечения/Спортивный инвентарь',
 music:'Игры, творчество и увлечения/Музыкальные инструменты',
 drinks:'Еда и напитки/Напитки',
 meals:'Еда и напитки/Готовые блюда',
 transport:'Общество и окружающая среда/Транспорт и специальная техника',
 city:'Общество и окружающая среда/Город и село',
 nature:'Природа и окружающий мир/Природные объекты'
};
// Лемма : базовый вес (100/70/50/30/20/10) : род (м/ж/ср/мн).
const groups=[
 ['clothes','платье:100:ср юбка:70:ж брюки:100:мн джинсы:70:мн футболка:100:ж майка:70:ж кофта:100:ж пальто:70:ср плащ:30:м жилет:30:м шапка:100:ж кепка:70:ж комбинезон:50:м пижама:70:ж халат:50:м'],
 ['shoes','ботинок:100:м сапог:100:м туфля:70:ж тапочка:70:ж сандалия:50:ж валенок:30:м кеды:70:мн'],
 ['accessories','варежка:100:ж ремень:50:м заколка:50:ж кошелёк:30:м галстук:30:м очки:70:мн носок:100:м'],
 ['toys','кукла:100:ж мяч:100:м кубик:100:м пирамидка:70:ж погремушка:70:ж юла:50:ж мозаика:50:ж неваляшка:30:ж ведёрко:70:ср матрёшка:70:ж пазл:70:м волчок:30:м'],
 ['sport','скакалка:70:ж обруч:70:м лыжа:70:ж конёк:50:м шлем:50:м клюшка:30:ж'],
 ['music','пианино:70:ср скрипка:50:ж флейта:50:ж саксофон:20:м бубен:50:м гармошка:30:ж балалайка:30:ж'],
 ['drinks','вода:100:ж молоко:100:ср сок:100:м чай:70:м компот:70:м какао:50:ср'],
 ['meals','суп:100:м каша:100:ж салат:70:м омлет:50:м пюре:70:ср котлета:70:ж'],
 ['transport','автомобиль:100:м автобус:100:м поезд:100:м велосипед:100:м самокат:70:м мотоцикл:70:м такси:70:ср самосвал:50:м бульдозер:30:м бетономешалка:30:ж лодка:70:ж вагон:70:м'],
 ['city','улица:100:ж мост:70:м площадь:50:ж остановка:70:ж перекрёсток:50:м парк:70:м магазин:100:м аптека:70:ж больница:70:ж библиотека:50:ж деревня:70:ж ферма:50:ж'],
 ['nature','лес:100:м поле:70:ср луг:50:м река:100:ж песок:100:м море:100:ср холм:30:м водопад:50:м болото:30:ср камень:100:м']
];
const subgroups={
 transport:{
  'Личный транспорт':'автомобиль велосипед самокат мотоцикл',
  'Общественный транспорт':'автобус такси',
  'Железнодорожный транспорт':'поезд вагон',
  'Грузовой транспорт':'самосвал',
  'Строительная техника':'бульдозер бетономешалка',
  'Водный транспорт':'лодка'
 },
 city:{
  'Улицы и общественные пространства':'улица мост площадь остановка перекрёсток парк',
  'Здания и учреждения':'магазин аптека больница библиотека',
  'Сельская местность':'деревня ферма'
 },
 music:{
  'Клавишные':'пианино гармошка',
  'Струнные':'скрипка балалайка',
  'Духовые':'флейта саксофон',
  'Ударные':'бубен'
 }
};
const meaning={
 конёк:'конёк для катания на льду; спортивная обувь',
 обруч:'гимнастический обруч',
 клюшка:'клюшка для игры в хоккей',
 шлем:'защитный спортивный шлем',
 мозаика:'детская игра с цветными деталями',
 волчок:'вращающаяся игрушка',
 ведёрко:'маленькое игрушечное ведро',
 парк:'городской парк',
 площадь:'городская площадь',
 мост:'сооружение для перехода через препятствие',
 остановка:'место остановки общественного транспорта',
 ферма:'сельскохозяйственная ферма',
 вагон:'железнодорожный вагон',
 такси:'автомобиль для перевозки пассажиров по заказу',
 бетономешалка:'машина для приготовления бетонной смеси',
 гармошка:'ручная гармоника',
 салат:'готовое блюдо из нарезанных продуктов',
 какао:'напиток из какао-порошка',
 песок:'сыпучий природный материал',
 камень:'отдельный кусок горной породы'
};
const existingLemmas=new Set(d.entries.map(e=>e.lemma.toLowerCase()));
const existingIds=new Set(d.entries.map(e=>e.id));
const categoryPaths=new Set(d.categories.map(c=>c.path));
const newCategories=[];
const additions=[];
const permitted=new Set([100,70,50,30,20,10]);
function childCategory(group,lemma){
 if(!subgroups[group])return roots[group];
 const pair=Object.entries(subgroups[group]).find(([,words])=>words.split(' ').includes(lemma));
 assert(pair,'Missing subgroup for '+lemma);
 return roots[group]+'/'+pair[0];
}
function ensureCategory(path){
 if(categoryPaths.has(path))return;
 const parts=path.split('/');
 const parents=parts.slice(0,-1).map((_,i)=>parts.slice(0,i+1).join('/'));
 assert(parents.every(p=>categoryPaths.has(p)),'Missing category ancestor for '+path);
 d.categories.push({path,parent_paths:parents});
 categoryPaths.add(path);
 newCategories.push(path);
}
for(const [group,line] of groups){
 for(const token of line.split(' ')){
  const [lemma,weightText,genderCode]=token.split(':');
  const weight=Number(weightText);
  assert(lemma && permitted.has(weight) && ['м','ж','ср','мн'].includes(genderCode),'Bad noun '+token);
  assert(!existingLemmas.has(lemma.toLowerCase()),'Already in library '+lemma);
  existingLemmas.add(lemma.toLowerCase());
  const category=childCategory(group,lemma);
  ensureCategory(category);
  const paths=[category];
  if(lemma==='мяч')paths.push(roots.sport);
  if(lemma==='носок')paths.push(roots.clothes);
  if(lemma==='шлем')paths.push(roots.accessories);
  const id='ru-noun-20261109-'+String(additions.length+1).padStart(4,'0');
  assert(!existingIds.has(id),'Already in library ID '+id);
  existingIds.add(id);
  assert(paths.every(p=>categoryPaths.has(p)),'Unknown category for '+lemma);
  const morphology={gender:genderCode==='мн'?null:genderCode,review_status:'suggested',
   notes:['Полные словоформы требуют автоматического анализа и проверки.']};
  if(genderCode==='мн')morphology.lemma_number=lemma==='кеды'?'plural_form':'plural_only';
  additions.push({
   id,lemma,language:'ru',meaning:meaning[lemma]||null,kind:'word',
   selection:{base_weight:weight,scope:'general',weight_source:'noun_expansion_editorial_20261109'},
   categories:paths.map(path=>({path,default_selection:true})),
   phonetic_tags:{status:'pending_automatic_analysis',data:null},
   morphology:{status:'pending_automatic_analysis',data:morphology},
   illustrations:{policy:null,planned_variants:null,art_status:'not_assigned',senses:[]},
   metadata_completion:{speech:'pending_automatic_analysis',lexical:'editorial_draft',
    forms:'pending_automatic_analysis',prepositions:'pending',descriptions:'pending'},
   legacy_source:null,
   editorial:{source:'noun_expansion_20261109',status:'suggested',
    note:'Тематическая классификация и веса — редакционная подготовка. Формы, фонетика и иллюстрации ожидают проверки.'},
   part_of_speech:'noun',lexical_eligible_by_default:true
  });
 }
}
assert.equal(additions.length,100,'Expected 100 unique nouns');
assert.equal(newCategories.length,4,'Expected exactly four useful new subcategories');
d.entries.push(...additions);
d.categories.sort((a,b)=>a.path.localeCompare(b.path,'ru'));
d.provenance.noun_expansion_20261109={
 revision,date:'2026-11-09',source:'authorial_editorial_selection',added_entry_count:100,
 new_category_count:4,weights:[100,70,50,30,20,10],
 phonetics:'pending_automatic_analysis',
 morphology:'partial_gender_suggestions_pending_full_analysis',
 illustrations:'not_linked_without_verification'
};
fs.writeFileSync(file,JSON.stringify(d,null,2)+'\n');
console.log('Added '+additions.length+' nouns, '+newCategories.length+' categories; total '+d.entries.length);
