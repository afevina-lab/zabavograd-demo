#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const tracked=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean);
const relevant=tracked.filter(f=>/^(scripts|tests|editor-service|src|\.github\/workflows|editorial|schemas)\//.test(f)||['AGENTS.md','package.json'].includes(f)).filter(f=>/\.(cjs|mjs|js|ts|tsx|py|html|yml|yaml|json|md)$/.test(f));
const rows=[];
for(const file of relevant){
 const full=path.join(root,file);if(!fs.existsSync(full)||fs.statSync(full).size>1024*1024)continue;
 const lines=fs.readFileSync(full,'utf8').split(/\r?\n/);
 const hits=[];
 for(let i=0;i<lines.length;i++){
  const l=lines[i];
  if(/library-v2\.json|legacy_source|library-v2-auto-analysis\.json/.test(l))
   hits.push({line:i+1,text:l.trim().slice(0,320)});
 }
 if(!hits.length)continue;
 const hasMaster=hits.some(h=>/library-v2\.json/.test(h.text));
 const role=file.startsWith('tests/')?'test':file.startsWith('.github/')?'workflow':file.startsWith('editor-service/')?'editor':file.startsWith('scripts/')?'script':'other';
 rows.push({file,role,master_reference:hasMaster,archive_reference:hits.some(h=>/legacy_source/.test(h.text)),draft_reference:hits.some(h=>/library-v2-auto-analysis\.json/.test(h.text)),possible_writer:hasMaster&&/writeFile|write_text|write_bytes|open\(.+['"]w|git add|write_json|save_library|saveLibrary|\.replace\(/i.test(lines.join('\n')),hits});
}
const report={files:rows.length,master_references:rows.filter(r=>r.master_reference).length,archive_references:rows.filter(r=>r.archive_reference).length,possible_writers:rows.filter(r=>r.possible_writer).length,by_role:Object.fromEntries([...new Set(rows.map(r=>r.role))].map(role=>[role,rows.filter(r=>r.role===role).length])),notes:['Static literal scan; possible writers are conservative candidates, not proof. Dynamic paths, generated code, and references outside scanned directories need review.','Do not migrate one-time historical scripts blindly; retire or require explicit compatibility mode.'],rows};
const out=process.argv[2];if(!out)throw Error('Specify report path');fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,rows:undefined,possible_writer_paths:rows.filter(r=>r.possible_writer).map(r=>r.file)},null,2));
