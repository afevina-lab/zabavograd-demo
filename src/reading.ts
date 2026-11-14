import type {Word,MemoryMode} from './material-types.ts';
import type {Learning} from './learning.ts';

export const vowels=[...'аеёиоуыэюя'];
export const consonants=[...'бвгджзйклмнпрстфхцчшщ'];
export const alphabet=[...'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'];
export const syllablePatterns={
 CV:'Прямые: согласный + гласный',
 VC:'Обратные: гласный + согласный',
 VCV:'Гласный + согласный + гласный',
 CCV:'Согласный + согласный + гласный',
 VCC:'Гласный + согласный + согласный',
 CVC:'Согласный + гласный + согласный'
} as const;
export type Pattern=keyof typeof syllablePatterns;
export type ContentKind='words'|'syllables';
export type ReadingOptions={available:string[];required:string[];min:number;max:number;excludeClusters:boolean};
export const textOf=(s:string)=>s.normalize('NFC').toLocaleLowerCase('ru').replace(/\u0301/g,'');
export const wordLength=(s:string)=>[...textOf(s)].length;
export const maxWordLength=(words:Word[])=>Math.max(3,...words.filter(w=>/^[а-яё]+$/i.test(textOf(w.label))).map(w=>wordLength(w.label)));
export const readingOptions=(l:Learning):ReadingOptions=>({available:alphabet,required:[],min:3,max:Infinity,excludeClusters:false,...l.reading});
export const contentKinds=(l:Learning):ContentKind[]=>l.contentKinds??['words'];
export const effectivePatterns=(l:Learning):Pattern[]=>(l.syllablePatterns??['CV','VC']).filter(p=>!(l.reading?.excludeClusters&&['CCV','VCC'].includes(p)));
export const hasClusters=(s:string)=>new RegExp('['+consonants.join('')+']{2}').test(textOf(s));
export function matchesReading(w:Word,l:Learning){
 const r=readingOptions(l),text=textOf(w.label),letters=[...text];
 return /^[а-яё]+$/.test(text)&&letters.every(c=>r.available.includes(c))&&
 r.required.every(c=>letters.includes(c))&&(!r.excludeClusters||!hasClusters(text))&&
 (w.materialKind==='syllables'||(letters.length>=r.min&&letters.length<=r.max));
}
export function includesReading(l:Learning):boolean{return l.mode==='reading'||(l.additional||[]).some(r=>includesReading(r.learning));}
export function includesSyllables(l:Learning):boolean{return (['reading','automation','differentiation'].includes(l.mode)&&contentKinds(l).includes('syllables'))||(l.additional||[]).some(r=>includesSyllables(r.learning));}
export function compatibleMemoryMode(mode:MemoryMode,l:Learning):MemoryMode{
 return includesSyllables(l)?'word-word':includesReading(l)&&mode==='image-image'?'word-word':mode;
}

// These are pronounced teaching combinations, not lexical phonetic analyses.
// Generate speech-task combinations conservatively: no iotated vowels, final
// voiced obstruents, assimilation clusters or hard/soft spelling exceptions.
function combinationSounds(text:string):Pick<Word,'phonemes'|'sounds'>|null{
 if(/[еяёю]/.test(text)||/[жшц][и]|[чщй][ыэ]|[гкх][ы]/.test(text))return null;
 const chars=[...text];
 const phonemes=chars.map((c,i)=>consonants.includes(c)?
  (['ч','щ','й'].includes(c)||chars[i+1]==='и'&&!['ж','ш','ц'].includes(c)?c+"'":c):c);
 const voiced='бвгджз',voiceless='пфктшсцчщх';
 if(voiced.includes(chars.at(-1)!))return null;
 for(let i=0;i<chars.length-1;i++){
  const a=chars[i],b=chars[i+1];
  if(consonants.includes(a)&&consonants.includes(b)&&
    ((voiced.includes(a)&&voiceless.includes(b))||(voiceless.includes(a)&&voiced.replace('в','').includes(b))))return null;
 }
 const sounds:NonNullable<Word['sounds']>={};
 phonemes.forEach((s,i)=>{
  const c=chars[i],before=i>0&&consonants.includes(chars[i-1])?phonemes[i-1]:null;
  const after=i<chars.length-1&&consonants.includes(chars[i+1])?phonemes[i+1]:null;
  const eligible=!(consonants.includes(c)&&after?.endsWith("'"));
  (sounds[s]??=[]).push({position:i===0?'начало':i===chars.length-1?'конец':'середина',before:consonants.includes(c)?before:null,after:consonants.includes(c)?after:null,index:i,letter:c,letterIndex:i,eligibility:eligible?'eligible':'before_soft_consonant'});
 });
 return {phonemes,sounds};
}
export function generateCombinations(l:Learning):Word[]{
 if(!['reading','automation','differentiation'].includes(l.mode)||!contentKinds(l).includes('syllables'))return [];
 const allowed=l.mode==='reading'?readingOptions(l).available:alphabet;
 const pools={C:consonants.filter(c=>allowed.includes(c)),V:vowels.filter(c=>allowed.includes(c))};
 const result:Word[]=[];
 for(const pattern of effectivePatterns(l)){
  let texts=[''];
  for(const slot of pattern as Iterable<'C'|'V'>)texts=texts.flatMap(prefix=>pools[slot].map(c=>prefix+c));
  for(const label of texts){
   const phonetics=l.mode==='reading'?{}:combinationSounds(label);
   if(phonetics===null)continue;
   const w:Word={id:'combination:'+label,label,materialKind:'syllables',syllablePattern:pattern,topic:null,subcategory:null,position:'',type:null,opposition:[],weight:100,images:0,...phonetics};
   if(l.mode!=='reading'&&l.targetSlots?.[pattern]!==undefined){
    const slots=l.targetSlots[pattern]!;
    if(!slots.some(i=>l.sounds.includes(w.phonemes?.[i]||'')))continue;
   }
   if(l.mode!=='reading'||matchesReading(w,l))result.push(w);
  }
 }
 return result;
}
export function materialCandidates(words:Word[],l:Learning):Word[]{
 const generated=generateCombinations(l).concat((l.additional||[]).flatMap(r=>materialCandidates([],r.learning)));
 // A spelled word and the same generated combination are one visible answer.
 const unique=new Map<string,Word>();
 for(const w of generated)unique.set(w.label,w);
 return [...words,...unique.values()];
}
