import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {initialLearning,matchesSound,learningPool,type Learning} from '../src/learning.ts';
import {defaultFilters,type Word} from '../src/model.ts';
const require=createRequire(import.meta.url);
const {soundIndex,alignSoundLetters,letterMap}=require('../scripts/sound-index.cjs') as {
 soundIndex:(word:string,tokens:string[],opts:{approved:boolean})=>Word['sounds'];
 alignSoundLetters:(word:string,tokens:string[])=>{letter:string|null}[];
 letterMap:(word:string)=>Word['letters'];
};
function example(word:string,tokens:string[],approved=true):Word{
 return {
  id:word,label:word,topic:null,subcategory:null,position:'',
  type:null,opposition:[],weight:70,images:null,
  sounds:soundIndex(word,tokens,{approved}),letters:letterMap(word)
 };
}
const arch=example('археолог',['а','р',"х'",'и','о','л','а','к']);
const crab=example('краб',['к','р','а','п']);
const frame=example('рама',['р','а','м','а']);
const rocket=example('ракета',['р','а',"к'",'э','т','а']);
const miter=example('морж',['м','о','р','ш']);
const friend=example('друг',['д','р','у','к']);

const rule=(positions:string[],clusters:string[]|null=null,opts={})=>({
 ...initialLearning,mode:'automation' as const,sounds:['р'],
 rules:{р:{positions,clusters,...opts}}
});
test('archaeologist: K is from written Г, excluded from automation, but searchable in transcription',()=>{
 const k=arch.sounds!.к[0];
 assert.equal(k.letter,'г');
 assert.equal(k.eligibility,'letter_sound_mismatch');
 const automatic:Learning={...initialLearning,sounds:['к']};
 assert.equal(matchesSound(arch,'к',automatic),false);
 assert.equal(matchesSound(arch,'к',{...automatic,mode:'search'}),true);
 assert.equal(alignSoundLetters('археолог',['а','р',"х'",'и','о','л','а','к']).length,8);
});
test('devoiced word-final consonants never become automation targets with different letter',()=>{
 assert.equal(miter.sounds!.ш[0].eligibility,'letter_sound_mismatch');
 assert.equal(friend.sounds!.к[0].eligibility,'letter_sound_mismatch');
 assert.equal(matchesSound(friend,'к',{...initialLearning,sounds:['к']}),false);
});
test('R middle inside cluster is NOT selected as ordinary middle for therapy',()=>{
 assert.equal(arch.sounds!.р[0].position,'середина');
 assert.equal(arch.sounds!.р[0].cluster,"рх'");
 assert.equal(matchesSound(arch,'р',rule(['середина'])),false);
 assert.equal(matchesSound(arch,'р',rule(['стечения'],["рх'"])),false); // Р before soft Х' is excluded
 assert.equal(matchesSound(arch,'р',rule(['стечения'],["рх'"],{clusterDirections:['after']})),false);
 assert.equal(matchesSound(arch,'р',rule(['стечения'],["рх'"],{clusterDirections:['before']})),false);
 assert.equal(matchesSound(crab,'р',rule(['стечения'],['кр'])),true);
 assert.equal(matchesSound(miter,'р',rule(['стечения'],['рш'])),true); // cluster reaches word end
 assert.equal(matchesSound(miter,'р',rule(['середина'])),false);
 assert.equal(matchesSound(crab,'р',rule(['середина'])),false);
 assert.equal(matchesSound(frame,'р',rule(['начало'])),true);
});
test('positional search is independent from cluster and also supports spelling letters',()=>{
 const search:Learning={...initialLearning,mode:'search',sounds:['р'],
  rules:{р:{positions:['середина'],clusters:null,searchClusters:'any'}}};
 assert.equal(matchesSound(arch,'р',search),true);
 assert.equal(matchesSound(arch,'р',{...search,rules:{р:{...search.rules.р,searchClusters:'only'}}}),true);
 assert.equal(matchesSound(arch,'р',{...search,rules:{р:{...search.rules.р,searchClusters:'without'}}}),false);
 assert.equal(matchesSound(frame,'р',search),false);
 const letters:Learning={...initialLearning,mode:'search',sounds:['г'],searchTarget:'letter'};
 assert.equal(matchesSound(arch,'г',letters),true);
 assert.equal(matchesSound(arch,'к',{...letters,sounds:['к']}),false);
});
test('only 2+ target occurrences; for therapy only eligible occurrences count',()=>{
 const twice:{positions:string[];clusters:null;atLeastTwo:boolean}={positions:['начало','середина','конец','стечения'],clusters:null,atLeastTwo:true};
 assert.equal(matchesSound(rocket,'а',{...initialLearning,sounds:['а'],rules:{а:twice}}),true);
 assert.equal(matchesSound(arch,'а',{...initialLearning,sounds:['а'],rules:{а:twice}}),false);
 assert.equal(matchesSound(arch,'а',{...initialLearning,mode:'search',sounds:['а'],rules:{а:{...twice,positions:['начало','середина']}}}),true);
});
test('automatic G2P candidates participate when sound matches source letter, but mismatches remain excluded',()=>{
 const proposed=example('археолог',['а','р',"х'",'и','о','л','а','к'],true);
 assert.equal(proposed.sounds!.р[0].eligibility,'before_soft_consonant');
 assert.equal(proposed.sounds!.к[0].eligibility,'letter_sound_mismatch');
 assert.equal(matchesSound(proposed,'р',rule(['стечения'],["рх'"])),false);
 assert.equal(matchesSound(proposed,'к',{...initialLearning,sounds:['к']}),false);
 assert.equal(matchesSound(proposed,'к',{...initialLearning,mode:'search',sounds:['к']}),true);
 assert.equal(learningPool([proposed,crab,arch],defaultFilters,rule(['стечения'],["рх'"])).some(w=>w===proposed),false);
 const forL:Learning={...initialLearning,sounds:['л'],rules:{л:{positions:['середина'],clusters:null}}};
 assert.equal(proposed.sounds!.л[0].eligibility,'eligible');
 assert.equal(matchesSound(proposed,'л',forL),true); // Other suitable sounds of same draft G2P word remain available
});

test('before-soft-consonant exclusion is per occurrence and does not remove phonetic lookup',()=>{
 const artist=example('артист',['а','р',"т'",'и','с','т']);
 const card=example('карта',['к','а','р','т','а']);
 assert.equal(artist.sounds!.р[0].eligibility,'before_soft_consonant');
 assert.equal(artist.sounds!.р[0].after,"т'");
 assert.equal(matchesSound(artist,'р',rule(['стечения'],["рт'"])),false);
 assert.equal(matchesSound(artist,'р',{...initialLearning,mode:'search',sounds:['р']}),true);
 assert.equal(card.sounds!.р[0].eligibility,'eligible'); // Before hard Т still suitable
 assert.equal(matchesSound(card,'р',rule(['стечения'],['рт'])),true);
 assert.equal(arch.sounds!.к[0].eligibility,'letter_sound_mismatch'); // Independent rule remains
});
test('always-soft consonants are covered, including Й without an apostrophe',()=>{
 const {isSoftConsonant}=require('../scripts/sound-index.cjs');
 for(const sound of ["т'","х'","ч'","щ'",'ч','щ','й'])assert.equal(isSoftConsonant(sound),true,sound);
 for(const sound of ['т','х','с','а'])assert.equal(isSoftConsonant(sound),false,sound);
});
