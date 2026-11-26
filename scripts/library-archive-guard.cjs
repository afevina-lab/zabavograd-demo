'use strict';
const crypto=require('node:crypto'),assert=require('node:assert/strict');
function snapshot(db){
 const rows=db.entries.filter(e=>e.legacy_source?.raw).map(e=>({id:e.id,archive:e.legacy_source}));
 rows.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 assert.equal(new Set(rows.map(r=>r.id)).size,rows.length,'Duplicate archived ID');
 return rows;
}
function fingerprint(db){
 const rows=snapshot(db);
 return {entries:rows.length,sha256:crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex')};
}
function verifyArchive(db,expected){
 assert.equal(fingerprint(db).entries,expected.entries,'Archived entry count changed');
 assert.equal(fingerprint(db).sha256,expected.sha256,'Immutable historical archive changed');
}
module.exports={fingerprint,verifyArchive};
if(require.main===module)console.log(JSON.stringify(fingerprint(require('./library-source.cjs').readSource().db)));
