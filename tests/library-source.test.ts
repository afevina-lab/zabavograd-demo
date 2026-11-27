import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {create}=require('../scripts/library-store.cjs');
const {readSource,requireLegacyWrite,resolveSource}=require('../scripts/library-source.cjs');
const {fingerprint,verifyArchive}=require('../scripts/library-archive-guard.cjs');
const db={schema_version:2,entries:[{id:'a',lemma:'лук',phonetic_tags:{data:{tokens:['л']}},legacy_source:{raw:{speech:{tokens:['л']}}}},{id:'b',lemma:'лук'}],relations:[],categories:[]};
test('explicit modular source, no fallback if invalid and no direct legacy writes',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'library-source-'));
 const old=process.env.ZABAVOGRAD_LIBRARY_MODULES;
 try{
  const dir=path.join(tmp,'modules');create(dir,db);
  fs.mkdirSync(path.join(tmp,'outputs'));
  assert.deepEqual(readSource(tmp,{ZABAVOGRAD_LIBRARY_MODULES:dir}).db,db);
  assert.equal(readSource(tmp,{ZABAVOGRAD_LIBRARY_MODULES:dir}).mode,'modules');
  assert.throws(()=>readSource(tmp,{ZABAVOGRAD_LIBRARY_MODULES:path.join(tmp,'missing')}));
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

test('future canonical marker rejects dual sources, override and malformed policy',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'library-switch-'));
 try{
 fs.mkdirSync(path.join(dir,'editorial'));fs.mkdirSync(path.join(dir,'outputs'));
 const policy=path.join(dir,'editorial/library-source-mode.json'),legacy=path.join(dir,'outputs/library-v2.json');
 assert.equal(resolveSource(dir,{}).mode,'legacy');
 const modules=path.join(dir,'outputs/library-modules');fs.mkdirSync(modules);
 assert.throws(()=>resolveSource(dir,{}),/Unmarked modular source/);
 assert.throws(()=>resolveSource(dir,{ZABAVOGRAD_LIBRARY_MODULES:'/tmp/other'}),/Unmarked modular source/);
 fs.rmdirSync(modules);
 fs.writeFileSync(policy,JSON.stringify({version:1,mode:'modules',directory:'outputs/library-modules'}));
 assert.deepEqual(resolveSource(dir,{}),{mode:'modules',path:path.join(dir,'outputs/library-modules')});
 assert.throws(()=>resolveSource(dir,{ZABAVOGRAD_LIBRARY_MODULES:'/tmp/other'}),/override prohibited/);
 fs.writeFileSync(legacy,'{}');assert.throws(()=>resolveSource(dir,{}),/Two potential canonical/);fs.unlinkSync(legacy);
 fs.writeFileSync(policy,JSON.stringify({version:1,mode:'modules',directory:'../other'}));assert.throws(()=>resolveSource(dir,{}),/Invalid canonical/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
