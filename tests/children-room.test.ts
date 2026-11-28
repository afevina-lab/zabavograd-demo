import test from 'node:test';
import assert from 'node:assert/strict';
import scene from '../src/scene-engine/children-room.mjs';
import {compile,point} from '../src/scene-engine/engine.mjs';
test('room covers every viewport and horse faces the window; hard attachments remain aligned',()=>{
 for(const w of [320,390,768,1024,1366,1920,2560])for(const h of [390,768,844,1080]){
  const c=compile(scene,w,h),room=c.nodes.find(n=>n.source.name==='Комната');
  assert.ok(room.bounds.x<=1e-6&&room.bounds.y<=1e-6&&room.bounds.x+room.bounds.width>=w-1e-6&&room.bounds.y+room.bounds.height>=h-1e-6);
  const horse=c.nodes.find(n=>n.source.name==='Лошадка на полу');assert.ok(horse.matrix[0]<0);
  for(const n of c.nodes.filter(n=>n.source.attachment)){const a=n.source.anchor,s=c.nodes.find(p=>p.id===n.source.attachment.target).sockets[n.source.attachment.socket],p=point(n.matrix,{x:a.x*n.source.width,y:a.y*n.source.height});assert.ok(Math.hypot(p.x-s.x,p.y-s.y)<1e-6);}
 }
});

test('phone hides basket and gentle intermittent horse motion rests between swings',()=>{
 const phone=compile(scene,390,844);assert.equal(phone.nodes.find(n=>n.source.name==='Корзина на полу').visible,false);
 const horse=t=>compile(scene,1024,768,{time:t}).nodes.find(n=>n.source.name==='Лошадка на полу').matrix;
 assert.deepEqual(horse(10),horse(15));assert.notDeepEqual(horse(1),horse(2));
});

test('runtime scene matches the authored document',async()=>{const {readFile}=await import('node:fs/promises');assert.deepEqual(scene,JSON.parse(await readFile(new URL('../scenes/children-room/draft.json',import.meta.url),'utf8')));});
