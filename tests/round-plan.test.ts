import test from 'node:test';
import assert from 'node:assert/strict';
import {splitRounds,suggestedRounds} from '../src/round-plan.ts';
test('round partitions preserve every selected item exactly once and balance uneven counts',()=>{
 const items=Array.from({length:17},(_,i)=>i),chunks=splitRounds(items,4);
 assert.deepEqual(chunks.flat(),items);assert.equal(chunks.length,4);
 assert(Math.max(...chunks.map(c=>c.length))-Math.min(...chunks.map(c=>c.length))<=1);
 assert.equal(splitRounds([1,2],9).length,2);
});
test('sorting rounds retain representatives from every group',()=>{
 const items=Array.from({length:12},(_,i)=>({id:i,group:i%3}));
 const rounds=splitRounds(items,4,item=>String(item.group));
 assert(rounds.every(round=>new Set(round.map(i=>i.group)).size===3));
 assert.equal(new Set(rounds.flat().map(i=>i.id)).size,items.length);
});
test('phone suggestion responds to game, space and text without exceeding meaningful rounds',()=>{
 assert(suggestedRounds(20,'memory',390,844)>1);
 assert(suggestedRounds(20,'memory',390,480)>=suggestedRounds(20,'memory',390,844));
 assert(suggestedRounds(24,'conveyor',390,844,{text:true})<suggestedRounds(24,'conveyor',390,844));
 assert.equal(suggestedRounds(20,'sorting',320,480,{maxRounds:2}),2);
 assert.equal(suggestedRounds(1,'matching',390,844),1);
});
