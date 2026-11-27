#!/usr/bin/env node
'use strict';
// Analysis produces an independent validated candidate, not an in-place write.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {resolveSource}=require('./library-source.cjs');
const {stage}=require('./library-initial-analysis.cjs');
const [draft,dest,...rest]=process.argv.slice(2);
assert(draft&&dest&&!rest.length,'Usage: merge-auto-analysis.cjs DRAFT_JSON NEW_DIR');
const source=resolveSource();assert.equal(source.mode,'modules','Canonical modular source required');
console.log(JSON.stringify(stage(source.path,JSON.parse(fs.readFileSync(draft,'utf8')),dest),null,2));
