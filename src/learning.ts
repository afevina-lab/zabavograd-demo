import {mathMaterial,type MathSettings} from './math-material.ts';
import {contentKinds,effectivePatterns,matchesReading,materialCandidates,type ReadingOptions,type ContentKind,type Pattern} from './reading.ts';
import type {Word,Filters,SoundOccurrence as MaterialSoundOccurrence} from './material-types.ts';
import {pickWords} from './material-selection.ts';
import {canSelectAutomatically,isCanonicalMaterial,materialWeight} from './material-policy.ts';
export const groups:Record<string,string[]>={'Ранний онтогенез':['м',"м'",'н',"н'",'п',"п'",'б',"б'",'т',"т'",'д',"д'",'к',"к'",'г',"г'",'х',"х'",'в',"в'",'ф',"ф'"],'Гласные':['а','о','у','ы','э','и'],'Свистящие':['с',"с'",'з',"з'",'ц'],'Шипящие':['ш','ж',"ч'","щ'"],'Соноры':["й'",'р',"р'",'л',"л'"]};
export const positions=['начало','середина','конец','после согласного','перед согласным','несколько вхождений'];
export type SoundOccurrence=MaterialSoundOccurrence;
export type SoundRule={allowAssimilation?:boolean;positions:string[];clusters:string[]|null;clusterDirections?:('before'|'after')[];atLeastTwo?:boolean;excludeMultiple?:boolean;searchClusters?:'any'|'only'|'without'};
export type Learning={math?:Partial<MathSettings>;targetSlots?:Partial<Record<Pattern,number[]>>;reading?:Partial<ReadingOptions>;contentKinds?:ContentKind[];syllablePatterns?:Pattern[];categoryPaths?:string[];mode:'any'|'lexical'|'automation'|'differentiation'|'structure'|'search'|'reading'|'math';searchTarget?:'sound'|'letter';sounds:string[];rules:Record<string,SoundRule>;preferShared:boolean;excludedSounds?:string[];exclusionsEdited?:boolean;topics?:string[];subtopics?:Record<string,string[]>;additional?:{learning:Learning;filters:Filters}[];exclusions?:{learning:Learning;filters:Filters}[];selectionMode?:'automatic'|'approved';approvedWordIds?:string[]};
export const initialLearning:Learning={mode:'any',sounds:[],rules:{},preferShared:false,excludedSounds:[]};
export const defaultSoundRule=(mode:Learning['mode']):SoundRule=>({
  positions:mode==='search'?['начало','середина','конец']:['начало','середина','конец','после согласного','перед согласным'],
  clusters:null,clusterDirections:['before','after'],atLeastTwo:false,searchClusters:'any'
});
const hasCluster=(o:SoundOccurrence)=>Boolean(o.before||o.after);
const validForAutomation=(o:SoundOccurrence)=>(o.eligibility===undefined||o.eligibility==='eligible');
function matchesCluster(o:SoundOccurrence,sound:string,rule:SoundRule):boolean {
  if(!hasCluster(o))return false;
  const direction=rule.clusterDirections||['before','after'];
  const applicable=(o.before && direction.includes('before')?[(o.before+sound)]:[])
    .concat(o.after && direction.includes('after')?[sound+o.after]:[]);
  if(applicable.length===0)return false;
  return rule.clusters===null||applicable.some(x=>rule.clusters!.includes(x));
}
export function matchesSound(w:Word,s:string,learning:Learning):boolean{
  const searching=learning.mode==='search';
  const rule=learning.rules[s]||defaultSoundRule(learning.mode);
  if(searching&&learning.searchTarget==='letter'){
    const letters=w.letters?.[s]||[];
    if(rule.atLeastTwo&&letters.length<2)return false;
    return letters.some(o=>rule.positions.includes(o.position||''));
  }
  const all=w.sounds?.[s]||[];
  const occurrences=searching?all:all.filter(o=>validForAutomation(o)||(rule.allowAssimilation&&o.eligibility==='before_soft_consonant'));
  if(rule.atLeastTwo&&occurrences.length<2)return false;
 if(rule.excludeMultiple&&all.length>=2)return false;
  if(searching){
    // Position is independent of consonant clusters for pure sound search.
    return occurrences.some(o=>{
      if(!rule.positions.includes(o.position))return false;
      if(rule.searchClusters==='only'&&!hasCluster(o))return false;
      if(rule.searchClusters==='without'&&hasCluster(o))return false;
      if(rule.searchClusters==='only'&&!matchesCluster(o,s,rule))return false;
      return true;
    });
  }
  return occurrences.some(o=>{
    const cluster=hasCluster(o);
    // Automation: ordinary beginning/middle/end only for isolated sounds.
    // Any cluster (including at word boundaries) belongs ONLY to "стечения".
    if(!cluster)return rule.positions.includes(o.position);
    const selected=rule.positions.includes('стечения')||
      (rule.positions.includes('после согласного')&&Boolean(o.before))||
      (rule.positions.includes('перед согласным')&&Boolean(o.after));
    return selected&&matchesCluster(o,s,rule);
  });
}
export function containsExcludedSound(w:Word,sound:string):boolean{
 if(w.phonemes?.includes(sound)||(w.sounds?.[sound]?.length||0)>0)return true;
 // Contextual softening is not permission to bypass exclusion of the underlying hard sound.
 return !sound.endsWith("'")&&Boolean(w.sounds?.[sound+"'"]?.some(o=>o.eligibility==='before_soft_consonant'));
}
function matchesMaterial(w:Word,f:Filters,l:Learning):boolean {
 const structure=w.type===null?f.untyped:f.types.includes(w.type);
 const topics=l.topics??(f.topic?[f.topic]:[]);
 const lexical=l.categoryPaths!==undefined?(w.categories||[]).some(p=>l.categoryPaths!.includes(p)):topics.length>0&&topics.some(t=>w.topic===t&&(!l.subtopics?.[t]?.length||l.subtopics[t].includes(w.subcategory||'')));
 const contentAllowed=['reading','automation','differentiation'].includes(l.mode)?contentKinds(l).includes(w.materialKind||'words')&&(w.materialKind!=='syllables'||effectivePatterns(l).includes(w.syllablePattern as Pattern)):!w.materialKind;
 const base=contentAllowed&&(l.mode==='reading'?matchesReading(w,l)&&(!!w.materialKind||!l.sounds.length||l.sounds.some(s=>matchesSound(w,s,l))):l.mode==='any'?true:l.mode==='lexical'?lexical:l.mode==='structure'?structure:(w.materialKind==='syllables'||structure)&&l.sounds.some(s=>matchesSound(w,s,l)));
 const forbidden=(l.excludedSounds||[]).filter(s=>!l.sounds.includes(s));
 const soundAllowed=l.mode==='reading'&&!l.sounds.length||!forbidden.length||(!!w.phonemes&&!forbidden.some(s=>containsExcludedSound(w,s)));
 const allowed=base&&(!f.noOpposition||l.mode!=='automation'||l.sounds[0]!=='р'||w.opposition.length===0);
 return soundAllowed&&(allowed||(l.additional||[]).some(r=>matchesMaterial(w,r.filters,r.learning)))&&!(l.exclusions||[]).some(r=>matchesMaterial(w,r.filters,r.learning));
}
export function learningPool(words:Word[],f:Filters,l:Learning,automatic=true){if(l.mode==='math')return mathMaterial(l.math);const aliases=new Map(words.filter(w=>w.aliasOf).map(w=>[w.id,w.aliasOf!]));const approved=l.selectionMode==='approved'?new Set((l.approvedWordIds||[]).map(id=>aliases.get(id)??id)):null;const candidates=materialCandidates(words,l).filter(w=>isCanonicalMaterial(w)&&matchesMaterial(w,f,l)&&(!approved||approved.has(w.id))).map(w=>l.mode==='lexical'?{...w,weight:materialWeight(w,true)}:w).filter(w=>!automatic||canSelectAutomatically(w)||Boolean(approved?.has(w.id)));
 const seen=new Set<string>();return candidates.filter(w=>{const key=w.id;if(seen.has(key))return false;seen.add(key);return true;});}
