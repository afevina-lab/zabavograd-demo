import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {build,create,load,planPatch,delta,fingerprint}=require('../scripts/library-store.cjs');
const db={schema_version:2,entries:[{id:'a',lemma:'лук',selection:{base_weight:100},phonetic_tags:{data:{tokens:['л']}},legacy_source:{raw:{speech:{tokens:['л']}}}},{id:'b',lemma:'лук',selection:{base_weight:70}}],relations:[],categories:[]};
test('independent staged generations, fingerprint, no overwrite, no extra files',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'store-'));
 try{
  const dir=path.join(tmp,'v1');create(dir,db);
  const r=load(dir);assert.deepEqual(r.db,db);assert.equal(r.source_sha256,fingerprint(db));
  assert.throws(()=>create(dir,db),/already exists/);
  fs.writeFileSync(path.join(dir,'unexpected.json'),'{}');
  assert.throws(()=>load(dir),/extra module/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('one-field patch changes only one module, fingerprint conflicts reject',()=>{
 const current={db,source_sha256:fingerprint(db)},packet={version:1,source_sha256:current.source_sha256,operations:[{id:'a',path:'/selection/base_weight',expect:{exists:true,value:100},value:70}]};
 const r=planPatch(current,packet);
 const d=delta(build(db).manifest,build(r.db).manifest);
 assert.equal(d.modified.length,1);assert.match(d.modified[0],/^entries\/core\//);assert.deepEqual(d.added,[]);assert.deepEqual(d.removed,[]);
 assert.throws(()=>planPatch({...current,source_sha256:'new'},packet),/Stale/);
 assert.equal(db.entries[0].selection.base_weight,100);
});
test('active change splits archive content instead of changing history',()=>{
 const current={db,source_sha256:fingerprint(db)},r=planPatch(current,{version:1,source_sha256:current.source_sha256,operations:[{id:'a',path:'/phonetic_tags/data/tokens',expect:{exists:true,value:['л']},value:['л','у']}]});
 assert.deepEqual(r.db.entries[0].legacy_source,db.entries[0].legacy_source);
 assert.deepEqual(r.db.entries[0].phonetic_tags.data.tokens,['л','у']);
 assert.doesNotThrow(()=>build(r.db));
});

test('canonical generation can be rebuilt byte for byte without migration',()=>{
 const dir=path.resolve('outputs/library-modules');
 const current=load(dir),rebuilt=build(current.db);
 assert.deepEqual(rebuilt.manifest,current.manifest);
 assert.equal(rebuilt.files.size,Object.keys(current.manifest.files).length);
 for(const [file,content] of rebuilt.files)assert.equal(content,fs.readFileSync(path.join(dir,file),'utf8'),'Changed canonical shard '+file);
});
