#!/usr/bin/env node
'use strict';
/**
 * Canonical public catalogue: author-approved batch of missing vocabulary
 * and independently authored, sense-ID-checked semantic relationships.
 * Does not import RuWordNet/FrameBank/Constructicon content.
 */
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {validateExport}=require('./semantic-review.cjs');
const source='outputs/library-v2.json';
const reviewSource='scripts/data/relation-draft-20261123.json';
const db=JSON.parse(fs.readFileSync(source,'utf8'));
const spec=JSON.parse(fs.readFileSync(reviewSource,'utf8'));
const revision='editorial-gaps-20261123-v1';
assert.equal(spec.schema,'zabavograd_editorial_relation_draft_v1');
const noun=(weight,meaning,category,secondary=[],show=true)=>({part_of_speech:'noun',weight,meaning,category,secondary,show});
const verb=(meaning)=>({part_of_speech:'verb',weight:0,meaning,category:'Действия/Вспомогательные/Действия с предметами',show:false});
const furniture='Дом и быт/Мебель',parts=furniture+'/Вспомогательные/Части мебели';
const places='Животный мир/Вспомогательные/Места содержания животных';
const product='Еда и напитки/Продукты',byproducts='Животный мир/Вспомогательные/Продукты животного происхождения';
const missing={
 'дверца':noun(30,'дверца шкафа или другой мебели',parts,[],false),
 'сиденье':noun(50,'часть стула, кресла или другой мебели, на которой сидят',parts,[],false),
 'спинка':noun(30,'спинка стула, кресла или другой мебели',parts,[],false),
 'подлокотник':noun(20,'опора для руки на кресле',parts,[],false),
 'ножка':noun(30,'опорная ножка мебели',parts,[],false),
 'буфет':noun(30,'шкаф для хранения посуды',furniture),
 'сервант':noun(30,'шкаф со стеклянными дверцами для хранения посуды',furniture),
 'письменный стол':noun(50,'стол для письма и занятий',furniture),
 'книжный шкаф':noun(30,'шкаф для хранения книг',furniture),
 'скамейка':noun(70,'сиденье для нескольких человек',furniture),
 'бельё':noun(70,'бельё — предметы домашнего и личного текстиля', 'Дом и быт/Предметы домашнего обихода',[],false),
 'хранить':verb('держать вещи в определённом месте'),
 'смотреться':verb('смотреть на своё отражение в зеркале'),
 'будка':noun(70,'будка для собаки',places,[],false),
 'курятник':noun(70,'помещение для содержания кур',places,[],false),
 'конюшня':noun(70,'помещение для содержания лошадей',places,[],false),
 'коровник':noun(70,'помещение для содержания коров',places,[],false),
 'свинарник':noun(50,'помещение для содержания свиней',places,[],false),
 'крольчатник':noun(50,'помещение для содержания кроликов',places,[],false),
 'улей':noun(70,'домик для пчёл',places,[],false),
 'муравейник':noun(70,'жилище муравьёв',places,[],false),
 'скворечник':noun(70,'домик для гнездования птиц',places,[],false),
 'яйцо':noun(100,'пищевое яйцо птицы',product,[byproducts]),
 'мёд':noun(70,'мёд, который производят пчёлы',product,[byproducts]),
 'шерсть':noun(70,'шерсть животных, используемая как материал',byproducts,[],false),
 'мука':noun(70,'мука для приготовления пищи',product),
 'яичница':noun(70,'блюдо из жареных яиц','Еда и напитки/Готовые блюда')
};
const byId=new Map(db.entries.map(e=>[e.id,e]));assert.equal(byId.size,db.entries.length);
const byLemma=new Map();
const norm=s=>String(s||'').trim().toLocaleLowerCase('ru').normalize('NFC');
function index(e){const k=norm(e.lemma);const a=byLemma.get(k)||[];a.push(e);byLemma.set(k,a);}
db.entries.forEach(index);
const catPaths=new Set(db.categories.map(c=>c.path));
const ensureCategory=p=>{
 if(catPaths.has(p))return;
 const parts=p.split('/');
 for(let i=1;i<=parts.length;i++){
  const path=parts.slice(0,i).join('/');
  if(catPaths.has(path))continue;
  assert(i===1||catPaths.has(parts.slice(0,i-1).join('/')),'Invalid category '+p);
  const parents=parts.slice(0,i-1).map((_,j)=>parts.slice(0,j+1).join('/'));
  db.categories.push({path,parent_paths:parents});
  catPaths.add(path);
 }
};
const newWords=[];
for(const [lemma,definition] of Object.entries(missing)){
 const existed=byLemma.get(norm(lemma))||[];
 if(existed.length){continue;} // Do not duplicate known words or senses.
 const id='ru-editorial-gap-20261123-'+crypto.createHash('sha256').update(lemma).digest('hex').slice(0,16);
 assert(!byId.has(id),'ID collision '+id);
 const paths=[definition.category,...(definition.secondary||[])];
 paths.forEach(ensureCategory);
 const row={id,lemma,language:'ru',meaning:definition.meaning,kind:'word',
  part_of_speech:definition.part_of_speech,
  selection:{base_weight:definition.weight,scope:'general',weight_source:revision,
   ...(definition.part_of_speech==='verb'?{task_overrides:{action_generation:50}}:{})},
  categories:paths.map(path=>({path,default_selection:Boolean(definition.show)})),
  phonetic_tags:{status:'pending_automatic_analysis',data:null},
  morphology:{status:'pending_automatic_analysis',data:{review_status:'suggested'}},
  illustrations:{policy:null,planned_variants:null,art_status:'not_assigned',senses:[]},
  metadata_completion:{speech:'pending_automatic_analysis',forms:'pending_automatic_analysis',
   lexical:'editorially_selected',prepositions:'pending'},
  legacy_source:null,
  editorial:{source:'zabavograd_editorial',status:'approved_lexical_entry',
   note:'Added as missing vocabulary for semantic exercises. No illustration or phonetics invented.'},
  lexical_eligible_by_default:Boolean(definition.show)};
 db.entries.push(row);byId.set(id,row);index(row);newWords.push({id,lemma,category:definition.category});
}
db.categories.sort((a,b)=>a.path.localeCompare(b.path,'ru'));
const symmetric=new Set(['antonym']);
const inverses={part_of:'has_part',typically_contains:'typically_found_in',used_for:'purpose_of',dwells_in:'dwelling_of',produces:'produced_by',made_from:'ingredient_for',antonym:'antonym'};
const key=(type,a,b)=>type+'|'+(symmetric.has(type)?[a,b].sort().join('|'):a+'|'+b);
const pairs=new Set(db.relations.map(r=>{const s=r.subject?.id||r.child?.id,o=r.object?.id||r.parent?.id;return s&&o?key(r.type,s,o):'';}));
const blocked=[],newLinks=[],reused=[];
function resolve(selector){
 const parts=selector.split('@'),lemma=norm(parts[0]),hint=norm(parts[1]||'');
 assert(parts.length<=2 && lemma,'Invalid lemma selector '+selector);
 const candidates=(byLemma.get(lemma)||[]).filter(e=>!e.same_lexical_meaning_as);
 const found=hint?candidates.filter(e=>norm(e.meaning).includes(hint)||(e.categories||[]).some(c=>norm(c.path).includes(hint))):candidates;
 return found.length===1?found[0]:{unresolved:found.map(x=>({id:x.id,meaning:x.meaning})),lemma};
}
for(const [type,raw] of Object.entries(spec.pairs)){
 assert(inverses[type],'Unsupported type '+type);
 for(const item of raw.split(';').map(x=>x.trim()).filter(Boolean)){
  const tokens=item.split('>');assert.equal(tokens.length,2,'Invalid relation '+item);
  const a=resolve(tokens[0]),b=resolve(tokens[1]);
  if(!a.id||!b.id||a.id===b.id){
   blocked.push({type,item,subject:a,object:b});continue;
  }
  const fingerprint=key(type,a.id,b.id);
  if(pairs.has(fingerprint)){reused.push({type,item});continue;}
  pairs.add(fingerprint);
  const id='semantic-editorial-'+crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0,22);
  assert(!db.relations.some(x=>x.id===id),'ID collision '+id);
  const relation={id,type,subject:{id:a.id,lemma:a.lemma},object:{id:b.id,lemma:b.lemma},
    inverse_type:inverses[type],
    approval:{status:'verified',usable_for_generation:true,sense_checked:true,typical_for_children:true,
      review_method:'independent_explicit_pair',checked_by:'assistant_editorial_pass_20261123',human_reviewed:false},
    provenance:{source:'zabavograd_editorial',authorship:'independent',revision:'v2-obvious-relations-20261123-v1',
      reference:reviewSource,source_method:'explicit_named_senses_plus_dictionary_id_check'},
    editorial_note:'Approved editorial batch; no external thesaurus content copied.'};
  db.relations.push(relation);
  newLinks.push({id,type,subject:a.lemma,object:b.lemma});
 }
}
const old=db.provenance.editorial_gap_completion_20261123;
if(old&&old.revision!==revision)throw Error('Conflicting prior migration');
db.provenance.editorial_gap_completion_20261123={
 revision,created:(old?.created||0)+newWords.length,
 new_verbs:(old?.new_verbs||0)+newWords.filter(x=>byId.get(x.id).part_of_speech==='verb').length,
 links_added:(old?.links_added||0)+newLinks.length,
 status:'author_approved_lexical_and_semantic_editorial_batch',human_pair_review:false};
validateExport(db);
fs.writeFileSync(source,JSON.stringify(db,null,2)+'\n');
const summary={schema:'editorial_gaps_publish_report_v1',revision,words_added:newWords.length,
 relation_count_added:newLinks.length,relation_count_reused:reused.length,
 unresolved:blocked.length,new_words:newWords,new_relations:newLinks,unresolved_pairs:blocked};
fs.writeFileSync('outputs/EDITORIAL_GAPS_20261123.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({words_added:newWords.length,links_added:newLinks.length,
 existing_pairs:reused.length,unresolved:blocked.length,total_entries:db.entries.length,
 total_relations:db.relations.length,new_words:newWords.map(x=>x.lemma)},null,2));
module.exports={};
