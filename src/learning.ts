import {contentKinds,effectivePatterns,matchesReading,materialCandidates,type ReadingOptions,type ContentKind,type Pattern} from './reading.ts';
import type {Word,Filters} from './model.ts';
import {pickWords} from './model.ts';
export const groups:Record<string,string[]>={'Ранний онтогенез':['м',"м'",'н',"н'",'п',"п'",'б',"б'",'т',"т'",'д',"д'",'к',"к'",'г',"г'",'х',"х'",'в',"в'",'ф',"ф'"],'Гласные':['а','о','у','ы','э','и'],'Свистящие':['с',"с'",'з',"з'",'ц'],'Шипящие':['ш','ж',"ч'","щ'"],'Соноры':["й'",'р',"р'",'л',"л'"]};
export const positions=['начало','середина','конец','после согласного','перед согласным','несколько вхождений'];
export type SoundOccurrence=import('./model.ts').SoundOccurrence;
export type SoundRule={allowAssimilation?:boolean;positions:string[];clusters:string[]|null;clusterDirections?:('before'|'after')[];atLeastTwo?:boolean;searchClusters?:'any'|'only'|'without'};
export type Learning={targetSlots?:Partial<Record<Pattern,number[]>>;reading?:Partial<ReadingOptions>;contentKinds?:ContentKind[];syllablePatterns?:Pattern[];categoryPaths?:string[];mode:'any'|'lexical'|'automation'|'differentiation'|'structure'|'search'|'reading';searchTarget?:'sound'|'letter';sounds:string[];rules:Record<string,SoundRule>;preferShared:boolean;excludedSounds?:string[];topics?:string[];subtopics?:Record<string,string[]>;additional?:{learning:Learning;filters:Filters}[];exclusions?:{learning:Learning;filters:Filters}[]};
export const initialLearning:Learning={mode:'any',sounds:[],rules:{},preferShared:false,excludedSounds:[]};
export const defaultSoundRule=(mode:Learning['mode']):SoundRule=>({
  positions:mode==='search'?['начало','середина','конец']:['начало','середина','конец','стечения'],
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
function matchesMaterial(w:Word,f:Filters,l:Learning):boolean {
 const structure=w.type===null?f.untyped:f.types.includes(w.type);
 const topics=l.topics??(f.topic?[f.topic]:[]);
 const lexical=l.categoryPaths!==undefined?(w.categories||[]).some(p=>l.categoryPaths!.includes(p)):topics.length>0&&topics.some(t=>w.topic===t&&(!l.subtopics?.[t]?.length||l.subtopics[t].includes(w.subcategory||'')));
 const contentAllowed=['reading','automation','differentiation'].includes(l.mode)?contentKinds(l).includes(w.materialKind==='syllables'?'syllables':'words')&&(!w.materialKind||effectivePatterns(l).includes(w.syllablePattern as Pattern)):!w.materialKind;
 const base=contentAllowed&&(l.mode==='reading'?matchesReading(w,l):l.mode==='any'?true:l.mode==='lexical'?lexical:l.mode==='structure'?structure:(w.materialKind==='syllables'||structure)&&l.sounds.some(s=>matchesSound(w,s,l)));
 const forbidden=(l.excludedSounds||[]).filter(s=>!l.sounds.includes(s));
 const soundAllowed=l.mode==='reading'||!forbidden.length||(!!w.phonemes&&!forbidden.some(s=>w.phonemes!.includes(s)));
 const allowed=base&&(!f.noOpposition||l.mode!=='automation'||l.sounds[0]!=='р'||w.opposition.length===0);
 return soundAllowed&&(allowed||(l.additional||[]).some(r=>matchesMaterial(w,r.filters,r.learning)))&&!(l.exclusions||[]).some(r=>matchesMaterial(w,r.filters,r.learning));
}
export function learningPool(words:Word[],f:Filters,l:Learning,automatic=true){const candidates=materialCandidates(words,l).filter(w=>(!automatic||w.weight>0)&&matchesMaterial(w,f,l));
 const seen=new Set<string>();return candidates.filter(w=>{const key=w.label.normalize('NFC').toLowerCase();if(seen.has(key))return false;seen.add(key);return true;});}
export function balancedPick(pool:Word[],count:number,l:Learning,rng=Math.random){if(!['automation','differentiation'].includes(l.mode)||l.sounds.length<2)return pickWords(pool,count,rng);const left=pool.filter(w=>w.weight>0).slice();if(left.length<count)throw Error('Недостаточно слов');const credits=Object.fromEntries(l.sounds.map(s=>[s,0]));const result:Word[]=[];while(result.length<count){const available=l.sounds.filter(s=>left.some(w=>matchesSound(w,s,l)));const min=Math.min(...available.map(s=>credits[s]));const targets=available.filter(s=>credits[s]===min);let candidates=left.filter(w=>targets.some(s=>matchesSound(w,s,l)));if(l.preferShared){const shared=candidates.filter(w=>l.sounds.filter(s=>matchesSound(w,s,l)).length>1);if(shared.length)candidates=shared;}const word=pickWords(candidates,1,rng)[0];result.push(word);left.splice(left.findIndex(w=>w.id===word.id),1);const covered=l.sounds.filter(s=>matchesSound(word,s,l));for(const s of covered)credits[s]+=1/covered.length;}return result;}
export function layoutRows(count:number,columns:number){const rows=Array(Math.ceil(count/columns)).fill(columns);let missing=rows.length*columns-count;for(let i=0;missing;i++,missing--)rows[i%2===0?rows.length-1-Math.floor(i/2):Math.floor(i/2)]--;return rows;}

export function defaultOpposition(sound:string):string[]{
 if(['р',"р'"].includes(sound))return ['р',"р'",'л',"л'","й'"].filter(s=>s!==sound);
 if(['л',"л'"].includes(sound))return ['р',"р'",'л',"л'"].filter(s=>s!==sound);
 if(groups['Свистящие'].includes(sound))return groups['Шипящие'];
 if(groups['Шипящие'].includes(sound))return groups['Свистящие'];
 return [];
}

/** Preserve user-selected forbidden phonemes when the automation target changes.
 * A sound can never be both a selected target and an active exclusion.
 */
export function changeTargetSound(l:Learning,sound:string,checked:boolean):Learning{
 const sounds=checked?(l.mode==='automation'?[sound]:[...new Set([...l.sounds,sound])]):l.sounds.filter(s=>s!==sound);
 const retainedExclusions=(l.excludedSounds||[]).filter(s=>!sounds.includes(s));
 return {...l,sounds,excludedSounds:l.mode==='automation'&&checked&&!retainedExclusions.length?defaultOpposition(sound):retainedExclusions};
}
