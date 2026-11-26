import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchOptions} from '../public/editor/modular-ui.mjs';
test('bounded indexed search translates visible filters without full source',()=>{
 assert.deepEqual(searchOptions({text:' кот ',category:'Животные',kind:'word',missing:'images',page:2}),{limit:36,offset:72,prefix:'кот',category:'Животные',kind:'word',has_image:false});
 assert.deepEqual(searchOptions({text:'id:ru-a',missing:'phonetic_tags'}),{limit:36,offset:0,id:'ru-a',stored_phonetics:false});
 assert.throws(()=>searchOptions({text:'id:'}),/ID/);
});
