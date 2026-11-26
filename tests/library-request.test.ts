import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {validate}=require('../scripts/library-request.cjs');
test('remote query has limited projection and no shell interpolation',()=>{
 assert.deepEqual(validate({version:1,mode:'query',command:'find',options:{lemma:'лук; $(echo hi)'}}).args,['find','--lemma','лук; $(echo hi)','--limit','20']);
 assert.throws(()=>validate({version:1,mode:'query',command:'select',options:{limit:100}}));
 assert.throws(()=>validate({version:1,mode:'query',command:'patch',options:{}}));
 assert.throws(()=>validate({version:1,mode:'query',command:'select',options:{apply:true}}));
 assert.throws(()=>validate({version:1,mode:'query',command:'inspect',options:{fields:['/a,/b']}}));
});
test('patch requires exact source fingerprint and bounded operations',()=>{
 const op={id:'a',path:'/field',expect:{exists:false},value:'x'};
 assert.throws(()=>validate({version:1,mode:'candidate',operations:[op]}));
 assert.throws(()=>validate({version:1,mode:'preview',source_sha256:'a'.repeat(64),operations:Array(31).fill(op)}));
 assert.deepEqual(validate({version:1,mode:'candidate',source_sha256:'a'.repeat(64),operations:[op]}).packet,{version:1,operations:[op]});
});

test('SQLite request permits bounded filters and optional pagination fingerprint, rejects write or arbitrary SQL',()=>{
 const req={version:1,mode:'query',command:'sqlite',source_sha256:'a'.repeat(64),options:{sounds:['к'],exclude_sounds:['р'],weight:100}};
 assert.deepEqual(validate(req).sqlite,{sounds:['к'],exclude_sounds:['р'],weight:100,limit:20});
 assert.throws(()=>validate({...req,options:{sql:'DROP TABLE word'}}));
 assert.throws(()=>validate({...req,options:{limit:41}}));
 assert.throws(()=>validate({...req,operations:[]}));
 assert.throws(()=>validate({...req,source_sha256:'bad'}));
});
