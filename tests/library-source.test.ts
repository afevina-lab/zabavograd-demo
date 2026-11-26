import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {create}=require('../scripts/library-store.cjs');
const {readSource,requireLegacyWrite}=require('../scripts/library-source.cjs');
const {fingerprint,verifyArchive}=require('../scripts/library-archive-guard.cjs');
const db={schema_version:2,entries:[{id:'a',lemma:'лук',phonetic_tags:{data:{tokens:['л']}},legacy_source:{raw:{speech:{tokens:['л']}}}},{id:'b',lemma:'лук'}],relations:[],categories:[]};
test('explicit modular source, no fallback if invalid and no direct legacy writes',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'library-source-'));
 const old=process.env.ZABAVOGRAD_LIBRARY_MODULES;
 try{
  const dir=path.join(tmp,'modules');create(dir,db);
  process.env.ZABAVOGRAD_LIBRARY_MODULES=dir;
  assert.deepEqual(readSource().db,db);
  assert.equal(readSource().mode,'modules');
  assert.throws(()=>requireLegacyWrite(),/Direct V2 write disabled/);
  process.env.ZABAVOGRAD_LIBRARY_MODULES=path.join(tmp,'missing');
  assert.throws(()=>readSource());
 }finally{
  if(old===undefined)delete process.env.ZABAVOGRAD_LIBRARY_MODULES;else process.env.ZABAVOGRAD_LIBRARY_MODULES=old;
  fs.rmSync(tmp,{recursive:true,force:true});
 }
});
test('archive fingerprint independent of active analysis and entry order, detects mutation and removal',()=>{
 const expected=fingerprint(db);
 const copy=structuredClone(db);
 copy.entries.reverse();copy.entries[1].phonetic_tags.data.tokens.push('у');
 assert.doesNotThrow(()=>verifyArchive(copy,expected));
 copy.entries[1].legacy_source.raw.speech.tokens.push('у');
 assert.throws(()=>verifyArchive(copy,expected),/archive changed/);
 assert.throws(()=>verifyArchive({...db,entries:[db.entries[1]]},expected),/count changed/);
});
