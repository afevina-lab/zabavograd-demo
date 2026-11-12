#!/usr/bin/env node
'use strict';
// One-time, guarded reconciliation of already published words into the private editorial V2.
// Usage: node scripts/reconcile-published-catalogue.cjs /tmp/published-library.json
// Never publishes the draft to the public repository. All 409 historical raw records survive.
const fs=require('node:fs');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const input=process.argv[2];
if(!input)throw Error('Usage: node scripts/reconcile-published-catalogue.cjs PUBLISHED_LIBRARY_JSON');
const files={
  source:'outputs/library-v2.json',
  registry:'outputs/image-library.json',
  optimization:'outputs/optimized-image-report.json',
  checker:'scripts/check-library-v2.cjs',
  workflow:'.github/workflows/verify-game-v2.yml',
  exporter:'scripts/export-library.cjs',
  report:'outputs/PUBLIC_LIBRARY_RECONCILIATION.md'
};
const privateRaw=fs.readFileSync(files.source);
const publicRaw=fs.readFileSync(input);
function gitBlobSha(content){
  return crypto.createHash('sha1').update('blob '+content.length+'\0').update(content).digest('hex');
}
const oldPrivateSha=gitBlobSha(privateRaw);
const publicSha=gitBlobSha(publicRaw);
const EXPECTED_PUBLIC='a02ea0d7c2559a6ee94e7058628431a101e4847b';
const EXPECTED_PRIVATE='f80386bbb31139f0e5c2c587e0bf61b6c4d5b6e3';
assert.equal(publicSha,EXPECTED_PUBLIC,'Published catalogue changed; inspect and re-audit before importing');
const P=JSON.parse(privateRaw.toString('utf8'));
const U=JSON.parse(publicRaw.toString('utf8'));
assert(Array.isArray(U));
if(P.provenance.public_reconciliation?.public_blob_sha===EXPECTED_PUBLIC){
  console.log('Published catalogue already reconciled; nothing to import.');
  process.exit(0);
}
assert.equal(oldPrivateSha,EXPECTED_PRIVATE,'Private draft changed since audit; stop rather than overwrite newer work');
assert.equal(P.entries.length,987);
assert.equal(U.length,1288);
const oldIds=new Set(P.entries.map(x=>x.id));
const byPublic=new Map(U.map(x=>[x.id,x]));
assert.equal(byPublic.size,U.length,'Duplicate public IDs');
assert(P.entries.every(x=>byPublic.has(x.id)),'A private-only ID was found; re-audit instead of blindly importing');
const weights=new Set([0,10,20,30,50,70,100]);
let categoryChanges=0,weightChanges=0,posChanges=0;
for(const e of P.entries){
  const b=byPublic.get(e.id);
  assert.equal(e.lemma,b.label,'Published/private lemma disagreement '+e.id);
  assert.equal(e.meaning||'',b.meaning||'','Published/private meaning disagreement '+e.id);
  const former=e.categories.map(c=>c.path+'|'+c.default_selection).sort().join(';');
  const newDefault=(b.categories||[]).map(path=>({path,default_selection:true}));
  e.categories=[...e.categories.filter(c=>!c.default_selection&&!newDefault.some(n=>n.path===c.path)),...newDefault];
  if(former!==e.categories.map(c=>c.path+'|'+c.default_selection).sort().join(';'))categoryChanges++;
  if(b.weight!==e.selection.base_weight&&weights.has(b.weight)){e.selection.base_weight=b.weight;weightChanges++;}
  if(b.partOfSpeech&&e.part_of_speech!==b.partOfSpeech){e.part_of_speech=b.partOfSpeech;posChanges++;}
  if(b.lexicalEligibleByDefault===false){e.lexical_eligible_by_default=false;e.selection.published_weight=b.weight;}
}
const missing=U.filter(b=>!oldIds.has(b.id));
for(const b of missing){
  const special=b.lexicalEligibleByDefault===false;
  const weight=b.weight===1?0:b.weight;
  assert(weights.has(weight),'Out-of-scale imported base weight: '+b.label);
  const entry={
    id:b.id,lemma:b.label,language:'ru',meaning:b.meaning??null,kind:b.kind||'word',
    selection:{base_weight:weight,scope:b.scope||'general',weight_source:'public_reconciliation_20261105'},
    categories:(b.categories||[]).map(path=>({path,default_selection:!special})),
    phonetic_tags:{status:'pending_automatic_analysis',data:null},
    morphology:{status:'pending_automatic_analysis',data:null},
    illustrations:{policy:null,planned_variants:b.images??null,
      art_status:(b.variants||[]).length?'published_shared_image':'not_assigned',
      senses:(b.variants||[]).length?[{
        id:'published-'+b.id+'-image-sense',word_id:b.id,label:b.label,
        meaning:b.meaning??null,topic:b.topic||null,subcategory:b.subcategory||null,
        variants:b.variants.map(v=>({id:v.id,src:v.src,bounds:v.bounds||null,format:'webp'}))
      }]:[]},
    metadata_completion:{speech:'pending_automatic_analysis'},legacy_source:null,
    editorial:{source:'Published release, reconciled 2026-11-05',
      note:'Public ID preserved; phonetics and morphology await editorial review.'}
  };
  if(b.partOfSpeech)entry.part_of_speech=b.partOfSpeech;
  if(b.generalization)entry.generalization=b.generalization;
  if(special){entry.lexical_eligible_by_default=false;entry.selection.published_weight=b.weight;}
  P.entries.push(entry);
}
const byId=new Map(P.entries.map(x=>[x.id,x]));
const existingRels=new Set(P.relations.filter(r=>r.type==='is_a').map(r=>r.child.id+'|'+r.parent.id));
let newRels=0;
for(const b of U)for(const p of b.kindOf||[]){
  const key=b.id+'|'+p.id;
  if(existingRels.has(key))continue;
  const parent=byId.get(p.id);
  assert(parent?.generalization?.is_generalizing_word,'Invalid semantic parent '+p.id);
  P.relations.push({id:'is-a:'+b.id+':'+p.id,type:'is_a',
    child:{id:b.id,lemma:b.label,meaning:b.meaning??null},
    parent:{id:p.id,lemma:parent.lemma},
    source:'public_release_reconciliation'});
  existingRels.add(key);newRels++;
}
const cpath=new Map(P.categories.map(c=>[c.path,c]));
for(const entry of P.entries)for(const c of entry.categories){
  const parts=c.path.split('/');
  for(let i=1;i<=parts.length;i++){
    const path=parts.slice(0,i).join('/');
    if(!cpath.has(path))cpath.set(path,{path,parent_paths:Array.from({length:i-1},(_,j)=>parts.slice(0,j+1).join('/'))});
  }
}
P.categories=[...cpath.values()].sort((a,b)=>a.path.localeCompare(b.path,'ru'));
P.provenance.public_reconciliation={
  revision:'public-main-and-gh-pages-20261105',
  public_blob_sha:EXPECTED_PUBLIC,private_before_sha:EXPECTED_PRIVATE,
  imported_entries:missing.length,added_is_a:newRels,
  updated_existing_categories:categoryChanges,updated_existing_weights:weightChanges,
  updated_existing_part_of_speech:posChanges,
  comment:'Public-only entries retain their published IDs. Special parts of speech: base weight 0 (disabled), released weight 1 retained separately.'
};
let checker=fs.readFileSync(files.checker,'utf8');
let workflow=fs.readFileSync(files.workflow,'utf8');
let exporter=fs.readFileSync(files.exporter,'utf8');
function replaceOnce(source,from,to,name){
  assert(source.includes(from),'Unexpected '+name+' source code: '+from);
  return source.replace(from,to);
}
checker=replaceOnce(checker,
  '+(v.provenance.webp_assets?.created_word_entries||0));',
  '+(v.provenance.webp_assets?.created_word_entries||0)+(v.provenance.public_reconciliation?.imported_entries||0));','count assertion');
