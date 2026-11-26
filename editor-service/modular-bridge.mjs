import crypto from 'node:crypto';
export const SOURCE_REF='refactor/library-modular-integration-20261126';
const kinds={query:{request:'library-sqlite-request',result:'library-sqlite-result',file:'editorial/requests/library-request.json'},edit:{request:'library-edit-request',result:'library-edit-result',file:'editorial/requests/library-edit.json'}};
const commands=new Set(['sqlite','find','inspect','select','gaps','inventory']);
const hash=/^[a-f0-9]{64}$/;
const commitHash=/^[a-f0-9]{40}$/;
function fail(msg,status=400){throw Object.assign(Error(msg),{status})}
function check(condition,msg,status){if(!condition)fail(msg,status)}
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
function keys(x,allowed){check(obj(x),'Ожидается объект запроса');check(Object.keys(x).every(k=>allowed.includes(k)),'Неизвестное поле запроса')}
export function validateEnvelope(kind,body){
 check(Object.hasOwn(kinds,kind),'Неизвестный тип запроса');
 check(obj(body)&&Buffer.byteLength(JSON.stringify(body))<=64*1024,'Запрос превышает 64 КиБ',413);
 check(body.version===1,'Требуется версия запроса 1');
 if(kind==='query'){
  keys(body,['version','mode','command','options','source_sha256']);
  check(body.mode==='query'&&commands.has(body.command),'Допускаются только запросы чтения');
  check(body.options===undefined||obj(body.options),'Недопустимые параметры поиска');
  if(body.options?.limit!==undefined)check(Number.isInteger(body.options.limit)&&body.options.limit>=1&&body.options.limit<=40,'Лимит от 1 до 40');
  if(body.source_sha256!==undefined)check(typeof body.source_sha256==='string'&&hash.test(body.source_sha256),'Недопустимая версия источника');
 }else{
  keys(body,['version','mode','source_sha256','preview_sha256','operations','semantic_operations','review_decisions','import_operations']);
  check(['preview','candidate'].includes(body.mode)&&typeof body.source_sha256==='string'&&hash.test(body.source_sha256),'Требуется точная версия источника');
  check(body.mode==='candidate'?typeof body.preview_sha256==='string'&&hash.test(body.preview_sha256):body.preview_sha256===undefined,'Требуется соответствующий предварительный просмотр');
  check(Array.isArray(body.operations),'Ожидаются операции');
  const arrays=[body.operations,body.semantic_operations??[],body.review_decisions??[],body.import_operations??[]];
  check(arrays.every(Array.isArray),'Ожидаются списки операций');
  const count=arrays.reduce((n,a)=>n+a.length,0);
  check(count>=1&&count<=30,'Допускается от 1 до 30 операций');
 }
 return body;
}
export function makeBridge({request,repo,random=()=>crypto.randomBytes(12).toString('hex')}){
 const api='/repos/'+repo;
 async function info(){
  const c=await request(api+'/commits/'+encodeURIComponent(SOURCE_REF));
  check(commitHash.test(c.sha)&&commitHash.test(c.commit?.tree?.sha),'Некорректная версия GitHub',502);
  return {scope:'integration_snapshot_not_live_main',source_ref:SOURCE_REF,source_commit:c.sha,tree:c.commit.tree.sha};
 }
 async function submit(kind,body){
  validateEnvelope(kind,body);
  const k=kinds[kind],source=await info(),slug='web-'+random();
  check(/^web-[a-f0-9]{24}$/.test(slug),'Некорректный идентификатор',500);
  const branch=k.request+'/'+slug;
  const tree=await request(api+'/git/trees',{base_tree:source.tree,tree:[{path:k.file,mode:'100644',type:'blob',content:JSON.stringify(body,null,2)+'\n'}]});
  check(commitHash.test(tree.sha),'GitHub не вернул дерево',502);
  const commit=await request(api+'/git/commits',{message:'Library '+kind+' request '+slug,tree:tree.sha,parents:[source.source_commit]});
  check(commitHash.test(commit.sha),'GitHub не вернул коммит',502);
  // Separate ref creation and fast-forward reliably trigger the path-filtered push workflow.
  await request(api+'/git/refs',{ref:'refs/heads/'+branch,sha:source.source_commit});
  await request(api+'/git/refs/heads/'+branch,{sha:commit.sha,force:false},'PATCH');
  return {status:'submitted',ticket:kind+'/'+slug+'-'+commit.sha.slice(0,12),request_commit:commit.sha,request_branch:branch,source_ref:SOURCE_REF,submission_source_commit:source.source_commit,scope:source.scope};
 }
 async function result(ticket){
  const m=/^(query|edit)\/(web-[a-f0-9]{24}-[a-f0-9]{12})$/.exec(ticket??'');
  check(m,'Некорректный номер запроса');
  const branch=kinds[m[1]].result+'/'+m[2];
  let file;
  try{file=await request(api+'/contents/result.json?ref='+encodeURIComponent(branch));}
  catch(e){if(e.status===404)return {status:'result_not_available',ticket};throw e;}
  check(file.type==='file'&&file.encoding==='base64'&&typeof file.content==='string'&&Number.isInteger(file.size)&&file.size<=100*1024,'Некорректный отчёт',502);
  const raw=Buffer.from(file.content,'base64');
  check(raw.length===file.size,'Размер отчёта не совпадает',502);
  const report=JSON.parse(raw.toString('utf8'));
  check(report.scope==='integration_snapshot_not_live_main'&&commitHash.test(report.source_commit)&&commitHash.test(report.request_commit)&&report.request_commit.startsWith(m[2].slice(-12)),'Отчёт не соответствует запросу',502);
  return {status:'result_available',ticket,report,result_branch:branch};
 }
 return {info,submit,result};
}
