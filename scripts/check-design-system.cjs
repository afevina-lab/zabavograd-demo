'use strict';
/** Validate the replacement visual source and the approved registry, not retired patches. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const walk=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(dir+'/'+entry.name):[dir+'/'+entry.name]);
async function run(){
 const {THEMES,THEME_IDS,themeVars}=await import('../src/design-system/themes.ts');
 const files=walk('src/visual').filter(file=>file.endsWith('.css'));
 const css=files.map(file=>read(file)).join('\n'),animation=read('src/visual/motion/motion.css');
 assert(!fs.existsSync(path.join(root,'src/styles/legacy.css')),'Retired legacy CSS must not return');
 for(const file of files){const source=read(file);
  assert(!/!important/.test(source),'Priority patch in '+file);
  assert(!/\.(?:app|space|neutral|forest)(?![\w-])/.test(source),'Legacy/theme selector in '+file);
  assert(!/border-image-slice:\s*72|\/assets\/ui\/square\.png/.test(source),'Obsolete sprite or slicing in '+file);
 }
 assert(!/saturate\s*\(/.test(css),'Interaction feedback must preserve artwork colors');
 assert(animation.includes('v-pollen')&&!animation.includes('v-pigment-bloom')&&!animation.includes('v-match-glow'),'Match must use fine pollen without the retired bloom');
 assert(animation.includes('v-camera-zoom'),'Shared scene camera motion missing');
 assert(animation.includes('prefers-reduced-motion'),'Reduced motion support missing');
 assert(animation.includes('var(--zg-match-duration)'),'Registry motion timing missing');
 assert(read('src/main.tsx').includes('<SceneCamera '),'Memory must use the shared camera');
 assert(read('src/visual/primitives/score-stars.css').includes('var(--zg-award-stars-image)'),'Approved award artwork missing');
 assert(fs.existsSync(path.join(root,'public/assets/neutral/approved-stars.webp')),'Missing approved star atlas');
 const entry=read('src/main.tsx');
 assert(entry.includes("import './visual/index.css'"),'Real games must import the replacement cascade');
 assert(!entry.includes("import './style.css'"),'Retired stylesheet entry is still loaded');
 assert(read('src/visual/index.css').includes('@layer reset, foundation, primitives, compositions, games, motion;'),'Missing explicit cascade order');
 for(const file of ['src/main.tsx','src/Sorting.tsx','src/Matching.tsx','src/Conveyor.tsx','src/Transformations.tsx']){
  const source=read(file);
  assert(source.includes('themeAttributes(theme)')&&source.includes('visualThemeVars(theme,'),'Registry-backed visual root missing: '+file);
  assert(source.includes('useTheme()'),'Shared theme persistence missing: '+file);
  assert(source.includes('<GameDialog '),'Shared game dialog missing: '+file);
  assert(!/theme\s*===\s*['"](?:space|neutral|forest)['"]/.test(source),'Theme-specific gameplay behavior: '+file);
 }
 const forest=themeVars('forest','/'),space=themeVars('space','/');
 assert.notEqual(forest['--ui-frame-fill'],space['--ui-frame-fill'],'Distinct frame finishes must remain');
 assert.notEqual(forest['--ui-setup-paper'],space['--ui-setup-paper'],'Distinct surface palettes must remain');
 assert.equal(forest['--ui-frame-base'],'#c28a48','Approved forest wood changed');
 assert.equal(forest['--ui-required'],space['--ui-required'],'Required state must remain semantic');
 for(const id of THEME_IDS){const theme=THEMES[id];
  for(const asset of [theme.scene.background,theme.toolbarArt,theme.cards.back,theme.cards.front,...theme.scene.sprites.map(sprite=>sprite.src)].filter(Boolean))assert(fs.existsSync(path.join(root,'public',asset)),'Missing artwork: '+asset);
  for(const [name,value] of Object.entries(themeVars(id,'/'))){if(!name.startsWith('--skin-'))continue;
   const match=String(value).match(/^url\("\/(assets\/[^"]+)"\)$/);assert(match,'Malformed skin path: '+name);assert(fs.existsSync(path.join(root,'public',match[1])),'Missing skin: '+match[1]);
  }
 }
 console.log('Validated replacement visual registry and contracts:',THEME_IDS.join(', '));
}
run().catch(error=>{console.error(error);process.exitCode=1});
