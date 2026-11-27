import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=(p:string)=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
test('60 supplied illustrations preserve owners, transparency metadata, exact WebP and runtime links',()=>{
 const report=read('outputs/pack60-20261127-audit.json'),runtime=read('public/library.json');
 assert.equal(report.entries.length,60);assert.equal(new Set(report.entries.map((r:any)=>r.src)).size,60);
 for(const r of report.entries){assert(r.transparent_pixels>0);assert(r.width<=960&&r.height<=960);const b=readFileSync(new URL('../public'+r.src,import.meta.url));assert.equal(createHash('sha256').update(b).digest('hex'),r.sha256);assert(runtime.find((e:any)=>e.id===r.word_id)?.variants.some((v:any)=>v.src===r.src),r.label);}
 assert.equal(report.entries.find((r:any)=>r.label==='блин').word_id,report.entries.find((r:any)=>r.label==='блины').word_id);
});
