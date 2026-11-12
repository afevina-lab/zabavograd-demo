import {createRequire} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {key,review,validateExport}=require('../scripts/semantic-review.cjs');
const library=()=>({schema_version:2,entries:[
 {id:'a',lemma:'яблоко',meaning:'плод'},
 {id:'b',lemma:'фрукт',meaning:'пищевой плод'},
 {id:'c',lemma:'яблоко',meaning:'изображение яблока'}
],relations:[
 {id:'original-family',type:'animal_family',male:{id:'a'},female:{id:'b'}},
 {id:'original-genus',type:'is_a',child:{id:'a'},parent:{id:'b'}}
]});
const candidate=()=>({source:'wikidata',source_record_id:'Q10:P279:Q20',candidate_type:'semantic_relation',
 relation_type:'part_of',subject_id:'a',object_id:'b',wikidata_subject:'Q10',wikidata_object:'Q20',
 review_status:'suggested',usable_for_generation:false});
const bundle=(r=candidate(),license='CC0')=>({schema:'linguistic_suggestions_v1',purpose:'review_only',license,source_revision:'test',records:[r]});
const decisions=(r=candidate())=>({schema:'semantic_review_decisions_v1',decisions:[{
 key:key(r),action:'accept',subject_id:r.subject_id,object_id:r.object_id,
 relation_type:r.relation_type,sense_checked:true,typical_for_children:true
}]});
test('accept: writes only explicitly reviewed semantic relation to canonical graph',()=>{
 const db=library(),out=review(db,[bundle()],decisions());
 assert.equal(db.relations.length,2,'input remains unchanged');
 assert.equal(out.relations.length,3);
 assert.equal(out.relations.filter(r=>r.subject).length,1);
 const graph=validateExport(out);
 assert.equal(graph.relations.length,2);
 assert.equal(graph.families.length,1);
 assert.equal(graph.relations.at(-1).inverse_type,'has_part');
});
test('review is idempotent; no additional family or genus edges are destroyed',()=>{
 const first=review(library(),[bundle()],decisions());
 const second=review(first,[bundle()],decisions());
 assert.deepEqual(second,first);
});
test('reject does not add relation and can revoke the exact previously accepted source edge',()=>{
 const r=candidate(),reject={schema:'semantic_review_decisions_v1',decisions:[{key:key(r),action:'reject',reason:'Не подходит детям'}]};
 assert.equal(review(library(),[bundle()],reject).relations.length,2);
 assert.equal(review(review(library(),[bundle()],decisions()),[bundle()],reject).relations.length,2);
});
test('imported structure with a single lemma is not automatically accepted',()=>{
 assert.equal(review(library(),[bundle()],{schema:'semantic_review_decisions_v1',decisions:[]}).relations.length,2);
});
test('must confirm same value IDs and pediatric typicality',()=>{
 const d=decisions();d.decisions[0].subject_id='c';
 assert.throws(()=>review(library(),[bundle()],d),/exact IDs/);
 const noTypical=decisions();noTypical.decisions[0].typical_for_children=false;
 assert.throws(()=>review(library(),[bundle()],noTypical),/confirmations/);
});
test('restricted licenses, invalid sense and unsupported forms fail closed',()=>{
 assert.throws(()=>review(library(),[bundle(candidate(),'GPL-3.0')],decisions()),/CC0/);
 const r={...candidate(),subject_id:'missing'};
 assert.throws(()=>review(library(),[bundle(r)],decisions(r)),/unknown sense/);
 const construction={...candidate(),candidate_type:'valency_pattern'};
 assert.throws(()=>review(library(),[bundle(construction)],decisions(construction)),/Unsupported semantic source/);
});
test('export refuses draft and non-cleared imported relations',()=>{
 const db=review(library(),[bundle()],decisions());
 db.relations.at(-1).approval.status='suggested';
 assert.throws(()=>validateExport(db),/Unreviewed/);
 db.relations.at(-1).approval.status='verified';
 db.relations.at(-1).provenance.license='GPL-3.0';
 assert.throws(()=>validateExport(db),/Non-cleared/);
});

test('already established genus relation is not duplicated by a Wikidata suggestion',()=>{
 const r={...candidate(),relation_type:'is_a'};
 const out=review(library(),[bundle(r)],decisions(r));
 assert.equal(out.relations.length,2);
 assert.equal(validateExport(out).relations.length,1);
});

test('review blocks is-a cycles before updating the canonical dictionary',()=>{
 const db=library(),r={...candidate(),relation_type:'is_a',subject_id:'b',object_id:'a'};
 assert.throws(()=>review(db,[bundle(r)],decisions(r)),/Cyclic is-a/);
 assert.equal(db.relations.length,2);
});

test('RuWordNet proposals are accepted into private research queue but never published',()=>{
 const r={...candidate(),source:'ruwordnet',source_record_id:'123-N:hypernyms:456-N',
  ruwordnet_subject:'123-N',ruwordnet_object:'456-N',relation_type:'antonym'};
 const reviewed=review(library(),[bundle(r,'research-only noncommercial')],decisions(r));
 const row=reviewed.relations.find(x=>x.provenance?.source==='ruwordnet');
 assert.equal(row.approval.status,'verified_research_only');
 assert.equal(row.approval.usable_for_generation,false);
 const game=validateExport(reviewed);
 assert.equal(game.relations.some(x=>x.id===row.id),false);
});
