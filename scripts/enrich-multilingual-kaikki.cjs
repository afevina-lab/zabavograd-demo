#!/usr/bin/env node
'use strict';
// Source-aware augmentation of EXISTING editorial proposals from Kaikki/Wiktextract JSONL.
// Default is DRY RUN. --apply updates only editorial/review/multilingual-weight100-proposals.json.
// Never modifies outputs/library-v2.json, game exports, statuses, or published site.
const fs=require('node:fs'),readline=require('node:readline'),path=require('node:path');
const langs=new Set(['en','fr','es','de']);
const names={English:'en',French:'fr',Spanish:'es',German:'de'};
function language(row){return langs.has(row.lang_code)?row.lang_code:names[row.lang];}
function collect(row){
 const trim=x=>typeof x==='string'?x.trim():'';
 const tags=(row.head_templates||[]).flatMap(t=>Array.isArray(t.tags)?t.tags:[]);
 const senses=(row.senses||[]).flatMap(s=>Array.isArray(s.tags)?s.tags:[]);
 const forms=(row.forms||[]).filter(f=>trim(f.form)).map(f=>({form:f.form,tags:Array.isArray(f.tags)?f.tags:[]})).slice(0,100);
 const sounds=(row.sounds||[]).filter(s=>trim(s.ipa)).map(s=>({ipa:s.ipa,tags:Array.isArray(s.tags)?s.tags:[]})).slice(0,24);
 return {gender_tags:[...new Set([...tags,...senses,...(Array.isArray(row.tags)?row.tags:[])].filter(t=>['masculine','feminine','neuter','common-gender'].includes(t)))],forms,sounds};
}
async function annotate(doc,jsonl,meta){
 if(!meta.source_url?.startsWith('https://')||!meta.license||!/^\d{4}-\d{2}-\d{2}$/.test(meta.retrieved_at))throw Error('source-url, license and retrieved-at required');
 const lookup=new Map();
 for(const r of doc.records){
  for(const lang of doc.languages){
   const val=r.translations[lang]?.normalize('NFC');
   if(!val)continue;
   const key=lang+'|'+val.toLocaleLowerCase('und');
   if(!lookup.has(key))lookup.set(key,[]);
   lookup.get(key).push(r);
  }
 }
 let scanned=0,matched=0,ambiguous=0;
 const stream=readline.createInterface({input:fs.createReadStream(jsonl),crlfDelay:Infinity});
 for await(const line of stream){
  if(!line.trim())continue;
  scanned++;
  let row;try{row=JSON.parse(line);}catch{continue;}
  if(row.pos!=='noun')continue;
  const lang=language(row),word=row.word?.normalize('NFC');
  if(!lang||!word)continue;
  const targets=lookup.get(lang+'|'+word.toLocaleLowerCase('und'))||[];
  if(!targets.length)continue;
  const candidate=collect(row);
  if(!candidate.forms.length&&!candidate.sounds.length&&!candidate.gender_tags.length)continue;
  for(const target of targets){
   const detail=target.language_details[lang];
   if(!detail)continue;
   // Preserve multiple source observations, avoid overwriting editorial forms.
   const evidence={...candidate,source_url:meta.source_url,license:meta.license,retrieved_at:meta.retrieved_at,review_status:'suggested'};
   detail.dictionary_evidence=detail.dictionary_evidence||[];
   const key=JSON.stringify(evidence);
   if(!detail.dictionary_evidence.some(e=>JSON.stringify(e)===key)){detail.dictionary_evidence.push(evidence);matched++;}
   if(targets.length>1)ambiguous++;
  }
 }
 return {scanned,evidence_added:matched,ambiguous_lemma_matches:ambiguous,approved:0};
}
function arg(flag){const index=process.argv.indexOf(flag);return index<0?null:process.argv[index+1];}
if(require.main===module)(async()=>{
 const file=process.argv[2],jsonl=process.argv[3],apply=process.argv.includes('--apply');
 if(!file||!jsonl)throw Error('Usage: node scripts/enrich-multilingual-kaikki.cjs PROPOSALS.json SOURCE.jsonl --source-url URL --license LICENSE --retrieved-at YYYY-MM-DD [--apply]');
 if(path.resolve(file)===path.resolve(jsonl))throw Error('Source and destination must differ');
 const doc=JSON.parse(fs.readFileSync(file,'utf8'));
 const report=await annotate(doc,jsonl,{source_url:arg('--source-url'),license:arg('--license'),retrieved_at:arg('--retrieved-at')});
 if(apply){
  const tmp=file+'.tmp-'+process.pid;
  try{fs.writeFileSync(tmp,JSON.stringify(doc,null,2)+'\n',{flag:'wx'});fs.renameSync(tmp,file);}
  finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
 }
 process.stdout.write(JSON.stringify({...report,mode:apply?'applied':'dry-run'})+'\n');
})().catch(error=>{console.error(error.message);process.exitCode=1});
module.exports={annotate,collect};
