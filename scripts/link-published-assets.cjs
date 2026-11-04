#!/usr/bin/env node
'use strict';
// Touch only image URLs in ALREADY-PUBLISHED library.json entries.
// Do not import private draft vocabulary, categories, or unpublished metadata.
const fs=require('node:fs'),path=require('node:path');
if(!fs.existsSync('library.json'))throw Error('Published library.json missing');
const obj=JSON.parse(fs.readFileSync('library.json','utf8'));
let switched=0;
function walk(node){
 if(!node||typeof node!=='object')return;
 if(Array.isArray(node)){node.forEach(walk);return}
 if(typeof node.src==='string' && /(?:^|\/)assets\/words\/[^/]+\.png$/.test(node.src)){
  const name=path.basename(node.src,'.png')+'.webp';
  const webp=path.join('assets','words',name);
  if(fs.existsSync(webp)){
   node.src='./assets/words/'+name;
   switched++;
  }
 }
 for(const key of Object.keys(node))if(key!=='src')walk(node[key]);
}
walk(obj);
if(switched)fs.writeFileSync('library.json',JSON.stringify(obj)+'\n');
console.log(JSON.stringify({published_entries:Array.isArray(obj)?obj.length:'unknown',switched_to_existing_webp:switched,private_draft_imported:false}));
