#!/usr/bin/env node
'use strict';
// One entry point for trusted remote workflows, in both source modes.
// Never materialize a second editable source after canonical cutover.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {resolveSource}=require('./library-source.cjs');
const store=require('./library-store.cjs');
const remote=require('./library-request.cjs');
const ROOT=path.resolve(__dirname,'..');
function prepare(dest,root=ROOT){
 assert(process.env.ZABAVOGRAD_LIBRARY_MODULES===undefined,'Unexpected source override in remote workflow');
 const selected=resolveSource(root,{});
 const canonical=selected.mode==='modules';
 assert(!fs.existsSync(dest),'Staging destination already exists');
 assert(canonical||!fs.existsSync(path.join(root,'outputs/library-modules')),'Unmarked modular source; refuse legacy fallback');
 if(!canonical){
  const target=path.resolve(dest),base=path.resolve(root);
  assert(target!==base&&!target.startsWith(base+path.sep),'Temporary modules must be outside repository');
  store.create(target,JSON.parse(fs.readFileSync(selected.path,'utf8')));
 }
 const directory=canonical?selected.path:path.resolve(dest),loaded=store.load(directory);
 return {directory,mode:canonical?'canonical_modules':'legacy_rehearsal',source_sha256:loaded.source_sha256};
}
function query(directory,request,result){
 assert(process.env.ZABAVOGRAD_LIBRARY_MODULES===undefined,'Unexpected source override in remote workflow');
 const selected=resolveSource(ROOT,{});
 const actual=path.resolve(directory);
 if(selected.mode==='modules')assert.equal(actual,path.resolve(selected.path),'Remote query must use canonical modules');
 else{
  assert(!fs.existsSync(path.join(ROOT,'outputs/library-modules')),'Unmarked modular source');
  assert.equal(store.load(actual).source_sha256,store.fingerprint(JSON.parse(fs.readFileSync(selected.path,'utf8'))),'Staged modules differ from source');
  process.env.ZABAVOGRAD_LIBRARY_MODULES=actual;
 }
 try{remote.run(request,result);}finally{if(selected.mode==='legacy')delete process.env.ZABAVOGRAD_LIBRARY_MODULES;}
}
module.exports={prepare,query};
if(require.main===module)try{
 const [cmd,...args]=process.argv.slice(2);
 if(cmd==='prepare'&&args.length===1)console.log(JSON.stringify(prepare(args[0])));
 else if(cmd==='query'&&args.length===3)query(...args);
 else throw Error('Usage: library-request-source.cjs prepare TEMP_DIR | query MODULES REQUEST RESULT');
}catch(e){console.error(e.message);process.exitCode=1;}
