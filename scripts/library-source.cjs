'use strict';
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const POLICY='editorial/library-source-mode.json';
function resolveSource(root=ROOT,env=process.env){
 const policy=path.join(root,POLICY),legacy=path.join(root,'outputs/library-v2.json');
 if(!fs.existsSync(policy))throw Error('Canonical source policy required; unmarked or legacy source prohibited');
 const config=JSON.parse(fs.readFileSync(policy,'utf8'));
 if(config?.version!==1||config.mode!=='modules'||config.directory!=='outputs/library-modules'||Object.keys(config).length!==3)throw Error('Invalid canonical library source policy');
 if(fs.existsSync(legacy))throw Error('Two potential canonical sources; remove legacy master');
 if(env.ZABAVOGRAD_LIBRARY_MODULES!==undefined)throw Error('Explicit source override prohibited');
 return {mode:'modules',path:path.join(root,config.directory)};
}
function readSource(root=ROOT,env=process.env){
 const selected=resolveSource(root,env),store=require('./library-store.cjs'),r=store.load(selected.path);
 return {db:r.db,raw:store.snapshot(r.db),sha256:r.source_sha256,...selected};
}
module.exports={readSource,resolveSource};
if(require.main===module){
 const [cmd,...rest]=process.argv.slice(2);
 if(rest.length||!['export','info','mode'].includes(cmd))throw Error('Usage: library-source.cjs export|info|mode');
 if(cmd==='mode')console.log(resolveSource().mode);
 else{const r=readSource();if(cmd==='export')process.stdout.write(r.raw);else console.log(JSON.stringify({mode:r.mode,source_sha256:r.sha256,entries:r.db.entries.length}));}
}
