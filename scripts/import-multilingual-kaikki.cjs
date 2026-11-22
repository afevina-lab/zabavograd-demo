#!/usr/bin/env node
'use strict';
// One-off, offline import of Wiktextract/Kaikki JSONL into REVIEW-ONLY candidates.
// Usage: node scripts/import-multilingual-kaikki.cjs INPUT.jsonl OUTPUT.json --source-url URL --license SPDX_OR_TEXT --retrieved-at YYYY-MM-DD
// Never modifies outputs/library-v2.json, gameplay exports, or publication assets.
const fs=require('node:fs');
const readline=require('node:readline');
const crypto=require('node:crypto');
const path=require('node:path');
const SUPPORTED=new Set(['en','fr','es','de']);
const POS=new Set(['noun','verb','adj','adv','pron','det','num','prep','conj','intj','proper noun','name','phrase']);
const languageCodes={English:'en',French:'fr',Spanish:'es',German:'de'};
const str=x=>typeof x==='string'?x.trim():'';
const status='suggested';
function stableId(...parts){return crypto.createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0,20);}
function normalizeLanguage(row){
 const code=str(row.lang_code).toLowerCase();
 return SUPPORTED.has(code)?code:languageCodes[str(row.lang)]||null;
}
function convert(row,meta){
 const lang=normalizeLanguage(row);
 const lemma=str(row.word);
 const pos=str(row.pos).toLowerCase();
 if(!lang||!lemma||!POS.has(pos))return null;
 // Keep a separate record for each spelling/POS; senses are never assumed equivalent to Russian IDs.
 const key=['kaikki',lang,lemma,pos], id='kw-'+stableId(...key);
 const senses=(Array.isArray(row.senses)?row.senses:[]).slice(0,50).map((s,i)=>({
  sense_id:id+'-s'+String(i+1).padStart(3,'0'),
  ...(Array.isArray(s.glosses)&&str(s.glosses[0])?{gloss:str(s.glosses[0]).slice(0,500)}:{}),
  review_status:status,
  links:[]
 }));
 if(!senses.length)return null;
 const forms=(Array.isArray(row.forms)?row.forms:[]).filter(f=>str(f.form)).slice(0,150).map(f=>({
  form:str(f.form),features:{tags:(Array.isArray(f.tags)?f.tags:[]).filter(x=>typeof x==='string').join(',')},review_status:status
 }));
 const pronunciations=(Array.isArray(row.sounds)?row.sounds:[]).filter(s=>str(s.ipa)).slice(0,30).map(s=>({
  ipa:str(s.ipa),...(Array.isArray(s.tags)&&s.tags.length?{variety:s.tags.join(',')}:{}),review_status:status
 }));
 return {id,language:lang,lemma,part_of_speech:pos,meanings:senses,forms,pronunciations,review_status:status,
  provenance:[{source:'Kaikki/Wiktionary',source_record_id:id,license:meta.license,source_url:meta.sourceUrl,retrieved_at:meta.retrievedAt}]};
}
function validateCandidates(data){
 if(data.schema_version!==1||data.source_library!=='outputs/library-v2.json'||!Array.isArray(data.records))throw Error('Invalid staging envelope');
 const ids=new Set();
 for(const e of data.records){
  if(!SUPPORTED.has(e.language)||!e.lemma||!e.id||ids.has(e.id))throw Error('Invalid/duplicate entry '+e.id);
  ids.add(e.id);
  if(e.review_status!=='suggested')throw Error('Import cannot approve entries');
  if(!e.meanings?.length||!e.provenance?.length)throw Error('Missing senses or provenance');
  for(const s of e.meanings)if(s.review_status!=='suggested'||s.links.length)throw Error('Imported sense cannot have approved or guessed links');
  for(const p of e.provenance)if(!p.license||!p.source_url||!/^\\d{4}-\\d{2}-\\d{2}$/.test(p.retrieved_at))throw Error('Incomplete provenance');
  for(const f of e.forms||[])if(f.review_status!=='suggested')throw Error('Unexpected approved form');
  for(const f of e.pronunciations||[])if(f.review_status!=='suggested')throw Error('Unexpected approved pronunciation');
 }
 return true;
}
async function importJsonl(input,meta,{limit=0}={}){
 if(!meta.sourceUrl?.startsWith('https://')||!meta.license||!/^\\d{4}-\\d{2}-\\d{2}$/.test(meta.retrievedAt))throw Error('Explicit HTTPS source, license and ISO date required');
 const byId=new Map();let scanned=0,filtered=0,malformed=0;
 const stream=readline.createInterface({input:fs.createReadStream(input,{encoding:'utf8'}),crlfDelay:Infinity});
 for await(const line of stream){
  if(!line.trim())continue;
  scanned++;
  let row;try{row=JSON.parse(line);}catch{malformed++;continue;}
  const result=convert(row,meta);
  if(!result){filtered++;continue;}
  // Multiple dictionary rows with the same lemma/POS are merged conservatively;
  // never infer sense equality or create cross-language links.
  if(byId.has(result.id)){
   const existing=byId.get(result.id), seen=new Set(existing.meanings.map(s=>s.gloss||''));
   for(const meaning of result.meanings){
    const key=meaning.gloss||'';
    if(seen.has(key))continue;
    seen.add(key);
    existing.meanings.push({...meaning,sense_id:existing.id+'-s'+String(existing.meanings.length+1).padStart(3,'0')});
   }
  }else byId.set(result.id,result);
  if(limit&&byId.size>=limit)break;
 }
 const records=[...byId.values()].sort((a,b)=>a.language.localeCompare(b.language)||a.lemma.localeCompare(b.lemma)||a.part_of_speech.localeCompare(b.part_of_speech));
 const result={schema_version:1,source_library:'outputs/library-v2.json',languages:[...new Set(records.map(x=>x.language))].sort(),records};
 validateCandidates(result);
 return {result,report:{scanned,filtered,malformed,staged:records.length,approved:0,linked_to_russian:0}};
}
function argValue(flag){const p=process.argv.indexOf(flag);return p<0?null:process.argv[p+1];}
if(require.main===module){
 (async()=>{
  const input=process.argv[2],output=process.argv[3];
  if(!input||!output||path.resolve(input)===path.resolve(output))throw Error('Usage: INPUT.jsonl OUTPUT.json --source-url HTTPS_URL --license LICENSE --retrieved-at YYYY-MM-DD');
  if(fs.existsSync(output))throw Error('Output exists; refusing to overwrite staged review data');
  const meta={sourceUrl:argValue('--source-url'),license:argValue('--license'),retrievedAt:argValue('--retrieved-at')};
  const lim=argValue('--limit');
  const limit=lim===null?0:Number(lim);
  if(!Number.isSafeInteger(limit)||limit<0)throw Error('Invalid --limit');
  const {result,report}=await importJsonl(input,meta,{limit});
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\\n',{flag:'wx'});
  process.stdout.write(JSON.stringify(report)+'\\n');
 })().catch(e=>{console.error(e.message);process.exitCode=1;});
}
module.exports={convert,validateCandidates,importJsonl,stableId};
