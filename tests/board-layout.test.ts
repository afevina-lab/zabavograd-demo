import test from 'node:test';
import assert from 'node:assert/strict';
import {memoryLayout,sortingLayout} from '../src/board-layout.ts';
test('seven pairs use larger cards instead of forced seven-column rows',()=>{
 const result=memoryLayout(14,1280,700);
 assert(result.cols<7);assert(result.width>170);
});
test('sorting respects a finite field with twelve cards',()=>{
 const fit=sortingLayout(1280,650,12,[6,6]);
 assert(fit.card>=110);assert.equal(fit.columns,2);
});
