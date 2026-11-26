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
