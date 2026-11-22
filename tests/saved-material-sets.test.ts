import assert from 'node:assert/strict';
import {test} from 'node:test';
import {deleteMaterialSet,readMaterialSets,saveMaterialSet,MATERIAL_SETS_KEY} from '../src/saved-material-sets.ts';
import {defaultFilters} from '../src/model.ts';
import {initialLearning} from '../src/learning.ts';
function memoryStorage(){
 const map=new Map<string,string>();
 return {
  getItem:(key:string)=>map.get(key)??null,
  setItem:(key:string,value:string)=>{map.set(key,value)},
 };
}
test('material presets are versioned and shared independently of any game',()=>{
 const storage=memoryStorage();
 const learning={...initialLearning,mode:'automation' as const,sounds:['с'],approvedWordIds:['word-1','word-2'],selectionMode:'approved' as const};
 let sets=saveMaterialSet({name:'  Звук С  ',learning,filters:defaultFilters},undefined,storage);
 assert.equal(sets.length,1);assert.equal(sets[0].name,'Звук С');
 assert.deepEqual(readMaterialSets(storage)[0].learning.approvedWordIds,['word-1','word-2']);
 sets=saveMaterialSet({name:'С — начало',learning,filters:{...defaultFilters,position:'начало'}},sets[0].id,storage);
 assert.equal(sets.length,1);assert.equal(sets[0].createdAt,readMaterialSets(storage)[0].createdAt);
 assert.equal(sets[0].filters.position,'начало');
 assert.equal(deleteMaterialSet(sets[0].id,storage).length,0);
});
test('invalid data is never silently overwritten',()=>{
 const storage=memoryStorage();
 storage.setItem(MATERIAL_SETS_KEY,'{bad-json');
 assert.throws(()=>readMaterialSets(storage));
 assert.throws(()=>saveMaterialSet({name:'Тест',learning:initialLearning,filters:defaultFilters},undefined,storage));
 assert.equal(storage.getItem(MATERIAL_SETS_KEY),'{bad-json');
});
test('only-approved mode requires at least one manually selected word',()=>{
 const storage=memoryStorage();
 assert.throws(()=>saveMaterialSet({name:'Пустой',learning:{...initialLearning,selectionMode:'approved',approvedWordIds:[]},filters:defaultFilters},undefined,storage));
});
