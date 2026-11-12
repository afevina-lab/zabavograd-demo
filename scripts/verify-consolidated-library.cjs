#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const db=read('outputs/library-v2.json');
const runtime=read('library.json');
const graph=read('semantic-graph.json');
const registry=read('outputs/image-library.json');
const audit=read('docs/consolidation-audit-20261112.json');
const words=new Map(db.entries.map(e=>[e.id,e]));
const rt=new Map(runtime.map(e=>[e.id,e]));
assert(words.size===db.entries.length && rt.size===runtime.length,'Duplicate ID');
assert(db.entries.length>=1899 && runtime.length>=1899,'Baseline 1899 lexical cards lost');
assert.equal(audit.canonical_count,1899,'Migration baseline changed');
const oldImported=db.entries.filter(e=>e.selection?.weight_source==='public_release_consolidation_20261112');
assert.equal(oldImported.length,25,'Lost one of 25 original public-only source cards');
assert(oldImported.every(e=>e.public_release_snapshot && rt.has(e.id)),'Lost public ID or its original snapshot');
const aliases=oldImported.filter(e=>e.same_lexical_meaning_as);
assert.equal(aliases.length,12,'Value-level deduplication drift');
const bone=oldImported.find(e=>e.lemma==='кость');
assert(bone?.meaning==='кость для собаки'&&!bone.same_lexical_meaning_as,'Dog bone is a different lexical meaning');
for(const alias of aliases){
 const canonical=words.get(alias.same_lexical_meaning_as);
 assert(canonical&&canonical.lemma===alias.lemma&&(canonical.meaning||null)===(alias.meaning||null),
  'Alias points to another lexical sense '+alias.id);
 const variantURLs=(alias.illustrations?.senses||[]).flatMap(s=>s.variants||[]).map(v=>v.src);
 const canonicalURLs=new Set((canonical.illustrations?.senses||[]).flatMap(s=>s.variants||[]).map(v=>v.src));
 assert(variantURLs.length>0&&variantURLs.every(v=>canonicalURLs.has(v)),'Canonical picture missing '+alias.id);
 assert(rt.get(alias.id)?.weight===0&&rt.get(alias.id)?.aliasOf===canonical.id,'Duplicate still eligible for auto draw '+alias.id);
 assert(rt.get(canonical.id)?.variants?.some(v=>variantURLs.includes(v.src)),'Canon has no linked illustration '+canonical.id);
}
const pubSnapshots=oldImported.flatMap(e=>(e.public_release_snapshot?.variants||[]).map(v=>({id:e.id,src:v.src})));
for(const {id,src} of pubSnapshots){
 assert(rt.get(id)?.variants?.some(v=>v.src===src),'Public image link lost '+id+' '+src);
}
const imageKeys=new Set();
for(const e of db.entries)for(const s of e.illustrations?.senses||[]){
 assert(s.word_id===e.id,'Image sense points to wrong dictionary ID '+s.id);
 for(const v of s.variants||[]){
  assert(v.src?.endsWith('.webp') && !v.src.includes('..'),'Invalid image '+v.src);
  assert(fs.existsSync('public'+v.src),'Missing WebP '+v.src);
  imageKeys.add(v.src);
 }
}
assert(imageKeys.size>=293,'Lost any of 293 source WebP files');
const regIds=new Set(registry.senses.map(s=>s.id));
for(const e of db.entries)for(const s of e.illustrations?.senses||[])
 assert(regIds.has(s.id),'Registry is missing image sense '+s.id);
assert.equal(graph.schema,'semantic_game_graph_v1');
const graphIds=new Set(graph.relations.map(e=>e.id));
assert.equal(graphIds.size,graph.relations.length,'Graph IDs repeated');
assert(graph.relations.length>=1444,'Verified graph edges lost');
assert.equal(graph.families.length,40,'Animal-family relations lost');
const dbGraphIds=new Set(db.relations.map(r=>r.id));
for(const r of graph.relations){
 assert(dbGraphIds.has(r.id)&&words.has(r.subject_id)&&words.has(r.object_id),'Orphan graph edge '+r.id);
 const f=graph.by_entry[r.subject_id]||[],b=graph.by_entry[r.object_id]||[];
 assert(f.some(x=>x.relation_id===r.id&&x.target_id===r.object_id&&x.direction==='forward'),'Missing forward '+r.id);
 assert(b.some(x=>x.relation_id===r.id&&x.target_id===r.subject_id&&x.direction==='inverse'),'Missing inverse '+r.id);
}
for(const family of graph.families)for(const key of ['male_id','female_id','offspring_id'])
 if(family[key])assert(words.has(family[key]),'Orphan family member '+family.id);
assert.equal(db.speech_frame_candidates.length,55,'Unapproved frames lost');
assert(db.speech_frame_candidates.every(f=>f.status==='suggested'&&f.usable_for_generation===false),'Draft frame auto-published');
const grammar=read('public/grammar-frames.json');
assert.equal(grammar.frames.length,0,'Unverified grammar frame leaked');
console.log(JSON.stringify({ok:true,source_cards:words.size,game_cards:rt.size,
 public_only_ids:oldImported.length,deduplicated_same_meaning:aliases.length,
 distinct_dog_bone_preserved:true,unique_webp: imageKeys.size,
 graph:graph.relations.length,families:graph.families.length,
 unapproved_frames:db.speech_frame_candidates.length},null,2));
