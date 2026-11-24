import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {THEMES,THEME_IDS,themeVars} from '../src/design-system/themes.ts';
import {MOTION} from '../src/design-system/motion.ts';
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);
const roots=['public/assets/themes','public/assets/theme-ui','public/assets/neutral','public/assets/forest','public/assets/space','public/assets/icons-new','public/assets/rewards','public/assets/flashcards','public/assets/fonts'];
const files=[];for(const dir of roots){try{files.push(...walk(dir))}catch(error){if(error.code!=='ENOENT')throw error}}
const assets=[...new Set(files)].sort().map(file=>{const bytes=readFileSync(file);return {file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}});
writeFileSync('docs/visual-next/art-inventory.json',JSON.stringify({schema:1,scope:'Visual artwork, skins, icons, rewards and fonts. Dictionary artwork remains in its canonical image registry.',themes:Object.fromEntries(THEME_IDS.map(id=>[id,{config:THEMES[id],variables:themeVars(id,'/')} ])),motion:MOTION,assets},null,2)+'\n');
console.log('Frozen visual assets: '+assets.length);
