import {test} from 'node:test';
import assert from 'node:assert/strict';
import {THEMES,THEME_IDS,assetUrl,asThemeId,themeAttributes,themeVars,soundFile} from '../src/design-system/themes.ts';
import {MOTION} from '../src/design-system/motion.ts';
test('Every theme has one complete, validated visual configuration',()=>{
 assert.deepEqual([...THEME_IDS],['neutral','forest','space','children-room']);
 assert.deepEqual(Object.keys(THEMES),[...THEME_IDS]);
 for(const id of THEME_IDS){
  const t=THEMES[id],a=themeAttributes(id),vars=themeVars(id,'/demo/');
  assert.equal(a['data-theme'],id);
  assert.equal(a['data-card-style'],t.cards.kind);
  assert.equal(a['data-scene-motion'],t.scene.motion);
  assert.equal(a['data-toolbar-art'],t.toolbarArt?'illustrated':'kit');
  assert.equal(vars['--ui-accent'],t.palette.accent);
  assert.equal(vars['--zg-match-duration'],`${MOTION.matchMs}ms`);
  assert.match(String(vars['--zg-award-stars-image']),/\/demo\/assets\/rewards\/star\.webp/);
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
 assert.equal(THEMES.neutral.scene.background,'assets/neutral/approved-paper-4k.webp');
 assert.equal(THEMES.neutral.cards.back,'assets/themes/neutral/back.webp');
 assert.equal(THEMES.neutral.cards.front,'assets/themes/neutral/front.webp');
 assert.equal(THEMES.space.scene.background,'assets/space/background.webp');
 assert.equal(THEMES.forest.scene.background,'assets/themes/forest/forest_background.webp');
 assert.equal(THEMES.forest.cards.back,'assets/themes/forest/back.webp');
 assert.equal(THEMES.forest.cards.front,'assets/themes/forest/front.webp');
 assert.equal(THEMES.forest.toolbarArt,'assets/themes/forest/header.webp');
 assert(THEMES.forest.scene.sprites.length>=12);
 for(const tree of ['tree-depth-left','tree-depth-right','tree-far-left','tree-far-right','tree-left','tree-right']){
  assert(THEMES.forest.scene.sprites.some(sprite=>sprite.id===tree),`Forest must include ${tree}`);
 }
 assert.equal(new Set(THEMES.forest.scene.sprites.map(sprite=>sprite.id)).size,THEMES.forest.scene.sprites.length);
 assert(THEMES.forest.scene.sprites.some(x=>x.id==='tree-far-left'));
 assert(THEMES.forest.scene.sprites.some(x=>x.id==='flowers-right'));
 assert(THEMES.forest.scene.sprites.filter(x=>x.motion==='sway').every(x=>x.origin==='50% 94%'));
 assert.equal(THEMES.forest.scene.effects.stars,0);
 assert.equal(THEMES.space.scene.sprites.length,11);
 assert.equal(THEMES.space.scene.effects.stars,30);
 assert.equal(THEMES.space.scene.effects.comets,2);
});
test('BASE_URL and audio are independent of game templates',()=>{
 assert.equal(assetUrl('assets/image.webp','/zabavograd-demo/'),'/zabavograd-demo/assets/image.webp');
 assert.equal(assetUrl('/assets/image.webp','/'),'/assets/image.webp');
 assert.equal(asThemeId('forest'),'forest');
 assert.equal(asThemeId('unknown'),'space');
 assert.equal(soundFile('space','flip'),'click-space.mp3');
 assert.equal(soundFile('neutral','flip'),'click.mp3');
 assert.equal(soundFile('forest','win'),'success.mp3');
 assert(MOTION.matchMs>=1500&&MOTION.resultMs>MOTION.matchMs&&MOTION.layoutMs>0);
});

test('space retains both planets and independent floating and rotation',()=>{const blue=THEMES.space.scene.sprites.find(s=>s.id==='planet-blue')!;const rings=THEMES.space.scene.sprites.find(s=>s.id==='planet-rings')!;assert(rings.src.endsWith('/planet.webp'));assert.equal(rings.motion,'float');assert.equal(blue.motion,'float');assert(blue.spinMs!>0);assert.equal(THEMES.space.scene.motion,'drift');});
