import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {select,inventory,patches,pointer}=require('../scripts/library-toolkit.cjs');
const db={entries:[
 {id:'a',lemma:'лук',selection:{base_weight:100},categories:[{path:'Растения/Овощи'}],translations:{fr:{article:'le'}},legacy_source:{raw:{x:1}}},
 {id:'b',lemma:'лук',selection:{base_weight:70},categories:[{path:'Предметы'}],translations:{fr:{article:null}}},
 {id:'c',lemma:'кот',selection:{base_weight:100},categories:[],translations:{fr:{article:''}}}
],categories:[],relations:[{id:'r'}]};
const op=(id:string,path:string,expect:object,value:unknown)=>({id,path,expect,value});
const packet=(...operations:object[])=>({version:1,operations});
test('homonyms preserved, gaps and weight filtered, paging stable',()=>{
 assert.deepEqual(select(db,{lemma:'ЛУК'}).rows.map((x:{id:string})=>x.id),['a','b']);
 assert.deepEqual(select(db,{gaps:true,field:'/translations/fr/article',weight:100}).rows.map((x:{id:string})=>x.id),['c']);
 assert.equal(select(db,{category:'Растения'}).total,1);
 assert.equal(select(db,{field:'/translations/fr/article',equals:null}).total,1);
 assert.equal(select(db,{limit:1}).next_offset,1);
 assert.throws(()=>select(db,{limit:101}));
});
test('inventory separates missing from empty without deciding review status',()=>{
 assert.deepEqual(inventory(db,['/translations/fr/article']).coverage['/translations/fr/article'],{missing:0,empty:2,present:1,statuses:{le:1,'':1}});
 assert.equal(inventory(db,['/missing']).coverage['/missing'].missing,3);
});
test('patch changes only exact field and preserves original, IDs and relations',()=>{
 const result=patches(db,packet(op('b','/translations/fr/article',{exists:true,value:null},'un')));
 assert.equal(result.db.entries[1].translations.fr.article,'un');
 assert.equal(db.entries[1].translations.fr.article,null);
 assert.deepEqual(result.db.entries[0],db.entries[0]);
 assert.deepEqual(result.db.relations,db.relations);
 assert.equal(result.changes.length,1);
 assert.equal(patches(result.db,packet(op('b','/translations/fr/article',{exists:true,value:'un'},'un'))).changes.length,0);
});
test('missing and null not conflated, stale patches fail atomically',()=>{
 assert.throws(()=>patches(db,packet(op('b','/translations/fr/article',{exists:false},'un'))),/Conflict/);
 assert.throws(()=>patches(db,packet(op('a','/translations/fr/article',{exists:true,value:'le'},'un'),op('b','/translations/fr/article',{exists:true,value:'wrong'},'un'))),/Conflict/);
 assert.equal(db.entries[0].translations.fr.article,'le');
 assert.equal(patches(db,packet(op('a','/translations/fr/gender',{exists:false},'masculine'))).db.entries[0].translations.fr.gender,'masculine');
});
test('reject identity, archive, unsafe and overlapping paths',()=>{
 for(const p of ['/id','/lemma','/legacy_source/raw','/illustrations/senses','/categories','/translations/__proto__/x','/translations/fr/id'])
  assert.throws(()=>patches(db,packet(op('a',p,{exists:false},'x'))));
 assert.throws(()=>patches(db,packet(op('a','/translations/fr',{exists:true,value:{article:'le'}},{article:'un'}))),/object fields/);
 assert.throws(()=>patches(db,packet(op('a','/translations/fr/gender',{exists:false},'x'),op('a','/translations/fr/gender',{exists:false},'y'))),/Overlapping/);
 assert.throws(()=>patches(db,packet(op('a','/translations/fr/new',{exists:false},{word_id:'b'}))),/Identity/);
 assert.deepEqual(pointer('/a~1b/c~0d'),['a/b','c~d']);
});
