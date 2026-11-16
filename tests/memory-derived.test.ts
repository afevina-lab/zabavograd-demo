import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeDeck,newRound,flip,type Word,type MemoryMode} from '../src/model.ts';
import {compatibleMemoryMode} from '../src/reading.ts';
import {initialLearning} from '../src/learning.ts';
import {maskPixels} from '../src/artwork-mask.ts';
const word:Word={id:'cat',label:'кот',topic:null,subcategory:null,position:'',type:null,opposition:[],weight:50,images:1,variants:[{id:'cat-a',src:'cat.webp'}]};
for(const kind of ['outline','silhouette'] as const){
 test('memory image-'+kind+' uses prepared variant and exactly one derived face',()=>{
  const mode=('image-'+kind) as MemoryMode,prepared={...word,variants:[{...word.variants![0],derived:{kind,src:'data:image/png;base64,test'}},{id:'bad',src:'bad.webp'}]};
  const deck=makeDeck([prepared],()=>.99,mode);
  assert.deepEqual(deck.map(c=>c.face).sort(),['image',kind].sort());
  assert(deck.every(c=>c.image?.id==='cat-a'));assert.equal(deck[0].image,deck[1].image);
  const r=newRound([prepared],false,null,null,mode);assert.equal(flip(flip(r,r.deck[0].key),r.deck[1].key).phase,'won');
  assert.throws(()=>makeDeck([word],Math.random,mode),/не подготовлен/);
  assert.equal(compatibleMemoryMode(mode,{...initialLearning,mode:'reading'}),'word-word');
  assert.equal(compatibleMemoryMode(mode,initialLearning),mode);
 });
}
test('contour becomes thicker without filling the centre or changing silhouette',()=>{
 const w=21,mask=new Uint8Array(w*w);for(let y=3;y<18;y++)for(let x=3;x<18;x++)mask[y*w+x]=1;
 const thin=maskPixels(mask,w,w,true,2),thick=maskPixels(mask,w,w,true);
 const count=(pixels:Uint8ClampedArray)=>pixels.filter((v,i)=>i%4===3&&v>0).length;
 assert(count(thick)>count(thin));assert.equal(thick[(10*w+10)*4+3],0);
 assert.equal(maskPixels(mask,w,w,false)[(10*w+10)*4+3],255);
});
