import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialLearning,changeTargetSound,learningPool,matchesSound,containsExcludedSound} from '../src/learning.ts';
import {defaultFilters,type Word} from '../src/model.ts';
test('diagnose hairbrush sound R classification in the published word library',()=>{
 const words=JSON.parse(readFileSync('public/library.json','utf8')) as Word[];
 const targets=words.filter(w=>/расч[её]ск/i.test(w.label));
 assert(targets.length>0,'Расчёска is missing from runtime');
 const selected=changeTargetSound({...initialLearning,mode:'differentiation'},'р',true);
 const eligible=new Set(learningPool(words,defaultFilters,selected).map(w=>w.id));
 for(const word of targets){
  console.log('HAIRBRUSH_SOUND_DIAGNOSTIC',JSON.stringify({
    id:word.id,label:word.label,phonemes:word.phonemes,sounds_r:word.sounds?.р,
    sounds_r_soft:word.sounds?.["р'"],weight:word.weight,categories:word.categories,
    approved_by_default:eligible.has(word.id),direct_matches:matchesSound(word,'р',selected),
    excluded:(selected.excludedSounds||[]).filter(s=>containsExcludedSound(word,s)),
    selected_positions:selected.rules.р||null
  }));
 }
});
