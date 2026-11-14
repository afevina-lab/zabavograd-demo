'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const schema=JSON.parse(fs.readFileSync(path.join(root,'schemas/library-v2.schema.json'),'utf8'));
// Deliberately limited interpreter for this repository's schema vocabulary.
// Unknown validation keywords fail rather than silently skipping a constraint.
function validate(value,rule,location='$'){
 for(const key of Object.keys(rule))assert(['$schema','$defs','$ref','title','description','type','required','properties','items','const'].includes(key),`Unsupported schema keyword ${key}`);
 if(rule.$ref){assert(rule.$ref.startsWith('#/$defs/'));return validate(value,schema.$defs[rule.$ref.slice(8)],location);}
 if(Object.hasOwn(rule,'const'))assert.deepEqual(value,rule.const,location);
 if(rule.type){const actual=Array.isArray(value)?'array':value===null?'null':typeof value;assert.equal(actual,rule.type,`${location}: type`);if(actual==='number')assert(Number.isFinite(value),location);}
 for(const key of rule.required||[])assert(Object.hasOwn(value,key),`${location}: missing ${key}`);
 for(const [key,child]of Object.entries(rule.properties||{}))if(Object.hasOwn(value,key))validate(value[key],child,`${location}.${key}`);
 if(rule.items)value.forEach((item,i)=>validate(item,rule.items,`${location}[${i}]`));
}
function validateLibrary(db){
 validate(db,schema);
 const ids=new Set(db.entries.map(e=>e.id)),categories=new Set(db.categories.map(c=>c.path));
 assert.equal(ids.size,db.entries.length,'Duplicate entry ID');
 assert.equal(categories.size,db.categories.length,'Duplicate category path');
 assert.equal(new Set(db.relations.map(r=>r.id)).size,db.relations.length,'Duplicate relation ID');
 for(const category of db.categories)for(const parent of category.parent_paths||[])assert(categories.has(parent),`Missing category parent ${parent}`);
 for(const entry of db.entries){
  for(const category of entry.categories)assert(categories.has(category.path),`Unknown category ${entry.id}: ${category.path}`);
  for(const sense of entry.illustrations.senses||[]){assert.equal(sense.word_id,entry.id,`Sense owner ${sense.id}`);for(const image of sense.variants){assert(image.src.startsWith('/assets/')&&!image.src.includes('..'),`Unsafe image ${image.src}`);assert(fs.existsSync(path.join(root,'public',image.src)),`Missing image ${image.src}`);}}
 }
 for(const relation of db.relations)for(const [key,value]of Object.entries(relation))if(value&&typeof value==='object'&&!Array.isArray(value)&&typeof value.id==='string')assert(ids.has(value.id),`Dangling relation ${relation.id}.${key}: ${value.id}`);
 return {entries:ids.size,categories:categories.size,relations:db.relations.length};
}
if(require.main===module)console.log(validateLibrary(JSON.parse(fs.readFileSync(path.join(root,'outputs/library-v2.json'),'utf8'))));
module.exports={validateLibrary,validate};
