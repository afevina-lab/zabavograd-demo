import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planChecks} from '../scripts/ci-plan.mjs';
test('only actual documentation can skip build and publication',()=>{
 const p=planChecks(['docs/guide.md','outputs/DECISIONS.md','editor-service/README.md']);
 assert.equal(p.mode,'DOCS');assert.equal(p.publish,false);
 for(const path of ['docs/consolidation-audit-20261112.json','docs/example.html','public/help.md','outputs/unknown.json','src/main.tsx','src/model.ts','src/sorting.ts','.github/workflows/visual-publish.yml','unknown.bin'])assert.equal(planChecks([path]).mode,'FULL',path);
});
test('library and WebP changes combine; retain data gates',()=>{
 const p=planChecks(['outputs/library-modules/entries/core/01.json','public/assets/words/new.webp','docs/guide.md']);
 assert.equal(p.mode,'LIBRARY');assert.equal(p.publish,true);assert.equal(p.games.length,5);assert.deepEqual(p.themes,['neutral']);assert.deepEqual(p.wordImages,['public/assets/words/new.webp']);
});
test('only isolated game views are targeted',()=>{
 assert.deepEqual(planChecks(['src/Sorting.tsx','src/Matching.tsx']).games,['matching','sorting']);
 assert.equal(planChecks(['src/Sorting.tsx']).mode,'GAME');
 assert.equal(planChecks(['src/main.tsx']).mode,'FULL');
});
test('theme assets target only affected themes, mixed risks escalate',()=>{
 assert.deepEqual(planChecks(['public/assets/themes/forest/front.webp']).themes,['forest']);
 assert.equal(planChecks(['public/assets/themes/forest/front.webp','src/Sorting.tsx']).mode,'FULL');
 assert.equal(planChecks(['public/assets/themes/forest/front.webp','src/model.ts']).mode,'FULL');
});
test('missing, empty, malformed or manually escalated diffs fail closed',()=>{
 for(const paths of [null,[],['../docs/a.md'],['/docs/a.md'],['docs\\a.md'],[null]])assert.equal(planChecks(paths).mode,'FULL');
 assert.equal(planChecks(['README.md'],'FULL').mode,'FULL');
 assert.throws(()=>planChecks(['src/main.tsx'],'FAST'));
});
