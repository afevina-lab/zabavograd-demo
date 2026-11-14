export type ImageVariant={id:string;src:string;bounds?:{x:number;y:number;width:number;height:number;sourceWidth:number;sourceHeight:number}};
export type MemoryMode='word-word'|'word-image'|'image-image';
export type SoundOccurrence={position:string;before:string|null;after:string|null;index?:number;cluster?:string|null;letter?:string|null;letterIndex?:number|null;alignment?:string;eligibility?:string};
export type Word = {materialKind?:"syllables";syllablePattern?:string;letters?:Record<string,{index:number;position:string|null}[]>;taskWeights?:{lexical_topic?:number};categories?:string[];phonemes?:string[]|null;variants?:ImageVariant[];sounds?:Record<string,SoundOccurrence[]>;id:string;label:string;topic:string|null;subcategory:string|null;position:string;type:number|null;opposition:string[];weight:number;images:number|null};
export type Filters = {topic:string;subcategory:string;position:string;types:number[];untyped:boolean;noOpposition:boolean};
