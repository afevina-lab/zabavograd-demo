import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {plan,reference,counts}=require('../scripts/library-semantic-proposals.cjs');
const {prepare}=require('../scripts/library-modular-request.cjs');
const {build,fingerprint}=require('../scripts/library-store.cjs');
const e=(id,lemma,meaning=null)=>({id,lemma,meaning,kind:'word',part_of_speech:'noun',generalization:{is_generalizing_word:true}});
const db={entries:[e('a','лук','овощ'),e('b','лук','оружие'),e('c','растение'),e('d','предмет')],categories:[],relations:[{id:'old',type:'is_a',child:{id:'a'},parent:{id:'c'}},{id:'part',type:'part_of',subject:{id:'b'},object:{id:'d'}}]};
const op=(type,s,o)=>({type,subject:reference(db.entries.find(e=>e.id===s)),object:reference(db.entries.find(e=>e.id===o)),reason:'Проверка смысловой связи'});
test('typed proposals keep active relations and meanings independent; reverse symmetric duplicate rejected',()=>{
 const r=plan(db,[op('synonym','c','d')]);
 assert.deepEqual(r.db.relations,db.relations);assert.equal(r.changes.length,1);
 const p=r.db.entries[2].semantic_review_proposals[0];assert.equal(p.usable_for_generation,false);
 assert.equal(counts(r.db).get('d'),1);
 assert.throws(()=>plan(r.db,[op('synonym','d','c')]),/Duplicate/);
 assert(!Object.hasOwn(db.entries[2],'semantic_review_proposals'));
});
test('rejects wrong homonym, self-links, inverse duplicates and new cycles',()=>{
 const wrong=op('part_of','a','d');wrong.subject.meaning='оружие';
 assert.throws(()=>plan(db,[wrong]),/Sense snapshot differs/);
 assert.throws(()=>plan(db,[op('part_of','a','a')]),/Self relation/);
 assert.throws(()=>plan(db,[op('has_part','d','b')]),/Duplicate/);
 assert.throws(()=>plan(db,[op('is_a','c','a')]),/Cyclic/);
 assert.throws(()=>plan(db,[op('part_of','d','b')]),/Cyclic/);
 assert.throws(()=>plan(db,[op('part_of','c','d'),op('part_of','d','c')]),/Cyclic/);
});
test('remote preview binds typed proposal to exact snapshot without generic relation edits',()=>{
 const current={db,manifest:build(db).manifest,source_sha256:fingerprint(db)};
 const req={version:1,mode:'preview',source_sha256:current.source_sha256,operations:[],semantic_operations:[op('part_of','a','d')]};
 const r=prepare(current,req);assert.equal(r.preview.changes.length,1);assert.equal(r.preview.semantic_operations.length,1);
 assert(r.preview.delta.modified.some(x=>x.startsWith('entries/semantics/'))||r.preview.delta.added.some(x=>x.startsWith('entries/semantics/')));
 assert.equal(prepare(current,{...req,mode:'candidate',preview_sha256:r.preview_sha256}).preview_sha256,r.preview_sha256);
});
