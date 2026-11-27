import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {classify,changed}=require('../scripts/library-ci-plan.cjs');
test('only explicitly enumerated docs, client and adapter paths may take short path',()=>{
 assert.equal(classify(['docs/LIBRARY_CUTOVER.md']),'docs');
 assert.equal(classify(['public/editor/modular-client.mjs','editor-service/modular-client.test.mjs','editor-service/README.md']),'client');
 assert.equal(classify(['public/editor/modular-ui.mjs','editor-service/modular-ui.test.mjs']),'client');
 assert.equal(classify(['editor-service/modular-read-cache.mjs']),'adapter');
 assert.equal(classify(['editor-service/modular-bridge.mjs','public/editor/modular-ui.mjs','docs/LIBRARY_CUTOVER.md']),'adapter');
 for(const p of ['scripts/library-source.cjs','editor-service/server.mjs','editor-service/Dockerfile','public/editor/editor-connection.mjs','public/editor/start.mjs','public/editor/app.js','public/editor/index.html','public/editor/style.css','scripts/library-request-source.cjs','outputs/library-v2.json','outputs/library-modules/entries/core/01.json','.github/workflows/library-modular-rehearsal.yml','src/App.tsx','unknown.txt'])assert.equal(classify(['docs/LIBRARY_CUTOVER.md',p]),'full');
});
test('missing diff, new branch, manual and empty changes fail conservatively to full',()=>{
 assert.equal(classify([],{}),'full');
 assert.equal(classify(['docs/LIBRARY_CUTOVER.md'],{known:false}),'full');
 assert.equal(classify(['docs/LIBRARY_CUTOVER.md'],{manual:true}),'full');
 assert.equal(changed('0'.repeat(40),'a'.repeat(40)),null);
 assert.equal(changed('bad','a'.repeat(40)),null);
});
