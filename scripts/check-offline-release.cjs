#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const index=read('index.html');
assert(!/<script[^>]+src=["']https?:\/\//i.test(index),'External runtime script found');
assert(!/<link[^>]+href=["']https?:\/\//i.test(index),'External runtime stylesheet found');
const words=JSON.parse(read('library.json'));
assert(Array.isArray(words)&&words.length>0,'Missing game library');
const ids=new Set(words.map(w=>w.id));
assert(ids.size===words.length,'Duplicate public library IDs');
const semanticIds=new Set(words.flatMap(w=>w.lemmaId?[w.id,w.lemmaId]:[w.id]));
const assets=path.join(root,'assets');
function jsFiles(dir){if(!fs.existsSync(dir))return [];return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?jsFiles(path.join(dir,e.name)):e.isFile()&&e.name.endsWith('.js')?[path.join(dir,e.name)]:[]);}
const forbidden=/https?:\/\/(?:www\.)?(?:wikidata\.org|ruwordnet\.ru|framebank[^/'" ]*|api\.openai\.com)[^\s"'<>]*/gi;
const dependencies=/\b(?:pymorphy3|ruwordnet|framebank|constructicon|g2p[-_]?runtime)\b/i;
for(const file of jsFiles(assets)){
 const s=fs.readFileSync(file,'utf8');
 assert(!forbidden.test(s),'Forbidden external language URL in '+file);
 assert(!dependencies.test(s),'External linguistic dependency referenced in '+file);
 forbidden.lastIndex=0;
}
let graphCount=0;
const graphFile=path.join(root,'semantic-graph.json');
if(fs.existsSync(graphFile)){
 const graph=JSON.parse(fs.readFileSync(graphFile,'utf8'));
 assert.equal(graph.schema,'semantic_game_graph_v1');
 assert(Array.isArray(graph.relations)&&Array.isArray(graph.families),'Invalid graph format');
 const seen=new Set();
 for(const r of graph.relations){
  assert(typeof r.id==='string'&&r.id,'Missing relation ID');
  assert(!seen.has(r.id),'Duplicated relation ID');seen.add(r.id);
  assert(semanticIds.has(r.subject_id)&&semanticIds.has(r.object_id),'Unknown public sense ID in semantic graph');
  assert(r.subject_id!==r.object_id,'Self relation in semantic graph');
  assert(typeof r.type==='string'&&typeof r.inverse_type==='string','Missing typed directions');
  assert(['zabavograd_editorial','wikidata'].includes(r.provenance?.source),'Unreviewed source in game');
  if(r.provenance.source==='wikidata')assert.equal(r.provenance.license,'CC0');
  assert(!['suggested','candidate_needs_review'].includes(r.status),'Draft relation leaked');
 }
 if(graph.by_entry){
  assert(typeof graph.by_entry==='object'&&!Array.isArray(graph.by_entry),'Invalid two-way index');
  const relationIds=new Set([...graph.relations,...graph.families].map(x=>x.id));
  for(const [id,items] of Object.entries(graph.by_entry)){
   assert(semanticIds.has(id),'Unpublished source in graph index '+id);
   assert(Array.isArray(items),'Invalid graph index list');
   for(const item of items){
    assert(semanticIds.has(item.target_id),'Unpublished target in graph index');
    assert(relationIds.has(item.relation_id),'Unknown relation in graph index');
   }
  }
  for(const rel of graph.relations){
   const outgoing=(graph.by_entry[rel.subject_id]||[]).some(x=>
     x.relation_id===rel.id&&x.target_id===rel.object_id&&x.type===rel.type&&x.direction==='forward');
   const incoming=(graph.by_entry[rel.object_id]||[]).some(x=>
     x.relation_id===rel.id&&x.target_id===rel.subject_id&&x.type===rel.inverse_type&&x.direction==='inverse');
   assert(outgoing&&incoming,'Missing bidirectional semantic relation '+rel.id);
  }
 }
 graphCount=graph.relations.length;
}
let frameCount=0;
const grammarFile=path.join(root,'grammar-frames.json');
if(fs.existsSync(grammarFile)){
 const grammar=JSON.parse(fs.readFileSync(grammarFile,'utf8'));
 assert.equal(grammar.schema,'speech_frames_game_v1');
 assert(Array.isArray(grammar.frames),'Missing grammar frames');
 for(const frame of grammar.frames){
  assert(semanticIds.has(frame.verb_id),'Unknown verb ID in public grammar frame');
  assert(Array.isArray(frame.roles)&&frame.roles.length,'Missing grammar roles');
  for(const role of frame.roles){
   assert(['nom','gen','dat','acc','ins','prep','none'].includes(role.case),'Invalid published case');
   assert(Array.isArray(role.allowed_entry_ids)&&role.allowed_entry_ids.every(id=>semanticIds.has(id)),'Unpublished role participant ID');
  }
  assert(!JSON.stringify(frame).includes('source_record_id'),'External corpus record leaked into public grammar');
 }
 frameCount=grammar.frames.length;
}
console.log(JSON.stringify({ok:true,public_words:words.length,semantic_relations:graphCount,grammar_frames:frameCount,js_files_checked:jsFiles(assets).length,external_linguistic_runtime_dependencies:false},null,2));