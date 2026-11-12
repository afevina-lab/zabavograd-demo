#!/usr/bin/env node
'use strict';

/** Runtime export from the universal V2 catalogue.
 * Never regenerate phonetics from spelling. Candidate G2P analyses are
 * included in automatic practice by author decision; preserve their draft
 * origin, and exclude any target phoneme whose source letter differs.
 */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {soundIndex,letterMap}=require('./sound-index.cjs');
const db=JSON.parse(fs.readFileSync('outputs/library-v2.json','utf8'));
let pending=null;
try{
 pending=JSON.parse(fs.readFileSync('outputs/library-v2-auto-analysis.json','utf8'));
}catch(e){if(e.code!=='ENOENT')throw e;}
const suggestions=new Map((pending?.entries||[]).map(row=>[row.id,row]));
const genericParents=new Map();
for(const r of db.relations||[]){
 if(r.type!=='is_a'||r.approval?.status==='verified_research_only')continue;
 const child=r.child||r.subject,parent=r.parent||r.object;
 if(!child?.id||!parent?.id)continue;
 if(!genericParents.has(child.id))genericParents.set(child.id,[]);
 genericParents.get(child.id).push({id:parent.id,lemma:parent.lemma});
}
function genusAncestors(id,visited=new Set()){
 if(visited.has(id))throw Error('Cyclic genus hierarchy '+id);
 const next=new Set(visited);next.add(id);
 const result=new Map();
 for(const p of genericParents.get(id)||[]){
  result.set(p.id,p);
  for(const ancestor of genusAncestors(p.id,next))result.set(ancestor.id,ancestor);
 }
 return [...result.values()];
}
const canReadImage=src=>typeof src==='string'&&src.startsWith('/assets/')&&
 !src.includes('..')&&fs.existsSync('public'+src);
