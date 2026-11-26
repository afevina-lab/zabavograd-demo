import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
const require=createRequire(import.meta.url);
const {envelope,parseTree,extract}=require('../scripts/library-media-request.cjs');
const src='/assets/words/probe.webp',commit='a'.repeat(40),j='b'.repeat(40),i='c'.repeat(40),extra='d'.repeat(40);
const asset=Buffer.from('fake bytes for transport test'),sha256=crypto.createHash('sha256').update(asset).digest('hex');
const op={type:'link_webp',entry_id:'a',lemma:'кот',meaning:null,src,sha256,reviewed:true,reason:'Transport test'};
const packet={version:1,request:{version:1,mode:'preview',source_sha256:'0'.repeat(64),operations:[],import_operations:[op]}};
const raw=Buffer.from(JSON.stringify(packet)),prefix='editorial/requests/',file=prefix+'library-media.json',image=prefix+'media/probe.webp';
const row=(hash,size,p,mode='100644')=>mode+' blob '+hash+' '+size+'\t'+p+'\0';
test('exact media envelope and regular Git blob paths only',()=>{
 assert.deepEqual(envelope(raw).names,[file,image]);
 assert.throws(()=>envelope(Buffer.from(JSON.stringify({...packet,media_preview_sha256:'0'.repeat(64)}))),/Unexpected/);
 assert.throws(()=>parseTree(Buffer.from(row(i,asset.length,image,'120000'))),/Unexpected Git/);
 assert.throws(()=>parseTree(Buffer.from(row(i,asset.length,image+'\nother'))),/Unexpected Git/);
 assert.throws(()=>envelope(Buffer.alloc(65537)),/64 KiB/);
});
test('extract only requested bounded binary blobs from exact commit; reject extras and wrong SHA',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'media-transport-'));
 try{
  const git=(args)=>{
   if(args[0]==='ls-tree'){assert(args.includes(commit));return Buffer.from(row(j,raw.length,file)+row(i,asset.length,image));}
   return args[2]===j?raw:asset;
  };
  const r=extract(commit,path.join(tmp),git);
  assert.deepEqual(fs.readFileSync(path.join(r.imageDir,'probe.webp')),asset);
  assert.deepEqual(JSON.parse(fs.readFileSync(r.request)),packet.request);
  const tmp2=path.join(tmp,'second');fs.mkdirSync(tmp2);
  assert.throws(()=>extract(commit,tmp2,args=>args[0]==='ls-tree'?Buffer.from(row(j,raw.length,file)+row(i,asset.length,image)+row(extra,0,prefix+'media/other.webp')):raw),/unexpected request files/);
  const tmp3=path.join(tmp,'third');fs.mkdirSync(tmp3);
  assert.throws(()=>extract(commit,tmp3,args=>args[0]==='ls-tree'?git(args):args[2]===j?raw:Buffer.alloc(asset.length)),/hash differs/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
