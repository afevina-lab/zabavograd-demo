import {pathToFileURL} from 'node:url';
const games=['memory','sorting','matching','conveyor','transformations'];
const themes=['neutral','forest','space'];
const rank={FAST:0,TARGETED:1,FULL:2};
export function planChecks(paths,requested='AUTO'){
 if(!['AUTO',...Object.keys(rank)].includes(requested))throw Error('Unknown check mode');
 let mode='FAST';const affected=new Set(),skins=new Set(),reasons=[];
 const raise=(next,reason,targets=games)=>{if(rank[next]>rank[mode])mode=next;reasons.push(reason);targets.forEach(g=>affected.add(g));};
 if(!paths.length)raise('FULL','No reliable changed-file list');
 for(const raw of paths){const p=raw.replaceAll('\\','/');
  if(/^(docs\/|outputs\/.*\.md$)|(^|\/)(README[^/]*\.md|AGENTS\.md)$/.test(p)){reasons.push('Documentation: '+p);continue;}
  if(/^\.github\/|^package(?:-lock)?\.json$|^vite\.config|^tsconfig|^scripts\//.test(p)){raise('FULL','Build or verification contract: '+p);continue;}
  if(/^src\/.*\.css$|^src\/design-system\/(themes|motion)\./.test(p)){raise('FULL','Global visual contract: '+p);continue;}
  const match=p.match(/^src\/(main|Sorting|sorting|Matching|matching|Conveyor|conveyor|Transformations|transformations)\.[jt]sx?$/);
  if(match){const game={main:'memory',model:'memory'}[match[1]]||match[1].toLowerCase();raise('TARGETED','Game dependency: '+p,[game]);continue;}
  const theme=p.match(/^public\/assets\/(?:themes\/)?(neutral|forest|space)\//);
  if(theme){raise('TARGETED','Theme asset: '+p);skins.add(theme[1]);continue;}
  if(/^src\//.test(p)||/^public\/assets\/(words|icons-new|rewards)\//.test(p)||/^outputs\/(library-v2|image-library)\.json$/.test(p)){raise('TARGETED','Shared consumer dependency: '+p);themes.forEach(t=>skins.add(t));continue;}
  raise('FULL','Unclassified path: '+p);
 }
 if(requested!=='AUTO'&&rank[requested]>rank[mode]){mode=requested;reasons.push('Manual escalation: '+requested);}
 if(mode==='TARGETED'&&!affected.size){games.forEach(g=>affected.add(g));reasons.push('Manual targeted scope has no inferred consumer: include all games');}
 if(mode==='FULL'){games.forEach(g=>affected.add(g));themes.forEach(t=>skins.add(t));}
 const selected=mode==='FAST'?['memory']:[...affected].sort();
 return {schema:1,mode,requested,reasons,games:selected,themes:skins.size?[...skins].sort():mode==='FAST'?['neutral']:themes,sizes:mode==='FULL'?[[1440,900],[1024,768],[768,1024],[390,844],[844,390]]:mode==='FAST'?[[390,844]]:[[1440,900],[390,844],[844,390]],mandatory:['architecture','library-integrity','unit','typescript','build-once','offline','critical-route-and-resources'],deploymentEnabled:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const fs=await import('node:fs');const paths=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''));console.log(JSON.stringify(planChecks(paths,process.argv[3]||'AUTO'),null,2));}
