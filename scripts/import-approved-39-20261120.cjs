require('./library-source.cjs').requireLegacyWrite();
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const archive=process.argv[2]||'.asset-review-39';
const manifest=JSON.parse(fs.readFileSync(path.join(archive,'manifest.json')));
const lib=JSON.parse(fs.readFileSync('outputs/library-v2.json')),registry=JSON.parse(fs.readFileSync('outputs/image-library.json'));
const normalize=s=>s.toLowerCase().replaceAll('ё','е').replace(/[^а-я]/g,'');
const created=[],report=[];
assert.equal(manifest.files.length,39);
for(const item of manifest.files){
 const word=item['слово'],matches=lib.entries.filter(e=>normalize(e.lemma)===normalize(word));
 assert(matches.length<=1,'Ambiguous card: '+word);
 let entry=matches[0];
 if(!entry){
  const id='image-pack-20261120-'+crypto.createHash('sha256').update(word).digest('hex').slice(0,12);
  entry={id,lemma:word,language:'ru',meaning:null,kind:'word',selection:{base_weight:0,scope:'general'},categories:[],phonetic_tags:{status:'pending',data:{}},morphology:{status:'pending',data:{}},illustrations:{senses:[],art_status:'assigned'},editorial:{status:'needs_review',note:'Карточка создана по утверждённому изображению. Вес, категории, фонетика и морфология ожидают редакторской проверки.'}};
  lib.entries.push(entry);created.push(id);
 }
 const bytes=fs.readFileSync(path.join(archive,item['файл'])),sha=crypto.createHash('sha256').update(bytes).digest('hex');
 assert.equal(sha,item.sha256,'Archive checksum: '+word);
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
 let sense=registry.senses.find(s=>s.word_id===entry.id);
 if(!sense){sense={id:entry.id+'-sense',word_id:entry.id,label:word,meaning:entry.meaning||word,topic:null,subcategory:null,variants:[]};registry.senses.push(sense);}
 assert(sense.variants.length<=1,'Multiple variants require review: '+word);
 let variant=sense.variants[0];
 if(!variant){variant={id:'approved-20261120-'+entry.id,src:'/assets/words/'+path.basename(item['файл']).replace(/^\d+_/,''),label:word};sense.variants.push(variant);}
 fs.writeFileSync('public'+variant.src,bytes);
 Object.assign(variant,{sha256:sha,format:'webp'});
 for(const key of ['width','height','master_png_src','master_png_sha256'])delete variant[key];
 entry.illustrations.senses=[sense];entry.illustrations.art_status='assigned';
 report.push({word,id:entry.id,src:variant.src,sha256:sha,operation:['рыбак','учительница'].includes(word)?'replace':'link'});
}
const previous=lib.provenance.image_pack_20261120;
lib.provenance.image_pack_20261120={archive:'Zabavograd_Konfeta_to_Trener_39_WEBP(1).zip',created:(previous?.created||0)+created.length,created_ids:[...(previous?.created_ids||[]),...created],image_count:39,replaced:['рыбак','учительница']};
fs.writeFileSync('outputs/library-v2.json',JSON.stringify(lib,null,2)+'\n');
fs.writeFileSync('outputs/image-library.json',JSON.stringify(registry,null,2)+'\n');
fs.writeFileSync('outputs/image-pack-20261120-audit.json',JSON.stringify({count:39,created_cards:lib.provenance.image_pack_20261120.created,entries:report},null,2)+'\n');
console.log('Verified 39 images; created '+created.length+' cards; replaced fisherman and teacher in place.');
