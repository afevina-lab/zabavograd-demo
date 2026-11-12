const {spawnSync}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const root=path.resolve(__dirname,'..');
function run(command,args){const r=spawnSync(command,args,{cwd:root,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);}
const python=process.env.PYTHON||'python';
run(process.execPath,['scripts/build-library-v2-view.cjs']);
run(process.execPath,['scripts/export-library.cjs']);
run(process.execPath,['node_modules/typescript/bin/tsc','--noEmit']);
run(process.execPath,['node_modules/vite/bin/vite.js','build','--base','/zabavograd-demo/','--outDir','.local/pages-dist']);
run(python,['scripts/optimize-release.py','--directory','.local/pages-dist','--report','.local/release-reports/optimization.json']);
run(process.execPath,['scripts/check-pages.cjs']);
console.log('Verified Pages build: '+path.join(root,'.local/pages-dist'));
