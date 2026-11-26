#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const {readSource}=require('./library-source.cjs');
const {soundIndex}=require('./sound-index.cjs');
const ROOT=path.resolve(__dirname,'..'),VERSION=1;
const normalize=v=>String(v).normalize('NFC').toLocaleLowerCase('ru');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const json=x=>JSON.stringify(x??null);
const allowedWeights=[0,10,20,30,50,70,100];
const status=x=>typeof x?.status==='string'?x.status:null;
const bool=x=>x?1:0;
const sound=s=>s==="й"?"й'":s;
const schema=String.raw`
PRAGMA foreign_keys=ON;
CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE word(id TEXT PRIMARY KEY,lemma TEXT NOT NULL,normalized TEXT NOT NULL,meaning TEXT,kind TEXT,pos TEXT,weight INTEGER,lexical_default INTEGER NOT NULL,phonetic_status TEXT,morphology_status TEXT,stored_phonetics INTEGER NOT NULL,illustrations INTEGER NOT NULL,syllable_type TEXT,metadata_json TEXT NOT NULL);
CREATE TABLE category(word_id TEXT REFERENCES word(id),path TEXT NOT NULL,default_selection INTEGER NOT NULL,PRIMARY KEY(word_id,path));
CREATE TABLE occurrence(word_id TEXT REFERENCES word(id),sound TEXT NOT NULL,idx INTEGER NOT NULL,position TEXT NOT NULL,cluster TEXT,before_sound TEXT,after_sound TEXT,letter TEXT,eligibility TEXT NOT NULL,origin TEXT NOT NULL,PRIMARY KEY(word_id,idx));
CREATE TABLE form(word_id TEXT REFERENCES word(id),origin TEXT NOT NULL,key TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(word_id,origin,key));
CREATE TABLE relation(id TEXT PRIMARY KEY,type TEXT NOT NULL,status TEXT);
CREATE TABLE relation_member(relation_id TEXT REFERENCES relation(id),role TEXT NOT NULL,word_id TEXT REFERENCES word(id),PRIMARY KEY(relation_id,role,word_id));
CREATE INDEX word_lemma ON word(normalized,id);
CREATE INDEX word_weight ON word(weight DESC,id);
CREATE INDEX category_lookup ON category(path,word_id);
CREATE INDEX sound_lookup ON occurrence(sound,eligibility,position,word_id);
CREATE INDEX form_lookup ON form(key,origin,word_id);
CREATE INDEX relation_word ON relation_member(word_id,relation_id);
`;
function getTokens(e){
 const d=e.phonetic_tags?.data;
 if(e.phonetic_tags?.status==='filled_with_explicit_extended_cases'&&Array.isArray(d?.sound_tokens)&&d.sound_tokens.length)return {tokens:d.sound_tokens,origin:'editorial',eligible:true};
 const stored=e.machine_analysis?.phonetic?.sound_tokens||d?.sound_tokens;
 if(e.phonetic_tags?.status==='automatic_candidate_needs_review'&&Array.isArray(stored)&&stored.length)return {tokens:stored,origin:'stored_candidate',eligible:true};
 if(Array.isArray(stored)&&stored.length)return {tokens:stored,origin:'stored_unclassified',eligible:false};
 return {tokens:[],origin:'missing',eligible:false};
}
function syllables(raw){
 const s=JSON.parse(fs.readFileSync(path.join(ROOT,'outputs/library-syllable-structure.json'),'utf8'));
 const runtime=fs.readFileSync(path.join(ROOT,'library.json'));
 const fresh=s.source?.canonical_blob_sha===blob(Buffer.from(raw))&&s.source?.blob_sha===blob(runtime);
 const byId=new Map();
 if(fresh)for(const [type,ids] of Object.entries(s.groups||{}))for(const id of ids){assert(!byId.has(id),'Duplicate syllable assignment');byId.set(id,type);}
 return {fresh,byId};
}
function build(db,dest,meta,syll={fresh:false,byId:new Map()}){
 assert(!fs.existsSync(dest),'Destination exists');
 const sql=new DatabaseSync(dest);
 try{
  sql.exec(schema);sql.exec('BEGIN');
  const put=sql.prepare('INSERT INTO meta VALUES (?,?)');
  for(const [k,v] of Object.entries({...meta,version:VERSION,syllable_index_fresh:syll.fresh,phonetic_scope:'stored_only_no_external_draft_fallback'}))put.run(k,json(v));
  const word=sql.prepare('INSERT INTO word VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const cat=sql.prepare('INSERT INTO category VALUES (?,?,?)');
  const occ=sql.prepare('INSERT INTO occurrence VALUES (?,?,?,?,?,?,?,?,?,?)');
  const form=sql.prepare('INSERT INTO form VALUES (?,?,?,?)');
  const rel=sql.prepare('INSERT INTO relation VALUES (?,?,?)');
  const member=sql.prepare('INSERT INTO relation_member VALUES (?,?,?)');
  const ids=new Set();
  for(const e of db.entries){
   assert(!ids.has(e.id),'Duplicate word ID');ids.add(e.id);
   const ph=getTokens(e),d=e.morphology?.data;
   const images=(e.illustrations?.senses||[]).reduce((n,s)=>n+(s.variants||[]).length,0);
   word.run(e.id,e.lemma,normalize(e.lemma),e.meaning??null,e.kind??null,e.part_of_speech??e.legacy_source?.raw?.part_of_speech??null,e.selection?.base_weight??null,bool(!e.same_lexical_meaning_as&&e.lexical_eligible_by_default!==false),status(e.phonetic_tags),status(e.morphology),bool(ph.tokens.length),images,syll.byId.get(e.id)??null,json(e.metadata_completion));
   for(const c of e.categories||[])cat.run(e.id,c.path,bool(c.default_selection));
   if(ph.tokens.length){
    assert(!ph.tokens.includes('V'),'Invalid V in stored phonetics');
    const sounds=soundIndex(e.lemma,ph.tokens,{approved:ph.eligible});
    for(const [s,rows] of Object.entries(sounds))for(const r of rows)occ.run(e.id,sound(s),r.index,r.position,r.cluster,r.before?sound(r.before):null,r.after?sound(r.after):null,r.letter,r.eligibility,ph.origin);
   }
   for(const [origin,p] of [['candidate',d?.automatic_proposal],['legacy_machine_candidate',e.machine_analysis?.morphology],['machine_checked_active',d?.approved_form_subset]]){
    if(!p||typeof p.forms!=='object'||p.forms===null||Array.isArray(p.forms))continue;
    if(origin==='machine_checked_active'&&(p.status!=='machine_checked'||p.usable_for_generation!==true))continue;
    if(origin!=='machine_checked_active'&&(p.status!=='suggested'||p.usable_for_generation!==false))continue;
    for(const [k,v] of Object.entries(p.forms))if(typeof v==='string'&&v.length)form.run(e.id,origin,k,v);
   }
  }
  for(const r of db.relations){
   rel.run(r.id,r.type,r.approval?.status??null);
   for(const [role,v] of Object.entries(r))if(v&&typeof v==='object'&&!Array.isArray(v)&&typeof v.id==='string'&&ids.has(v.id))member.run(r.id,role,v.id);
  }
  sql.exec('COMMIT');
  assert.equal(sql.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  assert.equal(sql.prepare('PRAGMA foreign_key_check').all().length,0);
  const counts={};for(const table of ['word','category','occurrence','form','relation','relation_member'])counts[table]=sql.prepare('SELECT count(*) AS n FROM '+table).get().n;
  assert.equal(counts.word,db.entries.length);assert.equal(counts.relation,db.relations.length);
  return counts;
 }finally{sql.close();}
}
function readMeta(db){return Object.fromEntries(db.prepare('SELECT key,value FROM meta').all().map(r=>[r.key,JSON.parse(r.value)]));}
function query(db,q,expected){
 const meta=readMeta(db);assert.equal(meta.version,VERSION,'Index version differs');assert.equal(meta.source_sha256,expected,'Stale index; rebuild');
 assert(q&&typeof q==='object'&&!Array.isArray(q),'Query must be object');
 const valid=['id','lemma','prefix','weight','kind','pos','category','default_category','lexical_default','phonetic_status','morphology_status','has_image','stored_phonetics','syllable_type','sounds','exclude_sounds','position','cluster','min_occurrences','form_key','form_origin','relation_type','relation_status','limit','offset'];
 for(const k of Object.keys(q))assert(valid.includes(k),'Unknown filter '+k);
 const limit=q.limit??20,offset=q.offset??0;assert(Number.isInteger(limit)&&limit>=1&&limit<=40&&Number.isInteger(offset)&&offset>=0&&offset<=100000,'Bad pagination');
 const where=[],args=[];
 const add=(sql,...params)=>{where.push(sql);args.push(...params);};
 const str=(v,k)=>{assert(typeof v==='string'&&v.length>0&&v.length<=300,'Invalid '+k);return v;};
 for(const k of ['id','kind','pos','phonetic_status','morphology_status','syllable_type'])if(q[k]!==undefined)add('w.'+k+'=?',str(q[k],k));
 if(q.syllable_type!==undefined)assert(meta.syllable_index_fresh,'Syllable index stale; rebuild syllable classification first');
 if(q.lemma!==undefined)add('w.normalized=?',normalize(str(q.lemma,'lemma')));
 if(q.prefix!==undefined){const p=normalize(str(q.prefix,'prefix'));add('substr(w.normalized,1,length(?))=?',p,p);}
 if(q.weight!==undefined){assert(allowedWeights.includes(q.weight),'Invalid weight');add('w.weight=?',q.weight);}
 for(const k of ['lexical_default','stored_phonetics','has_image','default_category'])if(q[k]!==undefined)assert(typeof q[k]==='boolean','Invalid '+k);
 if(q.lexical_default!==undefined)add('w.lexical_default=?',bool(q.lexical_default));
 if(q.stored_phonetics!==undefined)add('w.stored_phonetics=?',bool(q.stored_phonetics));
 if(q.has_image!==undefined)add(q.has_image?'w.illustrations>0':'w.illustrations=0');
 if(q.category!==undefined){const c=str(q.category,'category');const parts=['c.word_id=w.id','(c.path=? OR substr(c.path,1,length(?)+1)=?||\'/\')'],p=[c,c,c];if(q.default_category!==undefined){parts.push('c.default_selection=?');p.push(bool(q.default_category));}add('EXISTS (SELECT 1 FROM category c WHERE '+parts.join(' AND ')+')',...p);}
 else assert(q.default_category===undefined,'default_category requires category');
 const soundList=(v,k)=>{assert(Array.isArray(v)&&v.length<=12&&new Set(v).size===v.length,'Invalid '+k);return v.map(s=>sound(str(s,k)));};
 const required=q.sounds===undefined?[]:soundList(q.sounds,'sounds');
 const excluded=q.exclude_sounds===undefined?[]:soundList(q.exclude_sounds,'exclude_sounds');
 if(q.position!==undefined)assert(['начало','середина','конец'].includes(q.position),'Invalid position');
 if(q.cluster!==undefined)assert(typeof q.cluster==='boolean','Invalid cluster');
 const n=q.min_occurrences??1;assert(Number.isInteger(n)&&n>=1&&n<=10,'Invalid min_occurrences');
 assert(required.length||q.position===undefined&&q.cluster===undefined&&q.min_occurrences===undefined,'Sound filters require sounds');
 for(const s of required){
  const parts=["o.word_id=w.id","o.sound=?","o.eligibility='eligible'"],p=[s];
  if(q.position!==undefined){parts.push('o.position=?');p.push(q.position);}
  if(q.cluster!==undefined)parts.push(q.cluster?'o.cluster IS NOT NULL':'o.cluster IS NULL');
  add('(SELECT count(*) FROM occurrence o WHERE '+parts.join(' AND ')+')>=?',...p,n);
 }
 // Exclusion means ANY stored occurrence, even an ineligible one. Unknown
 // phonetics cannot prove absence, so exclude them when exclusion is requested.
 if(excluded.length)add('w.stored_phonetics=1');
 for(const s of excluded)add('NOT EXISTS (SELECT 1 FROM occurrence o WHERE o.word_id=w.id AND o.sound=?)',s);
 if(q.form_key!==undefined||q.form_origin!==undefined){
  const p=[],parts=['f.word_id=w.id'];if(q.form_key!==undefined){parts.push('f.key=?');p.push(str(q.form_key,'form_key'));}
  const origin=q.form_origin??'machine_checked_active';assert(['candidate','legacy_machine_candidate','machine_checked_active'].includes(origin),'Invalid form_origin');parts.push('f.origin=?');p.push(origin);
  add('EXISTS (SELECT 1 FROM form f WHERE '+parts.join(' AND ')+')',...p);
 }
 if(q.relation_type!==undefined||q.relation_status!==undefined){
  const p=[],parts=['m.word_id=w.id'];if(q.relation_type!==undefined){parts.push('r.type=?');p.push(str(q.relation_type,'relation_type'));}
  parts.push('r.status=?');p.push(q.relation_status===undefined?'verified':str(q.relation_status,'relation_status'));
  add('EXISTS (SELECT 1 FROM relation_member m JOIN relation r ON r.id=m.relation_id WHERE '+parts.join(' AND ')+')',...p);
 }
 const from=' FROM word w'+(where.length?' WHERE '+where.join(' AND '):'');
 const total=db.prepare('SELECT count(*) AS n'+from).get(...args).n;
 const rows=db.prepare('SELECT w.*'+from+' ORDER BY w.weight DESC,w.id LIMIT ? OFFSET ?').all(...args,limit,offset);
 return {source_sha256:expected,total,limit,offset,phonetic_scope:meta.phonetic_scope,syllable_index_fresh:meta.syllable_index_fresh,rows};
}
function main(){
 const [cmd,file,request,...rest]=process.argv.slice(2);assert(file&&!rest.length,'Usage: library-sqlite.cjs build NEW_DB | query DB REQUEST_JSON');
 const s=readSource();
 if(cmd==='build'&&!request){
  const target=path.resolve(file);assert(!fs.existsSync(target),'Destination exists');
  const tmp=fs.mkdtempSync(path.join(path.dirname(target),'.sqlite-build-'));
  try{const candidate=path.join(tmp,'index.sqlite'),counts=build(s.db,candidate,{source_sha256:s.sha256,source_mode:s.mode},syllables(s.raw));
   assert.equal(readSource().sha256,s.sha256,'Source changed during build');
   assert(!fs.existsSync(target),'Destination exists');fs.renameSync(candidate,target);
   console.log(JSON.stringify({source_sha256:s.sha256,bytes:fs.statSync(target).size,counts},null,2));
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
 }else if(cmd==='query'&&request){
  const db=new DatabaseSync(file,{readOnly:true});
  try{console.log(JSON.stringify(query(db,JSON.parse(fs.readFileSync(request,'utf8')),s.sha256),null,2));}finally{db.close();}
 }else throw Error('Usage: library-sqlite.cjs build NEW_DB | query DB REQUEST_JSON');
}
module.exports={build,query,getTokens,readMeta};
if(require.main===module)try{main();}catch(e){console.error(e.stack);process.exitCode=1;}
