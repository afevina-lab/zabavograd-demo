'use strict';
const {execFileSync}=require('node:child_process');
const sha=/^[a-f0-9]{40}$/;
const clients=new Set(['public/editor/modular-client.mjs','editor-service/modular-client.test.mjs']);
const docs=new Set(['docs/LIBRARY_CUTOVER.md','docs/LIBRARY_MODULAR_INTEGRATION.md','docs/LIBRARY_REMOTE.md','docs/LIBRARY_TOOLKIT.md','docs/LIBRARY_INDEX.md','docs/LIBRARY_STORAGE_MIGRATION.md','editor-service/README.md']);
function classify(paths,{known=true,manual=false}={}){
 if(manual||!known||!Array.isArray(paths)||!paths.length)return 'full';
 if(paths.every(p=>docs.has(p)))return 'docs';
 if(paths.every(p=>docs.has(p)||clients.has(p)))return 'client';
 return 'full';
}
function changed(before,after){
 if(!sha.test(before||'')||!sha.test(after||'')||/^0+$/.test(before))return null;
 try{
  execFileSync('git',['cat-file','-e',before+'^{commit}'],{stdio:'ignore'});
  execFileSync('git',['cat-file','-e',after+'^{commit}'],{stdio:'ignore'});
  // Disable rename detection so an old path deletion cannot be hidden by a rename.
  const raw=execFileSync('git',['diff','--no-renames','--name-only','-z',before,after,'--'],{encoding:'utf8',maxBuffer:16*1024*1024});
  return raw.split('\0').filter(Boolean);
 }catch{return null;}
}
module.exports={classify,changed};
if(require.main===module){
 const paths=changed(process.argv[2],process.argv[3]);
 const mode=classify(paths,{known:paths!==null,manual:process.argv[4]==='workflow_dispatch'});
 console.log(mode);
}
