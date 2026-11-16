import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {familyGroups,checkMatching,validateGroups,type MatchGroup} from '../src/matching.ts';
import {artworkMask,maskPixels} from '../src/artwork-mask.ts';
const require=createRequire(import.meta.url),words=require('../library.json'),families=require('../semantic-graph.json').families;
test('families are available only after compatible topic and preserve canonical relations',()=>{
 assert.equal(familyGroups(words,families,'',2).length,0);
 assert.equal(familyGroups(words,families,'Транспорт',2).length,0);
 const groups=familyGroups(words,families,'Животный мир/Домашние животные',2);
 assert(groups.length>0);assert(!groups.some(g=>g.elements.some(e=>e.word.label==='лисёнок')));
 assert(groups.some(g=>g.elements[1].word.label==='козлёнок'));
 assert(familyGroups(words,families,'Животный мир/Домашние животные',3).some(g=>g.elements.map(e=>e.word.label).join(',')==='козёл,коза,козлёнок'));
 assert.equal(familyGroups(words,families,'Животный мир',4).length,0);
});
test('matching checks all answers independently of order and detects foreign answers',()=>{
 const groups=familyGroups(words,families,'Животный мир/Домашние животные',3).slice(0,2);
 const correct=Object.fromEntries(groups.map(g=>[g.id,g.elements.slice(1).reverse().map(e=>e.id)]));
 assert(Object.values(checkMatching(groups,correct)).every(Boolean));
 [correct[groups[0].id][0],correct[groups[1].id][0]]=[correct[groups[1].id][0],correct[groups[0].id][0]];
 assert.equal(Object.values(checkMatching(groups,correct)).filter(v=>!v).length,2);
});
test('custom 2–5 element groups require complete slots',()=>{
 const base=familyGroups(words,families,'Животный мир',2)[0];
 for(const size of [2,3,4,5]){const g:MatchGroup={id:'g',elements:Array.from({length:size},(_,i)=>({...base.elements[0],id:String(i)}))};assert.equal(validateGroups([g],size),'');assert.notEqual(validateGroups([{...g,elements:g.elements.slice(1)}],size),'');}
});
test('mask removes connected paper while keeping enclosed white object regions',()=>{
 const w=15,h=15,p=new Uint8ClampedArray(w*h*4).fill(255);
 for(let y=3;y<12;y++)for(let x=3;x<12;x++){if(x>4&&x<10&&y>4&&y<10)continue;const i=(y*w+x)*4;p[i]=p[i+1]=p[i+2]=20;}
 const mask=artworkMask(p,w,h)!;assert(mask);assert.equal(mask[0],0);assert.equal(mask[7*w+7],1);
 const shadow=maskPixels(mask,w,h,false),outline=maskPixels(mask,w,h,true);
 assert.equal(shadow[(7*w+7)*4+3],255);assert.equal(outline[(7*w+7)*4+3],0);assert.equal(outline[(3*w+3)*4+3],255);
});
test('empty and opaque full-canvas images cannot become rectangular shadows',()=>{
 assert.equal(artworkMask(new Uint8ClampedArray(400),10,10),null);
 assert.equal(artworkMask(new Uint8ClampedArray(400).fill(255),10,10),null);
 const p=new Uint8ClampedArray(400);for(let i=0;i<100;i++)p[i*4+3]=255;
 assert.equal(artworkMask(p,10,10),null);
});
