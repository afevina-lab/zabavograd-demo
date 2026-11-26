require('./library-source.cjs').requireLegacyWrite();
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
// Only reviewed, individually prepared WebP files are accepted.
const manifest=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const lib=JSON.parse(fs.readFileSync('outputs/library-v2.json')),registry=JSON.parse(fs.readFileSync('outputs/image-library.json'));
assert.equal(manifest.length,20);
const created=[],report=[];
for(const item of manifest){
 assert.equal(item.reviewed,true,'Visual review required: '+item.word);
 const matches=lib.entries.filter(e=>e.lemma===item.word);assert(matches.length<=1,'Ambiguous word '+item.word);
 let entry=matches[0];
 if(!entry){
  const id='image-pack-20261123-'+crypto.createHash('sha256').update(item.word).digest('hex').slice(0,12);
  entry={id,lemma:item.word,language:'ru',meaning:null,kind:'word',selection:{base_weight:100,scope:'general'},categories:[{path:item.category,default_selection:true}],phonetic_tags:{status:'pending',data:{}},morphology:{status:'pending',data:{}},illustrations:{senses:[],art_status:'assigned'},editorial:{status:'needs_review',note:'Изображение проверено; фонетика и формы ожидают редакторской проверки.'}};
  lib.entries.push(entry);created.push(id);
 }
 assert(lib.categories.some(c=>c.path===item.category),'Unknown category');
 const bytes=fs.readFileSync('public'+item.src);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
 const sha=crypto.createHash('sha256').update(bytes).digest('hex');
 let sense=registry.senses.find(s=>s.word_id===entry.id);
 if(!sense){sense={id:entry.id+'-sense',word_id:entry.id,label:item.word,meaning:item.word,topic:null,subcategory:null,variants:[]};registry.senses.push(sense);}
 let variant=sense.variants.find(v=>v.src===item.src||v.sha256===sha);
 if(!variant){variant={id:'approved-20261123-'+entry.id,label:item.word};sense.variants.push(variant);}
 Object.assign(variant,{src:item.src,sha256:sha,width:item.width,height:item.height,format:'webp'});
 entry.illustrations.senses=registry.senses.filter(s=>s.word_id===entry.id);entry.illustrations.art_status='assigned';
 report.push({word:item.word,id:entry.id,src:item.src,sha256:sha});
}
const old=lib.provenance.image_pack_20261123;
lib.provenance.image_pack_20261123={created:(old?.created||0)+created.length,created_ids:[...(old?.created_ids||[]),...created],image_count:20};
fs.writeFileSync('outputs/library-v2.json',JSON.stringify(lib,null,2)+'\n');
fs.writeFileSync('outputs/image-library.json',JSON.stringify(registry,null,2)+'\n');
fs.writeFileSync('outputs/furniture-20261123-audit.json',JSON.stringify(report,null,2)+'\n');
console.log('Imported '+report.length+' reviewed images; new cards: '+created.length);
