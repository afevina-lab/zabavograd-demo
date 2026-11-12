'use strict';
// The PUBLIC repository is the sole editable source. Never fetch from a second repo.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const source=path.join(root,'outputs/library-v2.json');
const runtime=path.join(root,'library.json');
const target=path.join(root,'public/library.json');
if(fs.existsSync(source)){
 cp.execFileSync(process.execPath,[path.join(root,'scripts/export-library.cjs')],{cwd:root,stdio:'inherit'});
 fs.copyFileSync(target,runtime);
 fs.copyFileSync(path.join(root,'public/semantic-graph.json'),path.join(root,'semantic-graph.json'));
}else{
 if(!fs.existsSync(runtime))throw Error('Missing runtime library.json');
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.copyFileSync(runtime,target);
}
console.log('Runtime is sourced exclusively from afevina-lab/zabavograd-demo');
