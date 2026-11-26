import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,relative} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let postcss;try{postcss=require('postcss')}catch{postcss=require('../.build-tools/node_modules/.pnpm/postcss@8.5.33/node_modules/postcss')}
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);
const files=walk('src'),styles=[],rules=[],inline=[];
const visit=file=>{const css=postcss.parse(readFileSync(file,'utf8'));css.walkAtRules('import',rule=>{const match=rule.params.match(/['"]([^'"]+)['"]/);if(match)visit(relative(process.cwd(),resolve(dirname(file),match[1])).replaceAll('\\','/'))});styles.push(file)};visit('src/visual/index.css');let cascadeOrder=0;
for(const file of styles){const root=postcss.parse(readFileSync(file,'utf8'),{from:file});let order=0;root.walkRules(rule=>{const context=[];let p=rule.parent;while(p&&p.type!=='root'){if(p.type==='atrule')context.unshift('@'+p.name+' '+p.params);p=p.parent}rules.push({file,line:rule.source.start.line,order:order++,cascadeOrder:cascadeOrder++,selector:rule.selector,context,declarations:rule.nodes.filter(n=>n.type==='decl').map(d=>({property:d.prop,value:d.value,important:!!d.important}))})})}
for(const file of files.filter(p=>/\.tsx?$/.test(p))){readFileSync(file,'utf8').split('\n').forEach((line,i)=>{if(/\bstyle=|\.style\.|setProperty\(/.test(line))inline.push({file,line:i+1,source:line.trim()})})}
const keys=new Map();for(const r of rules){const key=JSON.stringify([r.context,r.selector]);keys.set(key,[...(keys.get(key)||[]),{file:r.file,line:r.line}])}
const duplicates=[...keys].filter(([,locations])=>locations.length>1).map(([key,locations])=>({selectorContext:JSON.parse(key),locations}));
const result={schema:1,scope:'Static inventory; duplicate selectors are candidates, not proof of dead CSS. Runtime measurements live in baseline artifacts.',files:styles.map(file=>({file,sha256:createHash('sha256').update(readFileSync(file)).digest('hex'),bytes:readFileSync(file).length})),summary:{rules:rules.length,important:rules.flatMap(r=>r.declarations).filter(d=>d.important).length,duplicateSelectorContexts:duplicates.length,inlineStyleLines:inline.length},rules,duplicates,inline};
mkdirSync('docs/visual-next',{recursive:true});writeFileSync('docs/visual-next/cascade-inventory.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.summary));

