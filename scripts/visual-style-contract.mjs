import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let postcss;try{postcss=require('postcss')}catch{postcss=require('../.build-tools/node_modules/.pnpm/postcss@8.5.33/node_modules/postcss')}
/** Reject ownership drift, rather than forbidding legitimate component variants or media rules. */
export function validateVisualStyles(entries){
 const owners=new Map();let rules=0,declarations=0;
 for(const {file,source,layer='unlayered'} of entries){const root=postcss.parse(source,{from:file});
  root.walkRules(rule=>{rules++;const context=[];let parent=rule.parent;while(parent&&parent.type!=='root'){if(parent.type==='atrule')context.unshift('@'+parent.name+' '+parent.params);parent=parent.parent}
   for(const selector of rule.selectors){
    if(file.includes('/compositions/'))assert(!/\.(?:v-button|v-icon-button)\b/.test(selector),'Composition overrides button primitive: '+file+' '+selector);
    const key=JSON.stringify([layer,context,selector]),previous=owners.get(key),properties=rule.nodes.filter(n=>n.type==='decl').map(d=>d.prop);assert(!previous||(previous.file===file&&properties.every(p=>!previous.properties.has(p))),'Repeated selector/context: '+selector+' in '+previous?.file+' and '+file);owners.set(key,{file,properties:new Set([...(previous?.properties||[]),...properties])});
   }
   const properties=new Set();for(const decl of rule.nodes.filter(n=>n.type==='decl')){declarations++;assert(!decl.important,'Priority patch: '+file+' '+rule.selector);assert(!properties.has(decl.prop),'Repeated property '+decl.prop+' in '+file+' '+rule.selector);properties.add(decl.prop)}
  });
 }
 return {rules,declarations,selectorContexts:owners.size};
}
