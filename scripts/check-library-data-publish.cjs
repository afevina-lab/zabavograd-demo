'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=process.argv[2],read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const previous=read(path.join(dir,'library.json')),next=read('public/library.json');
const ids=new Map(next.map(w=>[w.id,w]));assert.equal(ids.size,next.length);
for(const w of previous){
 const n=ids.get(w.id);assert(n,'Old runtime word missing '+w.id);
 for(const k of ['label','meaning','weight','categories','variants'])assert.deepEqual(n[k],w[k],'Library-only publication cannot change '+w.id+' '+k);
}
for(const w of next)for(const v of w.variants||[]){assert(v.src.startsWith('/assets/')&&!v.src.includes('..'));assert(fs.existsSync(path.join(dir,v.src)),'Asset not published '+v.src);}
const oldGraph=read(path.join(dir,'semantic-graph.json')),newGraph=read('public/semantic-graph.json'),map=new Map(newGraph.relations.map(r=>[r.id,r]));
for(const r of oldGraph.relations)assert.deepEqual(map.get(r.id),r,'Existing game relation changed '+r.id);
assert.deepEqual(oldGraph.families,newGraph.families);
const db=require('./library-source.cjs').readSource().db;
const all=db.entries.flatMap(e=>e.external_linguistic_proposals||[]);
const countSource=s=>all.filter(p=>p.source===s).length;
const countForms=rows=>rows.reduce((n,w)=>n+Object.keys(w.inflections||{}).length,0);
console.log(JSON.stringify({game_words:next.length,active_graph_relations:newGraph.relations.length,new_game_relations:newGraph.relations.length-oldGraph.relations.length,new_game_inflections:countForms(next)-countForms(previous),new_words_with_inflections:next.filter(w=>Object.keys(w.inflections||{}).length&&!Object.keys(previous.find(p=>p.id===w.id)?.inflections||{}).length).length,new_words_with_phonetics:next.filter(w=>w.phonemes?.length&&!previous.find(p=>p.id===w.id)?.phonemes?.length).length,framebank_manual:countSource('framebank'),ruwordnet_manual:countSource('ruwordnet'),manual_entries:db.entries.filter(e=>e.external_linguistic_proposals?.length).length,ambiguous:all.filter(p=>p.match_status==='ambiguous_sense_requires_manual_review').length},null,2));
