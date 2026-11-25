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


test('Shared toolbar geometry has one owner',()=>{
 const layout=readFileSync('src/styles/layout.css','utf8'),controls=readFileSync('src/design-system/controls.css','utf8');
 assert.doesNotMatch(layout,/shared-toolbar/);
 assert.equal([...controls.matchAll(/shared-toolbar\{[^}]*grid-template-columns:/g)].length,1);
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
});


test('Action copy min-width is defined in the base control, not repeated on mobile',()=>{
 const css=readFileSync('src/design-system/controls.css','utf8');
 assert.match(css,/\.setup-action-copy\{[^}]*min-width:0/);
 assert.doesNotMatch(css,/@media\(max-width:600px\)\{\.setup-action-copy\{min-width:0\}\}/);
});


test('Sorting grid has one canonical column declaration, including at narrow widths',()=>{
 const css=readFileSync('src/styles/layout.css','utf8');
 assert.doesNotMatch(css,/\.sorting-bins\{[^}]*grid-template-columns:repeat\(auto-fit/);
 assert.match(css,/\.sorting-bins\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);width:100%;align-items:start\}/);
 assert.match(css,/\.app\.game-active \.sorting-bins\{grid-template-columns:repeat\(var\(--sort-bin-columns\),minmax\(0,1fr\)\)/);
});