checker=replaceOnce(checker,
  "assert.equal(genusRelations.length,v.provenance.transport_taxonomy?709:710,'Expected cleaned semantic links');",
  "assert.equal(genusRelations.length,(v.provenance.transport_taxonomy?709:710)+(v.provenance.public_reconciliation?.added_is_a||0),'Expected cleaned semantic links');",'generic cleanup');
checker=replaceOnce(checker,
  'assert.equal(genusRelations.length,709);',
  'assert.equal(genusRelations.length,709+(v.provenance.public_reconciliation?.added_is_a||0));','transport audit');
// The workflow check is updated separately with an authorized repository edit.
// GitHub Actions GITHUB_TOKEN must not attempt to modify workflow files.
assert(workflow.includes("assert(src.relations.filter(r=>r.type==='is_a').length===709+(src.provenance.public_reconciliation?.added_is_a||0),'Genus relation audit drift');"),'Workflow check is not ready');
exporter=replaceOnce(exporter,
  'const all=e.categories.filter(c=>c.default_selection).map(c=>c.path);',
  'const all=e.categories.filter(c=>c.default_selection||e.lexical_eligible_by_default===false).map(c=>c.path);','category selector');
exporter=replaceOnce(exporter,
  "categories:e.categories.filter(c=>c.default_selection&&!c.path.includes('/Вспомогательные')).map(c=>c.path),",
  "categories:e.categories.filter(c=>(c.default_selection||e.lexical_eligible_by_default===false)&&!c.path.includes('/Вспомогательные')).map(c=>c.path),",'category export');
