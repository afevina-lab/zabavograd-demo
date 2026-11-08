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
  assert(ids.has(r.subject_id)&&ids.has(r.object_id),'Unknown public sense ID in semantic graph');
  assert(r.subject_id!==r.object_id,'Self relation in semantic graph');
  assert(typeof r.type==='string'&&typeof r.inverse_type==='string','Missing typed directions');
  assert(['zabavograd_editorial','wikidata'].includes(r.provenance?.source),'Unreviewed source in game');
  if(r.provenance.source==='wikidata')assert.equal(r.provenance.license,'CC0');
  assert(!['suggested','candidate_needs_review'].includes(r.status),'Draft relation leaked');
 }
 graphCount=graph.relations.length;
}
console.log(JSON.stringify({ok:true,public_words:words.length,semantic_relations:graphCount,js_files_checked:jsFiles(assets).length,external_linguistic_runtime_dependencies:false},null,2));