test('Mobile settings fieldset display fallback is declared once',()=>{
 const css=readFileSync('src/styles/layout.css','utf8');
 assert.equal([...css.matchAll(/\.settings fieldset\{display:block\}/g)].length,1);
 assert.match(css,/@media\(max-width:700px\)\{\s*\.settings fieldset\{display:block\}/);
});


test('Shared material actions use the design-system button variants',()=>{
 const memory=readFileSync('src/main.tsx','utf8');
 const picker=readFileSync('src/WordPicker.tsx','utf8');
 const material=readFileSync('src/MaterialSettings.tsx','utf8');
 const theme=readFileSync('src/visual/primitives/ThemeChoice.tsx','utf8');
 assert.match(memory,/<button type="button" className="icon-button" title="Перемешать состав"/);
 assert.match(memory,/<button type="button" className="icon-button" title="Выбрать слова вручную"/);
 assert.match(picker,/<button type="button" className="secondary" onClick={onCancel}>Отмена<\/button>/);
 assert.match(material,/<SetupAddButton onClick=\{\(\)=>setL\(/);
 assert.match(theme,/onClick=\{\(\)=>onChange\(id\)\}/);
});

test('All five game setups use the shared settings shell and select implementations',()=>{
 for(const file of ['main.tsx','Matching.tsx','Sorting.tsx','Conveyor.tsx','Transformations.tsx']){
  const source=readFileSync('src/'+file,'utf8');
  assert.match(source,/<SettingsWindow game=/,file);
  assert.match(source,/\b(?:GameSelect|SelectControl)\b/,file);
  assert.doesNotMatch(source,/<select\b/,file+': native selects must use shared controls');
 }
});


test('Reading length is one shared two-ended range, not separate QuantitySliders',()=>{
 const reading=readFileSync('src/ReadingSettings.tsx','utf8');
 const range=readFileSync('src/design-system/RangeSlider.tsx','utf8');
 const css=readFileSync('src/design-system/controls.css','utf8');
 assert.match(reading,/import \{RangeSlider\} from '.\/design-system\/RangeSlider.tsx'/);
 assert.match(reading,/<RangeSlider label="Длина слова, букв"/);
 assert.doesNotMatch(reading,/<QuantitySlider/);
 assert.doesNotMatch(css,/reading-length-sliders|reading-length-range/);
 assert.match(range,/role="group" aria-label=\{label\}/);
 assert.equal([...range.matchAll(/type="range"/g)].length,2,'two accessible thumbs share one track');
 assert.match(range,/Math.min\(value\(\+event.target.value\),upper\)/);
 assert.match(range,/Math.max\(value\(\+event.target.value\),lower\)/);
 assert.match(css,/\.range-slider-track::before/);
 assert.match(css,/\.range-slider-track input:focus-visible/);
});


test('Shared word-length track can choose either endpoint by pointer',()=>{
 const range=readFileSync('src/design-system/RangeSlider.tsx','utf8');
 assert.match(range,/onPointerDown=\{event=>\{/);
 assert.match(range,/event\.target!==event\.currentTarget/);
 assert.match(range,/event\.currentTarget\.getBoundingClientRect\(\)/);
 assert.match(range,/if\(next<=lower\)onChange\(next,upper\)/);
 assert.match(range,/else if\(next>=upper\)onChange\(lower,next\)/);
});


test('Shared picker dialogs use the same secondary cancel button',()=>{
 const dialogs=['WordPicker.tsx','CategoryPicker.tsx','SoundPicker.tsx'];
 for(const file of dialogs){
  const source=readFileSync('src/'+file,'utf8');
  assert.match(source,/<button type="button" className="secondary"[\s\S]*?Отмена<\/button>/,file);
 }
});


test('Canonical UI geometry is tokenized across shared settings controls',()=>{
 const css=readFileSync('src/design-system/controls.css','utf8');
 for(const [token,value] of [['--zg-control-height','48px'],['--zg-select-height','52px'],['--zg-disclosure-height','60px'],['--zg-heading-icon-size','46px']]){
  assert.match(css,new RegExp(token+':'+value.replace('.','\\.')+';'));
 }
 assert.match(css,/\.settings-window-heading \.icon-button\{[^}]*width:var\(--zg-heading-icon-size\);height:var\(--zg-heading-icon-size\)/);
 assert.match(css,/\.app\[data-theme\] \.settings \.select-control select\{[^}]*min-height:var\(--zg-select-height\)/);
 assert.match(css,/\.app\[data-theme\] \.settings \.settings-disclosure>summary,\.app\[data-theme\] \.settings \.category-picker-trigger\{[^}]*min-height:var\(--zg-disclosure-height\)/);
 assert.doesNotMatch(css,/\.settings-window-heading \.icon-button\{[^}]*width:46px;height:46px/);
});

test('GameSelect forwards its optional styling variant into the common wrapper',()=>{
 const source=readFileSync('src/GameSelect.tsx','utf8');
 assert.match(source,/choiceClassName=''/);
 assert.match(source,/className=\{\["game-choice",choiceClassName\]\.filter\(Boolean\)\.join\(" "\)\}/);
});


test('Shared settings use their final heading and label rhythm without shadowed earlier declarations',()=>{
 const css=readFileSync('src/design-system/controls.css','utf8');
 assert.match(css,/\.app \.shared-settings-window \.settings-block h2\{margin:0!important\}/);
 assert.match(css,/\.app \.shared-settings-window \.settings-block h2\{font-size:22px!important;margin-bottom:16px!important\}/);
 assert.match(css,/\.app \.shared-settings-window \.settings-block label:not\(\.check\)\{margin-block:10px 6px\}/);
 assert.doesNotMatch(css,/margin:0 0 20px!important;font-size:24px/);
 assert.doesNotMatch(css,/\.app \.shared-settings-window \.settings-block label:not\(\.check\)\{margin-block:12px 8px\}/);
 assert.doesNotMatch(css,/\.app \.shared-settings-window \.settings-block select\{margin-top:8px\}/);
});


test('Header navigation uses the same relative size at every width',()=>{
 const css=readFileSync('src/design-system/controls.css','utf8');
 assert.doesNotMatch(css,/--zg-toolbar-icon-width/);
 assert.match(css,/height:calc\(var\(--toolbar-height\)\*\.6\)/);
});


test('Navigation is never hidden by the obsolete compact-only toolbar rule',()=>{
 const css=readFileSync('src/styles/layout.css','utf8')+readFileSync('src/design-system/controls.css','utf8');
 assert.doesNotMatch(css,/toolbar-mobile-pause|toolbar-mobile-fullscreen/);
 assert.doesNotMatch(css,/toolbar-left>:not/);
});

test('Every game requests touch fullscreen directly from Start action',()=>{
 const viewport=readFileSync('src/design-system/useGameViewport.ts','utf8');
 assert.match(viewport,/export function enterGameViewport\(\)/);
 assert.match(viewport,/root\.requestFullscreen\(\)\.then\(lock\)\.catch/);
 assert.match(viewport,/orientation\?\.lock\?\.\('landscape'\)/);
 for(const file of ['main.tsx','Matching.tsx','Sorting.tsx','Conveyor.tsx','Transformations.tsx']){
  const source=readFileSync('src/'+file,'utf8');
  assert.match(source,/enterGameViewport\(\)/,file);
 }
 const limits=readFileSync('src/design-system/GameLimits.tsx','utf8');
 const memory=readFileSync('src/main.tsx','utf8');
 const sorting=readFileSync('src/Sorting.tsx','utf8');
 assert.match(limits,/className="toolbar-timer"/);
 assert.match(memory,/toolbar-timer/);
 assert.match(sorting,/toolbar-timer/);
});


test('Round controls and dialogs are shared across games',()=>{
 for(const name of ['main','Sorting','Matching','Conveyor','Transformations'])assert.match(readFileSync('src/'+name+'.tsx','utf8'),/useRoundPlan/);
 const dialog=readFileSync('src/design-system/GameDialog.tsx','utf8');assert.match(dialog,/DialogActions/);assert.match(dialog,/icon=\{onContinue\?'Play':'Return1'\}/);
});

test('Chromium smoke covers compact and desktop counters in all five games',()=>{
 const script=readFileSync('scripts/verify-dialogs-browser.mjs','utf8');
 assert.match(script,/Emulation\.setTouchEmulationEnabled/);
 assert.match(script,/for\(const game of \['memory','sorting','matching','conveyor','transformations'\]\)/);
 assert.match(script,/Shared toolbar must keep three actions/);
 assert.match(script,/Desktop counter contract failed/);
 assert.match(script,/Compact timed toolbar geometry failed/);
 assert.match(script,/game\+'-toolbar-timed-844'/);
 const reading=readFileSync('scripts/verify-settings-browser.mjs','utf8');
 assert.match(reading,/Word length must use one accessible two-ended track/);
});


test('All five setups use one semantic two-column arrangement and common preview footer',()=>{
 const shell=readFileSync('src/design-system/SettingsWindow.tsx','utf8');
 const css=readFileSync('src/design-system/controls.css','utf8');
 assert.match(shell,/layout\.primary/);
 assert.doesNotMatch(shell,/\bChildren\b|cloneElement|\barrange\b|game===/);
 assert.match(shell,/layout\.secondary/);
 assert.match(shell,/layout\.appearance/);
 assert.match(shell,/layout\.footer/);
 assert.doesNotMatch(shell,/material-head/);
 assert.match(shell,/setup-section-fieldset/);
 assert.doesNotMatch(shell,/matching-setup\\|conveyor-settings\\|transformation-setup\\|sort-settings/);
 assert.match(shell,/layout:ExplicitSettingsSlots/);
 for(const file of ['main.tsx','Matching.tsx','Sorting.tsx','Conveyor.tsx','Transformations.tsx']){
  const source=readFileSync('src/'+file,'utf8');
  const setup=source.slice(source.indexOf('<SettingsWindow'));
  assert.match(setup,/<SettingsWindow[^>]+layout=\{\{/);
  for(const slot of ['primary','secondary','appearance','footer'])assert.match(setup,new RegExp('\\b'+slot+':'),file+': explicit '+slot);
  for(const slot of ['material','rules','task','appearance']){
   assert.match(setup,new RegExp('data-setup-section="'+slot+'"'),file+': '+slot);
  }
  assert.match(setup,/<SetupPreview\s+/,file+': shared preview');
 }
 assert.match(css,/\.settings-frame\.shared-settings-window \.setup-columns\{\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(css,/\.setup-footer>\.setup-material-preview\{/);
 assert.match(css,/\.settings-frame\.shared-settings-window>\.setup-footer>button\.primary\{/);
});

test('Deprecated game-specific setup grids cannot override shared semantic columns',()=>{
 const css=readFileSync('src/styles/layout.css','utf8');
 assert.doesNotMatch(css,/\.app \.shared-settings-window \.matching-setup,\.app \.shared-settings-window \.conveyor-settings\{display:grid/);
 assert.doesNotMatch(css,/\.transformation-setup \.settings\{display:grid/);
 assert.doesNotMatch(css,/\.shared-settings-window \.matching-setup>\.settings-block:nth-of-type/);
 const memory=readFileSync('src/main.tsx','utf8');
 assert.doesNotMatch(memory, /Начать игру'\} <Icon name="RightArrow1"/);
});


test('All setup labels inherit the shared control rules, never per-game geometry',()=>{
 const css=readFileSync('src/styles/layout.css','utf8');
 const shared=readFileSync('src/design-system/controls.css','utf8');
 for(const name of ['matching-setup','conveyor-settings','transformation-setup']){
  assert.doesNotMatch(css,new RegExp('\\.'+name+' label(?:\\.check)?\\{'),'Legacy label rule: '+name);
 }
 assert.match(shared,/\.app \.settings label\.check\{display:flex/);
 assert.match(shared,/\.app\[data-theme\] \.settings label:not\(\.check\):has\(>\.select-control\)\{display:grid/);
});


test('Destructive setup edits do not borrow the primary Start-game button skin',()=>{
 const material=readFileSync('src/MaterialSettings.tsx','utf8');
 const sorting=readFileSync('src/Sorting.tsx','utf8');
 assert.match(material,/className="icon-button rule-delete"/);
 assert.doesNotMatch(material,/className="primary rule-delete"/);
 assert.match(sorting,/<button className="secondary" type="button" onClick=\{\(\)=>setExclusions/);
});


test('Sorting fields do not override common slider and numeric input surfaces',()=>{
 const layout=readFileSync('src/styles/layout.css','utf8');
 const controls=readFileSync('src/design-system/controls.css','utf8');
 assert.doesNotMatch(layout,/\.sort-settings input:not\(\[type=checkbox\]\)/);
 assert.match(controls,/\.app\[data-theme\] \.settings input\[type=number\]/);
 assert.match(controls,/\.app \.settings input\[type=range\]/);
});


test('Conveyor keeps material-dependent choices adjacent and all game limits in rules',()=>{
 const source=readFileSync('src/Conveyor.tsx','utf8');
 const setup=source.slice(source.indexOf('<SettingsWindow'),source.indexOf('</SettingsWindow>'));
 const material=setup.slice(setup.indexOf('data-setup-section="material"'),setup.indexOf('data-setup-section="task"'));
 const task=setup.slice(setup.indexOf('data-setup-section="task"'),setup.indexOf('data-setup-section="rules"'));
 const rules=setup.slice(setup.indexOf('data-setup-section="rules"'),setup.indexOf('<SetupPreview'));
 assert.match(material,/<GameSelect label="Учебная задача" hideLabel/);
 assert.match(material,/<MaterialSettings/);
 assert.ok(material.indexOf('<MaterialSettings')>material.indexOf('</GameSelect>'));
 assert.doesNotMatch(material,/<label>Карточки/);
 assert.match(task,/<GameSelect label="Карточки"[^>]*hideLabel/);
 assert.ok(task.indexOf('<GameSelect label="Карточки"')<task.indexOf('Показывать подписи')&&task.indexOf('Показывать подписи')<task.indexOf('<QuantitySlider label="Карточек"'));
 assert.match(task,/<QuantitySlider label="Карточек"/);
 assert.match(rules,/<label>Проверка/);
 assert.match(rules, /\{limits\.settings\}/);
 assert.doesNotMatch(task,/\{limits\.settings\}/);
});

test('Lexical dialog footer is outside scroll area and categories expand across its grid',()=>{
 const picker=readFileSync('src/CategoryPicker.tsx','utf8');
 const css=readFileSync('src/design-system/controls.css','utf8');
 assert.match(picker,/<strong>Выберите тему<\/strong>/);
 assert.match(picker,/\{ordered\(roots\)\.map\(render\)\}<\/ul><\/div><div className="sound-picker-actions">/);
 assert.match(css,/dialog\.category-picker>\.sound-picker-actions/);
 assert.match(css,/li\.category-branch:has\(>details\[open\]\)/);
 assert.match(css,/dialog\.category-picker \.category-grid ul/);
 assert.match(css,/\.sound-picker-actions>button:is\(\.primary,\.secondary\)/);
});

test('Nested supplementary material uses icon wells and does not float delete actions',()=>{
 const material=readFileSync('src/MaterialSettings.tsx','utf8');
 const css=readFileSync('src/design-system/controls.css','utf8');
 const layout=readFileSync('src/styles/layout.css','utf8');
 const addButton=readFileSync('src/design-system/SetupAddButton.tsx','utf8');
 assert.match(material, /<SetupAddButton onClick=/);
 assert.match(addButton, /<ControlWell symbol="plus"\/>/);
 assert.match(addButton, /className=\{\['setup-add-rule'/);
 assert.match(material, /className="material-rule-heading"/);
 assert.match(material,/<GameSelect hideLabel label="Учебная задача"/);
 assert.doesNotMatch(layout,/\.material-rule>button\{float:right\}/);
 assert.doesNotMatch(layout,/\.material-rule \.rule-delete\{float:right/);
 assert.match(css,/\.shared-settings-window \.material-rule-heading\{/);
 assert.match(css,/\.shared-settings-window \.setup-add-rule\{/);
});


test('Shared settings footer stays outside the independently scrolling body',()=>{
 const shell=readFileSync('src/design-system/SettingsWindow.tsx','utf8');
 const css=readFileSync('src/design-system/controls.css','utf8');
 const script=readFileSync('scripts/verify-settings-browser.mjs','utf8');
 assert.match(shell,/body:<>\{layout\.intro\}/);
 assert.match(shell,/footer:<div className="setup-footer">\{layout\.footer\}<\/div>/);
 assert.match(shell,/<Content className=[^>]+>\{assembled\.body\}<\/Content>/);
 assert.match(shell,/\{assembled\.footer\}/);
 assert.match(css,/\.settings-frame\.shared-settings-window>\.setup-footer\{/);
 assert.match(script,/Shared footer\/select geometry failed/);
 assert.match(script,/Footer must stay visible after settings scroll/);
});
test('Lesson task selectors are not laid out as a three-column button tile group',()=>{
 const material=readFileSync('src/MaterialSettings.tsx','utf8');
 assert.doesNotMatch(material,/choiceClassName="task-tiles"/);
 assert.match(material,/<GameSelect hideLabel label="Учебная задача"/);
});


test('Landscape mobile settings retain a usable scrolling area above the pinned footer',()=>{
 const css=readFileSync('src/design-system/controls.css','utf8');
 const smoke=readFileSync('scripts/verify-settings-browser.mjs','utf8');
 assert.match(css,/@media \(orientation:landscape\) and \(max-height:550px\) and \(min-width:600px\)/);
 assert.match(css,/\.settings-frame\.shared-settings-window>\.setup-footer>button\.primary\{[^}]*min-height:48px!important/);
 assert.match(css,/\.settings-frame\.shared-settings-window>\.unified-settings-content>p:first-child\{[^}]*display:none!important/);
 assert.match(smoke,/bodyClientHeight>=120&&actualLayout\.footerHeight<=105/);
});


test('All games inherit a third, independently scrolling theme rail rather than separate theme grids',()=>{
 const shell=readFileSync('src/design-system/SettingsWindow.tsx','utf8');
 const controls=readFileSync('src/design-system/controls.css','utf8');
 assert.match(shell,/theme:renderAppearance\(layout\.appearance\)/);
 assert.doesNotMatch(shell,/part\.type|cloneElement|Children/);
 assert.match(readFileSync('src/Sorting.tsx','utf8'),/className="settings-block setup-presentation-options"/);
 assert.match(shell,/className="setup-workspace"/);
 assert.match(shell,/className="setup-theme-rail"/);
 assert.match(shell,/className=\{'setup-theme-scroll'/);
 assert.match(shell,/aria-expanded=\{themeOpen\}/);
 assert.match(controls,/@media\(min-width:1180px\) and \(min-height:560px\)/);
 assert.match(controls,/grid-template-columns:minmax\(0,1fr\) var\(--zg-setup-rail-width\)/);
 assert.match(controls,/\.setup-theme-scroll\{[^}]*overflow-y:auto;overflow-x:hidden/);
 assert.match(controls,/\.setup-theme-rail \.themes\{[^}]*flex-direction:column/);
});
test('Shared setup footer contains only preview, main action and status, not oversized information blocks',()=>{
 const shell=readFileSync('src/design-system/SettingsWindow.tsx','utf8');
 const controls=readFileSync('src/design-system/controls.css','utf8');
 assert.match(shell,/layout\.supplementary&&/);
 assert.match(shell,/className="setup-extra-notes"/);
 assert.match(controls,/grid-template-rows:minmax\(0,1fr\)!important/);
 assert.match(controls,/\.setup-footer>\.setup-material-preview\{[^}]*grid-row:1!important/);
 assert.match(controls,/\.setup-footer\{[^}]*max-height:82px/);
 assert.match(controls,/--zg-setup-control-height:52px/);
});


test('Only themes enter shared rail; other appearance controls stay in main task column',()=>{
 const shell=readFileSync('src/design-system/SettingsWindow.tsx','utf8');
 const sorting=readFileSync('src/Sorting.tsx','utf8');
 assert.doesNotMatch(shell,/presentationParts|parts\.filter/);
 assert.match(sorting,/<section className="settings-block setup-presentation-options"><section className="card-presentation settings-block">/);
 assert.match(shell,/renderAppearance\(layout\.appearance\)/);
 assert.match(sorting,/className="card-presentation settings-block"/);
});


test('All five setup previews share one word-and-status layout with no sub-CTA labels',()=>{
 const preview=readFileSync('src/design-system/SetupPreview.tsx','utf8');
 const window=readFileSync('src/design-system/SettingsWindow.tsx','utf8');
 const css=readFileSync('src/design-system/controls.css','utf8');
 assert.match(preview,/className="settings-block setup-preview setup-material-preview"/);
 assert.match(preview,/className="setup-preview-meta"/);
 assert.match(preview,/className="setup-preview-actions"/);
 assert.match(preview,/className="setup-preview-content"/);
 assert.match(preview,/className="setup-preview-message" role="status"/);
 assert.match(window,/layout\.footer/);
 assert.doesNotMatch(window,/node\.type==='p'&&node\.props\.role==='status'/);
 assert.match(css,/grid-template-columns:minmax\(100px,max-content\) minmax\(0,1fr\)/);
 assert.match(css,/-webkit-line-clamp:2/);
 for(const file of ['main.tsx','Matching.tsx','Sorting.tsx','Conveyor.tsx','Transformations.tsx']){
  const source=readFileSync('src/'+file,'utf8');
  assert.match(source,/<SetupPreview\s+actions=\{</,file);
 }
 const matching=readFileSync('src/Matching.tsx','utf8');
 const conveyor=readFileSync('src/Conveyor.tsx','utf8');
 const transformations=readFileSync('src/Transformations.tsx','utf8');
 assert.doesNotMatch(matching,/Выбери карточку из общего банка/);
 assert.doesNotMatch(matching,/В режиме картинок используются только слова с изображениями/);
 assert.doesNotMatch(conveyor,/<p role="status">\{error\|\|message/);
 assert.doesNotMatch(transformations,/Ребёнок отвечает вслух\. Взрослый запускает превращение/);
 assert.match(transformations,/<GameSelect label="Задание" hideLabel/);
});


test('All games use the shared measured field/section spacing, with no adjacent margins',()=>{
 const css=readFileSync('src/design-system/controls.css','utf8');
 const material=readFileSync('src/MaterialSettings.tsx','utf8');
 const memory=readFileSync('src/main.tsx','utf8');
 const conveyor=readFileSync('src/Conveyor.tsx','utf8');
 assert.match(css,/--zg-setup-gap:8px/);
 assert.match(css,/--zg-setup-section-gap:12px/);
 assert.match(css,/\.setup-column\{\s*gap:var\(--zg-setup-section-gap\)!important/);
 assert.match(css,/\.setup-column>\.settings-block,\s*\.app\[data-theme\] \.settings-frame\.shared-settings-window \.setup-section-fieldset>\.settings-block\{[^}]*display:flex!important;flex-direction:column/);
 assert.match(css,/\.setup-material-fields,[^}]*display:flex;flex-direction:column;gap:var\(--zg-setup-gap\)!important/);
 assert.match(material,/className="setup-material-fields"/);
 assert.match(material,/<GameSelect hideLabel label="Учебная задача"/);
 assert.doesNotMatch(memory,/Сначала запомним расположение/);
 assert.match(conveyor,/<GameSelect label="Учебная задача" hideLabel/);
 assert.match(conveyor,/<GameSelect label="Карточки"[^>]*hideLabel/);
});
test('Numeric quantity stepper is compact in all settings, with unchanged direct-input semantics',()=>{
 const css=readFileSync('src/design-system/controls.css','utf8');
 const slider=readFileSync('src/QuantitySlider.tsx','utf8');
 assert.match(css,/\.quantity-slider \.quantity-stepper button\{width:27px;height:30px/);
 assert.match(css,/\.quantity-slider \.quantity-stepper input\[type=number\]\{width:36px!important;height:30px/);
 assert.match(slider,/type="number"[^>]*value=\{value\}/);
 assert.match(slider,/type="range"/);
});


test('Sorting and supplementary lesson rules share the same icon-plus button',()=>{
 const sorting=readFileSync('src/Sorting.tsx','utf8');
 const material=readFileSync('src/MaterialSettings.tsx','utf8');
 const button=readFileSync('src/design-system/SetupAddButton.tsx','utf8');
 assert.match(sorting,/<SetupAddButton onClick=\{\(\)=>setExclusions/);
 assert.match(material,/<SetupAddButton onClick=\{\(\)=>setL/);
 assert.match(button,/<ControlWell symbol="plus"\/>/);
 assert.doesNotMatch(sorting,/<button className="secondary"[^>]*>Добавить исключение<\/button>/);
});
test('Footer words use a fully framed height-matched well with measured font fitting',()=>{
 const preview=readFileSync('src/design-system/SetupPreview.tsx','utf8');
 const css=readFileSync('src/design-system/controls.css','utf8');
 assert.match(preview,/ResizeObserver/);
 assert.match(preview,/for\(let size=18;size>=12;size--\)/);
 assert.match(preview,/inner\.scrollHeight<=availableHeight/);
 assert.doesNotMatch(preview,/availableWidth=[^\n]*borderLeftWidth/);
 assert.doesNotMatch(preview,/availableHeight=[^\n]*borderTopWidth/);
 assert.match(preview,/for\(let size=18;size>=12;size--\)/);
 assert.match(preview,/className="setup-preview-fit"/);
 assert.match(css,/\.setup-preview-content\{[^}]*height:58px;min-height:58px;max-height:58px/);
 assert.match(css,/\.setup-preview-content\{[^}]*background:var\(--ui-setup-field\)/);
 assert.match(css,/\.setup-footer>button\.primary\{[^}]*align-self:center!important/);
});
test('One shared control flow owns disclosure spacing and quantity track inset',()=>{
 const controls=readFileSync('src/design-system/controls.css','utf8');
 const layout=readFileSync('src/styles/layout.css','utf8');
 assert.match(controls,/\.settings \.settings-disclosure\{padding:0!important;margin:0!important/);
 assert.match(controls,/\.settings :is\(\.settings-disclosure-body,\.advanced-material\)\{\s*margin-block:0!important/);
 assert.match(controls,/\.quantity-slider\{display:grid;[^}]*padding:10px 12px 17px/);
 assert.doesNotMatch(layout,/\.app \.shared-settings-window \.quantity-slider\{margin-block:10px 12px!important\}/);
 assert.doesNotMatch(layout,/\.app \.shared-settings-window \.setup-column\{display:flex;flex-direction:column;gap:14px!important/);
});


test('Sorting has one editable group heading and one presentation caption per field',()=>{
 const sorting=readFileSync('src/Sorting.tsx','utf8');
 const css=readFileSync('src/design-system/controls.css','utf8');
 assert.doesNotMatch(sorting,/<h3>Группа \{i\+1\}<\/h3>/);
 assert.match(sorting,/<div className="group-title-edit"><strong>\{groupTitle\(g\)\}<\/strong>/);
 assert.match(sorting,/<h3>Показ карточек<\/h3><GameSelect hideLabel label="Карточки"/);
 assert.match(css,/\.sort-group-settings \.group-title-edit strong\{font-size:16px/);
});


test('No obsolete six-row or one-column footer fallback competes with canonical layout',()=>{
 const css=readFileSync('src/design-system/controls.css','utf8');
 assert.doesNotMatch(css,/grid-row:1\/span 6/);
 assert.doesNotMatch(css,/\.app \.shared-settings-window \.setup-footer\{grid-template-columns:minmax\(0,1fr\)!important\}/);
 assert.doesNotMatch(css,/\.app \.shared-settings-window \.setup-footer>\.setup-material-preview\{/);
 assert.match(css,/\.settings-frame\.shared-settings-window>\.setup-footer\{[^}]*grid-template-rows:minmax\(0,1fr\)!important/);
});


test('Letter and syllable modal selectors share button tiles with checkbox-only Select all',()=>{
 const reading=readFileSync('src/ReadingSettings.tsx','utf8');
 const syllables=readFileSync('src/SyllableStructurePicker.tsx','utf8');
 const styles=readFileSync('src/design-system/controls.css','utf8');
 assert.match(reading,/className="letter-choice" aria-pressed=/);
 assert.doesNotMatch(reading,/<label[^>]*className="letter-choice"/);
 assert.match(reading,/className="settings-disclosure letter-group"/);
 assert.match(syllables,/className="syllable-type-option" aria-pressed=/);
 assert.match(syllables,/className="syllable-type-option syllable-untyped" aria-pressed=/);
 assert.doesNotMatch(syllables,/title=\{descriptions/);
 assert.match(syllables,/className="syllable-type-tooltip" role="tooltip"/);
 assert.match(styles,/dialog\.letter-picker-dialog \.letter-choice\[aria-pressed=true\]/);
});
test('Saved-set removal is a shared icon action and forest scenery respects ground depth',()=>{
 const sets=readFileSync('src/SavedMaterialSets.tsx','utf8');
 const themes=readFileSync('src/design-system/themes.ts','utf8');
 assert.match(sets,/<Icon name="Trash"\/>/);
 assert.match(sets,/className="icon-button saved-set-remove"/);
 assert.match(themes,/id:'bush-back-middle'[^\n]*bottom:'41%'/);
 assert.match(themes,/id:'flowers-left'[^\n]*bottom:'6%'/);
 assert.match(themes,/id:'bush-front-right'[^\n]*bottom:'6%'/);
});

