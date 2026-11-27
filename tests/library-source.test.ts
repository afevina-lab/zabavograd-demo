import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {create}=require('../scripts/library-store.cjs');
const {readSource,resolveSource}=require('../scripts/library-source.cjs');
const {fingerprint,verifyArchive}=require('../scripts/library-archive-guard.cjs');
const db={schema_version:2,entries:[{id:'a',lemma:'лук',phonetic_tags:{data:{tokens:['л']}},legacy_source:{raw:{speech:{tokens:['л']}}}},{id:'b',lemma:'лук'}],relations:[],categories:[]};
test('read only the marked canonical generation and never fall back',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'library-source-'));
 try{
  fs.mkdirSync(path.join(tmp,'outputs'));fs.mkdirSync(path.join(tmp,'editorial'));
  const dir=path.join(tmp,'outputs/library-modules'),policy=path.join(tmp,'editorial/library-source-mode.json');
  create(dir,db);
  assert.throws(()=>readSource(tmp,{}),/Canonical source policy required/);
  fs.writeFileSync(policy,JSON.stringify({version:1,mode:'modules',directory:'outputs/library-modules'}));
  assert.deepEqual(readSource(tmp,{}).db,db);
  assert.equal(readSource(tmp,{}).mode,'modules');
  assert.throws(()=>readSource(tmp,{ZABAVOGRAD_LIBRARY_MODULES:dir}),/override prohibited/);
  fs.rmSync(dir,{recursive:true,force:true});
  assert.throws(()=>readSource(tmp,{}));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
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

test('canonical marker rejects dual sources, override and malformed policy',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'library-switch-'));
 try{
 fs.mkdirSync(path.join(dir,'editorial'));fs.mkdirSync(path.join(dir,'outputs'));
 const policy=path.join(dir,'editorial/library-source-mode.json'),legacy=path.join(dir,'outputs/library-v2.json');
 assert.throws(()=>resolveSource(dir,{}),/Canonical source policy required/);
 const modules=path.join(dir,'outputs/library-modules');fs.mkdirSync(modules);
 assert.throws(()=>resolveSource(dir,{}),/Canonical source policy required/);
 assert.throws(()=>resolveSource(dir,{ZABAVOGRAD_LIBRARY_MODULES:'/tmp/other'}),/Canonical source policy required/);
 fs.rmdirSync(modules);
 fs.writeFileSync(policy,JSON.stringify({version:1,mode:'modules',directory:'outputs/library-modules'}));
 assert.deepEqual(resolveSource(dir,{}),{mode:'modules',path:path.join(dir,'outputs/library-modules')});
 assert.throws(()=>resolveSource(dir,{ZABAVOGRAD_LIBRARY_MODULES:'/tmp/other'}),/override prohibited/);
 fs.writeFileSync(legacy,'{}');assert.throws(()=>resolveSource(dir,{}),/Two potential canonical/);fs.unlinkSync(legacy);
 fs.writeFileSync(policy,JSON.stringify({version:1,mode:'modules',directory:'../other'}));assert.throws(()=>resolveSource(dir,{}),/Invalid canonical/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