function category(e){
 const all=e.categories.filter(c=>c.default_selection||e.lexical_eligible_by_default===false).map(c=>c.path);
 // Primary theme is selected for old game's single-topic UI; full paths are
 // retained as categories for the universal data model.
 const path=(all.sort((a,b)=>b.split('/').length-a.split('/').length||a.localeCompare(b,'ru'))[0]||'');
 const parts=path.split('/').filter(Boolean);
 const depth=['Животный мир','Растительный мир и грибы','Еда и напитки','Человек','Геометрия'].includes(parts[0])?2:1;
 return {
  topic:parts.slice(0,depth).join('/')||null,
  subcategory:parts.slice(depth).join('/')||null,
 };
}
const entries=db.entries.map(e=>{
 const editorial=e.phonetic_tags?.data||null;
 const draft=suggestions.get(e.id)?.phonetic||null;
 const fromEditorial=e.phonetic_tags?.status==='filled_with_explicit_extended_cases'&&
  Array.isArray(editorial?.sound_tokens)&&editorial.sound_tokens.length>0;
 const stored=e.phonetic_tags?.status==='automatic_candidate_needs_review'?
  (e.machine_analysis?.phonetic?.sound_tokens||editorial?.sound_tokens):null;
 const storedCandidate=!fromEditorial&&Array.isArray(stored)&&stored.length>0;
 const draftCandidate=!fromEditorial&&!storedCandidate&&
  draft?.status==='candidate_needs_review'&&Array.isArray(draft.sound_tokens);
 const candidate=storedCandidate||draftCandidate;
 const tokens=fromEditorial?editorial.sound_tokens:storedCandidate?stored:draftCandidate?draft.sound_tokens:[];
 assert(!tokens.includes('V'),'Old placeholder V present: '+e.lemma);
 const phoneticStatus=fromEditorial?'legacy_editorial':candidate?'candidate_needs_review':'pending';
 const rawSounds=tokens.length?soundIndex(e.lemma,tokens,{approved:fromEditorial||candidate}):{};
 const sounds=Object.fromEntries(Object.entries(rawSounds).map(([key,list])=>[key==='й'?"й'":key,list.map(o=>({...o,before:o.before==='й'?"й'":o.before,after:o.after==='й'?"й'":o.after}))]));
 const senses=e.illustrations?.senses||[];
 const variants=senses.flatMap(s=>s.variants||[]).filter(v=>canReadImage(v.src))
    .map(v=>({id:v.id,src:v.src,bounds:v.bounds}));
 const cat=category(e);
 return {
  id:e.id,label:e.lemma,meaning:e.meaning||null,
  categories:e.categories.filter(c=>(c.default_selection||e.lexical_eligible_by_default===false)&&!c.path.includes('/Вспомогательные')).map(c=>c.path),
  phonemes:tokens.length?tokens.map(t=>t==='й'?"й'":t):null,
  ...cat,position:editorial?.selection_position||'',
  type:editorial?.markova_type??(candidate?(draft?.markova_type_proposal??editorial?.markova_type_candidate??e.machine_analysis?.phonetic?.markova_type_candidate??null):null),
  opposition:editorial?.opposition_sounds_for_r||[],
  // Source IDs of duplicate public meanings remain addressable, but cannot
  // be drawn again as a second copy of the same meaning in an exercise.
  weight:e.same_lexical_meaning_as?0:(e.selection?.base_weight??0),
  taskWeights:e.selection?.task_overrides||null,
  generalization:e.generalization||null,
  kindOf:genericParents.get(e.id)||[], // direct typed semantic relations
  genusAncestors:genusAncestors(e.id), // inferred transitive genus membership for exercises
  images:e.illustrations?.planned_variants??null,
  variants,soundTokens:tokens,sounds,letters:letterMap(e.lemma),
  phoneticStatus,kind:e.kind,scope:e.selection?.scope||'general',
  partOfSpeech:e.part_of_speech||e.legacy_source?.raw?.part_of_speech||null,
  lexicalEligibleByDefault:!e.same_lexical_meaning_as&&e.lexical_eligible_by_default!==false,
  ...(e.same_lexical_meaning_as?{aliasOf:e.same_lexical_meaning_as}:{}),
 };
});
const words=[];
for(const word of entries){
 // Only one card per lexeme when it has one sense. Multiple illustrated
 // meanings of a historic shared-ID homonym are independent game cards.
 const v2=db.entries.find(e=>e.id===word.id);
 const senses=v2.illustrations?.senses||[];
 if(senses.length<=1){words.push(word);continue;}
 for(const s of senses){
  const own=(s.variants||[]).filter(v=>canReadImage(v.src)).map(v=>({id:v.id,src:v.src,bounds:v.bounds}));
  const oldNumber=Math.max(1,senses.length);
  words.push({...word,id:s.id,lemmaId:word.id,meaning:s.meaning||word.meaning,
    label:s.meaning||word.label,variants:own,weight:word.weight/oldNumber,
    topic:s.topic||word.topic,subcategory:s.subcategory||word.subcategory});
 }
}
assert.equal(new Set(words.map(w=>w.id)).size,words.length,'Duplicate runtime IDs');
assert(words.length>=db.entries.length,'Lost V2 records');
const arch=words.find(w=>w.label==='археолог');
if(arch&&arch.sounds?.к){
 assert(arch.sounds.к.every(o=>o.eligibility!=='eligible'),'К from Г cannot be used for automation');
}
// Only verified relations from the canonical V2 reach the game.
const {validateExport}=require('./semantic-review.cjs');
const publishedGraph=validateExport(db);
const output='public/library.json';
fs.mkdirSync('public',{recursive:true});
fs.writeFileSync('public/semantic-graph.json',JSON.stringify(publishedGraph)+'\n');
const grammarGame=require('./grammar-review.cjs').validateFrames(db);
fs.writeFileSync('public/grammar-frames.json',JSON.stringify(grammarGame)+'\n');
fs.writeFileSync(output,JSON.stringify(words)+'\n');
console.log(JSON.stringify({
 output,entries:db.entries.length,words:words.length,
 withSoundData:words.filter(x=>Object.keys(x.sounds).length).length,
 pending:words.filter(x=>x.phoneticStatus==='pending').length,
 candidate:words.filter(x=>x.phoneticStatus==='candidate_needs_review').length,
 genusLinks:db.relations.filter(r=>r.type==='is_a').length,
 oldEditorial:words.filter(x=>x.phoneticStatus==='legacy_editorial').length
},null,2));
