import {connectEditor} from './editor-connection.mjs';
import {createModularClient} from './modular-client.mjs';
const fields=['/meaning','/kind','/part_of_speech','/selection/base_weight','/categories','/illustrations/senses','/phonetic_tags/status','/morphology/status','/morphology/data/diminutive','/morphology/data/plural_nominative','/morphology/data/review_status'];
const weightPath='/selection/base_weight';
const PAGE=36;
export function searchOptions({text='',category='',kind='',missing='',page=0}={}){
 const q={limit:PAGE,offset:page*PAGE},s=text.trim();
 if(s.startsWith('id:')){if(!s.slice(3).trim())throw Error('Укажите ID после id:');q.id=s.slice(3).trim();}
 else if(s)q.prefix=s;
 if(category)q.category=category;
 if(kind)q.kind=kind;
 if(missing==='images')q.has_image=false;
 if(missing==='phonetic_tags')q.stored_phonetics=false;
 return q;
}
export async function startModularEditor({document=globalThis.document,window=globalThis.window,connection,client}={}){
 const $=id=>document.getElementById(id),say=s=>$('state').textContent=s;
 const conn=connection??connectEditor({document,window}),c=client??createModularClient(conn.api);
 let page=0,total=0,selected=null,row=null,waiting=null,review=null,draft=new Map(),locked=false,ready=false;
 const val=(r,p)=>r.fields?.[p]?.value;
 const add=(el,tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;el.append(n);return n};
 const disable=ids=>ids.forEach(id=>$(id).hidden=true);
 const key=(id,p)=>id+'\0'+p;
 function controls(){
  const freeze=locked||!!waiting||!!review;
  for(const id of ['search','category','kind','missing'])$(id).disabled=!ready||locked;
  $('prev').disabled=!ready||locked||page===0;
  $('next').disabled=!ready||locked||(page+1)*PAGE>=total;
  $('save').disabled=!ready||locked||(!draft.size&&!waiting&&!review);
  $('save').textContent=waiting?'Проверить результат':review?'Открыть проверку':'Предпросмотр изменений';
  $('undo').disabled=freeze||!selected||![...draft.values()].some(o=>o.id===selected);
  $('export').disabled=!draft.size&&!waiting&&!review;
  $('submit').disabled=locked||!review||review.status!=='preview_not_validated_or_approved';
  for(const n of $('fields').querySelectorAll('input,select'))n.disabled=freeze||n.dataset.protected==='1';
 }
 async function task(fn){if(locked)return;locked=true;controls();try{return await fn()}catch(e){say(e.message);window.alert(e.message)}finally{locked=false;controls()}}
 function hideUnsupported(){
  disable(['add','branch','analyze','import','pickCategory','assign','analyzeOne','addRelation','applyJson','sort','direction']);
  for(const id of ['pickCategory','message'])$(id).closest('label')?.setAttribute('hidden','');
  for(const b of document.querySelectorAll('nav button'))if(b.dataset.tab==='links')b.hidden=true;
  $('missing').replaceChildren();
  for(const [value,label] of [['','Все карточки'],['images','Без изображений'],['phonetic_tags','Без сохранённой фонетики']]){const opt=add($('missing'),'option',label);opt.value=value;}
  $('search').placeholder='Начало слова или id:точный-ID';
  $('empty').querySelector('p').textContent='Экспериментальная библиотека: поиск по индексу, просмотр полей и изменение веса. Кандидаты не меняют сайт.';
  document.querySelector('aside .hint').textContent='Источник: отдельный интеграционный снимок. Без загрузки всей библиотеки в браузер.';
  $('basic').querySelector('p.hint').textContent='Фонетика и формы доступны для просмотра. Их изменение требует отдельной проверки.';
  $('all').querySelector('p.hint').textContent='Выбранные поля карточки, только чтение. Полный источник и архив не загружаются.';
  $('json').readOnly=true;$('tree').replaceChildren();
  $('cancel').textContent='Закрыть';
 }
 function options(el,values,label){
  el.replaceChildren();const empty=add(el,'option',label);empty.value='';
  for(const value of values){const n=add(el,'option',value);n.value=value;}
 }
 async function loadList(){
  const q=searchOptions({text:$('search').value,category:$('category').value,kind:$('kind').value,missing:$('missing').value,page});
  const r=(await c.cachedQuery('sqlite',q)).report;
  total=r.total;$('count').textContent=String(total);$('page').textContent=(page+1)+' / '+Math.max(1,Math.ceil(total/PAGE));
  $('cards').replaceChildren();
  for(const e of r.rows){
   const card=add($('cards'),'button');card.className='card'+(selected===e.id?' selected':'');card.dataset.id=e.id;
   add(card,'div',e.illustrations?'▧':'◇').className='thumb';
   add(card,'strong',e.lemma+([...draft.values()].some(o=>o.id===e.id)?' •':''));
   add(card,'small',e.meaning||'');add(card,'small','Вес '+(draft.get(key(e.id,weightPath))?.value??e.weight)+' · Изображений '+e.illustrations);
   card.onclick=()=>task(()=>inspect(e.id));
  }
  if(!r.rows.length)add($('cards'),'p','Нет слов по выбранным условиям.');
  say('Снимок '+r.source_sha256.slice(0,12)+' · черновик: '+draft.size);
 }
 function drawDetail(){
  $('empty').hidden=true;$('detail').hidden=false;$('heading').textContent=row.lemma;$('identity').textContent=row.id;
  $('fields').replaceChildren();
  for(const [label,p] of [['Значение','/meaning'],['Часть речи','/part_of_speech'],['Фонетика','/phonetic_tags/status'],['Морфология','/morphology/status'],['Уменьшительная форма','/morphology/data/diminutive'],['Множественное число','/morphology/data/plural_nominative']]){
   const field=add($('fields'),'div');add(field,'strong',label+': ');add(field,'span',String(val(row,p)??'—'));
  }
  const label=add($('fields'),'label','Базовый вес'),select=add(label,'select');
  for(const n of [0,10,20,30,50,70,100]){const o=add(select,'option',String(n));o.value=String(n);}
  const saved=val(row,weightPath);
  if(row.fields?.[weightPath]?.exists&&[0,10,20,30,50,70,100].includes(saved)){
   select.value=String(draft.get(key(row.id,weightPath))?.value??saved);
   select.onchange=()=>{
    try{
     if(locked||waiting||review)throw Error('Сначала завершите проверку');
     const op=c.operation(row,weightPath,Number(select.value)),k=key(row.id,weightPath);
     if(op.value===op.expect.value)draft.delete(k);
     else{if(!draft.has(k)&&draft.size>=30)throw Error('Не более 30 изменений в одном пакете');draft.set(k,op);}
     say('Черновик: '+draft.size+' изменений');
    }catch(e){window.alert(e.message);select.value=String(draft.get(key(row.id,weightPath))?.value??saved)}
    controls();
   };
  }else{select.disabled=true;select.dataset.protected='1';add(label,'small','Вес требует отдельной проверки.');}
  $('memberships').replaceChildren();
  for(const cat of val(row,'/categories')??[])add($('memberships'),'div',cat.path+(cat.default_selection?' · основная выдача':'')).className='membership';
  $('preview').replaceChildren();
  for(const sense of val(row,'/illustrations/senses')??[])for(const v of sense.variants??[]){
   if(typeof v.src!=='string'||!/^\/assets\/[a-zA-Z0-9_./-]+$/.test(v.src)||v.src.includes('..'))continue;
   const img=add($('preview'),'img');img.src='https://afevina-lab.github.io/zabavograd-demo'+v.src;img.alt=v.label??row.lemma;
  }
  $('json').value=JSON.stringify(row,null,2);controls();
 }
 async function inspect(id){
  const r=(await c.cachedQuery('inspect',{id,fields,limit:1})).report;
  if(r.rows.length!==1||r.rows[0].id!==id)throw Error('Карточка не найдена в текущем снимке');
  row=r.rows[0];selected=id;drawDetail();
  for(const el of $('cards').querySelectorAll('[data-id]'))el.classList.toggle('selected',el.dataset.id===id);
 }
 function showReview(){
  $('summary').replaceChildren();add($('summary'),'p',review.status==='preview_not_validated_or_approved'?'Предварительный просмотр. Библиотека не изменена.':'Проверенный кандидат. Библиотека не изменена.');
  for(const change of review.changes??[])add($('summary'),'p',(change.lemma??change.id)+' · '+JSON.stringify(change.before?.value??null)+' → '+JSON.stringify(change.after?.value??null));
  add($('summary'),'p','Контрольная сумма: '+review.preview_sha256);
  if(review.result_branch&&/^library-edit-result\/web-[a-f0-9]{24}-[a-f0-9]{12}$/.test(review.result_branch)){
   const link=add($('summary'),'a','Открыть пакет в GitHub');link.href='https://github.com/afevina-lab/zabavograd-demo/tree/'+review.result_branch;link.target='_blank';link.rel='noopener';
  }
  $('submit').textContent='Сформировать проверенный кандидат';
  if(!$('review').open)$('review').showModal();controls();
 }
 $('save').onclick=()=>task(async()=>{
  if(waiting){
   const result=await c.collect(waiting.ticket);
   if(result.status==='result_not_available'){say('Результат ещё не готов. Номер: '+waiting.ticket);return;}
   review={...result.report,result_branch:result.result_branch};waiting=null;
   if(review.status!=='preview_not_validated_or_approved')draft.clear();
   showReview();return;
  }
  if(review){showReview();return;}
  if(!draft.size)return;
  waiting=await c.requestPreview({operations:[...draft.values()]});
  say('Запрос отправлен. Нажмите «Проверить результат».');
 });
 $('submit').onclick=()=>task(async()=>{
  if(!review||review.status!=='preview_not_validated_or_approved')return;
  waiting=await c.requestCandidate(review.preview_sha256);review=null;$('review').close();
  say('Кандидат запрошен. Нажмите «Проверить результат».');
 });
 $('cancel').onclick=()=>$('review').close();
 const reset=add(document.querySelector('aside'),'button','Сбросить черновик / ожидание');
 reset.onclick=()=>task(async()=>{
  if((draft.size||waiting||review)&&!window.confirm('Сбросить локальный черновик и ожидание? Уже отправленные запросы GitHub не отменяются.'))return;
  if(waiting)c.abandon(waiting.ticket);
  waiting=null;review=null;draft.clear();row=null;selected=null;$('detail').hidden=true;$('empty').hidden=false;
  if($('review').open)$('review').close();
  await initialize(true);
 });
 $('undo').onclick=()=>{if(locked||waiting||review)return;for(const [k,o] of draft)if(o.id===selected)draft.delete(k);if(row)drawDetail();say('Черновик: '+draft.size);};
 $('export').onclick=()=>{
  const blob=new Blob([JSON.stringify({format:'zabavograd-modular-draft-v1',source_sha256:c.state().source_sha256,operations:[...draft.values()],waiting,review},null,2)],{type:'application/json'});
  const url=window.URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='zabavograd-modular-draft.json';a.click();setTimeout(()=>window.URL.revokeObjectURL(url),1000);
 };
 for(const id of ['search','category','kind','missing'])$(id).onchange=()=>task(async()=>{page=0;await loadList();});
 $('prev').onclick=()=>task(async()=>{if(page>0){page--;await loadList();}});
 $('next').onclick=()=>task(async()=>{if((page+1)*PAGE<total){page++;await loadList();}});
 document.querySelector('nav').onclick=e=>{
  const tab=e.target.dataset.tab;if(!['basic','all'].includes(tab))return;
  for(const el of document.querySelectorAll('.tab'))el.hidden=el.id!==tab;
  for(const el of document.querySelectorAll('nav button'))el.classList.toggle('active',el===e.target);
 };
 window.onbeforeunload=e=>{if(draft.size||waiting||review){e.preventDefault();e.returnValue='';}};
 async function initialize(fresh=false){
  ready=false;controls();
  if(!conn.service||!conn.session){say('Модульный режим: подключите сервер и войдите через GitHub.');return;}
  const health=await conn.api('/health');
  if(!health.modular_rehearsal||!health.cached_read)throw Error('Сервер не поддерживает модульный режим. Полная библиотека не будет загружена.');
  const r=(await c.cachedQuery('inventory',{},fresh)).report;
  options($('category'),r.category_paths??[],'Все ветки');options($('kind'),r.kinds??[],'Все типы');
  $('stats').textContent=r.entries+' слов · '+r.categories+' веток · '+r.relations+' связей';
  $('login').textContent='GitHub подключён';page=0;ready=true;await loadList();
 }
 hideUnsupported();controls();await task(()=>initialize());
}
