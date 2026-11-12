import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSorting,newGroup,updateGroup} from '../src/sorting.ts';
import type {Word} from '../src/model.ts';
const w=(id:string):Word=>({id,label:id,topic:null,subcategory:null,position:'',type:null,opposition:[],weight:100,images:0});
test('sorting allocates overlapping pools without duplicate cards',()=>{
 const items=makeSorting([[w('a'),w('b')],[w('b'),w('c')]],[2,1],()=>.5);
 assert.equal(items.length,3);assert.equal(new Set(items.map(i=>i.word.id)).size,3);
 assert.deepEqual(items.find(i=>i.word.id==='b')!.accepted,[0,1]);
});
test('identical groups and impossible total quota are blocked',()=>{
 assert.throws(()=>makeSorting([[w('a')],[w('a')]],[1,1]));
 assert.throws(()=>makeSorting([[w('a'),w('b')],[w('b'),w('c')]],[2,2]));
});
test('propagation preserves manual field overrides',()=>{
 let gs=updateGroup([newGroup(0),newGroup(1)],0,'learning',{mode:'automation',sounds:['р']});
 assert.deepEqual(gs[1].learning.sounds,['р']);
 gs=updateGroup(gs,1,'learning',{sounds:['с']});
 gs=updateGroup(gs,0,'learning',{sounds:['ш'],contentKinds:['syllables']});
 assert.deepEqual(gs[1].learning.sounds,['с']);assert.deepEqual(gs[1].learning.contentKinds,['syllables']);
});
import {starsForScore,changeCount,groupTitle} from '../src/sorting.ts';
test('sorting stars cover threshold boundaries',()=>{for(const [percent,stars] of [[0,0],[29,0],[30,1],[50,1],[51,2],[80,2],[81,3],[100,3]])assert.equal(starsForScore(percent,100),stars)});
test('counts propagate until manually overridden and titles follow rules',()=>{
 let gs=changeCount([newGroup(0),newGroup(1)],0,8);assert.equal(gs[1].count,8);
 gs=changeCount(gs,1,5);gs=changeCount(gs,0,10);assert.equal(gs[1].count,5);
 gs[0].learning={...gs[0].learning,mode:'automation',sounds:['р'],rules:{р:{positions:['начало'],clusters:null}}};
 assert.equal(groupTitle(gs[0]),'Звук Р в начале слова');
});
