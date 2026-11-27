import {clone,validate,compile} from '../../src/scene-engine/engine.mjs';

const key = id => `zabavograd.studio.v2.${id}`;
const dataURL = name => {const url=new URL(`../../data/${name}`, import.meta.url);url.searchParams.set('v','20261127-4c');return url;};
const read = id => JSON.parse(localStorage.getItem(key(id)) || 'null');
const write = (id, value) => localStorage.setItem(key(id), JSON.stringify(value));
export const browserMode = document.querySelector('meta[name="studio-storage"]')?.content === 'browser' && new URLSearchParams(location.search).get('storage') !== 'files';
export const assetURLs = new Map();
let packagedRegistry;
const importedAssets = [];
let hydrated;
function database() {
  return new Promise((resolve,reject)=>{
    const open=indexedDB.open('zabavograd-studio-resources',1);
    open.onupgradeneeded=()=>open.result.createObjectStore('assets',{keyPath:'path'});
    open.onsuccess=()=>resolve(open.result);
    open.onerror=()=>reject(open.error);
  });
}
async function hydrate() {
  if(hydrated)return hydrated;
  hydrated=(async()=>{
    const db=await database();
    try{const rows=await new Promise((resolve,reject)=>{const req=db.transaction('assets').objectStore('assets').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});for(const row of rows){assetURLs.set(row.path,row.dataURL);importedAssets.push(row);}}
    finally{db.close();}
  })();
  return hydrated;
}

async function storeResources(resources) {
  const db=await database();
  try {
    await new Promise((resolve,reject)=>{
      const tx=db.transaction('assets','readwrite');
      for(const resource of resources) tx.objectStore('assets').put(resource);
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error||Error('Не удалось сохранить рисунки в браузере.'));
    });
  } finally {db.close();}
  for(const resource of resources) {
    assetURLs.set(resource.path,resource.dataURL);
    const existing=importedAssets.findIndex(a=>a.path===resource.path);
    if(existing<0) importedAssets.push(resource); else importedAssets[existing]=resource;
  }
}

export async function uploadImage(file) {
  if(file.size>20*1024*1024)throw Error('Рисунок «'+file.name+'» больше 20 МБ. Уменьшите его перед загрузкой.');
  const header=new Uint8Array(await file.slice(0,12).arrayBuffer());
  const webp=String.fromCharCode(...header.slice(0,4))==='RIFF' && String.fromCharCode(...header.slice(8,12))==='WEBP';
  const png=header[0]===137 && header[1]===80 && header[2]===78 && header[3]===71;
  const jpeg=header[0]===255 && header[1]===216 && header[2]===255;
  if(!webp&&!png&&!jpeg)throw Error('Поддерживаются PNG, JPG и WebP. Файл «'+file.name+'» не является таким рисунком.');
  let bitmap;
  try {bitmap=await createImageBitmap(file);}
  catch {throw Error('Не удалось открыть рисунок «'+file.name+'». Возможно, файл повреждён.');}
  try {
    const {width,height}=bitmap;
    if(!width||!height||width>8192||height>8192||width*height>24_000_000)throw Error('Рисунок слишком большой. Максимум — 8192 по стороне и 24 миллиона пикселей.');
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(bitmap,0,0);
    const rgba=context.getImageData(0,0,width,height).data;
    let left=width,top=height,right=-1,bottom=-1,alpha=false;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const a=rgba[(y*width+x)*4+3];
      if(a<255)alpha=true;
      if(a){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    }
    const blob=webp?file:await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.95));
    if(!blob)throw Error('Браузер не смог преобразовать рисунок в WebP.');
    if(!webp&&blob.type!=='image/webp')throw Error('Этот браузер не поддерживает преобразование в WebP. Загрузите готовый WebP.');
    if(blob.size>20*1024*1024)throw Error('После преобразования рисунок больше 20 МБ. Уменьшите его размеры.');
    const bytes=await blob.arrayBuffer(),checksum=await sha256(bytes);
    const dataURL=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(new Blob([bytes],{type:'image/webp'}));});
    const resource={id:'uploaded-'+checksum.slice(0,16),name:file.name.replace(/\.[^.]+$/,'').slice(0,100)||'Мой рисунок',path:`assets/imported/${checksum}.webp`,width,height,alpha,sha256:checksum,version:1,contentBounds:right<0?{x:0,y:0,width:0,height:0}:{x:left,y:top,width:right-left+1,height:bottom-top+1},contentBoundsStatus:'alpha-measured',sockets:{},dataURL};
    await storeResources([resource]);
    return resource;
  } finally {bitmap.close();}
}

export async function installDocument(document) {
  if(document.format!=='zabavograd-scene-document'||document.documentVersion!==1)throw Error('Неизвестный формат документа сцены.');
  const scene=clone(document.scene);
  checked(scene);
  const resources=[];
  const remap=new Map();
  for(const resource of document.resources||[]){
    if(!/^data:image\/webp;base64,[a-zA-Z0-9+/=]+$/.test(resource.dataURL)||resource.dataURL.length>28_000_000)throw Error('Неверный формат рисунка или рисунок больше 20 МБ.');
    const bytes=await fetch(resource.dataURL).then(r=>r.arrayBuffer());
    if(await sha256(bytes)!==resource.sha256)throw Error('Контрольная сумма рисунка не совпала: '+resource.path);
    const path=`assets/imported/${resource.sha256}.webp`;
    remap.set(resource.path,path);
    resources.push({...resource,path});
  }
  for(const node of scene.nodes)if(node.asset){if(!remap.has(node.asset))throw Error('В документе нет рисунка '+node.asset);node.asset=remap.get(node.asset);}
  for(const variant of scene.variants||[])for(const node of Object.values(variant.nodes||{}))if(node.asset){if(!remap.has(node.asset))throw Error('В документе нет рисунка варианта');node.asset=remap.get(node.asset);}
  await storeResources(resources);
  return {scene,resources};
}

