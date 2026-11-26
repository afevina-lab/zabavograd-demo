#!/usr/bin/env node
'use strict';
// Construct an unreferenced commit on a clean canonical checkout. No ref
// updates, pushes, publication, checkout changes or alternate writable master.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {load,delta}=require('./library-store.cjs');
const {resolveSource}=require('./library-source.cjs');
const {apply,readRegular}=require('./library-apply-bundle.cjs');
const {replayCandidate}=require('./library-media-package.cjs');
const {projectRegistry}=require('./library-import.cjs');
const ROOT=path.resolve(__dirname,'..'),MODULES='outputs/library-modules',REGISTRY='outputs/image-library.json';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const cleanEnv=()=>Object.fromEntries(Object.entries(process.env).filter(([k])=>!['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'].includes(k)));
function git(args,env=cleanEnv(),cwd=ROOT){return execFileSync('git',args,{cwd,env,encoding:'utf8',timeout:60000,maxBuffer:16*1024*1024});}
function head(){return git(['rev-parse','HEAD']).trim();}
function clean(){
 assert.equal(git(['status','--porcelain=v1','--untracked-files=all']).trim(),'','Canonical checkout must be clean');
}
function prepareCommit(base,bundle,pin,mediaPin){
 assert(/^[a-f0-9]{40}$/.test(base||''),'Exact base commit required');
 assert.equal(head(),base,'HEAD differs from base');
 assert(fs.existsSync(path.join(ROOT,'editorial/library-source-mode.json')),'Canonical module switch required');
 assert.equal(resolveSource().path,path.join(ROOT,MODULES),'Canonical modular source required');
 clean();
 const source=path.join(ROOT,MODULES),old=load(source),original=fs.readFileSync(path.join(ROOT,REGISTRY));
 const report=JSON.parse(readRegular(bundle,'result.json',100*1024));
 const isMedia=report.status==='validated_media_candidate_not_approved';
 assert(isMedia?!!mediaPin:mediaPin===undefined,'Wrong package type or missing media pin');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'library-commit-'));
 try{
  const generation=path.join(tmp,'generation'),workspace=path.join(tmp,'tree');fs.mkdirSync(workspace);
  let modules,media,assets=[];
  if(isMedia){
   const verified=replayCandidate(source,bundle,generation,pin,mediaPin);
   modules=path.join(generation,'modules');media=path.join(generation,'media');assets=verified.assets;
  }else{
   apply(source,bundle,generation,pin);modules=generation;
  }
  const next=load(modules),diff=delta(old.manifest,next.manifest);
  assert.equal(next.source_sha256,report.result_source_sha256);
  const registry=projectRegistry(next.db,JSON.parse(original));
  const registryText=JSON.stringify(registry,null,2)+'\n';
  // Preserve original bytes if no new image associations exist.
  const registryChanged=!require('node:util').isDeepStrictEqual(registry,JSON.parse(original));
  const expected=[MODULES+'/manifest.json',...[...diff.added,...diff.modified,...diff.removed].map(f=>MODULES+'/'+f)];
  if(registryChanged)expected.push(REGISTRY);
  const moduleTarget=path.join(workspace,MODULES);
  fs.mkdirSync(path.dirname(moduleTarget),{recursive:true});fs.cpSync(modules,moduleTarget,{recursive:true});
  const registryTarget=path.join(workspace,REGISTRY);
  if(registryChanged)fs.writeFileSync(registryTarget,registryText,{flag:'wx'});
  if(isMedia)assert.equal(fs.readFileSync(path.join(media,'image-library.json'),'utf8'),registryText,'Registry bytes differ');
  const assetPaths=[];
  for(const asset of assets){
   const f='public'+asset.src,from=path.join(media,f),to=path.join(workspace,f);
   assert(!fs.existsSync(path.join(ROOT,f)),'New asset conflicts with checkout');
   const bytes=fs.readFileSync(from);assert.equal(sha(bytes),asset.sha256);
   fs.mkdirSync(path.dirname(to),{recursive:true});fs.writeFileSync(to,bytes,{flag:'wx'});
   expected.push(f);assetPaths.push(f);
  }
  const index=path.join(tmp,'index'),env={...cleanEnv(),GIT_INDEX_FILE:index};
  git(['read-tree',base],env);
  const worktreeEnv={...env,GIT_WORK_TREE:workspace,GIT_DIR:git(['rev-parse','--absolute-git-dir']).trim()};
  git(['add','-A','--',MODULES,...(registryChanged?[REGISTRY]:[]),...assetPaths],worktreeEnv,workspace);
  const changed=git(['diff','--cached','--no-renames','--name-only','-z',base],env).split('\0').filter(Boolean).sort();
  assert.deepEqual(changed,expected.sort(),'Unexpected commit paths');
  const tree=git(['write-tree'],env).trim();
  assert.equal(head(),base,'HEAD changed');clean();
  assert.equal(load(source).source_sha256,old.source_sha256,'Source changed');
  assert.equal(sha(fs.readFileSync(path.join(ROOT,REGISTRY))),sha(original),'Registry changed');
  const commit=git(['commit-tree',tree,'-p',base,'-m','Validated modular library candidate '+pin.slice(0,12)],env).trim();
  assert(/^[a-f0-9]{40}$/.test(commit));
  assert.equal(head(),base,'HEAD changed');clean();
  return {status:'validated_unreferenced_commit_not_approved',base_commit:base,commit,tree,source_sha256:old.source_sha256,result_source_sha256:next.source_sha256,changed_files:changed};
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
module.exports={prepareCommit};
if(require.main===module)try{
 const [base,bundle,pin,mediaPin,...extra]=process.argv.slice(2);
 assert(base&&bundle&&pin&&!extra.length,'Usage: library-commit-package.cjs BASE_COMMIT BUNDLE_DIR LIBRARY_PREVIEW_SHA256 [MEDIA_PREVIEW_SHA256]');
 console.log(JSON.stringify(prepareCommit(base,bundle,pin,mediaPin),null,2));
}catch(e){console.error(e.stack);process.exitCode=1;}
