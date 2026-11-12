'use strict';
// The canonical watercolor assets are stored as base64 ZIP parts to keep binary
// assets reproducible in GitHub. Unpack them before Vite starts or builds.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {inflateRawSync}=require('node:zlib');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'assets','ui-pack');
const partNames=fs.readdirSync(dir).filter(x=>/^part-\d{3}\.b64$/.test(x)).sort();
if(partNames.length!==15)throw Error(`Expected 15 UI pack parts; got ${partNames.length}`);
const archive=Buffer.from(partNames.map(x=>fs.readFileSync(path.join(dir,x),'utf8').trim()).join(''),'base64');
const digest=crypto.createHash('sha256').update(archive).digest('hex');
if(digest!=='b1ee841d43748fdfb8b22803a6f1ab42bdf1321a2a1a1418910e01782e579ff9')throw Error('Theme archive checksum mismatch');
let end=-1;for(let p=archive.length-22;p>=Math.max(0,archive.length-65557);p--){if(archive.readUInt32LE(p)===0x06054b50){end=p;break}}
if(end<0)throw Error('ZIP end-of-central-directory not found');
const expected=archive.readUInt16LE(end+10);let off=archive.readUInt32LE(end+16),count=0,changed=0;
for(let i=0;i<expected;i++){
 if(archive.readUInt32LE(off)!==0x02014b50)throw Error('Bad ZIP central directory');
 const method=archive.readUInt16LE(off+10),compressed=archive.readUInt32LE(off+20),uncompressed=archive.readUInt32LE(off+24);
 const n=archive.readUInt16LE(off+28),extra=archive.readUInt16LE(off+30),comment=archive.readUInt16LE(off+32),local=archive.readUInt32LE(off+42);
 const name=archive.subarray(off+46,off+46+n).toString('utf8');off+=46+n+extra+comment;
 if(!/^(theme-ui\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\.(?:webp|json)|neutral\/(?:background-v2|card-front-v2|card-back-v2)\.webp)$/.test(name))throw Error('Unsafe UI asset path: '+name);
 if(archive.readUInt32LE(local)!==0x04034b50)throw Error('Bad ZIP local header');
 const localName=archive.readUInt16LE(local+26),localExtra=archive.readUInt16LE(local+28),from=local+30+localName+localExtra;
 const source=archive.subarray(from,from+compressed);
 const decoded=method===8?inflateRawSync(source):method===0?source:null;
 if(!decoded||decoded.length!==uncompressed)throw Error('Corrupt UI asset: '+name);
 const dest=path.join(root,'public','assets',name);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 if(fs.existsSync(dest)&&fs.readFileSync(dest).equals(decoded)){count++;continue}
 fs.writeFileSync(dest,decoded);count++;changed++;
}
console.log(`Neutral UI assets: ${count} checked, ${changed} written`);