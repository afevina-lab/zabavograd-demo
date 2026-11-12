#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const assert=require('node:assert/strict');
const img=JSON.parse(fs.readFileSync('outputs/image-library.json','utf8'));
const v=JSON.parse(fs.readFileSync('outputs/library-v2.json','utf8'));
assert.equal(v.schema_version,2);
const byId=new Map(v.entries.map(e=>[e.id,e]));
assert.equal(byId.size,v.entries.length,'Duplicate ID');
const legacy=v.entries.filter(e=>e.legacy_source?.raw);
assert.equal(legacy.length,409,'Expected all 409 historical word records embedded in V2');
for(const next of legacy){
 const e=next.legacy_source.raw;
 assert.equal(next.legacy_source.id,e.id,'Old ID changed');
 assert.equal(next.id,e.id,'Lost old ID '+e.id);
 assert.equal(next.lemma,e.label,'Legacy lemma changed '+e.id);
 assert.deepEqual(next.phonetic_tags.data,e.speech||{},'Legacy speech changed '+e.id);
 assert.deepEqual(next.morphology.data,e.grammar||{},'Legacy grammar changed '+e.id);
 assert(Object.hasOwn(e,'selection_weight'),'Original weight missing: '+e.id);
}
assert.equal(new Set(legacy.map(e=>e.id)).size,legacy.length,'Duplicate embedded legacy ID');
for(const sense of img.senses){
 const e=byId.get(sense.word_id);assert(e,'Lost image owner '+sense.word_id);
 assert(e.illustrations.senses.some(s=>s.id===sense.id),'Lost image sense '+sense.id);
}
assert.equal(v.provenance.legacy_entry_count,legacy.length);
assert.equal(v.provenance.merged+v.provenance.created,v.provenance.editorial_input_count);
assert.equal(v.entries.length,legacy.length+v.provenance.created+(v.provenance.plant_world?.created||0)+(v.provenance.generalization_audit?.created||0)+(v.provenance.webp_assets?.created_word_entries||0)+(v.provenance.public_reconciliation?.imported_entries||0)+(v.provenance.sense_separation?.created||0)+(v.provenance.action_lexicon?.created||0)+(v.provenance.noun_expansion_20261109?.added_entry_count||0)+(v.provenance.public_noun_additions_20261109?.created||0)+(v.provenance.attribute_lexicon_20261109?.created||0)+(v.provenance.public_only_20261112?.public_only_imported||0));
const familyRelations=v.relations.filter(r=>r.type!=='is_a'&&!r.subject&&!r.object);
assert.equal(familyRelations.length,40,'Original animal-family relations must be preserved');
const genusRelations=v.relations.filter(r=>r.type==='is_a'&&r.child&&r.parent);
require('./semantic-review.cjs').validateExport(v);
require('./grammar-review.cjs').validateFrames(v);
require('./check-speech-frame-candidates.cjs').validateCandidates(v);
for(const r of genusRelations){
 assert(byId.has(r.child?.id)&&byId.has(r.parent?.id),'Broken is-a relation '+r.id);
 assert.notEqual(r.child.id,r.parent.id,'Self-parent relation '+r.id);
 assert(byId.get(r.parent.id).generalization?.is_generalizing_word,'Parent is not a generic word: '+r.parent.lemma);
}
assert.equal(new Set(genusRelations.map(r=>r.child.id+'|'+r.parent.id)).size,genusRelations.length,'Duplicated is-a relation');
for(const r of v.relations)for(const field of ['male','female','offspring'])if(r[field]&&r[field].id)assert(byId.has(r[field].id));
assert(!v.categories.some(c=>/твёрд(ый|ого) Р|твердый Р/i.test(c.path)));
const word=s=>v.entries.find(e=>e.lemma===s);
assert.equal(word('рука').selection.base_weight,100);
assert.equal(word('лошадь').selection.base_weight,100);
assert.equal(word('жеребец').selection.base_weight,10);
assert.equal(word('рыба').selection.base_weight,100);
const horse=v.relations.find(r=>r.male?.lemma==='жеребец');assert.equal(horse.female.lemma,'кобыла');assert(!JSON.stringify(horse).includes('"лошадь"'));
const permitted=new Set([0,10,20,30,50,70,100]);
for(const e of v.entries){
 assert(permitted.has(e.selection.base_weight),'Weight out of scale: '+e.lemma);
 assert(e.categories.every(c=>typeof c.default_selection==='boolean'));
}
for(const e of v.entries.filter(e=>e.kind==='digit'))assert.equal(e.selection.base_weight,0);
assert.equal(v.weight_migration.allowed_positive_weights.join(','),'100,70,50,30,20,10');
assert.equal(v.entries.filter(e=>e.selection.weight_source==='reviewable_catalogue_completion').length,38);
assert(!v.categories.some(c=>/твёрдый Р/i.test(c.path)));
const categoryPaths=new Set(v.categories.map(c=>c.path));
for(const c of v.categories){
 for(const parent of c.parent_paths)assert(categoryPaths.has(parent),'Missing category parent '+c.path+' -> '+parent);
}
const auxOnly=new Set(['телёнок','поросёнок','жеребёнок','львица','селезень','жеребец','улыбка','слеза']);
for(const lemma of auxOnly){
 const e=v.entries.find(x=>x.lemma===lemma);
 assert(e,'Missing auxiliary lemma '+lemma);
 assert(e.categories.every(c=>!c.default_selection),'Auxiliary leaks into base themes: '+lemma);
}
const horseFamily=v.relations.find(r=>r.male?.lemma==='жеребец');
assert(horseFamily && horseFamily.female.lemma==='кобыла'&&horseFamily.offspring.lemma==='жеребёнок');
for(const lemma of ['корова','бык','овца','баран','курица','петух','утка']){
 assert(v.entries.find(e=>e.lemma===lemma)?.categories.some(c=>c.default_selection),'Base animal hidden: '+lemma);
}
for(const c of v.categories)assert(!/твёрд(ый|ого) Р|твердый Р/i.test(c.path));


