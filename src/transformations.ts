import type {Word} from './material-types.ts';
import {availableMaterial} from './material-policy.ts';
export type TransformationMode='small'|'many'|'reading';
export type TransformationPhase='question'|'transforming'|'answer';
export function transformationWords(words:Word[]){return availableMaterial(words,true)}
export function transformationResult(mode:TransformationMode,answer:boolean){return {kind:mode==='reading'&&!answer?'word':'image',scale:mode==='small'&&answer?.5:1,count:mode==='many'&&answer?5:1} as const}
