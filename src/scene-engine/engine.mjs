/** Pure, DOM-free scene compiler. Units are virtual pixels; all matrices are affine. */
export const SCHEMA_VERSION = 1;
export const TYPES = ['image','animated-image','group','background','mask','effect','light','anchor','zone','path'];
export const ANIMATIONS = ['sway','wave','float','drift','rotate','fall','twinkle','breathe','light','fade','path','state'];
export const clone = value => structuredClone(value);
export const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
export const identity = () => [1,0,0,1,0,0];
export function multiply(a,b) {return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
export const point = (m,p) => ({x:m[0]*p.x+m[2]*p.y+m[4],y:m[1]*p.x+m[3]*p.y+m[5]});
export function inverse(m) {const d=m[0]*m[3]-m[1]*m[2]; if(Math.abs(d)<1e-10) throw Error('Вырожденное преобразование'); return [m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d];}
export function merge(base,patch) {const out=clone(base);for(const [k,v] of Object.entries(patch??{})){if(['__proto__','constructor','prototype'].includes(k)) throw Error('Недопустимый ключ');out[k]=v&&typeof v==='object'&&!Array.isArray(v)?merge(out[k]??{},v):clone(v);}return out;}
const finite = n => typeof n==='number' && Number.isFinite(n);
const validId = s => typeof s==='string' && /^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(s);
export function validate(scene) {
 const errors=[]; const add=s=>errors.push(s);
 if(!scene||scene.schemaVersion!==1) return ['Неизвестная версия схемы'];
 if(!validId(scene.id)) add('Некорректный ID сцены');
 if(!finite(scene.width)||!finite(scene.height)||scene.width<=0||scene.height<=0) add('Некорректные размеры сцены');
 if(!Array.isArray(scene.nodes)||scene.nodes.length>1000) return [...errors,'Некорректный список объектов'];
 const ids=new Set();
 for(const n of scene.nodes){
  if(!validId(n.id)||ids.has(n.id)) add(`Повторный или некорректный ID: ${n.id}`); ids.add(n.id);
  if(!TYPES.includes(n.type)) add(`Неизвестный тип: ${n.id}`);
  for(const k of ['x','y','width','height','rotation','z','opacity']) if(!finite(n[k])) add(`${n.id}: ${k} должно быть числом`);
  if(n.width<=0||n.height<=0||n.opacity<0||n.opacity>1) add(`${n.id}: размер или прозрачность вне диапазона`);
  for(const k of ['scaleX','scaleY'])if(n[k]!==undefined&&(!finite(n[k])||n[k]<=0))add(`${n.id}: масштаб должен быть положительным`);
  if(n.radius!==undefined&&(!finite(n.radius)||n.radius<0))add(`${n.id}: неверный радиус маски`);
  if(n.color!==undefined&&!/^#[0-9a-fA-F]{3,8}$/.test(n.color))add(`${n.id}: цвет должен быть HEX`);
  if(n.attachment)for(const k of ['dx','dy'])if(n.attachment[k]!==undefined&&!finite(n.attachment[k]))add(`${n.id}: неверное смещение крепления`);
  if(n.asset&&!/^assets\/[a-zA-Z0-9_./-]+\.webp$/.test(n.asset)||n.asset?.includes('..')) add(`${n.id}: небезопасный ресурс`);
  for(const p of Object.values(n.sockets??{})) if(!finite(p.x)||!finite(p.y)) add(`${n.id}: неверная точка крепления`);
  for(const k of ['anchor','pivot']) if(n[k]&&(!finite(n[k].x)||!finite(n[k].y))) add(`${n.id}: неверная ${k}`);
  if(n.space&&!['scene','parent','viewport'].includes(n.space)) add(`${n.id}: неизвестное пространство`);
  if(n.adapt){const a=n.adapt;if(a.mode&&!['inherit','edge','center','shrink','move-shrink','squeeze','hide','repeat'].includes(a.mode)) add(`${n.id}: неизвестное правило`);for(const k of ['minScale','maxShift','margin','ax','ay']) if(a[k]!==undefined&&!finite(a[k])) add(`${n.id}: неверный параметр ${k}`);if(a.minScale!==undefined&&(a.minScale<=0||a.minScale>1)) add(`${n.id}: минимальный масштаб 0..1`);}
  for(const a of n.animations??[]) {if(!ANIMATIONS.includes(a.type)) add(`${n.id}: неизвестная анимация`);for(const k of ['period','amplitude','speed','phase']) if(a[k]!==undefined&&!finite(a[k])) add(`${n.id}: неверная анимация ${k}`);if(a.period!==undefined&&a.period<=0) add(`${n.id}: период должен быть положительным`);if(a.points&&(!Array.isArray(a.points)||a.points.length<2||a.points.some(p=>!finite(p.x)||!finite(p.y))))add(`${n.id}: неверная траектория`);}
 }
 const byId=Object.fromEntries(scene.nodes.map(n=>[n.id,n]));
 const visiting=new Set(),done=new Set();
 function visit(id){if(visiting.has(id)){add(`Циклическая зависимость: ${id}`);return;}if(done.has(id))return;visiting.add(id);const n=byId[id];for(const dep of [n.parent,n.attachment?.target,n.mask]) if(dep){if(!byId[dep])add(`${id}: нет объекта ${dep}`);else visit(dep);}if(n.mask&&byId[n.mask]?.type!=='mask')add(`${id}: маска должна иметь тип mask`);if(n.attachment&&!byId[n.attachment.target]?.sockets?.[n.attachment.socket])add(`${id}: нет точки крепления`);visiting.delete(id);done.add(id);}
 scene.nodes.forEach(n=>visit(n.id));
 if(scene.fill!==undefined&&!/^#[0-9a-fA-F]{3,8}$/.test(scene.fill))add('Фон должен быть HEX');
 const variants=scene.variants??[];const vIds=new Set();
 for(const v of variants){if(!validId(v.id)||vIds.has(v.id))add('Некорректный ID варианта');vIds.add(v.id);for(const [k,value] of Object.entries(v.range??{}))if(!['minAspect','maxAspect','minWidth','maxWidth','minHeight','maxHeight'].includes(k)||!finite(value)||value<0)add(`${v.id}: некорректный диапазон`);for(const axis of ['Aspect','Width','Height'])if((v.range?.['min'+axis]??0)>(v.range?.['max'+axis]??Infinity))add(`${v.id}: перевёрнутый диапазон`);for(const id of Object.keys(v.nodes??{}))if(!ids.has(id))add(`${v.id}: нет объекта ${id}`);}
 const vVisit=(v,chain=[])=>{if(chain.includes(v.id)){add('Цикл наследования вариантов');return;}if(v.extends){const parent=variants.find(p=>p.id===v.extends);if(!parent)add(`Нет родительского варианта ${v.extends}`);else vVisit(parent,[...chain,v.id]);}};variants.forEach(v=>vVisit(v));
 if(scene.camera?.mode&&!['width','height','auto','contain','cover'].includes(scene.camera.mode))add('Неизвестная стратегия камеры');
 for(const k of ['cropX','cropY'])if(scene.camera?.[k]!==undefined&&(!finite(scene.camera[k])||scene.camera[k]<0||scene.camera[k]>1))add(`Камера: ${k} вне 0..1`);
 return [...new Set(errors)];
}
export function matches(v,w,h){const r=v.range??{},a=w/h;return a>=(r.minAspect??0)&&a<(r.maxAspect??Infinity)&&w>=(r.minWidth??0)&&w<(r.maxWidth??Infinity)&&h>=(r.minHeight??0)&&h<(r.maxHeight??Infinity);}
export function resolveVariant(scene,w,h,forced='auto') {
 const choices=(scene.variants??[]).filter(v=>matches(v,w,h));const selected=forced==='base'?null:forced==='auto'?choices.at(-1):scene.variants?.find(v=>v.id===forced);
 let resolved=clone(scene);const chain=[];let v=selected;const seen=new Set();while(v&&!seen.has(v.id)){seen.add(v.id);chain.unshift(v);v=scene.variants.find(p=>p.id===v.extends);}
 for(const p of chain){resolved.camera=merge(resolved.camera,p.camera);resolved.nodes=resolved.nodes.map(n=>merge(n,p.nodes?.[n.id]));}
 return {scene:resolved,variant:selected?.id??'base',chain:chain.map(v=>v.id),warnings:choices.length>1?[`Пересечение вариантов: ${choices.map(v=>v.id).join(', ')}. Приоритет у последнего.`]:[]};
}
export function animation(node,time=0,reduced=false,seed=1){
 const out={x:0,y:0,rotation:0,sx:1,sy:1,opacity:1};if(reduced)return out;
 for(const a of node.animations??[]){const t=time+(a.phase??0),p=2*Math.PI*t/(a.period??4),amp=a.amplitude??8;switch(a.type){case 'sway':out.rotation+=Math.sin(p)*amp;break;case 'wave':case 'float':out.y+=Math.sin(p)*amp;break;case 'drift':out.x+=Math.sin(p)*amp;break;case 'rotate':out.rotation+=t*(a.speed??15);break;case 'fall':out.y+=((t*(a.speed??25)+seed*37)% (a.distance??300));out.x+=Math.sin(p)*amp;break;case 'twinkle':case 'light':out.opacity*=.65+.35*Math.cos(p);break;case 'breathe':out.sx*=1+Math.sin(p)*amp/100;out.sy*=1+Math.sin(p)*amp/100;break;case 'fade':out.opacity*=clamp(t/(a.period??4),0,1);break;case 'path':{const ps=a.points??[{x:0,y:0},{x:100,y:0}],f=((t/(a.period??4))%1+1)%1*(ps.length-1),i=Math.floor(f),q=ps[i],r=ps[Math.min(i+1,ps.length-1)];out.x+=q.x+(r.x-q.x)*(f-i);out.y+=q.y+(r.y-q.y)*(f-i);break;}case 'state':out.opacity*=t>=(a.at??1)?(a.to??1):(a.from??0);}}
 return out;
}
function localMatrix(n,x,y,sx,sy,rotation){const a=n.anchor??{x:0,y:0},p=n.pivot??a,r=rotation*Math.PI/180,c=Math.cos(r),s=Math.sin(r);return multiply([1,0,0,1,x-a.x*n.width*sx+p.x*n.width*sx,y-a.y*n.height*sy+p.y*n.height*sy],multiply([c,s,-s,c,0,0],[sx,0,0,sy,-p.x*n.width*sx,-p.y*n.height*sy].map((v,i)=>i===4?-p.x*n.width*sx:i===5?-p.y*n.height*sy:v)));}
export function compile(input,width,height,{variant='auto',time=0,reducedMotion=false,seed=1}={}) {
 const errors=validate(input);if(errors.length)throw Error(errors.join('\n'));if(!finite(width)||!finite(height)||width<=0||height<=0)throw Error('Некорректный размер просмотра');
 const resolved=resolveVariant(input,width,height,variant),scene=resolved.scene;const effectiveErrors=validate(scene);if(effectiveErrors.length)throw Error(effectiveErrors.join('\n'));
 const camera=scene.camera??{},mode=camera.mode??'width',rx=width/scene.width,ry=height/scene.height;
 const scale=mode==='width'?rx:mode==='height'?ry:mode==='contain'?Math.min(rx,ry):Math.max(rx,ry);
 const tx=(width-scene.width*scale)*(camera.cropX??.5),ty=(height-scene.height*scale)*(camera.cropY??.5);
 const root=[scale,0,0,scale,tx,ty],view={x:-tx/scale,y:-ty/scale,width:width/scale,height:height/scale};
 const byId=Object.fromEntries(scene.nodes.map(n=>[n.id,n])),computed=new Map();const warnings=[...resolved.warnings];
 function calc(n){if(computed.has(n.id))return computed.get(n.id);const parent=n.parent?calc(byId[n.parent]):null;
  let base=n.space==='viewport'?identity():parent?.matrix??root;let x=n.x,y=n.y,sx=n.scaleX??1,sy=n.scaleY??1;const a=n.adapt??{mode:'inherit'},mode=a.mode??'inherit';
  const ratioX=Math.min(1,view.width/scene.width),ratioY=Math.min(1,view.height/scene.height),shortage=Math.min(ratioX,ratioY);
  const factor=clamp(shortage,a.minScale??.5,1),max=a.maxShift??Infinity;let hidden=n.visible===false||parent?.visible===false;
  if(!n.parent&&n.space!=='viewport'&&!n.attachment){
   const dx=view.x+(a.ax??.5)*(view.width-scene.width),dy=view.y+(a.ay??1)*(view.height-scene.height);
   if(['edge','move-shrink','squeeze'].includes(mode)){x+=clamp(dx,-max,max);y+=clamp(dy,-max,max);}
   if(mode==='center'){x+=(scene.width/2-x)*(1-ratioX);y+=(scene.height/2-y)*(1-ratioY);}
   if(['shrink','move-shrink'].includes(mode)){sx*=factor;sy*=factor;}
   if(mode==='squeeze'){if(a.axis==='x')sx*=factor;else sy*=factor;}
   if(mode==='hide'&&shortage<(a.threshold??.7))hidden=true;
  }
  const anim=animation(n,time,reducedMotion,seed);let matrix=localMatrix(n,x+anim.x,y+anim.y,sx*anim.sx,sy*anim.sy,n.rotation+anim.rotation);matrix=multiply(base,matrix);
  if(n.attachment){const target=calc(byId[n.attachment.target]),socket=byId[n.attachment.target].sockets[n.attachment.socket],destination=point(target.matrix,{x:socket.x*target.source.width,y:socket.y*target.source.height});const anchor=point(matrix,{x:(n.anchor?.x??0)*n.width,y:(n.anchor?.y??0)*n.height});matrix[4]+=destination.x-anchor.x+(n.attachment.dx??0)*scale;matrix[5]+=destination.y-anchor.y+(n.attachment.dy??0)*scale;hidden ||= !target.visible;}
  const corners=[{x:0,y:0},{x:n.width,y:0},{x:n.width,y:n.height},{x:0,y:n.height}].map(p=>point(matrix,p));const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);const bounds={x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
  const item={id:n.id,source:n,matrix,bounds,corners,visible:!hidden,opacity:n.opacity*anim.opacity*(parent?.opacity??1),sockets:Object.fromEntries(Object.entries(n.sockets??{}).map(([id,p])=>[id,point(matrix,{x:p.x*n.width,y:p.y*n.height})]))};computed.set(n.id,item);
  if(n.required&&!hidden&&(bounds.x<0||bounds.y<0||bounds.x+bounds.width>width||bounds.y+bounds.height>height))warnings.push(`${n.name}: обязательный объект обрезан`);
  return item;
 }
 scene.nodes.forEach(calc);const nodes=[...computed.values()].sort((a,b)=>a.source.z-b.source.z);
 return {width,height,scale,root,view,variant:resolved.variant,nodes,warnings,fill:scene.fill??'#dce6db'};
}
export function migrate(scene){if(scene.schemaVersion===1)return clone(scene);throw Error('Для этой версии нет подтверждённой миграции');}
