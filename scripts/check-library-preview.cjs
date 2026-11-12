#!/usr/bin/env node
'use strict';
/* Prevent stale previews from drifting away from the one GitHub master file. */
const fs=require('node:fs');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const source=fs.readFileSync('outputs/library-v2.json');
const db=JSON.parse(source.toString('utf8'));
const html=fs.readFileSync('outputs/Библиотека.html','utf8');
const fingerprint=crypto.createHash('sha256').update(source).digest('hex');
assert(html.includes('<meta name="library-source-sha256" content="'+fingerprint+'">'),
 'Preview is stale relative to outputs/library-v2.json — regenerate it');
const m=html.match(/<script id="library-data" type="application\/json">([\s\S]*?)<\/script>/);
assert(m,'No embedded preview data');
const snapshot=JSON.parse(m[1]);
assert.equal(snapshot.rows.length,db.entries.length,'Preview has missing word records');
assert.equal(new Set(snapshot.rows.map(e=>e.id)).size,db.entries.length,'Preview has duplicate records');
const entries=new Map(db.entries.map(e=>[e.id,e]));
for(const row of snapshot.rows){
 const sourceRow=entries.get(row.id);
 assert(sourceRow,'Orphan preview row '+row.id);
 assert.equal(row.lemma,sourceRow.lemma,'Mismatched preview word '+row.id);
 assert.equal(row.weight,sourceRow.selection.base_weight,'Outdated preview weight '+row.id);
 assert.deepEqual(row.categories,sourceRow.categories,'Outdated preview categories '+row.id);
}
const families=db.relations.filter(r=>r.type!=='is_a'&&!r.subject&&!r.object);
const genera=db.relations.filter(r=>r.type==='is_a'&&r.child&&r.parent);
const semantics=db.relations.filter(r=>r.subject&&r.object);
assert.equal(snapshot.semantic_relations?.length,semantics.length,'Preview lost reviewed semantic links');
assert.equal(snapshot.relations.length,families.length,'Preview lost animal-family relationships');
assert.equal(snapshot.genus_relations?.length,genera.length,'Preview lost genus is-a relationships');
const seen=new Set((snapshot.genus_relations||[]).map(r=>r.child_id+'|'+r.parent_id));
for(const r of genera)assert(seen.has(r.child.id+'|'+r.parent.id),'Preview lost genus link '+r.id);
console.log('PASS preview tied to master source, SHA-256:',fingerprint.slice(0,12),'words:',db.entries.length);
