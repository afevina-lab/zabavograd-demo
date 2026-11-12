'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const https=require('node:https');
const SOURCES={
 constructicon:{name:'Russian Constructicon (data only)',license:'CC BY 4.0',commit:'7806b7d74c56192b97150b06f755be4d37ad5b3c',files:['database.csv'],root:'https://raw.githubusercontent.com/constructicon/russian-data/'},
 framebank:{name:'Russian FrameBank offline dictionary',license:'GPL-3.0',commit:'e60da2a38f645db21c55aa0e7ff9730e92e7e2ca',files:['framebank_dict_cx.txt','framebank_dict_cx_items.txt'],root:'https://raw.githubusercontent.com/olesar/framebank/'},
 wikidata:{name:'Wikidata structured data',license:'CC0',endpoint:'https://www.wikidata.org/wiki/Special:EntityData/'}
};
function parseDelimited(s,sep=','){
 const rows=[];let cell='',row=[],quoted=false;
 for(let i=0;i<s.length;i++){
  const c=s[i];
  if(quoted){if(c==='"'&&s[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}
  else if(c==='"')quoted=true;
  else if(c===sep){row.push(cell);cell='';}
  else if(c==='\n'){row.push(cell.replace(/\r$/,''));cell='';if(row.some(x=>x.trim()))rows.push(row);row=[];}
  else cell+=c;
 }
 if(quoted)throw Error('Unclosed quotation in delimited data');
 if(cell||row.length){row.push(cell.replace(/\r$/,''));if(row.some(x=>x.trim()))rows.push(row);}
 const header=rows.shift()||[];
 return rows.map((cells)=>Object.fromEntries(header.map((h,i)=>[h.replace(/^\uFEFF/,''),cells[i]||''])));
}
function normalize(s){return String(s||'').trim().toLowerCase().replace(/ё/g,'е').normalize('NFC');}
function lexemes(s){return String(s||'').split(/[;,\n]/).map(x=>x.trim()).filter(x=>/^[а-яё -]+$/iu.test(x)&&x.length>1);}
function makeIndex(entries){const index=new Map();for(const e of entries){const v=normalize(e.lemma);if(!v)continue;const a=index.get(v)||[];a.push(e);index.set(v,a);}return index;}
function matches(index,lemma){const found=index.get(normalize(lemma))||[];return found.map(e=>({id:e.id,meaning:e.meaning||null,part_of_speech:e.part_of_speech||null}));}
function oneOrAmbiguous(index,lemma){const found=matches(index,lemma);return {entry_id:found.length===1?found[0].id:null,entry_candidates:found,match_status:found.length===1?'unambiguous_lemma_requires_sense_review':'ambiguous_or_missing'};}
function constructiconProposals(csv,entries){
 const index=makeIndex(entries),rows=parseDelimited(csv,','),out=[];
 for(const row of rows){const id=row['ID Number'];if(!id)continue;
  for(const lemma of new Set(lexemes(row['Anchor words']))){const m=oneOrAmbiguous(index,lemma);if(!m.entry_candidates.length)continue;
   out.push({source:'constructicon',source_record_id:String(id),candidate_type:'construction_anchor',anchor_lemma:lemma,...m,
    pattern:row['Name UD']||row.Name||null,morphology:row.Morphology||null,semantic_role:row['Semantic role']||null,
    review_status:'suggested',usable_for_generation:false});
  }
 }
 return out;
}
function framebankProposals(dict,items,entries){
 const index=makeIndex(entries),all=parseDelimited(dict,'\t'),itemRows=parseDelimited(items,'\t');
 const byConstr=new Map();for(const row of itemRows){if(!row.ConstrIndex)continue;const list=byConstr.get(row.ConstrIndex)||[];
   if(row.Role&&row.Role!=='-')list.push({form:row.Form||null,role:row.Role||null,semantic_class:row.SemClass||null,rank:row.Rank||null});
   byConstr.set(row.ConstrIndex,list);
 }
 const out=[];for(const row of all){const id=row.ConstrIndex;if(!id)continue;for(const lemma of new Set(lexemes(row.KeyLexemes))){const m=oneOrAmbiguous(index,lemma);if(!m.entry_candidates.length)continue;
  out.push({source:'framebank',source_record_id:String(id),candidate_type:'valency_pattern',anchor_lemma:lemma,...m,
   pattern:row.ConstrPattern||null,slots:byConstr.get(String(id))||[],review_status:'suggested',usable_for_generation:false});
 }}return out;
}
const WIKIDATA_PROPERTIES={P279:'is_a',P31:'instance_of',P361:'part_of',P527:'has_part',P186:'made_of',P1056:'produces',P366:'used_for'};
function wikidataProposals(entityJson,mappings){
 const mappingByQ=new Map();for(const m of mappings){if(!/^Q[1-9]\d*$/.test(m.qid)||!m.entry_id)throw Error('Invalid Wikidata mapping');const a=mappingByQ.get(m.qid)||[];a.push(m.entry_id);mappingByQ.set(m.qid,a);}
 const out=[];for(const [qid,entity] of Object.entries(entityJson.entities||{})){
  const src=mappingByQ.get(qid)||[];if(src.length!==1)continue;
  for(const [prop,type] of Object.entries(WIKIDATA_PROPERTIES))for(const claim of entity.claims?.[prop]||[]){
   if(claim.rank==='deprecated')continue;
   const targetQ=claim.mainsnak?.datavalue?.value?.id,targets=mappingByQ.get(targetQ)||[];
   if(targets.length!==1||src[0]===targets[0])continue;
   out.push({source:'wikidata',source_record_id:qid+':'+prop+':'+targetQ,candidate_type:'semantic_relation',
     relation_type:type,subject_id:src[0],object_id:targets[0],wikidata_subject:qid,wikidata_object:targetQ,
     review_status:'suggested',usable_for_generation:false});
  }
 }return out;
}
function dedupe(items){const seen=new Set();return items.filter(x=>{const key=x.source+'|'+x.source_record_id+'|'+(x.entry_id||x.anchor_lemma||x.subject_id+'|'+x.object_id);if(seen.has(key))return false;seen.add(key);return true;});}
function download(url,remaining=3){return new Promise((resolve,reject)=>{const req=https.get(url,{headers:{'User-Agent':'zabavograd-linguistics-import/1.0','Accept':'text/plain,application/json'}},r=>{if([301,302,303,307,308].includes(r.statusCode)&&r.headers.location&&remaining){r.resume();return resolve(download(new URL(r.headers.location,url).href,remaining-1));}if(r.statusCode!==200){r.resume();return reject(Error('HTTP '+r.statusCode+' '+url));}const chunks=[];let bytes=0;r.on('data',chunk=>{bytes+=chunk.length;if(bytes>40*1024*1024){req.destroy(Error('Source too large'));return;}chunks.push(chunk);});r.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));r.on('error',reject);});req.setTimeout(30000,()=>req.destroy(Error('Source request timeout')));req.on('error',reject);});}
async function collect({source,fetchRemote=false,root=process.cwd(),mappingFile=null}){
 const db=JSON.parse(fs.readFileSync(path.join(root,'outputs/library-v2.json'),'utf8'));
 const entries=db.entries||[];let suggestions=[],inputs=[];
 const dir=path.join(root,'.cache','linguistic-sources');fs.mkdirSync(dir,{recursive:true});
 if(source==='wikidata'){
  if(!mappingFile)throw Error('Wikidata requires explicit reviewed QID mappings (--mapping FILE)');
  const mappings=JSON.parse(fs.readFileSync(mappingFile,'utf8'));if(!Array.isArray(mappings)||!mappings.length)throw Error('Mapping must be a non-empty array');
  if(new Set(mappings.map(m=>m.entry_id)).size!==mappings.length)throw Error('Duplicate local entry IDs in QID mapping');
  const ids=new Set(entries.map(e=>e.id));if(mappings.some(m=>!ids.has(m.entry_id)))throw Error('Unknown local entry ID in QID mapping');
  const payload={entities:{}};for(const qid of [...new Set(mappings.map(m=>m.qid))]){const file=path.join(dir,'wikidata-'+qid+'.json');if(fetchRemote)fs.writeFileSync(file,await download(SOURCES.wikidata.endpoint+qid+'.json'));if(!fs.existsSync(file))throw Error('Missing cached Wikidata entity '+qid+' (use --fetch)');const data=JSON.parse(fs.readFileSync(file,'utf8'));Object.assign(payload.entities,data.entities||{});inputs.push({file:path.relative(root,file),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});}
  suggestions=wikidataProposals(payload,mappings);
 }else if(source==='constructicon'||source==='framebank'){
  const def=SOURCES[source];const texts=[];
  for(const file of def.files){const dest=path.join(dir,source+'-'+file);if(fetchRemote)fs.writeFileSync(dest,await download(def.root+def.commit+'/'+file));if(!fs.existsSync(dest))throw Error('Missing '+dest+' (use --fetch)');const bytes=fs.readFileSync(dest);inputs.push({file:path.relative(root,dest),sha256:crypto.createHash('sha256').update(bytes).digest('hex')});texts.push(bytes.toString('utf8'));}
  suggestions=source==='constructicon'?constructiconProposals(texts[0],entries):framebankProposals(texts[0],texts[1],entries);
 }else throw Error('Unknown source '+source);
 return {schema:'linguistic_suggestions_v1',source,license:SOURCES[source].license,source_revision:SOURCES[source].commit||'per-QID snapshot',created_at:new Date().toISOString(),inputs,
   purpose:'review_only',automatic_changes_to_master:false,records:dedupe(suggestions)};
}
async function main(argv=process.argv.slice(2)){
 const option=n=>argv.indexOf(n)>=0?argv[argv.indexOf(n)+1]:null;
 const source=option('--source');if(!source||!SOURCES[source])throw Error('Choose --source constructicon|framebank|wikidata');
 if(source==='framebank'&&!argv.includes('--accept-gpl-review-only'))throw Error('FrameBank is GPL-3.0; for research-only local proposals add --accept-gpl-review-only. Do not distribute derived data without license review.');
 const result=await collect({source,fetchRemote:argv.includes('--fetch'),mappingFile:option('--mapping')});
 const file=path.join(process.cwd(),'.local','linguistic-sources',source+'-suggestions.json');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
 process.stdout.write(JSON.stringify({source,records:result.records.length,linkedByUnambiguousLemma:result.records.filter(r=>r.entry_id).length,needsSenseReview:result.records.filter(r=>r.match_status==='ambiguous_or_missing').length,output:file},null,2)+'\n');
}
if(require.main===module)main().catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1;});
module.exports={SOURCES,parseDelimited,lexemes,constructiconProposals,framebankProposals,wikidataProposals,dedupe,collect};
