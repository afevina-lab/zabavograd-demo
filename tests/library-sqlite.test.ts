import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {DatabaseSync}=require('node:sqlite');
const {build,query}=require('../scripts/library-sqlite.cjs');
const mk=(id,lemma,tokens,weight=100)=>({id,lemma,kind:'word',part_of_speech:'noun',selection:{base_weight:weight},categories:[{path:'Тема/Подтема',default_selection:true}],phonetic_tags:{status:'filled_with_explicit_extended_cases',data:{sound_tokens:tokens}},morphology:{status:'automatic_candidate_needs_review',data:{automatic_proposal:{status:'suggested',usable_for_generation:false,forms:{gent_sing:'форма'}}}},illustrations:{senses:[]}});
test('query by sound eligibility, exclusion, category, form origin and stale source',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sql-')),file=path.join(dir,'index.sqlite');
 try{
 const db={entries:[mk('a','кот',['к','о','т']),mk('b','луг',['л','у','к']),mk('c','кот',['к','о','т'],70),mk('d','лук',[])],relations:[{id:'r',type:'is_a',approval:{status:'verified'},child:{id:'a'},parent:{id:'b'}}]};
 build(db,file,{source_sha256:'test'});const sql=new DatabaseSync(file,{readOnly:true});
 try{
 const q=(x)=>query(sql,x,'test');
 assert.deepEqual(q({sounds:['к'],category:'Тема'}).rows.map(r=>r.id),['a','c']);
 assert.deepEqual(q({exclude_sounds:['к']}).rows.map(r=>r.id),[]);
 assert.equal(q({lemma:'КОТ',weight:70}).total,1);
 assert.equal(q({form_key:'gent_sing'}).total,0);
 assert.equal(q({form_key:'gent_sing',form_origin:'candidate'}).total,4);
 assert.equal(q({relation_type:'is_a'}).total,2);
 assert.throws(()=>q({syllable_type:'1'}),/stale/);
 assert.throws(()=>query(sql,{},'other'),/Stale index/);
 assert.throws(()=>q({limit:100}),/pagination/);
 assert.throws(()=>q({sql:'DROP TABLE word'}),/Unknown filter/);
 }finally{sql.close();}
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
