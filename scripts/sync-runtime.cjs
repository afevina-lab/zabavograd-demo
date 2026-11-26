'use strict';
// Never recover or mutate editorial data during a build.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
require('./library-source.cjs').resolveSource();
cp.execFileSync(process.execPath,[path.join(root,'scripts/export-library.cjs')],{cwd:root,stdio:'inherit'});
fs.copyFileSync(path.join(root,'public/library.json'),path.join(root,'library.json'));
fs.copyFileSync(path.join(root,'public/semantic-graph.json'),path.join(root,'semantic-graph.json'));
console.log('Runtime is sourced exclusively from afevina-lab/zabavograd-demo');
