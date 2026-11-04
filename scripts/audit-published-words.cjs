#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=process.argv[2]||'library.json';
const lib=JSON.parse(fs.readFileSync(path,'utf8'));
const items=Array.isArray(lib)?lib:(lib.words||lib.entries||lib.rows||lib.items||[]);
const refs=[];
function scan(obj,where=[]){
 if(!obj||typeof obj!=='object')return;
 if(Array.isArray(obj)){obj.forEach((x,i)=>scan(x,[...where,i]));return}
 for(const [key,val] of Object.entries(obj)){
  if(typeof val==='string'&&/(\.webp|\.png|assets\/words)/i.test(val))refs.push({path:[...where,key].slice(-4).join('.'),value:val.slice(0,180)});
  else if(val&&typeof val==='object')scan(val,[...where,key]);
 }
}
scan(lib);
const names=new Set(refs.map(x=>x.value));
const wordPathRefs=refs.filter(x=>x.value.includes('assets/words'));
console.log(JSON.stringify({
 rootType:Array.isArray(lib)?'array':typeof lib,
 rootKeys:Array.isArray(lib)?[]:Object.keys(lib),
 entryCount:items.length,
 first:items.slice(0,2).map(x=>({keys:Object.keys(x),id:x.id,label:x.label,lemma:x.lemma,topic:x.topic,variants:x.variants,images:x.images})),
 imageRefCount:refs.length,uniqueImageRefs:names.size,
 wordImageRefCount:wordPathRefs.length,
 imageRefSamples:refs.slice(0,12),
 wordImageRefSamples:wordPathRefs.slice(0,20)
},null,2));
