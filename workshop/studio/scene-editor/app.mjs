import {clone,validate,resolveVariant,inverse,point,merge,compile} from '../../src/scene-engine/engine.mjs';
import {renderSVG,escape} from '../../src/scene-engine/render.mjs?v=20261127-4';
import {attachGameScene} from '../../src/scene-engine/game-adapter.mjs?v=20261127-4';
import {request,browserMode,assetURL,assetURLs,makeDocument,installDocument,uploadImage} from './storage.mjs?v=20261127-4';
import {reorderedLayers,socketPosition,nextSocket,socketUsers,parseSceneCode} from './editing.mjs?v=20261127-4';
const $=id=>document.getElementById(id);
let scene,etag,saved='',history=[],future=[],selected=[],variant='auto',layout,assets=[],registry,playing=false,time=0,pan={x:0,y:0},space=false,gameAdapter;
let width=1920,height=1080,zoom=1,loadTicket=0,socketMode=null;
const status=text=>$('status').textContent=text;
const guard=fn=>async(...args)=>{try{await fn(...args);}catch(e){status(e.message);console.error(e);}};
const dirty=()=>scene&&JSON.stringify(scene)!==saved;
function current(){return resolveVariant(scene,width,height,variant).scene;}
function variantId(){return resolveVariant(scene,width,height,variant).variant;}
function checkpoint(){history.push(clone(scene));if(history.length>100)history.shift();future=[];}
function edit(fn){const before=clone(scene);try{fn();const errors=validate(scene);if(errors.length)throw Error(errors.join('; '));}catch(error){scene=before;throw error;}history.push(before);future=[];render();}
function patchNode(id,patch){const v=variantId();if(v==='base')scene.nodes=scene.nodes.map(n=>n.id===id?merge(n,patch):n);else{const target=scene.variants.find(p=>p.id===v);target.nodes??={};target.nodes[id]=merge(target.nodes[id]??{},patch);}}
async function load(id){const ticket=++loadTicket;document.body.dataset.loading='true';const controls=[...document.querySelectorAll('.workspace button,.workspace input,.workspace select')];for(const control of controls)control.disabled=true;status('Открываем сцену…');try{const data=await request('/api/scenes/'+id);if(ticket!==loadTicket)return;scene=data.scene;etag=data.etag;saved=JSON.stringify(scene);document.body.dataset.boot='ready';history=[];future=[];selected=[];variant='auto';pan={x:0,y:0};status(browserMode?'Черновик хранится в этом браузере. Для переноса скачайте документ-код.':'Локальная мастерская готова.');}finally{if(ticket===loadTicket){delete document.body.dataset.loading;for(const control of controls)control.disabled=false;render();}}}
function field(container,label,value,change,{type='number',options,step='1',inherited=false}={}){const row=document.createElement('div');row.className='field '+(/Адаптивность|Крепление [XY]|Минимальный масштаб|Максимальный сдвиг|Сжимать/.test(label)?'adapt':/Родитель|Тип объекта|Ресурс|Маска|Крепление$|anchor|pivot/.test(label)?'links':'geometry');const l=document.createElement('label');l.textContent=label;l.className=inherited?'inherited':'';const input=document.createElement(options?'select':'input');if(options){for(const [v,title] of options){const o=new Option(title,v);input.add(o);}input.value=value;}else{input.type=type;if(type==='checkbox')input.checked=!!value;else input.value=value??'';input.step=step;}input.setAttribute('aria-label',label);input.addEventListener('change',guard(()=>change(type==='checkbox'?input.checked:type==='number'?Number(input.value):input.value)));l.htmlFor=input.id='field-'+container.id+'-'+container.childElementCount;row.append(l,input);container.append(row);}
function render(){if(!scene)return;const effective=current(),id=variantId();$('scene-heading').textContent=scene.name;document.querySelector('.selection-hint').hidden=selected.length>0;
 $('undo').disabled=!history.length;$('redo').disabled=!future.length;$('save').textContent=dirty()?'Сохранить черновик •':'Черновик сохранён';
 $('variant').replaceChildren(new Option('Автоматически','auto'),new Option('Основная композиция','base'),...scene.variants.map(v=>new Option(v.name??v.id,v.id)));$('variant').value=variant;
 const l=$('layers');l.replaceChildren();for(const n of [...effective.nodes].sort((a,b)=>b.z-a.z)){const b=document.createElement('button');b.dataset.layerId=n.id;b.className='layer'+(selected.includes(n.id)?' selected':'');b.innerHTML=`<small>${n.z}</small><span>${escape(n.name)}</span><small>${n.locked?'🔒':''}${n.visible===false?'◌':''}</small>`;b.style.paddingLeft=(n.parent?24:8)+'px';b.onclick=e=>{selected=e.shiftKey?selected.includes(n.id)?selected.filter(i=>i!==n.id):[...selected,n.id]:[n.id];render();};l.append(b);}
 const c=$('camera');c.replaceChildren();field(c,'Название',scene.name,v=>edit(()=>scene.name=v),{type:'text'});
 for(const k of ['width','height'])field(c,k==='width'?'Виртуальная ширина':'Виртуальная высота',scene[k],v=>edit(()=>scene[k]=v));
 const patchCamera=p=>edit(()=>{if(id==='base')scene.camera=merge(scene.camera,p);else{const v=scene.variants.find(v=>v.id===id);v.camera=merge(v.camera??{},p);}});
 field(c,'Масштабирование',effective.camera.mode,v=>patchCamera({mode:v}),{type:'text',options:[['width','По ширине'],['height','По высоте'],['auto','Авто: заполнить'],['contain','Показать целиком'],['cover','Заполнить']]});
 field(c,'Обрезка X (0…1)',effective.camera.cropX,v=>patchCamera({cropX:v}),{step:'.05'});field(c,'Обрезка Y (0…1)',effective.camera.cropY,v=>patchCamera({cropY:v}),{step:'.05'});
 $('properties').replaceChildren();const n=effective.nodes.find(n=>n.id===selected[0]);$('object-title').textContent=n?n.name:'Выберите объект';
 renderSocketTools(n);$('layer-up').disabled=!reorderedLayers(effective.nodes,selected,'up').length;$('layer-down').disabled=!reorderedLayers(effective.nodes,selected,'down').length;
 if(n){const p=$('properties'),over=scene.variants.find(v=>v.id===id)?.nodes?.[n.id]??{};
  for(const [key,title,type,step] of [['name','Название','text'],['x','X','number'],['y','Y','number'],['width','Ширина','number'],['height','Высота','number'],['scaleX','Масштаб X','number','.05'],['scaleY','Масштаб Y','number','.05'],['rotation','Поворот °','number'],['opacity','Прозрачность','number','.05'],['z','Слой','number'],['visible','Показывать','checkbox'],['locked','Заблокировать','checkbox']]){field(p,title,n[key]??(key.startsWith('scale')?1:undefined),v=>edit(()=>patchNode(n.id,{[key]:v})),{type,step,inherited:id!=='base'&&!(key in over)});if(id!=='base'&&key in over){const reset=document.createElement('button');reset.textContent='↺';reset.title='Наследовать '+title;reset.onclick=()=>edit(()=>delete scene.variants.find(v=>v.id===id).nodes[n.id][key]);p.lastChild.append(reset);}}
  field(p,'Адаптивность',n.adapt?.mode??'inherit',v=>edit(()=>patchNode(n.id,{adapt:{mode:v}})),{type:'text',options:[['inherit','Как у родителя'],['edge','За видимым краем'],['center','К центру'],['shrink','Уменьшать'],['move-shrink','Сдвиг и уменьшение'],['squeeze','Сжимать одну ось'],['hide','Скрывать'],['repeat','Повторять']]});
  for(const [k,label,def] of [['ax','Крепление X (0…1)',.5],['ay','Крепление Y (0…1)',1],['minScale','Минимальный масштаб',.5],['maxShift','Максимальный сдвиг',1000]])field(p,label,n.adapt?.[k]??def,v=>edit(()=>patchNode(n.id,{adapt:{[k]:v}})),{step:'.05'});
  field(p,'Сжимать ось',n.adapt?.axis??'y',v=>edit(()=>patchNode(n.id,{adapt:{axis:v}})),{type:'text',options:[['x','Ширину'],['y','Высоту']]});
  field(p,'Родитель',n.parent??'',v=>edit(()=>patchNode(n.id,{parent:v||null})),{type:'text',options:[['','Сцена'],...effective.nodes.filter(x=>x.id!==n.id).map(x=>[x.id,x.name])]});
  field(p,'Тип объекта',n.type,v=>edit(()=>patchNode(n.id,{type:v})),{type:'text',options:['image','animated-image','group','background','mask','effect','light','anchor','zone','path'].map(v=>[v,v])});
  field(p,'Ресурс (замена)',n.asset??'',v=>edit(()=>patchNode(n.id,{asset:v||null})),{type:'text',options:[['','Без изображения'],...assets.map(a=>[a.path,a.name])]});
  field(p,'Маска',n.mask??'',v=>edit(()=>patchNode(n.id,{mask:v||null})),{type:'text',options:[['','Без маски'],...effective.nodes.filter(x=>x.type==='mask'&&x.id!==n.id).map(x=>[x.id,x.name])]});
  const targets=effective.nodes.filter(x=>x.id!==n.id&&Object.keys(x.sockets??{}).length);field(p,'Крепление',n.attachment?`${n.attachment.target}/${n.attachment.socket}`:'',v=>edit(()=>{const [target,socket]=v.split('/');patchNode(n.id,{attachment:v?{target,socket,dx:0,dy:0}:null});}),{type:'text',options:[['','Свободно'],...targets.flatMap(x=>Object.keys(x.sockets).map(s=>[`${x.id}/${s}`,`${x.name}: ${x.sockets[s].name||s}`]))]});
  const computed=layout?.nodes.find(x=>x.id===n.id);if(computed){const note=document.createElement('p');note.className='hint';note.textContent=`Вычислено: X ${computed.bounds.x.toFixed(1)}, Y ${computed.bounds.y.toFixed(1)}, ${computed.bounds.width.toFixed(1)} × ${computed.bounds.height.toFixed(1)} px`;p.append(note);}for(const kind of ['anchor','pivot'])for(const axis of ['x','y'])field(p,`${kind} ${axis}`,n[kind]?.[axis]??0,v=>edit(()=>patchNode(n.id,{[kind]:{[axis]:v}})),{step:'.05'});
  $('node-json').value=JSON.stringify(n,null,2);
 }else $('node-json').value='';
 $('variant-json').value=id==='base'?'':JSON.stringify(scene.variants.find(v=>v.id===id),null,2);$('scene-json').value=JSON.stringify(scene,null,2);draw();
}
function draw(){if(!scene)return;try{const shell=$('canvas-shell'),fit=Math.min((shell.clientWidth-60)/width,(shell.clientHeight-60)/height);const scale=Math.max(.05,fit)*zoom;const canvas=$('canvas');canvas.style.width=width*scale+'px';canvas.style.height=height*scale+'px';canvas.style.transform=`translate(${pan.x}px,${pan.y}px)`;const result=renderSVG(scene,width,height,{variant,time,assetURL,uiScale:scale,reducedMotion:$('reduced').checked,selected,guides:$('guides').checked});layout=result.layout;canvas.innerHTML=result.svg;$('diagnostics').textContent=`${width} × ${height} · вариант: ${layout.variant} · масштаб сцены: ${layout.scale.toFixed(3)}`+(layout.warnings.length?' · '+layout.warnings.join(' · '):'');}catch(e){status(e.message);}}
function newNode(asset){const id='object-'+crypto.randomUUID();return {id,name:asset?.name??'Новый объект',type:asset?'image':'group',asset:asset?.path??null,x:scene.width/2,y:scene.height/2,width:asset?400:300,height:asset?400*asset.height/asset.width:300,rotation:0,opacity:1,z:Math.max(0,...current().nodes.map(n=>n.z))+1,visible:true,anchor:{x:.5,y:.5},pivot:{x:.5,y:.5},sockets:{},animations:[],adapt:{mode:'inherit'}};}
function add(asset){edit(()=>{const n=newNode(asset);scene.nodes.push(n);selected=[n.id];});}
async function save(approve=false){const snapshot=clone(scene),oldEtag=etag;status(approve?'Проверка и утверждение…':'Сохранение…');const data=await request(`/api/scenes/${scene.id}/${approve?'approve':'save'}`,{scene:snapshot,etag:oldEtag});etag=data.etag;saved=JSON.stringify(snapshot);render();status(approve?'Контрольная версия сохранена. Для передачи скачайте документ-код.':browserMode?'Черновик сохранён в этом браузере.':'Черновик сохранён на диске.');}
function undo(){if(!history.length)return;future.push(clone(scene));scene=history.pop();render();}
function redo(){if(!future.length)return;history.push(clone(scene));scene=future.pop();render();}
function download(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(scene,null,2)],{type:'application/json'}));a.download=scene.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function resizePreview(){width=Math.max(100,Math.min(5000,Number($('view-width').value)||1920));height=Math.max(100,Math.min(5000,Number($('view-height').value)||1080));render();}
function applyJSON(id,fn){const v=JSON.parse($(id).value);edit(()=>fn(v));}
function setup(){
 $('location-add').onclick=()=>$('new-scene-dialog').showModal();
 $('new-scene-close').onclick=()=>$('new-scene-dialog').close();
 $('new-scene-create').onclick=guard(async()=>{if(dirty())await save();const id='scene-'+Date.now(),name=$('new-scene-name').value.trim()||'Новая сцена';const fresh=$('new-scene-base').value==='copy'?{...clone(scene),id,name}:{schemaVersion:1,id,name,width:1920,height:1080,fill:'#f3f0fc',camera:{mode:'width',cropX:.5,cropY:.5},nodes:[],variants:[]};const result=await request('/api/scenes/create',{scene:fresh});registry=result.registry;$('scene-select').replaceChildren(...registry.locations.map(s=>new Option(s.name,s.id)));$('scene-select').value=id;await load(id);$('new-scene-dialog').close();status('Сцена создана. Откройте «Добавить рисунок» слева.');});
 $('scene-select').onchange=guard(async e=>{if(dirty()&&!confirm('Есть несохранённые правки. Перейти к другой сцене?')){e.target.value=scene.id;return;}await load(e.target.value);});
 $('undo').onclick=undo;$('redo').onclick=redo;$('save').onclick=guard(()=>save());$('approve').onclick=guard(()=>save(true));$('download').onclick=download;
 $('import').onchange=guard(async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>60*1024*1024)throw Error('Документ больше 60 МБ. Разделите его на отдельные сцены.');await importSceneCode(await file.text());}finally{e.target.value='';}});
 $('add').onclick=()=>add();$('duplicate').onclick=guard(()=>edit(()=>{const n=current().nodes.find(n=>n.id===selected[0]);if(!n)return;const copy=clone(n);copy.id='copy-'+Date.now();copy.name+=' (копия)';copy.x+=30;copy.y+=30;scene.nodes.push(copy);selected=[copy.id];}));
 $('delete').onclick=guard(()=>edit(()=>{const removed=new Set(selected);if(scene.nodes.some(n=>!removed.has(n.id)&&(removed.has(n.parent)||removed.has(n.attachment?.target)||removed.has(n.mask))))throw Error('Сначала перенесите дочерние и прикреплённые объекты');scene.nodes=scene.nodes.filter(n=>!removed.has(n.id));for(const v of scene.variants)for(const id of selected)delete v.nodes?.[id];selected=[];}));
 $('variant').onchange=e=>{variant=e.target.value;render();};$('variant-add').onclick=guard(()=>edit(()=>{const id='variant-'+Date.now();scene.variants.push({id,name:'Новый вариант',range:{minAspect:Math.max(0,width/height-.1),maxAspect:width/height+.1},nodes:{}});variant=id;}));
 $('node-apply').onclick=guard(()=>applyJSON('node-json',n=>{if(n.id!==selected[0])throw Error('ID объекта менять нельзя');patchNode(n.id,n);}));
 $('node-reset').onclick=()=>edit(()=>{const v=scene.variants.find(v=>v.id===variantId());if(v)delete v.nodes?.[selected[0]];});
 $('variant-apply').onclick=guard(()=>applyJSON('variant-json',v=>{const i=scene.variants.findIndex(x=>x.id===variantId());if(i<0||v.id!==scene.variants[i].id)throw Error('Сначала выберите вариант');scene.variants[i]=v;}));
 $('variant-reset').onclick=guard(()=>edit(()=>{const id=variantId();if(scene.variants.some(v=>v.extends===id))throw Error('От варианта наследуются другие варианты');scene.variants=scene.variants.filter(v=>v.id!==id);variant='base';}));
 $('scene-apply').onclick=guard(()=>applyJSON('scene-json',v=>{if(v.id!==scene.id)throw Error('ID локации менять нельзя');scene=v;}));
 $('preset').onchange=e=>{[width,height]=e.target.value.split(',').map(Number);$('view-width').value=width;$('view-height').value=height;render();};$('view-width').oninput=resizePreview;$('view-height').oninput=resizePreview;
 $('zoom').oninput=e=>{zoom=Number(e.target.value)/100;draw();};$('pan-reset').onclick=()=>{pan={x:0,y:0};zoom=1;$('zoom').value=100;draw();};$('guides').onchange=draw;$('reduced').checked=matchMedia('(prefers-reduced-motion: reduce)').matches;$('reduced').onchange=draw;$('time').oninput=e=>{time=Math.max(0,Number(e.target.value));draw();};
 $('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Пауза':'Воспроизвести';};let previous=performance.now();function tick(now){if(playing){time+=(now-previous)/1000;$('time').value=time.toFixed(1);draw();}previous=now;requestAnimationFrame(tick);}requestAnimationFrame(tick);
 $('versions-load').onclick=guard(async()=>{const versions=await request(`/api/scenes/${scene.id}/versions`);$('versions').replaceChildren();for(const v of versions){const b=document.createElement('button');b.textContent='Восстановить '+v;b.onclick=guard(async()=>{if(!confirm('Восстановить утверждённую версию в черновик? Текущие правки можно предварительно экспортировать.'))return;const data=await request(`/api/scenes/${scene.id}/restore`,{version:v,etag});history.push(clone(scene));future=[];scene=data.scene;etag=data.etag;saved=JSON.stringify(scene);render();status('Версия восстановлена в черновик');});$('versions').append(b);}});
 document.addEventListener('keydown',guard(e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();return save();}return;}if(e.code==='Space'){space=true;e.preventDefault();}if(e.ctrlKey||e.metaKey){if(e.key.toLowerCase()==='s'){e.preventDefault();return save();}if(e.key.toLowerCase()==='z'){e.preventDefault();return e.shiftKey?redo():undo();}if(e.key.toLowerCase()==='y'){e.preventDefault();return redo();}}const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(direction&&selected.length){e.preventDefault();edit(()=>{for(const id of selected){const n=current().nodes.find(n=>n.id===id);if(!n||n.locked)continue;const d=e.shiftKey?10:1;if(n.attachment)patchNode(id,{attachment:{dx:(n.attachment.dx??0)+direction[0]*d,dy:(n.attachment.dy??0)+direction[1]*d}});else patchNode(id,{x:n.x+direction[0]*d,y:n.y+direction[1]*d});}});}}));document.addEventListener('keyup',e=>{if(e.code==='Space')space=false;});window.addEventListener('blur',()=>space=false);
 window.addEventListener('beforeunload',e=>{if(dirty()){e.preventDefault();e.returnValue='';}});new ResizeObserver(draw).observe($('canvas-shell'));setupPointer();setupGame();
}
function setupPointer(){let drag;
 const canvas=$('canvas');canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;if(socketMode&&!space){e.preventDefault();try{const owner=current().nodes.find(n=>n.id===socketMode),item=layout.nodes.find(n=>n.id===socketMode);if(!owner||!item)throw Error('Сначала выберите предмет.');const rect=canvas.getBoundingClientRect(),position=socketPosition(item,{x:(e.clientX-rect.x)*width/rect.width,y:(e.clientY-rect.y)*height/rect.height}),socket=nextSocket(owner);socketMode=null;edit(()=>{const base=scene.nodes.find(n=>n.id===owner.id);base.sockets??={};base.sockets[socket.id]={...position,name:socket.name};});status('Точка добавлена. Назовите её справа или перетащите кружок на рисунке.');}catch(error){status(error.message);}return;}playing=false;$('play').textContent='Воспроизвести';const socket=e.target.closest('[data-socket]');const id=socket?.dataset.owner??e.target.closest('[data-resize]')?.dataset.resize??e.target.closest('[data-node]')?.dataset.node;const n=layout?.nodes.find(n=>n.id===id);if(!space&&!n){selected=[];render();return;}if(n?.source.locked&&!space&&!socket)return;
  if(!space){if(!selected.includes(id))selected=e.shiftKey?[...selected,id]:[id];checkpoint();}
  drag={x:e.clientX,y:e.clientY,scene:clone(scene),layout,rect:canvas.getBoundingClientRect(),selected:[...selected],socket:socket?.dataset.socket,owner:id,resize:!!e.target.closest('[data-resize]'),pan:space,startPan:{...pan}};canvas.setPointerCapture(e.pointerId);draw();e.preventDefault();});
 canvas.addEventListener('pointermove',guard(e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(drag.pan){pan={x:drag.startPan.x+dx,y:drag.startPan.y+dy};draw();return;}scene=clone(drag.scene);const sx=dx*width/drag.rect.width,sy=dy*height/drag.rect.height;
  const chosen=new Set(drag.selected);for(const id of drag.selected){const item=drag.layout.nodes.find(n=>n.id===id);if(!item||item.source.locked&&!drag.socket)continue;const n=item.source;if(!drag.socket&&(chosen.has(n.parent)||chosen.has(n.attachment?.target)))continue;
   const snap=v=>$('snap').checked?Math.round(v/10)*10:v;
   if(drag.socket){if(id!==drag.owner)continue;const inv=inverse(item.matrix),zero=point(inv,{x:0,y:0}),delta=point(inv,{x:sx,y:sy}),s=n.sockets[drag.socket];patchNode(id,{sockets:{[drag.socket]:{x:s.x+(delta.x-zero.x)/n.width,y:s.y+(delta.y-zero.y)/n.height}}});}
   else if(drag.resize){const inv=inverse(item.matrix),delta=point(inv,{x:item.matrix[4]+sx,y:item.matrix[5]+sy});const ratio=Math.max(.05,Math.max((n.width+delta.x)/n.width,(n.height+delta.y)/n.height));if(n.type==='group')patchNode(id,{scaleX:(n.scaleX??1)*ratio,scaleY:(n.scaleY??1)*ratio});else patchNode(id,{width:Math.max(1,n.width*ratio),height:Math.max(1,n.height*ratio)});}
   else if(n.attachment)patchNode(id,{attachment:{dx:(n.attachment.dx??0)+sx/drag.layout.scale,dy:(n.attachment.dy??0)+sy/drag.layout.scale}});
   else {const parent=n.space==='viewport'?[1,0,0,1,0,0]:drag.layout.nodes.find(p=>p.id===n.parent)?.matrix??drag.layout.root;const inv=inverse(parent),zero=point(inv,{x:0,y:0}),delta=point(inv,{x:sx,y:sy});patchNode(id,{x:snap(n.x+delta.x-zero.x),y:snap(n.y+delta.y-zero.y)});}
  }draw();}));
 const finish=()=>{if(!drag)return;drag=null;render();status('Изменение в черновике. Сохраните для записи на диск.');};canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',()=>{if(drag&&!drag.pan){scene=drag.scene;history.pop();}drag=null;render();});
}
function setupGame(){const dialog=$('game-dialog');function show(){gameAdapter?.destroy();const stage=$('game-stage'),availableHeight=Math.min(innerHeight*.55,580);stage.style.width=Math.min(dialog.clientWidth-56,availableHeight*width/height)+'px';stage.style.height=Math.min(availableHeight,(dialog.clientWidth-56)*height/width)+'px';stage.style.marginInline='auto';const theme=$('theme').value,colors=registry.themes[theme];$('game-cards').style.setProperty('--card',colors.card);$('game-cards').style.setProperty('--border',colors.border);gameAdapter=attachGameScene($('game-scene'),current(),{themeId:theme,compatibility:registry.compatibility,time,assetURL,reducedMotion:$('reduced').checked});}
 $('game').onclick=guard(()=>{dialog.showModal();$('game-cards').replaceChildren();for(let i=0;i<8;i++){const b=document.createElement('button');b.textContent=['☀','✿','☁','★'][i%4];b.onclick=()=>b.classList.toggle('open');$('game-cards').append(b);}show();});$('theme').onchange=guard(show);$('game-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>gameAdapter?.destroy());}
function setupWorkflow(){
  setupEditorEnhancements();
  for(const button of document.querySelectorAll('[data-library]'))button.onclick=()=>{for(const b of document.querySelectorAll('[data-library]'))b.classList.toggle('active',b===button);$('objects-panel').hidden=button.dataset.library!=='objects';$('assets-panel').hidden=button.dataset.library!=='assets';};
  for(const button of document.querySelectorAll('[data-inspector]'))button.onclick=()=>{for(const b of document.querySelectorAll('[data-inspector]'))b.classList.toggle('active',b===button);$('object-panel').hidden=button.dataset.inspector!=='object';$('scene-panel').hidden=button.dataset.inspector!=='scene';};
  for(const button of document.querySelectorAll('[data-properties]'))button.onclick=()=>{for(const b of document.querySelectorAll('[data-properties]'))b.classList.toggle('active',b===button);$('properties').dataset.tab=button.dataset.properties;};
  $('help').onclick=()=>$('help-dialog').showModal();$('help-close').onclick=()=>$('help-dialog').close();
  $('step-design').onclick=()=>{$('game-dialog').close();$('delivery-dialog').close();$('canvas-shell').scrollIntoView({block:'nearest'});};
  const showDelivery=()=>{if(!scene)throw Error('Сцена ещё загружается.');$('game-dialog').close();$('delivery-checks').replaceChildren();for(const [w,h]of [[1920,1080],[1366,768],[1024,768],[768,1024],[390,844],[844,390]]){const result=compile(scene,w,h,{reducedMotion:true});const row=document.createElement('div');row.className='check-row '+(result.warnings.length?'warning':'good');row.textContent=`${w} × ${h} · ${result.warnings.length?result.warnings.join('; '):'геометрия проверена'}`;$('delivery-checks').append(row);}$('delivery-dialog').showModal();};
  for(const id of ['step-export','export-document','preview-export','check-sizes'])$(id).onclick=guard(showDelivery);
  $('delivery-close').onclick=()=>$('delivery-dialog').close();
  $('delivery-download').onclick=guard(async()=>{const button=$('delivery-download');button.disabled=true;button.textContent='Собираем рисунки и код…';try{const doc=await makeDocument(clone(scene),assets);const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}));link.download=scene.id+'.zabavograd-scene.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);status('Документ-код скачан. Прикрепите его к этому чату для переноса в библиотеку.');}finally{button.disabled=false;button.textContent='Скачать документ-код';}});
}
function renderAssetLibrary(){
  const names={forest_background:'Лесной фон',forest_tree_1:'Дерево слева',forest_tree_2:'Дерево справа',forest_bush:'Куст',forest_fern:'Папоротник',forest_flower_patch:'Цветы',forest_leaf_birch:'Лист берёзы',forest_leaf_oak:'Лист дуба',forest_leaf_oval:'Лист','background-v2':'Акварельная бумага'};
  $('assets').replaceChildren();
  for(const asset of assets){
    asset.name=names[asset.id]||asset.name;
    const button=document.createElement('button');
    button.dataset.asset=asset.path;
    button.innerHTML=`<img src="${escape(assetURL(asset.path))}" alt=""><span>${escape(asset.name)}</span>`;
    button.onclick=()=>add(asset);
    $('assets').append(button);
  }
}

function renderSocketTools(node){
  $('socket-tools').hidden=!node;
  $('socket-list').replaceChildren();
  if(socketMode&&socketMode!==node?.id)socketMode=null;
  $('socket-add').classList.toggle('active',!!socketMode);
  $('socket-add').textContent=socketMode?'Нажмите на рисунке…':'＋ Добавить точку на рисунке';
  $('socket-cancel').hidden=!socketMode;
  $('canvas').classList.toggle('placing-socket',!!socketMode);
  if(!node)return;
  for(const [id,socket] of Object.entries(node.sockets||{})){
    const row=document.createElement('div');row.className='socket-row';row.dataset.socketId=id;
    const title=document.createElement('input');title.type='text';title.value=socket.name||id;title.maxLength=80;title.setAttribute('aria-label','Название точки '+id);
    title.onchange=guard(()=>edit(()=>patchNode(node.id,{sockets:{[id]:{name:title.value.trim()||id}}})));
    const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Удалить точку '+id);
    const users=socketUsers(scene,node.id,id);remove.disabled=!!users.length;remove.title=users.length?'Сначала отвяжите: '+users.join(', '):'Удалить точку';
    remove.onclick=guard(()=>edit(()=>{const base=scene.nodes.find(n=>n.id===node.id);delete base.sockets?.[id];for(const variant of scene.variants||[])delete variant.nodes?.[node.id]?.sockets?.[id];}));
    row.append(title,remove);
    const coordinates=document.createElement('div');coordinates.className='socket-coordinates';
    for(const axis of ['x','y']){
      const label=document.createElement('label');label.textContent=axis.toUpperCase()+', %';
      const input=document.createElement('input');input.type='number';input.min=0;input.max=100;input.step=.1;input.value=Number((socket[axis]*100).toFixed(2));input.setAttribute('aria-label',`Точка ${id} ${axis.toUpperCase()} (%)`);
      input.onchange=guard(()=>{const number=Number(input.value);if(!Number.isFinite(number)||number<0||number>100)throw Error('Координата точки должна быть от 0 до 100%.');edit(()=>patchNode(node.id,{sockets:{[id]:{[axis]:number/100}}}));});label.append(input);coordinates.append(label);
    }
    row.append(coordinates);
    if(users.length){const note=document.createElement('small');note.textContent='Прикреплено: '+users.join(', ');row.append(note);}
    $('socket-list').append(row);
  }
  $('socket-empty').hidden=!!Object.keys(node.sockets||{}).length;
}

async function importSceneCode(text){
  status('Открываем документ сцены…');$('import-message').textContent='Проверяем код и рисунки…';$('paste-scene-apply').disabled=true;$('import').disabled=true;
  try{
    const document=parseSceneCode(text);
    let incoming=document;
    if(document.format==='zabavograd-scene-document'){
      const installed=await installDocument(document);incoming=installed.scene;
      for(const asset of installed.resources)if(!assets.some(a=>a.path===asset.path))assets.push(asset);
    }
    incoming={...incoming,name:incoming.name||incoming.id,camera:{mode:'width',cropX:.5,cropY:.5,...incoming.camera},variants:incoming.variants??[]};
    const errors=validate(incoming);if(errors.length)throw Error(errors.join('; '));
    const resources=new Set(incoming.nodes.map(n=>n.asset).filter(Boolean));for(const v of incoming.variants||[])for(const p of Object.values(v.nodes||{}))if(p.asset)resources.add(p.asset);
    for(const path of resources)if(!assets.some(a=>a.path===path))throw Error('В коде указан отсутствующий рисунок '+path+'. Откройте полный документ-код с рисунками.');
    compile(incoming,1920,1080);compile(incoming,390,844);
    if(incoming.id!==scene.id){
      if(dirty())await save();
      if(!registry.locations.some(s=>s.id===incoming.id)){await request('/api/scenes/create',{scene:incoming});registry=await request('/api/scenes');$('scene-select').replaceChildren(...registry.locations.map(s=>new Option(s.name,s.id)));}
      await load(incoming.id);$('scene-select').value=incoming.id;
    }
    socketMode=null;selected=[];edit(()=>scene=incoming);renderAssetLibrary();
    $('import-dialog').close();$('import-message').textContent='';
    status('Документ открыт. Внесите правки и скачайте документ-код, чтобы отправить результат обратно.');
  }catch(error){$('import-message').textContent=error.message;throw error;}
  finally{$('paste-scene-apply').disabled=false;$('import').disabled=false;}
}

async function addImageFiles(files){
  if(!files.length)return;
  const ready=[],errors=[];
  $('assets-panel').dataset.uploading='true';
  try{
    for(const file of files){status('Загружаем рисунок: '+file.name);try{const asset=await uploadImage(file);if(!assets.some(a=>a.path===asset.path))assets.push(asset);ready.push(asset);}catch(error){errors.push(error.message);}}
    if(ready.length)edit(()=>{const ids=[];for(const asset of ready){const node=newNode(asset);node.x+=ids.length*30;node.y+=ids.length*30;scene.nodes.push(node);ids.push(node.id);}selected=ids;});
    renderAssetLibrary();
    status((ready.length?`Добавлено рисунков: ${ready.length}. Они войдут в документ-код. `:'')+errors.join(' '));
  }finally{delete $('assets-panel').dataset.uploading;$('image-upload').value='';}
}

function setupEditorEnhancements(){
  for(const direction of ['up','down'])$('layer-'+direction).onclick=guard(()=>{const patches=reorderedLayers(current().nodes,selected,direction);if(!patches.length)return;edit(()=>{for(const patch of patches)patchNode(patch.id,{z:patch.z});});status(direction==='up'?'Предмет перемещён выше в слоях.':'Предмет перемещён ниже в слоях.');});
  $('socket-add').onclick=()=>{if(!selected[0])return;socketMode=selected[0];playing=false;$('play').textContent='Воспроизвести';$('guides').checked=true;render();status('Нажмите на выбранном предмете в месте крепления. Esc — отмена.');};
  const cancelSocket=()=>{socketMode=null;render();status('Добавление точки отменено.');};
  $('socket-cancel').onclick=cancelSocket;
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&socketMode){event.preventDefault();cancelSocket();}});
  for(const id of ['open-code','open-code-sidebar'])$(id).onclick=()=>{$('import-message').textContent='';$('import-dialog').showModal();};
  $('import-close').onclick=()=>$('import-dialog').close();
  $('paste-scene-apply').onclick=guard(()=>importSceneCode($('paste-scene-code').value));
  $('image-upload').onchange=guard(event=>addImageFiles([...event.target.files]));
  $('assets-panel').addEventListener('dragover',event=>{event.preventDefault();$('assets-panel').classList.add('dragover');});
  $('assets-panel').addEventListener('dragleave',()=>$('assets-panel').classList.remove('dragover'));
  $('assets-panel').addEventListener('drop',guard(event=>{event.preventDefault();$('assets-panel').classList.remove('dragover');return addImageFiles([...event.dataTransfer.files]);}));
}

registry=await request('/api/scenes');assets=await request('/api/assets');$('scene-select').replaceChildren(...registry.locations.map(s=>new Option(s.name,s.id)));renderAssetLibrary();setup();setupWorkflow();await load(registry.locations[0].id);
