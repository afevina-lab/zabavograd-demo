import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateVisualStyles} from '../scripts/visual-style-contract.mjs';
const css=(file,source)=>({file,source});
test('visual ownership allows explicit variants and responsive rules',()=>{assert.equal(validateVisualStyles([css('src/visual/primitives/buttons.css','.v-button{height:52px}.v-button[data-size=stepper]{height:30px}@media(max-width:700px){.v-button{height:44px}}')]).rules,3)});
test('visual ownership rejects priority patches',()=>{assert.throws(()=>validateVisualStyles([css('src/visual/primitives/buttons.css','.v-button{height:52px!important}')]),/Priority patch/)});
test('visual ownership rejects repeated selectors across files',()=>{assert.throws(()=>validateVisualStyles([css('a.css','.v-button{height:52px}'),css('b.css','.v-button{height:44px}')]),/Repeated selector/)});
test('visual ownership rejects duplicate properties in a rule',()=>{assert.throws(()=>validateVisualStyles([css('a.css','.v-button{height:52px;height:44px}')]),/Repeated property/)});
test('compositions cannot resize a button by ancestor selector',()=>{assert.throws(()=>validateVisualStyles([css('src/visual/compositions/layouts.css','.v-toolbar .v-icon-button{width:30px}')]),/Composition overrides/)});

test('same owner can extend a selector without reassigning properties',()=>{assert.equal(validateVisualStyles([css('a.css','.v-input{width:100%}.v-input{min-height:44px}')]).rules,2)});
test('same owner cannot silently assign the same property twice',()=>{assert.throws(()=>validateVisualStyles([css('a.css','.v-input{height:52px}.v-input{height:44px}')]),/Repeated selector/)});
test('reset and foundation can use the same selector in declared different layers',()=>{assert.equal(validateVisualStyles([{...css('reset.css','.v-root{box-sizing:border-box}'),layer:'reset'},{...css('tokens.css','.v-root{font-size:16px}'),layer:'foundation'}]).rules,2)});
