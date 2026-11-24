import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateVisualBuildStyles} from '../scripts/check-visual-build-isolation.mjs';
test('independent entries keep their own visual cascade',()=>{assert.doesNotThrow(()=>validateVisualBuildStyles('.app[data-theme]{color:red}', '.v-root{color:blue}'))});
test('current games reject accidental loading of replacement styles',()=>{assert.throws(()=>validateVisualBuildStyles('.app{color:red}.v-root{color:blue}', '.v-root{color:blue}'),/Current game entry/)});
test('replacement preview rejects accidental loading of legacy styles',()=>{assert.throws(()=>validateVisualBuildStyles('.app{color:red}', '.v-root{color:blue}.app button{height:70px!important}'),/Replacement entry/)});