exporter=replaceOnce(exporter,
  "phoneticStatus,kind:e.kind,scope:e.selection?.scope||'general'",
  "phoneticStatus,kind:e.kind,scope:e.selection?.scope||'general',\n  partOfSpeech:e.part_of_speech||e.legacy_source?.raw?.part_of_speech||null,\n  lexicalEligibleByDefault:e.lexical_eligible_by_default!==false",'part of speech export');
const imageRegistry=JSON.parse(fs.readFileSync(files.registry,'utf8'));
const optimizedReport=JSON.parse(fs.readFileSync(files.optimization,'utf8'));
const bySrc=new Map(imageRegistry.senses.flatMap(s=>s.variants||[]).map(v=>[v.src,v]));
let restored=0;
for(const row of optimizedReport.images){
  const variant=bySrc.get(row.webp.replace(/^public/,''));
  assert(variant,'Missing image entry '+row.webp);
  if(!variant.master_png_sha256){
    variant.master_png_sha256=row.source_sha256;
    variant.master_png_src=row.source.replace(/^public/,'');
    restored++;
  } else assert.equal(variant.master_png_sha256,row.source_sha256,'Master image hash mismatch '+row.webp);
}
assert.equal(restored,29);
assert.equal(P.entries.length,1288);
assert.equal(new Set(P.entries.map(e=>e.id)).size,P.entries.length);
assert.equal(newRels,76);
assert.equal(categoryChanges,41);
assert.equal(weightChanges,24);
assert.equal(posChanges,6);
assert.equal(P.relations.filter(r=>r.type==='is_a').length,785);
assert(P.entries.every(e=>weights.has(e.selection.base_weight)));
const groups=[
  ['Дом и быт',missing.filter(x=>x.id.startsWith('ru-home-'))],
  ['Действия и признаки',missing.filter(x=>x.id.startsWith('ru-sem-'))],
  ['Бургер — отдельное опубликованное слово',missing.filter(x=>!x.id.startsWith('ru-home-')&&!x.id.startsWith('ru-sem-'))]
];
let report='# Сверка приватной и публичной библиотек — 5 ноября 2026\n\n';
report+='Снимки Git: private '+EXPECTED_PRIVATE+' (987 записей), public '+EXPECTED_PUBLIC+' (1288 записей, main и gh-pages идентичны).\n\n';
report+='- **987 из 987** исходных приватных ID обнаружены в публичном файле; приватно-уникальных записей по ID не было.\n';
report+='- **301** дополнительная публичная запись импортирована с прежним ID; теперь в V2 **1288** словарных записей.\n';
report+='- Обновлены категории 41 общей карточки, положительные веса 24 карточек, части речи 6 глаголов; добавлены 76 родовых связей для действий и признаков.\n';
report+='- Специальные 72 существительных-обобщений/глаголов/прилагательных не выдаются автоматически в лексической теме: базовый вес 0 в V2, особый публичный вес 1 сохранён отдельно.\n';
report+='- **29 отсутствовавших SHA-256 исходных PNG восстановлены** в реестре; все 181 опубликованных WebP были на месте и совпадали в двух репозиториях.\n';
report+='- Слово «иголка»: два значения, швейная игла и хвоя. «Бургер» делит WebP с «гамбургером»; опубликованный ID «ru-r-011-sense» совпадает с идентификатором смысла исходной иллюстрации — не переименовывать без отдельной миграции.\n';
report+='- Существующие 409 исторических словарных записей и их неизменённые поля legacy_source.raw сохранены. Публикация черновика не выполняется автоматически.\n\n';
report+='## Полная инвентаризация 301 импортированной записи\n';
for(const [group,rows] of groups){
  report+='\n### '+group+' ('+rows.length+')\n\n';
  for(const row of rows.sort((a,b)=>a.label.localeCompare(b.label,'ru')))
    report+='- '+row.label+(row.meaning?' ('+row.meaning+')':'')+' — '+row.id+'\n';
}
fs.writeFileSync(files.source,JSON.stringify(P,null,2)+'\n','utf8');
fs.writeFileSync(files.registry,JSON.stringify(imageRegistry,null,2)+'\n','utf8');
fs.writeFileSync(files.checker,checker);
fs.writeFileSync(files.workflow,workflow);
fs.writeFileSync(files.exporter,exporter);
fs.writeFileSync(files.report,report);
console.log(JSON.stringify({entries:P.entries.length,imported:missing.length,categoriesChanged:categoryChanges,weightsChanged:weightChanges,addedSemanticLinks:newRels,restoredMasterHashes:restored,uniqueLemmas:new Set(P.entries.map(e=>e.lemma)).size},null,2));
