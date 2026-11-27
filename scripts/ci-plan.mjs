import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
const games=['memory','sorting','matching','conveyor','transformations'];
const themes=['neutral','forest','space'];
const doc=p=>/^(?:docs|outputs)\/.+\.md$/.test(p)||/^(?:README(?:-UI)?|AGENTS)\.md$/.test(p)||p==='editor-service/README.md';
const library=p=>p.startsWith('outputs/library-modules/')||['outputs/image-library.json','outputs/library-syllable-structure.json','library.json','semantic-graph.json','public/grammar-frames.json'].includes(p);
const wordImage=p=>/^public\/assets\/words\/.+\.webp$/i.test(p);
const game=p=>p.match(/^src\/(Sorting|Matching|Conveyor|Transformations)\.tsx$/)?.[1].toLowerCase();
const theme=p=>p.match(/^public\/assets\/themes\/(neutral|forest|space)\/.+\.(?:webp|png|svg)$/i)?.[1];
export function planChecks(paths,requested='AUTO'){
 if(!['AUTO','FULL'].includes(requested))throw Error('Unknown check mode');
 const reasons=[],kinds=new Set(),affectedGames=new Set(),affectedThemes=new Set();
 const known=Array.isArray(paths)&&paths.length>0&&paths.every(p=>typeof p==='string'&&p.length>0&&!p.startsWith('/')&&!p.split('/').includes('..')&&!p.includes('\\'));
 if(!known||requested==='FULL'){kinds.add('FULL');reasons.push('Manual full or unavailable diff');}
 for(const p of known?paths:[]){
  if(doc(p)){reasons.push('Documentation: '+p);continue;}
  if(library(p)||wordImage(p)){kinds.add('LIBRARY');reasons.push('Library/media: '+p);continue;}
  if(game(p)){kinds.add('GAME');affectedGames.add(game(p));reasons.push('Game view: '+p);continue;}
  if(theme(p)){kinds.add('THEME');affectedThemes.add(theme(p));reasons.push('Theme asset: '+p);continue;}
  kinds.add('FULL');reasons.push('Shared, build, or unknown: '+p);
 }
 const mode=kinds.size===0?'DOCS':kinds.size!==1||kinds.has('FULL')?'FULL':[...kinds][0];
 return {schema:2,mode,requested,reasons,games:mode==='DOCS'?[]:mode==='GAME'?[...affectedGames].sort():games,
 themes:mode==='DOCS'?[]:mode==='THEME'?[...affectedThemes].sort():mode==='LIBRARY'?['neutral']:themes,
 sizes:mode==='DOCS'?[]:mode==='FULL'?[[1440,900],[1024,768],[768,1024],[390,844],[844,390]]:[[1440,900],[390,844]],
 wordImages:known?paths.filter(wordImage):[],publish:mode!=='DOCS'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const paths=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 console.log(JSON.stringify(planChecks(paths,process.argv[3]||'AUTO'),null,2));
}
