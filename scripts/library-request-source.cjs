#!/usr/bin/env node
'use strict';
// Remote requests consume the single canonical modular source, never a migration copy.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {resolveSource}=require('./library-source.cjs');
const store=require('./library-store.cjs');
const remote=require('./library-request.cjs');
const ROOT=path.resolve(__dirname,'..');
function canonical(root=ROOT,env=process.env){
 assert(env.ZABAVOGRAD_LIBRARY_MODULES===undefined,'Unexpected source override in remote workflow');
 return resolveSource(root,env).path;
}
function prepare(dest,root=ROOT,env=process.env){
 const directory=canonical(root,env);
 // Preserve the workflow CLI argument; never create a staging directory.
 assert(!fs.existsSync(dest),'Staging destination already exists');
 return {directory,mode:'canonical_modules',source_sha256:store.load(directory).source_sha256};
}
function query(directory,request,result){
 assert.equal(path.resolve(directory),path.resolve(canonical()),'Remote query must use canonical modules');
 remote.run(request,result);
}
module.exports={prepare,query};
if(require.main===module)try{
 const [cmd,...args]=process.argv.slice(2);
 if(cmd==='prepare'&&args.length===1)console.log(JSON.stringify(prepare(args[0])));
 else if(cmd==='query'&&args.length===3)query(...args);
 else throw Error('Usage: library-request-source.cjs prepare TEMP_DIR | query MODULES REQUEST RESULT');
}catch(e){console.error(e.message);process.exitCode=1;}
