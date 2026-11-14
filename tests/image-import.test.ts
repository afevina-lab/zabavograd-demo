import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=(path:string)=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
test('63 supplied WebP assets retain exact owners, hashes and runtime links',()=>{
 const report=read('docs/image-import-20261114.json'),db=read('outputs/library-v2.json'),runtime=read('public/library.json');
 assert.equal(report.images.length,63);
 assert.equal(new Set(report.images.map((r:any)=>r.file)).size,63);
 for(const row of report.images){
  assert.equal(row.status,'linked');assert(row.file.endsWith('.webp'));
  const entry=db.entries.find((e:any)=>e.id===row.word_id);assert(entry);
  const src='/'+row.file.replace(/^public\//,'');
  const image=entry.illustrations.senses.flatMap((s:any)=>s.variants).find((v:any)=>v.src===src);assert(image);
  assert.equal(createHash('sha256').update(readFileSync(new URL('../'+row.file,import.meta.url))).digest('hex'),image.sha256);
  assert(runtime.find((w:any)=>w.id===row.word_id)?.variants.some((v:any)=>v.src===src));
 }
 assert.equal(report.created_entries,db.provenance.image_pack_20261114.created);
});
