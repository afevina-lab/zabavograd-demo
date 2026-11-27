import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const m=require('../scripts/library-import.cjs');
const {prepare}=require('../scripts/library-modular-request.cjs');
const {build,fingerprint}=require('../scripts/library-store.cjs');
const db={schema_version:2,provenance:{},entries:[{id:'a',lemma:'ёлка',kind:'word',meaning:null,illustrations:{senses:[]}}],categories:[{path:'Растения'}],relations:[]};
const op={type:'create_noun',lemma:'сосна',meaning:'хвойное дерево',categories:['Растения'],proposed_weight:100,reason:'Проверка импорта'};
test('new nouns use stable IDs and are not active by default',()=>{
 const r=m.plan(db,[op]);const e=r.db.entries.at(-1);
 assert.equal(e.id,m.nounId('сосна'));assert.equal(e.selection.base_weight,0);assert.equal(e.lexical_eligible_by_default,false);
 assert.equal(e.phonetic_tags.status,'pending_automatic_analysis');assert.equal(m.verifyImports(r.db),1);
 assert.deepEqual(r.db.entries[0],db.entries[0]);assert.throws(()=>m.plan(r.db,[op]),/Existing spelling/);
 assert.throws(()=>m.plan(db,[{...op,lemma:'елка'}]),/Existing spelling/);
 assert.throws(()=>m.plan(db,[{...op,categories:['unknown']}]),/Unknown category/);
 const current={db,manifest:build(db).manifest,source_sha256:fingerprint(db)};
 const p=prepare(current,{version:1,mode:'preview',source_sha256:current.source_sha256,operations:[],import_operations:[op]});
 assert.equal(p.planned.db.entries.length,2);assert.equal(p.preview.import_operations.length,1);
});
test('image association uses exact sense, reviewed path and byte hash; no overwriting',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'image-import-'));
 try{
  fs.mkdirSync(path.join(tmp,'assets/words'),{recursive:true});
  // Structural WebP fixture; no claim of image quality or pixel decode.
  const b=Buffer.alloc(22);b.write('RIFF');b.writeUInt32LE(14,4);b.write('WEBP',8);b.write('VP8L',12);b.writeUInt32LE(2,16);b[20]=47;
  const src='/assets/words/probe.webp',f=path.join(tmp,src);fs.writeFileSync(f,b);
  const sha256=crypto.createHash('sha256').update(b).digest('hex'),link={type:'link_webp',entry_id:'a',lemma:'ёлка',meaning:null,src,sha256,reviewed:true,reason:'Проверка привязки'};
  const r=m.plan(db,[link],tmp);assert.equal(r.db.entries[0].illustrations.senses.length,1);
  assert.deepEqual(m.projectRegistry(r.db,{senses:[]}).senses,r.db.entries[0].illustrations.senses);
  assert.equal(m.verifyImports(r.db,tmp),0);
  assert.throws(()=>m.plan(r.db,[link],tmp),/Existing sense/);
  assert.throws(()=>m.plan(db,[{...link,meaning:'другое'}],tmp),/Meaning differs/);
  assert.throws(()=>m.plan(db,[{...link,reviewed:false}],tmp),/visual review/);
  assert.throws(()=>m.plan(db,[{...link,sha256:'0'.repeat(64)}],tmp),/SHA differs/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
