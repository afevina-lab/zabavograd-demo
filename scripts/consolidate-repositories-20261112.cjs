#!/usr/bin/env node
'use strict';
// One-time, reproducible consolidation. No GitHub tokens or second repository are needed.
// Inputs: immutable, sanitized import shards plus the existing PUBLIC release.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const cp=require('node:child_process');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,x,pretty=true)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(x,null,pretty?2:0)+'\n')};
const parts=dir=>fs.readdirSync(dir).filter(x=>/^part-.*\.txt$/.test(x)).sort().map(x=>fs.readFileSync(path.join(dir,x),'utf8')).join('');
const db=JSON.parse(parts('.migration/source'));
const pending=JSON.parse(parts('.migration/analysis'));
const published=read('library.json');
const pubGraph=read('semantic-graph.json');
const images=read('outputs/image-library.json');
assert.equal(db.entries.length,1874,'Private baseline changed');
assert.equal(db.relations.length,1484,'Private relation count changed');
assert.equal(db.speech_frame_candidates.length,55,'Draft frames lost');
assert.equal(published.length,1594,'Public baseline changed');
const oldIds=new Set(db.entries.map(e=>e.id));
const pubIds=new Set(published.map(e=>e.id));
assert.equal(oldIds.size,1874,'Duplicate private ID');
assert.equal(pubIds.size,1594,'Duplicate public ID');
const byId=new Map(db.entries.map(e=>[e.id,e]));
const regSenses=new Map(images.senses.map(s=>[s.id,s]));
const conflicts={weight:[],categories:[],meaning:[],kind:[]};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
let imported=0,newImages=0,newSenses=0,boundsFixed=0;
const missingFiles=[];
for(const p of published){
 let e=byId.get(p.id);
 if(!e){
  imported++;
  const lexical=p.lexicalEligibleByDefault!==false;
  e={id:p.id,lemma:p.label,language:'ru',meaning:p.meaning||null,
    kind:p.kind||'word',part_of_speech:p.partOfSpeech||'noun',
    selection:{base_weight:p.weight??0,scope:p.scope||'general',
      task_overrides:p.taskWeights||{},weight_source:'public_release_consolidation_20261112'},
    categories:(p.categories||[]).map(x=>({path:x,default_selection:lexical})),
    phonetic_tags:{status:'pending',data:null},morphology:{status:'pending',data:null},
    illustrations:{policy:'published_illustration',planned_variants:p.images??null,
      art_status:'published',senses:[]},
    metadata_completion:{speech:'pending',lexical:'published_category',forms:'pending',
      prepositions:'pending',riddles:'pending',descriptions:'pending',antonym_attributes:'pending'},
    legacy_source:null,editorial:{source:'zabavograd-demo/library.json',
      note:'Самостоятельное публичное значение перенесено 12.11.2026.'},
    lexical_eligible_by_default:lexical,
    public_release_snapshot:p};
  if(p.usageModes)e.usage_modes=p.usageModes;
  if(p.lexicalTasks)e.lexical_tasks=p.lexicalTasks;
  db.entries.push(e);byId.set(e.id,e);
 }else{
  const base=e.selection.base_weight;
  if(p.weight!==base)conflicts.weight.push({id:p.id,word:p.label,published:p.weight,editorial:base});
  const cats=e.categories.filter(x=>x.default_selection||e.lexical_eligible_by_default===false).map(x=>x.path).sort();
  if(!same((p.categories||[]).slice().sort(),cats))
   conflicts.categories.push({id:p.id,word:p.label,published:p.categories,editorial:cats});
  if((p.meaning||null)!==(e.meaning||null))
   conflicts.meaning.push({id:p.id,word:p.label,published:p.meaning,editorial:e.meaning});
  if(p.kind!==e.kind)conflicts.kind.push({id:p.id,word:p.label,published:p.kind,editorial:e.kind});
 }
 e.illustrations??={policy:'published_illustration',planned_variants:null,senses:[]};
 e.illustrations.senses??=[];
 const variants=new Map(e.illustrations.senses.flatMap(s=>(s.variants||[]).map(v=>[v.src,v])));
 for(const variant of p.variants||[]){
  const filepath=path.join('public',variant.src.replace(/^\//,''));
  if(!fs.existsSync(filepath)){missingFiles.push({id:p.id,path:variant.src});continue}
  if(variants.has(variant.src)){
   const v=variants.get(variant.src);
   if(variant.bounds&&!v.bounds){v.bounds=variant.bounds;boundsFixed++}
   continue;
  }
  let sense=e.illustrations.senses[0];
  if(!sense){
   sense={id:e.id+'-published-sense',word_id:e.id,label:e.lemma,meaning:e.meaning||e.lemma,
     topic:null,subcategory:null,variants:[]};
   if(regSenses.has(sense.id))throw Error('Sense ID collision '+sense.id);
   e.illustrations.senses.push(sense);newSenses++;
  }
  const v={...variant,label:p.label,format:'webp',source:'published_release_20261112'};
  sense.variants.push(v);variants.set(v.src,v);newImages++;
 }
}
// Mirror all new variants into the single provenance registry, without losing old SHA metadata.
for(const e of db.entries)for(const s of e.illustrations?.senses||[]){
 let row=regSenses.get(s.id);
 if(!row){row={...s,variants:[]};images.senses.push(row);regSenses.set(s.id,row)}
 const stored=new Map((row.variants||[]).map(v=>[v.src,v]));
 for(const v of s.variants||[]){
  const prev=stored.get(v.src);
  if(!prev){row.variants.push({...v});stored.set(v.src,v)}
  else if(v.bounds&&!prev.bounds)prev.bounds=v.bounds;
 }
}
assert.deepEqual(missingFiles,[],'Some published image files are missing');
assert.equal(imported,25,'Expected 25 unique published IDs');
assert.equal(db.entries.length,1899,'Union size');
assert.equal(new Set(db.entries.map(e=>e.id)).size,1899,'Duplicate merged IDs');
assert.equal(db.relations.length,1484,'Approved relations must remain untouched');
assert.equal(db.relations.filter(r=>r.type==='animal_family').length,40);
const allIds=new Set(db.entries.map(e=>e.id));
for(const rel of db.relations){
 for(const key of ['child','parent','subject','object','male','female','offspring']){
  if(rel[key]?.id)assert(allIds.has(rel[key].id),'Broken relation '+rel.id);
 }
}
const ids=new Set(db.relations.map(r=>r.id));
for(const edge of pubGraph.relations)assert(ids.has(edge.id),'Published graph edge lost: '+edge.id);
for(const e of db.entries)assert([0,10,20,30,50,70,100].includes(e.selection.base_weight),'Invalid weight '+e.id);
const noLocalPaths=JSON.stringify(db).match(/[A-Z]:\\\\/g)||[];
assert.equal(noLocalPaths.length,0,'Local absolute paths must not be published');
db.generated_at='2026-11-12';
db.provenance.public_only_20261112={source_repository:'afevina-lab/zabavograd-demo',
 source_private_commit:'77a2a3dabcf32b83097993478d44e4b215f620ca',
 source_public_commit:'2259dfc9d3a9bfff9bb47a433573183a207af1dc',
 public_only_imported:25,shared_ids:1569,imported_published_webp_links:newImages,
 private_source_redacted_local_paths:117};
write('outputs/library-v2.json',db);
write('outputs/image-library.json',images);
write('outputs/library-v2-auto-analysis.json',pending);
write('editorial/review/speech-frame-candidates.json',{
 schema:'speech_frame_candidates_review_v1',review_status:'suggested',
 usable_for_generation:false,candidates:db.speech_frame_candidates});
cp.execFileSync(process.execPath,['scripts/export-library.cjs'],{stdio:'inherit'});
fs.copyFileSync('public/library.json','library.json');
fs.copyFileSync('public/semantic-graph.json','semantic-graph.json');
const out=read('library.json'),graph=read('semantic-graph.json');
assert.equal(out.length,1899);
assert.equal(new Set(out.map(x=>x.id)).size,1899);
for(const row of published){
 const merged=out.find(x=>x.id===row.id);
 assert(merged,'Lost public ID '+row.id);
 for(const v of row.variants||[])
  assert((merged.variants||[]).some(x=>x.src===v.src),'Lost public WebP: '+row.id+' / '+v.src);
}
assert.equal(graph.relations.length,1444);
assert.equal(graph.families.length,40);
for(const edge of pubGraph.relations)assert(graph.relations.some(x=>x.id===edge.id),'Lost graph edge '+edge.id);
for(const edge of graph.relations){
 assert(graph.by_entry[edge.subject_id].some(x=>x.relation_id===edge.id&&x.direction==='forward'));
 assert(graph.by_entry[edge.object_id].some(x=>x.relation_id===edge.id&&x.direction==='inverse'));
}
const audit={date:'2026-11-12',
 source_private_commit:'77a2a3dabcf32b83097993478d44e4b215f620ca',
 source_public_commit:'2259dfc9d3a9bfff9bb47a433573183a207af1dc',
 private_original_count:1874,public_original_count:1594,matching_ids:1569,public_only_ids:25,
 canonical_count:1899,runtime_count:out.length,relations_total:db.relations.length,
 verified_graph_edges:graph.relations.length,families:graph.families.length,
 draft_grammar_models:db.speech_frame_candidates.length,
 image_senses:images.senses.length,image_variants:images.senses.reduce((n,s)=>n+s.variants.length,0),
 published_webp_links_added:newImages,new_image_senses:newSenses,image_bounds_added:boundsFixed,
 previously_published_links_preserved:true,previously_published_graph_links_preserved:true,
 original_private_ids_preserved:[...oldIds].every(x=>allIds.has(x)),
 missing_image_files:missingFiles,conflicts,
 decision:'On shared IDs editor V2 is authoritative for categories/weights; historic public values are held in this audit; all published WebP URLs are retained.',
 safety:'Only released static graph edges reach games; 55 suggested grammar frames stay in review; absolute private filesystem paths removed.'};
write('docs/consolidation-audit-20261112.json',audit);
fs.rmSync('.migration',{recursive:true,force:true});
console.log(JSON.stringify({migration:'PASS',entries:out.length,graphEdges:graph.relations.length,
 families:graph.families.length,newImages,conflictCounts:Object.fromEntries(Object.entries(conflicts).map(([k,v])=>[k,v.length]))}));
