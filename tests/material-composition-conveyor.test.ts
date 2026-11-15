import test from 'node:test';
import assert from 'node:assert/strict';
import {balancedPick,changeTargetSound,defaultOpposition,initialLearning,type Learning} from '../src/learning.ts';
import {arithmeticDeck,conveyorIncorrectCount,conveyorConditions,isCloseConveyorDistractor,materialConveyorDeck} from '../src/conveyor.ts';
import type {Word} from '../src/material-types.ts';

function word(id:string,category='Животный мир/Домашние животные',phonemes:string[]=['л'],kind?:'syllables'):Word{
 return {id,label:id,topic:category.split('/')[0],subcategory:null,position:'',type:null,
  opposition:[],weight:100,images:null,categories:[category],phonemes,
  materialKind:kind,sounds:{},...(kind?{syllablePattern:'CV'}:{})};
}
const learning:Learning={...initialLearning,mode:'automation',sounds:['л'],contentKinds:['words','syllables']};

test('methodological suggestions are a separate editable exclusion set',()=>{
 const selected=changeTargetSound({...initialLearning,mode:'differentiation'},'л',true);
 for(const s of ["л'",'р',"р'",'в',"в'"])assert(selected.excludedSounds!.includes(s),s);
 assert(!selected.sounds.some(s=>selected.excludedSounds!.includes(s)));
 const second=changeTargetSound(selected,'р',true);
 assert(second.sounds.includes('р')&&!second.excludedSounds!.includes('р'));
 const manual=changeTargetSound({...second,exclusionsEdited:true,excludedSounds:["в'"]},'р',false);
 assert.deepEqual(manual.excludedSounds,["в'"]);
 assert(defaultOpposition('с').includes('ш'));
 assert(defaultOpposition('с').includes('ф'), 'labiodental S–F confusion is possible');
 assert(defaultOpposition('ж').includes('з'));
 assert(defaultOpposition('ф').includes('в'));
});

test('expanded exclusions cover all sibilants and late sounds without losing manual control',()=>{
 // Broad developmental defaults can be adjusted by the teacher per child.
 for(const target of ['з',"з'"]){
  for(const s of ['ш',"ч'","щ'"])assert(defaultOpposition(target).includes(s),target+' / '+s);
 }
 for(const target of ['с',"с'"])assert(defaultOpposition(target).includes('ж'),target);
 for(const target of ['с',"с'",'з',"з'",'ц']){
  for(const s of ['р',"р'",'л'])assert(defaultOpposition(target).includes(s),target+' / '+s);
 }
 for(const target of ['ш','ж',"ч'","щ'"]){
  for(const s of ['с',"с'",'з',"з'",'ц'])assert(defaultOpposition(target).includes(s),target+' / '+s);
 }
 const late=['с',"с'",'з',"з'",'ц','ш','ж',"ч'","щ'","й'",'р',"р'",'л',"л'"];
 const early=['а','о','у','ы','э','и','м',"м'",'н',"н'",'п',"п'",'б',"б'",
  'т',"т'",'д',"д'",'к',"к'",'г',"г'",'х',"х'",'в',"в'",'ф',"ф'"];
 for(const target of early){
  const suggestions=defaultOpposition(target);
  for(const sound of late)assert(suggestions.includes(sound),target+' / '+sound);
  assert.equal(suggestions.length,new Set(suggestions).size,'duplicate recommendations for '+target);
  assert(!suggestions.includes(target),'target must not exclude itself: '+target);
 }
 const start=changeTargetSound({...initialLearning,mode:'automation'},'м',true);
 assert(start.excludedSounds!.includes('ш'));
 const edited=changeTargetSound({...start,exclusionsEdited:true,excludedSounds:['ш']},'м',true);
 assert.deepEqual(edited.excludedSounds,['ш'],'manual exclusions must not be reset');
});

test('50/50 words and syllables with no repeated IDs, graceful shortage fallback',()=>{
 const pool=[...Array.from({length:15},(_,i)=>word('слово'+i)),
   ...Array.from({length:15},(_,i)=>word('слог'+i,'Слоги',['л'],'syllables'))];
 const selected=balancedPick(pool,12,learning,()=>.41);
 assert.equal(selected.length,12);
 assert.equal(selected.filter(w=>w.materialKind==='syllables').length,6);
 assert.equal(new Set(selected.map(w=>w.id)).size,12);
 const small=balancedPick([...pool.slice(0,15),...pool.slice(15,17)],10,learning,()=>.41);
 assert.equal(small.filter(w=>w.materialKind==='syllables').length,2);
});

test('conditional conveyor caps wrong answers at 40% even for small decks',()=>{
 for(const count of [1,2,3,6,12,18,24]){
  const flags=conveyorConditions(count,true,()=>.3);
  assert.equal(flags.filter(x=>!x).length,conveyorIncorrectCount(count));
  assert(flags.filter(x=>!x).length/count<=.4);
 }
 for(const n of [6,12,18,24]){
  const cards=arithmeticDeck(n,20,true,()=>.37);
  assert(cards.filter(c=>!c.expected).length<=Math.floor(n*.4));
 }
});

test('70% of the wrong sound cards use the familiar confusion pair where available',()=>{
 const positives=Array.from({length:20},(_,i)=>word('л'+i));
 const negatives=[...Array.from({length:12},(_,i)=>word('р'+i,'Животный мир/Дикие животные',['р'])),
 ...Array.from({length:12},(_,i)=>word('ш'+i,'Растительный мир/Цветы',['ш']))];
 const deck=materialConveyorDeck(positives,negatives,12,{...learning,contentKinds:['words']},()=>.4);
 const wrong=deck.filter(c=>!c.expected);
 assert.equal(wrong.length,4);
 assert(wrong.filter(c=>isCloseConveyorDistractor(c.word!,learning)).length>=3);
 assert.equal(new Set(deck.map(c=>c.word!.id)).size,12);
});

test('developmental exclusions do not masquerade as confusable conveyor pairs',()=>{
 const early:Learning={...initialLearning,mode:'automation',sounds:['м']};
 assert(defaultOpposition('м').includes('ш'), 'late sounds must be excluded in automation');
 assert(!isCloseConveyorDistractor(word('not-confusable','Слоги',['ш']),early),
  'late sound is not automatically an acoustically close incorrect card');
 const whistling:Learning={...initialLearning,mode:'automation',sounds:['с']};
 assert(defaultOpposition('с').includes('р'), 'early sonors may be unmastered');
 assert(!isCloseConveyorDistractor(word('sonor','Слоги',['р']),whistling));
 assert(isCloseConveyorDistractor(word('sibilant','Слоги',['ж']),whistling));
});

test('lexical distractors come mostly from adjacent topics, not unrelated vocabulary',()=>{
 const cfg:Learning={...initialLearning,mode:'lexical',categoryPaths:['Животный мир/Домашние животные']};
 const positives=Array.from({length:16},(_,i)=>word('домашнее'+i));
 const wrong=[...Array.from({length:14},(_,i)=>word('дикое'+i,'Животный мир/Дикие животные',['р'])),
 ...Array.from({length:14},(_,i)=>word('растение'+i,'Растительный мир/Цветы',['ш']))];
 const deck=materialConveyorDeck(positives,wrong,12,cfg,()=>.43);
 assert.equal(deck.filter(c=>!c.expected).length,4);
 assert(deck.filter(c=>!c.expected&&isCloseConveyorDistractor(c.word!,cfg)).length>=3);
});
