import type {Word} from './model.ts';
export type TransformationMode='small'|'many'|'reading';
export type TransformationPhase='question'|'transforming'|'answer';
export function transformationWords(words:Word[]){return words.filter(w=>w.variants?.length&&w.weight>0)}
export function transformationResult(mode:TransformationMode,answer:boolean){return {kind:mode==='reading'&&!answer?'word':'image',scale:mode==='small'&&answer?.5:1,count:mode==='many'&&answer?5:1} as const}