// 03. Растительный мир и грибы: new editorial categories and task-specific weights.
if(v.provenance.plant_world?.applied_revision==='03-plants-20261104-v1'){
 const plant=v.entries.filter(e=>e.categories.some(c=>c.path.startsWith('Растительный мир и грибы/')));
 assert(plant.length>120,'Plant-world catalogue unexpectedly small');
 assert.equal(word('вишня').selection.base_weight,100);
 assert.equal(word('хвоя').selection.base_weight,20);
 for(const name of ['арбуз','дыня','виноград']){
  assert.equal(word(name).selection.task_overrides.lexical_topic,1,'Lexical task weight '+name);
 }
 assert.equal(word('арбуз').selection.base_weight,100);
 assert.equal(word('дыня').selection.base_weight,70);
 assert.equal(word('виноград').selection.base_weight,70);
 assert(word('виноград').categories.some(c=>c.path==='Растительный мир и грибы/Фрукты'));
 assert(word('виноград').categories.some(c=>c.path==='Растительный мир и грибы/Ягоды/Садовые'));
 assert(word('земляника').categories.some(c=>c.path==='Растительный мир и грибы/Ягоды/Лесные'));
 assert(!word('земляника').categories.some(c=>c.path==='Растительный мир и грибы/Ягоды/Садовые'));
 const rowan=v.entries.filter(e=>e.lemma==='рябина');
 assert.equal(rowan.length,2,'Tree and berry meanings of rowan must be separate');
 assert(rowan.some(e=>e.meaning==='дерево рябина'));
 assert(rowan.some(e=>e.meaning==='плоды рябины'));
 for(const name of ['морошка','жимолость','шелковица','усик','сердцевина','чашелистик'])
  assert(!v.entries.some(e=>e.lemma===name&&e.categories.some(c=>c.path.startsWith('Растительный мир и грибы/'))),name);
 for(const name of ['корень','стебель','хвоя'])
  assert(word(name).categories.some(c=>c.path==='Растительный мир и грибы/Вспомогательные/Части растений'&&!c.default_selection));
 const general={дерево:'деревья',цветок:'цветы',растение:'растения',овощ:'овощи',фрукт:'фрукты',ягода:'ягоды',гриб:'грибы'};
 for(const [name,plural]of Object.entries(general)){
  const e=word(name);assert(e.generalization?.is_generalizing_word,name);
  assert.equal(e.generalization.default_lexical_form,plural,name);
  assert.equal(e.generalization.base_form,name,name);
 }
 assert(!v.categories.some(c=>c.path.includes('/Листья')),'Unapproved separate Leaves category');
 console.log('PASS Plant World:',plant.length,'entries',rowan.length,'rowan senses');
}
if(v.provenance.generalization_audit?.revision==='semantic-genera-20261104-v1'){
 const w=name=>v.entries.filter(e=>e.lemma===name);
 for(const name of ['животное','птица','насекомое','мебель','посуда','одежда','обувь','транспорт','продукты','страна'])
  assert(w(name).some(e=>e.generalization?.is_generalizing_word),'Missing genus '+name);
 assert.equal(w('цветок').length,2,'Flower-as-organ must be separate sense');
 assert(w('цветок').some(e=>e.meaning?.includes('часть растения')&&e.categories.every(c=>!c.default_selection)),'Flower organ not auxiliary');
 assert(w('растение')[0].categories.some(c=>c.path==='Растительный мир и грибы/Прочее'&&!c.default_selection),'Generic plant must stay in non-selected miscellaneous group');
 for(const [name,wrong] of [['рог','Животный мир/Дикие животные'],['крыло','Животный мир/Дикие животные'],['мотор','Транспорт/Наземный'],['маршрут','Транспорт/Наземный'],['кроссовки','Одежда'],['тёрка','Дом и быт/Посуда/Для приготовления']])
  assert(!w(name).some(e=>e.categories.some(c=>c.path===wrong)),'Wrong category remained: '+name);
 assert(genusRelations.length>100,'Too few semantic genus relations');
 console.log('PASS genus audit:',genusRelations.length,'typed is-a links');
}
if(v.provenance.generalization_cleanup?.revision==='crane-20261104-v1'){
 const crane=v.entries.find(e=>e.id==='ru-r-039');
 const water=v.entries.find(e=>e.id==='ru-new-20261102-0320');
 const exc=v.entries.find(e=>e.lemma==='экскаватор');
 assert.equal(crane.meaning,'строительный кран');
 assert.equal(water.meaning,'водопроводный кран');
 assert(crane.illustrations.senses.some(s=>s.id==='ru-r-039-construction'));
 assert(water.illustrations.senses.some(s=>s.id==='ru-r-039-water'));
 assert(!crane.illustrations.senses.some(s=>s.id==='ru-r-039-water'));
 assert.equal(img.senses.find(s=>s.id==='ru-r-039-water').word_id,water.id);
 for(const e of [crane,exc]){
  assert(e.categories.some(c=>c.path===(v.provenance.transport_taxonomy?'Общество и окружающая среда/Транспорт и специальная техника/Строительная техника':'Техника/Строительная техника')));
  assert(!genusRelations.some(r=>r.child.id===e.id&&r.parent.lemma==='транспорт'));
 }
 assert.equal(genusRelations.length,(v.provenance.transport_taxonomy?709:710)+(v.provenance.public_reconciliation?.added_is_a||0)-(v.provenance.apparel_taxonomy?.removed_is_a||0),'Expected cleaned semantic links');
}
if(v.provenance.transport_taxonomy?.revision==='transport-and-machinery-20261105-v1'){
 const root='Общество и окружающая среда/Транспорт и специальная техника';
 const tractor=v.entries.find(e=>e.lemma==='трактор');
 const building=v.entries.filter(e=>['кран','экскаватор'].includes(e.lemma)&&e.categories.some(c=>c.path===root+'/Строительная техника'));
 assert.equal(building.length,2,'Crane/excavator must be in construction machinery');
 assert(tractor.categories.some(c=>c.path===root+'/Сельскохозяйственная техника'));
 assert(!genusRelations.some(r=>r.child.id===tractor.id&&r.parent.lemma==='транспорт'));
 assert.equal(genusRelations.length,709+(v.provenance.public_reconciliation?.added_is_a||0)-(v.provenance.apparel_taxonomy?.removed_is_a||0));
 assert(v.entries.every(e=>e.categories.every(c=>!c.path.startsWith('Транспорт/')&&!c.path.startsWith('Техника/'))));
}
if(v.provenance.webp_assets?.revision==='webp-pack-20261105'){
 const count=v.entries.filter(e=>e.id.startsWith('ru-images-20261105-')).length;
 assert.equal(count,v.provenance.webp_assets.created_word_entries,'Invalid new illustration word count');
 for(const s of img.senses){
  for(const variant of s.variants||[]){
   const src=variant.src;
   assert(src.startsWith('/assets/words/'),'Invalid asset path '+src);
   assert(fs.existsSync('public'+src),'Missing linked asset '+src);
  }
 }
}
if(v.provenance.image_naming?.revision==='semantic-word-assets-20261105-v1'){
 const variants=img.senses.flatMap(s=>s.variants||[]);
 assert(variants.length>=181,'All original approved artwork must remain linked');
 assert(new Set(variants.map(v=>v.src)).size>=181,'At least 181 distinct approved WebP assets must remain');
 for(const variant of variants){
  assert(!new RegExp('/[0-9]+[a-z]?_').test(variant.src),'Numbered artwork filename remained: '+variant.src);
  assert(variant.src.endsWith('.webp'),'Game artwork must use compressed WebP '+variant.src);
  assert(fs.existsSync('public'+variant.src),'Artwork file missing: '+variant.src);
 }
 console.log('PASS semantic WebP names and', variants.length, 'linked image variants');
}
console.log('PASS library-v2',v.entries.length,'entries',v.relations.length,'relations',img.senses.length,'image senses',v.review_queue.length,'review items');

