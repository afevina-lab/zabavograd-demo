#!/usr/bin/env node
'use strict';
// Inspect a small external Kaikki word-page sample; produce review-only JSON report.
// This is a developer/CI tool, NEVER part of the game runtime.
// It does not write into the canonical library or approve translations.
const https=require('node:https');
const fs=require('node:fs');
const PAIRS=[
 ['en','cat'],['en','apple'],['en','dog'],['en','house'],
 ['fr','chat'],['fr','chien'],['fr','maison'],
 ['es','gato'],['es','perro'],['es','casa'],
 ['de','Katze'],['de','Hund'],['de','Haus']
];
const names={en:'English',fr:'French',es:'Spanish',de:'German'};
function pageUrl(lang,word){
 if(!names[lang]||!/^[\p{L}\p{M} -]{1,60}$/u.test(word))throw Error('Unsupported language/word');
 const w=word.normalize('NFC');
 const dir1=w.slice(0,1),dir2=w.slice(0,2);
 return 'https://kaikki.org/dictionary/'+names[lang]+'/meaning/'+encodeURIComponent(dir1)+'/'+encodeURIComponent(dir2)+'/'+encodeURIComponent(w)+'.html';
}
function fetchText(url,redirects=3){
 return new Promise((resolve,reject)=>{
  if(!url.startsWith('https://kaikki.org/'))return reject(Error('Untrusted host'));
  const req=https.get(url,{headers:{'User-Agent':'Zabavograd-DictionaryPilot/1.0 (review-only)'}},res=>{
   if(res.statusCode>=300&&res.statusCode<400&&res.headers.location&&redirects>0){
    const to=new URL(res.headers.location,url).toString();res.resume();resolve(fetchText(to,redirects-1));return;
   }
   if(res.statusCode!==200){res.resume();reject(Error('HTTP '+res.statusCode));return;}
   let size=0,out='';
   res.setEncoding('utf8');
   res.on('data',chunk=>{size+=Buffer.byteLength(chunk);if(size>1500000){req.destroy(Error('Response too large'));return;}out+=chunk;});
   res.on('end',()=>resolve(out));res.on('error',reject);
  });
  req.setTimeout(18000,()=>req.destroy(Error('Timed out')));
  req.on('error',reject);
 });
}
function findDownload(html,htmlUrl){
 const matches=[...html.matchAll(/href\s*=\s*["']([^"']+\.jsonl(?:\?[^"']*)?)["']/gi)];
 for(const m of matches){
  const url=new URL(m[1].replaceAll('&amp;','&'),htmlUrl).toString();
  if(url.startsWith('https://kaikki.org/'))return url;
 }
 return null;
}
function normalizeRow(row,lang,word){
 if(row.lang_code!==lang||row.word!==word||row.pos!=='noun')return null;
 return {
  pos:row.pos,
  ipa:[...new Set((row.sounds||[]).filter(s=>typeof s.ipa==='string').map(s=>s.ipa))].slice(0,8),
  plural_forms:[...new Set((row.forms||[]).filter(f=>(f.tags||[]).includes('plural')&&typeof f.form==='string').map(f=>f.form))].slice(0,8),
  gender_tags:[...new Set([...(row.tags||[]),...(row.senses||[]).flatMap(s=>s.tags||[])].filter(t=>['masculine','feminine','neuter','common-gender'].includes(t)))],
  sense_count:(row.senses||[]).length
 };
}
async function inspect(lang,word){
 const url=pageUrl(lang,word),html=await fetchText(url);
 const dataUrl=findDownload(html,url);
 if(!dataUrl)return {language:lang,lemma:word,page_url:url,status:'no_jsonl_link'};
 const jsonl=await fetchText(dataUrl),evidence=[];
 for(const line of jsonl.split(/\r?\n/)){
  if(!line.trim())continue;
  try{const rec=normalizeRow(JSON.parse(line),lang,word);if(rec)evidence.push(rec);}catch{}
 }
 return {language:lang,lemma:word,page_url:url,data_url:dataUrl,status:evidence.length?'matched':'no_matching_noun',evidence};
}
if(require.main===module)(async()=>{
 const results=[];
 for(const [lang,word] of PAIRS){
  try{results.push(await inspect(lang,word));}
  catch(e){results.push({language:lang,lemma:word,page_url:pageUrl(lang,word),status:'fetch_failed',error:e.message});}
 }
 const result={schema_version:1,purpose:'Source evidence sample only; does not approve matches to Russian concepts',source:'Kaikki/Wiktionary',retrieved_at:new Date().toISOString().slice(0,10),results};
 const filename=process.argv[2];
 if(filename)fs.writeFileSync(filename,JSON.stringify(result,null,2)+'\n');
 console.log('KAikki source sample',JSON.stringify({matched:results.filter(x=>x.status==='matched').length,total:results.length,details:results.map(x=>({lang:x.language,word:x.lemma,status:x.status,ipa:x.evidence?.flatMap(e=>e.ipa).slice(0,2),plurals:x.evidence?.flatMap(e=>e.plural_forms).slice(0,2)}))}));
})().catch(e=>{console.error(e);process.exitCode=1});
module.exports={pageUrl,findDownload,normalizeRow,inspect};
