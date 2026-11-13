'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const db=JSON.parse(fs.readFileSync('outputs/library-v2.json','utf8'));const before=structuredClone(db),changes=[];
function category(path){const p=path.split('/');for(let i=1;i<=p.length;i++){const s=p.slice(0,i).join('/');if(!db.categories.some(c=>c.path===s))db.categories.push({path:s,parent_paths:p.slice(0,i-1).map((_,j)=>p.slice(0,j+1).join('/'))})}}
function set(e,paths,why){const old=e.categories;for(const p of paths)category(p);e.categories=paths.map(path=>({path,default_selection:!path.includes('/Вспомогательные')}));e.editorial??={};e.editorial.taxonomy_review_20261113={previous:old,reason:why};changes.push({word:e.lemma,id:e.id,reason:why});}
for(const e of db.entries){
 if(e.lemma==='кость'&&e.meaning==='кость для собаки')set(e,['Животный мир/Вспомогательные/Уход за питомцами'],'Предмет, связанный с собакой, не является животным');
 if(e.categories.some(c=>c.path.includes('/Грибы/'))){const cats=e.categories.filter(c=>!c.path.includes('/Грибы/')).map(c=>c.path);set(e,[...new Set([...cats,'Растительный мир и грибы/Грибы'])],'Единая учебная тема Грибы; прежние подгруппы сохранены в истории, съедобность автоматически не назначается');}
 if(e.lemma==='рак'&&e.categories.some(c=>c.path==='Животный мир/Морские обитатели'))set(e,e.categories.filter(c=>c.path!=='Животный мир/Морские обитатели').map(c=>c.path).concat('Животный мир/Пресноводные обитатели'),'Речной рак не должен попадать в морскую выборку');
 if(e.lemma==='урок')set(e,['Общество и окружающая среда/Учёба и образование/Занятия'],'Урок — занятие, не школьный предмет');
 if(e.lemma==='конструктор'&&e.categories.some(c=>c.path.includes('Школьные принадлежности')))set(e,['Игры, творчество и увлечения/Игрушки'],'Игрушечный конструктор не является школьной принадлежностью');
 if(e.lemma==='прогулка')set(e,['Человек/Повседневная жизнь/Отдых'],'Прогулка не является праздником');
 if(['кора','крона'].includes(e.lemma)&&e.categories.some(c=>c.path==='Природа и окружающий мир/Природные объекты'))set(e,['Растительный мир и грибы/Вспомогательные/Части растений'],'Часть растения отделена от ландшафта');
 if(e.lemma==='берлога')set(e,['Животный мир/Вспомогательные/Жилища животных'],'Жилище животного не является природным ландшафтом');
 if(e.categories.some(c=>c.path==='Игры, творчество и увлечения/Сказочные персонажи и предметы')&&['уровень','правило','игрок'].includes(e.lemma))set(e,['Игры, творчество и увлечения/Игровые понятия'],'Игровое понятие не является сказочным персонажем или предметом');
 if(e.lemma==='фейерверк')set(e,['Общество и окружающая среда/Праздники и события/Праздничные атрибуты'],'Фейерверк относится к праздникам, не сказочным персонажам');
 if(e.lemma==='порошок'&&e.meaning==='стиральный порошок')set(e,['Дом и быт/Уборка и стирка/Моющие средства'],'Назначение уточнено по сохранённому значению');
 // Remove a miscellaneous membership when an explicit sibling already exists.
 const old=e.categories;const next=old.filter(c=>!c.path.endsWith('/Прочее')||!old.some(x=>x!==c&&x.path.startsWith(c.path.slice(0,-7))&&!x.path.endsWith('/Прочее')));
 if(next.length!==old.length){e.categories=next;changes.push({word:e.lemma,reason:'Удалена дублирующая служебная ветка Прочее'});}
 // Preserve eligibility: removing an implementation label must not enable auxiliary words.
 for(const c of e.categories)if(c.path.endsWith('/Прочее')){const previous=c.path;c.path=c.path.slice(0,-7);category(c.path);changes.push({word:e.lemma,reason:'Служебное Прочее заменено родительской темой',previous});}
}
db.categories=db.categories.filter(c=>!c.path.endsWith('/Прочее')&&!c.path.startsWith('Растительный мир и грибы/Грибы/'));
for(const c of db.categories)c.parent_paths=c.parent_paths.filter(p=>db.categories.some(x=>x.path===p));
const candidates=[
 ['дым','дым от огня','Природа и окружающий мир/Явления','Чтение CVC; Д, Ы, М; ССС 3',['д','ы','м'],3],
 ['мох','мох на земле и камнях','Растительный мир и грибы/Мхи','Короткое чтение; М, Х; ССС 3',['м','о','х'],3],
 ['пух','мягкий птичий пух','Животный мир/Вспомогательные/Покровы животных','Короткое чтение; П, У, Х; ССС 3',['п','у','х'],3],
 ['шум','совокупность громких звуков','Природа и окружающий мир/Звуки','Короткое чтение; Ш, У, М; ССС 3; противопоставление тишине',['ш','у','м'],3],
 ['зал','просторное помещение','Дом и быт/Жилище/Помещения','Короткое чтение; З, А, Л; ССС 3',['з','а','л'],3],
 ['вата','мягкая волокнистая вата','Дом и быт/Ванная комната и гигиена/Предметы личной гигиены','Два открытых слога; В, Т; знакомый материал',null,1],
 ['сено','высушенная трава для корма','Животный мир/Вспомогательные/Корм животных','Два открытых слога; кормление животных; не животное',null,1],
 ['пена','пена из пузырьков','Дом и быт/Ванная комната и гигиена/Материалы','Два открытых слога; П, Н; описание мытья',null,1],
 ['мука','порошок из зерна для приготовления теста','Еда и напитки/Ингредиенты','Два открытых слога; М, К; приготовление пищи; ударение мукА',null,1],
 ['бусы','украшение из бусин','Человек/Одежда, обувь и аксессуары/Аксессуары','Два открытых слога; Б, Ы, С; счёт бусин',null,1],
 ['яма','углубление в земле','Природа и окружающий мир/Природные объекты','Короткое чтение с Я; пространственные предлоги',null,null],
 ['эхо','повторение отражённого звука','Природа и окружающий мир/Звуки','Буква Э; Х; игра с повторением',null,null]
];
let added=0;const selectionReport=[];
for(const [lemma,meaning,path,purpose,tokens,type] of candidates){if(db.entries.some(e=>e.lemma.toLowerCase()===lemma)){selectionReport.push({lemma,result:'уже есть, дубль не добавлен'});continue}category(path);const id='useful-20261113-'+Buffer.from(lemma).toString('hex');db.entries.push({id,lemma,meaning,language:'ru',kind:'word',part_of_speech:'noun',selection:{base_weight:50,scope:'general',task_overrides:{},weight_source:'useful_words_review_20261113'},categories:[{path,default_selection:!path.includes('/Вспомогательные')}],phonetic_tags:tokens?{status:'automatic_candidate_needs_review',data:{sound_tokens:tokens,syllable_count:1,stress_syllable:1,markova_type_candidate:3,analysis_status:'editorial_proposal_requires_review'}}:{status:'pending',data:null},morphology:{status:'pending',data:null},illustrations:{policy:'illustration_planned',senses:[]},metadata_completion:{speech:tokens?'suggested':'pending',forms:'pending'},editorial:{source:'useful_words_review_20261113',pedagogical_purpose:purpose,markova_type_proposal:type,review_status:'suggested',image_brief:meaning,reading_available_without_image:true}});added++;selectionReport.push({lemma,purpose,result:'добавлено',phonetics:tokens?'предложение':'ожидает проверки'});}
db.provenance.useful_words_20261113??={created:0};db.provenance.useful_words_20261113.created+=added;
assert.equal(new Set(db.entries.map(e=>e.id)).size,db.entries.length);for(const e of before.entries){const n=db.entries.find(x=>x.id===e.id);assert(n);assert.deepEqual(n.illustrations,e.illustrations);assert.deepEqual(n.phonetic_tags,e.phonetic_tags);assert.deepEqual(n.morphology,e.morphology)}assert.deepEqual(db.relations,before.relations);
const report={before:before.entries.length,after:db.entries.length,added,changes,selection:selectionReport,limitations:['Смысловая проверка не равна доказательству отсутствия всех ошибок','Новые иллюстрации не назначены; новые слова доступны в текстовых режимах','Фонетика новых односложных слов — редакторское предложение; остальные ожидают разбора']};
if(!process.argv.includes('--dry-run')){fs.writeFileSync('outputs/library-v2.json',JSON.stringify(db,null,2)+'\n');fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/library-quality-20261113.json',JSON.stringify(report,null,2)+'\n');let check=fs.readFileSync('scripts/check-library-v2.cjs','utf8');check=check.replace('(v.provenance.public_only_20261112?.public_only_imported||0))','(v.provenance.public_only_20261112?.public_only_imported||0)+(v.provenance.useful_words_20261113?.created||0))');check=check.replace("c.path==='Растительный мир и грибы/Прочее'","c.path==='Растительный мир и грибы'");check=check.replace("(v.provenance.public_only_20261112?.public_only_imported||0),'Published", "(v.provenance.public_only_20261112?.public_only_imported||0)+(v.provenance.useful_words_20261113?.created||0),'Published");fs.writeFileSync('scripts/check-library-v2.cjs',check);let test=fs.readFileSync('tests/memory.test.ts','utf8');test=test.replace("subcategory:'Ядовитые'","subcategory:''").replace("assert.deepEqual(fungi.map(w=>w.label),['мухомор'])", "assert(fungi.some(w=>w.label==='мухомор'));assert(fungi.some(w=>w.label==='белый гриб'));assert(fungi.every(w=>w.categories?.includes('Растительный мир и грибы/Грибы')))");fs.writeFileSync('tests/memory.test.ts',test);}
console.log(JSON.stringify({before:report.before,after:report.after,added,changes:changes.length,selection:selectionReport},null,2));
