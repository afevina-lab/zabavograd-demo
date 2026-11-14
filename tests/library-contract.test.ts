import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {validateLibrary}=require('../scripts/validate-library-contract.cjs');
const load=()=>JSON.parse(readFileSync(new URL('../outputs/library-v2.json',import.meta.url),'utf8'));
test('canonical library satisfies schema and retains unknown editorial metadata',()=>{
 const db=load();db.entries[0].future_editorial_field={keep:true};
 const before=JSON.stringify(db);
 assert.equal(validateLibrary(db).entries,db.entries.length);
 assert.equal(JSON.stringify(db),before);
});
test('contract rejects dangling relations, duplicate IDs, missing categories and image owners',()=>{
 for(const mutate of [
  (db:any)=>{db.entries[1].id=db.entries[0].id;},
  (db:any)=>{db.entries[0].categories[0].path='missing-category';},
  (db:any)=>{db.relations[0].male={id:'missing-entry'};},
  (db:any)=>{db.entries[0].illustrations.senses[0].word_id='wrong-owner';},
 ]){const db=load();mutate(db);assert.throws(()=>validateLibrary(db));}
});
