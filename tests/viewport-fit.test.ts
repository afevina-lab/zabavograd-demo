import test from 'node:test';
import assert from 'node:assert/strict';
import {fittedGrid,memoryLayout,balancedRows,cardGap,sortingGroupMetrics} from '../src/visual/games/geometry.ts';
test('Every offered card fits the field with proportional gaps, including maximum desktop material',()=>{
 for(const [width,height,count] of [[1904,380,40],[936,480,20],[1424,310,40],[374,240,40],[304,140,20],[820,115,40],[180,80,5]]){
  const grid=fittedGrid(count,width,height);
  assert(grid.columns*grid.rows>=count);
  assert(grid.columns*grid.size+(grid.columns-1)*grid.gap<=width+.01);
  assert(grid.rows*grid.size+(grid.rows-1)*grid.gap<=height+.01);
  if(width>900)assert(grid.size>=90,'Desktop cards use the available space');
 }
});
test('Sparse fields enlarge cards instead of stretching the gaps',()=>{
 assert(fittedGrid(4,1400,600).size>=300);
 assert(fittedGrid(8,1900,400).size>220);
 assert(fittedGrid(20,940,480).size>100);
});

test('Square memory cards fit every complete row vertically',()=>{for(const [w,h] of [[1920,994],[1440,814],[390,774],[320,418],[844,328]])for(let count=6;count<=20;count+=2){const grid=memoryLayout(count,w,h),rows=Math.ceil(count/grid.cols);assert(rows*grid.width+(rows-1)*12<=h-36+.01);assert(grid.cols*grid.width+(grid.cols-1)*12<=w-36+.01)}});

test('Remainders are distributed instead of leaving sparse last rows',()=>{assert.deepEqual(balancedRows(9,3),[3,3,3]);assert.deepEqual(balancedRows(13,3),[5,4,4]);assert.deepEqual(balancedRows(7,3),[3,2,2]);for(let count=1;count<=120;count++)for(let rows=1;rows<=count;rows++){const lengths=balancedRows(count,rows);assert.equal(lengths.reduce((a,b)=>a+b,0),count);assert(Math.max(...lengths)-Math.min(...lengths)<=1)}});
test('Small cards have smaller gaps and targets reserve two rows',()=>{assert(cardGap(60)<cardGap(180));const empty=sortingGroupMetrics(0,460,600,240),full=sortingGroupMetrics(18,460,600,240);assert(empty.height<600);assert(empty.height>=empty.size*2);assert(full.height>=empty.height);assert(full.height<=600)});
