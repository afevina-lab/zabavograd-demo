'use strict';
/**
 * Verify the independent watercolor UI resources restored from the versioned
 * archive. The source pack is checked by extract-theme-pack.cjs with SHA-256.
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const base=path.join(root,'public','assets');
const file=(relative)=>path.join(base,relative);
function exists(relative){assert(fs.existsSync(file(relative)),'Missing UI asset: '+relative)}
const manifest=JSON.parse(fs.readFileSync(file('theme-ui/asset-manifest.json'),'utf8'));
const all=manifest.assets;
assert(Array.isArray(all)&&all.length===210,'Expected 210 independent watercolor WebP assets');
const paths=new Set();
const colors=['blue','sand','lightgray','steel','cream','sage','lavender','turquoise'];
for(const entry of all){
 assert(typeof entry.file==='string'&&entry.file.endsWith('.webp'),'Invalid asset name');
 assert(!entry.file.includes('..')&&!paths.has(entry.file),'Duplicate/unsafe resource: '+entry.file);
 paths.add(entry.file);
 const absolute=file('theme-ui/'+entry.file);
 const buffer=fs.readFileSync(absolute);
 assert(buffer.length>70,'Empty WebP: '+entry.file);
 assert.equal(buffer.toString('ascii',0,4),'RIFF','Invalid WebP header: '+entry.file);
 assert.equal(buffer.toString('ascii',8,12),'WEBP','Invalid WebP signature: '+entry.file);
 if(entry.nine_slice)for(const side of ['left','right','top','bottom']){
  assert(Number.isInteger(entry.nine_slice[side])&&entry.nine_slice[side]>0,'Nine-slice invalid: '+entry.file);
 }
}
for(const color of colors){
 for(const kind of ['large','pill','square'])
  for(const state of ['normal','hover','pressed','disabled'])
   exists('theme-ui/buttons/'+kind+'/button-'+kind+'-'+color+'-'+state+'.webp');
 exists('theme-ui/panels/panel-'+color+'-square-corners.webp');
 exists('theme-ui/checkboxes/checkbox-'+color+'-empty.webp');
 exists('theme-ui/checkboxes/checkbox-'+color+'-checked.webp');
 exists('theme-ui/radio/radio-'+color+'-empty.webp');
 exists('theme-ui/radio/radio-'+color+'-checked.webp');
}
for(const card of ['background-v2','card-front-v2','card-back-v2'])exists('neutral/'+card+'.webp');
for(const name of ['settings','pause','play','volume','mute','arrow-right','house','question-mark','star','cross','expand','refresh','heart']){
 const full=file('icons-new/'+name+'.svg');
 const text=fs.readFileSync(full,'utf8');
 assert(text.includes('<svg')&&text.includes('</svg>'),'Malformed SVG icon: '+name);
}
exists('space/background.png');
const css=fs.readFileSync(path.join(root,'src/styles/layout.css'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/design-system/controls.css'),'utf8');
const current=fs.readFileSync(path.join(root,'src/design-system/theme.css'),'utf8');
assert(current.includes('var(--zg-stage-image)'),'Theme scene no longer uses registry');
const refs=[...css.matchAll(/\/assets\/(theme-ui\/[^\s\x27\x22\)]+\.webp|neutral\/[^\s\x27\x22\)]+\.webp)/g)].map(m=>m[1]);
for(const relative of refs)exists(relative);
assert(current.includes('zg-background-drift')&&current.includes('scale(1.1111)'),'Shared drifting background missing');
assert(css.includes('.app.game-active .stage-footer{display:none'),'Full-screen bottom filler not hidden');
console.log('UI pack verified: '+all.length+' WebP assets, 13 SVG icons, '+refs.length+' CSS asset references.');
