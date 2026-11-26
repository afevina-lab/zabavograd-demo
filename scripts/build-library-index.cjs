#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {index}=require('./library-toolkit.cjs');
const ROOT=path.resolve(__dirname,'..');
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const gitBlob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const paths={master:'outputs/library-v2.json',draft:'outputs/library-v2-auto-analysis.json',syllables:'outputs/library-syllable-structure.json',runtime:'library.json',tasks:'editorial/library-tasks.json'};
const W=[100,70,50,30,20,10,0];
const cmp=(a,b)=>a<b?-1:a>b?1:0;
function summary(rows,key){const m=new Map();for(const r of rows){const k=key(r);m.set(k,(m.get(k)||0)+1);}return Object.fromEntries([...m].sort((a,b)=>cmp(a[0],b[0])));}
function status(x){return typeof x?.status==='string'?x.status:null;}
function hasTokens(x){return Array.isArray(x?.sound_tokens)&&x.sound_tokens.length>0;}
function hasForms(x){return x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length>0;}
function relationIndex(db,byId){
 const counts=new Map();
 for(const rel of db.relations||[]){
  const members=new Set();
  for(const [k,v] of Object.entries(rel)){
   if(['approval','provenance'].includes(k))continue;
   if(v&&typeof v==='object'&&!Array.isArray(v)&&typeof v.id==='string'&&byId.has(v.id))members.add(v.id);
  }
  for(const id of members){
   const c=counts.get(id)||{total:0,by_type:{},verified:0,suggested:0};
   c.total++;const type=rel.type||'unknown';
   Object.defineProperty(c.by_type,type,{value:(Object.hasOwn(c.by_type,type)?c.by_type[type]:0)+1,enumerable:true,writable:true,configurable:true});
   if(rel.approval?.status==='verified')c.verified++;
   if(rel.approval?.status==='suggested')c.suggested++;
   counts.set(id,c);
  }
 }
 return counts;
}
function build(db,draft,syll,meta,tasks){
 const byId=index(db),draftById=new Map();
 for(const row of draft?.entries||[]){if(draftById.has(row.id))throw Error('Duplicate machine analysis '+row.id);draftById.set(row.id,row);}
 const relations=relationIndex(db,byId),syllTypes=new Map();
 const syllFresh=Boolean(syll?.source?.canonical_blob_sha&&syll.source.canonical_blob_sha===meta.master.git_blob&&syll.source.blob_sha===meta.runtime?.git_blob);
 if(syllFresh)for(const [type,ids] of Object.entries(syll.groups||{}))for(const id of ids){
  assert(byId.has(id),'Unknown syllable ID '+id);assert(!syllTypes.has(id),'Duplicate syllable group membership '+id);syllTypes.set(id,type);
 }
 const draftSourceKnown=typeof draft?.source==='object'&&draft.source?.canonical_blob_sha===meta.master.git_blob;
 const all=[...byId.values()].map(e=>{
  const d=draftById.get(e.id),draftMatches=d?.lemma===e.lemma;
  const weight=e.selection?.base_weight??null;
  const storedPh=hasTokens(e.phonetic_tags?.data)||hasTokens(e.machine_analysis?.phonetic);
  const storedForms=hasForms(e.morphology?.data?.automatic_proposal?.forms)||hasForms(e.machine_analysis?.morphology?.forms);
  const rel=relations.get(e.id)||{total:0,by_type:{},verified:0,suggested:0};
  return {id:e.id,lemma:e.lemma,weight,kind:e.kind??null,pos:e.part_of_speech??null,
   categories:(e.categories||[]).map(c=>c.path),
   phonetic:{status:status(e.phonetic_tags),stored_tokens:storedPh,draft_status:draftMatches?status(d.phonetic):null,draft_tokens:draftMatches?hasTokens(d.phonetic):false},
   morphology:{status:status(e.morphology),stored_candidate_forms:Boolean(storedForms),draft_status:draftMatches?status(d.morphology):null},
   metadata_status:e.metadata_completion||null,
   syllable_type:syllFresh?(syllTypes.get(e.id)??null):null,
   relation_counts:rel,illustrations:(e.illustrations?.senses||[]).reduce((n,s)=>n+(s.variants||[]).length,0)
  };
 }).sort((a,b)=>(b.weight??-1)-(a.weight??-1)||cmp(a.id,b.id));
 const pages={},pageList=[],size=40;
 for(const weight of [...W,'other']){
  const rows=all.filter(r=>weight==='other'?!W.includes(r.weight):r.weight===weight);
  for(let i=0;i<rows.length;i+=size){
   const key='weight-'+weight+'/page-'+String(i/size+1).padStart(3,'0')+'.json';
   const page=rows.slice(i,i+size);pages[key]=page;
   pageList.push({file:key,weight,count:page.length,first_id:page[0].id,last_id:page.at(-1).id});
  }
 }
 assert.equal(Object.values(pages).flat().length,all.length);
 const fieldCounts={};for(const e of byId.values())for(const [k,v] of Object.entries(e)){if(!Object.hasOwn(fieldCounts,k))Object.defineProperty(fieldCounts,k,{value:{entries:0,value_bytes:0},enumerable:true});fieldCounts[k].entries++;fieldCounts[k].value_bytes+=Buffer.byteLength(JSON.stringify(v));}
 const queues={};
 const filters={
  phonetics:r=>r.kind==='word'&&!r.phonetic.stored_tokens,
  phonetic_review:r=>r.phonetic.status==='automatic_candidate_needs_review',
  morphology:r=>r.kind==='word'&&['pending_automatic_analysis',null].includes(r.morphology.status),
  morphology_review:r=>r.morphology.status==='automatic_candidate_needs_review',
  category_review:r=>r.kind==='word'&&!r.categories.length,
  illustration_review:r=>r.kind==='word'&&r.illustrations===0
 };
 for(const task of tasks.tasks){
  if(!task.filter)continue;
  assert(Object.hasOwn(filters,task.filter),'Unknown queue filter '+task.filter);
  const rows=all.filter(filters[task.filter]);
  const batches=[];
  for(let i=0;i<rows.length;i+=size){
   const key='queues/'+task.id+'/page-'+String(i/size+1).padStart(3,'0')+'.json';
   pages[key]=rows.slice(i,i+size).map(r=>({id:r.id,lemma:r.lemma,weight:r.weight}));
   batches.push({file:key,count:pages[key].length});
  }
  queues[task.id]={count:rows.length,by_weight:summary(rows,r=>String(r.weight)),pages:batches};
 }
 return {pages,manifest:{schema_version:1,source:meta,entries:all.length,categories:db.categories?.length??0,relations:db.relations?.length??0,
  page_size:size,pages:pageList,weights:summary(all,r=>String(r.weight)),phonetic_status:summary(all,r=>r.phonetic.status??'missing'),morphology_status:summary(all,r=>r.morphology.status??'missing'),
  fields:fieldCounts,syllable_index_fresh:syllFresh,draft_source_verified:draftSourceKnown,queues,
  notes:['Raw statuses are not review decisions.','A missing illustration or relation is a review candidate, not a mandatory gap.','Draft data is not proof of current or approved analysis.','Syllable groups are omitted unless both recorded source blobs match.','Translations in other branches are outside this main-source index.']}};
}
function main(){
 const dest=process.argv[2];if(!dest||process.argv.length!==3)throw Error('Usage: node scripts/build-library-index.cjs OUTPUT_DIR (must not exist)');
 const output=path.resolve(dest);if(fs.existsSync(output))throw Error('Output directory already exists');
 const meta={},data={};
 for(const [key,p] of Object.entries(paths)){
  const raw=fs.readFileSync(path.join(ROOT,p));meta[key]={path:p,sha256:sha256(raw),git_blob:gitBlob(raw),bytes:raw.length};
  if(key!=='runtime')data[key]=JSON.parse(raw);
 }
 const built=build(data.master,data.draft,data.syllables,meta,data.tasks);
 fs.mkdirSync(output,{recursive:true});
 function write(name,value){const file=path.join(output,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
 write('manifest.json',built.manifest);
 write('tasks.json',data.tasks);
 for(const [name,value] of Object.entries(built.pages))write(name,value);
 console.log(JSON.stringify({entries:built.manifest.entries,pages:Object.keys(built.pages).length,queues:Object.fromEntries(Object.entries(built.manifest.queues).map(([k,v])=>[k,v.count])),syllable_index_fresh:built.manifest.syllable_index_fresh},null,2));
}
module.exports={build,gitBlob};
if(require.main===module)try{main();}catch(e){console.error(e.stack);process.exitCode=1;}
