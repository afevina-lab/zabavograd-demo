'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,data)=>fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n');
const lib=read('outputs/library-v2.json'),registry=read('outputs/image-library.json'),manifest=read('outputs/image-pack-20261115-restored.json');
const entries=new Map(lib.entries.map(e=>[e.id,e])),categories=new Set(lib.categories.map(c=>c.path)),created=[],restoredCategories=[];
assert.equal(manifest.length,52);
for(const row of manifest){
 const bytes=fs.readFileSync('public'+row.src);
 assert.equal(crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),row.git_blob_sha,'Original image mismatch '+row.src);
 let entry=entries.get(row.word_id);
 if(!entry){
  const old=row.historic_word;assert(old,'Existing stable ID lost '+row.word_id);
  assert(!lib.entries.some(e=>e.lemma===row.label),'Ambiguous restored word '+row.label);
  for(const path of old.categories){
   const parts=path.split('/');
   for(let i=1;i<=parts.length;i++){
    const p=parts.slice(0,i).join('/');
    if(!categories.has(p)){lib.categories.push({path:p,parent_paths:parts.slice(0,i-1).map((_,n)=>parts.slice(0,n+1).join('/'))});categories.add(p);restoredCategories.push(p);}
   }
  }
  entry={id:row.word_id,lemma:row.label,language:'ru',meaning:old.meaning,kind:'word',selection:{base_weight:old.weight,scope:old.scope||'general',weight_source:'restored_approved_import_20261115'},categories:old.categories.map(path=>({path,default_selection:true})),phonetic_tags:{status:'pending_automatic_analysis',data:null},morphology:{status:'pending',data:{}},illustrations:{policy:'illustration_planned',planned_variants:1,art_status:'assigned',senses:[]},metadata_completion:{speech:'pending',lexical:'editorial_draft',forms:'pending',prepositions:'pending',descriptions:'pending'},legacy_source:null,editorial:{source:'approved_import_20261115',status:'needs_review',note:'Restored original approved public import; phonetics and inflections remain pending.'},part_of_speech:'noun',lexical_eligible_by_default:old.lexicalEligibleByDefault!==false};
  lib.entries.push(entry);entries.set(entry.id,entry);created.push(entry.id);
 }
 assert.equal(entry.lemma,row.label);assert(!entry.same_lexical_meaning_as);
 const senses=entry.illustrations?.senses||[];assert(senses.length<=1,'Ambiguous sense '+row.word_id);
 const original=senses[0]||{id:entry.id+'-sense',word_id:entry.id,label:entry.lemma,meaning:entry.meaning||entry.lemma,topic:null,subcategory:null,variants:[]};
 let sense=registry.senses.find(s=>s.id===original.id);
 if(!sense){sense=structuredClone(original);registry.senses.push(sense);}
 assert.equal(sense.word_id,entry.id);
 for(const v of original.variants||[])if(!sense.variants.some(x=>x.src===v.src))sense.variants.push(v);
 if(!sense.variants.some(v=>v.src===row.src)){
  const v={id:row.variant_id,src:row.src,label:row.label,format:'webp',source:'approved_import_20261115',git_blob_sha:row.git_blob_sha};
  if(row.label==='барсук')sense.variants.unshift(v);else sense.variants.push(v);
 }
 entry.illustrations={...entry.illustrations,art_status:'assigned',senses:[structuredClone(sense)]};
 if(entry.illustrations.planned_variants==null)entry.illustrations.planned_variants=sense.variants.length;
}
const historical=manifest.filter(x=>x.historic_word).map(x=>x.word_id);
assert.equal(historical.length,10);assert(historical.every(id=>entries.has(id)));
assert.equal(entries.size,lib.entries.length);
if(!lib.provenance.image_pack_20261115_restored){assert.equal(created.length,10);lib.categories.sort((a,b)=>a.path.localeCompare(b.path,'ru'));lib.provenance.image_pack_20261115_restored={created:10,created_ids:historical,image_count:52,original_commit:'9580b124e20198d00fa02e459b1b2ed002d51177',restored_categories:restoredCategories};}
write('outputs/library-v2.json',lib);write('outputs/image-library.json',registry);
console.log(JSON.stringify({restored_images:manifest.length,restored_words:created.length,entries:lib.entries.length}));
