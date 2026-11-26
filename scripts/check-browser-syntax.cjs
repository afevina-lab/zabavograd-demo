'use strict';
const fs=require('node:fs'),vm=require('node:vm');
let count=0;
for(const path of process.argv.slice(2)){
 const source=fs.readFileSync(path,'utf8');
 const literals=/\b(?:evaluate|until)\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g;
 for(const match of source.matchAll(literals)){
  // Only complete literal arguments; dynamically assembled expressions need browser coverage.
  if(!/^[),]/.test(source.slice(match.index+match[0].length).trimStart()))continue;
  const expression=vm.runInNewContext(match[1],Object.create(null),{timeout:100});
  new vm.Script(expression,{filename:path+':browser-expression'});count++;
 }
}
if(!count)throw Error('No static browser expressions found');
console.log('Browser expression syntax verified: '+count);
