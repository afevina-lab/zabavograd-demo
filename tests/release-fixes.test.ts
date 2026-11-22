import test from 'node:test';
import assert from 'node:assert/strict';
import {mathMaterial} from '../src/math-material.ts';
import {visualGroups,validateGroups} from '../src/matching.ts';
test('example answer range excludes results below selected lower endpoint',()=>{const rows=mathMaterial({target:20,from:12,kind:'examples',add:true,subtract:true});assert(rows.length>0);assert(rows.every(w=>Number(w.answer)>=12&&Number(w.answer)<=20));});
test('three visual elements have distinct appearances and valid group size',()=>{const word={id:'test',label:'test',weight:50,variants:[{src:'test.webp'}]} as any;const groups=visualGroups([word],'','outline',3);assert.equal(validateGroups(groups,3),'');assert.equal(new Set(groups[0].elements.map(e=>e.appearance)).size,3);});
