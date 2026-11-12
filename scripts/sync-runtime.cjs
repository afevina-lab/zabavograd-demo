'use strict';
const fs=require('node:fs'),path=require('node:path');
const from=path.resolve(__dirname,'../library.json'),to=path.resolve(__dirname,'../public/library.json');
if(!fs.existsSync(from))throw Error('Public runtime library.json is missing');
fs.mkdirSync(path.dirname(to),{recursive:true});
fs.copyFileSync(from,to);
console.log('Using only the already-public runtime library');
