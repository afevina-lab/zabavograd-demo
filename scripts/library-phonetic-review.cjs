'use strict';
const assert=require('node:assert/strict');
const {soundIndex,VOWELS}=require('./sound-index.cjs');
const PROPOSAL_PATH='/phonetic_tags/review_proposal';
// Russian inventory, no spelling placeholders, hard/soft signs or artificial V.
// Keep the existing convention for intrinsically soft consonants.
const tokens=new Set([...VOWELS,...'бвгдзклмнпрстфх'.split('').flatMap(s=>[s,s+"'"]), 'ж','ш','ц','ч',"ч'",'щ',"щ'",'й',"й'"]);
const statuses=new Set(['filled_with_explicit_extended_cases','automatic_candidate_needs_review','pending_automatic_analysis']);
const keys=(x,allowed)=>{
 assert(x&&typeof x==='object'&&!Array.isArray(x),'Expected phonetic review object');
 assert.deepEqual(Object.keys(x).sort(),allowed.slice().sort(),'Unexpected phonetic review fields');
};
function stored(e){
 const h=e.phonetic_tags,d=h?.data;
 const v=h?.status==='filled_with_explicit_extended_cases'?d?.sound_tokens:(e.machine_analysis?.phonetic?.sound_tokens||d?.sound_tokens);
 return {status:h?.status??null,sound_tokens:Array.isArray(v)?v:[]};
}
function validateProposal(p){
 keys(p,['source','status','usable_for_generation','base','sound_tokens','stress_syllable','syllable_count','stressed_vowel','reason']);
 keys(p.base,['status','sound_tokens']);
 assert(statuses.has(p.base.status)&&Array.isArray(p.base.sound_tokens),'Invalid prior phonetic state');
 assert(p.source==='editorial_review'&&p.status==='suggested'&&p.usable_for_generation===false,'Review must remain unapproved');
 assert(Array.isArray(p.sound_tokens)&&p.sound_tokens.length>=1&&p.sound_tokens.length<=64&&p.sound_tokens.every(t=>tokens.has(t)),'Invalid phoneme tokens');
 const vowels=p.sound_tokens.filter(t=>VOWELS.has(t));
 assert(vowels.length>0&&p.syllable_count===vowels.length,'Syllable count mismatch');
 assert(Number.isInteger(p.stress_syllable)&&p.stress_syllable>=1&&p.stress_syllable<=vowels.length,'Invalid stress syllable');
 assert.equal(p.stressed_vowel,vowels[p.stress_syllable-1],'Stressed vowel mismatch');
 assert(typeof p.reason==='string'&&p.reason.trim()===p.reason&&p.reason.length>=5&&p.reason.length<=500,'Review reason required');
 return p;
}
function inspect(e,p){
 validateProposal(p);
 assert(e.kind==='word'&&/^[а-яё]+$/iu.test(e.lemma),'Pilot supports single Russian words only');
 assert.deepEqual(p.base,stored(e),'Stored phonetics changed; inspect the current entry');
 assert(!Object.hasOwn(e.phonetic_tags,'review_proposal'),'Review proposal already exists; resolve it before adding another');
 const before=soundIndex(e.lemma,p.base.sound_tokens,{approved:false});
 const after=soundIndex(e.lemma,p.sound_tokens,{approved:false});
 // Diagnostic only: alignment is not linguistic verification.
 const summarize=idx=>Object.fromEntries(Object.entries(idx).map(([s,rows])=>[s,rows.map(({index,letter,alignment,eligibility})=>({index,letter,alignment,eligibility}))]));
 return {id:e.id,lemma:e.lemma,before:summarize(before),after:summarize(after),status:'review_only_not_generation_eligible'};
}
module.exports={PROPOSAL_PATH,stored,validateProposal,inspect};
