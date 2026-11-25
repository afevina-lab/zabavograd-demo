import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {sortingLayout,balancedGrid,balancedCardStyle} from '../src/visual/games/geometry.ts';
import {numericScale} from '../src/visual/primitives/numericScale.ts';
const read=(file:string)=>readFileSync(file,'utf8');
const visual=(file:string)=>read('src/visual/'+file);
const games=['main','Sorting','Matching','Conveyor','Transformations'];
const walk=(dir:string):string[]=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(dir,entry.name)):[join(dir,entry.name)]);

test('Retired cascade and whole-stage matching scaling cannot return',()=>{
 for(const file of ['src/style.css','src/styles/layout.css','src/design-system/theme.css','src/design-system/controls.css','src/design-system/motion.css','src/GameUI.tsx','src/design-system/useMatchingFit.ts'])assert.equal(existsSync(file),false,file);
 for(const file of walk('src').filter(file=>/\.tsx?$/.test(file)))assert.doesNotMatch(read(file),/\buseMatchingFit\b/,file);
 assert.match(read('src/main.tsx'),/import '\.\/visual\/index\.css'/);
});
test('Every replacement stylesheet is free of priority patches and legacy theme selectors',()=>{
 for(const file of walk('src/visual').filter(file=>file.endsWith('.css'))){assert.doesNotMatch(read(file),/!important|\.app\b|\[data-theme\s*=/,file)}
});
test('All five games use the shared settings, toolbar, preview and round plan',()=>{
 for(const game of games){const source=read('src/'+game+'.tsx');for(const contract of ['SettingsWindow','GameToolbar','SetupPreview','useRoundPlan','enterGameViewport()'])assert.ok(source.includes(contract),game+': '+contract);assert.doesNotMatch(source,/<select\b/,game)}
});
test('Settings are explicit slots with no runtime child routing',()=>{
 const source=read('src/design-system/SettingsWindow.tsx');assert.doesNotMatch(source,/Children|cloneElement|game===/);
 const layout=visual('compositions/SettingsLayout.tsx');for(const slot of ['primary','secondary','appearance','footer','supplementary'])assert.ok(layout.includes(slot));
 assert.ok(layout.indexOf('className={classNames.footer}')>layout.indexOf('className={classNames.workspace}'));
});
test('Settings columns align at the top and theme rail scrolls independently',()=>{
 const css=visual('compositions/settings.css');assert.match(css,/\.v-settings-columns\{[^}]*align-items:start/);assert.match(css,/\.v-appearance-scroll\{[^}]*overflow:auto/);assert.match(css,/\.v-settings-scroll\{[^}]*min-height:0[^}]*overflow:auto/);assert.match(css,/\.v-settings-footer\{[^}]*grid-template-columns:minmax\(0,1fr\) auto/);
});
test('Only themes are sent to the appearance rail in sorting',()=>{
 const source=read('src/Sorting.tsx'),start=source.indexOf('appearance:'),end=source.indexOf('footer:',start),rail=source.slice(start,end);assert.match(rail,/ThemePicker/);assert.doesNotMatch(rail,/Показ карточек|GameSelect/);
});
test('Navigation geometry belongs to one toolbar and relative-size variant',()=>{
 assert.match(visual('compositions/toolbar.css'),/align-items:center/);
 assert.match(visual('primitives/buttons.css'),/data-size=toolbar[^}]*\.6/);
 for(const game of games)assert.doesNotMatch(read('src/'+game+'.tsx'),/toolbar-compact-only/);
 assert.match(visual('compositions/Toolbar.tsx'),/\{pause\}\{sound\}\{hint\}/);
});
test('Native modal shells contain focus and restore the invoking control',()=>{
 const source=visual('compositions/ModalWindow.tsx');assert.match(source,/showModal\(\)/);assert.match(source,/previous\.focus\(\)/);assert.match(source,/onCancel=/);
 assert.match(visual('compositions/PickerDialog.tsx'),/SelectionActions/);
 assert.match(visual('compositions/SelectionPanel.tsx'),/v-selection-content/);
});
test('Shared dialog actions retain actual home navigation and explicit replay or continue',()=>{
 const source=visual('compositions/DialogActions.tsx');assert.match(source,/<IconLink/);assert.match(source,/homeHref/);assert.match(source,/action.kind==='continue'\?'Play':'Return1'/);
 assert.match(visual('compositions/SelectionActions.tsx'),/cancelLabel!=null/);
});
test('Final windows are viewport bounded and actions use one fixed gap',()=>{
 const css=visual('compositions/dialog.css');assert.match(css,/100dvh - 2\*var\(--v-viewport-gap\)/);assert.match(css,/\.v-dialog-actions\{[^}]*gap:var\(--v-space-3\)/);assert.doesNotMatch(css,/margin-top:-/);
});
test('Reading length uses one accessible two-ended pointer track',()=>{
 assert.match(read('src/ReadingSettings.tsx'),/<RangeSlider label="Длина слова/);
 const source=visual('primitives/Range.tsx');assert.equal((source.match(/type="range"/g)||[]).length,2);assert.match(source,/onPointerDown/);assert.match(source,/getBoundingClientRect/);assert.match(source,/aria-valuetext=/);assert.match(source,/Math\.min\(value\(/);assert.match(source,/Math\.max\(value\(/);
});
test('Quantity keeps direct input and discrete slider semantics in one renderer',()=>{
 const source=visual('primitives/Quantity.tsx');assert.match(source,/type="number"/);assert.match(source,/type="range"/);assert.match(source,/Уменьшить/);assert.match(source,/Увеличить/);assert.match(source,/Number\.isFinite/);assert.match(read('src/QuantitySlider.tsx'),/return <Quantity/);
});
test('Quantity stops are normalized and empty filtered lists remain usable',()=>{
 const scale=numericScale(1,20,[20,2,2,10,NaN,100]);assert.equal(scale.at(0),2);assert.equal(scale.at(1),10);assert.equal(scale.at(2),20);assert.equal(scale.clamp(8),10);
 const continuous=numericScale(1,10,[20]);assert.equal(continuous.start,1);assert.equal(continuous.end,10);assert.equal(continuous.clamp(99),10);
});
test('Sorting bank stays readable while placed cards yield space',()=>{
 for(const [width,height] of [[320,240],[390,844],[844,390],[1440,900]]){const layout=sortingLayout(width,height,40,[20,20,20,20,20,20]);assert.ok(layout.card>=96);assert.ok(layout.placedCard>=48);assert.ok(layout.placedCard<=layout.card);assert.ok(layout.columns>=1)}
});
test('Incomplete sorting rows are centered deterministically',()=>{
 const grid=balancedGrid(5,500,100);assert.equal(grid.columns,3);assert.equal(balancedCardStyle(3,5,500,100).gridColumn,'2 / span 2');assert.equal(balancedCardStyle(4,5,500,100).gridColumn,'4 / span 2');
});
test('Material actions and destructive edits use common component owners',()=>{
 assert.match(read('src/MaterialSettings.tsx'),/<MaterialRule/);assert.match(visual('compositions/MaterialRule.tsx'),/icon="Trash"/);assert.match(read('src/design-system/SetupAddButton.tsx'),/export \{AddAction as SetupAddButton\}/);assert.match(visual('primitives/AddAction.tsx'),/symbol="plus"/);
});
test('Lexical categories and saved sets use shared modals and selection controls',()=>{
 for(const file of ['src/CategoryPicker.tsx','src/SavedMaterialSets.tsx'])assert.match(read(file),/<PickerDialog/);
 assert.match(visual('compositions/SelectionTree.tsx'),/indeterminate=node.partial/);assert.match(visual('compositions/SavedSetList.tsx'),/<Choice/);assert.match(visual('compositions/SavedSetList.tsx'),/icon="Trash"/);
});
test('Letter and syllable choices remain button tiles with checkbox Select all',()=>{
 const reading=read('src/ReadingSettings.tsx'),syllables=read('src/SyllableStructurePicker.tsx');assert.match(reading,/v-letter-choice/);assert.match(reading,/aria-pressed=/);assert.match(reading,/Выбрать всё/);assert.match(syllables,/v-syllable-option/);assert.match(syllables,/<PopoverTip/);assert.doesNotMatch(syllables,/title=\{descriptions/);
});
test('Footer previews share one framed well and measured text fitting',()=>{
 assert.match(read('src/design-system/SetupPreview.tsx'),/export \{MaterialPreview as SetupPreview\}/);const fit=visual('primitives/FitCopy.tsx');assert.match(fit,/ResizeObserver/);assert.match(fit,/for\(let size=18;size>=12;size--\)/);assert.match(fit,/inner\.scrollHeight<=availableHeight/);assert.match(fit,/document.fonts/);assert.match(visual('primitives/fit-copy.css'),/height:var\(--v-preview-height\)/);
});
test('Theme switching uses one registry-backed choice list',()=>{
 assert.match(visual('primitives/ThemeChoice.tsx'),/THEME_IDS\.map/);assert.match(visual('primitives/ThemeChoice.tsx'),/onChange\(id\)/);assert.match(visual('primitives/selection.css'),/repeat\(3,minmax\(0,1fr\)\)/);
});
test('Approved forest ground depth and shared adaptive framing remain',()=>{
 const theme=read('src/design-system/themes.ts');for(const [id,bottom] of [['bush-back-middle','41%'],['flowers-left','6%'],['bush-front-right','6%']])assert.ok(new RegExp("id:'"+id+"'[^\\n]*bottom:'"+bottom+"'").test(theme));assert.match(theme,/minimumAspect:1\.78/);assert.doesNotMatch(read('src/design-system/SceneLayers.tsx'),/theme===/);
});
test('Chromium scenarios retain all-game navigation counters and accessible range coverage',()=>{
 const script=read('scripts/verify-dialogs-browser.mjs');assert.match(script,/Emulation\.setTouchEmulationEnabled/);assert.match(script,/Shared toolbar must keep three actions/);assert.match(script,/Desktop counter contract failed/);assert.match(script,/Compact timed toolbar geometry failed/);assert.match(read('scripts/verify-settings-browser.mjs'),/Word length must use one accessible two-ended track/);
});
test('Discarded previous-card and replay-card actions cannot return',()=>{
 assert.doesNotMatch(read('src/Transformations.tsx'),/Предыдущая карточка|>Повторить</);assert.match(read('src/Transformations.tsx'),/roundPlan.repeat/);
});

test('Touch fullscreen keeps orientation lock and failure fallback',()=>{
 const viewport=read('src/design-system/useGameViewport.ts');assert.match(viewport,/root\.requestFullscreen\(\)\.then\(lock\)\.catch/);assert.match(viewport,/orientation\?\.lock\?\.\('landscape'\)/);assert.match(viewport,/pointer:coarse/);
 for(const game of ['main','Sorting'])assert.match(read('src/'+game+'.tsx'),/toolbar-timer/);
 assert.match(read('src/design-system/GameLimits.tsx'),/toolbar-timer/);
});

