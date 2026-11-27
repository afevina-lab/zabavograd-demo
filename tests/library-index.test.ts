import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {build,gitBlob}=require('../scripts/build-library-index.cjs');
const meta={master:{git_blob:'master'},runtime:{git_blob:'runtime'}};
const tasks={tasks:[{id:'p',filter:'phonetics'},{id:'m',filter:'morphology'},{id:'i',filter:'illustration_review'}]};
const word=(id:string,weight:number,extra:object={})=>({id,lemma:'лук',kind:'word',selection:{base_weight:weight},categories:[],...extra});
test('index preserves homonyms, stable priority, exact counts and no archived content',()=>{
 const db={entries:[word('b',70),word('a',100,{phonetic_tags:{status:'automatic_candidate_needs_review',data:{sound_tokens:['л']}},legacy_source:{raw:{secret:'not projected'}}}),word('c',100)],categories:[],relations:[{id:'r',type:'is_a',child:{id:'a'},parent:{id:'b'},approval:{status:'verified'}}]};
 const r=build(db,null,meta,tasks);
 assert.equal(r.manifest.entries,3);
 assert.deepEqual(r.pages['weight-100/page-001.json'].map((x:{id:string})=>x.id),['a','c']);
 assert.equal(r.manifest.queues.p.count,2);
 assert.equal(r.pages['weight-100/page-001.json'][0].relation_counts.verified,1);
 assert.equal(JSON.stringify(r.pages).includes('not projected'),false);
 assert.equal(r.manifest.fields.legacy_source.entries,1);
});
test('stale syllables not projected; fresh index gives type, no invented status',()=>{
 const db={entries:[word('a',100)],categories:[],relations:[]};
 const stale={source:{canonical_blob_sha:'old',blob_sha:'runtime'},groups:{'1':['a']}};
 const fresh={...stale,source:{canonical_blob_sha:'master',blob_sha:'runtime'}};
 assert.equal(build(db,stale,meta,tasks).pages['weight-100/page-001.json'][0].syllable_type,null);
 assert.equal(build(db,fresh,meta,tasks).pages['weight-100/page-001.json'][0].syllable_type,'1');
 assert.throws(()=>build(db,{...fresh,groups:{'1':['a'],'2':['a']}},meta,tasks));
});
test('draft without verified source stays provisional, mismatched lemma not projected',()=>{
 const db={entries:[word('a',100,{machine_analysis:{historical_draft:{lemma:'другое слово',phonetic:{status:'candidate_needs_review'},had_sound_tokens:true}}})],categories:[],relations:[]};
 const r=build(db,null,meta,tasks);
 assert.equal(r.manifest.draft_source_verified,false);
 assert.equal(r.pages['weight-100/page-001.json'][0].phonetic.draft_status,null);
});
test('bounded pages, null and unexpected weights kept, git blob digest',()=>{
 const db={entries:Array.from({length:81},(_,i)=>word(String(i).padStart(3,'0'),100)).concat([word('other',1)]),categories:[],relations:[]};
 const r=build(db,null,meta,tasks);
 assert.equal(r.pages['weight-100/page-001.json'].length,40);
 assert.equal(r.pages['weight-100/page-003.json'].length,1);
 assert.equal(r.pages['weight-other/page-001.json'][0].id,'other');
 assert.equal(gitBlob(Buffer.from('')),'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
});

test('historical draft residual stays provisional and does not replace active data',()=>{
 const db={entries:[word('a',100,{machine_analysis:{historical_draft:{lemma:'лук',meaning:null,had_sound_tokens:true,phonetic:{status:'candidate_needs_review'},morphology:{status:'needs_review'}}}})],categories:[],relations:[]};
 const r=build(db,null,meta,tasks),row=r.pages['weight-100/page-001.json'][0];
 assert.equal(row.phonetic.draft_tokens,true);assert.equal(row.phonetic.stored_tokens,false);
 assert.equal(row.morphology.draft_status,'needs_review');assert.equal(r.manifest.draft_source_verified,false);
});
