'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),source=path.join(root,'src');
const domain=new Set(['material-types.ts','material-policy.ts','material-selection.ts','model.ts','learning.ts','reading.ts','sorting.ts','transformations.ts','counting.ts']);
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):/\.tsx?$/.test(e.name)?[path.join(dir,e.name)]:[]);
const graph=new Map();
for(const file of walk(source)){
 const rel=path.relative(source,file).replaceAll('\\','/'),text=fs.readFileSync(file,'utf8');
 const edges=[];
 // Scan the project's explicit static import/export convention; tsc verifies syntax.
 const clean=text.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^[ \t]*\/\/.*$/gm,'');
 const imports=clean.matchAll(/\b(import|export)\s+(type\s+)?([^;]*?)\s+from\s+['"]([^'"]+)['"]/g);
 for(const match of imports){
  const name=match[4],typeOnly=Boolean(match[2]);
  if(domain.has(rel))assert(name.startsWith('./')&&!/design-system|\.tsx$/.test(name),rel+': domain depends on UI or packages: '+name);
  if(name.startsWith('.')){
   const target=path.resolve(path.dirname(file),name);
   assert(target.startsWith(source+path.sep),rel+': import outside src');
   assert(fs.existsSync(target),rel+': unresolved import '+name);
   if(!typeOnly&&!/\.css$/.test(target))edges.push(target);
  }
 }
 if(domain.has(rel)){
  assert(!/\b(document|window|localStorage|fetch)\b/.test(clean),rel+': browser access in domain');
  assert(!/\b(import\s*\(|require\s*\()/.test(clean),rel+': dynamic dependencies forbidden in domain');
 }
 graph.set(file,edges);
}
const visiting=new Set(),done=new Set();
function check(file,trail=[]){if(done.has(file))return;assert(!visiting.has(file),'Runtime dependency cycle: '+[...trail,file].map(p=>path.relative(source,p)).join(' -> '));visiting.add(file);for(const target of graph.get(file)||[])check(target,[...trail,file]);visiting.delete(file);done.add(file);}
for(const file of graph.keys())check(file);
assert(!/\bimport\b/.test(fs.readFileSync(path.join(source,'material-types.ts'),'utf8')),'Material types must remain dependency-free');
const workflows=path.join(root,'.github/workflows');
for(const file of fs.readdirSync(workflows)){
 const text=fs.readFileSync(path.join(workflows,file),'utf8');
 if(file!=='visual-publish.yml'&&/HEAD:gh-pages|push[^\n]*gh-pages/.test(text))assert(/if:\s*\$\{\{\s*false\s*\}\}/.test(text),`Competing publication workflow: ${file}`);
}
console.log(`Architecture verified: ${graph.size} modules, pure domain, no runtime cycles, one active publisher`);
