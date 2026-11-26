import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {pack,unpack,experiment}=require('../scripts/library-storage-optimize.cjs');
const db={entries:[{id:'a',lemma:'лук',phonetic_tags:{data:{tokens:['л']}},morphology:{data:{a:1,b:2}},legacy_source:{raw:{speech:{tokens:['л']},grammar:{b:2,a:1}}}},{id:'b',lemma:'лук',phonetic_tags:{data:{tokens:['у']}},legacy_source:{raw:{speech:{tokens:['л']}}}}],relations:[],categories:[]};
test('only exact same-order values share immutable content, no alias on restore',()=>{
 const p=pack(db);assert.equal(p.pairsShared,1);
 assert.deepEqual(p.db.entries[0].morphology,db.entries[0].morphology);
 assert.deepEqual(p.db.entries[1],db.entries[1]);
 const restored=unpack(p.db);assert.equal(JSON.stringify(restored),JSON.stringify(db));
 restored.entries[0].phonetic_tags.data.tokens.push('к');
 assert.deepEqual(restored.entries[0].legacy_source.raw.speech.tokens,['л']);
});
test('corrupted shared content fails restoration',()=>{
 const p=pack(db);const pool=p.db.entries[0].__storage_shared_values;Object.values(pool)[0].tokens.push('к');
 assert.throws(()=>unpack(p.db),/hash mismatch/);
});
test('all layouts roundtrip and select a bounded layout',()=>{
 const p=experiment(db,Buffer.from(JSON.stringify(db)));
 assert.equal(Object.keys(p.results).length,7);
 assert(p.selected);
});
