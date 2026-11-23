import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p:string)=>JSON.parse(fs.readFileSync(p,'utf8'));
const db=read('outputs/library-v2.json');
const runtime=read('public/library.json');
const report=read('outputs/EDITORIAL_GAPS_20261123.json');
const active=read('outputs/ACTIVE_FORMS_20261123.json');
test('missing furniture parts, animal dwellings and products have concrete canonical IDs',()=>{
 const ids=new Set(db.entries.map((e:any)=>e.id));
 assert.equal(ids.size,db.entries.length);
 for(const lemma of ['дверца','сиденье','спинка','подлокотник','ножка','конюшня',
  'курятник','коровник','свинарник','крольчатник','улей','муравейник','скворечник',
  'яйцо','мёд','шерсть','мука','яичница']){
  assert(db.entries.some((e:any)=>e.lemma===lemma),'Missing '+lemma);
 }
 assert(report.words_added>=0);
});
test('new relationships are verified independently, bidirectional and never copied from FrameBank',()=>{
 const graph=read('public/semantic-graph.json');
 for(const row of report.new_relations){
  const r=db.relations.find((r:any)=>r.id===row.id);
  assert.equal(r?.approval?.usable_for_generation,true,row.id);
  assert.equal(r?.provenance?.source,'zabavograd_editorial');
  assert(graph.by_entry[r.subject.id].some((l:any)=>l.relation_id===r.id&&l.target_id===r.object.id));
  assert(graph.by_entry[r.object.id].some((l:any)=>l.relation_id===r.id&&l.target_id===r.subject.id));
 }
 assert(!db.relations.some((r:any)=>r.provenance?.source==='framebank'&&r.approval?.usable_for_generation===true));
});
test('only admitted machine-checked paradigms are published, never raw proposals or unreviewed count forms',()=>{
 const byId=new Map(runtime.map((w:any)=>[w.id,w]));
 const activeEntries=db.entries.filter((e:any)=>e.morphology?.data?.approved_form_subset?.usable_for_generation===true);
 assert(activeEntries.length>0);
 for(const row of activeEntries){
  const entry:any=byId.get(row.id);
  assert(entry,'Not in runtime '+row.id);
  assert.equal(entry.inflectionStatus,'machine_checked');
  assert.deepEqual(entry.inflections,row.morphology.data.approved_form_subset.forms);
  assert(!Object.keys(entry.inflections).some(k=>k.startsWith('count_')),'Unapproved count forms');
  assert.equal(entry.inflectionAutomaticCounting,false);
 }
 assert(active.statistics.active_forms_existing>=0);
});
