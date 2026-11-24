import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {installCaptureClock} from '../scripts/visual-capture-environment.mjs';
function environment(){const frames=[],sandbox={requestAnimationFrame:callback=>{frames.push(callback);return frames.length},clearInterval:()=>{},localStorage:{clear(){}}};runInNewContext(`(${installCaptureClock.toString()})();`,sandbox);return {sandbox,frames}}
test('capture intervals advance by explicit time and stop when cleared',()=>{const {sandbox}=environment();let calls=0;const id=sandbox.setInterval(()=>calls++,1000);assert.equal(calls,0);sandbox.__visualCaptureClock.advance(2500);assert.equal(calls,2);sandbox.clearInterval(id);sandbox.__visualCaptureClock.advance(1000);assert.equal(calls,2)});
test('capture RAF timestamps are independent of wall-clock scheduling',()=>{const {sandbox,frames}=environment();let timestamp;sandbox.requestAnimationFrame(now=>timestamp=now);frames.shift()(999999);assert.equal(timestamp,1000);sandbox.__visualCaptureClock.advance(1000);sandbox.requestAnimationFrame(now=>timestamp=now);frames.shift()(1);assert.equal(timestamp,2000)});
test('capture random seed and clock repeat in fresh pages',()=>{const a=environment().sandbox,b=environment().sandbox;assert.deepEqual(Array.from(runInNewContext('[Math.random(),Math.random(),Date.now()]',a)),Array.from(runInNewContext('[Math.random(),Math.random(),Date.now()]',b)))});
