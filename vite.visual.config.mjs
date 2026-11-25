import {defineConfig} from 'vite';
/** Alternate entry runs the real game source with exactly one stylesheet tree. */
function replacementGameStyles(){return {
 name:'replacement-game-styles',enforce:'pre',
 transform(code,id){
  const [path,query='']=id.replaceAll('\\','/').split('?');
  if(!path.endsWith('/src/main.tsx')||!new URLSearchParams(query).has('visual-next'))return;
  const original="import './style.css';";
  if(code.split(original).length!==2)throw new Error('The real game must have one explicit legacy stylesheet import before replacement');
  return {code:code.replace(original,"import './visual/index.css';"),map:null};
 }
}}
export default defineConfig({plugins:[replacementGameStyles()],build:{outDir:'dist-visual',rollupOptions:{input:{game:'index.html',lab:'visual-lab.html',replacement:'visual-game.html'}}}});
