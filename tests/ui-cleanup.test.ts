import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';

// The Matching grid sizes its own cards; scaling the whole stage blurs text
// and competes with the no-scroll gameplay layout.
test('Matching does not retain the deprecated whole-board scale hook',()=>{
 assert.equal(existsSync('src/design-system/useMatchingFit.ts'),false);
 function walk(dir:string):string[]{
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
   const file=join(dir,entry.name);
   return entry.isDirectory()?walk(file):/\.tsx?$/.test(file)?[file]:[];
  });
 }
 for(const file of walk('src'))assert.doesNotMatch(readFileSync(file,'utf8'),/\buseMatchingFit\b/,file);
});

test('Current Matching layout cannot restore obsolete scrolling and heading selectors',()=>{
 const css=readFileSync('src/styles/layout.css','utf8');
 assert.doesNotMatch(css,/\.matching-stage\s*\{\s*overflow:\s*auto\s*!important/);
 assert.doesNotMatch(css,/\.app\.game-active \.stage\.matching-stage\s*\{\s*overflow:\s*auto\s*!important/);
 assert.doesNotMatch(css,/\.matching-content\s+h1\s*\{/);
 assert.doesNotMatch(css,/\.matching-bank\s+h2\s*\{/);
 assert.match(css,/\.app\.game-active \.stage\.matching-stage\s*\{\s*overflow:\s*hidden\s*!important/);
});

test('QuantitySlider has one modern stepper without old bounds labels',()=>{
 const slider=readFileSync('src/QuantitySlider.tsx','utf8');
 const css=readFileSync('src/design-system/controls.css','utf8');
 assert.match(slider,/quantity-stepper/);
 assert.doesNotMatch(slider,/quantity-bounds/);
 assert.doesNotMatch(css,/quantity-bounds/);
});


test('Game stage never restores legacy scrolling or discarded card layouts',()=>{
 const css=readFileSync('src/styles/layout.css','utf8');
 assert.doesNotMatch(css,/\.app\.game-active \.stage,\.app\.game-active:fullscreen \.stage\s*\{[^}]*overflow:\s*auto/);
 assert.match(css,/\.app\.game-active \.stage,\.app\.game-active:fullscreen \.stage\s*\{[^}]*overflow:\s*hidden\s*!important/);
 assert.doesNotMatch(css,/\.cards\s*\{\s*grid-template-columns/);
 assert.doesNotMatch(css,/\.card\s*\{\s*aspect-ratio:\s*(?:1\.35|\.85|\.9)/);
 assert.doesNotMatch(css,/@media\(prefers-reduced-motion:reduce\)\s*\{\s*\}/);
 assert.doesNotMatch(css,/\.stage\s*\{\s*min-height:\s*(?:540|610|520)px/);
 assert.doesNotMatch(css,/\.workspace\s*\{\s*display:\s*grid/);
});


test('Only canonical shared toolbar grid is defined',()=>{
 const css=readFileSync('src/styles/layout.css','utf8');
 const grids=[...css.matchAll(/\.app\.game-active \.play-toolbar\.shared-toolbar\s*\{([^}]*)\}/g)].filter(match=>match[1].includes('grid-template-columns:'));
 assert.equal(grids.length,1,'shared toolbar must have one grid definition');
 assert.match(grids[0][1],/grid-template-columns:\s*minmax\(0,1fr\) auto minmax\(0,1fr\)/);
 assert.doesNotMatch(css,/\.app\.game-active \.play-toolbar\s*\{gap:12px;flex-wrap:wrap/);
 assert.doesNotMatch(css,/\.quantity-slider>div\s*\{\s*gap:5px;grid-template-columns:/);
});


test('No discarded card skin reset or hidden theme preview variant remains',()=>{
 const css=readFileSync('src/styles/layout.css','utf8');
 assert.doesNotMatch(css,/\.card-back\s*\{background:\s*none center\/100% 100% no-repeat/);
 assert.doesNotMatch(css,/\.card-front\s*\{background:\s*none center\/100% 100% no-repeat/);
 assert.doesNotMatch(css,/\.card-back:after\s*\{display:none\}/);
 assert.doesNotMatch(css,/\.themes i\s*\{display:none\}/);
 assert.match(css,/\.card-back\s*\{background:linear-gradient/);
 assert.match(css,/\.card-front\s*\{background:#fff5e8/);
 assert.match(css,/\.themes i\s*\{display:block;width:100%;height:auto;aspect-ratio:2\/1/);
});


test('Shared settings header geometry is owned by the canonical controls stylesheet',()=>{
 const layout=readFileSync('src/styles/layout.css','utf8');
 const controls=readFileSync('src/design-system/controls.css','utf8');
 const heading=layout.match(/\.settings-window-heading\{([^}]*)\}/)?.[1]||'';
 assert.doesNotMatch(heading,/\bpadding\s*:/);
 assert.doesNotMatch(layout,/\.settings-window-heading h2\{[^}]*font-size:/);
 assert.doesNotMatch(layout,/\.settings-window-heading span\{[^}]*font-size:/);
 assert.match(controls,/\.app \.settings-window-heading\{[^}]*padding:/);
 assert.match(controls,/\.app \.settings-window-heading h2\{font-size:30px\}/);
 assert.match(controls,/@media\(max-width:600px\)\{[^\n]*\.app \.settings-window-heading\{padding:6px 8px 12px\}/);
});

test('Modal backdrop uses a single stacking rule',()=>{
 const layout=readFileSync('src/styles/layout.css','utf8');
 const blocks=[...layout.matchAll(/\.modal-backdrop\s*\{([^}]*)\}/g)];
 assert.equal(blocks.filter(m=>/z-index\s*:/.test(m[1])).length,1);
 assert.match(blocks.find(m=>/z-index\s*:/.test(m[1]))?.[1]||'',/z-index:12/);
});


test('Modal frames take scrolling and spacing from the canonical control rule',()=>{
 const layout=readFileSync('src/styles/layout.css','utf8');
 const controls=readFileSync('src/design-system/controls.css','utf8');
 assert.doesNotMatch(layout,/\.modal\{[^}]*\b(?:padding|overflow|max-height):/);
 assert.doesNotMatch(layout,/\.overlay>div,\.modal\.gui-panel\{[^}]*\bpadding:/);
 assert.doesNotMatch(layout,/\.app \.overlay>div,\.app \.modal\.gui-panel\{[^}]*\b(?:padding|overflow|max-height):/);
 assert.doesNotMatch(controls,/\.app\[data-theme\] :is\(\.overlay>div,\.modal,dialog\)\{[^}]*\b(?:padding|max-height):/);
 assert.doesNotMatch(controls,/\.app\[data-theme\] \.overlay>div\{[^}]*\boverflow:/);
 const frame=controls.match(/\.app\[data-theme\] :is\(\.modal,dialog,\.overlay>div\)\{([^}]*)\}/)?.[1]||'';
 assert.match(frame,/overflow:hidden!important/);
 assert.match(frame,/padding:calc\(var\(--ui-frame-inset\) \+ 8px\)!important/);
 assert.match(frame,/max-height:calc\(100dvh - 32px\)!important/);
 const inner=controls.match(/\.app\[data-theme\] :is\(\.modal,dialog,\.overlay>div\)>\.panel-scroll\{([^}]*)\}/)?.[1]||'';
 assert.match(inner,/overflow:auto/);
 assert.match(inner,/overscroll-behavior:contain/);
 assert.match(controls,/\.app\[data-theme\] \.overlay>div:has\(\.award\)\{overflow:visible!important\}/);
 assert.match(controls,/@media\(max-height:550px\)\{\.app \.overlay\{padding:12px!important\}/);
});


test('Action copy min-width is defined in the base control, not repeated on mobile',()=>{
 const css=readFileSync('src/design-system/controls.css','utf8');
 assert.match(css,/\.setup-action-copy\{[^}]*min-width:0/);
 assert.doesNotMatch(css,/@media\(max-width:600px\)\{\.setup-action-copy\{min-width:0\}\}/);
});
