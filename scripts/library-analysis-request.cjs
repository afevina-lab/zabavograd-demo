#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {readSource}=require('./library-source.cjs');
const store=require('./library-store.cjs');
const initial=require('./library-initial-analysis.cjs');
const writer=require('./library-analysis-writer.cjs');
const root=path.resolve(__dirname,'..');
function validate(r){
 assert(r&&typeof r==='object'&&!Array.isArray(r),'Expected request object');
 const allowed=['version','source_sha256','mode','domain','weight','part_of_speech','category','limit','validate_candidate'];
 assert(Object.keys(r).every(k=>allowed.includes(k)),'Unexpected request key');
 assert.equal(r.version,1);assert(/^[a-f0-9]{64}$/.test(r.source_sha256||''),'Exact source fingerprint required');
 assert(['initial','extend','constructicon','framebank','ruwordnet'].includes(r.mode),'Unknown analysis mode');
 if(r.domain!==undefined)assert(r.mode==='initial'&&['both','morphology','phonetics'].includes(r.domain),'Invalid domain');
 if(r.weight!==undefined)assert([0,10,20,30,50,70,100].includes(r.weight),'Invalid weight');
 if(r.part_of_speech!==undefined)assert(['noun','verb','adjective'].includes(r.part_of_speech),'Invalid part of speech');
 if(r.category!==undefined)assert(typeof r.category==='string'&&r.category.trim()===r.category&&r.category.length>0&&r.category.length<=300,'Invalid category');
 if(r.limit!==undefined)assert(Number.isInteger(r.limit)&&r.limit>=1&&r.limit<=2500,'Invalid limit');
 if(r.validate_candidate!==undefined)assert(typeof r.validate_candidate==='boolean','Invalid validation option');
 if(['constructicon','framebank','ruwordnet'].includes(r.mode))assert(Object.keys(r).every(k=>['version','source_sha256','mode'].includes(k)),'External sources use full library');
 return r;
}
function readRequest(file){const b=fs.readFileSync(file);assert(b.length<=16384,'Request too large');return validate(JSON.parse(b));}
function run(cmd,args){const p=spawnSync(cmd,args,{cwd:root,stdio:'inherit'});if(p.error||p.status!==0)throw p.error||Error(cmd+' failed: '+p.status);}
function json(file,v){fs.writeFileSync(file,JSON.stringify(v,null,2)+'\n',{flag:'wx'});}
function processRequest(requestFile,out,work){
 const r=readRequest(requestFile),s=readSource(),current=store.load(s.path);
 assert.equal(r.source_sha256,current.source_sha256,'Stale source; regenerate request');
 assert(!fs.existsSync(out)&&!fs.existsSync(work),'Output already exists');
 fs.mkdirSync(out);
 const report={version:1,mode:r.mode,request:r,source_sha256:current.source_sha256};
 let next,stats;
 if(r.mode==='ruwordnet'||r.mode==='framebank'){
   fs.mkdirSync(work);
   let data;
   if(r.mode==='ruwordnet'){
     const file=path.join(work,'source-candidates.json');
     run('python',['scripts/ruwordnet-relations.py',file]);
     data=JSON.parse(fs.readFileSync(file,'utf8'));
     Object.assign(report,{source_license:'CC-BY-SA-4.0',source_url:'https://www.ruwordnet.ru/ru/',attribution:'N. Loukachevitch, G. Lashevich, A. Gerasimova, V. Ivanov, B. Dobrov (2016); RuWordNet 2.0 (2021)',publication_note:'Non-commercial data use; official source also specifies non-commercial XML access. Candidate edges only, not raw database or active relations.'});
   }else{
     run(process.execPath,['scripts/linguistic-sources.cjs','--source','framebank','--fetch','--accept-gpl-review-only']);
     data=JSON.parse(fs.readFileSync(path.join(root,'.local/linguistic-sources/framebank-suggestions.json'),'utf8'));
     const rev=require('./linguistic-sources.cjs').SOURCES.framebank.commit;
     run('curl',['--fail','--silent','--show-error','--location','https://raw.githubusercontent.com/olesar/framebank/'+rev+'/LICENSE','--output',path.join(out,'FRAMEBANK-LICENSE.txt')]);
     Object.assign(report,{source_license:'GPL-3.0',source_url:'https://github.com/olesar/framebank/tree/'+rev,attribution:'Olga Lyashevskaya and Egor Kashkin (2015), FrameBank: a database of Russian lexical constructions; contributors listed upstream',publication_note:'FrameBank-derived slots are GPL-3.0 review data only; transformation source in this commit.'});
   }
   assert.equal(data.library_source.sha256,current.source_sha256);
   const result=require('./library-external-proposals.cjs').plan(current.db,data);
   next=result.db;stats=result.stats;
 }else if(r.mode==='constructicon'){
   run(process.execPath,['scripts/linguistic-sources.cjs','--source','constructicon','--fetch']);
   const f=path.join(root,'.local/linguistic-sources/constructicon-suggestions.json'),data=JSON.parse(fs.readFileSync(f,'utf8'));
   assert.equal(data.library_source.sha256,current.source_sha256);
   fs.copyFileSync(f,path.join(out,'suggestions.json'));
   Object.assign(report,{status:'external_suggestions_review_only',source_license:data.license,records:data.records.length});
 }else{
   run('python',['scripts/library-analysis-request.py',requestFile,work]);
   const raw=path.join(work,'analysis.json'),doc=JSON.parse(fs.readFileSync(raw,'utf8'));
   if(r.mode==='initial'){
     run(process.execPath,['scripts/annotate-analysis.cjs',raw]);
     const result=initial.plan(current.db,JSON.parse(fs.readFileSync(raw,'utf8')),current.source_sha256);
     next=result.db;stats=result.stats;
     fs.copyFileSync(raw,path.join(out,'analysis.json'));
   }else{next=doc;stats=writer.verifyExtension(current.db,next);}
   fs.copyFileSync(path.join(work,'report.json'),path.join(out,'analysis-report.json'));
 }
 if(stats){
   Object.assign(report,{stats,status:'no_changes'});
   if(stats.changed){
     const candidate=path.join(work,'candidate');
     // The inexpensive canonical roundtrip, archive and schema gates are mandatory.
     // Full library validator is optional for accumulated drafts; no full site CI here.
     require('./library-archive-guard.cjs').verifyArchive(next,require('../editorial/library-archive-baseline.json'));
     require('./validate-library-contract.cjs').validateLibrary(next);
     if(r.validate_candidate)writer.stageVerified(current,next,candidate,stats);
     else store.create(candidate,next);
     const m=store.load(candidate).manifest,d=store.delta(current.manifest,m);
     const deltaDir=path.join(out,'delta');fs.mkdirSync(deltaDir);
     for(const rel of ['manifest.json',...d.added,...d.modified]){
       const dest=path.join(deltaDir,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});
       fs.copyFileSync(path.join(candidate,rel),dest);
     }
     Object.assign(report,{status:r.validate_candidate?'validated_candidate_not_approved':'candidate_requires_full_validation',result_source_sha256:m.source_sha256,delta:d});
   }
 }
 assert.equal(readSource().sha256,current.source_sha256,'Canonical source changed during analysis');
 json(path.join(out,'result.json'),report);
 return report;
}
module.exports={validate,readRequest,processRequest};
if(require.main===module)try{
 const [mode,...args]=process.argv.slice(2);
 if(mode==='inspect'&&args.length===1){const r=readRequest(args[0]);assert.equal(readSource().sha256,r.source_sha256,'Stale source');console.log(JSON.stringify(r));}
 else if(mode==='run'&&args.length===3)console.log(JSON.stringify(processRequest(...args)));
 else throw Error('Usage: library-analysis-request.cjs inspect REQUEST | run REQUEST OUTPUT WORK');
}catch(e){console.error(e.stack);process.exitCode=1;}
