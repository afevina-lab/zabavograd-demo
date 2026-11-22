import type {Word} from './material-types.ts';
import {availableMaterial} from './material-policy.ts';
export type TransformationMode='small'|'many'|'reading';
export type TransformationPhase='question'|'transforming'|'answer';
export function transformationAnswer(word:Word,mode:TransformationMode):string|null{
 if(mode==='reading')return word.label;
 const form=mode==='small'?(word.verifiedForms?.diminutive||word.suggestedForms?.diminutive):(word.verifiedForms?.plural||word.suggestedForms?.plural);
 return typeof form==='string'&&form.trim()?form.trim():null;
}
export function transformationEligibility(word:Word,mode:TransformationMode,learningMode:string):'eligible'|'missing-image'|'unverified-form'|'missing-form-phonetics'{
 if(mode==='reading'&&word.materialKind)return 'eligible';
 if(!word.variants?.length)return 'missing-image';
 if(!transformationAnswer(word,mode))return 'unverified-form';
 if(mode!=='reading'&&!['any','lexical'].includes(learningMode))return 'missing-form-phonetics';
 return 'eligible';
}
export function transformationWords(words:Word[]){return availableMaterial(words,true)}
export function transformationResult(mode:TransformationMode,answer:boolean){return {kind:mode==='reading'&&!answer?'word':'image',scale:mode==='small'&&answer?.5:1,count:mode==='many'&&answer?7:1} as const}
