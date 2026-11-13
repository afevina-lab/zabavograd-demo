import test from 'node:test';
import assert from 'node:assert/strict';
import {validate,diff,related} from '../public/editor/model.mjs';
const fixture=()=>({schema_version:2,categories:[{path:'Мир'}],entries:[{id:'a',lemma:'кот',categories:[{path:'Мир',default_selection:true}],selection:{base_weight:10},extra:{untouched:true}},{id:'b',lemma:'животное',categories:[],selection:{base_weight:20}}],relations:[{id:'r',type:'is_a',child:{id:'a'},parent:{id:'b'}}]});
test('сохраняет неизвестные поля и определяет правки значения',()=>{const a=fixture(),b=structuredClone(a);b.entries[0].meaning='домашний кот';validate(b);assert.deepEqual(b.entries[0].extra,a.entries[0].extra);assert.deepEqual(diff(a,b),[{id:'a',lemma:'кот',isNew:false}])});
test('отклоняет повторные ID, неизвестные ветки, веса и оборванные связи',()=>{for(const modify of [d=>d.entries[1].id='a',d=>d.entries[0].categories[0].path='unknown',d=>d.entries[0].selection.base_weight=99,d=>d.relations[0].parent.id='missing']){const d=fixture();modify(d);assert.throws(()=>validate(d))}});
test('находит входящие и исходящие отношения',()=>{const d=fixture();assert.equal(related(d,'a').length,1);assert.equal(related(d,'b').length,1)});
