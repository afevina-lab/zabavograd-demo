import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,relative,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let postcss;try{postcss=require('postcss')}catch{postcss=require('../.build-tools/node_modules/.pnpm/postcss@8.5.33/node_modules/postcss')}
export function validateVisualBuildStyles(gameCss,labCss){
 const selectors=css=>{const result=[];postcss.parse(css).walkRules(rule=>result.push(rule.selector));return result.join('\n')};
 assert(!/\.v-root\b/.test(selectors(gameCss)),'Current game entry loads replacement visual CSS');
 assert(!/\.app\b/.test(selectors(labCss)),'Replacement entry loads legacy game CSS');
}
export function checkBuildIsolation(directory){
 const root=resolve(directory);
 const readStyles=entry=>{
  const html=readFileSync(resolve(root,entry),'utf8'),paths=[];
  for(const [tag] of html.matchAll(/<link\b[^>]*>/g)){
   if(!/\brel=["']stylesheet["']/.test(tag))continue;
   const href=tag.match(/\bhref=["']([^"']+)["']/)?.[1];assert(href,'Stylesheet link has no href');
   const url=new URL(href,'http://capture.local/');assert.equal(url.origin,'http://capture.local','External stylesheet in static build');
   const file=resolve(root,'.'+decodeURIComponent(url.pathname));assert(file.startsWith(root+sep),'Stylesheet escapes build root');paths.push(file);
  }
  assert(paths.length,'Entry has no stylesheet: '+entry);
  return {files:paths.map(file=>relative(root,file)),css:paths.map(file=>readFileSync(file,'utf8')).join('\n')};
 };
 const game=readStyles('index.html'),lab=readStyles('visual-lab.html');
 validateVisualBuildStyles(game.css,lab.css);
 return {game:game.files,lab:lab.files};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log('Stylesheet isolation verified: '+JSON.stringify(checkBuildIsolation(process.argv[2]||'dist-visual')));
