import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {create,load}=require('../scripts/library-store.cjs');
const {prepare,query}=require('../scripts/library-request-source.cjs');
test('remote requests read only marked canonical modules and never stage a legacy master',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'canonical-request-'));
 try{
  fs.mkdirSync(path.join(root,'outputs'));
  fs.mkdirSync(path.join(root,'editorial'));
  const dest=path.join(root,'unused-stage'),legacy=path.join(root,'outputs/library-v2.json');
  const directory=path.join(root,'outputs/library-modules');
  const policy=path.join(root,'editorial/library-source-mode.json');
  const db={entries:[{id:'a',lemma:'кот'}],relations:[],categories:[]};
  fs.writeFileSync(legacy,JSON.stringify(db));
  assert.throws(()=>prepare(dest,root,{}),/Canonical source policy required/);
  assert(!fs.existsSync(dest));
  fs.unlinkSync(legacy);
  create(directory,db);
  assert.throws(()=>prepare(dest,root,{}),/Canonical source policy required/);
  fs.writeFileSync(policy,JSON.stringify({version:1,mode:'modules',directory:'outputs/library-modules'}));
  assert.deepEqual(prepare(dest,root,{}),{directory,mode:'canonical_modules',source_sha256:load(directory).source_sha256});
  assert(!fs.existsSync(dest));
  assert.throws(()=>prepare(dest,root,{ZABAVOGRAD_LIBRARY_MODULES:directory}),/override/);
  fs.writeFileSync(legacy,'{}');
  assert.throws(()=>prepare(dest,root,{}),/Two potential canonical/);
  fs.unlinkSync(legacy);
  fs.mkdirSync(dest);
  assert.throws(()=>prepare(dest,root,{}),/Staging destination already exists/);
  assert.deepEqual(load(directory).db,db);
  assert.throws(()=>query(dest,'unused-request','unused-result'),/Remote query must use canonical modules/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
