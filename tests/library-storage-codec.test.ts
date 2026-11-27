import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {split,restore,bucket,pack,unpack}=require('../scripts/library-storage-codec.cjs');
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

const sharedDb={entries:[{id:'a',lemma:'лук',phonetic_tags:{data:{tokens:['л']}},morphology:{data:{a:1,b:2}},legacy_source:{raw:{speech:{tokens:['л']},grammar:{b:2,a:1}}}},{id:'b',lemma:'лук',phonetic_tags:{data:{tokens:['у']}},legacy_source:{raw:{speech:{tokens:['л']}}}}],relations:[],categories:[]};
test('only exact same-order values share immutable content, no alias on restore',()=>{
 const p=pack(sharedDb);assert.equal(p.pairsShared,1);
 assert.deepEqual(p.db.entries[0].morphology,sharedDb.entries[0].morphology);
 assert.deepEqual(p.db.entries[1],sharedDb.entries[1]);
 const restored=unpack(p.db);assert.equal(JSON.stringify(restored),JSON.stringify(sharedDb));
 restored.entries[0].phonetic_tags.data.tokens.push('к');
 assert.deepEqual(restored.entries[0].legacy_source.raw.speech.tokens,['л']);
});
test('corrupted shared content fails restoration',()=>{
 const p=pack(sharedDb);const pool=p.db.entries[0].__storage_shared_values;Object.values(pool)[0].tokens.push('к');
 assert.throws(()=>unpack(p.db),/hash mismatch/);
});
