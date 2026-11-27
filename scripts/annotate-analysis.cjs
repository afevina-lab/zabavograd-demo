#!/usr/bin/env node
'use strict';
/** Annotate the standalone unapproved G2P review with source-letter alignment.
 * Uses exactly the same derived phoneme alignment as the game exporter.
 * The authoritative V2 catalogue is not changed.
 */
const fs=require('node:fs');
const {soundIndex}=require('./sound-index.cjs');
const source=process.argv[2]||'outputs/library-v2-auto-analysis.json';
if(process.argv.length>3)throw Error('Usage: annotate-analysis.cjs [draft.json]');
if(require('./library-source.cjs').resolveSource().mode==='modules'&&(!process.argv[2]||require('node:path').resolve(source)===require('node:path').resolve('outputs/library-v2-auto-analysis.json')))throw Error('Specify a separate draft file in modular mode');
const doc=JSON.parse(fs.readFileSync(source,'utf8'));
let mismatches=0,unclear=0,beforeSoft=0,matched=0;
for(const row of doc.entries){
 const ph=row.phonetic||{};
 if(!Array.isArray(ph.sound_tokens)||!Array.isArray(ph.occurrences))continue;
 const sourceMap=soundIndex(row.lemma,ph.sound_tokens,{approved:true});
 const byIndex=new Map(Object.values(sourceMap).flat().map(o=>[o.index,o]));
 for(const entry of ph.occurrences){
  const alignment=byIndex.get(entry.index);
  if(!alignment)continue;
  entry.letter=alignment.letter;
  entry.letter_index=alignment.letterIndex;
  entry.alignment=alignment.alignment;
  entry.cluster=alignment.cluster;
  entry.preceding_consonant=alignment.before;
  entry.following_consonant=alignment.after;
  // Author permits draft G2P in practice when spelling matches; keep draft provenance.
  entry.automation_status=alignment.eligibility;
  if(alignment.eligibility==='letter_sound_mismatch')mismatches++;
  else if(alignment.eligibility==='before_soft_consonant')beforeSoft++;
  else if(alignment.eligibility==='needs_review')unclear++;
  else matched++;
 }
}
doc.stats.orthography={
 letter_sound_mismatches:mismatches,before_soft_consonant:beforeSoft,ambiguous_alignment:unclear,
 matches_allowed_for_automatic_practice:matched,
};
fs.writeFileSync(source,JSON.stringify(doc,null,2)+'\n');
console.log(JSON.stringify(doc.stats.orthography));
