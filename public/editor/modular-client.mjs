// Browser-safe transport/controller for the experimental modular editor.
// No DOM dependency, no full library download, no implicit requests or writes.
const hash=/^[a-f0-9]{64}$/;
const commit=/^[a-f0-9]{40}$/;
const scope='integration_snapshot_not_live_main';
const commands=new Set(['sqlite','find','inspect','select','gaps','inventory']);
const clone=x=>structuredClone(x);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const own=(x,k)=>Object.hasOwn(x,k);
const fields=new Set(['/selection/base_weight','/morphology/data/diminutive','/morphology/data/plural_nominative']);
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
async function requestHash(body){
 const data=new TextEncoder().encode(JSON.stringify(body,null,2)+'\n');
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',data));
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
export function createModularClient(api){
 let source=null,preview=null,latest=null,busy=false;
 const jobs=new Map();
 function state(){return clone({source_sha256:source,preview,latest,busy,pending:[...jobs.values()].map(j=>({ticket:j.ticket,kind:j.kind,status:j.status}))})}
 async function exclusive(fn){
  check(!busy,'Другой запрос уже выполняется');busy=true;
  try{return await fn()}finally{busy=false}
 }
 async function submit(kind,body){
  const packet=clone(body),expected=await requestHash(packet);
  const result=await api('/api/modular/'+kind,packet);
  check(result?.status==='submitted'&&result.scope===scope&&commit.test(result.request_commit||''),'Сервер не подтвердил отправку');
  check(typeof result.ticket==='string'&&new RegExp('^'+kind+'/web-[a-f0-9]{24}-[a-f0-9]{12}$').test(result.ticket)&&result.ticket.endsWith(result.request_commit.slice(0,12)),'Неверный билет');
  check(!jobs.has(result.ticket),'Повторный билет');
  jobs.set(result.ticket,{ticket:result.ticket,commit:result.request_commit,kind,body:packet,hash:expected,status:'submitted'});
  return clone(result);
 }
 function query(command,options={},fresh=false){
  return exclusive(async()=>{
   check(commands.has(command),'Неизвестный поисковый запрос');
   check(options&&typeof options==='object'&&!Array.isArray(options),'Неверные параметры');
   check(options.limit===undefined||Number.isInteger(options.limit)&&options.limit>=1&&options.limit<=40,'Лимит от 1 до 40');
   if(fresh)check(![...jobs.values()].some(j=>j.status==='submitted'),'Сначала завершите или отмените ожидающие запросы');
   const body={version:1,mode:'query',command,options:clone(options)};
   if(!fresh&&source)body.source_sha256=source;
   const r=await submit('query',body);
   if(fresh){source=null;preview=null;latest=null;}
   return r;
  });
 }
 function cachedQuery(command,options={},fresh=false){
  return exclusive(async()=>{
   check(commands.has(command),'Неизвестный поисковый запрос');
   check(options&&typeof options==='object'&&!Array.isArray(options),'Неверные параметры');
   check(options.limit===undefined||Number.isInteger(options.limit)&&options.limit>=1&&options.limit<=40,'Лимит от 1 до 40');
   if(fresh)check(![...jobs.values()].some(j=>j.status==='submitted'),'Сначала завершите или отмените ожидающие запросы');
   const body={version:1,mode:'query',command,options:clone(options)};
   if(!fresh&&source)body.source_sha256=source;
   const expected=await requestHash(body),result=await api('/api/modular/read',body),r=result?.report;
   check(result?.status==='cached_result'&&r?.scope===scope&&r.mode==='query'&&r.command===command&&r.request_sha256===expected&&commit.test(r.source_commit||'')&&hash.test(r.source_sha256||''),'Отчёт не соответствует запросу');
   check(!body.source_sha256||body.source_sha256===r.source_sha256,'Изменилась версия источника');
   if(command!=='inventory')check(Array.isArray(r.rows)&&r.rows.length<=40,'Некорректная выборка');
   if(fresh||source!==r.source_sha256)preview=null;
   source=r.source_sha256;latest=clone(r);return clone(result);
  });
 }
 function inspect(id,paths=[...fields]){
  check(typeof id==='string'&&id.length&&id.length<=256,'Нужен точный ID');
  return query('inspect',{id,fields:paths,limit:1});
 }
 function operation(row,path,value){
  check(source&&latest?.command==='inspect'&&latest.source_sha256===source,'Сначала получите свежие поля записи');
  check(fields.has(path),'Поле пока недоступно для простого редактирования');
  check(latest.rows?.some(r=>equal(r,row)),'Запись не из последнего просмотра');
  const prior=row.fields?.[path];
  check(prior&&typeof prior.exists==='boolean'&&prior.exists===own(prior,'value'),'Нет точного предыдущего значения');
  if(path==='/selection/base_weight')check([0,10,20,30,50,70,100].includes(value),'Недопустимый вес');
  else check(typeof value==='string'&&value.trim()===value&&value.length>0&&value.length<=160,'Недопустимая словоформа');
  return clone({id:row.id,path,expect:prior,value});
 }
 function requestPreview({operations=[],semantic_operations,review_decisions,import_operations}={}){
  return exclusive(async()=>{
   check(source,'Сначала получите актуальную версию библиотеки');
   const arrays=[operations,semantic_operations??[],review_decisions??[],import_operations??[]];
   check(!import_operations?.length||(!operations.length&&!semantic_operations?.length&&!review_decisions?.length),'Импорт требует отдельного запроса');
   check(arrays.every(Array.isArray),'Нужны списки операций');
   const count=arrays.reduce((n,a)=>n+a.length,0);
   check(count>=1&&count<=30,'От 1 до 30 операций');
   check(!review_decisions?.length||(!operations.length&&!semantic_operations?.length),'Решения требуют отдельного запроса');
   check(![...jobs.values()].some(j=>j.kind==='edit'&&j.status==='submitted'),'Дождитесь результата предыдущего редакторского запроса');
   const body={version:1,mode:'preview',source_sha256:source,operations:clone(operations)};
   if(semantic_operations?.length)body.semantic_operations=clone(semantic_operations);
   if(review_decisions?.length)body.review_decisions=clone(review_decisions);
   if(import_operations?.length)body.import_operations=clone(import_operations);
   const result=await submit('edit',body);preview=null;return result;
  });
 }
 function requestCandidate(expectedPreview){
  return exclusive(async()=>{
   check(preview&&hash.test(expectedPreview||'')&&preview.preview_sha256===expectedPreview,'Требуется явное подтверждение показанного preview');
   check(preview.source_sha256===source,'Версия источника изменилась');
   check(![...jobs.values()].some(j=>j.kind==='edit'&&j.status==='submitted'),'Редакторский запрос уже ожидает результата');
   const body={version:1,mode:'candidate',source_sha256:source,preview_sha256:expectedPreview,operations:clone(preview.operations)};
   for(const k of ['semantic_operations','review_decisions','import_operations'])if(own(preview,k))body[k]=clone(preview[k]);
   return submit('edit',body);
  });
 }
 function collect(ticket){
  return exclusive(async()=>{
   const job=jobs.get(ticket);check(job?.status==='submitted','Неизвестный или завершённый запрос');
   const result=await api('/api/modular/result?ticket='+encodeURIComponent(ticket));
   check(result?.ticket===ticket,'Ответ не соответствует билету');
   if(result.status==='result_not_available')return clone(result);
   check(result.status==='result_available','Неизвестный статус ответа');
   const r=result.report;
   check(r?.scope===scope&&r.request_commit===job.commit&&r.request_sha256===job.hash&&hash.test(r.source_sha256||'')&&commit.test(r.source_commit||''),'Отчёт не соответствует запросу');
   check(!job.body.source_sha256||job.body.source_sha256===r.source_sha256,'Изменилась версия источника');
   check(!source||source===r.source_sha256,'Результаты относятся к разным версиям; обновите поиск');
   check(r.mode===job.body.mode,'Неверный режим отчёта');
   if(job.kind==='query'){
    check(r.command===job.body.command,'Неверная команда отчёта');
    if(r.command!=='inventory')check(Array.isArray(r.rows)&&r.rows.length<=40,'Некорректная выборка');
    latest=clone(r);
   }else{
    for(const k of ['operations','semantic_operations','review_decisions','import_operations'])check(equal(r[k]??[],job.body[k]??[]),'Операции отчёта не совпадают');
    check(hash.test(r.preview_sha256||'')&&hash.test(r.result_source_sha256||''),'Нет контрольных сумм результата');
    if(r.mode==='preview'){
     check(r.status==='preview_not_validated_or_approved','Некорректный статус preview');
     preview=clone(r);
    }else{
     check(r.preview_sha256===job.body.preview_sha256&&['validated_candidate_not_approved','no_changes'].includes(r.status),'Кандидат не подтверждён');
    }
   }
   source=r.source_sha256;job.status='completed';
   return clone(result);
  });
 }
 function abandon(ticket){check(!busy,'Другой запрос выполняется');const j=jobs.get(ticket);check(j?.status==='submitted','Нет ожидающего запроса');j.status='abandoned';}
 return {state,query,cachedQuery,inspect,operation,requestPreview,requestCandidate,collect,abandon};
}
