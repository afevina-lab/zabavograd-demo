import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {split,restore,audit,bucket}=require('../scripts/library-storage-audit.cjs');
const db={schema_version:2,entries:[{lemma:'лук',id:'a',phonetic_tags:{data:{sound_tokens:['л']}},legacy_source:{raw:{speech:{sound_tokens:['л']}}},unknown:{x:[null,false,0]}},{id:'b',lemma:'лук',morphology:null,illustrations:{senses:[{id:'b-sense'}]}}],categories:[{path:'x'}],relations:[{id:'r',type:'is_a',child:{id:'a'},parent:{id:'b'}}],extra:{order:['b','a']}};
test('roundtrip preserves all values, order, null and unknown fields',()=>{
 const p=split(db,'source');
 const actual=restore(p.manifest,(f:string)=>p.files.get(f));
 assert.deepEqual(actual,db);assert.equal(JSON.stringify(actual),JSON.stringify(db));
 assert(p.files.has('entries/archive/'+bucket('a')+'.json'));
 assert(p.files.has('entries/morphology/'+bucket('b')+'.json'));
});
test('rejects corrupt shards, duplicate entry IDs and relation IDs',()=>{
 const p=split(db,'source');
 assert.throws(()=>restore(p.manifest,(f:string)=>p.files.get(f)+' '),/Corrupt shard/);
 assert.throws(()=>split({...db,entries:[...db.entries,db.entries[0]]},'source'),/duplicate ID/);
 assert.throws(()=>split({...db,relations:[...db.relations,db.relations[0]]},'source'),/duplicate ID/);
});
test('audit reports archive and exact overlap without deleting data',()=>{
 const result=audit(db,{entries:[]},100);
 assert.equal(result.archive.raw_entries,1);
 assert.equal(result.overlap['legacy.speech vs phonetic_tags.data'].equal,1);
 assert.equal(result.fields.unknown.group,'core');
 assert.equal(db.entries[0].legacy_source.raw.speech.sound_tokens[0],'л');
});
