'use strict';

/** Derived index for phoneme/letter lookup and therapy selection.
 * Inputs stay in the V2 library; these are regenerated caches, not editorial tags.
 * No guessed spelling alignment is ever approved for automatic practice.
 */
const VOWELS=new Set(['а','о','у','ы','э','и']);
const SPELLING_VOWELS=new Set([...('аеёиоуыэюя')]);
const SOFT_MARKS=new Set(['ь','ъ']);
const IOTATED=new Set(['е','ё','ю','я']);
const SOUND_TO_LETTER=s=>s.replace(/'/g,'').toLocaleLowerCase('ru');
const isConsonant=s=>typeof s==='string' && s!==' ' && !VOWELS.has(s);
// In Russian [й], [ч] and [щ] are always soft; other soft consonants
// carry the apostrophe marker (for example, х').
const isSoftConsonant=s=>isConsonant(s) && (s.endsWith("'") || ['й','ч','щ'].includes(s));
function isRussianLetter(s){return /^[а-яё]$/u.test(s);}
function getLetters(word){return [...word.toLocaleLowerCase('ru')].filter(isRussianLetter);}
function letterMap(word){
 const result={};
 let index=0;
 for(const letter of [...word.toLocaleLowerCase('ru')]){
  if(!isRussianLetter(letter))continue;
  (result[letter]??=[]).push({index,position:null});
  index++;
 }
 for(const list of Object.values(result))for(const item of list){
  item.position=item.index===0?'начало':item.index===index-1?'конец':'середина';
 }
 return result;
}

/** Costed grapheme alignment. Extra sound [й] from е/ё/ю/я is bound to
 * its actual spelling letter, not to the following letter. Uncertain ties
 * disable automation for the affected occurrence.
 */
function alignSoundLetters(word,tokens){
 const letters=getLetters(word);
 const n=letters.length,m=tokens.length;
 if(!n||!m||[...word].some(c=>c===' '))return tokens.map(()=>({letter:null,letterIndex:null,alignment:'unresolved'}));
 const best=Array.from({length:n+1},()=>Array.from({length:m+1},()=>Infinity));
 const ways=Array.from({length:n+1},()=>Array.from({length:m+1},()=>0));
 const prev=Array.from({length:n+1},()=>Array.from({length:m+1},()=>null));
 best[0][0]=0;ways[0][0]=1;
 function update(i,j,ni,nj,cost,assign){
  if(ni>n||nj>m)return;
  const next=best[i][j]+cost;
  if(next<best[ni][nj]-1e-9){
   best[ni][nj]=next;ways[ni][nj]=ways[i][j];prev[ni][nj]={i,j,assign};
  }else if(Math.abs(next-best[ni][nj])<1e-9){
   ways[ni][nj]=Math.min(2,ways[ni][nj]+ways[i][j]);
  }
 }
 for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){
  if(!Number.isFinite(best[i][j])||i===n)continue;
  const letter=letters[i];
  const sound=tokens[j];
  if(SOFT_MARKS.has(letter))update(i,j,i+1,j,0,[]);
  // Some consonants are silent, or merged with a doubled grapheme.
  else if(j<m&&i+1<n&&letters[i+1]===letter&&SOUND_TO_LETTER(sound)===letter)
   update(i,j,i+1,j,3,[]);
  if(j<m){
   const base=SOUND_TO_LETTER(sound);
   const exact=base===letter;
   const ordinary=SPELLING_VOWELS.has(letter) ? VOWELS.has(sound) : isConsonant(sound);
   update(i,j,i+1,j+1,exact?0:ordinary?2:4,[j]);
   if(IOTATED.has(letter)&&j+1<m&&tokens[j]==='й'&&VOWELS.has(tokens[j+1])){
    update(i,j,i+1,j+2,0.5,[j,j+1]);
   }
  }
 }
 const result=tokens.map(()=>({letter:null,letterIndex:null,alignment:'unresolved'}));
 if(!Number.isFinite(best[n][m]))return result;
 let i=n,j=m;
 const ambiguous=ways[n][m]!==1;
 while(i>0&&prev[i][j]){
  const p=prev[i][j];
  for(const k of p.assign){
   result[k]={letter:letters[i-1],letterIndex:i-1,alignment:ambiguous?'ambiguous':'aligned'};
  }
  i=p.i;j=p.j;
 }
 if(i!==0||j!==0)return tokens.map(()=>({letter:null,letterIndex:null,alignment:'unresolved'}));
 return result;
}
function clusterFor(tokens,index){
 const cur=tokens[index];
 if(!isConsonant(cur))return {before:null,after:null,cluster:null};
 let a=index,b=index;
 while(a>0&&isConsonant(tokens[a-1]))a--;
 while(b<tokens.length-1&&isConsonant(tokens[b+1]))b++;
 return {
  before:index>a?tokens[index-1]:null,
  after:index<b?tokens[index+1]:null,
  cluster:b>a?tokens.slice(a,b+1).join(''):null
 };
}
function soundIndex(word,tokens,{approved=false}={}){
 const aligned=alignSoundLetters(word,tokens), sounds={};
 tokens.forEach((sound,index)=>{
  if(sound===' '||sound==='V')return;
  const a=aligned[index]||{letter:null,letterIndex:null,alignment:'unresolved'};
  const validLetter=a.letter!==null && SOUND_TO_LETTER(sound)===a.letter;
  const letterCompatible=validLetter && a.alignment==='aligned';
  const adjacent=clusterFor(tokens,index);
  // A consonant immediately before a soft consonant is unsuitable as
  // an automation TARGET, regardless of its spelling/cluster position.
  // The same occurrence remains available for phoneme search/analysis.
  const beforeSoft=isConsonant(sound)&&isSoftConsonant(adjacent.after);
  const eligibility=!letterCompatible?
   (a.alignment==='ambiguous'||a.alignment==='unresolved'?'needs_review':'letter_sound_mismatch'):
   beforeSoft?'before_soft_consonant':approved?'eligible':'not_approved';
  (sounds[sound]??=[]).push({
   index,position:index===0?'начало':index===tokens.length-1?'конец':'середина',
   ...adjacent,letter:a.letter,letterIndex:a.letterIndex,
   alignment:a.alignment,eligibility
  });
 });
 return sounds;
}
module.exports={VOWELS,isConsonant,isSoftConsonant,letterMap,alignSoundLetters,clusterFor,soundIndex};
