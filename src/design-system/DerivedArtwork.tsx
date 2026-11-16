import {useEffect,useState} from 'react';
import {artworkMask,maskPixels} from '../artwork-mask.ts';
import type {ImageVariant} from '../material-types.ts';
const cache=new Map<string,Promise<string|null>>();
function derive(src:string,outline:boolean):Promise<string|null>{
 const key=src+'|'+outline;if(cache.has(key))return cache.get(key)!;
 const promise=new Promise<string|null>(resolve=>{const img=new Image();img.onload=()=>{
 try{const scale=Math.min(1,384/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.round(img.naturalWidth*scale),h=Math.round(img.naturalHeight*scale),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx){resolve(null);return}ctx.drawImage(img,0,0,w,h);const mask=artworkMask(ctx.getImageData(0,0,w,h).data,w,h);if(!mask){resolve(null);return}
 const output=ctx.createImageData(w,h);output.data.set(maskPixels(mask,w,h,outline));ctx.putImageData(output,0,0);resolve(canvas.toDataURL());
 }catch{resolve(null)}};img.onerror=()=>resolve(null);img.src=src;});cache.set(key,promise);return promise;
}
export function DerivedArtwork({image,outline,onReady}:{image:ImageVariant;outline:boolean;onReady?:(ok:boolean)=>void}){
 const[src,setSrc]=useState<string|null|undefined>();const url=import.meta.env.BASE_URL+image.src.replace(/^\//,'');
 useEffect(()=>{let current=true;setSrc(undefined);void derive(url,outline).then(v=>{if(current){setSrc(v);onReady?.(!!v)}});return()=>{current=false}},[url,outline,onReady]);
 return src?<img src={src} alt={outline?'Контур предмета':'Тень предмета'}/>:<span role="status">{src===undefined?'Подготовка изображения…':'Не удалось отделить фон. Выберите другое изображение.'}</span>;
}
export function prepareArtwork(image:ImageVariant,outline:boolean){return derive(import.meta.env.BASE_URL+image.src.replace(/^\//,''),outline);}