/** Keep words and generated syllables near 50:50 whenever both kinds are enabled.
 * Reallocate only when one eligible kind is genuinely too small; do not repeat IDs.
 */
export function balancedPick(pool:Word[],count:number,l:Learning,rng=Math.random):Word[]{
 if(l.mode==='reading'&&contentKinds(l).includes('letters')){const groups=contentKinds(l).map(kind=>pool.filter(w=>(w.materialKind||'words')===kind));const selected:Word[]=[];while(selected.length<count){let added=false;for(const group of groups){if(selected.length>=count)break;const remaining=group.filter(w=>!selected.some(s=>s.id===w.id));if(remaining.length){selected.push(pickWords(remaining,1,rng)[0]);added=true;}}if(!added)throw Error('Недостаточно материала');}return selected;}
 if(contentKinds(l).includes('words')&&contentKinds(l).includes('syllables')){
  const words=pool.filter(w=>w.materialKind!=='syllables');
  const syllables=pool.filter(w=>w.materialKind==='syllables');
  const syllableCount=Math.min(syllables.length,Math.max(count-words.length,Math.round(count/2)));
  if(syllableCount>0&&syllableCount<count){
   const selected=[...soundBalancedPick(words,count-syllableCount,l,rng),...soundBalancedPick(syllables,syllableCount,l,rng)];
   for(let i=selected.length-1;i>0;i--){const j=Math.min(i,Math.floor(rng()*(i+1)));[selected[i],selected[j]]=[selected[j],selected[i]];}
   return selected;
  }
 }
 return soundBalancedPick(pool,count,l,rng);
}
function soundBalancedPick(pool:Word[],count:number,l:Learning,rng=Math.random){if(!['automation','differentiation'].includes(l.mode)||l.sounds.length<2)return pickWords(pool,count,rng);const left=(l.selectionMode==='approved'?pool:pool.filter(canSelectAutomatically)).slice();if(left.length<count)throw Error('Недостаточно слов');const credits=Object.fromEntries(l.sounds.map(s=>[s,0]));const result:Word[]=[];while(result.length<count){const available=l.sounds.filter(s=>left.some(w=>matchesSound(w,s,l)));const min=Math.min(...available.map(s=>credits[s]));const targets=available.filter(s=>credits[s]===min);let candidates=left.filter(w=>targets.some(s=>matchesSound(w,s,l)));if(l.preferShared){const shared=candidates.filter(w=>l.sounds.filter(s=>matchesSound(w,s,l)).length>1);if(shared.length)candidates=shared;}const word=pickWords(candidates,1,rng)[0];result.push(word);left.splice(left.findIndex(w=>w.id===word.id),1);const covered=l.sounds.filter(s=>matchesSound(word,s,l));for(const s of covered)credits[s]+=1/covered.length;}return result;}
export function layoutRows(count:number,columns:number){const rows=Array(Math.ceil(count/columns)).fill(columns);let missing=rows.length*columns-count;for(let i=0;missing;i++,missing--)rows[i%2===0?rows.length-1-Math.floor(i/2):Math.floor(i/2)]--;return rows;}

