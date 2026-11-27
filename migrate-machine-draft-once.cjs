'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),cp=require('node:child_process'),path=require('node:path');
const store=require('./scripts/library-store.cjs');
const dir='outputs/library-modules',oldPath='outputs/library-v2-auto-analysis.json';
const current=store.load(dir),raw=fs.readFileSync(oldPath),draft=JSON.parse(raw),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(current.source_sha256,'2342765ab2aae827ab89a2b9bbdcde08b9fbb14ccc5ba35a16879a12d51c5526','Unexpected canonical source');
assert.equal(sha(raw),'ef4f3c7056436c055c611e3dc7164849f83aa0ef646e8a0c09ed2afd54f151c1','Unexpected draft source');
assert.equal(draft.entries.length,1434);
const {entries,...header}=draft,db=structuredClone(current.db),byId=new Map(db.entries.map(e=>[e.id,e])),seen=new Set();
assert(!Object.hasOwn(db,'historical_machine_draft'));
db.historical_machine_draft={status:'historical_unapproved_residual_not_for_generation',source_commit:'9dc237f81fd1cf6b239ccfb1f158424872e9ac56',source_path:oldPath,source_sha256:sha(raw),header,rows:entries.length,policy:'Exact matches omitted; full original is immutable in Git. Conflicting and novel values retained, not approval.'};
const targets=new Set(['ru-new-20261102-0185','ru-new-20261102-0189','ru-new-20261102-0191','ru-new-20261102-0201','ru-new-20261102-0207','ru-new-20261102-0266','ru-new-20261102-0302','ru-plant-20261104-d0b1d0b0d0bed0b1d0b0d0b1']);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),present=(v,c)=>c.some(x=>x!==undefined&&same(x,v));
const counts={rows:0,phonetic_fields_omitted:0,morphology_fields_omitted:0,forms_omitted:0,forms_retained:0,runtime_migrated:0};
for(const r of entries){
 assert(!seen.has(r.id));seen.add(r.id);
 const e=byId.get(r.id);assert(e&&e.lemma===r.lemma&&same(e.meaning??null,r.meaning??null),'Identity conflict '+r.id);
 const p=r.phonetic,m=r.morphology,ep=e.phonetic_tags?.data??{},mp=e.machine_analysis?.phonetic??{},em=e.morphology?.data?.automatic_proposal??{},mm=e.machine_analysis?.morphology??{};
 assert(e.machine_analysis==null||(typeof e.machine_analysis==='object'&&!Array.isArray(e.machine_analysis)));
 const machine=e.machine_analysis??={};
 assert(!Object.hasOwn(machine,'historical_draft'));
 const h={lemma:r.lemma,meaning:r.meaning??null,had_sound_tokens:Array.isArray(p.sound_tokens)&&p.sound_tokens.length>0,phonetic:{},morphology:{}};
 // Keep row metadata if it differs from the current record; keep unknown fields.
 for(const [k,v] of Object.entries(r)){
  if(['id','lemma','meaning','phonetic','morphology'].includes(k))continue;
  const equivalent=k==='weight'?e.selection?.base_weight:e[k];
  if(!same(v,equivalent))(h.row_metadata??={})[k]=v;
 }
 for(const [k,v] of Object.entries(p)){
  const alt={syllables:'syllable_count',markova_type_proposal:'markova_type_candidate',analyzer:'source'}[k]??k;
  if(k!=='status'&&present(v,[ep[k],mp[k],ep[alt],mp[alt],ep.automatic_proposal?.[k],ep.automatic_proposal?.[alt]])){counts.phonetic_fields_omitted++;continue;}
  h.phonetic[k]=v;
 }
 for(const [k,v] of Object.entries(m)){
  const alt={analyzer:'source',tag:'grammemes'}[k]??k;
  if(k==='forms'&&v&&typeof v==='object'&&!Array.isArray(v)){
   const residual={};
   for(const [form,value] of Object.entries(v)){
    if(present(value,[em.forms?.[form],mm.forms?.[form]])){counts.forms_omitted++;continue;}
    residual[form]=value;counts.forms_retained++;
   }
   if(Object.keys(residual).length)h.morphology.forms=residual;
   continue;
  }
  if(k!=='status'&&present(v,[em[k],mm[k],em[alt],mm[alt]])){counts.morphology_fields_omitted++;continue;}
  h.morphology[k]=v;
 }
 machine.historical_draft=h;counts.rows++;
 if(targets.has(e.id)){
  assert.equal(e.phonetic_tags.status,'pending_automatic_analysis');assert(!Object.hasOwn(machine,'phonetic'));
  assert.equal(p.status,'candidate_needs_review');assert.equal(p.analyzer,'nsu-ai/russian_g2p');assert(Array.isArray(p.sound_tokens)&&p.sound_tokens.length&&!p.sound_tokens.includes('V'));
  machine.phonetic={source:p.analyzer,status:'suggested',sound_tokens:p.sound_tokens,stress_syllable:p.stress_syllable,syllable_count:p.syllables,stressed_vowel:p.stressed_vowel??null,markova_type_candidate:p.markova_type_proposal??null,accented:p.accented??null,usable_for_generation:false};
  e.phonetic_tags.status='automatic_candidate_needs_review';
  if(e.metadata_completion?.speech==='pending_automatic_analysis')e.metadata_completion.speech='automatic_candidate_needs_review';
  counts.runtime_migrated++;
 }
}
assert.equal(counts.runtime_migrated,8);assert.equal(counts.rows,1434);
require('./scripts/library-archive-guard.cjs').verifyArchive(db,require('./editorial/library-archive-baseline.json'));
require('./scripts/validate-library-contract.cjs').validateLibrary(db);
// Keep the original reader until its logical snapshot has been verified.
const storePath=require.resolve('./scripts/library-store.cjs');
const storeText=fs.readFileSync(storePath,'utf8'),oldCounts="const counts=Object.freeze(Object.fromEntries([...groups.map(g=>['entries/'+g,32]),['relations',32]]));";
assert(storeText.includes(oldCounts),'Unexpected store layout contract');
fs.writeFileSync(storePath,storeText.replace(oldCounts,"const counts=Object.freeze(Object.fromEntries([...groups.map(g=>['entries/'+g,g==='machine'?64:32]),['relations',32]]));"));
delete require.cache[storePath];
const newStore=require(storePath),dest=process.env.RUNNER_TEMP+'/new-modules',m=newStore.create(dest,db);
assert.equal(newStore.load(dest).source_sha256,m.source_sha256);
for(const [f,v] of Object.entries(current.manifest.files)){
 if(/^(entries\/(?!machine\/|phonetics\/|core\/)|relations\/|categories\.json$)/.test(f))assert.deepEqual(m.files[f],v,'Unrelated shard changed '+f);
}
cp.execFileSync(process.execPath,['scripts/check-library-v2.cjs','--candidate-dir',dest],{stdio:'inherit'});
const beforeBytes=Object.values(current.manifest.files).reduce((n,f)=>n+f.bytes,0)+fs.statSync(dir+'/manifest.json').size+raw.length;
const afterBytes=Object.values(m.files).reduce((n,f)=>n+f.bytes,0)+fs.statSync(dest+'/manifest.json').size;
const maxMachine=Math.max(...Object.entries(m.files).filter(([f])=>f.startsWith('entries/machine/')).map(([,v])=>v.bytes));
assert(maxMachine<=128*1024,'Machine shard exceeds 128 KiB: '+maxMachine);
assert(afterBytes<beforeBytes,'Working tree not reduced');
fs.rmSync(dir,{recursive:true});fs.renameSync(dest,dir);
fs.unlinkSync(oldPath);
console.log('MIGRATION_RESULT '+JSON.stringify({...counts,beforeBytes,afterBytes,removedBytes:beforeBytes-afterBytes,maxMachine,newSource:m.source_sha256}));
