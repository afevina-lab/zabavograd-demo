import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTaskPresets,findTaskPresets} from '../src/task-presets.ts';
import {defaultFilters} from '../src/model.ts';
import {learningPool} from '../src/learning.ts';
import type {Word} from '../src/material-types.ts';
const words:Word[]=Array.from({length:12},(_,i)=>({id:String(i),label:['белый гриб','лисичка','опёнок','рыжик','подберёзовик','шампиньон','яблоко','груша','банан','персик','лимон','апельсин'][i],categories:[i<6?'Растения/Грибы':'Растения/Фрукты'],variants:[{id:'v'+i,src:'test.webp'}],topic:null,subcategory:null,position:'',type:null,opposition:[],weight:1,images:1}));
test('Search ranks the requested category first and applies only real canonical category paths',()=>{const presets=buildTaskPresets(words),result=findTaskPresets(presets,'грибы')[0];assert.equal(result.title,'Грибы');assert.deepEqual(result.learning.categoryPaths,['Растения/Грибы']);assert.equal(learningPool(words,defaultFilters,result.learning).length,6);assert.equal(result.sorting?.length,2);assert(result.sorting?.every(g=>learningPool(words,defaultFilters,g.learning).length>=g.count));assert.equal(findTaskPresets(presets,'нет такой темы').length,0)});
test('Reading and math suggestions carry complete editable task settings',()=>{const presets=buildTaskPresets(words),reading=findTaskPresets(presets,'грибы чтение')[0],math=findTaskPresets(presets,'сложение')[0];assert.equal(reading.learning.mode,'reading');assert.equal(reading.presentation,'words');assert.equal(reading.learning.additional?.[0].learning.mode,'lexical');assert.equal(math.learning.math?.subtract,false);assert.equal(math.learning.math?.target,10);assert.equal(findTaskPresets(presets,'звук р')[0].learning.sounds[0],'р')});