/** Typical *possible* phonemic confusions, not a diagnosis for a particular child.
 * Keep this central: the same suggestions serve selection and Conveyor distractors.
 * Sources: Russian Ministry of Education methodological guide 07-2627 (2020),
 * and published logopedic differential-pair guidance (see docs/sound-confusions.md).
 */
const soundConfusions:Record<string,string[]>={
 'а':['о'],'о':['а','у'],'у':['о'],'ы':['и'],'и':['ы'],
 'м':["м'",'н'],"м'":['м',"н'"],'н':["н'",'м'],"н'":['н',"м'"],
 'п':["п'",'б'],"п'":['п',"б'"],'б':["б'",'п'],"б'":['б',"п'"],
 'т':["т'",'д','ц'],"т'":['т',"д'","ч'"],
 'д':["д'",'т'],"д'":['д',"т'"],
 'к':["к'",'г','х'],"к'":['к',"г'","х'"],
 'г':["г'",'к'],"г'":['г',"к'"],
 'х':["х'",'к'],"х'":['х',"к'"],
 'в':["в'",'ф','л'],"в'":['в',"ф'","л'"],
 'ф':["ф'",'в','с'],"ф'":['ф',"в'","с'"],
 'с':["с'",'з','ш','ц',"щ'",'ф'],
 "с'":['с',"з'",'ц',"щ'","ч'","ф'"],
 'з':["з'",'с','ж'],
 "з'":['з',"с'","ж"],
 'ц':['с',"с'","ч'",'т'],
 'ш':['с','ж',"щ'","ч'"],
 'ж':['з','ш',"щ'"],
 "ч'":["т'","щ'",'ц',"с'"],
 "щ'":["с'",'ш',"ч'"],
 "й'":["л'",'р',"р'"],
 'р':["р'",'л',"л'","й'"],
 "р'":['р','л',"л'","й'"],
 'л':["л'",'р',"р'",'в',"в'","й'"],
 "л'":['л','р',"р'","й'","в'"]
};
// Suggestions for automatic selection, not a universal diagnosis. Teachers can
// edit any exclusion without having it silently restored.
const lateOntogenesisSounds=[
 ...groups['Свистящие'],...groups['Шипящие'],...groups['Соноры']
];
const additionalConfusions:Record<string,string[]>={
 'с':['ж'], "с'":['ж'],
 'з':['ш',"ч'","щ'"], "з'":['ш',"ч'","щ'"]
};
/** Similar sounds used for close Conveyor distractors. Ontogenetic exclusions
 * are deliberately NOT included: an unmastered sound need not be confusable.
 */
