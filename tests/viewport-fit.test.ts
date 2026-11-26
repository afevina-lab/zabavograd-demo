import test from 'node:test';
import assert from 'node:assert/strict';
import {fittedGrid} from '../src/visual/games/geometry.ts';
test('Every offered card fits the field with a fixed gap, including maximum desktop material',()=>{
 for(const [width,height,count] of [[1904,380,40],[936,480,20],[1424,310,40],[374,240,40],[304,140,20],[820,115,40],[180,80,5]]){
  const grid=fittedGrid(count,width,height);
  assert(grid.columns*grid.rows>=count);
  assert(grid.columns*grid.size+(grid.columns-1)*8<=width+.01);
  assert(grid.rows*grid.size+(grid.rows-1)*8<=height+.01);
  if(width>900)assert(grid.size>=90,'Desktop cards use the available space');
 }
});
test('Sparse fields enlarge cards instead of stretching the gaps',()=>{
 assert(fittedGrid(4,1400,600).size>=300);
 assert(fittedGrid(8,1900,400).size>220);
 assert(fittedGrid(20,940,480).size>100);
});
