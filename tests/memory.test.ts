import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {defaultFilters,filterWords,pickWords,makeDeck,newRound,flip,tick,removeLife,type Word} from '../src/model.ts';
const words:Word[]=JSON.parse(readFileSync(new URL('../public/library.json',import.meta.url),'utf8'));
test('filters apply to actual sounds and weights; manual permits zero',()=>{assert.equal(filterWords(words,defaultFilters).length,words.filter(w=>w.weight>0).length);assert.equal(filterWords(words,defaultFilters,false).length,words.length);const filtered=filterWords(words,{...defaultFilters,noOpposition:true});for(const w of ['рояль','Меркурий','дирижёр'])assert(!filtered.some(x=>x.label===w));const fungi=filterWords(words,{...defaultFilters,topic:'Растительный мир и грибы/Грибы',subcategory:'Ядовитые'});assert.deepEqual(fungi.map(w=>w.label),['мухомор']);});
test('weighted draw without repeats and unavailable amount',()=>{const pool=filterWords(words,defaultFilters);assert.equal(new Set(pickWords(pool,10).map(w=>w.id)).size,10);assert.throws(()=>pickWords(pool,pool.length+1));assert.equal(pickWords([{...pool[0],weight:1},{...pool[1],weight:.3}],1,()=>.9)[0].id,pool[1].id);});
test('deck contains exactly two copies of each selected word',()=>{const selected=pickWords(words,6),deck=makeDeck(selected);assert.equal(deck.length,12);assert.equal(new Set(deck.map(c=>c.key)).size,12);for(const w of selected)assert.equal(deck.filter(c=>c.word.id===w.id).length,2);});
test('matching, double-click lock and complete round',()=>{let s=newRound(pickWords(words,3),false,null,7);for(const id of [...new Set(s.deck.map(c=>c.word.id))]){const pair=s.deck.filter(c=>c.word.id===id);s=flip(s,pair[0].key);assert.equal(flip(s,pair[0].key),s);s=flip(s,pair[1].key);}assert.equal(s.phase,'won');assert.equal(s.matched.length,3);assert.equal(s.turns,3);assert.equal(s.lives,7);});
test('mismatch blocks a third card, does not reduce lives',()=>{let s=newRound(pickWords(words,3),false,null,7);const a=s.deck[0],b=s.deck.find(c=>c.word.id!==a.word.id)!;s=flip(flip(s,a.key),b.key);assert.equal(s.open.length,2);assert.equal(s.lives,7);assert.equal(flip(s,s.deck.find(c=>!s.open.includes(c.key))!.key),s);});
test('preview freezes time and cards; only teacher action removes lives',()=>{let s=newRound(pickWords(words,3),true,1,1);assert.equal(tick(s),s);assert.equal(flip(s,s.deck[0].key),s);s={...s,phase:'playing'};assert.equal(tick(s).phase,'lost');assert.equal(removeLife(s).lives,.5);assert.equal(removeLife(s).phase,'playing');assert.equal(removeLife(removeLife(s)).phase,'lost');assert.equal(tick({...s,phase:'won'}).elapsed,0);});
import {learningPool,balancedPick,initialLearning,layoutRows,matchesSound} from '../src/learning.ts';
test('multi-sound selection uses union and approximately balances',()=>{const l={...initialLearning,mode:'automation' as const,sounds:['р','с']};const pool=learningPool(words,defaultFilters,l);const picked=balancedPick(pool,6,l,()=>.4);assert.equal(new Set(picked.map(w=>w.id)).size,6);assert(picked.some(w=>matchesSound(w,'с',l)));assert(picked.every(w=>l.sounds.some(s=>matchesSound(w,s,l))));});
test('layout balances incomplete top and bottom rows',()=>{assert.deepEqual(layoutRows(10,4),[3,4,3]);assert.deepEqual(layoutRows(14,5),[5,5,4]);for(let n=6;n<=20;n+=2)assert.equal(layoutRows(n,5).reduce((a,b)=>a+b,0),n);});
test('empty sound selection and explicit cluster restriction',()=>{assert.equal(learningPool(words,defaultFilters,{...initialLearning,mode:'automation' as const,sounds:[]}).length,0);const l={...initialLearning,mode:'automation' as const,sounds:['р'],rules:{'р':{positions:['после согласного'],clusters:['кр']}}};const pool=learningPool(words,defaultFilters,l);assert(pool.some(w=>w.label==='крот'));assert(!pool.some(w=>w.label==='бровь'));});

test('image pairs keep one variant and mixed mode has one word face',()=>{const w=words.find(w=>w.variants?.length===2)!;assert(w);const deck=makeDeck([w],()=>0.7,'image-image');assert.equal(deck[0].image?.src,deck[1].image?.src);assert(deck.every(c=>c.face==='image'));const mixed=makeDeck([w],()=>0.2,'word-image');assert.deepEqual(mixed.map(c=>c.face).sort(),['image','word']);assert.throws(()=>makeDeck([{...w,variants:[]}],Math.random,'image-image'));});

test('canonical category paths override legacy flat topics, including empty selection',()=>{
 const insect=words.find(w=>w.categories?.includes('Животный мир/Насекомые'))!;assert(insect);
 const l={...initialLearning,mode:'lexical' as const,categoryPaths:['Животный мир/Насекомые']};
 assert(learningPool([insect],defaultFilters,l,false).length===1);
 assert.equal(learningPool([insect],defaultFilters,{...l,categoryPaths:[]},false).length,0);
 assert.equal(learningPool([insect],defaultFilters,{...l,categoryPaths:['Животный мир/Птицы']},false).length,0);
});

test('planned rounds have disjoint words and complete decks',()=>{
 const selected=balancedPick(words.filter(w=>w.variants?.length),18,initialLearning,()=>.4);
 const rounds=[0,1,2].map(i=>selected.slice(i*6,(i+1)*6));
 assert.equal(new Set(rounds.flat().map(w=>w.id)).size,18);
 for(const chunk of rounds)assert.equal(newRound(chunk,false,null,null,'image-image').deck.length,12);
});


test('five hearts require ten teacher actions; matches and mismatches never spend halves',()=>{let state=newRound(pickWords(words,3),false,null,5);for(let n=1;n<=10;n++){state=removeLife(state);assert.equal(state.lives,5-n/2);assert.equal(state.phase,n===10?'lost':'playing');}assert.equal(removeLife(state).lives,0);});
