// Shared OAuth and authenticated transport for both editor modes.
export function connectEditor({document=globalThis.document,window=globalThis.window}={}){
 const $=id=>document.getElementById(id),local=window.localStorage,store=window.sessionStorage;
 let service=local.getItem('zg-editor-service')||'',session='';
 const say=s=>$('state').textContent=s;
 async function api(route,body){
  if(!service)throw Error('Сначала подключите собственный HTTPS-сервер редактора.');
  const r=await window.fetch(service+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const d=await r.json();if(!r.ok)throw Object.assign(Error(d.error||'Ошибка сервера'),{status:r.status});return d;
 }
 $('service').value=service;
 $('connect').onclick=()=>{
  try{
   const u=new URL($('service').value);if(u.protocol!=='https:')throw Error('Нужен адрес HTTPS');
   session='';store.removeItem('zg-editor-session');service=u.origin;local.setItem('zg-editor-service',service);
   say('Сервер подключён. Войдите через GitHub.');$('login').textContent='Войти через GitHub';
  }catch(e){window.alert(e.message)}
 };
 $('login').onclick=()=>{
  if(!service)return window.alert('Сначала укажите адрес сервера в разделе «Подключение».');
  const state=window.crypto.randomUUID();store.setItem('zg-oauth-state',state);
  window.location.href=service+'/auth/login?state='+encodeURIComponent(state);
 };
 const params=new URLSearchParams(window.location.hash.slice(1));
 if(params.has('session')){
  if(params.get('state')===store.getItem('zg-oauth-state')&&store.getItem('zg-oauth-state')){
   session=params.get('session');store.setItem('zg-editor-session',session);
  }else{store.removeItem('zg-editor-session');}
  window.history.replaceState(null,'',window.location.pathname+window.location.search);
  store.removeItem('zg-oauth-state');
 }else session=store.getItem('zg-editor-session')||'';
 return {api,get service(){return service},get session(){return session}};
}
