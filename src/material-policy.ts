import type {Word} from './material-types.ts';

/** Availability is independent of teaching eligibility and random selection weight. */
export function hasMaterial(word:Word,pictures=false):boolean {
 return !pictures||Boolean(word.variants?.length);
}
export function canSelectAutomatically(word:Word):boolean {
 return Number.isFinite(word.weight)&&word.weight>0;
}
export function materialWeight(word:Word,lexical=false):number {
 return lexical?(word.taskWeights?.lexical_topic??word.weight):word.weight;
}
export function availableMaterial(words:Word[],pictures=false,automatic=true):Word[] {
 return words.filter(word=>hasMaterial(word,pictures)&&(!automatic||canSelectAutomatically(word)));
}
/** A word-face matching game needs distinguishable captions; the library keeps every sense. */
export function distinctCaptions(words:Word[]):Word[]{
 const seen=new Set<string>();
 return words.filter(word=>{const caption=word.label.normalize('NFC').toLowerCase();if(seen.has(caption))return false;seen.add(caption);return true;});
}
