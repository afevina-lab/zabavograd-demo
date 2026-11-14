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
