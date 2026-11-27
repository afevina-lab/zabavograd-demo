import {compile} from './engine.mjs';
export const escape = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const matrix = m => `matrix(${m.join(' ')})`;
/** Same renderer for Studio, game adapter and deterministic SVG snapshots. */
export function renderSVG(scene,width,height,options={}) {
 const layout=compile(scene,width,height,options),selected=options.selected??[],prefix=options.prefix??'scene';
 const defs=layout.nodes.filter(n=>n.source.type==='mask').map(n=>`<clipPath id="${prefix}-${n.id}" clipPathUnits="userSpaceOnUse"><rect width="${n.source.width}" height="${n.source.height}" rx="${n.source.radius??0}" transform="${matrix(n.matrix)}"/></clipPath>`).join('');
 let body='';
 for(const n of layout.nodes){const s=n.source;if(!n.visible||['group','mask','anchor','path','zone'].includes(s.type))continue;let art=s.asset?`<image href="${escape(options.assetURL?options.assetURL(s.asset):'/'+s.asset)}" width="${s.width}" height="${s.height}" preserveAspectRatio="none"/>`:`<rect width="${s.width}" height="${s.height}" fill="${escape(s.color??'#b5d1b1')}" rx="${s.radius??0}"/>`;
  if(s.adapt?.mode==='repeat'){const step=s.width*Math.hypot(n.matrix[0],n.matrix[1]);if(step>1){art=Array.from({length:Math.min(100,Math.ceil(width/step)+1)},(_,i)=>`<g transform="translate(${i*s.width} 0)">${art}</g>`).join('');}}
  let content=`<g data-node="${s.id}" opacity="${n.opacity}" transform="${matrix(n.matrix)}">${art}</g>`;let ancestor=n;const masks=[];while(ancestor){if(ancestor.source.mask)masks.push(ancestor.source.mask);ancestor=layout.nodes.find(p=>p.id===ancestor.source.parent);}for(const mask of masks)content=`<g clip-path="url(#${prefix}-${mask})">${content}</g>`;body+=content;
 }
 if(options.guides){for(const n of layout.nodes.filter(n=>n.visible)){const s=n.source;if(['group','zone','mask'].includes(s.type))body+=`<polygon data-node="${n.id}" points="${n.corners.map(p=>`${p.x},${p.y}`).join(' ')}" pointer-events="stroke" fill="none" stroke="#128c80" stroke-dasharray="6 4"/>`;for(const [name,p] of Object.entries(n.sockets))body+=`<circle data-owner="${n.id}" data-socket="${escape(name)}" cx="${p.x}" cy="${p.y}" r="7" fill="#fff" stroke="#d47c25"/><text x="${p.x+9}" y="${p.y}" fill="#333" font-size="12" pointer-events="none">${escape(name)}</text>`;}}
 for(const id of selected){const n=layout.nodes.find(n=>n.id===id);if(!n)continue;body+=`<polygon data-node="${id}" points="${n.corners.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="#147cba" stroke-width="2"/>`;const p=n.corners[2];body+=`<rect data-resize="${id}" x="${p.x-6}" y="${p.y-6}" width="12" height="12" fill="#fff" stroke="#147cba"/>`;}
 return {layout,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(scene.name)}"><defs>${defs}</defs><rect width="100%" height="100%" fill="${escape(layout.fill)}"/>${body}</svg>`};
}
export function mountScene(element,scene,{width,height,...options}={}){const w=width??element.clientWidth,h=height??element.clientHeight;const result=renderSVG(scene,w,h,options);element.innerHTML=result.svg;return result.layout;}