export function typicalConfusions(sound:string):string[]{
 const pairs=[...(soundConfusions[sound]||[]),...(additionalConfusions[sound]||[])];
 if(groups['Шипящие'].includes(sound))pairs.push(...groups['Свистящие']);
 return [...new Set(pairs)].filter(s=>s!==sound);
}
export function defaultOpposition(sound:string):string[]{
 const suggested=typicalConfusions(sound);
 if(groups['Свистящие'].includes(sound))suggested.push('р',"р'",'л');
 // Early: vowels and consonants in the early group. Late: sibilants,
 // affricates and sonorants, including Й in the project-specific grouping.
 if(groups['Ранний онтогенез'].includes(sound)||groups['Гласные'].includes(sound)){
  suggested.push(...lateOntogenesisSounds);
 }
 return [...new Set(suggested)].filter(s=>s!==sound);
}

/** Suggested exclusions follow the selected target(s) until the teacher edits them.
 * Explicit exclusions must not be silently restored after a teacher unchecks them.
 */
export function changeTargetSound(l:Learning,sound:string,checked:boolean):Learning{
 const sounds=checked?(l.mode==='automation'?[sound]:[...new Set([...l.sounds,sound])]):l.sounds.filter(s=>s!==sound);
 // Undefined means legacy state: explicit existing exclusions are manual.
 // False marks recommendations computed by the picker, not user edits.
 const manual=l.exclusionsEdited===true||(l.exclusionsEdited===undefined&&Boolean(l.excludedSounds?.length));
 const excludedSounds=(manual?(l.excludedSounds||[]):[...new Set(sounds.flatMap(defaultOpposition))]).filter(s=>!sounds.includes(s));
 return {...l,sounds,excludedSounds,exclusionsEdited:manual};
}
export function confirmSoundSelection(draft:Learning):Learning{
 const sounds=[...new Set(draft.sounds)];
 const clean={...draft,sounds,rules:Object.fromEntries(Object.entries(draft.rules).filter(([sound])=>sounds.includes(sound))),excludedSounds:(draft.excludedSounds||[]).filter(sound=>!sounds.includes(sound))};
 return sounds.length===1?changeTargetSound({...clean,mode:'automation'},sounds[0],true):{...clean,mode:sounds.length>1?'differentiation':'automation'};
}
