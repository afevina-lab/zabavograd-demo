import test from 'node:test';
import assert from 'node:assert/strict';
import {transformationResult,transformationWords} from '../src/transformations.ts';
test('small keeps one illustration at exactly half size',()=>{assert.equal(transformationResult('small',false).scale,1);assert.equal(transformationResult('small',true).scale,.5);assert.equal(transformationResult('small',true).count,1)});
test('many creates exactly five copies only in answer',()=>{assert.equal(transformationResult('many',false).count,1);assert.equal(transformationResult('many',true).count,5)});
test('reading reveals image after word',()=>{assert.equal(transformationResult('reading',false).kind,'word');assert.equal(transformationResult('reading',true).kind,'image')});

