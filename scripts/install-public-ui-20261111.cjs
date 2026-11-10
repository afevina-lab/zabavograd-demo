'use strict';
/* Install a visual-only, checksum-verified release on the published gh-pages branch.
   Preserve the public library, word artwork, audio and space scenery. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {inflateRawSync}=require('node:zlib');
const root=path.resolve(__dirname,'..');
const chunks=path.join(root,'release','ui-20261111');
const names=fs.readdirSync(chunks).filter(x=>/^part-\d{3}\.b64$/.test(x)).sort();
if(names.length!==16)throw Error(`Expected 16 archive parts; found ${names.length}`);
const encoded=names.map(x=>fs.readFileSync(path.join(chunks,x),'utf8').trim()).join('');
const archive=Buffer.from(encoded,'base64');
const digest=crypto.createHash('sha256').update(archive).digest('hex');
if(digest!=='106acd97fb1d5635e114d4e07ac1a0abdccc0bd7eba84af0fe2955b6251c09f7')throw Error('The UI release ZIP checksum differs: '+digest);
function sha(file){return fs.existsSync(file)?crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'):null}
const protectedFiles=['library.json','semantic-graph.json'].map(x=>[x,sha(path.join(root,x))]);
const wordDir=path.join(root,'assets','words');
const wordsBefore=fs.existsSync(wordDir)?fs.readdirSync(wordDir).length:0;
const allowed=n=>n==='index.html'||
  /^assets\/zabavograd-ui-20261111\.(?:js|css)$/.test(n)||
  /^assets\/theme-ui\/[a-z0-9\-/]+\.(?:webp|json)$/.test(n)||
  /^assets\/icons-new\/[a-z0-9-]+\.svg$/.test(n)||
  /^assets\/neutral\/(?:background-v2|card-front-v2|card-back-v2)\.webp$/.test(n)||
  /^assets\/neutral\/(?:background-v2|paper)\.svg$/.test(n)||
  /^assets\/space\/card-(?:front|back)-v2\.webp$/.test(n);
let eocd=-1;
for(let i=archive.length-22;i>=Math.max(0,archive.length-65557);i--){
 if(archive.readUInt32LE(i)===0x06054b50){eocd=i;break}
}
if(eocd<0)throw Error('ZIP central directory missing');
const count=archive.readUInt16LE(eocd+10);
if(count!==235)throw Error(`Expected 235 public visual files, got ${count}`);
let cursor=archive.readUInt32LE(eocd+16),processed=0;
const files=[];
for(let i=0;i<count;i++){
 if(archive.readUInt32LE(cursor)!==0x02014b50)throw Error('Invalid ZIP central entry');
 const method=archive.readUInt16LE(cursor+10),compressed=archive.readUInt32LE(cursor+20),uncompressed=archive.readUInt32LE(cursor+24);
 const nameLength=archive.readUInt16LE(cursor+28),extra=archive.readUInt16LE(cursor+30),comment=archive.readUInt16LE(cursor+32),local=archive.readUInt32LE(cursor+42);
 const name=archive.subarray(cursor+46,cursor+46+nameLength).toString('utf8');
 cursor+=46+nameLength+extra+comment;
 if(!allowed(name))throw Error('Unsafe or unrelated ZIP path: '+name);
 if(archive.readUInt32LE(local)!==0x04034b50)throw Error('Invalid ZIP local entry: '+name);
 const locName=archive.readUInt16LE(local+26),locExtra=archive.readUInt16LE(local+28);
 const body=archive.subarray(local+30+locName+locExtra,local+30+locName+locExtra+compressed);
 const data=method===8?inflateRawSync(body):method===0?body:null;
 if(!data||data.length!==uncompressed)throw Error('Invalid file payload: '+name);
 if(name.endsWith('.webp') && !(data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP'))throw Error('Not WebP: '+name);
 files.push([name,data]);processed++;
}
if(!files.some(([name])=>name==='index.html') || !files.some(([name])=>name==='assets/zabavograd-ui-20261111.js'))throw Error('Missing entry or application');
for(const [name,data] of files){
 const full=path.join(root,name);fs.mkdirSync(path.dirname(full),{recursive:true});
 if(!fs.existsSync(full)||!fs.readFileSync(full).equals(data))fs.writeFileSync(full,data);
}
// Delete old GUI only after the new one has passed all integrity checks.
for(const dir of ['assets/ui','assets/icons'])fs.rmSync(path.join(root,dir),{recursive:true,force:true});
for(const name of ['assets/artwork-framing-v1.js','assets/space/card.webp','assets/neutral/background.webp'])fs.rmSync(path.join(root,name),{force:true});
for(const name of fs.readdirSync(path.join(root,'assets'))){
 if(/^index-[A-Za-z0-9_-]+\.(?:css|js)$/.test(name))fs.rmSync(path.join(root,'assets',name));
}
for(const [name,original] of protectedFiles)if(sha(path.join(root,name))!==original)throw Error('Protected public data modified: '+name);
if(fs.existsSync(wordDir)&&fs.readdirSync(wordDir).length!==wordsBefore)throw Error('Word illustrations modified');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
if(!html.includes('assets/zabavograd-ui-20261111.js')||!html.includes('assets/zabavograd-ui-20261111.css'))throw Error('Index does not use new UI');
const js=fs.readFileSync(path.join(root,'assets/zabavograd-ui-20261111.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/zabavograd-ui-20261111.css'),'utf8');
if(js.includes('assets/icons/C_')||css.includes('assets/ui/')||js.includes('.png')||css.includes('.png'))throw Error('Legacy graphics are still referenced');
console.log(`Installed ${processed} files, ${files.filter(([p])=>p.endsWith('.webp')).length} WebPs, preserved library and ${wordsBefore} word-assets`);