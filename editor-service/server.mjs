import http from 'node:http';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {makeBridge} from './modular-bridge.mjs';
import {makeReadCache} from './modular-read-cache.mjs';
const modularRehearsal=true;
const repo='afevina-lab/zabavograd-demo',sessions=new Map(),states=new Map();
const readCache=modularRehearsal?makeReadCache({repo}):null;
if(readCache)process.on('exit',()=>readCache.close());
const origin=process.env.EDITOR_ORIGIN||'https://afevina-lab.github.io';
const editor=process.env.EDITOR_URL||origin+'/zabavograd-demo/editor/';
const url=process.env.SERVICE_URL,client=process.env.GITHUB_CLIENT_ID,secret=process.env.GITHUB_CLIENT_SECRET;
const rand=()=>crypto.randomBytes(32).toString('base64url');
function err(msg,code=400){throw Object.assign(Error(msg),{status:code})}
async function github(token,path,body,method){const r=await fetch('https://api.github.com'+path,{method:method||(body?'POST':'GET'),headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json','User-Agent':'Zabavograd-Library-Editor'},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)err(d.message||'Ошибка GitHub',r.status);return d}
function analyze(entries){return new Promise((resolve,reject)=>{const p=spawn(process.env.PYTHON||'python3',[new URL('./morphology.py',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],{stdio:['pipe','pipe','pipe']});let out='';const timer=setTimeout(()=>{p.kill();reject(Error('Время анализа истекло'))},60000);p.stdout.on('data',c=>{out+=c;if(out.length>2000000)p.kill()});p.stderr.resume();p.on('error',reject);p.on('close',code=>{clearTimeout(timer);try{if(code)throw Error('Анализатор недоступен. Проверьте установку pymorphy3.');resolve(JSON.parse(out))}catch(e){reject(e)}});p.stdin.end(JSON.stringify(entries))})}
http.createServer(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Referrer-Policy','no-referrer');if(req.headers.origin===origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS')}
const send=d=>res.end(JSON.stringify(d));const redirect=to=>{res.writeHead(302,{Location:to});res.end()};
try{const u=new URL(req.url,'http://localhost');if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}
if(u.pathname==='/health')return send({ok:true,configured:Boolean(url&&client&&secret),modular_rehearsal:modularRehearsal,cached_read:modularRehearsal});
if(u.pathname==='/auth/login'){if(!url||!client||!secret)err('Авторизация ещё не настроена',503);const appState=u.searchParams.get('state');if(!/^[\w-]{20,100}$/.test(appState||''))err('Недопустимый state');const state=rand(),verifier=rand();states.set(state,{appState,verifier,until:Date.now()+600000});const params=new URLSearchParams({client_id:client,redirect_uri:url+'/auth/callback',scope:'public_repo',state,code_challenge:crypto.createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});return redirect('https://github.com/login/oauth/authorize?'+params)}
if(u.pathname==='/auth/callback'){const state=states.get(u.searchParams.get('state'));states.delete(u.searchParams.get('state'));if(!state||state.until<Date.now())err('Вход устарел. Попробуйте снова.');const r=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:client,client_secret:secret,code:u.searchParams.get('code'),redirect_uri:url+'/auth/callback',code_verifier:state.verifier})});const d=await r.json();if(!d.access_token)err('GitHub не разрешил вход',401);const access=await github(d.access_token,`/repos/${repo}`);if(!access.permissions?.push)err('Нужны права записи в репозиторий Забавограда',403);const id=rand();sessions.set(id,{token:d.access_token,until:Date.now()+3600000,busy:false});return redirect(editor+'#'+new URLSearchParams({session:id,state:state.appState}))}
if(req.headers.origin!==origin)err('Недопустимый источник запроса',403);const session=sessions.get((req.headers.authorization||'').replace(/^Bearer /,''));if(!session||session.until<Date.now())err('Войдите через GitHub',401);
if(u.pathname.startsWith('/api/modular/')){
 if(!modularRehearsal)err('Модульный режим не включён',404);
 const bridge=makeBridge({repo,request:(path,body,method)=>github(session.token,path,body,method)});
 if(u.pathname==='/api/modular/info'&&req.method==='GET')return send(await bridge.info());
 if(u.pathname==='/api/modular/result'&&req.method==='GET')return send(await bridge.result(u.searchParams.get('ticket')));
 const cachedRead=u.pathname==='/api/modular/read';
 const kind=cachedRead||u.pathname==='/api/modular/query'?'query':u.pathname==='/api/modular/edit'?'edit':null;
 if(req.method!=='POST'||!kind)err('Неизвестный адрес',404);
 if(session.busy)err('Запрос уже отправляется',409);
 session.busy=true;try{
  let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>64*1024)err('Слишком большой запрос',413);chunks.push(c)}
  let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{err('Некорректный JSON')}
  if(cachedRead)return send(await readCache.query((p)=>github(session.token,p),body));
  const result=await bridge.submit(kind,body);res.statusCode=202;return send(result);
 }finally{session.busy=false}
}
if(u.pathname==='/api/analyze'&&req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>65536)err('Слишком большой запрос',413)}const body=JSON.parse(raw);if(!Array.isArray(body.entries)||body.entries.length>50||body.entries.some(e=>typeof e.lemma!=='string'||e.lemma.length>100||typeof e.id!=='string'))err('За один раз можно проверить до 50 слов');return send(await analyze(body.entries))}
err('Неизвестный адрес',404);
}catch(e){res.statusCode=e.status||500;send({error:e.message})}}).listen(Number(process.env.PORT||4181),'0.0.0.0');
setInterval(()=>{for(const [k,v] of sessions)if(v.until<Date.now())sessions.delete(k);for(const [k,v] of states)if(v.until<Date.now())states.delete(k)},60000).unref();
