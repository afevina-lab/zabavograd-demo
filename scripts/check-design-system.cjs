'use strict';
/** Enforce the current visual architecture. Run after extracting the UI pack. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
async function run(){
 const {THEMES,THEME_IDS,themeVars}=await import('../src/design-system/themes.ts');
 const layout=read('src/styles/layout.css'),controls=read('src/design-system/controls.css');
 assert(!fs.existsSync(path.join(root,'src/styles/legacy.css')),'Old visual CSS must not reappear');
 assert(!/\.(?:space|neutral|forest)(?![\w-])/.test(layout),'Theme-specific legacy layout rules must be removed');
 assert(!/border-image-slice:\s*72/.test(layout),'Obsolete watercolor nine-slice card borders forbidden');
 assert(!/\/assets\/ui\/square\.png/.test(layout),'Obsolete icon sprite forbidden');
 assert(controls.includes('var(--skin-square)'),'Universal watercolor controls must be separate');
 assert(!/saturate\s*\(/.test(layout+read('src/design-system/motion.css')),'Animations must never desaturate');
 assert(read('src/design-system/theme.css').includes('border-image:none!important'),'Full-bleed toolbar is required');
 assert(read('src/design-system/motion.css').includes('zg-pigment-bloom'),'Synchronized watercolor pop is required');
 assert(read('src/main.tsx').includes('zg-caption-toggle')&&read('src/Sorting.tsx').includes('zg-caption-toggle'),'Shared caption controls missing');
 assert.equal(read('src/style.css').trim(),`/* Shared source order: layout, theme surfaces, control skins, motion. */
@import './styles/layout.css';
@import './design-system/theme.css';
@import './design-system/controls.css';
@import './design-system/motion.css';`.trim(),'CSS imports must remain layered');
 for(const p of ['src/design-system/theme.css','src/design-system/controls.css','src/design-system/motion.css']){
  const css=read(p);
  assert(!/\.(?:space|neutral|forest)(?=[\s.#:[>])/.test(css),'Theme selectors forbidden in '+p);
  assert(!/\/assets\/(?:space|neutral|forest)\//.test(css),'Theme asset URLs forbidden in '+p);
 }
 for(const p of ['src/main.tsx','src/Sorting.tsx']){
  const source=read(p);
  assert(source.includes('themeAttributes(theme)')&&source.includes('themeVars(theme,'),'Shared skin missing: '+p);
  assert(source.includes('useTheme()'),'Shared theme persistence missing: '+p);
  assert(source.includes('<ScoreStars '),'Shared score animation missing: '+p);
  assert(!source.includes('className="victory-stars"'),'Result visuals must be shared: '+p);
  assert(!/theme\s*===\s*['"](?:space|neutral|forest)['"]/.test(source),'Hardcoded theme behavior: '+p);
 }
 for(const id of THEME_IDS){
  const t=THEMES[id],vars=themeVars(id,'/');
  for(const asset of [t.scene.background,t.toolbarArt,t.cards.back,t.cards.front,...t.scene.sprites.map(s=>s.src)].filter(Boolean))
   assert(fs.existsSync(path.join(root,'public',asset)),'Missing theme image: '+asset);
  for(const [name,value] of Object.entries(vars)){
   if(!name.startsWith('--skin-'))continue;
   const match=String(value).match(/^url\("\/(assets\/[^"]+)"\)$/);
   assert(match,'Malformed theme UI path: '+id+' '+name);
   assert(fs.existsSync(path.join(root,'public',match[1])),'Missing theme UI: '+id+' '+match[1]);
  }
 }
 const animation=read('src/design-system/motion.css');
 assert(animation.includes('prefers-reduced-motion'),'Reduced motion must be tested and supported');
 assert(animation.includes('var(--zg-match-duration)'),'Shared animation timings missing');
 console.log('Validated visual contract:',THEME_IDS.join(', '));
}
run().catch(e=>{console.error(e);process.exitCode=1});