async function packaged(name) {
  const response = await fetch(dataURL(name));
  if (!response.ok) throw Error('Не удалось загрузить материалы мастерской. Обновите страницу.');
  return response.json();
}

function checked(scene) {
  const errors = validate(scene);
  if (errors.length) throw Error(errors.join('; '));
  return [[1920,1080],[1366,768],[1024,768],[768,1024],[390,844],[844,390]].map(([width,height]) => {
    const layout = compile(scene,width,height,{reducedMotion:true});
    return {width,height,variant:layout.variant,warnings:layout.warnings};
  });
}

export async function request(url, body) {
  if (!browserMode) {
    const response = await fetch(url, body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {});
    const data = await response.json();
    if (!response.ok) throw Error(data.error || response.statusText);
    return data;
  }
  if (url === '/api/scenes') {
    packagedRegistry ||= await packaged('registry.json');
    const registry = clone(packagedRegistry);
    for (const item of read('locations') || []) {
      if (!registry.locations.some(s => s.id === item.id)) registry.locations.push(item);
      registry.compatibility[item.id] = Object.keys(registry.themes);
    }
    return registry;
  }
  if (url === '/api/assets') {await hydrate();const catalog=await packaged('assets.json');for(const asset of catalog)if(asset.dataURL)assetURLs.set(asset.path,asset.dataURL);return [...catalog,...importedAssets];}
  if (url === '/api/scenes/create') {
    checked(body.scene);
    const registry = await request('/api/scenes');
    if (registry.locations.some(s => s.id === body.scene.id)) throw Error('Локация с таким ID уже есть.');
    const locations = read('locations') || [];
    locations.push({id:body.scene.id,name:body.scene.name});
    const record = {scene:clone(body.scene),etag:crypto.randomUUID(),versions:[]};
    write(body.scene.id,record);
    write('locations',locations);
    return {...record,registry:await request('/api/scenes')};
  }
  const match = url.match(/^\/api\/scenes\/([a-zA-Z][a-zA-Z0-9_-]{0,79})(?:\/(save|approve|versions|restore))?$/);
  if (!match) throw Error('Неизвестная операция.');
  const [,id,action] = match;
  let record = read(id);
  if (!record) record = {scene:await packaged(`${id}.json`),etag:'initial-'+id,versions:[]};
  if (!action) return clone(record);
  if (action === 'versions') return record.versions.map(v => v.id).reverse();
  if (body.etag !== record.etag) throw Error('Эта сцена изменена в другой вкладке. Сначала скачайте свои правки, затем обновите страницу.');
  if (action === 'restore') {
    const version = record.versions.find(v => v.id === body.version);
    if (!version) throw Error('Версия не найдена.');
    record.scene = clone(version.scene);
  } else {
    const report = checked(body.scene);
    if (action === 'approve' && report.some(r => r.warnings.length)) throw Error('Перед утверждением исправьте предупреждения в проверке размеров.');
    record.scene = clone(body.scene);
    if (action === 'approve') {
      const id = 'v-'+Date.now();
      record.versions.push({id,scene:clone(body.scene),report});
      record.version = id;
    }
  }
  record.etag = crypto.randomUUID();
  write(id,record);
  return clone(record);
}

export function assetURL(path) {
  return assetURLs.get(path) || new URL('../../'+path,import.meta.url).href;
}

export async function sha256(bytes) {
  const hash = await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}

/** Self-contained handoff document: scene code + exact WebP bytes, no credentials or editor history. */
export async function makeDocument(scene, assets, {onProgress=()=>{}}={}) {
  const checks = checked(scene);
  const paths = new Set(scene.nodes.map(n=>n.asset).filter(Boolean));
  for (const variant of scene.variants || []) for (const node of Object.values(variant.nodes || {})) if (node.asset) paths.add(node.asset);
  let completed=0;
  const resources = await Promise.all([...paths].map(async path => {
    const response = await fetch(assetURL(path),{cache:'force-cache',signal:AbortSignal.timeout(20000)});
    if (!response.ok) throw Error('Не удалось включить ресурс '+path);
    const bytes = await response.arrayBuffer();
    const dataURL = await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(new Blob([bytes],{type:'image/webp'}));});
    assetURLs.set(path,dataURL);
    const resource={...assets.find(a=>a.path===path),path,sha256:await sha256(bytes),dataURL};
    onProgress(++completed,paths.size);
    return resource;
  }));
  const result = {
    format:'zabavograd-scene-document',documentVersion:1,engineVersion:1,
    title:scene.name,createdAt:new Date().toISOString(),
    instructions:'Для Codex: проверь SHA-256 ресурсов, извлеки WebP по указанным путям, вставь scene в публичный реестр локаций и подключи общий scene-engine. Не меняй тему интерфейса и правила игр. Показать сцену на контрольных размерах до выпуска. Этот документ сам по себе не публикует сцену.',
    scene:clone(scene),resources,checks,
  };
  if(new Blob([JSON.stringify(result,null,2)]).size>60*1024*1024)throw Error('Документ больше 60 МБ. Уменьшите размеры загруженных рисунков перед передачей.');
  return result;
}
