'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const store=require('./library-store.cjs'),{readSource}=require('./library-source.cjs');
const initial=require('./library-initial-analysis.cjs'),external=require('./library-external-proposals.cjs'),writer=require('./library-analysis-writer.cjs');
const {verifyArchive}=require('./library-archive-guard.cjs');
const root=path.resolve(__dirname,'..');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),save=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
function run(cmd,args){const p=spawnSync(cmd,args,{cwd:root,stdio:'inherit'});if(p.error||p.status!==0)throw p.error||Error(cmd+' failed: '+p.status);}
const [reqFile,work,output]=process.argv.slice(2);
const req=read(reqFile),source=readSource(),current=store.load(source.path);
assert.deepEqual(Object.keys(req).sort(),['mode','source_sha256','version']);
assert.equal(req.version,1);assert.equal(req.mode,'apply_standard');
assert.equal(req.source_sha256,current.source_sha256,'Stale source; regenerate request');
fs.mkdirSync(work);fs.mkdirSync(output);
let db=current.db,stats={};
// Fresh initial analysis on all pending records. Exact phonetic eligibility remains in exporter.
const initialReq=path.join(work,'initial.json');save(initialReq,{version:1,mode:'initial',domain:'both',source_sha256:current.source_sha256,limit:2500});
run('python',['scripts/library-analysis-request.py',initialReq,path.join(work,'initial')]);
const init=initial.plan(db,read(path.join(work,'initial/analysis.json')),current.source_sha256);db=init.db;stats.initial=init.stats;
// External sources are fetched and processed in the runner, never copied as raw dictionaries.
run(process.execPath,['scripts/linguistic-sources.cjs','--source','framebank','--fetch','--accept-gpl-review-only']);
const framebank=read(path.join(root,'.local/linguistic-sources/framebank-suggestions.json'));assert.equal(framebank.library_source.sha256,current.source_sha256);
let r=external.plan(db,framebank);db=r.db;stats.framebank=r.stats;
const ruFile=path.join(work,'ruwordnet.json');run('python',['scripts/ruwordnet-relations.py',ruFile]);
const ru=read(ruFile);assert.equal(ru.library_source.sha256,current.source_sha256);
r=external.plan(db,ru);db=r.db;stats.ruwordnet=r.stats;
r=require('./library-standard-relations.cjs').apply(db);db=r.db;stats.standard_relations=r.stats;
// Admit fresh exact inflections using existing approval contract, no unverified count forms.
const beforeMorph=path.join(work,'before-morph.json'),afterMorph=path.join(work,'after-morph.json'),morphReport=path.join(work,'morph-report.json');
save(beforeMorph,db);run('python',['scripts/library-batch-enrichment.py',beforeMorph,afterMorph,morphReport]);
const morph=read(afterMorph),rep=read(morphReport),expanded=structuredClone(morph);
for(const e of expanded.entries)if(rep.ids.includes(e.id))delete e.morphology.data.approved_form_subset;
stats.morphology_expanded=writer.verifyExtension(db,expanded);
let step=expanded;
for(let i=0;i<rep.ids.length;i+=30){
 const ids=rep.ids.slice(i,i+30),set=new Set(ids),next=structuredClone(step);
 const map=new Map(morph.entries.filter(e=>set.has(e.id)).map(e=>[e.id,e]));
 for(const e of next.entries)if(set.has(e.id))e.morphology.data.approved_form_subset=map.get(e.id).morphology.data.approved_form_subset;
 writer.verifySafeSubset(step,next,ids);step=next;
}
assert.deepEqual(step,morph);db=morph;stats.morphology_admitted=rep.approved;
stats.manual_review={entries:db.entries.filter(e=>e.external_linguistic_proposals?.length).length,proposals:db.entries.reduce((n,e)=>n+(e.external_linguistic_proposals?.length||0),0),ambiguous:db.entries.reduce((n,e)=>n+(e.external_linguistic_proposals||[]).filter(p=>p.match_status==='ambiguous_sense_requires_manual_review').length,0)};
assert.deepEqual(db.entries.map(e=>e.id),current.db.entries.map(e=>e.id));assert.deepEqual(db.categories,current.db.categories);
assert.deepEqual(db.relations.slice(0,current.db.relations.length),current.db.relations);
verifyArchive(db,require('../editorial/library-archive-baseline.json'));
const candidate=path.join(work,'candidate');
const checked=writer.stageVerified(current,db,candidate,{changed:db.entries.filter((e,i)=>JSON.stringify(e)!==JSON.stringify(current.db.entries[i])).length+(db.relations.length-current.db.relations.length)});
if(checked.status==='no_changes'){save(path.join(output,'result.json'),{status:'no_changes',source_sha256:current.source_sha256,stats});process.exit(0);}
const m=store.load(candidate).manifest,d=store.delta(current.manifest,m),dir=path.join(output,'delta');fs.mkdirSync(dir);
for(const rel of ['manifest.json',...d.added,...d.modified]){const target=path.join(dir,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(candidate,rel),target);}
save(path.join(output,'result.json'),{status:'validated_candidate',source_sha256:current.source_sha256,result_source_sha256:m.source_sha256,delta:d,stats});
