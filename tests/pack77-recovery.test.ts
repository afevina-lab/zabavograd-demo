import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=(p:string)=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
test('all 77 pack words are illustrated in the runtime without changing existing IDs',()=>{
 const audit=read('outputs/pack77-20261125-audit.json'),runtime=read('public/library.json');
 assert.equal(audit.entries.length,77);
 for(const row of audit.entries){const e=runtime.find((x:any)=>x.id===row.word_id);assert(e,row.word);assert(e.variants?.length,row.word);for(const v of e.variants)assert(readFileSync(new URL('../public'+v.src,import.meta.url)).length);if(row.status==='linked'){assert(e.variants.some((v:any)=>v.src===row.src));const b=readFileSync(new URL('../public'+row.src,import.meta.url));assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),row.git_blob_sha);}}
 for(const word of ['попугай','сок','носок'])assert(runtime.some((e:any)=>e.label===word&&e.variants?.length),word);
});
