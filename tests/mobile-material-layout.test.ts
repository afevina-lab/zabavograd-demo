import test from 'node:test';
import assert from 'node:assert/strict';
import {orderedWords} from '../src/word-choice-order.ts';
import {sortingLayout} from '../src/board-layout.ts';
import type {Word} from '../src/material-types.ts';
test('word choices keep selected first, then suitable, then other words in Russian alphabetic order',()=>{
 const words=['якорь','дом','арбуз','ваза','банан'].map((label,i)=>({id:String(i),label} as Word));
 assert.deepEqual(orderedWords(words,['0','2'],['1','4']).map(w=>w.label),['арбуз','якорь','банан','дом','ваза']);
 assert.deepEqual(words.map(w=>w.label),['якорь','дом','арбуз','ваза','банан']);
 assert.equal(orderedWords([...words,words[0]],[],[]).length,5);
});
test('crowded mobile sorting keeps readable bank cards and compresses placed cards separately',()=>{
 for(const [width,height] of [[320,480],[390,700],[844,270]]){
  const fit=sortingLayout(width,height,120,[20,20,20,20,20,20]);
  assert(fit.card>=96);assert(fit.placedCard>=48);assert(fit.placedCard<fit.card);
 }
});
