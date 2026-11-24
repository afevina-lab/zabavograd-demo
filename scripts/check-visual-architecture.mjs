import {validateVisualStyles} from './visual-style-contract.mjs';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);
const files=walk('src/visual');
for(const file of files){const source=readFileSync(file,'utf8');
 if(file.endsWith('.css')){
  assert(!/!important/.test(source),'New visual CSS cannot accumulate priority patches: '+file);
  assert(!/\.app\b|\.settings-block\b|\.shared-toolbar\b/.test(source),'Legacy selector leaked into standalone CSS: '+file);
  assert(!/\[data-theme\s*=/.test(source),'Theme branching belongs to the registry: '+file);
 }
 if(/\.tsx?$/.test(file)&&!file.endsWith('/lab.tsx')){
  assert(!/\bChildren\b|\bcloneElement\b|querySelector|textContent/.test(source),'Visual composition must use explicit slots: '+file);
  assert(!/from ['"][^'"]*(?:learning|model|material-policy|library-loader|sorting|counting)\./.test(source),'Visual components must not own gameplay: '+file);
 }
 assert(!/import[^;]*['"][^'"]*(?:style\.css|design-system\/(?:theme|controls|motion)\.css)['"]/.test(source),'Legacy stylesheet import: '+file);
}
const realShell=readFileSync('src/design-system/SettingsWindow.tsx','utf8');
assert(!/\bChildren\b|cloneElement|\barrange\b|game===/.test(realShell),'Real settings shell must use explicit slots');
const realToolbar=readFileSync('src/GameToolbar.tsx','utf8');
assert(!/\bChildren\b|cloneElement|isValidElement|\bcollect\b/.test(realToolbar),'Real toolbar must use explicit action slots');
const entry=readFileSync('src/visual/index.css','utf8');assert(entry.includes('@layer reset, foundation, primitives, compositions, games, motion;'),'Missing declared cascade order');
assert(!readFileSync('src/main.tsx','utf8').includes('./visual/'),'Production entry must remain unchanged before migration acceptance');
const styles=validateVisualStyles(files.filter(file=>file.endsWith('.css')).map(file=>({file,source:readFileSync(file,'utf8'),layer:file.endsWith('/reset.css')?'reset':file.split('/')[2]})));
console.log(JSON.stringify(styles));
console.log('Standalone visual architecture: '+files.length+' files; explicit slots, no legacy CSS, no priority patches, production entry unchanged');