assert(v.categories.every(c=>!["Семья","Семья и люди","Мебель","Посуда","Бытовая техника","Растительный мир"].includes(c.path)),"Obsolete top-level category");

if(v.provenance.public_reconciliation){
 assert.equal(v.provenance.public_reconciliation.imported_entries,301,'Published-only word import was changed');
 assert.equal(v.provenance.public_reconciliation.added_is_a,76,'Published semantic links were lost');
 assert.equal(v.entries.length,1288+(v.provenance.sense_separation?.created||0)+(v.provenance.action_lexicon?.created||0)+(v.provenance.noun_expansion_20261109?.added_entry_count||0)+(v.provenance.public_noun_additions_20261109?.created||0)+(v.provenance.attribute_lexicon_20261109?.created||0)+(v.provenance.public_only_20261112?.public_only_imported||0),'Published and private word IDs must include subsequent sense separation and noun expansion');
 const released=v.entries.filter(e=>e.selection.weight_source==='public_reconciliation_20261105');
 assert.equal(released.length,301,'Some published-only records disappeared');
 assert.equal(new Set(released.map(e=>e.id)).size,301,'Duplicate published IDs');
 const special=released.filter(e=>e.lexical_eligible_by_default===false);
 assert.equal(special.length,72,'Special verb/adjective/generalization records changed');
 assert(special.every(e=>e.selection.base_weight===0&&e.selection.published_weight===1),'Special word weights should be disabled in V2');
 assert(v.entries.some(e=>e.lemma==='бургер'&&e.illustrations.senses.some(s=>s.variants.some(v=>v.src.endsWith('/gamburger.webp')))),'Published burger alias lost');
 console.log('PASS all 301 published-only IDs retained in private V2');
}

