#!/usr/bin/env node
'use strict';
// First independently authored editorial action frames. Do not publish these
// as verified grammar or use for automatic generation before author review.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path='outputs/library-v2.json';
const db=JSON.parse(fs.readFileSync(path,'utf8'));
const revision='speech-frame-candidates-20261109-v1';
if(db.provenance.speech_frame_candidates?.revision===revision){
 console.log('Already applied: '+revision);process.exit(0);
}
assert.equal(db.entries.length,1544,'Unexpected library size. Review changes before merge.');
const specs=[
  [
    "water-plants",
    "поливать",
    "поливать растения",
    "Садовник поливает розу из лейки.",
    "agent|nom||1|садовник,мама,девочка;patient|acc||1|цветок#plant,роза,тюльпан,дерево,яблоня;instrument|gen|из|0|лейка"
  ],
  [
    "plant-garden",
    "сажать",
    "сажать растение",
    "Мама сажает яблоню.",
    "agent|nom||1|мама,садовник,мальчик;patient|acc||1|цветок#plant,роза,тюльпан,дерево,яблоня"
  ],
  [
    "dig-with-shovel",
    "копать",
    "копать лопатой",
    "Папа копает лопатой.",
    "agent|nom||1|папа,мама,садовник,мальчик;instrument|ins||0|лопата"
  ],
  [
    "feed-rabbit",
    "кормить",
    "кормить зайца овощами",
    "Мальчик кормит зайца морковью.",
    "agent|nom||1|мальчик,девочка,мама;recipient|acc||1|заяц;food|ins||0|морковь,капуста"
  ],
  [
    "feed-cat",
    "кормить",
    "кормить кошку рыбой",
    "Девочка кормит кошку рыбой.",
    "agent|nom||1|девочка,мальчик,мама;recipient|acc||1|кошка,кот;food|ins||0|рыба"
  ],
  [
    "cut-vegetables",
    "резать",
    "резать продукты ножом",
    "Повар режет огурец ножом.",
    "agent|nom||1|повар,мама,папа;patient|acc||1|огурец,морковь,яблоко;instrument|ins||0|нож"
  ],
  [
    "peel-vegetables",
    "чистить",
    "очищать овощи ножом",
    "Мама чистит картошку ножом.",
    "agent|nom||1|мама,папа,повар;patient|acc||1|картошка,морковь;instrument|ins||0|нож"
  ],
  [
    "boil-vegetables",
    "варить",
    "варить овощи в кастрюле",
    "Повар варит картошку в кастрюле.",
    "agent|nom||1|повар,мама,папа;patient|acc||1|картошка,морковь;location|prep|в|0|кастрюля"
  ],
  [
    "fry-food",
    "жарить",
    "жарить продукты на сковороде",
    "Мама жарит рыбу на сковороде.",
    "agent|nom||1|мама,папа,повар;patient|acc||1|рыба,картошка;location|prep|на|0|сковорода"
  ],
  [
    "eat-fruit",
    "есть",
    "принимать пищу",
    "Мальчик ест яблоко.",
    "agent|nom||1|мальчик,девочка,ребёнок;patient|acc||1|яблоко,банан,груша,морковь"
  ],
  [
    "wash-dishes",
    "мыть",
    "мыть посуду губкой",
    "Папа моет тарелку губкой.",
    "agent|nom||1|папа,мама,мальчик;patient|acc||1|тарелка,чашка,кружка;instrument|ins||0|губка"
  ],
  [
    "wash-face",
    "мыть",
    "мыть лицо или руки",
    "Девочка моет лицо мылом.",
    "agent|nom||1|девочка,мальчик,мама;patient|acc||1|лицо,рука;instrument|ins||0|мыло"
  ],
  [
    "wipe-furniture",
    "вытирать",
    "вытирать поверхность тряпкой",
    "Мама вытирает стол тряпкой.",
    "agent|nom||1|мама,папа,девочка;patient|acc||1|стол,пол;instrument|ins||0|тряпка"
  ],
  [
    "wipe-face",
    "вытирать",
    "вытирать лицо полотенцем",
    "Мальчик вытирает лицо полотенцем.",
    "agent|nom||1|мальчик,девочка,мама;patient|acc||1|лицо,рука;instrument|ins||0|полотенце"
  ],
  [
    "tidy-toys",
    "убирать",
    "убирать предметы",
    "Девочка убирает игрушку.",
    "agent|nom||1|девочка,мальчик,мама;patient|acc||1|игрушка,рюкзак,сумка"
  ],
  [
    "sweep-floor",
    "подметать",
    "подметать пол",
    "Папа подметает пол.",
    "agent|nom||1|папа,мама,девочка;patient|acc||1|пол"
  ],
  [
    "take-bag",
    "брать",
    "брать вещь",
    "Мальчик берёт рюкзак.",
    "agent|nom||1|мальчик,девочка,мама;patient|acc||1|сумка,рюкзак,пакет"
  ],
  [
    "carry-bag",
    "нести",
    "нести вещь",
    "Девочка несёт сумку.",
    "agent|nom||1|девочка,мальчик,мама;patient|acc||1|сумка,рюкзак,пакет"
  ],
  [
    "give-item",
    "давать",
    "давать предмет кому-либо",
    "Мама даёт ребёнку яблоко.",
    "agent|nom||1|мама,папа,девочка;patient|acc||1|яблоко,игрушка,тетрадь;recipient|dat||0|ребёнок,мама,бабушка"
  ],
  [
    "put-on-table",
    "класть",
    "класть предмет на стол",
    "Мальчик кладёт тетрадь на стол.",
    "agent|nom||1|мальчик,девочка,мама;patient|acc||1|тетрадь,яблоко,телефон;destination|acc|на|0|стол"
  ],
  [
    "set-on-table",
    "ставить",
    "ставить посуду на стол",
    "Мама ставит чашку на стол.",
    "agent|nom||1|мама,папа,девочка;patient|acc||1|чашка,кружка,тарелка;destination|acc|на|0|стол"
  ],
  [
    "open-door",
    "открывать",
    "открывать дверь, окно или шкаф",
    "Мальчик открывает дверь.",
    "agent|nom||1|мальчик,девочка,мама;patient|acc||1|дверь,окно,шкаф"
  ],
  [
    "close-door",
    "закрывать",
    "закрывать дверь, окно или шкаф",
    "Девочка закрывает окно.",
    "agent|nom||1|девочка,мальчик,папа;patient|acc||1|дверь,окно,шкаф"
  ],
  [
    "put-on-clothes",
    "надевать",
    "надевать одежду",
    "Мальчик надевает куртку.",
    "agent|nom||1|мальчик,девочка,мама;patient|acc||1|куртка,рубашка"
  ],
  [
    "take-off-clothes",
    "снимать",
    "снимать одежду",
    "Девочка снимает рубашку.",
    "agent|nom||1|девочка,мальчик,мама;patient|acc||1|куртка,рубашка"
  ],
  [
    "draw-picture",
    "рисовать",
    "рисовать предмет инструментом",
    "Девочка рисует дом карандашом.",
    "agent|nom||1|девочка,мальчик,мама;patient|acc||1|дом,роза,кошка;instrument|ins||0|карандаш,фломастер,кисть#tool"
  ],
  [
    "write-notebook",
    "писать",
    "писать в тетради",
    "Мальчик пишет ручкой в тетради.",
    "agent|nom||1|мальчик,девочка,учитель;instrument|ins||0|ручка,карандаш;location|prep|в|0|тетрадь"
  ],
  [
    "sleep-on-bed",
    "спать",
    "спать на кровати или диване",
    "Кошка спит на диване.",
    "agent|nom||1|мальчик,девочка,кошка,кот;location|prep|на|0|кровать,диван"
  ],
  [
    "sit-on-chair",
    "сидеть",
    "сидеть на стуле или диване",
    "Мальчик сидит на стуле.",
    "agent|nom||1|мальчик,девочка,кошка;location|prep|на|0|стул,диван"
  ],
  [
    "stand-near-window",
    "стоять",
    "стоять возле предмета",
    "Девочка стоит у окна.",
    "agent|nom||1|мальчик,девочка,мама;location|gen|у|0|окно,стол"
  ],
  [
    "go-into-house",
    "идти",
    "идти в дом",
    "Папа идёт в дом.",
    "agent|nom||1|папа,мама,мальчик,девочка;destination|acc|в|0|дом"
  ],
  [
    "walk-with-someone",
    "гулять",
    "гулять с близким человеком или собакой",
    "Мальчик гуляет с бабушкой.",
    "agent|nom||1|мальчик,девочка,мама;companion|ins|с|0|бабушка,мама,папа,собака"
  ],
  [
    "hammer-nail",
    "забивать",
    "забивать гвоздь инструментом",
    "Папа забивает гвоздь молотком.",
    "agent|nom||1|папа,строитель;patient|acc||1|гвоздь;instrument|ins||0|молоток"
  ],
  [
    "screw-screw",
    "закручивать",
    "закручивать шуруп отвёрткой",
    "Папа закручивает шуруп отвёрткой.",
    "agent|nom||1|папа,строитель;patient|acc||1|шуруп;instrument|ins||0|отвёртка"
  ],
  [
    "saw-tree",
    "пилить",
    "пилить дерево пилой",
    "Строитель пилит дерево пилой.",
    "agent|nom||1|папа,строитель;patient|acc||1|дерево;instrument|ins||0|пила"
  ],
  [
    "paint-furniture",
    "красить",
    "красить мебель кистью",
    "Папа красит стул кистью.",
    "agent|nom||1|папа,мама;patient|acc||1|стул,шкаф;instrument|ins||0|кисть#tool"
  ],
  [
    "fix-furniture",
    "чинить",
    "чинить мебель",
    "Папа чинит шкаф.",
    "agent|nom||1|папа,мама,строитель;patient|acc||1|стул,шкаф"
  ],
  [
    "help-person",
    "помогать",
    "помогать другому человеку",
    "Девочка помогает маме.",
    "agent|nom||1|девочка,мальчик,папа;recipient|dat||1|мама,папа,бабушка"
  ],
  [
    "give-gift",
    "дарить",
    "дарить вещь кому-либо",
    "Мальчик дарит бабушке розу.",
    "agent|nom||1|мальчик,девочка,мама;patient|acc||1|роза,тюльпан,игрушка;recipient|dat||1|мама,бабушка,папа"
  ],
  [
    "hug-family",
    "обнимать",
    "обнимать близкого человека",
    "Девочка обнимает маму.",
    "agent|nom||1|девочка,мальчик;patient|acc||1|мама,папа,бабушка,дедушка"
  ],
  [
    "talk-with-person",
    "разговаривать",
    "разговаривать с человеком",
    "Мальчик разговаривает с папой.",
    "agent|nom||1|мальчик,девочка,мама;companion|ins|с|0|мама,папа,бабушка,учитель"
  ],
  [
    "listen-person",
    "слушать",
    "слушать человека",
    "Девочка слушает учителя.",
    "agent|nom||1|девочка,мальчик,ребёнок;patient|acc||1|мама,папа,учитель"
  ],
  [
    "look-at-animal",
    "смотреть",
    "смотреть на животное или растение",
    "Мальчик смотрит на кошку.",
    "agent|nom||1|мальчик,девочка,мама;patient|acc|на|1|кошка,кот,роза,тюльпан"
  ],
  [
    "love-family",
    "любить",
    "любить близкого человека или животное",
    "Мальчик любит маму.",
    "agent|nom||1|мальчик,девочка,ребёнок;patient|acc||1|мама,папа,бабушка,кошка,кот"
  ],
  [
    "meow",
    "мяукать",
    "издавать мяуканье",
    "Кошка мяукает.",
    "agent|nom||1|кошка,кот"
  ],
  [
    "bark",
    "лаять",
    "издавать лай",
    "Собака лает.",
    "agent|nom||1|собака"
  ],
  [
    "jump",
    "прыгать",
    "совершать прыжки",
    "Заяц прыгает.",
    "agent|nom||1|заяц,мальчик,девочка"
  ],
  [
    "stroke-pet",
    "гладить#stroke",
    "поглаживать животное рукой",
    "Девочка гладит кота.",
    "agent|nom||1|девочка,мальчик,мама;patient|acc||1|кот,кошка,собака"
  ],
  [
    "iron-clothes",
    "гладить#iron",
    "разглаживать одежду утюгом",
    "Мама гладит рубашку утюгом.",
    "agent|nom||1|мама,папа;patient|acc||1|рубашка,куртка;instrument|ins||0|утюг"
  ],
  [
    "play-with-toy",
    "играть",
    "играть с игрушкой",
    "Мальчик играет с игрушкой.",
    "agent|nom||1|мальчик,девочка;theme|ins|с|0|игрушка"
  ],
  [
    "build-house",
    "строить",
    "строить дом",
    "Строитель строит дом.",
    "agent|nom||1|строитель,папа,мама;patient|acc||1|дом"
  ],
  [
    "turn-on-device",
    "включать",
    "включать бытовой прибор",
    "Мама включает плиту.",
    "agent|nom||1|мама,папа;patient|acc||1|плита,телефон"
  ],
  [
    "turn-off-device",
    "выключать",
    "выключать бытовой прибор",
    "Папа выключает телефон.",
    "agent|nom||1|папа,мама;patient|acc||1|телефон,плита"
  ],
  [
    "hide-in-closet",
    "прятать",
    "прятать предмет в шкаф",
    "Девочка прячет игрушку в шкаф.",
    "agent|nom||1|девочка,мальчик;patient|acc||1|игрушка,тетрадь;destination|acc|в|0|шкаф"
  ],
  [
    "take-from-closet",
    "доставать",
    "доставать предмет из шкафа",
    "Мальчик достаёт игрушку из шкафа.",
    "agent|nom||1|мальчик,девочка;patient|acc||1|игрушка,тетрадь;source|gen|из|0|шкаф"
  ]
];
const special={
  "цветок#plant": "ru-plant-20261104-d186d0b2d0b5d182d0bed0ba",
  "кисть#tool": "ru-sense-20261105-kist-tool",
  "гладить#stroke": "ru-action-20261109-gladit-stroke",
  "гладить#iron": "ru-sem-20261105-8678262e"
};
const byLemma=new Map();
const byId=new Map(db.entries.map(x=>[x.id,x]));
for(const item of db.entries){const arr=byLemma.get(item.lemma)||[];arr.push(item);byLemma.set(item.lemma,arr);}
function resolve(name){
 if(special[name]){assert(byId.has(special[name]),'Unknown sense '+name);return special[name];}
 const matches=byLemma.get(name)||[];
 assert.equal(matches.length,1,'Missing or ambiguous lemma '+name);
 return matches[0].id;
}
const result=[];
for(const [slug,verb,intent,example,fields] of specs){
 const roles=fields.split(';').map(raw=>{
  const bits=raw.split('|');assert.equal(bits.length,5,'Invalid role '+raw);
  const [role,caseName,preposition,required,names]=bits;
  assert(['0','1'].includes(required));
  const allowed=names.split(',').map(resolve);
  return {role,case:caseName,preposition,required:required==='1',allowed_entry_ids:allowed};
 });
 result.push({
  id:'frame-candidate-20261109-'+slug,
  verb_id:resolve(verb),
  semantic_intent:intent,example,
  roles,status:'suggested',usable_for_generation:false,
  provenance:{source:'zabavograd_editorial',authorship:'independent',date:'2026-11-09'},
  review:{author_approved:false,typicality_approved:false,grammar_approved:false}
 });
}
const prior=db.speech_frame_candidates||[];
const ids=new Set(prior.map(x=>x.id));
for(const frame of result){assert(!ids.has(frame.id),'Duplicate candidate '+frame.id);prior.push(frame);ids.add(frame.id);}
db.speech_frame_candidates=prior;
db.provenance.speech_frame_candidates={
 revision,date:'2026-11-09',created:result.length,
 distinct_verb_senses:new Set(result.map(f=>f.verb_id)).size,
 participant_links:result.flatMap(f=>f.roles).reduce((n,r)=>n+r.allowed_entry_ids.length,0),
 status:'review_only',
 note:'Исходные авторские модели; входящие связи выводятся по ID. Никаких таблиц FrameBank или других сторонних источников не копировалось. Предложения нельзя использовать в играх до проверки.'
};
const {validateCandidates}=require('./check-speech-frame-candidates.cjs');
validateCandidates(db);
const word=id=>byId.get(id).lemma;
const names={agent:'Исполнитель',patient:'Объект',instrument:'Орудие',recipient:'Получатель',food:'Пища',location:'Место',destination:'Направление',source:'Источник',companion:'Спутник',theme:'Тема',material:'Материал',result:'Результат'};
const cases={nom:'И.п.',gen:'Р.п.',dat:'Д.п.',acc:'В.п.',ins:'Т.п.',prep:'П.п.',none:'без падежа'};
const doc=[
 '# Связи глаголов: первая редакторская партия','',
 '**Дата:** 9 ноября 2026. **Статус:** только предложения на авторскую проверку; **не включены в генератор**.','',
 'Каждая модель связывает конкретный ID глагола с ID участников: роль, падеж, предлог, обязательность. Обратная связь от существительного к глаголу вычисляется при поиске по ID; дублировать её в карточках существительных не требуется.','',
 'Ситуации разделены, если иначе получились бы странные комбинации. Например, кормление зайца овощами и кошки рыбой — две разные модели. Никакие роли автоматически не наследуются от тематической категории.','',
 'Формы слов ещё предстоит генерировать морфологическим модулем и проверять по фонетике **готового предложения**. Печатные примеры ниже проверяются отдельно, они не являются алгоритмом генерации.','',
 '## Модели к проверке'
];
for(const f of result){
 doc.push('','### '+word(f.verb_id)+' — '+f.semantic_intent,'', '**Пример:** '+f.example,'');
 for(const r of f.roles)doc.push('- '+(names[r.role]||r.role)+' — '+(r.preposition?r.preposition+' + ':'')+cases[r.case]+'; '+(r.required?'обязательно':'необязательно')+': '+r.allowed_entry_ids.map(word).join(', ')+'.');
}
doc.push('','## Публикация и контроль','',
 'Поле \u0060speech_frame_candidates\u0060 содержит только \u0060status: suggested\u0060, \u0060usable_for_generation: false\u0060 и не экспортируется в игровые \u0060public/grammar-frames.json\u0060. После авторского подтверждения можно переводить отдельные модели в \u0060speech_frames\u0060 с полным набором обязательных проверок.','');
fs.writeFileSync(path,JSON.stringify(db,null,2)+'\n');
fs.writeFileSync('outputs/ГРАММАТИЧЕСКИЕ-СВЯЗИ.md',doc.join('\n'));
console.log('Saved',result.length,'draft frames for',new Set(result.map(f=>f.verb_id)).size,'verb meanings');
