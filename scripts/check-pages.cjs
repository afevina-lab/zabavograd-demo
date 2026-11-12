const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve('.local/pages-dist'),base='/zabavograd-demo/';
function file(url){url=url.split(/[?#]/)[0];if(url.startsWith(base))url=url.slice(base.length);else url=url.replace(/^\//,'');const p=path.resolve(root,url);assert(p.startsWith(root+path.sep),'Outside release: '+url);assert(fs.existsSync(p),'Missing asset: '+url);}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert(html.includes('noindex'),'Missing noindex');
const words=JSON.parse(fs.readFileSync(path.join(root,'library.json'),'utf8'));
const original=JSON.parse(fs.readFileSync('public/library.json','utf8'));
assert.deepEqual(words,JSON.parse(JSON.stringify(original).replace(/\.png/g,'.webp')),'Library content changed');
for(const word of words)for(const v of word.variants||[])file(v.src);
for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g))if(!/^(https?:|data:)/.test(m[1]))file(m[1]);
for(const name of fs.readdirSync(path.join(root,'assets'))){if(!/\.(css|js)$/.test(name))continue;const text=fs.readFileSync(path.join(root,'assets',name),'utf8');assert(!text.includes('"/assets/'),'Unprefixed runtime asset');if(name.endsWith('.css'))for(const m of text.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)){if(!m[1].startsWith('data:'))file(m[1]);}}
for(const name of ['deal.wav','win.wav','match-space.wav','wrong.wav','flip-space.wav','click.wav','flip.ogg','match.ogg'])file('assets/audio/'+name);
assert(fs.existsSync(path.join(root,'robots.txt')));assert(!fs.existsSync(path.join(root,'images.html')));
console.log('PASS: library unchanged, all illustration/CSS/entry/audio paths resolve under '+base);