if(v.provenance.action_lexicon?.revision==='verbs-20261109-v1'){
 const verbs=v.entries.filter(e=>e.part_of_speech==='verb');
 const added=v.entries.filter(e=>e.id.startsWith('ru-action-20261109-'));
 assert.equal(added.length,v.provenance.action_lexicon.created,'New verb records missing');
 assert.equal(verbs.length,v.provenance.action_lexicon.verb_senses,'Verb-sense count drift');
 assert.equal(new Set(verbs.map(e=>e.lemma)).size,v.provenance.action_lexicon.verb_lemmas,'Verb-lemma count drift');
 const scale=new Set([100,70,50,30,20,10]);
 for(const e of verbs){
  assert(scale.has(e.selection.task_overrides?.action_generation),'No action priority: '+e.lemma);
  assert(e.categories.some(c=>c.path.startsWith('Действия/')),'Missing action category: '+e.lemma);
 }
 for(const e of added){
  assert.equal(e.selection.base_weight,0,'Unillustrated action leaked to image tasks');
  assert.equal(e.lexical_eligible_by_default,false);
  assert(e.categories.every(c=>!c.default_selection));
 }
}

if(v.provenance.noun_expansion_20261109?.revision==='nouns-20261109-v1'){
 const newNouns=v.entries.filter(e=>e.id.startsWith('ru-noun-20261109-'));
 assert.equal(newNouns.length,100,'Noun expansion must contain 100 records');
 assert.equal(new Set(newNouns.map(e=>e.lemma)).size,100,'Noun expansion has duplicate spellings');
 const prior=v.entries.filter(e=>!e.id.startsWith('ru-noun-20261109-'));
 for(const e of newNouns){
  assert.equal(e.part_of_speech,'noun');
  assert(!prior.some(p=>p.lemma===e.lemma),'New noun duplicates existing lemma '+e.lemma);
  assert(e.categories.length>0 && e.categories.every(c=>categoryPaths.has(c.path)),'New noun uncategorized '+e.lemma);
  assert(e.selection.base_weight>0 && permitted.has(e.selection.base_weight),'Invalid noun weight '+e.lemma);
  assert.equal(e.illustrations.art_status,'not_assigned');
 }
 console.log('PASS noun expansion:',newNouns.length,'new nouns');
}

if(v.provenance.attribute_lexicon_20261109){
 const q=v.provenance.attribute_lexicon_20261109;
 const added=v.entries.filter(e=>e.id.startsWith('ru-attr-20261109-'));
 assert.equal(added.length,q.created,'Attribute entries lost');
 assert(added.every(e=>['adjective','adverb'].includes(e.part_of_speech)&&e.lexical_eligible_by_default===false&&e.selection.base_weight===0),'Attribute eligibility/POS invalid');
 assert(added.every(e=>e.categories.length&&e.categories.every(c=>categoryPaths.has(c.path))),'Attribute category not registered');
 assert.equal(new Set(added.map(e=>e.lemma)).size,added.length,'Duplicate attribute lemma');
 assert.equal(v.relations.filter(r=>r.id.startsWith('semantic-attribute-20261109-')).length,q.created_relations,'Attribute relations lost');
}
