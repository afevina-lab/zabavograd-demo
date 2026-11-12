import {test} from 'node:test';
import assert from 'node:assert/strict';
import {THEMES,THEME_IDS,assetUrl,asThemeId,themeAttributes,themeVars,soundFile} from '../src/design-system/themes.ts';
import {MOTION} from '../src/design-system/motion.ts';
test('Every theme has one complete, validated visual configuration',()=>{
 assert.deepEqual([...THEME_IDS],['neutral','forest','space']);
 assert.deepEqual(Object.keys(THEMES),[...THEME_IDS]);
 for(const id of THEME_IDS){
  const t=THEMES[id],a=themeAttributes(id),vars=themeVars(id,'/demo/');
  assert.equal(a['data-theme'],id);
  assert.equal(a['data-card-style'],t.cards.kind);
  assert.equal(a['data-scene-motion'],t.scene.motion);
  assert.equal(a['data-toolbar-art'],t.toolbarArt?'illustrated':'kit');
  assert.equal(vars['--ui-accent'],t.palette.accent);
  assert.equal(vars['--zg-match-duration'],`${MOTION.matchMs}ms`);
  assert.match(String(vars['--skin-panel']),/\/demo\/assets\/theme-ui\/panels\//);
  assert.match(String(vars['--skin-pill']),/\/demo\/assets\/theme-ui\/buttons\/pill\//);
  if(t.scene.background)assert.match(String(vars['--zg-stage-image']),/\/demo\/assets\//);
  else assert.equal(vars['--zg-stage-image'],'none');
  if(t.toolbarArt)assert.match(String(vars['--zg-toolbar-image']),/\/demo\/assets\//);
  else assert.equal(vars['--zg-toolbar-image'],'none');
  if(t.cards.kind==='watercolor'){
   assert.match(String(vars['--zg-card-back-image']),/assets\/.+\.webp/);
   assert.match(String(vars['--zg-card-front-image']),/assets\/.+\.webp/);
  }else{
   assert.equal(vars['--zg-card-back-image'],'none');
   assert.equal(vars['--zg-card-front-image'],'none');
  }
 }
 assert.equal(THEMES.forest.scene.background,'assets/themes/forest/forest_background.webp');
 assert.equal(THEMES.forest.cards.back,'assets/themes/forest/back.webp');
 assert.equal(THEMES.forest.cards.front,'assets/themes/forest/front.webp');
 assert.equal(THEMES.forest.toolbarArt,'assets/themes/forest/header.webp');
 assert.deepEqual(THEMES.forest.scene.sprites.map(x=>x.id),['tree-left','tree-right','fern','bush','flowers','leaf-birch','leaf-oak','leaf-oval']);
 assert(THEMES.forest.scene.sprites.filter(x=>x.motion==='sway').every(x=>x.origin==='50% 94%'));
 assert.equal(THEMES.forest.scene.effects.stars,0);
 assert.equal(THEMES.space.scene.sprites.length,10);
 assert.equal(THEMES.space.scene.effects.stars,30);
 assert.equal(THEMES.space.scene.effects.comets,2);
});
test('BASE_URL and audio are independent of game templates',()=>{
 assert.equal(assetUrl('assets/image.webp','/zabavograd-demo/'),'/zabavograd-demo/assets/image.webp');
 assert.equal(assetUrl('/assets/image.webp','/'),'/assets/image.webp');
 assert.equal(asThemeId('forest'),'forest');
 assert.equal(asThemeId('unknown'),'space');
 assert.equal(soundFile('space','flip'),'flip-space.wav');
 assert.equal(soundFile('neutral','flip'),'flip.ogg');
 assert.equal(soundFile('forest','win'),'win.wav');
 assert(MOTION.matchMs>0&&MOTION.layoutMs>0);
});
