export type ImageVariant={id:string;src:string;bounds?:{x:number;y:number;width:number;height:number;sourceWidth:number;sourceHeight:number}};
export type MemoryMode='word-word'|'word-image'|'image-image';
export type SoundOccurrence={position:string;before:string|null;after:string|null;index?:number;cluster?:string|null;letter?:string|null;letterIndex?:number|null;alignment?:string;eligibility?:string};
export type Word = {materialKind?:"syllables";syllablePattern?:string;letters?:Record<string,{index:number;position:string|null}[]>;taskWeights?:{lexical_topic?:number};categories?:string[];phonemes?:string[]|null;variants?:ImageVariant[];sounds?:Record<string,SoundOccurrence[]>;id:string;label:string;topic:string|null;subcategory:string|null;position:string;type:number|null;opposition:string[];weight:number;images:number|null};
export type Filters = {topic:string;subcategory:string;position:string;types:number[];untyped:boolean;noOpposition:boolean};
export const defaultFilters:Filters={topic:'',subcategory:'',position:'',types:Array.from({length:14},(_,i)=>i+1),untyped:true,noOpposition:false};
export function filterWords(words:Word[],f:Filters,automatic=true){return words.filter(w=>(!automatic||w.weight>0)&&(!f.topic||w.topic===f.topic)&&(!f.subcategory||w.subcategory===f.subcategory)&&(!f.position||w.position===f.position)&&(w.type===null?f.untyped:f.types.includes(w.type))&&(!f.noOpposition||w.opposition.length===0));}
export function pickWords(words:Word[],count:number,rng=Math.random):Word[]{
 const pool=words.filter(w=>w.weight>0).slice(),result:Word[]=[];
 if(!Number.isInteger(count)||count<0||count>pool.length)throw new Error('Недостаточно слов для выбранного количества пар.');
 if(new Set(pool.map(w=>w.id)).size!==pool.length)throw new Error('Повторяющиеся слова.');
 while(result.length<count){let n=rng()*pool.reduce((sum,w)=>sum+w.weight,0);let i=pool.length-1;for(let j=0;j<pool.length;j++){n-=pool[j].weight;if(n<0){i=j;break;}}result.push(pool.splice(i,1)[0]);}return result;
}
export type Card={key:string;word:Word;face:'word'|'image';image?:ImageVariant};
export function makeDeck(words:Word[],rng=Math.random,mode:MemoryMode='word-word'){
 const cards:Card[]=words.flatMap(word=>{
  if(mode!=='word-word'&&!word.variants?.length)throw Error('Для выбранного слова нет картинки.');
  const image=mode==='word-word'?undefined:word.variants![Math.floor(rng()*word.variants!.length)];
  return [0,1].map(copy=>({key:word.id+':'+copy,word,face:mode==='word-word'||(mode==='word-image'&&copy===0)?'word' as const:'image' as const,image}));
 });for(let i=cards.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;
}
export type Round={deck:Card[];open:string[];matched:string[];turns:number;phase:'preview'|'playing'|'won'|'lost';elapsed:number;remaining:number|null;lives:number|null};
export function newRound(words:Word[],preview:boolean,time:number|null,lives:number|null,mode:MemoryMode='word-word'):Round{return {deck:makeDeck(words,Math.random,mode),open:[],matched:[],turns:0,phase:preview?'preview':'playing',elapsed:0,remaining:time,lives};}
export function flip(state:Round,key:string):Round{
 if(state.phase!=='playing'||state.open.length===2||state.open.includes(key)||!state.deck.some(c=>c.key===key))return state;
 const card=state.deck.find(c=>c.key===key)!;if(state.matched.includes(card.word.id))return state;
 const open=[...state.open,key];if(open.length===1)return {...state,open};
 const first=state.deck.find(c=>c.key===open[0])!;
 if(first.word.id===card.word.id){const matched=[...state.matched,card.word.id];return {...state,open:[],matched,turns:state.turns+1,phase:matched.length===state.deck.length/2?'won':'playing'};}
 return {...state,open,turns:state.turns+1};
}
export function tick(s:Round):Round{if(s.phase!=='playing')return s;const remaining=s.remaining===null?null:Math.max(0,s.remaining-1);return {...s,elapsed:s.elapsed+1,remaining,phase:remaining===0?'lost':s.phase};}
export function removeLife(s:Round):Round{if(s.phase!=='playing'||s.lives===null)return s;const lives=Math.max(0,s.lives-.5);return {...s,lives,phase:lives===0?'lost':s.phase};}
