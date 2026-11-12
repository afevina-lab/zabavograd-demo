import test from 'node:test';
import assert from 'node:assert/strict';
import { countingFormKey } from '../src/counting.ts';
test('Russian counting handles endings and teen exceptions', () => {
  const forms = {one: 'корова', few: 'коровы', many: 'коров'};
  for (const n of [1, 21, 101]) assert.equal(forms[countingFormKey(n)], 'корова');
  for (const n of [2, 3, 4, 22, 23, 24, 102]) assert.equal(forms[countingFormKey(n)], 'коровы');
  for (const n of [0, 5, 11, 12, 13, 14, 20, 35, 111, 112, 114]) assert.equal(forms[countingFormKey(n)], 'коров');
  for (const n of [-1, 1.5, NaN, Infinity]) assert.throws(() => countingFormKey(n));
});
