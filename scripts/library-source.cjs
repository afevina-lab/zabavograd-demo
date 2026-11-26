'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),LEGACY=path.join(ROOT,'outputs/library-v2.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function readSource(){
 const requested=process.env.ZABAVOGRAD_LIBRARY_MODULES;
 if(requested!==undefined){
  if(!requested.trim())throw Error('Empty modular source path');
  const dir=path.resolve(requested);
  // Lazy import avoids a dependency cycle with library-toolkit.
  const store=require('./library-store.cjs'),r=store.load(dir);
  const raw=store.snapshot(r.db);
  return {db:r.db,raw,sha256:r.source_sha256,mode:'modules',path:dir};
 }
 const raw=fs.readFileSync(LEGACY,'utf8');
 return {db:JSON.parse(raw),raw,sha256:sha(raw),mode:'legacy',path:LEGACY};
}
function requireLegacyWrite(){
 if(process.env.ZABAVOGRAD_LIBRARY_MODULES!==undefined)throw Error('Direct V2 write disabled in modular mode; use library-store patch to create a candidate');
}
module.exports={readSource,requireLegacyWrite};
if(require.main===module){
 const [cmd,...rest]=process.argv.slice(2);
 if(rest.length||!['export','info'].includes(cmd))throw Error('Usage: library-source.cjs export|info');
 const r=readSource();
 if(cmd==='export')process.stdout.write(r.raw);
 else console.log(JSON.stringify({mode:r.mode,source_sha256:r.sha256,entries:r.db.entries.length}));
}
